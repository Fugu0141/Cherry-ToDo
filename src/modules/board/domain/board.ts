import type { TaskId } from '../../../shared/ids/index.ts';
import { err, ok, type Result } from '../../../shared/result/index.ts';

export interface Point {
  readonly x: number;
  readonly y: number;
}

export type TimeGuideMode = 'auto' | 'shown' | 'hidden';

export interface BoardSettings {
  readonly showDateLanes: boolean;
  readonly autoLayout: boolean;
  readonly timeGuide: TimeGuideMode;
}

export interface BoardDocumentState {
  readonly settings: BoardSettings;
  readonly positions: Readonly<Record<string, Point>>;
  readonly annotationViewportPolicy?: 'board';
}

export interface BoardValidationError {
  readonly code: 'invalid-point' | 'unknown-position-task';
  readonly taskId: string;
}

export const DEFAULT_BOARD_SETTINGS: BoardSettings = {
  showDateLanes: true,
  autoLayout: true,
  timeGuide: 'auto',
};

export function createEmptyBoardDocumentState(): BoardDocumentState {
  return { settings: DEFAULT_BOARD_SETTINGS, positions: {} };
}

export function validateBoardDocumentState(
  taskIds: readonly TaskId[],
  state: BoardDocumentState,
): Result<BoardDocumentState, readonly BoardValidationError[]> {
  const errors: BoardValidationError[] = [];
  const taskIdSet = new Set<string>(taskIds);

  for (const [taskId, point] of Object.entries(state.positions)) {
    if (!taskIdSet.has(taskId)) {
      errors.push({ code: 'unknown-position-task', taskId });
    }
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
      errors.push({ code: 'invalid-point', taskId });
    }
  }

  return errors.length === 0 ? ok(state) : err(errors);
}
