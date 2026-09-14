import { describe, expect, it } from 'vitest';

import { createEmptyBoardDocumentState } from '../../src/modules/board/index.ts';
import type { FlowEdge } from '../../src/modules/flow/index.ts';
import { noSchedule } from '../../src/modules/schedule/index.ts';
import type { Task } from '../../src/modules/task/index.ts';
import {
  CHERRY_V2_SCHEMA_VERSION,
  validateWorkspaceDocument,
  type WorkspaceDocument,
} from '../../src/modules/workspace/index.ts';
import {
  parseFlowEdgeId,
  parseTabId,
  parseTaskId,
  parseWorkspaceId,
  type FlowEdgeId,
  type TabId,
  type TaskId,
  type WorkspaceId,
} from '../../src/shared/ids/index.ts';
import { revisionMeta } from './fixtures.ts';

function unwrapId<T>(result: { readonly ok: true; readonly value: T } | { readonly ok: false }): T {
  if (!result.ok) throw new Error('Invalid fixture id.');
  return result.value;
}

function task(id: TaskId): Task {
  return {
    id,
    title: String(id),
    notes: '',
    status: 'todo',
    schedule: noSchedule(),
    appearance: { importance: 'none' },
    meta: revisionMeta,
  };
}

function edge(id: FlowEdgeId, from: TaskId, to: TaskId): FlowEdge {
  return {
    id,
    kind: 'continuation',
    fromTaskId: from,
    toTaskId: to,
    order: 0,
    meta: revisionMeta,
  };
}

function workspaceFixture(): WorkspaceDocument {
  const workspaceId: WorkspaceId = unwrapId(parseWorkspaceId('workspace'));
  const tabId: TabId = unwrapId(parseTabId('tab'));
  const a = unwrapId(parseTaskId('A'));
  const b = unwrapId(parseTaskId('B'));
  const merge = unwrapId(parseTaskId('merge'));
  const aMerge = unwrapId(parseFlowEdgeId('a-merge'));
  const bMerge = unwrapId(parseFlowEdgeId('b-merge'));

  return {
    schemaVersion: CHERRY_V2_SCHEMA_VERSION,
    id: workspaceId,
    name: 'Workspace',
    tabs: {
      [tabId]: {
        id: tabId,
        name: 'Plan',
        tasks: {
          [a]: task(a),
          [b]: task(b),
          [merge]: task(merge),
        },
        flowEdges: {
          [aMerge]: edge(aMerge, a, merge),
          [bMerge]: edge(bMerge, b, merge),
        },
        annotations: {},
        board: {
          ...createEmptyBoardDocumentState(),
          positions: { [a]: { x: 100, y: 200 } },
        },
        meta: revisionMeta,
      },
    },
    tabOrder: [tabId],
    meta: revisionMeta,
  };
}

describe('Workspace aggregate', () => {
  it('accepts one canonical Task with multiple structural predecessors', () => {
    const result = validateWorkspaceDocument(workspaceFixture());
    expect(result.ok).toBe(true);

    if (result.ok) {
      const tab = Object.values(result.value.tabs)[0];
      expect(tab).toBeDefined();
      expect(Object.keys(tab?.tasks ?? {})).toHaveLength(3);
      expect(Object.values(tab?.flowEdges ?? {})).toHaveLength(2);
    }
  });

  it('keeps Board positions outside Task semantic data', () => {
    const workspace = workspaceFixture();
    const tab = Object.values(workspace.tabs)[0];
    const taskA = tab?.tasks.A;

    expect(taskA).toBeDefined();
    expect(taskA).not.toHaveProperty('x');
    expect(taskA).not.toHaveProperty('y');
    expect(taskA).not.toHaveProperty('position');
    expect(tab?.board.positions.A).toEqual({ x: 100, y: 200 });
  });

  it('rejects Board positions for Tasks outside the Tab', () => {
    const workspace = workspaceFixture();
    const tab = Object.values(workspace.tabs)[0];
    if (tab === undefined) throw new Error('Expected a fixture Tab.');

    const invalid: WorkspaceDocument = {
      ...workspace,
      tabs: {
        [tab.id]: {
          ...tab,
          board: {
            ...tab.board,
            positions: { ...tab.board.positions, ghost: { x: 0, y: 0 } },
          },
        },
      },
    };

    const result = validateWorkspaceDocument(invalid);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.some((error) => error.code === 'invalid-board')).toBe(true);
    }
  });
});
