import { describe, expect, it } from 'vitest';

import { simplifyStrokePoints } from '../../src/modules/annotation/application/annotation-operations';
import { validateFlowGraph, type FlowEdge } from '../../src/modules/flow/index';
import {
  parseFlowEdgeId,
  parseTaskId,
  type FlowEdgeId,
  type TaskId,
} from '../../src/shared/ids/index';
import type { RevisionMeta } from '../../src/shared/revision/index';

const meta: RevisionMeta = {
  createdAt: '2026-09-14T00:00:00.000Z',
  updatedAt: '2026-09-14T00:00:00.000Z',
  revision: 0,
};

function unwrap<T>(result: { readonly ok: true; readonly value: T } | { readonly ok: false }): T {
  if (!result.ok) throw new Error('invalid fixture id');
  return result.value;
}

function task(value: string): TaskId {
  return unwrap(parseTaskId(value));
}

function edge(value: string): FlowEdgeId {
  return unwrap(parseFlowEdgeId(value));
}

function reference(id: string, from: string, to: string): FlowEdge {
  return {
    id: edge(id),
    kind: 'reference',
    fromTaskId: task(from),
    toTaskId: task(to),
    meta,
  };
}

describe('Phase 8 reference and annotation primitives', () => {
  it('accepts a directed A → B → C → A reference cycle while structural DAG rules stay separate', () => {
    const edges = [reference('ab', 'A', 'B'), reference('bc', 'B', 'C'), reference('ca', 'C', 'A')];
    const result = validateFlowGraph(
      [task('A'), task('B'), task('C')],
      Object.fromEntries(edges.map((value) => [value.id, value])),
    );

    expect(result.ok).toBe(true);
  });

  it('still rejects a structural cycle', () => {
    const structural = (id: string, from: string, to: string): FlowEdge => ({
      id: edge(id),
      kind: 'continuation',
      fromTaskId: task(from),
      toTaskId: task(to),
      order: 0,
      meta,
    });
    const edges = [structural('ab', 'A', 'B'), structural('bc', 'B', 'C'), structural('ca', 'C', 'A')];
    const result = validateFlowGraph(
      [task('A'), task('B'), task('C')],
      Object.fromEntries(edges.map((value) => [value.id, value])),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.some((issue) => issue.code === 'structural-cycle')).toBe(true);
  });

  it('simplifies dense drawing samples and preserves the first and final points', () => {
    const input = Array.from({ length: 2000 }, (_, index) => ({ x: index * 0.25, y: index % 7 }));
    const simplified = simplifyStrokePoints(input, 2, 128);

    expect(simplified.length).toBeLessThanOrEqual(128);
    expect(simplified[0]).toEqual(input[0]);
    expect(simplified[simplified.length - 1]).toEqual(input[input.length - 1]);
  });
});
