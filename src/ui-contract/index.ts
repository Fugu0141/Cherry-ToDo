export type CherryView = 'board' | 'list';
export type CherryTaskStatus = 'todo' | 'done';
export type CherryTaskImportance = 'none' | 'low' | 'medium' | 'high' | 'urgent';
export type CherryFlowKind = 'continuation' | 'branch' | 'reference';
export type CherryTimeGuideMode = 'auto' | 'shown' | 'hidden';

export type CherryScheduleModel =
  | { readonly kind: 'none' }
  | { readonly kind: 'date'; readonly date: string }
  | {
      readonly kind: 'datetime';
      readonly date: string;
      readonly time: string;
      readonly timeZone?: string;
    };

export interface CherryBoardSettingsModel {
  readonly showDateLanes: boolean;
  readonly autoLayout: boolean;
  readonly timeGuide: CherryTimeGuideMode;
}

export interface BoardLaneModel {
  readonly id: string;
  readonly kind: 'all' | 'date' | 'undated';
  readonly date: string | null;
  readonly taskIds: readonly string[];
  readonly startY: number;
  readonly height: number;
}

export interface BoardPresentationModel {
  readonly settings: CherryBoardSettingsModel;
  readonly lanes: readonly BoardLaneModel[];
  readonly width: number;
  readonly height: number;
}

export interface CherryPoint {
  readonly x: number;
  readonly y: number;
}

export type CherryBoardDropTarget =
  | { readonly kind: 'canvas'; readonly point: CherryPoint }
  | {
      readonly kind: 'date-lane';
      readonly date: string | null;
      readonly point: CherryPoint;
      readonly collapsed: boolean;
    };

export interface DropTaskOnBoardIntent {
  readonly taskId: string;
  readonly target: CherryBoardDropTarget;
}

export interface WorkspaceSummaryModel {
  readonly id: string;
  readonly name: string;
  readonly updatedAt: string;
}

export interface TaskCardModel {
  readonly id: string;
  readonly title: string;
  readonly notes: string;
  readonly status: CherryTaskStatus;
  readonly importance: CherryTaskImportance;
  readonly schedule: CherryScheduleModel;
  readonly scheduleLabel: string | null;
  readonly isDerivedGoal: boolean;
  readonly isMergeTarget: boolean;
  readonly canManuallyComplete: boolean;
  readonly blocked: boolean;
  readonly blockedReasonKey: CherryMessageKey | null;
  readonly position: { readonly x: number; readonly y: number } | null;
}

export interface FlowConnectionModel {
  readonly id: string;
  readonly kind: CherryFlowKind;
  readonly fromTaskId: string;
  readonly toTaskId: string;
  readonly path: string | null;
}

export interface WorkspaceScreenModel {
  readonly workspaceId: string;
  readonly workspaceName: string;
  readonly tabId: string;
  readonly tabName: string;
  readonly activeView: CherryView;
  readonly board: BoardPresentationModel;
  readonly tasks: readonly TaskCardModel[];
  readonly connections: readonly FlowConnectionModel[];
  readonly canUndo: boolean;
  readonly canRedo: boolean;
}

export type CherryScreenModel =
  | { readonly kind: 'loading' }
  | { readonly kind: 'storage-decision' }
  | { readonly kind: 'start'; readonly workspaces: readonly WorkspaceSummaryModel[] }
  | { readonly kind: 'workspace'; readonly workspace: WorkspaceScreenModel }
  | { readonly kind: 'error'; readonly error: PresentationError };

export type PresentationErrorCode =
  'validation' | 'not-found' | 'conflict' | 'blocked' | 'stale-plan' | 'persistence' | 'unknown';

export interface PresentationError {
  readonly code: PresentationErrorCode;
  readonly messageKey: CherryMessageKey;
  readonly detail?: string;
}

export interface ConfirmationDescriptor {
  readonly id: string;
  readonly titleKey: CherryMessageKey;
  readonly messageKey: CherryMessageKey;
  readonly affectedTaskCount: number;
  readonly destructive: boolean;
}

export type UIActionResult =
  | { readonly kind: 'ok' }
  | { readonly kind: 'confirmation-required'; readonly confirmation: ConfirmationDescriptor }
  | { readonly kind: 'error'; readonly error: PresentationError };

export interface CreateWorkspaceIntent {
  readonly name: string;
}

export interface CreateTaskIntent {
  readonly title: string;
  readonly notes?: string;
  readonly importance?: CherryTaskImportance;
}

export interface UpdateTaskIntent {
  readonly taskId: string;
  readonly title?: string;
  readonly notes?: string;
  readonly importance?: CherryTaskImportance;
}

export interface ConnectTasksIntent {
  readonly fromTaskId: string;
  readonly toTaskId: string;
  readonly kind: CherryFlowKind;
}

export interface CherryUIIntents {
  readonly storage: {
    allow(): Promise<UIActionResult>;
    notNow(): Promise<UIActionResult>;
  };
  readonly workspace: {
    create(input: CreateWorkspaceIntent): Promise<UIActionResult>;
    open(workspaceId: string): Promise<UIActionResult>;
    goToStart(): Promise<UIActionResult>;
    setView(view: CherryView): Promise<UIActionResult>;
    setBoardSettings(settings: CherryBoardSettingsModel): Promise<UIActionResult>;
  };
  readonly task: {
    create(input: CreateTaskIntent): Promise<UIActionResult>;
    update(input: UpdateTaskIntent): Promise<UIActionResult>;
    setCompleted(taskId: string, completed: boolean): Promise<UIActionResult>;
    setSchedule(taskId: string, schedule: CherryScheduleModel): Promise<UIActionResult>;
  };
  readonly board: {
    dropTask(input: DropTaskOnBoardIntent): Promise<UIActionResult>;
  };
  readonly flow: {
    connect(input: ConnectTasksIntent): Promise<UIActionResult>;
  };
  readonly history: {
    undo(): Promise<UIActionResult>;
    redo(): Promise<UIActionResult>;
  };
  readonly confirmation: {
    confirm(id: string): Promise<UIActionResult>;
    cancel(id: string): Promise<UIActionResult>;
  };
}

export interface CherryUICapabilities {
  readonly persistentStorageAvailable: boolean;
  readonly boardView: boolean;
  readonly listView: boolean;
  readonly taskEditing: boolean;
  readonly structuralConnections: boolean;
}

export const CHERRY_SEMANTIC_STATES = [
  'task-card',
  'task-completed',
  'task-selected',
  'task-blocked',
  'derived-goal',
  'merge-target',
  'flow-connect-source',
  'flow-connect-target',
  'flow-continuation',
  'flow-branch',
  'flow-reference',
  'action-danger',
] as const;

export type CherrySemanticState = (typeof CHERRY_SEMANTIC_STATES)[number];

export interface CherrySemanticTokens {
  readonly stateAttribute: 'data-cherry-state';
  readonly states: readonly CherrySemanticState[];
}

export const CHERRY_SEMANTIC_TOKENS: CherrySemanticTokens = {
  stateAttribute: 'data-cherry-state',
  states: CHERRY_SEMANTIC_STATES,
};

export type CherryLocale = 'ja' | 'en';

export type CherryMessageKey =
  | 'app.name'
  | 'storage.title'
  | 'storage.description'
  | 'storage.allow'
  | 'storage.notNow'
  | 'start.title'
  | 'start.createWorkspace'
  | 'start.workspaceName'
  | 'workspace.board'
  | 'workspace.list'
  | 'board.dateLanes'
  | 'board.autoLayout'
  | 'board.timeGuide'
  | 'board.timeGuideAuto'
  | 'board.timeGuideShown'
  | 'board.timeGuideHidden'
  | 'board.undated'
  | 'task.create'
  | 'task.edit'
  | 'task.title'
  | 'task.notes'
  | 'task.schedule'
  | 'task.scheduleNone'
  | 'task.scheduleDate'
  | 'task.scheduleDateTime'
  | 'task.date'
  | 'task.time'
  | 'task.complete'
  | 'task.reopen'
  | 'task.goal'
  | 'task.merge'
  | 'task.blockedByMerge'
  | 'task.blockedDownstream'
  | 'flow.connect'
  | 'flow.from'
  | 'flow.to'
  | 'flow.kind'
  | 'flow.connectContinuation'
  | 'flow.connectBranch'
  | 'flow.connectReference'
  | 'flow.chooseTarget'
  | 'flow.cancelConnect'
  | 'common.save'
  | 'common.cancel'
  | 'common.confirm'
  | 'error.validation'
  | 'error.notFound'
  | 'error.conflict'
  | 'error.blocked'
  | 'error.stalePlan'
  | 'error.persistence'
  | 'error.unknown'
  | 'confirmation.reopen.title'
  | 'confirmation.reopen.message';

export interface CherryI18n {
  readonly locale: CherryLocale;
  t(key: CherryMessageKey, values?: Readonly<Record<string, string | number>>): string;
}

export interface CherryUIContext {
  getScreen(): CherryScreenModel;
  subscribe(listener: () => void): () => void;
  readonly intents: CherryUIIntents;
  readonly capabilities: CherryUICapabilities;
  readonly i18n: CherryI18n;
  readonly semanticTokens: CherrySemanticTokens;
}

export interface CherryUIHandle {
  unmount(): void;
}

export interface CherryUIPackage<THost = unknown> {
  mount(host: THost, context: CherryUIContext): CherryUIHandle;
}

export { createCherryI18n } from './i18n';
