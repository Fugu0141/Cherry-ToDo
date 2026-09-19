import {
  commitPreparedExternalImport,
  exportTabToCsv,
  importCsvToTab,
  importIcsToTab,
  prepareExternalImportAsNewTab,
  type ExternalTabImport,
} from '../adapters/interop/index';
import { annotationBounds } from '../modules/annotation/index';
import {
  buildBoardFlowConnectorGeometry,
  createEmptyBoardDocumentState,
  layoutBoard,
  resolveDropIntent,
} from '../modules/board/index';
import {
  noSchedule,
  scheduleAtDateTime,
  scheduleOnDate,
  type Schedule,
} from '../modules/schedule/index';
import type { StartupState } from '../modules/startup/index';
import {
  ApplicationStore,
  CHERRY_V2_SCHEMA_VERSION,
  type ApplicationError,
  type MutationOutcome,
  type WorkspaceDocument,
} from '../modules/workspace/index';
import {
  parseAnnotationId,
  parseFlowEdgeId,
  parseTabId,
  parseTaskId,
  parseWorkspaceId,
  type AnnotationId,
  type TabId,
  type TaskId,
} from '../shared/ids/index';
import {
  CHERRY_SEMANTIC_TOKENS,
  createCherryI18n,
  type CherryFlowKind,
  type CherryLocale,
  type CreateTaskIntent,
  type CherryMessageKey,
  type CherryScheduleModel,
  type CherryScreenModel,
  type CherryUIContext,
  type CherryUIIntents,
  type CherryView,
  type DropTaskOnBoardIntent,
  type PresentationError,
  type UIActionResult,
  type UITextExportResult,
  type WorkspaceScreenModel,
} from '../ui-contract/index';
import type { BrowserApplicationComposition } from './create-browser-application';

const OK: UIActionResult = { kind: 'ok' };

function presentationError(error: ApplicationError): PresentationError {
  if (error.code === 'completion-blocked' || error.code === 'derived-goal-controlled') {
    return { code: 'blocked', messageKey: 'error.blocked' };
  }
  if (error.code === 'stale-plan') {
    return { code: 'stale-plan', messageKey: 'error.stalePlan' };
  }
  if (
    error.code === 'tab-not-found' ||
    error.code === 'task-not-found' ||
    error.code === 'annotation-not-found' ||
    error.code === 'edge-not-found' ||
    error.code === 'plan-not-found'
  ) {
    return { code: 'not-found', messageKey: 'error.notFound' };
  }
  if (
    error.code === 'tab-id-in-use' ||
    error.code === 'task-id-in-use' ||
    error.code === 'annotation-id-in-use' ||
    error.code === 'edge-id-in-use'
  ) {
    return { code: 'conflict', messageKey: 'error.conflict' };
  }
  return { code: 'validation', messageKey: 'error.validation' };
}

function scheduleLabel(schedule: Schedule): string | null {
  if (schedule.kind === 'none') return null;
  if (schedule.kind === 'date') return schedule.date;
  return `${schedule.date} ${schedule.time}`;
}

function scheduleModel(schedule: Schedule): CherryScheduleModel {
  if (schedule.kind === 'none') return { kind: 'none' };
  if (schedule.kind === 'date') return { kind: 'date', date: schedule.date };
  return {
    kind: 'datetime',
    date: schedule.date,
    time: schedule.time,
    ...(schedule.timeZone === undefined ? {} : { timeZone: schedule.timeZone }),
  };
}

function scheduleFromModel(model: CherryScheduleModel): Schedule | null {
  if (model.kind === 'none') return noSchedule();
  if (model.kind === 'date') {
    const parsed = scheduleOnDate(model.date);
    return parsed.ok ? parsed.value : null;
  }
  const parsed = scheduleAtDateTime(model.date, model.time, model.timeZone);
  return parsed.ok ? parsed.value : null;
}

function unwrapId<T>(result: { readonly ok: true; readonly value: T } | { readonly ok: false }): T {
  if (!result.ok) throw new Error('Generated Cherry entity ID was invalid.');
  return result.value;
}

function randomId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

function deriveLinearFlowOrder(
  taskIds: readonly string[],
  edges: readonly { readonly fromTaskId: string; readonly toTaskId: string }[],
): readonly string[] | null {
  if (taskIds.length < 2 || edges.length !== taskIds.length - 1) return null;
  const incoming = new Map<string, string>();
  const outgoing = new Map<string, string>();
  for (const edge of edges) {
    if (incoming.has(edge.toTaskId) || outgoing.has(edge.fromTaskId)) return null;
    incoming.set(edge.toTaskId, edge.fromTaskId);
    outgoing.set(edge.fromTaskId, edge.toTaskId);
  }
  const roots = taskIds.filter((taskId) => !incoming.has(taskId));
  if (roots.length !== 1) return null;
  const ordered: string[] = [];
  const visited = new Set<string>();
  let cursor: string | undefined = roots[0];
  while (cursor !== undefined && !visited.has(cursor)) {
    ordered.push(cursor);
    visited.add(cursor);
    cursor = outgoing.get(cursor);
  }
  return ordered.length === taskIds.length ? ordered : null;
}

function createWorkspaceDocument(name: string): { document: WorkspaceDocument; tabId: TabId } {
  const now = new Date().toISOString();
  const workspaceId = unwrapId(parseWorkspaceId(randomId('workspace')));
  const tabId = unwrapId(parseTabId(randomId('tab')));
  const meta = { createdAt: now, updatedAt: now, revision: 0 };

  return {
    tabId,
    document: {
      schemaVersion: CHERRY_V2_SCHEMA_VERSION,
      id: workspaceId,
      name,
      tabs: {
        [tabId]: {
          id: tabId,
          name: 'Plan',
          tasks: {},
          flowEdges: {},
          annotations: {},
          board: createEmptyBoardDocumentState(),
          meta,
        },
      },
      tabOrder: [tabId],
      meta,
    },
  };
}

function confirmationResult(outcome: MutationOutcome): UIActionResult {
  if (outcome.kind === 'committed') return OK;
  const affected = new Set([
    ...outcome.preview.impact.directChanges,
    ...outcome.preview.impact.autoReopenedGoalIds,
    ...outcome.preview.impact.invalidatedCompletedTaskIds,
  ]);
  return {
    kind: 'confirmation-required',
    confirmation: {
      id: outcome.preview.planId,
      titleKey: 'confirmation.reopen.title',
      messageKey: 'confirmation.reopen.message',
      affectedTaskCount: affected.size,
      destructive: true,
    },
  };
}

export class CherryUIRuntime implements CherryUIContext {
  readonly #application: BrowserApplicationComposition;
  readonly #listeners = new Set<() => void>();
  #screen: CherryScreenModel = { kind: 'loading' };
  #store: ApplicationStore | null = null;
  #tabId: TabId | null = null;
  #view: CherryView = 'board';

  get capabilities() {
    return {
      persistentStorageAvailable: true,
      persistentStorageEnabled: this.#application.persistence.mode === 'persistent',
      boardView: true,
      listView: true,
      taskEditing: true,
      structuralConnections: true,
      annotations: true,
    } as const;
  }
  readonly semanticTokens = CHERRY_SEMANTIC_TOKENS;
  readonly i18n;
  readonly intents: CherryUIIntents;

  constructor(application: BrowserApplicationComposition, locale: CherryLocale = 'ja') {
    this.#application = application;
    this.i18n = createCherryI18n(locale);
    this.intents = {
      storage: {
        allow: () => this.#resolveStartup(this.#application.startup.chooseAllow()),
        notNow: () => this.#resolveStartup(this.#application.startup.chooseNotNow()),
        disable: (clearPersistentData) => this.#disablePersistence(clearPersistentData),
      },
      workspace: {
        create: (input) => this.#createWorkspace(input.name),
        open: (workspaceId) => this.#openWorkspace(workspaceId),
        createTab: (input) => this.#createTab(input.name),
        renameTab: (input) => this.#renameTab(input.tabId, input.name),
        duplicateTab: (tabId) => this.#duplicateTab(tabId),
        deleteTab: (tabId) => this.#deleteTab(tabId),
        openTab: (tabId) => this.#openTab(tabId),
        goToStart: () => this.#showStart(),
        setView: (view) => this.#setView(view),
        setBoardSettings: (settings) =>
          this.#runMutation((store, tabId) => store.setBoardSettings(tabId, settings)),
      },
      task: {
        create: (input) => this.#createTask(input),
        update: (input) =>
          this.#withTaskId(input.taskId, (taskId) =>
            this.#runMutation((store, tabId) =>
              store.updateTask(tabId, taskId, {
                ...(input.title === undefined ? {} : { title: input.title.trim() }),
                ...(input.notes === undefined ? {} : { notes: input.notes }),
                ...(input.importance === undefined ? {} : { importance: input.importance }),
              }),
            ),
          ),
        setCompleted: (taskId, completed) =>
          this.#withTaskId(taskId, (parsed) =>
            this.#runMutation((store, tabId) =>
              store.setTaskStatus(tabId, parsed, completed ? 'done' : 'todo'),
            ),
          ),
        setSchedule: (taskId, schedule) => this.#setSchedule(taskId, schedule),
        deleteOnly: (taskId) =>
          this.#withTaskId(taskId, (parsed) =>
            this.#runMutation((store, tabId) => store.deleteTaskOnly(tabId, parsed)),
          ),
        deleteDownstream: (taskId) =>
          this.#withTaskId(taskId, (parsed) =>
            this.#runMutation((store, tabId) => store.deleteDownstreamFlow(tabId, parsed)),
          ),
      },
      board: {
        dropTask: (input) => this.#dropTask(input),
      },
      flow: {
        connect: (input) => this.#connect(input.fromTaskId, input.toTaskId, input.kind),
        disconnect: (edgeId) => this.#disconnect(edgeId),
        reorder: (orderedTaskIds) => this.#reorder(orderedTaskIds),
      },
      annotation: {
        createText: (input) =>
          this.#runMutation((store, tabId) =>
            store.createTextAnnotation(tabId, {
              id: unwrapId(parseAnnotationId(randomId('annotation'))),
              rect: input.rect,
              text: input.text,
              styleToken: input.styleToken,
            }),
          ),
        createStroke: (input) =>
          this.#runMutation((store, tabId) =>
            store.createStrokeAnnotation(tabId, {
              id: unwrapId(parseAnnotationId(randomId('annotation'))),
              points: input.points,
              widthToken: input.widthToken,
              styleToken: input.styleToken,
            }),
          ),
        updateText: (input) =>
          this.#withAnnotationId(input.annotationId, (annotationId) =>
            this.#runMutation((store, tabId) =>
              store.updateAnnotation(tabId, annotationId, {
                ...(input.rect === undefined ? {} : { rect: input.rect }),
                ...(input.text === undefined ? {} : { text: input.text }),
                ...(input.styleToken === undefined ? {} : { styleToken: input.styleToken }),
              }),
            ),
          ),
        updateStroke: (input) =>
          this.#withAnnotationId(input.annotationId, (annotationId) =>
            this.#runMutation((store, tabId) =>
              store.updateAnnotation(tabId, annotationId, {
                ...(input.points === undefined ? {} : { points: input.points }),
                ...(input.widthToken === undefined ? {} : { widthToken: input.widthToken }),
                ...(input.styleToken === undefined ? {} : { styleToken: input.styleToken }),
              }),
            ),
          ),
        delete: (annotationId) =>
          this.#withAnnotationId(annotationId, (parsed) =>
            this.#runMutation((store, tabId) => store.deleteAnnotation(tabId, parsed)),
          ),
      },
      interop: {
        exportCsv: () => this.#exportCsv(),
        importCsv: (input) => this.#importExternalText('csv', input.source, input.name),
        importIcs: (input) => this.#importExternalText('ics', input.source, input.name),
      },
      history: {
        undo: () => this.#history('undo'),
        redo: () => this.#history('redo'),
      },
      confirmation: {
        confirm: (id) => this.#confirm(id),
        cancel: (id) => this.#cancel(id),
      },
    };
  }

  getScreen(): CherryScreenModel {
    return this.#screen;
  }

  subscribe(listener: () => void): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  async boot(): Promise<void> {
    await this.#applyStartupState(await this.#application.startup.boot());
  }

  async #disablePersistence(clearPersistentData: boolean): Promise<UIActionResult> {
    const result = await this.#application.persistence.disablePersistence({
      clearPersistentData,
      confirmed: true,
    });
    if (result.kind === 'failed') return this.#error('persistence', 'error.persistence');

    if (this.#store === null) await this.#showStart();
    else this.#refreshWorkspace();
    return OK;
  }

  async #resolveStartup(statePromise: Promise<StartupState>): Promise<UIActionResult> {
    await this.#applyStartupState(await statePromise);
    return this.#screen.kind === 'error' ? { kind: 'error', error: this.#screen.error } : OK;
  }

  async #applyStartupState(state: StartupState): Promise<void> {
    if (state.kind === 'need-storage-decision') {
      this.#setScreen({ kind: 'storage-decision' });
      return;
    }
    if (state.kind === 'start') {
      await this.#showStart();
      return;
    }
    if (state.kind === 'workspace') {
      this.#store = new ApplicationStore(state.workspace);
      this.#tabId = state.context.tabId;
      this.#view = state.context.view;
      this.#refreshWorkspace();
      return;
    }
    if (state.kind === 'recoverable-error') {
      this.#setScreen({
        kind: 'error',
        error: { code: 'persistence', messageKey: 'error.persistence', detail: state.message },
      });
      return;
    }
    this.#setScreen({ kind: 'loading' });
  }

  async #showStart(): Promise<UIActionResult> {
    this.#store = null;
    this.#tabId = null;
    await this.#application.startup.clearSession();
    const workspaces = await this.#application.persistence.workspaceRepository.list();
    this.#setScreen({
      kind: 'start',
      workspaces: workspaces.map((workspace) => ({
        id: workspace.id,
        name: workspace.name,
        updatedAt: workspace.updatedAt,
      })),
    });
    return OK;
  }

  async #createWorkspace(rawName: string): Promise<UIActionResult> {
    const name = rawName.trim();
    if (name.length === 0) return this.#error('validation', 'error.validation');
    const created = createWorkspaceDocument(name);
    const saved = await this.#application.persistence.workspaceRepository.save(created.document);
    if (saved.kind !== 'saved') return this.#error('persistence', 'error.persistence');
    this.#store = new ApplicationStore(created.document);
    this.#tabId = created.tabId;
    this.#view = 'board';
    await this.#rememberSession();
    this.#refreshWorkspace();
    return OK;
  }

  async #openWorkspace(rawId: string): Promise<UIActionResult> {
    const parsed = parseWorkspaceId(rawId);
    if (!parsed.ok) return this.#error('validation', 'error.validation');
    const workspace = await this.#application.persistence.workspaceRepository.load(parsed.value);
    if (workspace === null) return this.#error('not-found', 'error.notFound');
    const tabId = workspace.tabOrder[0];
    if (tabId === undefined) return this.#error('not-found', 'error.notFound');
    this.#store = new ApplicationStore(workspace);
    this.#tabId = tabId;
    this.#view = 'board';
    await this.#rememberSession();
    this.#refreshWorkspace();
    return OK;
  }

  async #createTab(rawName: string): Promise<UIActionResult> {
    if (this.#store === null || this.#tabId === null) {
      return this.#error('not-found', 'error.notFound');
    }
    const name = rawName.trim();
    if (name.length === 0) return this.#error('validation', 'error.validation');

    const previous = this.#store.workspace;
    const tabId = unwrapId(parseTabId(randomId('tab')));
    const result = this.#store.createTab(tabId, name);
    if (!result.ok) return { kind: 'error', error: presentationError(result.error) };
    if (result.value.kind === 'confirmation-required') return confirmationResult(result.value);

    const saved = await this.#application.persistence.workspaceRepository.save(
      this.#store.workspace,
      previous.meta.revision,
    );
    if (saved.kind !== 'saved') {
      this.#store = new ApplicationStore(previous);
      this.#refreshWorkspace();
      return this.#error(
        saved.kind === 'revision-conflict' ? 'conflict' : 'persistence',
        saved.kind === 'revision-conflict' ? 'error.conflict' : 'error.persistence',
      );
    }

    this.#tabId = tabId;
    await this.#rememberSession();
    this.#refreshWorkspace();
    return OK;
  }

  async #renameTab(rawId: string, rawName: string): Promise<UIActionResult> {
    if (this.#store === null) return this.#error('not-found', 'error.notFound');
    const parsed = parseTabId(rawId);
    if (!parsed.ok) return this.#error('validation', 'error.validation');
    const previous = this.#store.workspace;
    const result = this.#store.renameTab(parsed.value, rawName);
    if (!result.ok) return { kind: 'error', error: presentationError(result.error) };
    const saved = await this.#application.persistence.workspaceRepository.save(
      this.#store.workspace,
      previous.meta.revision,
    );
    if (saved.kind !== 'saved') {
      this.#store = new ApplicationStore(previous);
      this.#refreshWorkspace();
      return this.#error(
        saved.kind === 'revision-conflict' ? 'conflict' : 'persistence',
        saved.kind === 'revision-conflict' ? 'error.conflict' : 'error.persistence',
      );
    }
    this.#refreshWorkspace();
    return OK;
  }

  async #duplicateTab(rawId: string): Promise<UIActionResult> {
    if (this.#store === null) return this.#error('not-found', 'error.notFound');
    const parsed = parseTabId(rawId);
    if (!parsed.ok) return this.#error('validation', 'error.validation');
    const previous = this.#store.workspace;
    const tabId = unwrapId(parseTabId(randomId('tab')));
    const result = this.#store.duplicateTab(parsed.value, tabId);
    if (!result.ok) return { kind: 'error', error: presentationError(result.error) };
    const saved = await this.#application.persistence.workspaceRepository.save(
      this.#store.workspace,
      previous.meta.revision,
    );
    if (saved.kind !== 'saved') {
      this.#store = new ApplicationStore(previous);
      this.#refreshWorkspace();
      return this.#error(
        saved.kind === 'revision-conflict' ? 'conflict' : 'persistence',
        saved.kind === 'revision-conflict' ? 'error.conflict' : 'error.persistence',
      );
    }
    this.#tabId = tabId;
    await this.#rememberSession();
    this.#refreshWorkspace();
    return OK;
  }

  async #deleteTab(rawId: string): Promise<UIActionResult> {
    if (this.#store === null) return this.#error('not-found', 'error.notFound');
    const parsed = parseTabId(rawId);
    if (!parsed.ok) return this.#error('validation', 'error.validation');
    const previous = this.#store.workspace;
    const result = this.#store.deleteTab(parsed.value);
    if (!result.ok) return { kind: 'error', error: presentationError(result.error) };

    if (this.#store.workspace.tabOrder.length === 0) {
      await this.#application.persistence.workspaceRepository.delete(this.#store.workspace.id);
      this.#store = null;
      this.#tabId = null;
      return this.#showStart();
    }

    const saved = await this.#application.persistence.workspaceRepository.save(
      this.#store.workspace,
      previous.meta.revision,
    );
    if (saved.kind !== 'saved') {
      this.#store = new ApplicationStore(previous);
      this.#refreshWorkspace();
      return this.#error(
        saved.kind === 'revision-conflict' ? 'conflict' : 'persistence',
        saved.kind === 'revision-conflict' ? 'error.conflict' : 'error.persistence',
      );
    }
    if (this.#tabId === parsed.value) {
      const fallback = this.#store.workspace.tabOrder[0];
      if (fallback === undefined) return this.#error('not-found', 'error.notFound');
      this.#tabId = fallback;
      await this.#rememberSession();
    }
    this.#refreshWorkspace();
    return OK;
  }

  async #openTab(rawId: string): Promise<UIActionResult> {
    if (this.#store === null) return this.#error('not-found', 'error.notFound');
    const parsed = parseTabId(rawId);
    if (!parsed.ok) return this.#error('validation', 'error.validation');
    if (this.#store.workspace.tabs[parsed.value] === undefined) {
      return this.#error('not-found', 'error.notFound');
    }
    this.#tabId = parsed.value;
    await this.#rememberSession();
    this.#refreshWorkspace();
    return OK;
  }

  async #setView(view: CherryView): Promise<UIActionResult> {
    if (this.#store === null || this.#tabId === null) {
      return this.#error('not-found', 'error.notFound');
    }
    this.#view = view;
    await this.#rememberSession();
    this.#refreshWorkspace();
    return OK;
  }

  async #createTask(input: CreateTaskIntent): Promise<UIActionResult> {
    const schedule =
      input.schedule === undefined ? noSchedule() : scheduleFromModel(input.schedule);
    if (schedule === null) return this.#error('validation', 'error.validation');

    return this.#runMutation((store, tabId) =>
      store.createTask(tabId, {
        id: unwrapId(parseTaskId(randomId('task'))),
        title: input.title.trim(),
        notes: input.notes ?? '',
        importance: input.importance ?? 'none',
        schedule,
      }),
    );
  }

  async #setSchedule(rawTaskId: string, model: CherryScheduleModel): Promise<UIActionResult> {
    const schedule = scheduleFromModel(model);
    if (schedule === null) return this.#error('validation', 'error.validation');
    return this.#withTaskId(rawTaskId, (taskId) =>
      this.#runMutation((store, tabId) => store.setSchedule(tabId, taskId, schedule)),
    );
  }

  async #dropTask(input: DropTaskOnBoardIntent): Promise<UIActionResult> {
    if (this.#store === null || this.#tabId === null) {
      return this.#error('not-found', 'error.notFound');
    }
    const taskId = parseTaskId(input.taskId);
    if (!taskId.ok) return this.#error('validation', 'error.validation');
    const tab = this.#store.workspace.tabs[this.#tabId];
    if (tab === undefined) return this.#error('not-found', 'error.notFound');

    const intent = resolveDropIntent({
      taskId: taskId.value,
      settings: tab.board.settings,
      target: input.target,
    });
    if (intent.kind === 'connect-task' || intent.kind === 'reorder-flow') {
      return this.#error('validation', 'error.validation');
    }

    return this.#runMutation((store, tabId) => store.applyBoardDrop(tabId, taskId.value, intent));
  }

  async #connect(fromRaw: string, toRaw: string, kind: CherryFlowKind): Promise<UIActionResult> {
    const from = parseTaskId(fromRaw);
    const to = parseTaskId(toRaw);
    if (!from.ok || !to.ok) return this.#error('validation', 'error.validation');
    return this.#runMutation((store, tabId) =>
      store.connectFlow({
        tabId,
        edgeId: unwrapId(parseFlowEdgeId(randomId('edge'))),
        kind,
        fromTaskId: from.value,
        toTaskId: to.value,
      }),
    );
  }

  async #disconnect(rawEdgeId: string): Promise<UIActionResult> {
    const edgeId = parseFlowEdgeId(rawEdgeId);
    if (!edgeId.ok) return this.#error('validation', 'error.validation');
    return this.#runMutation((store, tabId) => store.disconnectFlow(tabId, edgeId.value));
  }

  async #reorder(rawTaskIds: readonly string[]): Promise<UIActionResult> {
    const parsed = rawTaskIds.map((taskId) => parseTaskId(taskId));
    if (parsed.some((result) => !result.ok)) {
      return this.#error('validation', 'error.validation');
    }
    const taskIds = parsed.flatMap((result) => (result.ok ? [result.value] : []));
    return this.#runMutation((store, tabId) => store.reorderLinearFlow(tabId, taskIds));
  }

  async #withTaskId(
    rawId: string,
    action: (taskId: TaskId) => Promise<UIActionResult>,
  ): Promise<UIActionResult> {
    const parsed = parseTaskId(rawId);
    if (!parsed.ok) return this.#error('validation', 'error.validation');
    return action(parsed.value);
  }

  async #withAnnotationId(
    rawId: string,
    action: (annotationId: AnnotationId) => Promise<UIActionResult>,
  ): Promise<UIActionResult> {
    const parsed = parseAnnotationId(rawId);
    if (!parsed.ok) return this.#error('validation', 'error.validation');
    return action(parsed.value);
  }

  async #runMutation(
    action: (store: ApplicationStore, tabId: TabId) => ReturnType<ApplicationStore['createTask']>,
  ): Promise<UIActionResult> {
    if (this.#store === null || this.#tabId === null) {
      return this.#error('not-found', 'error.notFound');
    }
    const previous = this.#store.workspace;
    const result = action(this.#store, this.#tabId);
    if (!result.ok) return { kind: 'error', error: presentationError(result.error) };
    if (result.value.kind === 'confirmation-required') return confirmationResult(result.value);
    const saved = await this.#application.persistence.workspaceRepository.save(
      this.#store.workspace,
      previous.meta.revision,
    );
    if (saved.kind !== 'saved') {
      this.#store = new ApplicationStore(previous);
      this.#refreshWorkspace();
      return this.#error(
        saved.kind === 'revision-conflict' ? 'conflict' : 'persistence',
        saved.kind === 'revision-conflict' ? 'error.conflict' : 'error.persistence',
      );
    }
    this.#refreshWorkspace();
    return OK;
  }

  async #exportCsv(): Promise<UITextExportResult> {
    await Promise.resolve();
    if (this.#store === null || this.#tabId === null) {
      return { kind: 'error', error: { code: 'not-found', messageKey: 'error.notFound' } };
    }
    const tab = this.#store.workspace.tabs[this.#tabId];
    if (tab === undefined) {
      return { kind: 'error', error: { code: 'not-found', messageKey: 'error.notFound' } };
    }
    const stem = tab.name.trim().replace(new RegExp('[\\\\/:*?"<>|]+', 'g'), '_') || 'cherry-tab';
    return {
      kind: 'ok',
      fileName: `${stem}.csv`,
      mimeType: 'text/csv;charset=utf-8',
      content: exportTabToCsv(tab),
    };
  }

  async #importExternalText(
    format: 'csv' | 'ics',
    source: string,
    rawName: string,
  ): Promise<UIActionResult> {
    if (this.#store === null || this.#tabId === null) {
      return this.#error('not-found', 'error.notFound');
    }
    const name = rawName.trim() || (format === 'csv' ? 'CSV import' : 'Calendar import');
    const parsed = format === 'csv' ? importCsvToTab(source, name) : importIcsToTab(source, name);
    if (!parsed.ok) {
      return {
        kind: 'error',
        error: { code: 'validation', messageKey: 'error.validation', detail: parsed.error.message },
      };
    }
    const imported: ExternalTabImport = parsed.value;
    const previous = this.#store.workspace;
    const prepared = prepareExternalImportAsNewTab(previous, imported);
    if (!prepared.ok) {
      return {
        kind: 'error',
        error: {
          code: 'validation',
          messageKey: 'error.validation',
          detail: prepared.error.message,
        },
      };
    }
    const committed = await commitPreparedExternalImport(
      this.#application.persistence.workspaceRepository,
      previous,
      prepared.value,
    );
    if (committed.kind !== 'saved') {
      return this.#error(
        committed.result.kind === 'revision-conflict' ? 'conflict' : 'persistence',
        committed.result.kind === 'revision-conflict' ? 'error.conflict' : 'error.persistence',
      );
    }
    this.#store = new ApplicationStore(committed.workspace);
    this.#tabId = prepared.value.importedTabId;
    this.#view = 'board';
    await this.#rememberSession();
    this.#refreshWorkspace();
    return OK;
  }

  async #history(direction: 'undo' | 'redo'): Promise<UIActionResult> {
    if (this.#store === null) return this.#error('not-found', 'error.notFound');
    const previous = this.#store.workspace;
    const result = direction === 'undo' ? this.#store.undo() : this.#store.redo();
    if (!result.ok) return { kind: 'error', error: presentationError(result.error) };
    const saved = await this.#application.persistence.workspaceRepository.save(
      result.value,
      previous.meta.revision,
    );
    if (saved.kind !== 'saved') {
      this.#store = new ApplicationStore(previous);
      this.#refreshWorkspace();
      return this.#error('persistence', 'error.persistence');
    }
    if (this.#tabId === null || result.value.tabs[this.#tabId] === undefined) {
      const fallbackTabId = result.value.tabOrder[0];
      if (fallbackTabId === undefined) return this.#error('not-found', 'error.notFound');
      this.#tabId = fallbackTabId;
      await this.#rememberSession();
    }
    this.#refreshWorkspace();
    return OK;
  }

  async #confirm(planId: string): Promise<UIActionResult> {
    if (this.#store === null) return this.#error('not-found', 'error.notFound');
    const previous = this.#store.workspace;
    const result = this.#store.confirmMutation(planId);
    if (!result.ok) return { kind: 'error', error: presentationError(result.error) };
    const saved = await this.#application.persistence.workspaceRepository.save(
      result.value,
      previous.meta.revision,
    );
    if (saved.kind !== 'saved') {
      this.#store = new ApplicationStore(previous);
      this.#refreshWorkspace();
      return this.#error('persistence', 'error.persistence');
    }
    this.#refreshWorkspace();
    return OK;
  }

  #cancel(planId: string): Promise<UIActionResult> {
    if (this.#store === null) {
      return Promise.resolve(this.#error('not-found', 'error.notFound'));
    }
    const result = this.#store.cancelMutation(planId);
    if (!result.ok) {
      return Promise.resolve({ kind: 'error', error: presentationError(result.error) });
    }
    this.#refreshWorkspace();
    return Promise.resolve(OK);
  }

  async #rememberSession(): Promise<void> {
    if (this.#store === null || this.#tabId === null) return;
    await this.#application.startup.rememberSession({
      workspaceId: this.#store.workspace.id,
      tabId: this.#tabId,
      view: this.#view,
    });
  }

  #refreshWorkspace(): void {
    if (this.#store === null || this.#tabId === null) return;
    const workspace = this.#store.workspace;
    const tab = workspace.tabs[this.#tabId];
    if (tab === undefined) {
      this.#setScreen({
        kind: 'error',
        error: { code: 'not-found', messageKey: 'error.notFound' },
      });
      return;
    }
    const execution = this.#store.taskExecutionReadModels(this.#tabId);
    if (!execution.ok) {
      this.#setScreen({ kind: 'error', error: presentationError(execution.error) });
      return;
    }

    const structuralEdges = Object.values(tab.flowEdges).filter(
      (edge) => edge.kind !== 'reference',
    );
    const incomingStructuralCounts = new Map<string, number>();
    for (const edge of structuralEdges) {
      incomingStructuralCounts.set(
        edge.toTaskId,
        (incomingStructuralCounts.get(edge.toTaskId) ?? 0) + 1,
      );
    }
    const layoutTasks = Object.values(tab.tasks).map((task) => ({
      id: task.id,
      scheduleDate: task.schedule.kind === 'none' ? null : task.schedule.date,
      ...(tab.board.positions[task.id] === undefined
        ? {}
        : { manualPosition: tab.board.positions[task.id] }),
    }));
    const layoutEdges = structuralEdges.map((edge) => ({
      fromTaskId: edge.fromTaskId,
      toTaskId: edge.toTaskId,
    }));
    const layout = layoutBoard(layoutTasks, layoutEdges, tab.board.settings, 'horizontal');
    const mobileLayout = layoutBoard(layoutTasks, layoutEdges, tab.board.settings, 'vertical');

    const annotationExtents = Object.values(tab.annotations).map((annotation) => {
      if (annotation.kind === 'text') {
        return {
          x: annotation.rect.x + annotation.rect.width,
          y: annotation.rect.y + annotation.rect.height,
        };
      }
      const bounds = annotationBounds(annotation.points);
      return { x: bounds.x + bounds.width, y: bounds.y + bounds.height };
    });
    const annotationWidth = Math.max(0, ...annotationExtents.map((extent) => extent.x)) + 80;
    const annotationHeight = Math.max(0, ...annotationExtents.map((extent) => extent.y)) + 80;

    const model: WorkspaceScreenModel = {
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      tabId: tab.id,
      tabName: tab.name,
      tabs: workspace.tabOrder.flatMap((tabId) => {
        const candidate = workspace.tabs[tabId];
        return candidate === undefined ? [] : [{ id: candidate.id, name: candidate.name }];
      }),
      activeView: this.#view,
      board: {
        settings: tab.board.settings,
        lanes: layout.lanes.map((lane) => ({
          id: lane.id,
          kind: lane.kind,
          date: lane.date,
          taskIds: lane.taskIds,
          ...(lane.startX === undefined ? {} : { startX: lane.startX }),
          ...(lane.width === undefined ? {} : { width: lane.width }),
          startY: lane.startY,
          height: lane.height,
        })),
        width: Math.max(layout.width, annotationWidth),
        height: Math.max(layout.height, annotationHeight),
        mobileLanes: mobileLayout.lanes.map((lane) => ({
          id: lane.id,
          kind: lane.kind,
          date: lane.date,
          taskIds: lane.taskIds,
          ...(lane.startX === undefined ? {} : { startX: lane.startX }),
          ...(lane.width === undefined ? {} : { width: lane.width }),
          startY: lane.startY,
          height: lane.height,
        })),
        mobileWidth: Math.max(mobileLayout.width, annotationWidth),
        mobileHeight: Math.max(mobileLayout.height, annotationHeight),
      },
      tasks: Object.values(tab.tasks).map((task) => {
        const state = execution.value[task.id];
        const manual = state?.manualCompletionControl;
        const blocked = manual?.kind === 'blocked-by-merge';
        return {
          id: task.id,
          title: task.title,
          notes: task.notes,
          status: task.status,
          importance: task.appearance.importance,
          schedule: scheduleModel(task.schedule),
          scheduleLabel: scheduleLabel(task.schedule),
          isDerivedGoal: state?.isDerivedBranchingGoal ?? false,
          isMergeTarget: (incomingStructuralCounts.get(task.id) ?? 0) >= 2,
          canManuallyComplete: manual?.kind === 'available',
          blocked,
          blockedReasonKey: blocked ? 'task.blockedByMerge' : null,
          position: layout.tasks[task.id]?.point ?? null,
          mobilePosition: mobileLayout.tasks[task.id]?.point ?? null,
        };
      }),
      annotations: Object.values(tab.annotations).map((annotation) =>
        annotation.kind === 'text'
          ? {
              id: annotation.id,
              kind: 'text' as const,
              rect: annotation.rect,
              text: annotation.text,
              styleToken: annotation.styleToken,
            }
          : {
              id: annotation.id,
              kind: 'stroke' as const,
              points: annotation.points,
              widthToken: annotation.widthToken,
              styleToken: annotation.styleToken,
            },
      ),
      linearFlowOrder: deriveLinearFlowOrder(
        Object.values(tab.tasks).map((task) => task.id),
        structuralEdges.map((edge) => ({
          fromTaskId: edge.fromTaskId,
          toTaskId: edge.toTaskId,
        })),
      ),
      connections: Object.values(tab.flowEdges).map((edge) => {
        const from = layout.tasks[edge.fromTaskId]?.point;
        const to = layout.tasks[edge.toTaskId]?.point;
        const mobileFrom = mobileLayout.tasks[edge.fromTaskId]?.point;
        const mobileTo = mobileLayout.tasks[edge.toTaskId]?.point;
        return {
          id: edge.id,
          kind: edge.kind,
          fromTaskId: edge.fromTaskId,
          toTaskId: edge.toTaskId,
          path:
            from === undefined || to === undefined
              ? null
              : buildBoardFlowConnectorGeometry(from, to).path,
          mobilePath:
            mobileFrom === undefined || mobileTo === undefined
              ? null
              : buildBoardFlowConnectorGeometry(mobileFrom, mobileTo, 210, 112, 'vertical').path,
        };
      }),
      canUndo: this.#store.historyState.canUndo,
      canRedo: this.#store.historyState.canRedo,
    };
    this.#setScreen({ kind: 'workspace', workspace: model });
  }

  #error(code: PresentationError['code'], messageKey: CherryMessageKey): UIActionResult {
    return { kind: 'error', error: { code, messageKey } };
  }

  #setScreen(screen: CherryScreenModel): void {
    this.#screen = screen;
    for (const listener of this.#listeners) listener();
  }
}
