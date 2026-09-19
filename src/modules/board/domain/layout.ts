import type { TaskId } from '../../../shared/ids/index';
import type { BoardSettings, Point } from './board';

export type BoardLayoutOrientation = 'horizontal' | 'vertical';

export interface BoardLayoutTaskInput {
  readonly id: TaskId;
  readonly scheduleDate: string | null;
  readonly manualPosition?: Point;
}

export interface BoardLayoutEdgeInput {
  readonly fromTaskId: TaskId;
  readonly toTaskId: TaskId;
}

export type BoardLaneKind = 'all' | 'date' | 'undated';

export interface BoardLaneLayout {
  readonly id: string;
  readonly kind: BoardLaneKind;
  readonly date: string | null;
  readonly taskIds: readonly TaskId[];
  readonly startX?: number;
  readonly width?: number;
  readonly startY: number;
  readonly height: number;
}

export interface BoardTaskLayout {
  readonly taskId: TaskId;
  readonly rank: number;
  readonly laneId: string;
  readonly point: Point;
}

export interface BoardLayoutResult {
  readonly tasks: Readonly<Record<string, BoardTaskLayout>>;
  readonly lanes: readonly BoardLaneLayout[];
  readonly width: number;
  readonly height: number;
}

const CARD_WIDTH = 240;
const CARD_HEIGHT = 126;
const HORIZONTAL_GAP = 92;
const VERTICAL_GAP = 28;
const LANE_HEADER_HEIGHT = 44;
const LANE_PADDING = 24;
const LANE_GAP = 18;
const BOARD_PADDING = 28;

function laneIdFor(task: BoardLayoutTaskInput, settings: BoardSettings): string {
  if (!settings.showDateLanes) return 'all';
  return task.scheduleDate === null ? 'undated' : `date:${task.scheduleDate}`;
}

function sortLaneIds(ids: readonly string[]): readonly string[] {
  return [...ids].sort((left, right) => {
    if (left === 'all' || right === 'all') return left.localeCompare(right);
    if (left === 'undated') return 1;
    if (right === 'undated') return -1;
    return left.localeCompare(right);
  });
}

function laneKind(id: string): BoardLaneKind {
  if (id === 'all') return 'all';
  if (id === 'undated') return 'undated';
  return 'date';
}

function laneDate(id: string): string | null {
  return id.startsWith('date:') ? id.slice('date:'.length) : null;
}

function structuralRanks(
  tasks: readonly BoardLayoutTaskInput[],
  edges: readonly BoardLayoutEdgeInput[],
): ReadonlyMap<TaskId, number> {
  const ids = new Set(tasks.map((task) => task.id));
  const indegree = new Map<TaskId, number>();
  const outgoing = new Map<TaskId, TaskId[]>();
  const ranks = new Map<TaskId, number>();

  for (const task of tasks) {
    indegree.set(task.id, 0);
    outgoing.set(task.id, []);
    ranks.set(task.id, 0);
  }

  for (const edge of edges) {
    if (!ids.has(edge.fromTaskId) || !ids.has(edge.toTaskId)) continue;
    indegree.set(edge.toTaskId, (indegree.get(edge.toTaskId) ?? 0) + 1);
    outgoing.get(edge.fromTaskId)?.push(edge.toTaskId);
  }

  const queue = tasks
    .map((task) => task.id)
    .filter((taskId) => (indegree.get(taskId) ?? 0) === 0)
    .sort((left, right) => left.localeCompare(right));

  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) break;
    const currentRank = ranks.get(current) ?? 0;
    const nextIds = [...(outgoing.get(current) ?? [])].sort((left, right) =>
      left.localeCompare(right),
    );

    for (const next of nextIds) {
      ranks.set(next, Math.max(ranks.get(next) ?? 0, currentRank + 1));
      const nextDegree = (indegree.get(next) ?? 0) - 1;
      indegree.set(next, nextDegree);
      if (nextDegree === 0) {
        queue.push(next);
        queue.sort((left, right) => left.localeCompare(right));
      }
    }
  }

  return ranks;
}

function fallbackAutoPoint(
  rank: number,
  crossIndex: number,
  orientation: BoardLayoutOrientation,
): Point {
  if (orientation === 'vertical') {
    return {
      x: BOARD_PADDING + crossIndex * (CARD_WIDTH + HORIZONTAL_GAP),
      y: BOARD_PADDING + rank * (CARD_HEIGHT + VERTICAL_GAP),
    };
  }
  return {
    x: BOARD_PADDING + rank * (CARD_WIDTH + HORIZONTAL_GAP),
    y: BOARD_PADDING + crossIndex * (CARD_HEIGHT + VERTICAL_GAP),
  };
}

function layoutWithoutDateLanes(
  tasks: readonly BoardLayoutTaskInput[],
  ranks: ReadonlyMap<TaskId, number>,
  settings: BoardSettings,
  orientation: BoardLayoutOrientation,
): BoardLayoutResult {
  const groupedByRank = new Map<number, BoardLayoutTaskInput[]>();
  for (const task of tasks) {
    const rank = ranks.get(task.id) ?? 0;
    const group = groupedByRank.get(rank) ?? [];
    group.push(task);
    groupedByRank.set(rank, group);
  }

  const taskLayouts: Record<string, BoardTaskLayout> = {};
  let maxX = 0;
  let maxY = 0;
  for (const [rank, group] of groupedByRank) {
    const stableGroup = [...group].sort((left, right) => left.id.localeCompare(right.id));
    stableGroup.forEach((task, crossIndex) => {
      const fallback = fallbackAutoPoint(rank, crossIndex, orientation);
      const point =
        !settings.autoLayout && task.manualPosition !== undefined ? task.manualPosition : fallback;
      maxX = Math.max(maxX, point.x + CARD_WIDTH + BOARD_PADDING);
      maxY = Math.max(maxY, point.y + CARD_HEIGHT + BOARD_PADDING);
      taskLayouts[task.id] = { taskId: task.id, rank, laneId: 'all', point };
    });
  }

  return {
    tasks: taskLayouts,
    lanes: [
      {
        id: 'all',
        kind: 'all',
        date: null,
        taskIds: tasks.map((task) => task.id),
        startX: 0,
        width: maxX,
        startY: 0,
        height: maxY,
      },
    ],
    width: maxX,
    height: maxY,
  };
}

function layoutHorizontalDateLanes(
  laneIds: readonly string[],
  laneTaskMap: ReadonlyMap<string, readonly BoardLayoutTaskInput[]>,
  ranks: ReadonlyMap<TaskId, number>,
  settings: BoardSettings,
): BoardLayoutResult {
  const taskLayouts: Record<string, BoardTaskLayout> = {};
  const laneDrafts: BoardLaneLayout[] = [];
  const laneWidth = CARD_WIDTH + LANE_PADDING * 2;
  let laneStartX = BOARD_PADDING;
  let maxY = BOARD_PADDING;

  for (const laneId of laneIds) {
    const laneTasks = [...(laneTaskMap.get(laneId) ?? [])].sort((left, right) => {
      const rankDifference = (ranks.get(left.id) ?? 0) - (ranks.get(right.id) ?? 0);
      return rankDifference !== 0 ? rankDifference : left.id.localeCompare(right.id);
    });

    laneTasks.forEach((task, index) => {
      const fallback = {
        x: laneStartX + LANE_PADDING,
        y:
          BOARD_PADDING +
          LANE_HEADER_HEIGHT +
          LANE_PADDING +
          index * (CARD_HEIGHT + VERTICAL_GAP),
      };
      const point =
        !settings.autoLayout && task.manualPosition !== undefined ? task.manualPosition : fallback;
      maxY = Math.max(maxY, point.y + CARD_HEIGHT + BOARD_PADDING);
      taskLayouts[task.id] = {
        taskId: task.id,
        rank: ranks.get(task.id) ?? 0,
        laneId,
        point,
      };
    });

    laneDrafts.push({
      id: laneId,
      kind: laneKind(laneId),
      date: laneDate(laneId),
      taskIds: laneTasks.map((task) => task.id),
      startX: laneStartX,
      width: laneWidth,
      startY: BOARD_PADDING,
      height: 0,
    });
    laneStartX += laneWidth + LANE_GAP;
  }

  const width = Math.max(
    laneStartX - LANE_GAP + BOARD_PADDING,
    ...Object.values(taskLayouts).map((task) => task.point.x + CARD_WIDTH + BOARD_PADDING),
  );
  const height = Math.max(
    maxY,
    BOARD_PADDING * 2 + LANE_HEADER_HEIGHT + LANE_PADDING * 2 + CARD_HEIGHT,
  );
  const laneHeight = Math.max(CARD_HEIGHT + LANE_HEADER_HEIGHT + LANE_PADDING * 2, height - BOARD_PADDING * 2);

  return {
    tasks: taskLayouts,
    lanes: laneDrafts.map((lane) => ({ ...lane, height: laneHeight })),
    width,
    height,
  };
}

function layoutVerticalDateLanes(
  laneIds: readonly string[],
  laneTaskMap: ReadonlyMap<string, readonly BoardLayoutTaskInput[]>,
  ranks: ReadonlyMap<TaskId, number>,
  settings: BoardSettings,
): BoardLayoutResult {
  const taskLayouts: Record<string, BoardTaskLayout> = {};
  const laneDrafts: BoardLaneLayout[] = [];
  const laneHeight = CARD_HEIGHT + LANE_HEADER_HEIGHT + LANE_PADDING * 2;
  let laneStartY = BOARD_PADDING;
  let maxX = BOARD_PADDING;

  for (const laneId of laneIds) {
    const laneTasks = [...(laneTaskMap.get(laneId) ?? [])].sort((left, right) => {
      const rankDifference = (ranks.get(left.id) ?? 0) - (ranks.get(right.id) ?? 0);
      return rankDifference !== 0 ? rankDifference : left.id.localeCompare(right.id);
    });

    laneTasks.forEach((task, index) => {
      const fallback = {
        x: BOARD_PADDING + LANE_PADDING + index * (CARD_WIDTH + HORIZONTAL_GAP),
        y: laneStartY + LANE_HEADER_HEIGHT + LANE_PADDING,
      };
      const point =
        !settings.autoLayout && task.manualPosition !== undefined ? task.manualPosition : fallback;
      maxX = Math.max(maxX, point.x + CARD_WIDTH + BOARD_PADDING);
      taskLayouts[task.id] = {
        taskId: task.id,
        rank: ranks.get(task.id) ?? 0,
        laneId,
        point,
      };
    });

    laneDrafts.push({
      id: laneId,
      kind: laneKind(laneId),
      date: laneDate(laneId),
      taskIds: laneTasks.map((task) => task.id),
      startX: BOARD_PADDING,
      width: 0,
      startY: laneStartY,
      height: laneHeight,
    });
    laneStartY += laneHeight + LANE_GAP;
  }

  const width = Math.max(maxX, BOARD_PADDING * 2 + LANE_PADDING * 2 + CARD_WIDTH);
  const height = laneStartY - LANE_GAP + BOARD_PADDING;
  const laneWidth = Math.max(CARD_WIDTH + LANE_PADDING * 2, width - BOARD_PADDING * 2);

  return {
    tasks: taskLayouts,
    lanes: laneDrafts.map((lane) => ({ ...lane, width: laneWidth })),
    width,
    height,
  };
}

export function layoutBoard(
  tasks: readonly BoardLayoutTaskInput[],
  structuralEdges: readonly BoardLayoutEdgeInput[],
  settings: BoardSettings,
  orientation: BoardLayoutOrientation = 'horizontal',
): BoardLayoutResult {
  if (tasks.length === 0) {
    return { tasks: {}, lanes: [], width: 0, height: 0 };
  }

  const ranks = structuralRanks(tasks, structuralEdges);
  if (!settings.showDateLanes) {
    return layoutWithoutDateLanes(tasks, ranks, settings, orientation);
  }

  const laneTaskMap = new Map<string, BoardLayoutTaskInput[]>();
  for (const task of tasks) {
    const laneId = laneIdFor(task, settings);
    const laneTasks = laneTaskMap.get(laneId) ?? [];
    laneTasks.push(task);
    laneTaskMap.set(laneId, laneTasks);
  }
  const laneIds = sortLaneIds([...laneTaskMap.keys()]);

  return orientation === 'vertical'
    ? layoutVerticalDateLanes(laneIds, laneTaskMap, ranks, settings)
    : layoutHorizontalDateLanes(laneIds, laneTaskMap, ranks, settings);
}
