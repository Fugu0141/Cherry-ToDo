import type { WorkspaceScreenModel } from '../../../ui-contract/index';

export interface MobileFlowMapOptions {
  readonly scroll: HTMLElement;
  readonly canvas: HTMLElement;
  readonly workspace: WorkspaceScreenModel;
  readonly selectedTaskId: () => string | null;
}

const SVG_NS = 'http://www.w3.org/2000/svg';
const WIDTH = 132;
const HEIGHT = 168;
const SCALE_X = 0.085;
const SCALE_Y = 0.11;
const MOBILE_QUERY = '(max-width: 900px)';

function svg<K extends keyof SVGElementTagNameMap>(tag: K): SVGElementTagNameMap[K] {
  return document.createElementNS(SVG_NS, tag);
}

export function installMobileFlowMap(options: MobileFlowMapOptions): () => void {
  const { scroll, workspace, selectedTaskId } = options;
  const media = window.matchMedia(MOBILE_QUERY);
  const map = document.createElement('div');
  map.className = 'cg-flow-map';
  map.setAttribute('role', 'button');
  map.setAttribute('tabindex', '0');
  map.setAttribute('aria-label', 'Flow Map');

  const label = document.createElement('span');
  label.className = 'cg-flow-map-label';
  label.textContent = 'FLOW';
  const graphic = svg('svg');
  graphic.setAttribute('viewBox', `0 0 ${WIDTH} ${HEIGHT}`);
  graphic.setAttribute('aria-hidden', 'true');
  map.append(label, graphic);
  document.body.append(map);

  let activePointer: number | null = null;
  let fadeTimer: number | null = null;
  let frame: number | null = null;

  const camera = () => ({
    x: scroll.scrollLeft + scroll.clientWidth / 2,
    y: scroll.scrollTop + scroll.clientHeight / 2,
  });

  const toMap = (x: number, y: number) => {
    const current = camera();
    return {
      x: WIDTH / 2 + (x - current.x) * SCALE_X,
      y: HEIGHT / 2 + (y - current.y) * SCALE_Y,
    };
  };

  const taskCenter = (taskId: string) => {
    const task = workspace.tasks.find((candidate) => candidate.id === taskId);
    if (task?.position === null || task?.position === undefined) return null;
    return { x: task.position.x + 115, y: task.position.y + 46 };
  };

  const wake = (): void => {
    map.dataset.active = 'true';
    if (fadeTimer !== null) window.clearTimeout(fadeTimer);
    fadeTimer = window.setTimeout(() => {
      if (activePointer === null) map.dataset.active = 'false';
    }, 1400);
  };

  const renderNow = (): void => {
    frame = null;
    const visible = media.matches && workspace.tasks.length > 0;
    map.hidden = !visible;
    if (!visible) return;
    graphic.replaceChildren();

    for (const edge of workspace.connections) {
      if (edge.kind === 'reference') continue;
      const fromWorld = taskCenter(edge.fromTaskId);
      const toWorld = taskCenter(edge.toTaskId);
      if (fromWorld === null || toWorld === null) continue;
      const from = toMap(fromWorld.x, fromWorld.y);
      const to = toMap(toWorld.x, toWorld.y);
      const line = svg('path');
      const mid = (from.y + to.y) / 2;
      line.setAttribute(
        'd',
        `M ${from.x} ${from.y} L ${from.x} ${mid} L ${to.x} ${mid} L ${to.x} ${to.y}`,
      );
      line.setAttribute(
        'class',
        edge.kind === 'branch' ? 'cg-flow-map-edge branch' : 'cg-flow-map-edge',
      );
      graphic.append(line);
    }

    const selected = selectedTaskId();
    for (const task of workspace.tasks) {
      if (task.position === null) continue;
      const point = toMap(task.position.x + 115, task.position.y + 46);
      if (point.x < -8 || point.x > WIDTH + 8 || point.y < -8 || point.y > HEIGHT + 8) continue;
      const node = svg('rect');
      node.setAttribute('x', String(point.x - 3.5));
      node.setAttribute('y', String(point.y - 3.5));
      node.setAttribute('width', '7');
      node.setAttribute('height', '7');
      node.setAttribute('rx', '2.5');
      node.setAttribute(
        'class',
        `cg-flow-map-node${task.status === 'done' ? ' done' : ''}${task.id === selected ? ' selected' : ''}`,
      );
      graphic.append(node);
    }

    const viewport = svg('rect');
    viewport.setAttribute('x', String(WIDTH / 2 - (scroll.clientWidth * SCALE_X) / 2));
    viewport.setAttribute('y', String(HEIGHT / 2 - (scroll.clientHeight * SCALE_Y) / 2));
    viewport.setAttribute('width', String(Math.max(12, scroll.clientWidth * SCALE_X)));
    viewport.setAttribute('height', String(Math.max(12, scroll.clientHeight * SCALE_Y)));
    viewport.setAttribute('class', 'cg-flow-map-viewport');
    graphic.append(viewport);
  };

  const scheduleRender = (): void => {
    if (frame !== null) return;
    frame = window.requestAnimationFrame(renderNow);
  };

  const moveFromPointer = (event: PointerEvent): void => {
    const rect = graphic.getBoundingClientRect();
    const localX = ((event.clientX - rect.left) / rect.width) * WIDTH;
    const localY = ((event.clientY - rect.top) / rect.height) * HEIGHT;
    const current = camera();
    const worldX = current.x + (localX - WIDTH / 2) / SCALE_X;
    const worldY = current.y + (localY - HEIGHT / 2) / SCALE_Y;
    scroll.scrollTo({
      left: Math.max(0, worldX - scroll.clientWidth / 2),
      top: Math.max(0, worldY - scroll.clientHeight / 2),
      behavior: 'auto',
    });
    wake();
    scheduleRender();
  };

  const pointerDown = (event: PointerEvent): void => {
    if (!media.matches) return;
    event.preventDefault();
    event.stopPropagation();
    activePointer = event.pointerId;
    map.setPointerCapture(event.pointerId);
    moveFromPointer(event);
  };
  const pointerMove = (event: PointerEvent): void => {
    if (activePointer !== event.pointerId) return;
    event.preventDefault();
    moveFromPointer(event);
  };
  const pointerEnd = (event: PointerEvent): void => {
    if (activePointer !== event.pointerId) return;
    activePointer = null;
    try {
      map.releasePointerCapture(event.pointerId);
    } catch {
      // Pointer capture may already have ended.
    }
    wake();
  };
  const keyDown = (event: KeyboardEvent): void => {
    const step = 120;
    if (event.key === 'ArrowUp') scroll.scrollTop -= step;
    else if (event.key === 'ArrowDown') scroll.scrollTop += step;
    else if (event.key === 'ArrowLeft') scroll.scrollLeft -= step;
    else if (event.key === 'ArrowRight') scroll.scrollLeft += step;
    else return;
    event.preventDefault();
    wake();
    scheduleRender();
  };

  const onScroll = (): void => {
    wake();
    scheduleRender();
  };
  const onMedia = (): void => scheduleRender();
  map.addEventListener('pointerdown', pointerDown);
  map.addEventListener('pointermove', pointerMove);
  map.addEventListener('pointerup', pointerEnd);
  map.addEventListener('pointercancel', pointerEnd);
  map.addEventListener('keydown', keyDown);
  scroll.addEventListener('scroll', onScroll, { passive: true });
  media.addEventListener('change', onMedia);
  map.dataset.active = 'false';
  renderNow();

  return () => {
    if (fadeTimer !== null) window.clearTimeout(fadeTimer);
    if (frame !== null) window.cancelAnimationFrame(frame);
    scroll.removeEventListener('scroll', onScroll);
    media.removeEventListener('change', onMedia);
    map.remove();
  };
}
