import { describe, expect, it } from 'vitest';

import { createEmptyBoardDocumentState } from '../../src/modules/board/index';
import type { FlowEdge } from '../../src/modules/flow/index';
import {
  noSchedule,
  parseLocalDate,
  scheduleOnDate,
  type Schedule,
} from '../../src/modules/schedule/index';
import type { Task } from '../../src/modules/task/index';
import {
  ApplicationStore,
  CHERRY_V2_SCHEMA_VERSION,
  type MutationOutcome,
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
  type WorkspaceId,
} from '../../src/shared/ids/index';
import type { RevisionMeta } from '../../src/shared/revision/index';

const meta: RevisionMeta = {
  createdAt: '2026-09-14T00:00:00.000Z',
  updatedAt: '2026-09-14T00:00:00.000Z',
  revision: 0,
};

function unwrapId<T>(result: { readonly ok: true; readonly value: T } | { readonly ok: false }): T {
  if (!result.ok) throw new Error('Invalid fixture id.');
  return result.value;
}

function taskId(value: string): TaskId {
  return unwrapId(parseTaskId(value));
}

function edgeId(value: string): FlowEdgeId {
  return unwrapId(parseFlowEdgeId(value));
}

function task(
  id: string,
  status: 'todo' | 'done' = 'todo',
  schedule: Schedule = noSchedule(),
): Task {
  const parsed = taskId(id);
  return {
    id: parsed,
    title: id,
    notes: '',
    status,
    schedule,
    appearance: { importance: 'none' },
    meta,
  };
}

function structural(
  id: string,
  kind: 'continuation' | 'branch',
  from: string,
  to: string,
  order = 0,
): FlowEdge {
  return {
    id: edgeId(id),
    kind,
    fromTaskId: taskId(from),
    toTaskId: taskId(to),
    order,
    meta,
  };
}

function fixture(
  tasks: readonly Task[],
  edges: readonly FlowEdge[] = [],
): { readonly workspace: WorkspaceDocument; readonly tabId: TabId } {
  const workspaceId: WorkspaceId = unwrapId(parseWorkspaceId('workspace'));
  const tabId: TabId = unwrapId(parseTabId('tab'));
  const taskMap = Object.fromEntries(tasks.map((value) => [value.id, value]));
  const edgeMap = Object.fromEntries(edges.map((edge) => [edge.id, edge]));

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
          tasks: taskMap,
          flowEdges: edgeMap,
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

function tab(store: ApplicationStore, tabId: TabId) {
  const value = store.workspace.tabs[tabId];
  if (value === undefined) throw new Error('Expected fixture Tab.');
  return value;
}

function committed(outcome: MutationOutcome): WorkspaceDocument {
  expect(outcome.kind).toBe('committed');
  if (outcome.kind !== 'committed') throw new Error('Expected committed mutation.');
  return outcome.workspace;
}

function confirmation(outcome: MutationOutcome) {
  expect(outcome.kind).toBe('confirmation-required');
  if (outcome.kind !== 'confirmation-required') {
    throw new Error('Expected confirmation-required mutation.');
  }
  return outcome.preview;
}

function expectOk<T, E>(result: { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: E }): T {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(`Expected ok result, got ${JSON.stringify(result.error)}`);
  return result.value;
}

describe('Application completion semantics', () => {
  it('rejects direct derived-goal completion and auto-completes it after all descendants finish', () => {
    const { workspace, tabId } = fixture(
      [task('A'), task('B', 'done'), task('C')],
      [
        structural('ab', 'branch', 'A', 'B', 0),
        structural('ac', 'branch', 'A', 'C', 1),
      ],
    );
    const store = new ApplicationStore(workspace, () => '2026-09-14T01:00:00.000Z');

    const direct = store.setTaskStatus(tabId, taskId('A'), 'done');
    expect(direct.ok).toBe(false);
    if (!direct.ok) expect(direct.error.code).toBe('derived-goal-controlled');

    const finishC = expectOk(store.setTaskStatus(tabId, taskId('C'), 'done'));
    committed(finishC);
    expect(tab(store, tabId).tasks.A?.status).toBe('done');
  });

  it('keeps ordinary one-line Flow non-blocking', () => {
    const { workspace, tabId } = fixture(
      [task('A'), task('B'), task('C')],
      [
        structural('ab', 'continuation', 'A', 'B'),
        structural('bc', 'continuation', 'B', 'C'),
      ],
    );
    const store = new ApplicationStore(workspace);

    const result = expectOk(store.setTaskStatus(tabId, taskId('C'), 'done'));
    committed(result);
    expect(tab(store, tabId).tasks.A?.status).toBe('todo');
    expect(tab(store, tabId).tasks.B?.status).toBe('todo');
    expect(tab(store, tabId).tasks.C?.status).toBe('done');
  });

  it('rejects completion of a closed merge target and its downstream region', () => {
    const { workspace, tabId } = fixture(
      [task('A', 'done'), task('B'), task('C'), task('D')],
      [
        structural('ac', 'continuation', 'A', 'C'),
        structural('bc', 'continuation', 'B', 'C'),
        structural('cd', 'continuation', 'C', 'D'),
      ],
    );
    const store = new ApplicationStore(workspace);

    for (const id of ['C', 'D']) {
      const result = store.setTaskStatus(tabId, taskId(id), 'done');
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe('completion-blocked');
    }
  });
});

describe('revision-aware completion impact planning', () => {
  function completedMergeStore() {
    const built = fixture(
      [task('A', 'done'), task('B', 'done'), task('C', 'done'), task('D', 'done')],
      [
        structural('ac', 'continuation', 'A', 'C'),
        structural('bc', 'continuation', 'B', 'C'),
        structural('cd', 'continuation', 'C', 'D'),
      ],
    );
    return { ...built, store: new ApplicationStore(built.workspace, () => '2026-09-14T02:00:00.000Z') };
  }

  it('previews invalidation before mutation, cancel changes nothing, and confirm commits atomically', () => {
    const first = completedMergeStore();
    const before = first.store.workspace;
    const previewOutcome = expectOk(first.store.setTaskStatus(first.tabId, taskId('B'), 'todo'));
    const preview = confirmation(previewOutcome);

    expect(first.store.workspace).toBe(before);
    expect(preview.impact.invalidatedCompletedTaskIds).toEqual([taskId('C'), taskId('D')]);
    expect(preview.impact.newlyBlockedTaskIds).toEqual([taskId('C'), taskId('D')]);

    expectOk(first.store.cancelMutation(preview.planId));
    expect(first.store.workspace).toBe(before);
    expect(tab(first.store, first.tabId).tasks.B?.status).toBe('done');
    expect(tab(first.store, first.tabId).tasks.C?.status).toBe('done');
    expect(tab(first.store, first.tabId).tasks.D?.status).toBe('done');

    const second = completedMergeStore();
    const confirmPreview = confirmation(
      expectOk(second.store.setTaskStatus(second.tabId, taskId('B'), 'todo')),
    );
    expectOk(second.store.confirmMutation(confirmPreview.planId));
    expect(tab(second.store, second.tabId).tasks.B?.status).toBe('todo');
    expect(tab(second.store, second.tabId).tasks.C?.status).toBe('todo');
    expect(tab(second.store, second.tabId).tasks.D?.status).toBe('todo');
  });

  it('rejects a stale impact plan after another canonical command advances revision', () => {
    const { store, tabId } = completedMergeStore();
    const preview = confirmation(expectOk(store.setTaskStatus(tabId, taskId('B'), 'todo')));

    committed(expectOk(store.updateTask(tabId, taskId('A'), { title: 'A updated' })));
    const stale = store.confirmMutation(preview.planId);
    expect(stale.ok).toBe(false);
    if (!stale.ok) expect(stale.error.code).toBe('stale-plan');
    expect(tab(store, tabId).tasks.B?.status).toBe('done');
  });

  it('requires confirmation when a completed ordinary Task is promoted to an invalid branching goal', () => {
    const { workspace, tabId } = fixture(
      [task('A', 'done'), task('B', 'done'), task('C')],
      [structural('ab', 'continuation', 'A', 'B')],
    );
    const store = new ApplicationStore(workspace, () => '2026-09-14T03:00:00.000Z');

    const result = expectOk(
      store.connectFlow({
        tabId,
        edgeId: edgeId('ac'),
        kind: 'branch',
        fromTaskId: taskId('A'),
        toTaskId: taskId('C'),
        order: 0,
      }),
    );
    const preview = confirmation(result);
    expect(preview.impact.autoReopenedGoalIds).toEqual([taskId('A')]);
    expect(tab(store, tabId).flowEdges.ac).toBeUndefined();
    expect(tab(store, tabId).tasks.A?.status).toBe('done');

    expectOk(store.confirmMutation(preview.planId));
    expect(tab(store, tabId).flowEdges.ac).toBeDefined();
    expect(tab(store, tabId).tasks.A?.status).toBe('todo');
  });

  it('preserves the current completion state when a branching goal is demoted', () => {
    for (const status of ['done', 'todo'] as const) {
      const descendantStatus = status === 'done' ? 'done' : 'todo';
      const { workspace, tabId } = fixture(
        [task('A', status), task('B', descendantStatus), task('C', descendantStatus)],
        [
          structural('ab', 'branch', 'A', 'B', 0),
          structural('ac', 'branch', 'A', 'C', 1),
        ],
      );
      const store = new ApplicationStore(workspace);
      committed(expectOk(store.disconnectFlow(tabId, edgeId('ac'))));
      expect(tab(store, tabId).tasks.A?.status).toBe(status);
    }
  });
});

describe('Delete this Task only', () => {
  it('reconnects one predecessor to one successor', () => {
    const { workspace, tabId } = fixture(
      [task('A'), task('B'), task('C')],
      [
        structural('ab', 'continuation', 'A', 'B'),
        structural('bc', 'continuation', 'B', 'C'),
      ],
    );
    const store = new ApplicationStore(workspace);

    committed(expectOk(store.deleteTaskOnly(tabId, taskId('B'))));
    const value = tab(store, tabId);
    expect(value.tasks.B).toBeUndefined();
    expect(Object.values(value.flowEdges)).toHaveLength(1);
    expect(Object.values(value.flowEdges)[0]).toMatchObject({
      fromTaskId: taskId('A'),
      toTaskId: taskId('C'),
    });
  });

  it('transfers one-to-many branching to the predecessor', () => {
    const { workspace, tabId } = fixture(
      [task('A'), task('B'), task('C'), task('D')],
      [
        structural('ab', 'continuation', 'A', 'B'),
        structural('bc', 'branch', 'B', 'C', 0),
        structural('bd', 'branch', 'B', 'D', 1),
      ],
    );
    const store = new ApplicationStore(workspace);

    committed(expectOk(store.deleteTaskOnly(tabId, taskId('B'))));
    const edges = Object.values(tab(store, tabId).flowEdges);
    expect(edges).toHaveLength(2);
    expect(edges.map((edge) => [edge.kind, edge.fromTaskId, edge.toTaskId, 'order' in edge ? edge.order : -1])).toEqual([
      ['branch', taskId('A'), taskId('C'), 0],
      ['branch', taskId('A'), taskId('D'), 1],
    ]);
  });

  it('transfers many-to-one merging to the successor', () => {
    const { workspace, tabId } = fixture(
      [task('A'), task('B'), task('C'), task('D')],
      [
        structural('ac', 'continuation', 'A', 'C'),
        structural('bc', 'continuation', 'B', 'C'),
        structural('cd', 'continuation', 'C', 'D'),
      ],
    );
    const store = new ApplicationStore(workspace);

    committed(expectOk(store.deleteTaskOnly(tabId, taskId('C'))));
    const edges = Object.values(tab(store, tabId).flowEdges);
    expect(edges).toHaveLength(2);
    expect(edges.map((edge) => [edge.fromTaskId, edge.toTaskId])).toEqual([
      [taskId('A'), taskId('D')],
      [taskId('B'), taskId('D')],
    ]);
  });

  it('does not invent a Cartesian product for many-to-many deletion', () => {
    const { workspace, tabId } = fixture(
      [task('A'), task('B'), task('C'), task('D'), task('E')],
      [
        structural('ac', 'continuation', 'A', 'C'),
        structural('bc', 'continuation', 'B', 'C'),
        structural('cd', 'branch', 'C', 'D', 0),
        structural('ce', 'branch', 'C', 'E', 1),
      ],
    );
    const store = new ApplicationStore(workspace);

    const preview = confirmation(expectOk(store.deleteTaskOnly(tabId, taskId('C'))));
    expect(preview.impact.breaksFlowContinuity).toBe(true);
    expect(tab(store, tabId).tasks.C).toBeDefined();

    expectOk(store.confirmMutation(preview.planId));
    const value = tab(store, tabId);
    expect(value.tasks.C).toBeUndefined();
    expect(Object.values(value.flowEdges)).toHaveLength(0);
  });
});

describe('chain-limited downstream deletion', () => {
  it('stops before the next branch junction', () => {
    const { workspace, tabId } = fixture(
      [task('A'), task('B'), task('C'), task('D'), task('E')],
      [
        structural('ab', 'continuation', 'A', 'B'),
        structural('bc', 'continuation', 'B', 'C'),
        structural('cd', 'branch', 'C', 'D', 0),
        structural('ce', 'branch', 'C', 'E', 1),
      ],
    );
    const store = new ApplicationStore(workspace);

    committed(expectOk(store.deleteDownstreamFlow(tabId, taskId('A'))));
    const value = tab(store, tabId);
    expect(Object.keys(value.tasks).sort()).toEqual(['C', 'D', 'E']);
    expect(Object.values(value.flowEdges).map((edge) => edge.id).sort()).toEqual([
      edgeId('cd'),
      edgeId('ce'),
    ]);
  });

  it('stops before the next merge junction', () => {
    const { workspace, tabId } = fixture(
      [task('A'), task('B'), task('X'), task('M')],
      [
        structural('ab', 'continuation', 'A', 'B'),
        structural('bm', 'continuation', 'B', 'M'),
        structural('xm', 'continuation', 'X', 'M'),
      ],
    );
    const store = new ApplicationStore(workspace);

    committed(expectOk(store.deleteDownstreamFlow(tabId, taskId('A'))));
    const value = tab(store, tabId);
    expect(Object.keys(value.tasks).sort()).toEqual(['M', 'X']);
    expect(Object.values(value.flowEdges)).toHaveLength(1);
    expect(value.flowEdges.xm).toMatchObject({
      fromTaskId: taskId('X'),
      toTaskId: taskId('M'),
    });
  });
});

describe('semantic reorder and Board/Schedule separation', () => {
  it('reorders an isolated linear Flow without changing Task identity or Schedule', () => {
    const date = parseLocalDate('2026-09-20');
    if (!date.ok) throw new Error('Invalid date fixture.');
    const schedule = scheduleOnDate(date.value);
    const { workspace, tabId } = fixture(
      [task('A', 'todo', schedule), task('B'), task('C')],
      [
        structural('ab', 'continuation', 'A', 'B'),
        structural('bc', 'continuation', 'B', 'C'),
      ],
    );
    const store = new ApplicationStore(workspace);

    committed(
      expectOk(store.reorderLinearFlow(tabId, [taskId('A'), taskId('C'), taskId('B')])),
    );
    const value = tab(store, tabId);
    expect(Object.keys(value.tasks).sort()).toEqual(['A', 'B', 'C']);
    expect(value.tasks.A?.schedule).toEqual(schedule);
    expect(Object.values(value.flowEdges).map((edge) => [edge.fromTaskId, edge.toTaskId])).toEqual([
      [taskId('A'), taskId('C')],
      [taskId('C'), taskId('B')],
    ]);
  });

  it('moves a Task on Board without changing Flow or Schedule', () => {
    const date = parseLocalDate('2026-09-21');
    if (!date.ok) throw new Error('Invalid date fixture.');
    const schedule = scheduleOnDate(date.value);
    const { workspace, tabId } = fixture(
      [task('A', 'todo', schedule), task('B')],
      [structural('ab', 'continuation', 'A', 'B')],
    );
    const store = new ApplicationStore(workspace);
    const beforeEdges = tab(store, tabId).flowEdges;

    committed(expectOk(store.moveTask(tabId, taskId('A'), { x: 120, y: 340 })));
    const value = tab(store, tabId);
    expect(value.board.positions.A).toEqual({ x: 120, y: 340 });
    expect(value.tasks.A?.schedule).toEqual(schedule);
    expect(value.flowEdges).toEqual(beforeEdges);
  });
});
