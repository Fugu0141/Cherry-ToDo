import { describe, expect, it } from 'vitest';

import { createEmptyBoardDocumentState } from '../../src/modules/board/index';
import { noSchedule } from '../../src/modules/schedule/index';
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

function task(id: string): Task {
  const parsed = taskId(id);
  return {
    id: parsed,
    title: id,
    notes: '',
    status: 'todo',
    schedule: noSchedule(),
    appearance: { importance: 'none' },
    meta,
  };
}

function fixture(): { readonly workspace: WorkspaceDocument; readonly tabId: TabId } {
  const workspaceId = unwrap(parseWorkspaceId('workspace'));
  const tabId = unwrap(parseTabId('tab'));
  const a = task('A');
  const b = task('B');
  const edgeId = unwrap(parseFlowEdgeId('ab'));

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
          tasks: { [a.id]: a, [b.id]: b },
          flowEdges: {
            [edgeId]: {
              id: edgeId,
              kind: 'continuation',
              fromTaskId: a.id,
              toTaskId: b.id,
              order: 0,
              meta,
            },
          },
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

describe('Application identity collision guards', () => {
  it('rejects Task ID reuse without changing canonical state', () => {
    const { workspace, tabId } = fixture();
    const store = new ApplicationStore(workspace);
    const before = store.workspace;

    const result = store.createTask(tabId, { id: taskId('A'), title: 'replacement' });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('task-id-in-use');
    expect(store.workspace).toBe(before);
    expect(store.workspace.tabs[tabId]?.tasks.A?.title).toBe('A');
  });

  it('rejects FlowEdge ID reuse without replacing the existing edge', () => {
    const { workspace, tabId } = fixture();
    const store = new ApplicationStore(workspace);
    const before = store.workspace;
    const existingId = unwrap(parseFlowEdgeId('ab'));

    const result = store.connectFlow({
      tabId,
      edgeId: existingId,
      kind: 'reference',
      fromTaskId: taskId('B'),
      toTaskId: taskId('A'),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('edge-id-in-use');
    expect(store.workspace).toBe(before);
    expect(store.workspace.tabs[tabId]?.flowEdges.ab).toMatchObject({
      kind: 'continuation',
      fromTaskId: taskId('A'),
      toTaskId: taskId('B'),
    });
  });
});
