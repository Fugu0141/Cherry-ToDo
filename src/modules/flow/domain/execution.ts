import type { Task } from '../../task/index';
import type { TaskId } from '../../../shared/ids/index';
import {
  isDerivedBranchingGoal,
  reachableStructuralTaskIds,
  uniqueIncomingStructuralTaskIds,
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

export type ExecutionStatusNormalizationReason = 'derived-goal' | 'blocked-by-merge';

export interface ExecutionStatusChange {
  readonly taskId: TaskId;
  readonly from: 'todo' | 'done';
  readonly to: 'todo' | 'done';
  readonly reason: ExecutionStatusNormalizationReason;
}

export interface ExecutionStatusNormalization {
  readonly statuses: Readonly<Record<string, 'todo' | 'done'>>;
  readonly changes: readonly ExecutionStatusChange[];
}

function stableTaskIds(ids: Iterable<TaskId>): readonly TaskId[] {
  return [...new Set(ids)].sort((left, right) => left.localeCompare(right));
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
    const predecessors = uniqueIncomingStructuralTaskIds(task.id, graph);
    if (predecessors.length < 2) {
      continue;
    }

    const remaining = predecessors.filter((taskId) => !effectiveDone(taskId));

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

export function normalizeExecutionStatuses(
  tasks: Readonly<Record<string, Task>>,
  graph: FlowGraph,
): ExecutionStatusNormalization {
  const originalStatuses = new Map(
    Object.values(tasks).map((task) => [task.id, task.status] as const),
  );
  let currentTasks: Readonly<Record<string, Task>> = tasks;
  const iterationLimit = Math.max(4, Object.keys(tasks).length * 4);

  for (let iteration = 0; iteration < iterationLimit; iteration += 1) {
    const goals = new Map(
      evaluateDerivedGoalStatuses(currentTasks, graph).map((evaluation) => [
        evaluation.taskId,
        evaluation,
      ]),
    );
    const desiredStatuses = new Map<TaskId, 'todo' | 'done'>();

    for (const task of Object.values(currentTasks)) {
      const availability = deriveTaskCompletionAvailability(task.id, currentTasks, graph);
      const goal = goals.get(task.id);

      if (goal !== undefined) {
        desiredStatuses.set(
          task.id,
          goal.shouldBeDone && availability.kind === 'available' ? 'done' : 'todo',
        );
        continue;
      }

      if (task.status === 'done' && availability.kind === 'blocked-by-merge') {
        desiredStatuses.set(task.id, 'todo');
      }
    }

    let changed = false;
    const nextTasks: Record<string, Task> = { ...currentTasks };
    for (const task of Object.values(currentTasks)) {
      const desiredStatus = desiredStatuses.get(task.id);
      if (desiredStatus === undefined || desiredStatus === task.status) {
        continue;
      }

      nextTasks[task.id] = { ...task, status: desiredStatus };
      changed = true;
    }

    currentTasks = nextTasks;
    if (!changed) {
      const statuses: Record<string, 'todo' | 'done'> = {};
      const changes: ExecutionStatusChange[] = [];
      for (const task of Object.values(currentTasks)) {
        statuses[task.id] = task.status;
        const originalStatus = originalStatuses.get(task.id);
        if (originalStatus === undefined || originalStatus === task.status) {
          continue;
        }
        changes.push({
          taskId: task.id,
          from: originalStatus,
          to: task.status,
          reason: isDerivedBranchingGoal(task.id, graph) ? 'derived-goal' : 'blocked-by-merge',
        });
      }

      return {
        statuses,
        changes: changes.sort((left, right) => left.taskId.localeCompare(right.taskId)),
      };
    }
  }

  throw new Error(
    'Semantic status normalization did not converge for an acyclic execution topology.',
  );
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
