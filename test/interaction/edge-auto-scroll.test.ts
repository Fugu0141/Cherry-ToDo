import { describe, expect, it } from 'vitest';

import { resolveEdgeAutoScroll } from '../../src/ui/default/interaction/edge-auto-scroll';

describe('resolveEdgeAutoScroll', () => {
  const viewport = { left: 100, top: 100, right: 500, bottom: 700 };

  it('does not scroll while the pointer is away from the viewport edge', () => {
    expect(
      resolveEdgeAutoScroll({
        pointer: { x: 300, y: 400 },
        preview: { x: 240, y: 280 },
        viewport,
        scroll: { left: 50, top: 60, maxLeft: 800, maxTop: 900 },
      }),
    ).toEqual({
      delta: { x: 0, y: 0 },
      nextScroll: { left: 50, top: 60 },
      nextPreview: { x: 240, y: 280 },
    });
  });

  it('moves scroll and drag preview together near an edge', () => {
    const result = resolveEdgeAutoScroll({
      pointer: { x: 495, y: 695 },
      preview: { x: 420, y: 580 },
      viewport,
      scroll: { left: 100, top: 200, maxLeft: 800, maxTop: 900 },
      threshold: 50,
      maxStep: 20,
    });

    expect(result.delta.x).toBeGreaterThan(0);
    expect(result.delta.y).toBeGreaterThan(0);
    expect(result.nextPreview.x - 420).toBe(result.delta.x);
    expect(result.nextPreview.y - 580).toBe(result.delta.y);
  });

  it('clamps at scroll boundaries instead of drifting the preview', () => {
    const result = resolveEdgeAutoScroll({
      pointer: { x: 95, y: 95 },
      preview: { x: 10, y: 10 },
      viewport,
      scroll: { left: 0, top: 0, maxLeft: 400, maxTop: 500 },
    });

    expect(result.delta).toEqual({ x: 0, y: 0 });
    expect(result.nextScroll).toEqual({ left: 0, top: 0 });
    expect(result.nextPreview).toEqual({ x: 10, y: 10 });
  });
});
