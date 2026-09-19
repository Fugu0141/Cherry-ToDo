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

interface LayoutMetrics {
  readonly cardWidth: number;
  readonly cardHeight: number;
  readonly primaryGap: number;
  readonly crossGap: number;
}

const DESKTOP_METRICS: LayoutMetrics = {
  cardWidth: 240,
  cardHeight: 126,
  primaryGap: 92,
  crossGap: 28,
};

const MOBILE_METRICS: LayoutMetrics = {
  cardWidth: 210,
  cardHeight: 112,
  primaryGap: 56,
  crossGap: 24,
};

const LANE_HEADER_HEIGHT = 44;
const LANE_PADDING = 24;
const LANE_GAP = 18;
const BOARD_PADDING = 28;

function metricsFor(orientation: BoardLayoutOrientation): LayoutMetrics {
  return orientation === 'vertical' ? MOBILE_METRICS : DESKTOP_METRICS;
}

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

function rankedGroups(
  tasks: readonly BoardLayoutTaskInput[],
  ranks: ReadonlyMap<TaskId, number>,
): {
  readonly minRank: number;
  readonly maxLocalRank: number;
  readonly groups: ReadonlyMap<number, readonly BoardLayoutTaskInput[]>;
  readonly maxCrossCount: number;
} {
  if (tasks.length === 0) {
    return { minRank: 0, maxLocalRank: 0, groups: new Map(), maxCrossCount: 1 };
  }

  const minRank = Math.min(...tasks.map((task) => ranks.get(task.id) ?? 0));
  const mutable = new Map<number, BoardLayoutTaskInput[]>();

  for (const task of tasks) {
    const localRank = (ranks.get(task.id) ?? 0) - minRank;
    const group = mutable.get(localRank) ?? [];
    group.push(task);
    mutable.set(localRank, group);
  }

  const groups = new Map<number, readonly BoardLayoutTaskInput[]>();
  for (const [rank, group] of mutable) {
    groups.set(
      rank,
      [...group].sort((left, right) => left.id.localeCompare(right.id)),
    );
  }

  return {
    minRank,
    maxLocalRank: Math.max(0, ...groups.keys()),
    groups,
    maxCrossCount: Math.max(1, ...[...groups.values()].map((group) => group.length)),
  };
}

function autoPoint(
  primaryIndex: number,
  crossIndex: number,
  orientation: BoardLayoutOrientation,
  metrics: LayoutMetrics,
  origin: Point,
): Point {
  if (orientation === 'vertical') {
    return {
      x: origin.x + crossIndex * (metrics.cardWidth + metrics.crossGap),
      y: origin.y + primaryIndex * (metrics.cardHeight + metrics.primaryGap),
    };
  }

  return {
    x: origin.x + primaryIndex * (metrics.cardWidth + metrics.primaryGap),
    y: origin.y + crossIndex * (metrics.cardHeight + metrics.crossGap),
  };
}

function layoutWithoutDateLanes(
  tasks: readonly BoardLayoutTaskInput[],
  ranks: ReadonlyMap<TaskId, number>,
  settings: BoardSettings,
  orientation: BoardLayoutOrientation,
): BoardLayoutResult {
  const metrics = metricsFor(orientation);
  const ranked = rankedGroups(tasks, ranks);
  const taskLayouts: Record<string, BoardTaskLayout> = {};
  let maxX = 0;
  let maxY = 0;

  for (const [localRank, group] of ranked.groups) {
    group.forEach((task, crossIndex) => {
      const fallback = autoPoint(
        localRank,
        crossIndex,
        orientation,
        metrics,
        { x: BOARD_PADDING, y: BOARD_PADDING },
      );
      const point =
        !settings.autoLayout && task.manualPosition !== undefined ? task.manualPosition : fallback;
      maxX = Math.max(maxX, point.x + metrics.cardWidth + BOARD_PADDING);
      maxY = Math.max(maxY, point.y + metrics.cardHeight + BOARD_PADDING);
      taskLayouts[task.id] = {
        taskId: task.id,
        rank: ranks.get(task.id) ?? 0,
        laneId: 'all',
        point,
      };
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
  const metrics = DESKTOP_METRICS;
  const taskLayouts: Record<string, BoardTaskLayout> = {};
  const laneDrafts: BoardLaneLayout[] = [];
  let laneStartX = BOARD_PADDING;
  let maxLaneHeight = LANE_HEADER_HEIGHT + LANE_PADDING * 2 + metrics.cardHeight;

  for (const laneId of laneIds) {
    const laneTasks = laneTaskMap.get(laneId) ?? [];
    const ranked = rankedGroups(laneTasks, ranks);
    const contentWidth =
      (ranked.maxLocalRank + 1) * metrics.cardWidth +
      ranked.maxLocalRank * metrics.primaryGap;
    const contentHeight =
      ranked.maxCrossCount * metrics.cardHeight +
      Math.max(0, ranked.maxCrossCount - 1) * metrics.crossGap;
    const laneWidth = LANE_PADDING * 2 + contentWidth;
    const laneHeight = LANE_HEADER_HEIGHT + LANE_PADDING * 2 + contentHeight;
    maxLaneHeight = Math.max(maxLaneHeight, laneHeight);

    for (const [localRank, group] of ranked.groups) {
      group.forEach((task, crossIndex) => {
        const fallback = autoPoint(
          localRank,
          crossIndex,
          'horizontal',
          metrics,
          {
            x: laneStartX + LANE_PADDING,
            y: BOARD_PADDING + LANE_HEADER_HEIGHT + LANE_PADDING,
          },
        );
        const point =
          !settings.autoLayout && task.manualPosition !== undefined ? task.manualPosition : fallback;
        taskLayouts[task.id] = {
          taskId: task.id,
          rank: ranks.get(task.id) ?? 0,
          laneId,
          point,
        };
      });
    }

    laneDrafts.push({
      id: laneId,
      kind: laneKind(laneId),
      date: laneDate(laneId),
      taskIds: laneTasks.map((task) => task.id),
      startX: laneStartX,
      width: laneWidth,
      startY: BOARD_PADDING,
      height: laneHeight,
    });
    laneStartX += laneWidth + LANE_GAP;
  }

  const width = Math.max(0, laneStartX - LANE_GAP + BOARD_PADDING);
  const height = BOARD_PADDING * 2 + maxLaneHeight;

  return {
    tasks: taskLayouts,
    lanes: laneDrafts.map((lane) => ({ ...lane, height: maxLaneHeight })),
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
  const metrics = MOBILE_METRICS;
  const taskLayouts: Record<string, BoardTaskLayout> = {};
  const laneDrafts: BoardLaneLayout[] = [];
  let laneStartY = BOARD_PADDING;
  let maxLaneWidth = LANE_PADDING * 2 + metrics.cardWidth;

  for (const laneId of laneIds) {
    const laneTasks = laneTaskMap.get(laneId) ?? [];
    const ranked = rankedGroups(laneTasks, ranks);
    const contentHeight =
      (ranked.maxLocalRank + 1) * metrics.cardHeight +
      ranked.maxLocalRank * metrics.primaryGap;
    const contentWidth =
      ranked.maxCrossCount * metrics.cardWidth +
      Math.max(0, ranked.maxCrossCount - 1) * metrics.crossGap;
    const laneHeight = LANE_HEADER_HEIGHT + LANE_PADDING * 2 + contentHeight;
    const laneWidth = LANE_PADDING * 2 + contentWidth;
    maxLaneWidth = Math.max(maxLaneWidth, laneWidth);

    for (const [localRank, group] of ranked.groups) {
      group.forEach((task, crossIndex) => {
        const fallback = autoPoint(
          localRank,
          crossIndex,
          'vertical',
          metrics,
          {
            x: BOARD_PADDING + LANE_PADDING,
            y: laneStartY + LANE_HEADER_HEIGHT + LANE_PADDING,
          },
        );
        const point =
          !settings.autoLayout && task.manualPosition !== undefined ? task.manualPosition : fallback;
        taskLayouts[task.id] = {
          taskId: task.id,
          rank: ranks.get(task.id) ?? 0,
          laneId,
          point,
        };
      });
    }

    laneDrafts.push({
      id: laneId,
      kind: laneKind(laneId),
      date: laneDate(laneId),
      taskIds: laneTasks.map((task) => task.id),
      startX: BOARD_PADDING,
      width: laneWidth,
      startY: laneStartY,
      height: laneHeight,
    });
    laneStartY += laneHeight + LANE_GAP;
  }

  const width = BOARD_PADDING * 2 + maxLaneWidth;
  const height = Math.max(0, laneStartY - LANE_GAP + BOARD_PADDING);

  return {
    tasks: taskLayouts,
    lanes: laneDrafts.map((lane) => ({ ...lane, width: maxLaneWidth })),
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
