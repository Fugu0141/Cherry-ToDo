import type { Point } from './board';

export type BoardFlowOrientation = 'horizontal' | 'vertical';

export interface BoardFlowConnectorGeometry {
  readonly path: string;
  readonly start: Point;
  readonly end: Point;
}

const DEFAULT_CARD_WIDTH = 240;
const DEFAULT_CARD_HEIGHT = 126;
const MIN_CONTROL_DISTANCE = 48;

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

export function buildBoardFlowConnectorGeometry(
  from: Point,
  to: Point,
  cardWidth = DEFAULT_CARD_WIDTH,
  cardHeight = DEFAULT_CARD_HEIGHT,
  orientation: BoardFlowOrientation = 'horizontal',
): BoardFlowConnectorGeometry {
  if (orientation === 'vertical') {
    const start = {
      x: from.x + cardWidth / 2,
      y: from.y + cardHeight,
    };
    const end = {
      x: to.x + cardWidth / 2,
      y: to.y,
    };
    const deltaY = end.y - start.y;
    const direction = deltaY >= 0 ? 1 : -1;
    const controlDistance = Math.max(MIN_CONTROL_DISTANCE, Math.abs(deltaY) * 0.45);
    const control1 = {
      x: start.x,
      y: start.y + direction * controlDistance,
    };
    const control2 = {
      x: end.x,
      y: end.y - direction * controlDistance,
    };

    return {
      start,
      end,
      path: `M ${round(start.x)} ${round(start.y)} C ${round(control1.x)} ${round(control1.y)}, ${round(control2.x)} ${round(control2.y)}, ${round(end.x)} ${round(end.y)}`,
    };
  }

  const start = {
    x: from.x + cardWidth,
    y: from.y + cardHeight / 2,
  };
  const end = {
    x: to.x,
    y: to.y + cardHeight / 2,
  };
  const deltaX = end.x - start.x;
  const direction = deltaX >= 0 ? 1 : -1;
  const controlDistance = Math.max(MIN_CONTROL_DISTANCE, Math.abs(deltaX) * 0.45);
  const control1 = {
    x: start.x + direction * controlDistance,
    y: start.y,
  };
  const control2 = {
    x: end.x - direction * controlDistance,
    y: end.y,
  };

  return {
    start,
    end,
    path: `M ${round(start.x)} ${round(start.y)} C ${round(control1.x)} ${round(control1.y)}, ${round(control2.x)} ${round(control2.y)}, ${round(end.x)} ${round(end.y)}`,
  };
}
