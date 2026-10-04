import type { TaskId } from '../../../shared/ids/index';
import { err, ok, type Result } from '../../../shared/result/index';

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

export type BoardValidationError =
  | {
      readonly code: 'invalid-point' | 'unknown-position-task';
      readonly taskId: string;
    }
  | {
      readonly code: 'invalid-settings';
      readonly message: string;
    }
  | {
      readonly code: 'invalid-setting';
      readonly setting: keyof BoardSettings;
      readonly message: string;
    }
  | {
      readonly code: 'invalid-positions';
      readonly message: string;
    };

export const DEFAULT_BOARD_SETTINGS: BoardSettings = {
  showDateLanes: true,
  autoLayout: true,
  timeGuide: 'auto',
};

export function createEmptyBoardDocumentState(): BoardDocumentState {
  return { settings: DEFAULT_BOARD_SETTINGS, positions: {} };
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function validateBoardDocumentState(
  taskIds: readonly TaskId[],
  state: BoardDocumentState,
): Result<BoardDocumentState, readonly BoardValidationError[]> {
  const errors: BoardValidationError[] = [];
  const taskIdSet = new Set<string>(taskIds);
  const settings = state.settings as unknown;

  if (!isRecord(settings)) {
    errors.push({
      code: 'invalid-settings',
      message: 'Board settings must be an object.',
    });
  } else {
    if (typeof settings.showDateLanes !== 'boolean') {
      errors.push({
        code: 'invalid-setting',
        setting: 'showDateLanes',
        message: 'Board setting showDateLanes must be boolean.',
      });
    }
    if (typeof settings.autoLayout !== 'boolean') {
      errors.push({
        code: 'invalid-setting',
        setting: 'autoLayout',
        message: 'Board setting autoLayout must be boolean.',
      });
    }
    if (
      settings.timeGuide !== 'auto' &&
      settings.timeGuide !== 'shown' &&
      settings.timeGuide !== 'hidden'
    ) {
      errors.push({
        code: 'invalid-setting',
        setting: 'timeGuide',
        message: 'Board setting timeGuide must be auto, shown, or hidden.',
      });
    }
  }

  const positions = state.positions as unknown;
  if (!isRecord(positions)) {
    errors.push({
      code: 'invalid-positions',
      message: 'Board positions must be an object.',
    });
  } else {
    for (const [taskId, pointValue] of Object.entries(positions)) {
      if (!taskIdSet.has(taskId)) {
        errors.push({ code: 'unknown-position-task', taskId });
      }
      if (
        !isRecord(pointValue) ||
        typeof pointValue.x !== 'number' ||
        typeof pointValue.y !== 'number' ||
        !Number.isFinite(pointValue.x) ||
        !Number.isFinite(pointValue.y)
      ) {
        errors.push({ code: 'invalid-point', taskId });
      }
    }
  }

  return errors.length === 0 ? ok(state) : err(errors);
}
