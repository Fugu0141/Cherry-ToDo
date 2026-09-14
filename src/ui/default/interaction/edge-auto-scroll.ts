import type { InteractionPoint } from './interaction-coordinator';

export interface EdgeAutoScrollViewport {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

export interface EdgeAutoScrollPosition {
  readonly left: number;
  readonly top: number;
  readonly maxLeft: number;
  readonly maxTop: number;
}

export interface EdgeAutoScrollInput {
  readonly pointer: InteractionPoint;
  readonly preview: InteractionPoint;
  readonly viewport: EdgeAutoScrollViewport;
  readonly scroll: EdgeAutoScrollPosition;
  readonly threshold?: number;
  readonly maxStep?: number;
}

export interface EdgeAutoScrollResult {
  readonly delta: InteractionPoint;
  readonly nextScroll: Pick<EdgeAutoScrollPosition, 'left' | 'top'>;
  readonly nextPreview: InteractionPoint;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function edgeVelocity(
  position: number,
  low: number,
  high: number,
  threshold: number,
  maxStep: number,
): number {
  if (position < low + threshold) {
    const ratio = clamp((low + threshold - position) / threshold, 0, 1);
    return -maxStep * ratio;
  }
  if (position > high - threshold) {
    const ratio = clamp((position - (high - threshold)) / threshold, 0, 1);
    return maxStep * ratio;
  }
  return 0;
}

export function resolveEdgeAutoScroll(input: EdgeAutoScrollInput): EdgeAutoScrollResult {
  const threshold = Math.max(1, input.threshold ?? 56);
  const maxStep = Math.max(0, input.maxStep ?? 18);

  const requestedX = edgeVelocity(
    input.pointer.x,
    input.viewport.left,
    input.viewport.right,
    threshold,
    maxStep,
  );
  const requestedY = edgeVelocity(
    input.pointer.y,
    input.viewport.top,
    input.viewport.bottom,
    threshold,
    maxStep,
  );

  const nextLeft = clamp(input.scroll.left + requestedX, 0, input.scroll.maxLeft);
  const nextTop = clamp(input.scroll.top + requestedY, 0, input.scroll.maxTop);
  const delta = {
    x: nextLeft - input.scroll.left,
    y: nextTop - input.scroll.top,
  };

  return {
    delta,
    nextScroll: { left: nextLeft, top: nextTop },
    nextPreview: {
      x: input.preview.x + delta.x,
      y: input.preview.y + delta.y,
    },
  };
}
