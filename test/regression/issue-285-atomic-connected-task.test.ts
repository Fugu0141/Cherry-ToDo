import { describe, expect, it } from 'vitest';

import { createEmptyBoardDocumentState } from '../../src/modules/board/index';
import { noSchedule, scheduleOnDate, type Schedule } from '../../src/modules/schedule/index';
import type { Task } from '../../src/modules/task/index';
import {
  ApplicationStore,
  CHERRY_V2_SCHEMA_VERSION,
  type WorkspaceDocument,
} from '../../src/modules/workspace/index';
import {
  parseFlowEdgeId,
  parseTabId,
  parseTaskId,
  parseWorkspaceId,
  type FlowEdgeId,
  type TabId,
  type TaskId,
} from '../../src/shared/ids/index';
import type { RevisionMeta } from '../../src/shared/revision/index';

const NOW = '2026-10-04T04:00:00.000Z';
const meta: RevisionMeta = { createdAt: NOW, updatedAt: NOW, revision: 0 };

function unwrap<T>(result: { readonly ok: true; readonly value: T } | { readonly ok: false }): T {
  if (!result.ok) throw new Error('Invalid fixture value.');
  return result.value;
}

function taskId(value: string): TaskId {
  return unwrap(parseTaskId(value));
}

function edgeId(value: string): FlowEdgeId {
  return unwrap(parseFlowEdgeId(value));
}

function task(
  id: string,
  status: 'todo' | 'done' = 'todo',
  schedule: Schedule = noSchedule(),
): Task {
  return {
    id: taskId(id),
    title: id,
    notes: '',
    status,
    schedule,
    appearance: { importance: 'none' },
    meta,
  };
}

function fixture(tasks: readonly Task[], edges: WorkspaceDocument['tabs'][string]['flowEdges'] = {}) {
  const tabId: TabId = unwrap(parseTabId('plan'));
  const workspace: WorkspaceDocument = {
    schemaVersion: CHERRY_V2_SCHEMA_VERSION,
    id: unwrap(parseWorkspaceId('issue-285-workspace')),
    name: 'Issue 285',
    tabs: {
      [tabId]: {
        id: tabId,
        name: 'Plan',
        tasks: Object.fromEntries(tasks.map((value) => [value.id, value])),
        flowEdges: edges,
        annotations: {},
        board: createEmptyBoardDocumentState(),
        meta,
      },
    },
    tabOrder: [tabId],
    meta,
  };
  return { workspace, tabId };
}

function newTask(id: string) {
  return {
    id: taskId(id),
    title: id,
    notes: '',
    importance: 'none' as const,
    schedule: noSchedule(),
  };
}

describe('issue #285 atomic connected task creation', () => {
  it('commits a new Task and continuation as one undoable mutation', () => {
    const { workspace, tabId } = fixture([task('A')]);
    const store = new ApplicationStore(workspace, () => NOW);

    const created = store.createConnectedTask({
      tabId,
      task: newTask('B'),
      edgeId: edgeId('A-B'),
      kind: 'continuation',
      fromTaskId: taskId('A'),
    });

    expect(created.ok).toBe(true);
    if (!created.ok || created.value.kind !== 'committed') return;
    expect(store.workspace.tabs[tabId]?.tasks.B).toBeDefined();
    expect(store.workspace.tabs[tabId]?.flowEdges['A-B']).toMatchObject({
      fromTaskId: 'A',
      toTaskId: 'B',
      kind: 'continuation',
    });

    const undone = store.undo();
    expect(undone.ok).toBe(true);
    expect(store.workspace.tabs[tabId]?.tasks.B).toBeUndefined();
    expect(store.workspace.tabs[tabId]?.flowEdges['A-B']).toBeUndefined();

    const redone = store.redo();
    expect(redone.ok).toBe(true);
    expect(store.workspace.tabs[tabId]?.tasks.B).toBeDefined();
    expect(store.workspace.tabs[tabId]?.flowEdges['A-B']).toBeDefined();
  });

  it('does not leave an orphan when a dated Task already has a continuation', () => {
    const dated = unwrap(scheduleOnDate('2026-09-29'));
    const { workspace, tabId } = fixture(
      [task('dated', 'todo', dated), task('existing')],
      {
        existing: {
          id: edgeId('existing'),
          kind: 'continuation',
          fromTaskId: taskId('dated'),
          toTaskId: taskId('existing'),
          order: 0,
          meta,
        },
      },
    );
    const store = new ApplicationStore(workspace, () => NOW);

    const result = store.createConnectedTask({
      tabId,
      task: newTask('new-next'),
      edgeId: edgeId('new-edge'),
      kind: 'continuation',
      fromTaskId: taskId('dated'),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('flow-invalid');
      if (result.error.code === 'flow-invalid') {
        expect(result.error.causes.some((cause) => cause.code === 'continuation-conflict')).toBe(
          true,
        );
      }
    }
    expect(store.workspace.tabs[tabId]?.tasks['new-next']).toBeUndefined();
    expect(store.workspace.tabs[tabId]?.flowEdges['new-edge']).toBeUndefined();
    expect(store.workspace.meta.revision).toBe(0);
  });

  it('allows a branch to be created atomically when a continuation already exists', () => {
    const { workspace, tabId } = fixture(
      [task('A'), task('B')],
      {
        'A-B': {
          id: edgeId('A-B'),
          kind: 'continuation',
          fromTaskId: taskId('A'),
          toTaskId: taskId('B'),
          order: 0,
          meta,
        },
      },
    );
    const store = new ApplicationStore(workspace, () => NOW);

    const result = store.createConnectedTask({
      tabId,
      task: newTask('C'),
      edgeId: edgeId('A-C'),
      kind: 'branch',
      fromTaskId: taskId('A'),
    });

    expect(result.ok).toBe(true);
    if (!result.ok || result.value.kind !== 'committed') return;
    expect(store.workspace.tabs[tabId]?.tasks.C).toBeDefined();
    expect(store.workspace.tabs[tabId]?.flowEdges['A-C']).toMatchObject({
      kind: 'branch',
      fromTaskId: 'A',
      toTaskId: 'C',
    });
  });

  it('keeps both Task and edge pending until a semantic confirmation is accepted', () => {
    const { workspace, tabId } = fixture(
      [task('A', 'done'), task('B', 'done')],
      {
        'A-B': {
          id: edgeId('A-B'),
          kind: 'continuation',
          fromTaskId: taskId('A'),
          toTaskId: taskId('B'),
          order: 0,
          meta,
        },
      },
    );
    const store = new ApplicationStore(workspace, () => NOW);

    const result = store.createConnectedTask({
      tabId,
      task: newTask('C'),
      edgeId: edgeId('A-C'),
      kind: 'branch',
      fromTaskId: taskId('A'),
    });

    expect(result.ok).toBe(true);
    if (!result.ok || result.value.kind !== 'confirmation-required') return;
    expect(result.value.preview.impact.autoReopenedGoalIds).toEqual([taskId('A')]);
    expect(store.workspace.tabs[tabId]?.tasks.C).toBeUndefined();
    expect(store.workspace.tabs[tabId]?.flowEdges['A-C']).toBeUndefined();
    expect(store.workspace.tabs[tabId]?.tasks.A?.status).toBe('done');

    const cancelled = store.cancelMutation(result.value.preview.planId);
    expect(cancelled.ok).toBe(true);
    expect(store.workspace.tabs[tabId]?.tasks.C).toBeUndefined();
    expect(store.workspace.tabs[tabId]?.flowEdges['A-C']).toBeUndefined();

    const retried = store.createConnectedTask({
      tabId,
      task: newTask('C'),
      edgeId: edgeId('A-C'),
      kind: 'branch',
      fromTaskId: taskId('A'),
    });
    expect(retried.ok).toBe(true);
    if (!retried.ok || retried.value.kind !== 'confirmation-required') return;

    const confirmed = store.confirmMutation(retried.value.preview.planId);
    expect(confirmed.ok).toBe(true);
    expect(store.workspace.tabs[tabId]?.tasks.C).toBeDefined();
    expect(store.workspace.tabs[tabId]?.flowEdges['A-C']).toBeDefined();
    expect(store.workspace.tabs[tabId]?.tasks.A?.status).toBe('todo');
  });
});
