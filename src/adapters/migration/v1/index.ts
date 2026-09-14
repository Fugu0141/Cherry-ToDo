import { DEFAULT_BOARD_SETTINGS, type BoardDocumentState } from '../../../modules/board/index';
import { isDerivedBranchingGoal, type FlowEdge, type FlowGraph } from '../../../modules/flow/index';
import {
  noSchedule,
  scheduleAtDateTime,
  scheduleOnDate,
  type Schedule,
} from '../../../modules/schedule/index';
import type { Task, TaskStatus } from '../../../modules/task/index';
import {
  CHERRY_V2_SCHEMA_VERSION,
  validateWorkspaceDocument,
  type TabDocument,
  type WorkspaceDocument,
  type WorkspaceRepository,
  type WorkspaceSaveResult,
} from '../../../modules/workspace/index';
import {
  parseFlowEdgeId,
  parseTabId,
  parseTaskId,
  parseWorkspaceId,
  type FlowEdgeId,
  type TabId,
  type TaskId,
  type WorkspaceId,
} from '../../../shared/ids/index';
import type { RevisionMeta } from '../../../shared/revision/index';
import { err, ok, type Result } from '../../../shared/result/index';

export interface V1MigrationWarning {
  readonly code:
    | 'invalid-schedule-normalized'
    | 'orphan-parent-disconnected'
    | 'extra-continuation-normalized-to-branch'
    | 'invalid-position-dropped'
    | 'generated-entity-id';
  readonly tabId?: string;
  readonly taskId?: string;
  readonly detail: string;
}

export interface V1CompletionNormalization {
  readonly taskId: TaskId;
  readonly from: TaskStatus;
  readonly to: TaskStatus;
  readonly reason: 'derived-goal-flow-evaluator';
}

export interface PreparedV1Migration {
  readonly sourceKind: 'workspace' | 'payload';
  readonly candidate: WorkspaceDocument;
  readonly normalized: WorkspaceDocument;
  readonly warnings: readonly V1MigrationWarning[];
  readonly completionNormalizations: readonly V1CompletionNormalization[];
  readonly requiresConfirmation: boolean;
}

export type V1MigrationError =
  | { readonly code: 'invalid-json'; readonly message: string }
  | { readonly code: 'unsupported-v1-format'; readonly message: string }
  | { readonly code: 'invalid-v1-workspace'; readonly message: string }
  | { readonly code: 'invalid-v2-candidate'; readonly message: string };

export type V1MigrationCommitResult =
  | { readonly kind: 'saved'; readonly workspace: WorkspaceDocument }
  | { readonly kind: 'workspace-id-conflict'; readonly workspaceId: WorkspaceId }
  | { readonly kind: 'save-failed'; readonly result: WorkspaceSaveResult };

export interface V1MigrationOptions {
  readonly now?: string;
  readonly workspaceName?: string;
}

type UnknownRecord = Readonly<Record<string, unknown>>;

function isRecord(value: unknown): value is UnknownRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function text(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function bool(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

function stableHash(value: unknown): string {
  const source = stableJson(value);
  let hash = 0x811c9dc5;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function parsedId<T>(
  parse: (value: string) => { readonly ok: true; readonly value: T } | { readonly ok: false },
  preferred: string | null,
  fallback: string,
  warnings: V1MigrationWarning[],
  detail: string,
): T {
  if (preferred !== null) {
    const parsed = parse(preferred);
    if (parsed.ok) return parsed.value;
  }
  const generated = parse(fallback);
  if (!generated.ok) throw new Error('Deterministic migration fallback ID was invalid.');
  warnings.push({ code: 'generated-entity-id', detail });
  return generated.value;
}

function revisionMeta(value: unknown, fallback: string): RevisionMeta {
  const timestamp = typeof value === 'string' && value.trim().length > 0 ? value : fallback;
  return { createdAt: timestamp, updatedAt: timestamp, revision: 0 };
}

function scheduleFromLegacy(
  task: UnknownRecord,
  warnings: V1MigrationWarning[],
  tabId: string,
  taskId: string,
): Schedule {
  const legacySchedule = isRecord(task.schedule) ? task.schedule : null;
  if (legacySchedule !== null) {
    const type = text(legacySchedule.type);
    const date = text(legacySchedule.date);
    const time = text(legacySchedule.time);
    if (type === 'none') return noSchedule();
    if (type === 'date' && date !== null) {
      const scheduled = scheduleOnDate(date);
      if (scheduled.ok) return scheduled.value;
    }
    if (type === 'datetime' && date !== null && time !== null) {
      const scheduled = scheduleAtDateTime(date, time);
      if (scheduled.ok) return scheduled.value;
    }
    warnings.push({
      code: 'invalid-schedule-normalized',
      tabId,
      taskId,
      detail: 'Invalid V1 schedule was converted to an unscheduled V2 Task.',
    });
    return noSchedule();
  }

  const targetAt = text(task.targetAt);
  if (targetAt !== null) {
    const scheduled = scheduleOnDate(targetAt);
    if (scheduled.ok) return scheduled.value;
    warnings.push({
      code: 'invalid-schedule-normalized',
      tabId,
      taskId,
      detail: 'Invalid legacy targetAt value was converted to an unscheduled V2 Task.',
    });
  }
  return noSchedule();
}

function boardState(state: UnknownRecord, positions: Readonly<Record<string, { x: number; y: number }>>): BoardDocumentState {
  const board = isRecord(state.board) ? state.board : {};
  const settings = isRecord(board.settings) ? board.settings : {};
  const timeGuideCandidate = text(settings.timeGuide);
  const timeGuide =
    timeGuideCandidate === 'shown' || timeGuideCandidate === 'hidden' || timeGuideCandidate === 'auto'
      ? timeGuideCandidate
      : DEFAULT_BOARD_SETTINGS.timeGuide;
  return {
    settings: {
      showDateLanes:
        bool(state.showLanes) ?? bool(settings.showDateLanes) ?? DEFAULT_BOARD_SETTINGS.showDateLanes,
      autoLayout: bool(settings.autoLayout) ?? DEFAULT_BOARD_SETTINGS.autoLayout,
      timeGuide,
    },
    positions,
  };
}

function descendants(taskId: TaskId, graph: FlowGraph): readonly TaskId[] {
  const outgoing = new Map<TaskId, TaskId[]>();
  for (const edge of Object.values(graph.edges)) {
    if (edge.kind === 'reference') continue;
    const list = outgoing.get(edge.fromTaskId) ?? [];
    list.push(edge.toTaskId);
    outgoing.set(edge.fromTaskId, list);
  }
  const seen = new Set<TaskId>();
  const queue = [...(outgoing.get(taskId) ?? [])];
  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined || seen.has(current)) continue;
    seen.add(current);
    queue.push(...(outgoing.get(current) ?? []));
  }
  return [...seen];
}

function normalizeDerivedGoalStatuses(tab: TabDocument): {
  readonly tab: TabDocument;
  readonly changes: readonly V1CompletionNormalization[];
} {
  const graph: FlowGraph = { edges: tab.flowEdges };
  const memo = new Map<TaskId, TaskStatus>();
  const expected = (taskId: TaskId): TaskStatus => {
    const cached = memo.get(taskId);
    if (cached !== undefined) return cached;
    const task = tab.tasks[taskId];
    if (task === undefined) return 'todo';
    if (!isDerivedBranchingGoal(taskId, graph)) {
      memo.set(taskId, task.status);
      return task.status;
    }
    const downstream = descendants(taskId, graph);
    const status: TaskStatus =
      downstream.length > 0 && downstream.every((id) => expected(id) === 'done') ? 'done' : 'todo';
    memo.set(taskId, status);
    return status;
  };

  const changes: V1CompletionNormalization[] = [];
  const tasks: Record<string, Task> = {};
  for (const task of Object.values(tab.tasks)) {
    const nextStatus = expected(task.id);
    if (nextStatus !== task.status && isDerivedBranchingGoal(task.id, graph)) {
      changes.push({
        taskId: task.id,
        from: task.status,
        to: nextStatus,
        reason: 'derived-goal-flow-evaluator',
      });
    }
    tasks[task.id] = nextStatus === task.status ? task : { ...task, status: nextStatus };
  }
  return { tab: { ...tab, tasks }, changes };
}

function migrateTab(
  rawTab: UnknownRecord,
  index: number,
  now: string,
  warnings: V1MigrationWarning[],
): Result<TabDocument, V1MigrationError> {
  const tabId = parsedId(
    parseTabId,
    text(rawTab.id),
    `v1-tab-${index + 1}`,
    warnings,
    `Generated an ID for V1 tab ${index + 1}.`,
  );
  const state = isRecord(rawTab.state) ? rawTab.state : null;
  if (state === null || !isRecord(state.tasks)) {
    return err({ code: 'invalid-v1-workspace', message: `V1 tab "${tabId}" has no task map.` });
  }

  const taskEntries = Object.entries(state.tasks);
  const tasks: Record<string, Task> = {};
  const aliases = new Map<string, TaskId>();
  const positions: Record<string, { x: number; y: number }> = {};

  for (const [taskKey, rawTaskValue] of taskEntries) {
    if (!isRecord(rawTaskValue)) continue;
    const rawId = text(rawTaskValue.id) ?? taskKey;
    const taskId = parsedId(
      parseTaskId,
      rawId,
      `v1-task-${index + 1}-${Object.keys(tasks).length + 1}`,
      warnings,
      `Generated an ID for V1 task "${rawId}".`,
    );
    if (tasks[taskId] !== undefined) {
      return err({ code: 'invalid-v1-workspace', message: `Duplicate V1 task ID "${taskId}".` });
    }
    aliases.set(taskKey, taskId);
    aliases.set(rawId, taskId);
    const meta = revisionMeta(rawTab.updatedAt, now);
    const task: Task = {
      id: taskId,
      title: text(rawTaskValue.title) ?? '',
      notes: text(rawTaskValue.notes) ?? '',
      status: rawTaskValue.status === 'done' ? 'done' : 'todo',
      schedule: scheduleFromLegacy(rawTaskValue, warnings, tabId, taskId),
      appearance: { importance: 'none' },
      meta,
    };
    tasks[taskId] = task;

    const x = finiteNumber(rawTaskValue.x);
    const y = finiteNumber(rawTaskValue.y);
    if (x !== null && y !== null) positions[taskId] = { x, y };
    else if (rawTaskValue.x !== undefined || rawTaskValue.y !== undefined) {
      warnings.push({
        code: 'invalid-position-dropped',
        tabId,
        taskId,
        detail: 'Invalid V1 board coordinates were ignored.',
      });
    }
  }

  const flowEdges: Record<string, FlowEdge> = {};
  const continuationUsed = new Set<TaskId>();
  const branchOrder = new Map<TaskId, number>();
  let edgeIndex = 0;
  for (const [taskKey, rawTaskValue] of taskEntries) {
    if (!isRecord(rawTaskValue)) continue;
    const childId = aliases.get(text(rawTaskValue.id) ?? taskKey);
    const rawParentId = text(rawTaskValue.parentId);
    if (childId === undefined || rawParentId === null) continue;
    const parentId = aliases.get(rawParentId);
    if (parentId === undefined) {
      warnings.push({
        code: 'orphan-parent-disconnected',
        tabId,
        taskId: childId,
        detail: `Parent "${rawParentId}" was not found; the Task was imported without that connection.`,
      });
      continue;
    }
    edgeIndex += 1;
    const edgeId = parsedId(
      parseFlowEdgeId,
      null,
      `v1-edge-${index + 1}-${edgeIndex}`,
      warnings,
      `Generated a Flow edge ID for V1 relationship ${edgeIndex}.`,
    );
    const requestedBranch = rawTaskValue.branchMode === 'branch';
    let kind: 'continuation' | 'branch';
    if (!requestedBranch && !continuationUsed.has(parentId)) {
      kind = 'continuation';
      continuationUsed.add(parentId);
    } else {
      kind = 'branch';
      if (!requestedBranch) {
        warnings.push({
          code: 'extra-continuation-normalized-to-branch',
          tabId,
          taskId: childId,
          detail: `V1 parent "${parentId}" had multiple main continuations; later ones were imported as branches.`,
        });
      }
    }
    const order = kind === 'branch' ? branchOrder.get(parentId) ?? 0 : 0;
    if (kind === 'branch') branchOrder.set(parentId, order + 1);
    const meta = revisionMeta(rawTab.updatedAt, now);
    flowEdges[edgeId] = { id: edgeId, kind, fromTaskId: parentId, toTaskId: childId, order, meta };
  }

  const name = text(rawTab.name)?.trim();
  return ok({
    id: tabId,
    name: name && name.length > 0 ? name : index === 0 ? 'Plan' : `Plan ${index + 1}`,
    tasks,
    flowEdges,
    annotations: {},
    board: boardState(state, positions),
    meta: revisionMeta(rawTab.updatedAt, now),
  });
}

function unwrapWorkspace(input: unknown): Result<{
  readonly sourceKind: 'workspace' | 'payload';
  readonly workspace: UnknownRecord;
}, V1MigrationError> {
  if (!isRecord(input)) {
    return err({ code: 'unsupported-v1-format', message: 'V1 import root must be an object.' });
  }
  if (input.format === 'cherry-workspace' && input.version === 1 && isRecord(input.workspace)) {
    return ok({ sourceKind: 'payload', workspace: input.workspace });
  }
  if (input.version === 1 && Array.isArray(input.tabs)) {
    return ok({ sourceKind: 'workspace', workspace: input });
  }
  return err({
    code: 'unsupported-v1-format',
    message: 'Expected a Cherry V1 workspace or a Cherry V1 workspace payload.',
  });
}

export function prepareV1Migration(
  input: string | unknown,
  options: V1MigrationOptions = {},
): Result<PreparedV1Migration, V1MigrationError> {
  let parsed: unknown = input;
  if (typeof input === 'string') {
    try {
      parsed = JSON.parse(input);
    } catch {
      return err({ code: 'invalid-json', message: 'The V1 workspace is not valid JSON.' });
    }
  }
  const unwrapped = unwrapWorkspace(parsed);
  if (!unwrapped.ok) return unwrapped;
  const rawWorkspace = unwrapped.value.workspace;
  if (!Array.isArray(rawWorkspace.tabs)) {
    return err({ code: 'invalid-v1-workspace', message: 'V1 workspace has no tab array.' });
  }

  const now = options.now ?? new Date().toISOString();
  const warnings: V1MigrationWarning[] = [];
  const workspaceId = parsedId(
    parseWorkspaceId,
    null,
    `v1-workspace-${stableHash(rawWorkspace)}`,
    warnings,
    'Generated a deterministic V2 Workspace ID for the V1 source.',
  );
  const tabs: Record<string, TabDocument> = {};
  const tabOrder: TabId[] = [];
  for (const [index, rawTabValue] of rawWorkspace.tabs.entries()) {
    if (!isRecord(rawTabValue)) continue;
    const migrated = migrateTab(rawTabValue, index, now, warnings);
    if (!migrated.ok) return migrated;
    if (tabs[migrated.value.id] !== undefined) {
      return err({ code: 'invalid-v1-workspace', message: `Duplicate V1 tab ID "${migrated.value.id}".` });
    }
    tabs[migrated.value.id] = migrated.value;
    tabOrder.push(migrated.value.id);
  }
  if (tabOrder.length === 0) {
    return err({ code: 'invalid-v1-workspace', message: 'V1 workspace contains no supported tabs.' });
  }

  const workspaceMeta = revisionMeta(rawWorkspace.updatedAt, now);
  const candidate: WorkspaceDocument = {
    schemaVersion: CHERRY_V2_SCHEMA_VERSION,
    id: workspaceId,
    name: options.workspaceName?.trim() || 'Imported Cherry V1',
    tabs,
    tabOrder,
    meta: workspaceMeta,
  };
  const candidateValidation = validateWorkspaceDocument(candidate);
  if (!candidateValidation.ok) {
    return err({
      code: 'invalid-v2-candidate',
      message: `V1 data cannot be represented safely as V2 (${candidateValidation.error.map((issue) => issue.code).join(', ')}).`,
    });
  }

  const normalizedTabs: Record<string, TabDocument> = {};
  const completionNormalizations: V1CompletionNormalization[] = [];
  for (const tab of Object.values(candidate.tabs)) {
    const normalized = normalizeDerivedGoalStatuses(tab);
    normalizedTabs[tab.id] = normalized.tab;
    completionNormalizations.push(...normalized.changes);
  }
  const normalized: WorkspaceDocument = { ...candidate, tabs: normalizedTabs };
  const normalizedValidation = validateWorkspaceDocument(normalized);
  if (!normalizedValidation.ok) {
    return err({ code: 'invalid-v2-candidate', message: 'Normalized V1 migration candidate is invalid.' });
  }

  return ok({
    sourceKind: unwrapped.value.sourceKind,
    candidate,
    normalized,
    warnings,
    completionNormalizations,
    requiresConfirmation: completionNormalizations.length > 0,
  });
}

export async function commitPreparedV1Migration(
  repository: WorkspaceRepository,
  prepared: PreparedV1Migration,
): Promise<V1MigrationCommitResult> {
  const existing = await repository.load(prepared.normalized.id);
  if (existing !== null) {
    return { kind: 'workspace-id-conflict', workspaceId: prepared.normalized.id };
  }
  const result = await repository.save(prepared.normalized);
  return result.kind === 'saved'
    ? { kind: 'saved', workspace: prepared.normalized }
    : { kind: 'save-failed', result };
}
