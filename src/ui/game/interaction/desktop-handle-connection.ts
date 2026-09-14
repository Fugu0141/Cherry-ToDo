export type HandleConnectionKind = 'continuation' | 'branch';

export interface DesktopHandleConnectionOptions {
  readonly scroll: HTMLElement;
  readonly canvas: HTMLElement;
  readonly resolveKind: (sourceTaskId: string) => HandleConnectionKind;
  readonly createNext: (sourceTaskId: string, kind: HandleConnectionKind) => void;
  readonly connectExisting: (
    sourceTaskId: string,
    targetTaskId: string,
    kind: HandleConnectionKind,
  ) => void;
}

interface DragSession {
  readonly pointerId: number;
  readonly sourceTaskId: string;
  readonly sourceCard: HTMLElement;
  readonly handle: HTMLButtonElement;
  readonly startX: number;
  readonly startY: number;
  readonly kind: HandleConnectionKind;
  readonly preview: SVGPathElement;
  moved: boolean;
  target: HTMLElement | null;
}

const SVG_NS = 'http://www.w3.org/2000/svg';
const MOVE_THRESHOLD = 7;
const EDGE_ZONE = 58;
const EDGE_STEP = 17;

function taskAtPoint(clientX: number, clientY: number, sourceTaskId: string): HTMLElement | null {
  const target = document.elementFromPoint(clientX, clientY);
  if (!(target instanceof Element)) return null;
  const card = target.closest<HTMLElement>('.cg-board-task[data-task-id]');
  if (card === null || card.dataset.taskId === sourceTaskId) return null;
  return card;
}

function boardPoint(canvas: HTMLElement, clientX: number, clientY: number) {
  const rect = canvas.getBoundingClientRect();
  return { x: clientX - rect.left, y: clientY - rect.top };
}

function sourcePoint(canvas: HTMLElement, source: HTMLElement) {
  const canvasRect = canvas.getBoundingClientRect();
  const rect = source.getBoundingClientRect();
  return {
    x: rect.right - canvasRect.left,
    y: rect.top + rect.height / 2 - canvasRect.top,
  };
}

function targetPoint(canvas: HTMLElement, target: HTMLElement) {
  const canvasRect = canvas.getBoundingClientRect();
  const rect = target.getBoundingClientRect();
  return {
    x: rect.left - canvasRect.left,
    y: rect.top + rect.height / 2 - canvasRect.top,
  };
}

function previewPath(from: { x: number; y: number }, to: { x: number; y: number }): string {
  const distance = Math.max(48, Math.abs(to.x - from.x) * 0.48);
  return `M ${from.x} ${from.y} C ${from.x + distance} ${from.y}, ${to.x - distance} ${to.y}, ${to.x} ${to.y}`;
}

function autoScroll(scroll: HTMLElement, clientX: number, clientY: number): boolean {
  const rect = scroll.getBoundingClientRect();
  let dx = 0;
  let dy = 0;
  if (clientX < rect.left + EDGE_ZONE) dx = -EDGE_STEP;
  else if (clientX > rect.right - EDGE_ZONE) dx = EDGE_STEP;
  if (clientY < rect.top + EDGE_ZONE) dy = -EDGE_STEP;
  else if (clientY > rect.bottom - EDGE_ZONE) dy = EDGE_STEP;

  if (dx === 0 && dy === 0) return false;
  const beforeX = scroll.scrollLeft;
  const beforeY = scroll.scrollTop;
  scroll.scrollLeft += dx;
  scroll.scrollTop += dy;
  return scroll.scrollLeft !== beforeX || scroll.scrollTop !== beforeY;
}

export function installDesktopHandleConnection(
  options: DesktopHandleConnectionOptions,
): () => void {
  const { scroll, canvas, resolveKind, createNext, connectExisting } = options;
  const flowLayer = canvas.querySelector<SVGSVGElement>('.cg-flow-layer');
  if (flowLayer === null) return () => undefined;

  let session: DragSession | null = null;
  const cleanups: Array<() => void> = [];

  const clearTarget = (): void => {
    if (session?.target !== null && session?.target !== undefined) {
      delete session.target.dataset.flowDropTarget;
    }
    if (session !== null) session.target = null;
  };

  const update = (event: PointerEvent): void => {
    const current = session;
    if (current === null || current.pointerId !== event.pointerId) return;
    event.preventDefault();
    const distance = Math.hypot(event.clientX - current.startX, event.clientY - current.startY);
    if (!current.moved && distance >= MOVE_THRESHOLD) {
      current.moved = true;
      current.sourceCard.dataset.connecting = 'true';
      current.preview.hidden = false;
    }
    if (!current.moved) return;

    autoScroll(scroll, event.clientX, event.clientY);
    const candidate = taskAtPoint(event.clientX, event.clientY, current.sourceTaskId);
    if (candidate !== current.target) {
      clearTarget();
      current.target = candidate;
      if (candidate !== null) candidate.dataset.flowDropTarget = 'true';
    }

    const from = sourcePoint(canvas, current.sourceCard);
    const to = current.target === null
      ? boardPoint(canvas, event.clientX, event.clientY)
      : targetPoint(canvas, current.target);
    current.preview.setAttribute('d', previewPath(from, to));
  };

  const finish = (event: PointerEvent, cancelled: boolean): void => {
    const current = session;
    if (current === null || current.pointerId !== event.pointerId) return;
    event.preventDefault();
    current.handle.dataset.suppressClick = 'true';
    const targetTaskId = current.target?.dataset.taskId ?? null;
    clearTarget();
    current.preview.remove();
    delete current.sourceCard.dataset.connecting;
    try {
      current.handle.releasePointerCapture(event.pointerId);
    } catch {
      // Capture can already be released by the browser.
    }
    session = null;

    if (cancelled) return;
    if (current.moved && targetTaskId !== null) {
      connectExisting(current.sourceTaskId, targetTaskId, current.kind);
      return;
    }
    createNext(current.sourceTaskId, current.kind);
  };

  for (const handle of canvas.querySelectorAll<HTMLButtonElement>('.cg-flow-handle')) {
    const card = handle.closest<HTMLElement>('.cg-board-task[data-task-id]');
    const sourceTaskId = card?.dataset.taskId;
    if (card === null || sourceTaskId === undefined) continue;

    const onPointerDown = (event: PointerEvent): void => {
      if (event.pointerType !== 'mouse' || event.button !== 0 || session !== null) return;
      event.preventDefault();
      event.stopPropagation();
      const preview = document.createElementNS(SVG_NS, 'path');
      preview.setAttribute('class', 'cg-flow-preview');
      preview.hidden = true;
      flowLayer.append(preview);
      session = {
        pointerId: event.pointerId,
        sourceTaskId,
        sourceCard: card,
        handle,
        startX: event.clientX,
        startY: event.clientY,
        kind: resolveKind(sourceTaskId),
        preview,
        moved: false,
        target: null,
      };
      handle.setPointerCapture(event.pointerId);
    };
    const onPointerMove = (event: PointerEvent): void => update(event);
    const onPointerUp = (event: PointerEvent): void => finish(event, false);
    const onPointerCancel = (event: PointerEvent): void => finish(event, true);
    handle.addEventListener('pointerdown', onPointerDown);
    handle.addEventListener('pointermove', onPointerMove);
    handle.addEventListener('pointerup', onPointerUp);
    handle.addEventListener('pointercancel', onPointerCancel);
    cleanups.push(() => {
      handle.removeEventListener('pointerdown', onPointerDown);
      handle.removeEventListener('pointermove', onPointerMove);
      handle.removeEventListener('pointerup', onPointerUp);
      handle.removeEventListener('pointercancel', onPointerCancel);
    });
  }

  return () => {
    clearTarget();
    if (session !== null) {
      session.preview.remove();
      delete session.sourceCard.dataset.connecting;
      session = null;
    }
    for (const cleanup of cleanups) cleanup();
  };
}
