import {
  buildTaskExecutionReadModels,
  deriveTaskCompletionAvailability,
  evaluateDerivedGoalStatuses,
  type FlowGraph,
} from '../../flow/index';
import type { Task } from '../../task/index';
import type { TabDocument } from '../domain/workspace';
import type { RevisionMeta } from '../../../shared/revision/index';
import type { TaskId } from '../../../shared/ids/index';

export interface CompletionImpactPlan {
  readonly baseRevision: number;
  readonly directChanges: readonly TaskId[];
  readonly autoReopenedGoalIds: readonly TaskId[];
  readonly invalidatedCompletedTaskIds: readonly TaskId[];
  readonly newlyBlockedTaskIds: readonly TaskId[];
  readonly breaksFlowContinuity: boolean;
}

export interface PreparedSemanticTransaction {
  readonly tab: TabDocument;
  readonly impact: CompletionImpactPlan;
  readonly requiresConfirmation: boolean;
}

function bumpMeta(meta: RevisionMeta, updatedAt: string): RevisionMeta {
  return {
    createdAt: meta.createdAt,
    updatedAt,
    revision: meta.revision + 1,
  };
}

function withStatus(task: Task, status: 'todo' | 'done', updatedAt: string): Task {
  if (task.status === status) {
    return task;
  }

  return {
    ...task,
    status,
    meta: bumpMeta(task.meta, updatedAt),
  };
}

function graphOf(tab: TabDocument): FlowGraph {
  return { edges: tab.flowEdges };
}

function stable(ids: Iterable<TaskId>): readonly TaskId[] {
  return [...new Set(ids)].sort((left, right) => left.localeCompare(right));
}

function normalizeStatuses(
  proposed: TabDocument,
  updatedAt: string,
): {
  readonly tab: TabDocument;
  readonly autoReopenedGoalIds: readonly TaskId[];
  readonly invalidatedCompletedTaskIds: readonly TaskId[];
} {
  let tasks: Readonly<Record<string, Task>> = proposed.tasks;
  const graph = graphOf(proposed);
  const autoReopenedGoalIds = new Set<TaskId>();
  const invalidatedCompletedTaskIds = new Set<TaskId>();
  const iterationLimit = Math.max(4, Object.keys(tasks).length * 4);

  for (let iteration = 0; iteration < iterationLimit; iteration += 1) {
    let changed = false;
    let nextTasks: Record<string, Task> = { ...tasks };

    for (const goal of evaluateDerivedGoalStatuses(tasks, graph)) {
      const task = nextTasks[goal.taskId];
      if (task === undefined) {
        continue;
      }

      const availability = deriveTaskCompletionAvailability(goal.taskId, tasks, graph);
      const desiredStatus = goal.shouldBeDone && availability.kind === 'available' ? 'done' : 'todo';

      if (task.status !== desiredStatus) {
        if (task.status === 'done' && desiredStatus === 'todo') {
          autoReopenedGoalIds.add(task.id);
        }
        nextTasks[task.id] = withStatus(task, desiredStatus, updatedAt);
        changed = true;
      }
    }

    tasks = nextTasks;
    nextTasks = { ...tasks };

    for (const task of Object.values(tasks)) {
      if (task.status !== 'done') {
        continue;
      }

      const availability = deriveTaskCompletionAvailability(task.id, tasks, graph);
      if (availability.kind === 'blocked-by-merge') {
        nextTasks[task.id] = withStatus(task, 'todo', updatedAt);
        if (!autoReopenedGoalIds.has(task.id)) {
          invalidatedCompletedTaskIds.add(task.id);
        }
        changed = true;
      }
    }

    tasks = nextTasks;
    if (!changed) {
      return {
        tab: { ...proposed, tasks },
        autoReopenedGoalIds: stable(autoReopenedGoalIds),
        invalidatedCompletedTaskIds: stable(invalidatedCompletedTaskIds),
      };
    }
  }

  throw new Error('Semantic status normalization did not converge for an acyclic Flow graph.');
}

export function prepareSemanticTransaction(input: {
  readonly original: TabDocument;
  readonly proposed: TabDocument;
  readonly baseRevision: number;
  readonly directChanges?: readonly TaskId[];
  readonly breaksFlowContinuity?: boolean;
  readonly updatedAt: string;
}): PreparedSemanticTransaction {
  const beforeModels = buildTaskExecutionReadModels(input.original.tasks, graphOf(input.original));
  const normalized = normalizeStatuses(input.proposed, input.updatedAt);
  const afterModels = buildTaskExecutionReadModels(normalized.tab.tasks, graphOf(normalized.tab));

  const newlyBlockedTaskIds: TaskId[] = [];
  for (const task of Object.values(normalized.tab.tasks)) {
    const before = beforeModels[task.id]?.completionAvailability.kind;
    const after = afterModels[task.id]?.completionAvailability.kind;
    if (before !== 'blocked-by-merge' && after === 'blocked-by-merge') {
      newlyBlockedTaskIds.push(task.id);
    }
  }

  const impact: CompletionImpactPlan = {
    baseRevision: input.baseRevision,
    directChanges: stable(input.directChanges ?? []),
    autoReopenedGoalIds: normalized.autoReopenedGoalIds,
    invalidatedCompletedTaskIds: normalized.invalidatedCompletedTaskIds,
    newlyBlockedTaskIds: stable(newlyBlockedTaskIds),
    breaksFlowContinuity: input.breaksFlowContinuity ?? false,
  };

  return {
    tab: normalized.tab,
    impact,
    requiresConfirmation:
      impact.autoReopenedGoalIds.length > 0 ||
      impact.invalidatedCompletedTaskIds.length > 0 ||
      impact.breaksFlowContinuity,
  };
}

export function bumpTabRevision(tab: TabDocument, updatedAt: string): TabDocument {
  return { ...tab, meta: bumpMeta(tab.meta, updatedAt) };
}

export function bumpWorkspaceRevision<T extends { readonly meta: RevisionMeta }>(
  workspace: T,
  updatedAt: string,
): T {
  return { ...workspace, meta: bumpMeta(workspace.meta, updatedAt) };
}
