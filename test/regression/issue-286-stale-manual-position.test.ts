import { describe, expect, it } from 'vitest';

import { createEmptyBoardDocumentState, layoutBoard } from '../../src/modules/board/index';
import { noSchedule, scheduleAtDateTime, scheduleOnDate } from '../../src/modules/schedule/index';
import type { Task } from '../../src/modules/task/index';
import {
  ApplicationStore,
  CHERRY_V2_SCHEMA_VERSION,
  type WorkspaceDocument,
} from '../../src/modules/workspace/index';
import {
  parseTabId,
  parseTaskId,
  parseWorkspaceId,
  type TabId,
  type TaskId,
} from '../../src/shared/ids/index';
import type { RevisionMeta } from '../../src/shared/revision/index';

const NOW = '2026-10-05T02:00:00.000Z';
const meta: RevisionMeta = { createdAt: NOW, updatedAt: NOW, revision: 0 };

function unwrap<T>(result: { readonly ok: true; readonly value: T } | { readonly ok: false }): T {
  if (!result.ok) throw new Error('Invalid fixture value.');
  return result.value;
}

function taskId(value: string): TaskId {
  return unwrap(parseTaskId(value));
}

function fixture(
  task: Task,
  position = { x: 120, y: 180 },
): { workspace: WorkspaceDocument; tabId: TabId } {
  const tabId = unwrap(parseTabId('plan'));
  return {
    tabId,
    workspace: {
      schemaVersion: CHERRY_V2_SCHEMA_VERSION,
      id: unwrap(parseWorkspaceId('issue-286-workspace')),
      name: 'Issue 286',
      tabs: {
        [tabId]: {
          id: tabId,
          name: 'Plan',
          tasks: { [task.id]: task },
          flowEdges: {},
          annotations: {},
          board: {
            ...createEmptyBoardDocumentState(),
            positions: { [task.id]: position },
          },
          meta,
        },
      },
      tabOrder: [tabId],
      meta,
    },
  };
}

function task(schedule: Task['schedule']): Task {
  return {
    id: taskId('A'),
    title: 'A',
    notes: '',
    status: 'todo',
    schedule,
    appearance: { importance: 'none' },
    meta,
  };
}

describe('issue #286 stale manual position lifecycle', () => {
  it('drops stale position when a date-lane reassignment has no replacement point', () => {
    const initial = unwrap(scheduleAtDateTime('2026-10-05', '14:30', 'Asia/Tokyo'));
    const { workspace, tabId } = fixture(task(initial));
    const store = new ApplicationStore(workspace, () => NOW);

    const result = store.applyBoardDrop(tabId, taskId('A'), {
      kind: 'assign-date',
      date: '2026-10-07',
    });

    expect(result.ok).toBe(true);
    expect(store.workspace.tabs[tabId]?.tasks.A?.schedule).toEqual({
      kind: 'datetime',
      date: '2026-10-07',
      time: '14:30',
      timeZone: 'Asia/Tokyo',
    });
    expect(store.workspace.tabs[tabId]?.board.positions.A).toBeUndefined();
  });

  it('keeps same-lane position but invalidates it when the schedule lane changes', () => {
    const initial = unwrap(scheduleAtDateTime('2026-10-05', '09:00'));
    const { workspace, tabId } = fixture(task(initial));
    const store = new ApplicationStore(workspace, () => NOW);

    const sameLane = unwrap(scheduleAtDateTime('2026-10-05', '10:00'));
    expect(store.setSchedule(tabId, taskId('A'), sameLane).ok).toBe(true);
    expect(store.workspace.tabs[tabId]?.board.positions.A).toEqual({ x: 120, y: 180 });

    const otherLane = unwrap(scheduleOnDate('2026-10-06'));
    expect(store.setSchedule(tabId, taskId('A'), otherLane).ok).toBe(true);
    expect(store.workspace.tabs[tabId]?.board.positions.A).toBeUndefined();
  });

  it('keeps an explicit replacement point for a manual cross-lane drop', () => {
    const initial = unwrap(scheduleOnDate('2026-10-05'));
    const { workspace, tabId } = fixture(task(initial));
    const store = new ApplicationStore(workspace, () => NOW);

    const result = store.applyBoardDrop(tabId, taskId('A'), {
      kind: 'assign-date',
      date: '2026-10-06',
      point: { x: 640, y: 360 },
    });

    expect(result.ok).toBe(true);
    expect(store.workspace.tabs[tabId]?.board.positions.A).toEqual({ x: 640, y: 360 });
  });

  it('clears manual position when moving a dated Task to the undated lane', () => {
    const initial = unwrap(scheduleOnDate('2026-10-05'));
    const { workspace, tabId } = fixture(task(initial));
    const store = new ApplicationStore(workspace, () => NOW);

    expect(store.applyBoardDrop(tabId, taskId('A'), { kind: 'assign-date', date: null }).ok).toBe(
      true,
    );
    expect(store.workspace.tabs[tabId]?.tasks.A?.schedule).toEqual(noSchedule());
    expect(store.workspace.tabs[tabId]?.board.positions.A).toBeUndefined();
  });
});

describe('issue #286 manual Board geometry', () => {
  it('expands desktop lane and Board extents to contain a far manual Task', () => {
    const A = taskId('A');
    const result = layoutBoard(
      [{ id: A, scheduleDate: '2026-10-05', manualPosition: { x: 900, y: 520 } }],
      [],
      { showDateLanes: true, autoLayout: false, timeGuide: 'auto' },
      'horizontal',
    );
    const lane = result.lanes[0];
    expect(lane).toBeDefined();
    expect((lane?.startX ?? 0) + (lane?.width ?? 0)).toBeGreaterThanOrEqual(900 + 240 + 24);
    expect((lane?.startY ?? 0) + (lane?.height ?? 0)).toBeGreaterThanOrEqual(520 + 126 + 24);
    expect(result.width).toBeGreaterThanOrEqual(900 + 240 + 28);
    expect(result.height).toBeGreaterThanOrEqual(520 + 126 + 28);
  });

  it('expands mobile lane and Board extents to contain a far manual Task', () => {
    const A = taskId('A');
    const result = layoutBoard(
      [{ id: A, scheduleDate: '2026-10-05', manualPosition: { x: 620, y: 980 } }],
      [],
      { showDateLanes: true, autoLayout: false, timeGuide: 'auto' },
      'vertical',
    );
    const lane = result.lanes[0];
    expect(lane).toBeDefined();
    expect((lane?.startX ?? 0) + (lane?.width ?? 0)).toBeGreaterThanOrEqual(620 + 210 + 24);
    expect((lane?.startY ?? 0) + (lane?.height ?? 0)).toBeGreaterThanOrEqual(980 + 112 + 24);
    expect(result.width).toBeGreaterThanOrEqual(620 + 210 + 28);
    expect(result.height).toBeGreaterThanOrEqual(980 + 112 + 28);
  });
});
