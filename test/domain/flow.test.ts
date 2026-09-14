import { describe, expect, it } from 'vitest';

import {
  addFlowEdge,
  incomingStructuralEdges,
  isDerivedBranchingGoal,
  validateFlowGraph,
  type FlowEdge,
  type FlowGraph,
} from '../../src/modules/flow/index';
import {
  parseFlowEdgeId,
  parseTaskId,
  type FlowEdgeId,
  type TaskId,
} from '../../src/shared/ids/index';
import { revisionMeta } from './fixtures';

function taskId(value: string): TaskId {
  const result = parseTaskId(value);
  if (!result.ok) throw new Error(`Invalid test Task id: ${value}`);
  return result.value;
}

function edgeId(value: string): FlowEdgeId {
  const result = parseFlowEdgeId(value);
  if (!result.ok) throw new Error(`Invalid test Flow edge id: ${value}`);
  return result.value;
}

function continuation(id: string, from: TaskId, to: TaskId): FlowEdge {
  return {
    id: edgeId(id),
    kind: 'continuation',
    fromTaskId: from,
    toTaskId: to,
    order: 0,
    meta: revisionMeta,
  };
}

function branch(id: string, from: TaskId, to: TaskId, order: number): FlowEdge {
  return {
    id: edgeId(id),
    kind: 'branch',
    fromTaskId: from,
    toTaskId: to,
    order,
    meta: revisionMeta,
  };
}

function reference(id: string, from: TaskId, to: TaskId): FlowEdge {
  return {
    id: edgeId(id),
    kind: 'reference',
    fromTaskId: from,
    toTaskId: to,
    meta: revisionMeta,
  };
}

describe('structural Flow DAG', () => {
  it('accepts chains, branches, and a canonical merge Task', () => {
    const a = taskId('A');
    const b = taskId('B');
    const c = taskId('C');
    const d = taskId('D');
    const result = validateFlowGraph([a, b, c, d], {
      'edge-ab': branch('edge-ab', a, b, 0),
      'edge-ac': branch('edge-ac', a, c, 1),
      'edge-bd': continuation('edge-bd', b, d),
      'edge-cd': continuation('edge-cd', c, d),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(isDerivedBranchingGoal(a, result.value)).toBe(true);
      expect(incomingStructuralEdges(d, result.value)).toHaveLength(2);
    }
  });

  it('rejects structural cycles, self-links, and duplicate connections', () => {
    const a = taskId('A');
    const b = taskId('B');

    const cycle = validateFlowGraph([a, b], {
      ab: continuation('ab', a, b),
      ba: continuation('ba', b, a),
    });
    expect(cycle.ok).toBe(false);
    if (!cycle.ok) {
      expect(cycle.error.some((error) => error.code === 'structural-cycle')).toBe(true);
    }

    const self = validateFlowGraph([a], { self: continuation('self', a, a) });
    expect(self.ok).toBe(false);
    if (!self.ok) {
      expect(self.error.some((error) => error.code === 'self-edge')).toBe(true);
    }

    const duplicate = validateFlowGraph([a, b], {
      first: branch('first', a, b, 0),
      second: branch('second', a, b, 1),
    });
    expect(duplicate.ok).toBe(false);
    if (!duplicate.ok) {
      expect(duplicate.error.some((error) => error.code === 'duplicate-edge')).toBe(true);
    }
  });

  it('enforces continuation and branch-order invariants', () => {
    const a = taskId('A');
    const b = taskId('B');
    const c = taskId('C');

    const continuations = validateFlowGraph([a, b, c], {
      ab: continuation('ab', a, b),
      ac: continuation('ac', a, c),
    });
    expect(continuations.ok).toBe(false);
    if (!continuations.ok) {
      const hasConflict = continuations.error.some(
        (error) => error.code === 'continuation-conflict',
      );
      expect(hasConflict).toBe(true);
    }

    const branchOrder = validateFlowGraph([a, b, c], {
      ab: branch('ab', a, b, 0),
      ac: branch('ac', a, c, 0),
    });
    expect(branchOrder.ok).toBe(false);
    if (!branchOrder.ok) {
      const hasConflict = branchOrder.error.some(
        (error) => error.code === 'branch-order-conflict',
      );
      expect(hasConflict).toBe(true);
    }
  });

  it('rejects edges whose endpoints are outside the current Tab', () => {
    const a = taskId('A');
    const b = taskId('B');

    const result = validateFlowGraph([a], { ab: continuation('ab', a, b) });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.some((error) => error.code === 'missing-endpoint')).toBe(true);
    }
  });

  it('allows reference cycles without feeding them into structural DAG validation', () => {
    const a = taskId('A');
    const b = taskId('B');
    const c = taskId('C');

    const result = validateFlowGraph([a, b, c], {
      ab: reference('ab', a, b),
      bc: reference('bc', b, c),
      ca: reference('ca', c, a),
    });

    expect(result.ok).toBe(true);
  });

  it('does not mutate the existing graph when an added edge is invalid', () => {
    const a = taskId('A');
    const b = taskId('B');
    const existing = validateFlowGraph([a, b], { ab: continuation('ab', a, b) });
    if (!existing.ok) throw new Error('Expected fixture graph to be valid.');

    const graph: FlowGraph = existing.value;
    const before = graph.edges;
    const result = addFlowEdge([a, b], graph, continuation('ba', b, a));

    expect(result.ok).toBe(false);
    expect(graph.edges).toBe(before);
    expect(Object.keys(graph.edges)).toEqual(['ab']);
  });
});
