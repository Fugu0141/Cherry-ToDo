import {
  addFlowEdge,
  buildTaskExecutionReadModels,
  deriveManualCompletionControl,
  incomingStructuralEdges,
  outgoingStructuralEdges,
  validateFlowGraph,
  type FlowEdge,
  type FlowGraph,
  type FlowInvariantError,
  type StructuralFlowEdge,
  type StructuralFlowKind,
  type TaskExecutionReadModel,
} from '../../flow/index';
import {
  createTask,
  validateTask,
  type CreateTaskInput,
  type Task,
  type TaskImportance,
  type TaskValidationError,
} from '../../task/index';
import {
  validateSchedule,
  type Schedule,
  type ScheduleValidationError,
} from '../../schedule/index';
import { validateBoardDocumentState, type BoardSettings, type Point } from '../../board/index';
import {
  validateWorkspaceDocument,
  type TabDocument,
  type WorkspaceDocument,
  type WorkspaceValidationError,
} from '../domain/workspace';
import {
  bumpTabRevision,
  bumpWorkspaceRevision,
  prepareSemanticTransaction,
  type CompletionImpactPlan,
  type PreparedSemanticTransaction,
} from './semantic-transaction';
import { SnapshotHistory, type HistoryState } from '../../history/index';
import type { FlowEdgeId, TabId, TaskId } from '../../../shared/ids/index';
import type { RevisionMeta } from '../../../shared/revision/index';
import { err, ok, type Result } from '../../../shared/result/index';

export type ApplicationError =
  | { readonly code: 'tab-not-found'; readonly tabId: TabId }
  | { readonly code: 'task-not-found'; readonly taskId: TaskId }
  | { readonly code: 'task-id-in-use'; readonly taskId: TaskId }
  | { readonly code: 'edge-not-found'; readonly edgeId: FlowEdgeId }
  | { readonly code: 'edge-id-in-use'; readonly edgeId: FlowEdgeId }
  | { readonly code: 'task-invalid'; readonly cause: TaskValidationError }
  | { readonly code: 'schedule-invalid'; readonly cause: ScheduleValidationError }
  | { readonly code: 'flow-invalid'; readonly causes: readonly FlowInvariantError[] }
  | { readonly code: 'workspace-invalid'; readonly causes: readonly WorkspaceValidationError[] }
  | { readonly code: 'derived-goal-controlled'; readonly taskId: TaskId }
  | {
      readonly code: 'completion-blocked';
      readonly taskId: TaskId;
      readonly gateTaskIds: readonly TaskId[];
      readonly remainingPredecessorIds: readonly TaskId[];
    }
  | { readonly code: 'plan-not-found'; readonly planId: string }
  | {
      readonly code: 'stale-plan';
      readonly planId: string;
      readonly baseRevision: number;
      readonly currentRevision: number;
    }
  | { readonly code: 'invalid-reorder'; readonly reason: string }
  | { readonly code: 'invalid-board-point'; readonly taskId: TaskId }
  | { readonly code: 'nothing-to-undo' }
  | { readonly code: 'nothing-to-redo' };

export interface MutationPreview {
  readonly planId: string;
  readonly impact: CompletionImpactPlan;
}

export type MutationOutcome =
  | { readonly kind: 'committed'; readonly workspace: WorkspaceDocument }
  | { readonly kind: 'confirmation-required'; readonly preview: MutationPreview };

export interface ConnectFlowInput {
  readonly tabId: TabId;
  readonly edgeId: FlowEdgeId;
  readonly kind: StructuralFlowKind | 'reference';
  readonly fromTaskId: TaskId;
  readonly toTaskId: TaskId;
  readonly order?: number;
}

export interface UpdateTaskInput {
  readonly title?: string;
  readonly notes?: string;
  readonly importance?: TaskImportance;
}

interface PendingMutation {
  readonly baseRevision: number;
  readonly workspace: WorkspaceDocument;
  readonly impact: CompletionImpactPlan;
}

function bumpMeta(meta: RevisionMeta, updatedAt: string): RevisionMeta {
  return {
    createdAt: meta.createdAt,
    updatedAt,
    revision: meta.revision + 1,
  };
}

function graphOf(tab: TabDocument): FlowGraph {
  return { edges: tab.flowEdges };
}

function withoutKey<T>(
  record: Readonly<Record<string, T>>,
  key: string,
): Readonly<Record<string, T>> {
  const next = { ...record };
  delete next[key];
  return next;
}

function withTask(tab: TabDocument, task: Task): TabDocument {
  return { ...tab, tasks: { ...tab.tasks, [task.id]: task } };
}

export class ApplicationStore {
  readonly #now: () => string;
  readonly #pending = new Map<string, PendingMutation>();
  readonly #history = new SnapshotHistory<WorkspaceDocument>();
  #planCounter = 0;
  #workspace: WorkspaceDocument;

  constructor(workspace: WorkspaceDocument, now: () => string = () => new Date().toISOString()) {
    const validation = validateWorkspaceDocument(workspace);
    if (!validation.ok) {
      throw new Error('ApplicationStore requires a valid canonical WorkspaceDocument.');
    }
    this.#workspace = workspace;
    this.#now = now;
  }

  get workspace(): WorkspaceDocument {
    return this.#workspace;
  }

  get historyState(): HistoryState {
    return this.#history.state;
  }

  undo(): Result<WorkspaceDocument, ApplicationError> {
    const previous = this.#history.undo(this.#workspace);
    if (previous === undefined) return err({ code: 'nothing-to-undo' });
    this.#pending.clear();
    this.#workspace = previous;
    return ok(this.#workspace);
  }

  redo(): Result<WorkspaceDocument, ApplicationError> {
    const next = this.#history.redo(this.#workspace);
    if (next === undefined) return err({ code: 'nothing-to-redo' });
    this.#pending.clear();
    this.#workspace = next;
    return ok(this.#workspace);
  }

  taskExecutionReadModels(
    tabId: TabId,
  ): Result<Readonly<Record<string, TaskExecutionReadModel>>, ApplicationError> {
    const tab = this.#workspace.tabs[tabId];
    if (tab === undefined) {
      return err({ code: 'tab-not-found', tabId });
    }
    return ok(buildTaskExecutionReadModels(tab.tasks, graphOf(tab)));
  }

  createTask(
    tabId: TabId,
    input: Omit<CreateTaskInput, 'meta'>,
  ): Result<MutationOutcome, ApplicationError> {
    const tab = this.#workspace.tabs[tabId];
    if (tab === undefined) return err({ code: 'tab-not-found', tabId });
    if (tab.tasks[input.id] !== undefined) {
      return err({ code: 'task-id-in-use', taskId: input.id });
    }

    const now = this.#now();
    const created = createTask({
      ...input,
      meta: { createdAt: now, updatedAt: now, revision: 0 },
    });
    if (!created.ok) return err({ code: 'task-invalid', cause: created.error });

    const proposed = withTask(tab, created.value);
    return this.#applyPrepared(
      tabId,
      prepareSemanticTransaction({
        original: tab,
        proposed,
        baseRevision: this.#workspace.meta.revision,
        updatedAt: now,
      }),
    );
  }

  updateTask(
    tabId: TabId,
    taskId: TaskId,
    changes: UpdateTaskInput,
  ): Result<MutationOutcome, ApplicationError> {
    const resolved = this.#resolveTask(tabId, taskId);
    if (!resolved.ok) return resolved;

    const now = this.#now();
    const updated: Task = {
      ...resolved.value.task,
      ...(changes.title === undefined ? {} : { title: changes.title }),
      ...(changes.notes === undefined ? {} : { notes: changes.notes }),
      appearance: {
        importance: changes.importance ?? resolved.value.task.appearance.importance,
      },
      meta: bumpMeta(resolved.value.task.meta, now),
    };
    const validation = validateTask(updated);
    if (!validation.ok) return err({ code: 'task-invalid', cause: validation.error });

    return this.#commitSimpleTab(tabId, withTask(resolved.value.tab, validation.value), now);
  }

  setTaskStatus(
    tabId: TabId,
    taskId: TaskId,
    status: 'todo' | 'done',
  ): Result<MutationOutcome, ApplicationError> {
    const resolved = this.#resolveTask(tabId, taskId);
    if (!resolved.ok) return resolved;
    const { tab, task } = resolved.value;

    if (task.status === status) {
      return ok({ kind: 'committed', workspace: this.#workspace });
    }

    const control = deriveManualCompletionControl(taskId, tab.tasks, graphOf(tab));
    if (control.kind === 'derived-goal-controlled') {
      return err({ code: 'derived-goal-controlled', taskId });
    }
    if (status === 'done' && control.kind === 'blocked-by-merge') {
      return err({
        code: 'completion-blocked',
        taskId,
        gateTaskIds: control.gateTaskIds,
        remainingPredecessorIds: control.remainingPredecessorIds,
      });
    }

    const now = this.#now();
    const proposed = withTask(tab, {
      ...task,
      status,
      meta: bumpMeta(task.meta, now),
    });

    return this.#applyPrepared(
      tabId,
      prepareSemanticTransaction({
        original: tab,
        proposed,
        baseRevision: this.#workspace.meta.revision,
        directChanges: [taskId],
        updatedAt: now,
      }),
    );
  }

  setSchedule(
    tabId: TabId,
    taskId: TaskId,
    schedule: Schedule,
  ): Result<MutationOutcome, ApplicationError> {
    const resolved = this.#resolveTask(tabId, taskId);
    if (!resolved.ok) return resolved;
    const scheduleValidation = validateSchedule(schedule);
    if (!scheduleValidation.ok) {
      return err({ code: 'schedule-invalid', cause: scheduleValidation.error });
    }

    const now = this.#now();
    return this.#commitSimpleTab(
      tabId,
      withTask(resolved.value.tab, {
        ...resolved.value.task,
        schedule: scheduleValidation.value,
        meta: bumpMeta(resolved.value.task.meta, now),
      }),
      now,
    );
  }

  setBoardSettings(
    tabId: TabId,
    settings: BoardSettings,
  ): Result<MutationOutcome, ApplicationError> {
    const tab = this.#workspace.tabs[tabId];
    if (tab === undefined) return err({ code: 'tab-not-found', tabId });
    return this.#commitSimpleTab(tabId, { ...tab, board: { ...tab.board, settings } }, this.#now());
  }

  moveTask(tabId: TabId, taskId: TaskId, point: Point): Result<MutationOutcome, ApplicationError> {
    const resolved = this.#resolveTask(tabId, taskId);
    if (!resolved.ok) return resolved;
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
      return err({ code: 'invalid-board-point', taskId });
    }

    const tab = resolved.value.tab;
    const proposed: TabDocument = {
      ...tab,
      board: { ...tab.board, positions: { ...tab.board.positions, [taskId]: point } },
    };
    const boardValidation = validateBoardDocumentState(
      Object.values(tab.tasks).map((task) => task.id),
      proposed.board,
    );
    if (!boardValidation.ok) return err({ code: 'invalid-board-point', taskId });
    return this.#commitSimpleTab(tabId, proposed, this.#now());
  }

  connectFlow(input: ConnectFlowInput): Result<MutationOutcome, ApplicationError> {
    const tab = this.#workspace.tabs[input.tabId];
    if (tab === undefined) return err({ code: 'tab-not-found', tabId: input.tabId });
    if (tab.flowEdges[input.edgeId] !== undefined) {
      return err({ code: 'edge-id-in-use', edgeId: input.edgeId });
    }

    const now = this.#now();
    const meta: RevisionMeta = { createdAt: now, updatedAt: now, revision: 0 };
    const edge: FlowEdge =
      input.kind === 'reference'
        ? {
            id: input.edgeId,
            kind: 'reference',
            fromTaskId: input.fromTaskId,
            toTaskId: input.toTaskId,
            meta,
          }
        : {
            id: input.edgeId,
            kind: input.kind,
            fromTaskId: input.fromTaskId,
            toTaskId: input.toTaskId,
            order: input.order ?? 0,
            meta,
          };

    const added = addFlowEdge(
      Object.values(tab.tasks).map((task) => task.id),
      graphOf(tab),
      edge,
    );
    if (!added.ok) return err({ code: 'flow-invalid', causes: added.error });

    return this.#applyPrepared(
      input.tabId,
      prepareSemanticTransaction({
        original: tab,
        proposed: { ...tab, flowEdges: added.value.edges },
        baseRevision: this.#workspace.meta.revision,
        updatedAt: now,
      }),
    );
  }

  disconnectFlow(tabId: TabId, edgeId: FlowEdgeId): Result<MutationOutcome, ApplicationError> {
    const tab = this.#workspace.tabs[tabId];
    if (tab === undefined) return err({ code: 'tab-not-found', tabId });
    if (tab.flowEdges[edgeId] === undefined) return err({ code: 'edge-not-found', edgeId });

    const edges = withoutKey(tab.flowEdges, edgeId);
    const validation = validateFlowGraph(
      Object.values(tab.tasks).map((task) => task.id),
      edges,
    );
    if (!validation.ok) return err({ code: 'flow-invalid', causes: validation.error });

    const now = this.#now();
    return this.#applyPrepared(
      tabId,
      prepareSemanticTransaction({
        original: tab,
        proposed: { ...tab, flowEdges: validation.value.edges },
        baseRevision: this.#workspace.meta.revision,
        updatedAt: now,
      }),
    );
  }

  reorderLinearFlow(
    tabId: TabId,
    orderedTaskIds: readonly TaskId[],
  ): Result<MutationOutcome, ApplicationError> {
    const tab = this.#workspace.tabs[tabId];
    if (tab === undefined) return err({ code: 'tab-not-found', tabId });
    if (orderedTaskIds.length < 2 || new Set(orderedTaskIds).size !== orderedTaskIds.length) {
      return err({
        code: 'invalid-reorder',
        reason: 'Reorder requires at least two unique Tasks.',
      });
    }

    const selected = new Set(orderedTaskIds);
    if (orderedTaskIds.some((taskId) => tab.tasks[taskId] === undefined)) {
      return err({ code: 'invalid-reorder', reason: 'Reorder references an unknown Task.' });
    }

    const structural = Object.values(tab.flowEdges).filter(
      (edge): edge is StructuralFlowEdge => edge.kind !== 'reference',
    );
    const selectedEdges = structural.filter(
      (edge) => selected.has(edge.fromTaskId) && selected.has(edge.toTaskId),
    );
    const externalTouch = structural.some(
      (edge) => selected.has(edge.fromTaskId) !== selected.has(edge.toTaskId),
    );

    if (externalTouch || selectedEdges.length !== orderedTaskIds.length - 1) {
      return err({
        code: 'invalid-reorder',
        reason: 'Automatic reorder is limited to one isolated unambiguous structural chain.',
      });
    }

    const roots = orderedTaskIds.filter(
      (taskId) => !selectedEdges.some((edge) => edge.toTaskId === taskId),
    );
    if (roots.length !== 1) {
      return err({ code: 'invalid-reorder', reason: 'Selected Tasks do not form one chain.' });
    }

    const chainEdges: StructuralFlowEdge[] = [];
    let cursor = roots[0];
    const visited = new Set<TaskId>();
    while (cursor !== undefined && !visited.has(cursor)) {
      visited.add(cursor);
      const outgoing = selectedEdges.filter((edge) => edge.fromTaskId === cursor);
      if (outgoing.length > 1) {
        return err({ code: 'invalid-reorder', reason: 'Selected Flow contains a branch.' });
      }
      const next = outgoing[0];
      if (next === undefined) break;
      chainEdges.push(next);
      cursor = next.toTaskId;
    }

    if (visited.size !== orderedTaskIds.length || chainEdges.length !== orderedTaskIds.length - 1) {
      return err({ code: 'invalid-reorder', reason: 'Selected Tasks do not form one chain.' });
    }

    const now = this.#now();
    const rewritten = { ...tab.flowEdges };
    for (const [index, edge] of chainEdges.entries()) {
      const fromTaskId = orderedTaskIds[index];
      const toTaskId = orderedTaskIds[index + 1];
      if (fromTaskId === undefined || toTaskId === undefined) continue;
      rewritten[edge.id] = {
        ...edge,
        fromTaskId,
        toTaskId,
        meta: bumpMeta(edge.meta, now),
      };
    }

    const validation = validateFlowGraph(
      Object.values(tab.tasks).map((task) => task.id),
      rewritten,
    );
    if (!validation.ok) return err({ code: 'flow-invalid', causes: validation.error });

    return this.#applyPrepared(
      tabId,
      prepareSemanticTransaction({
        original: tab,
        proposed: { ...tab, flowEdges: validation.value.edges },
        baseRevision: this.#workspace.meta.revision,
        updatedAt: now,
      }),
    );
  }

  deleteTaskOnly(tabId: TabId, taskId: TaskId): Result<MutationOutcome, ApplicationError> {
    const resolved = this.#resolveTask(tabId, taskId);
    if (!resolved.ok) return resolved;
    const tab = resolved.value.tab;
    const graph = graphOf(tab);
    const incoming = incomingStructuralEdges(taskId, graph);
    const outgoing = outgoingStructuralEdges(taskId, graph);
    const remainingTasks = withoutKey(tab.tasks, taskId);
    let candidateEdges: Readonly<Record<string, FlowEdge>> = Object.fromEntries(
      Object.entries(tab.flowEdges).filter(
        ([, edge]) => edge.fromTaskId !== taskId && edge.toTaskId !== taskId,
      ),
    );
    let breaksFlowContinuity = incoming.length > 1 && outgoing.length > 1;

    if (!breaksFlowContinuity && incoming.length === 1 && outgoing.length === 1) {
      const before = incoming[0];
      const after = outgoing[0];
      if (before !== undefined && after !== undefined) {
        candidateEdges = {
          ...candidateEdges,
          [before.id]: {
            ...before,
            toTaskId: after.toTaskId,
            meta: bumpMeta(before.meta, this.#now()),
          },
        };
      }
    } else if (!breaksFlowContinuity && incoming.length === 1 && outgoing.length > 1) {
      const predecessor = incoming[0]?.fromTaskId;
      if (predecessor !== undefined) {
        const existingOrders = Object.values(candidateEdges)
          .filter(
            (edge): edge is StructuralFlowEdge =>
              edge.kind === 'branch' && edge.fromTaskId === predecessor,
          )
          .map((edge) => edge.order);
        let nextOrder = existingOrders.length === 0 ? 0 : Math.max(...existingOrders) + 1;
        const rewritten = { ...candidateEdges };
        for (const edge of outgoing) {
          rewritten[edge.id] = {
            ...edge,
            kind: 'branch',
            fromTaskId: predecessor,
            order: nextOrder,
            meta: bumpMeta(edge.meta, this.#now()),
          };
          nextOrder += 1;
        }
        candidateEdges = rewritten;
      }
    } else if (!breaksFlowContinuity && incoming.length > 1 && outgoing.length === 1) {
      const successor = outgoing[0]?.toTaskId;
      if (successor !== undefined) {
        const rewritten = { ...candidateEdges };
        for (const edge of incoming) {
          rewritten[edge.id] = {
            ...edge,
            toTaskId: successor,
            meta: bumpMeta(edge.meta, this.#now()),
          };
        }
        candidateEdges = rewritten;
      }
    }

    const validation = validateFlowGraph(
      Object.values(remainingTasks).map((task) => task.id),
      candidateEdges,
    );
    if (!validation.ok) {
      candidateEdges = Object.fromEntries(
        Object.entries(tab.flowEdges).filter(
          ([, edge]) => edge.fromTaskId !== taskId && edge.toTaskId !== taskId,
        ),
      );
      breaksFlowContinuity = incoming.length > 0 && outgoing.length > 0;
      const fallback = validateFlowGraph(
        Object.values(remainingTasks).map((task) => task.id),
        candidateEdges,
      );
      if (!fallback.ok) return err({ code: 'flow-invalid', causes: fallback.error });
      candidateEdges = fallback.value.edges;
    } else {
      candidateEdges = validation.value.edges;
    }

    const boardPositions = withoutKey(tab.board.positions, taskId);
    const now = this.#now();
    return this.#applyPrepared(
      tabId,
      prepareSemanticTransaction({
        original: tab,
        proposed: {
          ...tab,
          tasks: remainingTasks,
          flowEdges: candidateEdges,
          board: { ...tab.board, positions: boardPositions },
        },
        baseRevision: this.#workspace.meta.revision,
        breaksFlowContinuity,
        updatedAt: now,
      }),
    );
  }

  deleteDownstreamFlow(tabId: TabId, taskId: TaskId): Result<MutationOutcome, ApplicationError> {
    const resolved = this.#resolveTask(tabId, taskId);
    if (!resolved.ok) return resolved;
    const tab = resolved.value.tab;
    const graph = graphOf(tab);
    const deleteIds = new Set<TaskId>([taskId]);
    let cursor = taskId;

    while (true) {
      const outgoing = outgoingStructuralEdges(cursor, graph);
      if (outgoing.length !== 1) break;
      const next = outgoing[0]?.toTaskId;
      if (next === undefined || deleteIds.has(next)) break;
      if (
        incomingStructuralEdges(next, graph).length >= 2 ||
        outgoingStructuralEdges(next, graph).length >= 2
      ) {
        break;
      }
      deleteIds.add(next);
      cursor = next;
    }

    const tasks = Object.fromEntries(
      Object.entries(tab.tasks).filter(([, task]) => !deleteIds.has(task.id)),
    );
    const flowEdges = Object.fromEntries(
      Object.entries(tab.flowEdges).filter(
        ([, edge]) => !deleteIds.has(edge.fromTaskId) && !deleteIds.has(edge.toTaskId),
      ),
    );
    const positions = Object.fromEntries(
      Object.entries(tab.board.positions).filter(([id]) => !deleteIds.has(id as TaskId)),
    );
    const validation = validateFlowGraph(
      Object.values(tasks).map((task) => task.id),
      flowEdges,
    );
    if (!validation.ok) return err({ code: 'flow-invalid', causes: validation.error });

    const now = this.#now();
    return this.#applyPrepared(
      tabId,
      prepareSemanticTransaction({
        original: tab,
        proposed: {
          ...tab,
          tasks,
          flowEdges: validation.value.edges,
          board: { ...tab.board, positions },
        },
        baseRevision: this.#workspace.meta.revision,
        updatedAt: now,
      }),
    );
  }

  confirmMutation(planId: string): Result<WorkspaceDocument, ApplicationError> {
    const pending = this.#pending.get(planId);
    if (pending === undefined) return err({ code: 'plan-not-found', planId });
    if (pending.baseRevision !== this.#workspace.meta.revision) {
      this.#pending.delete(planId);
      return err({
        code: 'stale-plan',
        planId,
        baseRevision: pending.baseRevision,
        currentRevision: this.#workspace.meta.revision,
      });
    }

    this.#pending.delete(planId);
    return ok(this.#commitCanonical(pending.workspace));
  }

  cancelMutation(planId: string): Result<WorkspaceDocument, ApplicationError> {
    if (!this.#pending.has(planId)) return err({ code: 'plan-not-found', planId });
    this.#pending.delete(planId);
    return ok(this.#workspace);
  }

  #resolveTask(
    tabId: TabId,
    taskId: TaskId,
  ): Result<{ readonly tab: TabDocument; readonly task: Task }, ApplicationError> {
    const tab = this.#workspace.tabs[tabId];
    if (tab === undefined) return err({ code: 'tab-not-found', tabId });
    const task = tab.tasks[taskId];
    if (task === undefined) return err({ code: 'task-not-found', taskId });
    return ok({ tab, task });
  }

  #commitSimpleTab(
    tabId: TabId,
    tab: TabDocument,
    updatedAt: string,
  ): Result<MutationOutcome, ApplicationError> {
    return this.#commitWorkspace(tabId, tab, updatedAt);
  }

  #applyPrepared(
    tabId: TabId,
    prepared: PreparedSemanticTransaction,
  ): Result<MutationOutcome, ApplicationError> {
    const updatedAt = this.#now();
    const tab = bumpTabRevision(prepared.tab, updatedAt);
    const workspaceCandidate = bumpWorkspaceRevision(
      { ...this.#workspace, tabs: { ...this.#workspace.tabs, [tabId]: tab } },
      updatedAt,
    );
    const validation = validateWorkspaceDocument(workspaceCandidate);
    if (!validation.ok) return err({ code: 'workspace-invalid', causes: validation.error });

    if (prepared.requiresConfirmation) {
      this.#planCounter += 1;
      const planId = `plan-${this.#planCounter}`;
      this.#pending.set(planId, {
        baseRevision: prepared.impact.baseRevision,
        workspace: validation.value,
        impact: prepared.impact,
      });
      return ok({
        kind: 'confirmation-required',
        preview: { planId, impact: prepared.impact },
      });
    }

    this.#commitCanonical(validation.value);
    return ok({ kind: 'committed', workspace: this.#workspace });
  }

  #commitWorkspace(
    tabId: TabId,
    tab: TabDocument,
    updatedAt: string,
  ): Result<MutationOutcome, ApplicationError> {
    const bumpedTab = bumpTabRevision(tab, updatedAt);
    const candidate = bumpWorkspaceRevision(
      { ...this.#workspace, tabs: { ...this.#workspace.tabs, [tabId]: bumpedTab } },
      updatedAt,
    );
    const validation = validateWorkspaceDocument(candidate);
    if (!validation.ok) return err({ code: 'workspace-invalid', causes: validation.error });
    this.#commitCanonical(validation.value);
    return ok({ kind: 'committed', workspace: this.#workspace });
  }

  #commitCanonical(next: WorkspaceDocument): WorkspaceDocument {
    const previous = this.#workspace;
    this.#history.record(previous);
    this.#workspace = next;
    return this.#workspace;
  }
}
