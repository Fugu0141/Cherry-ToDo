import type { Task } from '../../task/index';
import type { TaskId } from '../../../shared/ids/index';
import {
  incomingStructuralEdges,
  isDerivedBranchingGoal,
  outgoingStructuralEdges,
  type FlowGraph,
} from './flow';

export type TaskCompletionAvailability =
  | { readonly kind: 'available' }
  | {
      readonly kind: 'blocked-by-merge';
      readonly gateTaskIds: readonly TaskId[];
      readonly remainingPredecessorIds: readonly TaskId[];
    };

export type ManualCompletionControl =
  | { readonly kind: 'available' }
  | { readonly kind: 'derived-goal-controlled' }
  | {
      readonly kind: 'blocked-by-merge';
      readonly gateTaskIds: readonly TaskId[];
      readonly remainingPredecessorIds: readonly TaskId[];
    };

export interface GoalEvaluation {
  readonly taskId: TaskId;
  readonly descendantTaskIds: readonly TaskId[];
  readonly completedDescendantTaskIds: readonly TaskId[];
  readonly shouldBeDone: boolean;
}

export interface TaskExecutionReadModel {
  readonly taskId: TaskId;
  readonly isDerivedBranchingGoal: boolean;
  readonly completionAvailability: TaskCompletionAvailability;
  readonly manualCompletionControl: ManualCompletionControl;
  readonly goal?: {
    readonly completed: number;
    readonly total: number;
    readonly descendantTaskIds: readonly TaskId[];
    readonly shouldBeDone: boolean;
  };
}

function stableTaskIds(ids: Iterable<TaskId>): readonly TaskId[] {
  return [...ids].sort((left, right) => left.localeCompare(right));
}

export function reachableStructuralTaskIds(taskId: TaskId, graph: FlowGraph): readonly TaskId[] {
  const seen = new Set<TaskId>();
  const queue = outgoingStructuralEdges(taskId, graph).map((edge) => edge.toTaskId);

  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined || seen.has(current)) {
      continue;
    }

    seen.add(current);
    for (const edge of outgoingStructuralEdges(current, graph)) {
      if (!seen.has(edge.toTaskId)) {
        queue.push(edge.toTaskId);
      }
    }
  }

  return stableTaskIds(seen);
}

function effectiveDoneResolver(
  tasks: Readonly<Record<string, Task>>,
  graph: FlowGraph,
): (taskId: TaskId) => boolean {
  const memo = new Map<TaskId, boolean>();
  const evaluating = new Set<TaskId>();

  const effectiveDone = (taskId: TaskId): boolean => {
    const existing = memo.get(taskId);
    if (existing !== undefined) {
      return existing;
    }

    const task = tasks[taskId];
    if (task === undefined) {
      return false;
    }

    if (!isDerivedBranchingGoal(taskId, graph)) {
      return task.status === 'done';
    }

    if (evaluating.has(taskId)) {
      return false;
    }

    evaluating.add(taskId);
    const descendants = reachableStructuralTaskIds(taskId, graph);
    const done = descendants.length > 0 && descendants.every((id) => effectiveDone(id));
    evaluating.delete(taskId);
    memo.set(taskId, done);
    return done;
  };

  return effectiveDone;
}

export function evaluateDerivedGoalStatuses(
  tasks: Readonly<Record<string, Task>>,
  graph: FlowGraph,
): readonly GoalEvaluation[] {
  const effectiveDone = effectiveDoneResolver(tasks, graph);
  const evaluations: GoalEvaluation[] = [];

  for (const task of Object.values(tasks)) {
    if (!isDerivedBranchingGoal(task.id, graph)) {
      continue;
    }

    const descendants = reachableStructuralTaskIds(task.id, graph);
    const completed = descendants.filter((taskId) => effectiveDone(taskId));

    evaluations.push({
      taskId: task.id,
      descendantTaskIds: descendants,
      completedDescendantTaskIds: completed,
      shouldBeDone: descendants.length > 0 && completed.length === descendants.length,
    });
  }

  return evaluations.sort((left, right) => left.taskId.localeCompare(right.taskId));
}

interface ClosedMergeGate {
  readonly taskId: TaskId;
  readonly remainingPredecessorIds: readonly TaskId[];
}

function closedMergeGates(
  tasks: Readonly<Record<string, Task>>,
  graph: FlowGraph,
): readonly ClosedMergeGate[] {
  const effectiveDone = effectiveDoneResolver(tasks, graph);
  const gates: ClosedMergeGate[] = [];

  for (const task of Object.values(tasks)) {
    const incoming = incomingStructuralEdges(task.id, graph);
    if (incoming.length < 2) {
      continue;
    }

    const remaining = incoming
      .map((edge) => edge.fromTaskId)
      .filter((taskId) => !effectiveDone(taskId));

    if (remaining.length > 0) {
      gates.push({
        taskId: task.id,
        remainingPredecessorIds: stableTaskIds(remaining),
      });
    }
  }

  return gates.sort((left, right) => left.taskId.localeCompare(right.taskId));
}

export function deriveTaskCompletionAvailability(
  taskId: TaskId,
  tasks: Readonly<Record<string, Task>>,
  graph: FlowGraph,
): TaskCompletionAvailability {
  const blockingGates: ClosedMergeGate[] = [];

  for (const gate of closedMergeGates(tasks, graph)) {
    if (gate.taskId === taskId || reachableStructuralTaskIds(gate.taskId, graph).includes(taskId)) {
      blockingGates.push(gate);
    }
  }

  if (blockingGates.length === 0) {
    return { kind: 'available' };
  }

  const remaining = new Set<TaskId>();
  for (const gate of blockingGates) {
    for (const predecessorId of gate.remainingPredecessorIds) {
      remaining.add(predecessorId);
    }
  }

  return {
    kind: 'blocked-by-merge',
    gateTaskIds: blockingGates.map((gate) => gate.taskId),
    remainingPredecessorIds: stableTaskIds(remaining),
  };
}

export function deriveManualCompletionControl(
  taskId: TaskId,
  tasks: Readonly<Record<string, Task>>,
  graph: FlowGraph,
): ManualCompletionControl {
  if (isDerivedBranchingGoal(taskId, graph)) {
    return { kind: 'derived-goal-controlled' };
  }

  const availability = deriveTaskCompletionAvailability(taskId, tasks, graph);
  if (availability.kind === 'blocked-by-merge') {
    return availability;
  }

  return { kind: 'available' };
}

export function buildTaskExecutionReadModels(
  tasks: Readonly<Record<string, Task>>,
  graph: FlowGraph,
): Readonly<Record<string, TaskExecutionReadModel>> {
  const goalEvaluations = new Map(
    evaluateDerivedGoalStatuses(tasks, graph).map((evaluation) => [evaluation.taskId, evaluation]),
  );
  const readModels: Record<string, TaskExecutionReadModel> = {};

  for (const task of Object.values(tasks)) {
    const goal = goalEvaluations.get(task.id);
    const completionAvailability = deriveTaskCompletionAvailability(task.id, tasks, graph);

    readModels[task.id] = {
      taskId: task.id,
      isDerivedBranchingGoal: goal !== undefined,
      completionAvailability,
      manualCompletionControl: deriveManualCompletionControl(task.id, tasks, graph),
      ...(goal === undefined
        ? {}
        : {
            goal: {
              completed: goal.completedDescendantTaskIds.length,
              total: goal.descendantTaskIds.length,
              descendantTaskIds: goal.descendantTaskIds,
              shouldBeDone: goal.shouldBeDone,
            },
          }),
    };
  }

  return readModels;
}
