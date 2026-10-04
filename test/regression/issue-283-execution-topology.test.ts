import { describe, expect, it } from 'vitest';

import { createEmptyBoardDocumentState } from '../../src/modules/board/index';
import {
  analyzeExecutionTopology,
  isDerivedBranchingGoal,
  validateFlowGraph,
  type FlowEdge,
} from '../../src/modules/flow/index';
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
  type FlowEdgeId,
  type TabId,
  type TaskId,
} from '../../src/shared/ids/index';
import type { RevisionMeta } from '../../src/shared/revision/index';

const meta: RevisionMeta = {
  createdAt: '2026-10-04T00:00:00.000Z',
  updatedAt: '2026-10-04T00:00:00.000Z',
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

function task(value: string, status: 'todo' | 'done' = 'todo'): Task {
  return {
    id: taskId(value),
    title: value,
    notes: '',
    status,
    schedule: noSchedule(),
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

function reference(id: string, from: string, to: string): FlowEdge {
  return {
    id: edgeId(id),
    kind: 'reference',
    fromTaskId: taskId(from),
    toTaskId: taskId(to),
    meta,
  };
}

function validate(ids: readonly string[], edges: readonly FlowEdge[]) {
  return validateFlowGraph(
    ids.map(taskId),
    Object.fromEntries(edges.map((edge) => [edge.id, edge])),
  );
}

function fixture(
  tasks: readonly Task[],
  edges: readonly FlowEdge[],
): {
  readonly workspace: WorkspaceDocument;
  readonly tabId: TabId;
} {
  const tabId = unwrapId(parseTabId('tab'));
  const workspaceId = unwrapId(parseWorkspaceId('workspace'));
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
          tasks: Object.fromEntries(tasks.map((value) => [value.id, value])),
          flowEdges: Object.fromEntries(edges.map((edge) => [edge.id, edge])),
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

describe('issue #283 execution topology regression', () => {
  it('rejects continuation + branch duplicates for the same structural endpoints', () => {
    const result = validate(
      ['A', 'B'],
      [
        structural('ab-main', 'continuation', 'A', 'B'),
        structural('ab-branch', 'branch', 'A', 'B'),
      ],
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.some((error) => error.code === 'duplicate-edge')).toBe(true);
    }
  });

  it('does not treat a transitive direct successor as an independent branch', () => {
    const result = validate(
      ['A', 'B', 'M'],
      [
        structural('ab', 'continuation', 'A', 'B'),
        structural('bm', 'continuation', 'B', 'M'),
        structural('am', 'branch', 'A', 'M'),
      ],
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(isDerivedBranchingGoal(taskId('A'), result.value)).toBe(false);
    expect(
      analyzeExecutionTopology(['A', 'B', 'M'].map(taskId), result.value).derivedGoalTaskIds,
    ).toEqual([]);
  });

  it('rejects a structural DAG whose Goal and Merge completion dependencies form a cycle', () => {
    const result = validate(
      ['A', 'B', 'C', 'M'],
      [
        structural('ab', 'branch', 'A', 'B', 0),
        structural('ac', 'branch', 'A', 'C', 1),
        structural('bm', 'continuation', 'B', 'M'),
        structural('cm', 'continuation', 'C', 'M'),
        structural('am', 'branch', 'A', 'M', 2),
      ],
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.some((error) => error.code === 'structural-cycle')).toBe(false);
      expect(result.error.some((error) => error.code === 'execution-dependency-cycle')).toBe(true);
    }
  });

  it('ignores reference edges when deriving execution dependencies', () => {
    const result = validate(
      ['A', 'B', 'C', 'M'],
      [
        structural('ab', 'branch', 'A', 'B', 0),
        structural('ac', 'branch', 'A', 'C', 1),
        structural('bm', 'continuation', 'B', 'M'),
        structural('cm', 'continuation', 'C', 'M'),
        reference('am-ref', 'A', 'M'),
      ],
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const analysis = analyzeExecutionTopology(['A', 'B', 'C', 'M'].map(taskId), result.value);
    expect(analysis.dependencyCycleTaskIds).toEqual([]);
    expect(analysis.derivedGoalTaskIds).toEqual([taskId('A')]);
  });

  it('previews invalidation instead of self-completing an ancestor after adding a merge predecessor', () => {
    const initialEdges = [
      structural('ab', 'continuation', 'A', 'B'),
      structural('bm', 'continuation', 'B', 'M'),
    ];
    const { workspace, tabId } = fixture(
      [task('A'), task('B', 'done'), task('M', 'done')],
      initialEdges,
    );
    const store = new ApplicationStore(workspace, () => '2026-10-04T01:00:00.000Z');

    const result = store.connectFlow({
      tabId,
      edgeId: edgeId('am'),
      kind: 'branch',
      fromTaskId: taskId('A'),
      toTaskId: taskId('M'),
      order: 0,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.kind).toBe('confirmation-required');
    if (result.value.kind !== 'confirmation-required') return;

    expect(result.value.preview.impact.autoReopenedGoalIds).toEqual([]);
    expect(result.value.preview.impact.invalidatedCompletedTaskIds).toEqual([taskId('M')]);
    expect(store.workspace.tabs[tabId]?.tasks.A?.status).toBe('todo');
    expect(store.workspace.tabs[tabId]?.tasks.M?.status).toBe('done');
    expect(store.workspace.tabs[tabId]?.flowEdges.am).toBeUndefined();

    const confirmed = store.confirmMutation(result.value.preview.planId);
    expect(confirmed.ok).toBe(true);
    expect(store.workspace.tabs[tabId]?.tasks.A?.status).toBe('todo');
    expect(store.workspace.tabs[tabId]?.tasks.M?.status).toBe('todo');
    expect(store.workspace.tabs[tabId]?.flowEdges.am).toBeDefined();
  });
});
