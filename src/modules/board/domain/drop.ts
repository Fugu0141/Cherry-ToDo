import type { TaskId } from '../../../shared/ids/index';
import type { BoardSettings, Point } from './board';

export type BoardDropTarget =
  | {
      readonly kind: 'canvas';
      readonly point: Point;
    }
  | {
      readonly kind: 'date-lane';
      readonly date: string | null;
      readonly point: Point;
      readonly collapsed: boolean;
    }
  | {
      readonly kind: 'task';
      readonly taskId: TaskId;
    }
  | {
      readonly kind: 'flow-reorder';
      readonly orderedTaskIds: readonly TaskId[];
    };

export type DropIntent =
  | {
      readonly kind: 'visual-move';
      readonly point: Point;
    }
  | {
      readonly kind: 'assign-date';
      readonly date: string | null;
      readonly point?: Point;
    }
  | {
      readonly kind: 'connect-task';
      readonly targetTaskId: TaskId;
    }
  | {
      readonly kind: 'reorder-flow';
      readonly orderedTaskIds: readonly TaskId[];
    }
  | { readonly kind: 'cancel' };

export type BoardPlacementDropIntent = Extract<
  DropIntent,
  { readonly kind: 'visual-move' | 'assign-date' | 'cancel' }
>;

export interface ResolveDropIntentInput {
  readonly taskId: TaskId;
  readonly settings: BoardSettings;
  readonly target: BoardDropTarget;
  readonly connectMode?: boolean;
  readonly reorderMode?: boolean;
  readonly cancelled?: boolean;
}

function finitePoint(point: Point): boolean {
  return Number.isFinite(point.x) && Number.isFinite(point.y);
}

export function resolveDropIntent(input: ResolveDropIntentInput): DropIntent {
  if (input.cancelled === true) return { kind: 'cancel' };

  const { target } = input;
  if (target.kind === 'date-lane') {
    if (!finitePoint(target.point)) return { kind: 'cancel' };
    return {
      kind: 'assign-date',
      date: target.date,
      ...(input.settings.autoLayout ? {} : { point: target.point }),
    };
  }

  if (target.kind === 'task') {
    if (input.connectMode !== true || target.taskId === input.taskId) {
      return { kind: 'cancel' };
    }
    return { kind: 'connect-task', targetTaskId: target.taskId };
  }

  if (target.kind === 'flow-reorder') {
    if (input.reorderMode !== true || !target.orderedTaskIds.includes(input.taskId)) {
      return { kind: 'cancel' };
    }
    return { kind: 'reorder-flow', orderedTaskIds: target.orderedTaskIds };
  }

  if (input.settings.autoLayout || !finitePoint(target.point)) {
    return { kind: 'cancel' };
  }

  return { kind: 'visual-move', point: target.point };
}
