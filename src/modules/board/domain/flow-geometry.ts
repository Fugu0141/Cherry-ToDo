import type { Point } from './board';

export type BoardFlowOrientation = 'horizontal' | 'vertical';

export interface BoardFlowConnectorGeometry {
  readonly path: string;
  readonly start: Point;
  readonly end: Point;
}

export interface BoardFlowObstacle {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface BoardFlowRoutingOptions {
  readonly obstacles?: readonly BoardFlowObstacle[];
  readonly channel?: number;
}

const DEFAULT_CARD_WIDTH = 240;
const DEFAULT_CARD_HEIGHT = 126;
const MIN_CONTROL_DISTANCE = 48;
const ROUTE_CLEARANCE = 14;
const ROUTE_CORNER_RADIUS = 12;
const ROUTE_BEND_PENALTY = 22;

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function compactPoints(points: readonly Point[]): Point[] {
  const compact: Point[] = [];
  for (const point of points) {
    const previous = compact.at(-1);
    if (previous !== undefined && previous.x === point.x && previous.y === point.y) continue;
    compact.push(point);
  }

  let index = 1;
  while (index < compact.length - 1) {
    const previous = compact[index - 1];
    const current = compact[index];
    const next = compact[index + 1];
    if (
      previous !== undefined &&
      current !== undefined &&
      next !== undefined &&
      ((previous.x === current.x && current.x === next.x) ||
        (previous.y === current.y && current.y === next.y))
    ) {
      compact.splice(index, 1);
      continue;
    }
    index += 1;
  }
  return compact;
}

function inflated(obstacle: BoardFlowObstacle, clearance = ROUTE_CLEARANCE): BoardFlowObstacle {
  return {
    x: obstacle.x - clearance,
    y: obstacle.y - clearance,
    width: obstacle.width + clearance * 2,
    height: obstacle.height + clearance * 2,
  };
}

function segmentHitsObstacle(from: Point, to: Point, obstacle: BoardFlowObstacle): boolean {
  const left = obstacle.x;
  const right = obstacle.x + obstacle.width;
  const top = obstacle.y;
  const bottom = obstacle.y + obstacle.height;

  if (from.y === to.y) {
    const minX = Math.min(from.x, to.x);
    const maxX = Math.max(from.x, to.x);
    return from.y > top && from.y < bottom && maxX > left && minX < right;
  }

  if (from.x === to.x) {
    const minY = Math.min(from.y, to.y);
    const maxY = Math.max(from.y, to.y);
    return from.x > left && from.x < right && maxY > top && minY < bottom;
  }

  return true;
}

function routeIsClear(points: readonly Point[], obstacles: readonly BoardFlowObstacle[]): boolean {
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    if (previous === undefined || current === undefined) continue;
    if (obstacles.some((obstacle) => segmentHitsObstacle(previous, current, obstacle))) {
      return false;
    }
  }
  return true;
}

function routeLength(points: readonly Point[]): number {
  let length = 0;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    if (previous === undefined || current === undefined) continue;
    length += Math.abs(current.x - previous.x) + Math.abs(current.y - previous.y);
  }
  return length;
}

function routeScore(points: readonly Point[]): number {
  return routeLength(points) + Math.max(0, points.length - 2) * ROUTE_BEND_PENALTY;
}

function roundedOrthogonalPath(rawPoints: readonly Point[]): string {
  const points = compactPoints(rawPoints);
  const first = points[0];
  if (first === undefined) return '';
  if (points.length === 1) return `M ${round(first.x)} ${round(first.y)}`;

  let path = `M ${round(first.x)} ${round(first.y)}`;
  for (let index = 1; index < points.length - 1; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const next = points[index + 1];
    if (previous === undefined || current === undefined || next === undefined) continue;

    const incoming = Math.abs(current.x - previous.x) + Math.abs(current.y - previous.y);
    const outgoing = Math.abs(next.x - current.x) + Math.abs(next.y - current.y);
    const radius = Math.min(ROUTE_CORNER_RADIUS, incoming / 2, outgoing / 2);

    const before =
      previous.x === current.x
        ? { x: current.x, y: current.y + Math.sign(previous.y - current.y) * radius }
        : { x: current.x + Math.sign(previous.x - current.x) * radius, y: current.y };
    const after =
      next.x === current.x
        ? { x: current.x, y: current.y + Math.sign(next.y - current.y) * radius }
        : { x: current.x + Math.sign(next.x - current.x) * radius, y: current.y };

    path += ` L ${round(before.x)} ${round(before.y)} Q ${round(current.x)} ${round(
      current.y,
    )} ${round(after.x)} ${round(after.y)}`;
  }

  const last = points.at(-1);
  if (last !== undefined) path += ` L ${round(last.x)} ${round(last.y)}`;
  return path;
}

function horizontalRoute(
  start: Point,
  end: Point,
  obstacles: readonly BoardFlowObstacle[],
  channel: number,
): readonly Point[] | null {
  const inflatedObstacles = obstacles.map((obstacle) => inflated(obstacle));
  const direction = end.x >= start.x ? 1 : -1;
  const channelOffset = channel * 8;
  const middle = (start.x + end.x) / 2 + direction * channelOffset;
  const candidates: Point[][] = [[start, { x: middle, y: start.y }, { x: middle, y: end.y }, end]];

  const exitX = start.x + direction * (24 + Math.abs(channel) * 3);
  const entryX = end.x - direction * (24 + Math.abs(channel) * 3);
  const obstacleTop = Math.min(start.y, end.y, ...inflatedObstacles.map((obstacle) => obstacle.y));
  const obstacleBottom = Math.max(
    start.y,
    end.y,
    ...inflatedObstacles.map((obstacle) => obstacle.y + obstacle.height),
  );
  const rails = new Set<number>([
    Math.max(8, obstacleTop - 10 - Math.abs(channel) * 5),
    obstacleBottom + 10 + Math.abs(channel) * 5,
    Math.max(8, Math.min(start.y, end.y) - 42 - Math.abs(channel) * 7),
    Math.max(start.y, end.y) + 42 + Math.abs(channel) * 7,
  ]);
  for (const obstacle of inflatedObstacles) {
    rails.add(Math.max(8, obstacle.y - 8 - Math.abs(channel) * 3));
    rails.add(obstacle.y + obstacle.height + 8 + Math.abs(channel) * 3);
  }

  for (const railY of rails) {
    candidates.push([
      start,
      { x: exitX, y: start.y },
      { x: exitX, y: railY },
      { x: entryX, y: railY },
      { x: entryX, y: end.y },
      end,
    ]);
  }

  const clear = candidates
    .map((candidate) => compactPoints(candidate))
    .filter((candidate) => routeIsClear(candidate, inflatedObstacles))
    .sort((left, right) => routeScore(left) - routeScore(right));
  return clear[0] ?? null;
}

function verticalRoute(
  start: Point,
  end: Point,
  obstacles: readonly BoardFlowObstacle[],
  channel: number,
): readonly Point[] | null {
  const inflatedObstacles = obstacles.map((obstacle) => inflated(obstacle));
  const direction = end.y >= start.y ? 1 : -1;
  const channelOffset = channel * 8;
  const middle = (start.y + end.y) / 2 + direction * channelOffset;
  const candidates: Point[][] = [[start, { x: start.x, y: middle }, { x: end.x, y: middle }, end]];

  const exitY = start.y + direction * (24 + Math.abs(channel) * 3);
  const entryY = end.y - direction * (24 + Math.abs(channel) * 3);
  const obstacleLeft = Math.min(start.x, end.x, ...inflatedObstacles.map((obstacle) => obstacle.x));
  const obstacleRight = Math.max(
    start.x,
    end.x,
    ...inflatedObstacles.map((obstacle) => obstacle.x + obstacle.width),
  );
  const rails = new Set<number>([
    Math.max(8, obstacleLeft - 10 - Math.abs(channel) * 5),
    obstacleRight + 10 + Math.abs(channel) * 5,
    Math.max(8, Math.min(start.x, end.x) - 42 - Math.abs(channel) * 7),
    Math.max(start.x, end.x) + 42 + Math.abs(channel) * 7,
  ]);
  for (const obstacle of inflatedObstacles) {
    rails.add(Math.max(8, obstacle.x - 8 - Math.abs(channel) * 3));
    rails.add(obstacle.x + obstacle.width + 8 + Math.abs(channel) * 3);
  }

  for (const railX of rails) {
    candidates.push([
      start,
      { x: start.x, y: exitY },
      { x: railX, y: exitY },
      { x: railX, y: entryY },
      { x: end.x, y: entryY },
      end,
    ]);
  }

  const clear = candidates
    .map((candidate) => compactPoints(candidate))
    .filter((candidate) => routeIsClear(candidate, inflatedObstacles))
    .sort((left, right) => routeScore(left) - routeScore(right));
  return clear[0] ?? null;
}

function fallbackBezier(start: Point, end: Point, orientation: BoardFlowOrientation): string {
  if (orientation === 'vertical') {
    const deltaY = end.y - start.y;
    const direction = deltaY >= 0 ? 1 : -1;
    const controlDistance = Math.max(MIN_CONTROL_DISTANCE, Math.abs(deltaY) * 0.45);
    return `M ${round(start.x)} ${round(start.y)} C ${round(start.x)} ${round(
      start.y + direction * controlDistance,
    )}, ${round(end.x)} ${round(end.y - direction * controlDistance)}, ${round(end.x)} ${round(
      end.y,
    )}`;
  }

  const deltaX = end.x - start.x;
  const direction = deltaX >= 0 ? 1 : -1;
  const controlDistance = Math.max(MIN_CONTROL_DISTANCE, Math.abs(deltaX) * 0.45);
  return `M ${round(start.x)} ${round(start.y)} C ${round(
    start.x + direction * controlDistance,
  )} ${round(start.y)}, ${round(end.x - direction * controlDistance)} ${round(
    end.y,
  )}, ${round(end.x)} ${round(end.y)}`;
}

export function buildBoardFlowConnectorGeometry(
  from: Point,
  to: Point,
  cardWidth = DEFAULT_CARD_WIDTH,
  cardHeight = DEFAULT_CARD_HEIGHT,
  orientation: BoardFlowOrientation = 'horizontal',
  routing?: BoardFlowRoutingOptions,
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
    const route =
      routing === undefined
        ? null
        : verticalRoute(start, end, routing.obstacles ?? [], routing.channel ?? 0);
    return {
      start,
      end,
      path: route === null ? fallbackBezier(start, end, orientation) : roundedOrthogonalPath(route),
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
  const route =
    routing === undefined
      ? null
      : horizontalRoute(start, end, routing.obstacles ?? [], routing.channel ?? 0);

  return {
    start,
    end,
    path: route === null ? fallbackBezier(start, end, orientation) : roundedOrthogonalPath(route),
  };
}
