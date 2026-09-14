import { createEmptyBoardDocumentState, layoutBoard } from '../modules/board/index';
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
  parseFlowEdgeId,
  parseTabId,
  parseTaskId,
  parseWorkspaceId,
  type TabId,
  type TaskId,
} from '../shared/ids/index';
import {
  CHERRY_SEMANTIC_TOKENS,
  createCherryI18n,
  type CherryFlowKind,
  type CherryLocale,
  type CherryMessageKey,
  type CherryScheduleModel,
  type CherryScreenModel,
  type CherryUIContext,
  type CherryUIIntents,
  type CherryView,
  type PresentationError,
  type UIActionResult,
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
    error.code === 'edge-not-found' ||
    error.code === 'plan-not-found'
  ) {
    return { code: 'not-found', messageKey: 'error.notFound' };
  }
  if (error.code === 'task-id-in-use' || error.code === 'edge-id-in-use') {
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

  readonly capabilities = {
    persistentStorageAvailable: true,
    boardView: true,
    listView: true,
    taskEditing: true,
    structuralConnections: true,
  } as const;
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
      },
      workspace: {
        create: (input) => this.#createWorkspace(input.name),
        open: (workspaceId) => this.#openWorkspace(workspaceId),
        goToStart: () => this.#showStart(),
        setView: (view) => this.#setView(view),
        setBoardSettings: (settings) =>
          this.#runMutation((store, tabId) => store.setBoardSettings(tabId, settings)),
      },
      task: {
        create: (input) =>
          this.#runMutation((store, tabId) =>
            store.createTask(tabId, {
              id: unwrapId(parseTaskId(randomId('task'))),
              title: input.title.trim(),
              notes: input.notes ?? '',
              importance: input.importance ?? 'none',
            }),
          ),
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
      },
      flow: {
        connect: (input) => this.#connect(input.fromTaskId, input.toTaskId, input.kind),
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

  async #setView(view: CherryView): Promise<UIActionResult> {
    if (this.#store === null || this.#tabId === null) {
      return this.#error('not-found', 'error.notFound');
    }
    this.#view = view;
    await this.#rememberSession();
    this.#refreshWorkspace();
    return OK;
  }

  async #setSchedule(rawTaskId: string, model: CherryScheduleModel): Promise<UIActionResult> {
    const schedule = scheduleFromModel(model);
    if (schedule === null) return this.#error('validation', 'error.validation');
    return this.#withTaskId(rawTaskId, (taskId) =>
      this.#runMutation((store, tabId) => store.setSchedule(tabId, taskId, schedule)),
    );
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

  async #withTaskId(
    rawId: string,
    action: (taskId: TaskId) => Promise<UIActionResult>,
  ): Promise<UIActionResult> {
    const parsed = parseTaskId(rawId);
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
    const layout = layoutBoard(
      Object.values(tab.tasks).map((task) => ({
        id: task.id,
        scheduleDate: task.schedule.kind === 'none' ? null : task.schedule.date,
        ...(tab.board.positions[task.id] === undefined
          ? {}
          : { manualPosition: tab.board.positions[task.id] }),
      })),
      structuralEdges.map((edge) => ({
        fromTaskId: edge.fromTaskId,
        toTaskId: edge.toTaskId,
      })),
      tab.board.settings,
    );

    const model: WorkspaceScreenModel = {
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      tabId: tab.id,
      tabName: tab.name,
      activeView: this.#view,
      board: {
        settings: tab.board.settings,
        lanes: layout.lanes.map((lane) => ({
          id: lane.id,
          kind: lane.kind,
          date: lane.date,
          taskIds: lane.taskIds,
          startY: lane.startY,
          height: lane.height,
        })),
        width: layout.width,
        height: layout.height,
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
          canManuallyComplete: manual?.kind === 'available',
          blocked,
          blockedReasonKey: blocked ? 'task.blockedByMerge' : null,
          position: layout.tasks[task.id]?.point ?? null,
        };
      }),
      connections: Object.values(tab.flowEdges).map((edge) => ({
        id: edge.id,
        kind: edge.kind,
        fromTaskId: edge.fromTaskId,
        toTaskId: edge.toTaskId,
      })),
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
