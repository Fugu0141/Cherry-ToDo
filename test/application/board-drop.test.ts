import { describe, expect, it } from 'vitest';

import { createEmptyBoardDocumentState } from '../../src/modules/board/index';
import { noSchedule, scheduleAtDateTime } from '../../src/modules/schedule/index';
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

const meta: RevisionMeta = {
  createdAt: '2026-09-14T00:00:00.000Z',
  updatedAt: '2026-09-14T00:00:00.000Z',
  revision: 0,
};

function unwrap<T>(result: { readonly ok: true; readonly value: T } | { readonly ok: false }): T {
  if (!result.ok) throw new Error('Invalid fixture value.');
  return result.value;
}

function taskId(value: string): TaskId {
  return unwrap(parseTaskId(value));
}

function fixture(task: Task): { workspace: WorkspaceDocument; tabId: TabId } {
  const tabId = unwrap(parseTabId('tab'));
  const workspaceId = unwrap(parseWorkspaceId('workspace'));
  return {
    tabId,
    workspace: {
      schemaVersion: CHERRY_V2_SCHEMA_VERSION,
      id: workspaceId,
      name: 'Workspace',
      tabs: {
        [tabId]: {
          id: tabId,
          name: 'Plan',
          tasks: { [task.id]: task },
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

function baseTask(schedule: Task['schedule'] = noSchedule()): Task {
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

describe('ApplicationStore.applyBoardDrop', () => {
  it('commits date assignment and manual point as one undoable transaction', () => {
    const { workspace, tabId } = fixture(baseTask());
    const store = new ApplicationStore(workspace, () => '2026-09-14T01:00:00.000Z');

    const result = store.applyBoardDrop(tabId, taskId('A'), {
      kind: 'assign-date',
      date: '2026-09-20',
      point: { x: 210, y: 35 },
    });
    expect(result.ok).toBe(true);
    expect(store.workspace.tabs[tabId]?.tasks.A?.schedule).toEqual({
      kind: 'date',
      date: '2026-09-20',
    });
    expect(store.workspace.tabs[tabId]?.board.positions.A).toEqual({ x: 210, y: 35 });
    expect(store.historyState.canUndo).toBe(true);

    const undo = store.undo();
    expect(undo.ok).toBe(true);
    expect(store.workspace.tabs[tabId]?.tasks.A?.schedule).toEqual({ kind: 'none' });
    expect(store.workspace.tabs[tabId]?.board.positions.A).toBeUndefined();
    expect(store.historyState.canUndo).toBe(false);
  });

  it('preserves datetime time when moving a Task to another date lane', () => {
    const initial = scheduleAtDateTime('2026-09-18', '14:30', 'Asia/Tokyo');
    if (!initial.ok) throw new Error('Expected valid schedule fixture.');
    const { workspace, tabId } = fixture(baseTask(initial.value));
    const store = new ApplicationStore(workspace);

    const result = store.applyBoardDrop(tabId, taskId('A'), {
      kind: 'assign-date',
      date: '2026-09-21',
    });
    expect(result.ok).toBe(true);
    expect(store.workspace.tabs[tabId]?.tasks.A?.schedule).toEqual({
      kind: 'datetime',
      date: '2026-09-21',
      time: '14:30',
      timeZone: 'Asia/Tokyo',
    });
  });

  it('drops onto the undated lane by clearing Schedule without changing Flow', () => {
    const scheduled = scheduleAtDateTime('2026-09-18', '09:00');
    if (!scheduled.ok) throw new Error('Expected valid schedule fixture.');
    const { workspace, tabId } = fixture(baseTask(scheduled.value));
    const store = new ApplicationStore(workspace);

    const result = store.applyBoardDrop(tabId, taskId('A'), {
      kind: 'assign-date',
      date: null,
    });
    expect(result.ok).toBe(true);
    expect(store.workspace.tabs[tabId]?.tasks.A?.schedule).toEqual({ kind: 'none' });
    expect(store.workspace.tabs[tabId]?.flowEdges).toEqual({});
  });

  it('does not create history or change revision for a cancelled drop', () => {
    const { workspace, tabId } = fixture(baseTask());
    const store = new ApplicationStore(workspace);
    const revision = store.workspace.meta.revision;

    const result = store.applyBoardDrop(tabId, taskId('A'), { kind: 'cancel' });
    expect(result.ok).toBe(true);
    expect(store.workspace.meta.revision).toBe(revision);
    expect(store.historyState.canUndo).toBe(false);
  });
});
