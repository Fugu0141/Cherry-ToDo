import {
  buildTaskExecutionReadModels,
  normalizeExecutionStatuses,
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
  const normalized = normalizeExecutionStatuses(proposed.tasks, graphOf(proposed));
  const tasks: Record<string, Task> = { ...proposed.tasks };
  const autoReopenedGoalIds: TaskId[] = [];
  const invalidatedCompletedTaskIds: TaskId[] = [];

  for (const task of Object.values(proposed.tasks)) {
    const status = normalized.statuses[task.id];
    if (status !== undefined && status !== task.status) {
      tasks[task.id] = withStatus(task, status, updatedAt);
    }
  }

  for (const change of normalized.changes) {
    if (change.from !== 'done' || change.to !== 'todo') {
      continue;
    }
    if (change.reason === 'derived-goal') {
      autoReopenedGoalIds.push(change.taskId);
    } else {
      invalidatedCompletedTaskIds.push(change.taskId);
    }
  }

  return {
    tab: { ...proposed, tasks },
    autoReopenedGoalIds: stable(autoReopenedGoalIds),
    invalidatedCompletedTaskIds: stable(invalidatedCompletedTaskIds),
  };
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
