import type { CherryBoardDropTarget, WorkspaceScreenModel } from '../../../ui-contract/index';
import { resolveEdgeAutoScroll } from './edge-auto-scroll';
import {
  interactionDistanceSquared,
  type InteractionCoordinator,
  type InteractionPoint,
} from './interaction-coordinator';

const DRAG_THRESHOLD_SQUARED = 36;

export type MobileInteractionStart = 'none' | 'panning' | 'dragging-task';

export function resolveMobileInteractionStart(input: {
  readonly overTask: boolean;
  readonly overInteractiveControl: boolean;
  readonly overAnnotation?: boolean;
}): MobileInteractionStart {
  if (input.overInteractiveControl || input.overAnnotation === true) return 'none';
  return input.overTask ? 'dragging-task' : 'panning';
}

export interface MobileBoardInteractionOptions {
  readonly scroll: HTMLElement;
  readonly canvas: HTMLElement;
  readonly workspace: WorkspaceScreenModel;
  readonly collapsedLaneIds: ReadonlySet<string>;
  readonly coordinator: InteractionCoordinator;
  readonly dropTask: (taskId: string, target: CherryBoardDropTarget) => void;
}

interface DragSession {
  readonly pointerId: number;
  readonly taskId: string;
  readonly card: HTMLElement;
  readonly originalLeft: string;
  readonly originalTop: string;
  readonly grabOffset: InteractionPoint;
  readonly originPointer: InteractionPoint;
  latestPointer: InteractionPoint;
  moved: boolean;
  frame: number | null;
}

interface PanSession {
  readonly pointerId: number;
  readonly startScrollLeft: number;
  readonly startScrollTop: number;
}

function isTouchLike(event: PointerEvent): boolean {
  return event.pointerType === 'touch' || event.pointerType === 'pen';
}

function isInteractiveControl(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    target.closest('button, input, textarea, select, a, [role="button"]') !== null
  );
}

function pointInRect(point: InteractionPoint, rect: DOMRect): boolean {
  return (
    point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom
  );
}

function parsePosition(value: string, fallback: number): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function installMobileBoardInteraction(options: MobileBoardInteractionOptions): () => void {
  const { scroll, canvas, workspace, collapsedLaneIds, coordinator, dropTask } = options;
  let drag: DragSession | null = null;
  let pan: PanSession | null = null;
  const cleanups: Array<() => void> = [];

  const on = <K extends keyof HTMLElementEventMap>(
    element: HTMLElement,
    type: K,
    listener: (event: HTMLElementEventMap[K]) => void,
  ): void => {
    element.addEventListener(type, listener as EventListener);
    cleanups.push(() => element.removeEventListener(type, listener as EventListener));
  };

  const restoreCard = (session: DragSession): void => {
    session.card.style.left = session.originalLeft;
    session.card.style.top = session.originalTop;
    session.card.classList.remove('dragging', 'touch-dragging');
  };

  const laneTargetAt = (
    point: InteractionPoint,
    preview: InteractionPoint,
  ): CherryBoardDropTarget => {
    for (const laneNode of canvas.querySelectorAll<HTMLElement>('.cherry-date-lane, .cg-lane')) {
      const rect = laneNode.getBoundingClientRect();
      if (!pointInRect(point, rect)) continue;
      const laneId = laneNode.dataset.laneId;
      const lane = workspace.board.lanes.find((candidate) => candidate.id === laneId);
      if (lane === undefined) break;
      const collapsed = collapsedLaneIds.has(lane.id);
      return {
        kind: 'date-lane',
        date: lane.date,
        point: {
          x: preview.x,
          y: collapsed ? 0 : Math.max(0, point.y - rect.top - 68),
        },
        collapsed,
      };
    }
    return { kind: 'canvas', point: preview };
  };

  const scheduleDragFrame = (): void => {
    const session = drag;
    if (session === null || session.frame !== null) return;
    session.frame = window.requestAnimationFrame(() => {
      const current = drag;
      if (current === null) return;
      current.frame = null;
      if (!coordinator.ownsPointer(current.pointerId, 'dragging-task')) return;

      coordinator.updatePointer(current.pointerId, current.latestPointer);
      if (
        !current.moved &&
        interactionDistanceSquared(coordinator.state) >= DRAG_THRESHOLD_SQUARED
      ) {
        current.moved = true;
        current.card.classList.add('dragging', 'touch-dragging');
      }
      if (!current.moved) return;

      const canvasRect = canvas.getBoundingClientRect();
      const viewport = scroll.getBoundingClientRect();
      const preview = {
        x: current.latestPointer.x - canvasRect.left - current.grabOffset.x,
        y: current.latestPointer.y - canvasRect.top - current.grabOffset.y,
      };
      const autoScroll = resolveEdgeAutoScroll({
        pointer: current.latestPointer,
        preview,
        viewport,
        scroll: {
          left: scroll.scrollLeft,
          top: scroll.scrollTop,
          maxLeft: Math.max(0, scroll.scrollWidth - scroll.clientWidth),
          maxTop: Math.max(0, scroll.scrollHeight - scroll.clientHeight),
        },
      });

      scroll.scrollLeft = autoScroll.nextScroll.left;
      scroll.scrollTop = autoScroll.nextScroll.top;
      current.card.style.left = `${autoScroll.nextPreview.x}px`;
      current.card.style.top = `${autoScroll.nextPreview.y}px`;

      if (autoScroll.delta.x !== 0 || autoScroll.delta.y !== 0) scheduleDragFrame();
    });
  };

  for (const card of canvas.querySelectorAll<HTMLElement>('.cherry-board-task, .cg-board-task')) {
    const taskId = card.dataset.taskId;
    if (taskId === undefined) continue;

    on(card, 'pointerdown', (event) => {
      if (!isTouchLike(event)) return;
      const owner = resolveMobileInteractionStart({
        overTask: true,
        overInteractiveControl: isInteractiveControl(event.target),
      });
      if (owner !== 'dragging-task') return;
      if (
        !coordinator.beginPointer({
          kind: 'dragging-task',
          pointerId: event.pointerId,
          point: { x: event.clientX, y: event.clientY },
          subjectId: taskId,
        })
      ) {
        return;
      }

      const cardRect = card.getBoundingClientRect();
      drag = {
        pointerId: event.pointerId,
        taskId,
        card,
        originalLeft: card.style.left,
        originalTop: card.style.top,
        grabOffset: { x: event.clientX - cardRect.left, y: event.clientY - cardRect.top },
        originPointer: { x: event.clientX, y: event.clientY },
        latestPointer: { x: event.clientX, y: event.clientY },
        moved: false,
        frame: null,
      };
      card.setPointerCapture(event.pointerId);
    });

    on(card, 'pointermove', (event) => {
      const current = drag;
      if (current === null || current.pointerId !== event.pointerId) return;
      if (!coordinator.ownsPointer(event.pointerId, 'dragging-task')) return;
      event.preventDefault();
      current.latestPointer = { x: event.clientX, y: event.clientY };
      scheduleDragFrame();
    });

    const finishDrag = (event: PointerEvent, cancelled: boolean): void => {
      const current = drag;
      if (current === null || current.pointerId !== event.pointerId) return;
      if (current.frame !== null) window.cancelAnimationFrame(current.frame);
      current.latestPointer = { x: event.clientX, y: event.clientY };
      coordinator.updatePointer(event.pointerId, current.latestPointer);
      coordinator.endPointer(event.pointerId);

      const dx = current.latestPointer.x - current.originPointer.x;
      const dy = current.latestPointer.y - current.originPointer.y;
      const moved = current.moved || dx * dx + dy * dy >= DRAG_THRESHOLD_SQUARED;
      const preview = {
        x: parsePosition(
          current.card.style.left,
          workspace.tasks.find((task) => task.id === current.taskId)?.position?.x ?? 0,
        ),
        y: parsePosition(
          current.card.style.top,
          workspace.tasks.find((task) => task.id === current.taskId)?.position?.y ?? 0,
        ),
      };
      restoreCard(current);
      drag = null;

      if (!cancelled && moved) {
        dropTask(current.taskId, laneTargetAt(current.latestPointer, preview));
      }
    };

    on(card, 'pointerup', (event) => finishDrag(event, false));
    on(card, 'pointercancel', (event) => finishDrag(event, true));
  }

  on(scroll, 'pointerdown', (event) => {
    if (!isTouchLike(event)) return;
    const target = event.target;
    const overTask =
      target instanceof Element && target.closest('.cherry-board-task, .cg-board-task') !== null;
    const overAnnotation =
      target instanceof Element && target.closest('.cherry-annotation') !== null;
    const owner = resolveMobileInteractionStart({
      overTask,
      overInteractiveControl: isInteractiveControl(target),
      overAnnotation,
    });
    if (owner !== 'panning') return;
    if (
      !coordinator.beginPointer({
        kind: 'panning',
        pointerId: event.pointerId,
        point: { x: event.clientX, y: event.clientY },
      })
    ) {
      return;
    }
    pan = {
      pointerId: event.pointerId,
      startScrollLeft: scroll.scrollLeft,
      startScrollTop: scroll.scrollTop,
    };
    scroll.setPointerCapture(event.pointerId);
  });

  on(scroll, 'pointermove', (event) => {
    const current = pan;
    if (current === null || current.pointerId !== event.pointerId) return;
    const state = coordinator.updatePointer(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    if (state === null || state.kind !== 'panning') return;
    event.preventDefault();
    scroll.scrollLeft = current.startScrollLeft - (state.current.x - state.origin.x);
    scroll.scrollTop = current.startScrollTop - (state.current.y - state.origin.y);
  });

  const finishPan = (event: PointerEvent): void => {
    if (pan === null || pan.pointerId !== event.pointerId) return;
    coordinator.endPointer(event.pointerId);
    pan = null;
  };
  on(scroll, 'pointerup', finishPan);
  on(scroll, 'pointercancel', finishPan);

  return () => {
    const activeDrag = drag;
    if (activeDrag !== null && activeDrag.frame !== null) {
      window.cancelAnimationFrame(activeDrag.frame);
    }
    if (activeDrag !== null) restoreCard(activeDrag);
    const state = coordinator.state;
    if (state.kind === 'dragging-task' || state.kind === 'panning') coordinator.cancel();
    drag = null;
    pan = null;
    for (const cleanup of cleanups) cleanup();
  };
}
