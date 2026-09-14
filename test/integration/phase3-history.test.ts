import { describe, expect, it } from 'vitest';

import { createEmptyBoardDocumentState } from '../../src/modules/board/index';
import type { FlowEdge } from '../../src/modules/flow/index';
import { noSchedule } from '../../src/modules/schedule/index';
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

function edgeId(value: string): FlowEdgeId {
  return unwrap(parseFlowEdgeId(value));
}

function task(id: string, status: 'todo' | 'done' = 'todo'): Task {
  const parsed = taskId(id);
  return {
    id: parsed,
    title: id,
    notes: '',
    status,
    schedule: noSchedule(),
    appearance: { importance: 'none' },
    meta,
  };
}

function edge(id: string, from: string, to: string): FlowEdge {
  return {
    id: edgeId(id),
    kind: 'continuation',
    fromTaskId: taskId(from),
    toTaskId: taskId(to),
    order: 0,
    meta,
  };
}

function fixture(tasks: readonly Task[], edges: readonly FlowEdge[]) {
  const workspaceId = unwrap(parseWorkspaceId('workspace'));
  const tabId: TabId = unwrap(parseTabId('tab'));
  const workspace: WorkspaceDocument = {
    schemaVersion: CHERRY_V2_SCHEMA_VERSION,
    id: workspaceId,
    name: 'Workspace',
    tabs: {
      [tabId]: {
        id: tabId,
        name: 'Plan',
        tasks: Object.fromEntries(tasks.map((value) => [value.id, value])),
        flowEdges: Object.fromEntries(edges.map((value) => [value.id, value])),
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

function ok<T, E>(result: { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: E }): T {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(`Expected ok result, got ${JSON.stringify(result.error)}`);
  return result.value;
}

function committed(outcome: MutationOutcome): void {
  expect(outcome.kind).toBe('committed');
  if (outcome.kind !== 'committed') throw new Error('Expected committed outcome.');
}

function confirmation(outcome: MutationOutcome): string {
  expect(outcome.kind).toBe('confirmation-required');
  if (outcome.kind !== 'confirmation-required') {
    throw new Error('Expected confirmation-required outcome.');
  }
  return outcome.preview.planId;
}

describe('Phase 3 exact semantic History', () => {
  it('undoes and redoes a Flow reorder exactly', () => {
    const built = fixture(
      [task('A'), task('B'), task('C')],
      [edge('ab', 'A', 'B'), edge('bc', 'B', 'C')],
    );
    const store = new ApplicationStore(built.workspace, () => '2026-09-14T04:00:00.000Z');
    const before = store.workspace;

    committed(ok(store.reorderLinearFlow(built.tabId, [taskId('A'), taskId('C'), taskId('B')])));
    const after = store.workspace;
    expect(after).not.toEqual(before);
    expect(store.historyState).toMatchObject({ canUndo: true, canRedo: false, undoDepth: 1 });

    expect(ok(store.undo())).toBe(before);
    expect(store.workspace).toBe(before);
    expect(store.historyState.canRedo).toBe(true);

    expect(ok(store.redo())).toBe(after);
    expect(store.workspace).toBe(after);
  });

  it('undoes Task deletion with the exact original Task and edge identities', () => {
    const built = fixture(
      [task('A'), task('B'), task('C')],
      [edge('ab', 'A', 'B'), edge('bc', 'B', 'C')],
    );
    const store = new ApplicationStore(built.workspace, () => '2026-09-14T05:00:00.000Z');
    const before = store.workspace;

    committed(ok(store.deleteTaskOnly(built.tabId, taskId('B'))));
    expect(store.workspace.tabs[built.tabId]?.tasks.B).toBeUndefined();

    ok(store.undo());
    expect(store.workspace).toBe(before);
    expect(store.workspace.tabs[built.tabId]?.tasks.B).toEqual(before.tabs[built.tabId]?.tasks.B);
    expect(store.workspace.tabs[built.tabId]?.flowEdges).toEqual(before.tabs[built.tabId]?.flowEdges);
  });

  it('records a confirmed invalidation as one atomic History entry', () => {
    const built = fixture(
      [task('A', 'done'), task('B', 'done'), task('C', 'done'), task('D', 'done')],
      [edge('ac', 'A', 'C'), edge('bc', 'B', 'C'), edge('cd', 'C', 'D')],
    );
    const store = new ApplicationStore(built.workspace, () => '2026-09-14T06:00:00.000Z');
    const before = store.workspace;

    const planId = confirmation(ok(store.setTaskStatus(built.tabId, taskId('B'), 'todo')));
    expect(store.historyState.undoDepth).toBe(0);
    expect(store.workspace).toBe(before);

    const confirmed = ok(store.confirmMutation(planId));
    expect(confirmed.tabs[built.tabId]?.tasks.B?.status).toBe('todo');
    expect(confirmed.tabs[built.tabId]?.tasks.C?.status).toBe('todo');
    expect(confirmed.tabs[built.tabId]?.tasks.D?.status).toBe('todo');
    expect(store.historyState.undoDepth).toBe(1);

    ok(store.undo());
    expect(store.workspace).toBe(before);
    expect(store.historyState.undoDepth).toBe(0);
    expect(store.historyState.redoDepth).toBe(1);
  });

  it('does not add preview or cancel operations to History', () => {
    const built = fixture(
      [task('A', 'done'), task('B', 'done'), task('C', 'done')],
      [edge('ac', 'A', 'C'), edge('bc', 'B', 'C')],
    );
    const store = new ApplicationStore(built.workspace);
    const before = store.workspace;

    const planId = confirmation(ok(store.setTaskStatus(built.tabId, taskId('B'), 'todo')));
    expect(store.historyState).toEqual({ canUndo: false, canRedo: false, undoDepth: 0, redoDepth: 0 });
    expect(store.workspace).toBe(before);

    ok(store.cancelMutation(planId));
    expect(store.historyState).toEqual({ canUndo: false, canRedo: false, undoDepth: 0, redoDepth: 0 });
    const undo = store.undo();
    expect(undo.ok).toBe(false);
    if (!undo.ok) expect(undo.error.code).toBe('nothing-to-undo');
  });

  it('drops the redo branch after a new forward command following Undo', () => {
    const built = fixture([task('A')], []);
    const store = new ApplicationStore(built.workspace, () => '2026-09-14T07:00:00.000Z');

    committed(ok(store.updateTask(built.tabId, taskId('A'), { title: 'first' })));
    ok(store.undo());
    expect(store.historyState.canRedo).toBe(true);

    committed(ok(store.updateTask(built.tabId, taskId('A'), { title: 'different branch' })));
    expect(store.historyState.canRedo).toBe(false);
    const redo = store.redo();
    expect(redo.ok).toBe(false);
    if (!redo.ok) expect(redo.error.code).toBe('nothing-to-redo');
    expect(store.workspace.tabs[built.tabId]?.tasks.A?.title).toBe('different branch');
  });
});
