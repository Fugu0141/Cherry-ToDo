import type { CherryPoint } from '../../../ui-contract/index';
import type { InteractionCoordinator } from './interaction-coordinator';

export interface AnnotationDrawingOptions {
  readonly canvas: HTMLElement;
  readonly coordinator: InteractionCoordinator;
  readonly enabled: () => boolean;
  readonly commitStroke: (points: readonly CherryPoint[]) => void;
}

function canvasPoint(canvas: HTMLElement, event: PointerEvent): CherryPoint {
  const rect = canvas.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

function isAnnotationControl(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest('.cherry-annotation, button, input, textarea, select, a') !== null;
}

export function installAnnotationDrawing(options: AnnotationDrawingOptions): () => void {
  const { canvas, coordinator, enabled, commitStroke } = options;
  let pointerId: number | null = null;
  let points: CherryPoint[] = [];
  let preview: SVGPolylineElement | null = null;
  let lastAcceptedAt = 0;

  const updatePreview = (): void => {
    if (preview === null) return;
    preview.setAttribute('points', points.map((point) => `${point.x},${point.y}`).join(' '));
  };

  const finish = (event: PointerEvent, cancelled: boolean): void => {
    if (pointerId !== event.pointerId) return;
    coordinator.updatePointer(event.pointerId, { x: event.clientX, y: event.clientY });
    coordinator.endPointer(event.pointerId);
    preview?.remove();
    preview = null;
    pointerId = null;
    const finished = points;
    points = [];
    if (!cancelled && finished.length >= 2) commitStroke(finished);
  };

  const onPointerDown = (event: PointerEvent): void => {
    if (!enabled() || isAnnotationControl(event.target)) return;
    if (
      !coordinator.beginPointer({
        kind: 'drawing-stroke',
        pointerId: event.pointerId,
        point: { x: event.clientX, y: event.clientY },
      })
    ) {
      return;
    }
    event.preventDefault();
    pointerId = event.pointerId;
    points = [canvasPoint(canvas, event)];
    lastAcceptedAt = event.timeStamp;
    preview = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    preview.setAttribute('class', 'cherry-annotation-stroke-preview');
    preview.setAttribute('fill', 'none');
    preview.setAttribute('aria-hidden', 'true');
    const svg = canvas.querySelector<SVGSVGElement>('.cherry-annotation-stroke-layer');
    svg?.append(preview);
    canvas.setPointerCapture(event.pointerId);
    updatePreview();
  };

  const onPointerMove = (event: PointerEvent): void => {
    if (pointerId !== event.pointerId || !coordinator.ownsPointer(event.pointerId, 'drawing-stroke')) return;
    event.preventDefault();
    coordinator.updatePointer(event.pointerId, { x: event.clientX, y: event.clientY });
    const point = canvasPoint(canvas, event);
    const previous = points[points.length - 1];
    const dx = previous === undefined ? Number.POSITIVE_INFINITY : point.x - previous.x;
    const dy = previous === undefined ? Number.POSITIVE_INFINITY : point.y - previous.y;
    const farEnough = dx * dx + dy * dy >= 4;
    const enoughTime = event.timeStamp - lastAcceptedAt >= 8;
    if (!farEnough && !enoughTime) return;
    points.push(point);
    lastAcceptedAt = event.timeStamp;
    updatePreview();
  };

  const onPointerUp = (event: PointerEvent): void => finish(event, false);
  const onPointerCancel = (event: PointerEvent): void => finish(event, true);

  canvas.addEventListener('pointerdown', onPointerDown, { capture: true });
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerCancel);

  return () => {
    if (pointerId !== null) coordinator.cancel();
    preview?.remove();
    canvas.removeEventListener('pointerdown', onPointerDown, { capture: true });
    canvas.removeEventListener('pointermove', onPointerMove);
    canvas.removeEventListener('pointerup', onPointerUp);
    canvas.removeEventListener('pointercancel', onPointerCancel);
  };
}
