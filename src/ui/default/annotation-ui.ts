import type {
  AnnotationModel,
  CherryUIContext,
  StrokeAnnotationModel,
  TextAnnotationModel,
  UIActionResult,
  WorkspaceScreenModel,
} from '../../ui-contract/index';

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className !== undefined) node.className = className;
  return node;
}

function button(label: string, action: () => void, className = 'cherry-button'): HTMLButtonElement {
  const node = element('button', className);
  node.type = 'button';
  node.textContent = label;
  node.addEventListener('click', action);
  return node;
}

function translated(points: readonly { readonly x: number; readonly y: number }[], dx: number, dy: number) {
  return points.map((point) => ({ x: point.x + dx, y: point.y + dy }));
}

function scaled(points: readonly { readonly x: number; readonly y: number }[], factor: number) {
  if (points.length === 0) return [];
  const minX = Math.min(...points.map((point) => point.x));
  const minY = Math.min(...points.map((point) => point.y));
  return points.map((point) => ({
    x: minX + (point.x - minX) * factor,
    y: minY + (point.y - minY) * factor,
  }));
}

function textControls(
  context: CherryUIContext,
  annotation: TextAnnotationModel,
  run: (promise: Promise<UIActionResult>) => void,
): HTMLElement {
  const row = element('section', 'cherry-annotation-control-row');
  const text = element('textarea', 'cherry-textarea cherry-annotation-text-input');
  text.value = annotation.text;
  text.setAttribute('aria-label', context.i18n.t('annotation.text'));
  text.addEventListener('change', () => {
    run(context.intents.annotation.updateText({ annotationId: annotation.id, text: text.value }));
  });

  const style = element('select', 'cherry-select');
  for (const value of ['note', 'accent', 'muted']) {
    const option = element('option');
    option.value = value;
    option.textContent = value;
    style.append(option);
  }
  style.value = annotation.styleToken;
  style.setAttribute('aria-label', context.i18n.t('annotation.style'));
  style.addEventListener('change', () => {
    run(
      context.intents.annotation.updateText({
        annotationId: annotation.id,
        styleToken: style.value,
      }),
    );
  });

  const movement = element('div', 'cherry-annotation-transform');
  const move = (dx: number, dy: number) =>
    run(
      context.intents.annotation.updateText({
        annotationId: annotation.id,
        rect: { ...annotation.rect, x: annotation.rect.x + dx, y: annotation.rect.y + dy },
      }),
    );
  movement.append(
    button('←', () => move(-20, 0), 'cherry-icon-button'),
    button('↑', () => move(0, -20), 'cherry-icon-button'),
    button('↓', () => move(0, 20), 'cherry-icon-button'),
    button('→', () => move(20, 0), 'cherry-icon-button'),
    button('−', () => {
      run(
        context.intents.annotation.updateText({
          annotationId: annotation.id,
          rect: {
            ...annotation.rect,
            width: Math.max(80, annotation.rect.width * 0.9),
            height: Math.max(48, annotation.rect.height * 0.9),
          },
        }),
      );
    }, 'cherry-icon-button'),
    button('+', () => {
      run(
        context.intents.annotation.updateText({
          annotationId: annotation.id,
          rect: {
            ...annotation.rect,
            width: annotation.rect.width * 1.1,
            height: annotation.rect.height * 1.1,
          },
        }),
      );
    }, 'cherry-icon-button'),
  );

  const remove = button(
    context.i18n.t('annotation.delete'),
    () => run(context.intents.annotation.delete(annotation.id)),
    'cherry-button danger ghost',
  );
  row.append(text, style, movement, remove);
  return row;
}

function strokeControls(
  context: CherryUIContext,
  annotation: StrokeAnnotationModel,
  run: (promise: Promise<UIActionResult>) => void,
): HTMLElement {
  const row = element('section', 'cherry-annotation-control-row');
  const label = element('strong');
  label.textContent = context.i18n.t('annotation.stroke');

  const style = element('select', 'cherry-select');
  for (const value of ['ink', 'accent', 'muted']) {
    const option = element('option');
    option.value = value;
    option.textContent = value;
    style.append(option);
  }
  style.value = annotation.styleToken;
  style.setAttribute('aria-label', context.i18n.t('annotation.style'));
  style.addEventListener('change', () => {
    run(
      context.intents.annotation.updateStroke({
        annotationId: annotation.id,
        styleToken: style.value,
      }),
    );
  });

  const width = element('select', 'cherry-select');
  for (const value of ['thin', 'medium', 'thick']) {
    const option = element('option');
    option.value = value;
    option.textContent = value;
    width.append(option);
  }
  width.value = annotation.widthToken;
  width.setAttribute('aria-label', context.i18n.t('annotation.width'));
  width.addEventListener('change', () => {
    run(
      context.intents.annotation.updateStroke({
        annotationId: annotation.id,
        widthToken: width.value,
      }),
    );
  });

  const movement = element('div', 'cherry-annotation-transform');
  const move = (dx: number, dy: number) =>
    run(
      context.intents.annotation.updateStroke({
        annotationId: annotation.id,
        points: translated(annotation.points, dx, dy),
      }),
    );
  movement.append(
    button('←', () => move(-20, 0), 'cherry-icon-button'),
    button('↑', () => move(0, -20), 'cherry-icon-button'),
    button('↓', () => move(0, 20), 'cherry-icon-button'),
    button('→', () => move(20, 0), 'cherry-icon-button'),
    button('−', () => {
      run(
        context.intents.annotation.updateStroke({
          annotationId: annotation.id,
          points: scaled(annotation.points, 0.9),
        }),
      );
    }, 'cherry-icon-button'),
    button('+', () => {
      run(
        context.intents.annotation.updateStroke({
          annotationId: annotation.id,
          points: scaled(annotation.points, 1.1),
        }),
      );
    }, 'cherry-icon-button'),
  );

  const remove = button(
    context.i18n.t('annotation.delete'),
    () => run(context.intents.annotation.delete(annotation.id)),
    'cherry-button danger ghost',
  );
  row.append(label, style, width, movement, remove);
  return row;
}

export function renderAnnotationLayers(
  workspace: WorkspaceScreenModel,
  canvasWidth: number,
  canvasHeight: number,
): readonly Node[] {
  const strokeLayer = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  strokeLayer.setAttribute('class', 'cherry-annotation-stroke-layer');
  strokeLayer.setAttribute('viewBox', `0 0 ${canvasWidth} ${canvasHeight}`);
  strokeLayer.setAttribute('aria-hidden', 'true');

  const nodes: Node[] = [strokeLayer];
  for (const annotation of workspace.annotations) {
    if (annotation.kind === 'stroke') {
      const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
      polyline.setAttribute('class', 'cherry-annotation-stroke');
      polyline.setAttribute('fill', 'none');
      polyline.dataset.styleToken = annotation.styleToken;
      polyline.dataset.widthToken = annotation.widthToken;
      polyline.setAttribute(
        'points',
        annotation.points.map((point) => `${point.x},${point.y}`).join(' '),
      );
      strokeLayer.append(polyline);
      continue;
    }

    const text = element('aside', 'cherry-annotation cherry-text-annotation');
    text.dataset.annotationId = annotation.id;
    text.dataset.styleToken = annotation.styleToken;
    text.style.left = `${annotation.rect.x}px`;
    text.style.top = `${annotation.rect.y}px`;
    text.style.width = `${annotation.rect.width}px`;
    text.style.height = `${annotation.rect.height}px`;
    text.textContent = annotation.text;
    nodes.push(text);
  }
  return nodes;
}

export function renderAnnotationTools(input: {
  readonly context: CherryUIContext;
  readonly workspace: WorkspaceScreenModel;
  readonly drawingEnabled: boolean;
  readonly setDrawingEnabled: (enabled: boolean) => void;
  readonly run: (promise: Promise<UIActionResult>) => void;
}): HTMLElement {
  const { context, workspace, drawingEnabled, setDrawingEnabled, run } = input;
  const tools = element('section', 'cherry-annotation-tools');
  const primary = element('div', 'cherry-annotation-tool-actions');
  const freehand = button(context.i18n.t('annotation.freehand'), () => {
    run(
      context.intents.workspace.setBoardSettings({
        ...workspace.board.settings,
        showDateLanes: false,
        autoLayout: false,
      }),
    );
  });
  const addText = button(context.i18n.t('annotation.addText'), () => {
    const offset = workspace.annotations.length * 18;
    run(
      context.intents.annotation.createText({
        rect: { x: 72 + offset, y: 72 + offset, width: 220, height: 100 },
        text: context.i18n.t('annotation.newText'),
        styleToken: 'note',
      }),
    );
  });
  const draw = button(
    drawingEnabled ? context.i18n.t('annotation.stopDrawing') : context.i18n.t('annotation.draw'),
    () => setDrawingEnabled(!drawingEnabled),
    drawingEnabled ? 'cherry-button active' : 'cherry-button',
  );
  draw.setAttribute('aria-pressed', String(drawingEnabled));
  primary.append(freehand, addText, draw);
  tools.append(primary);

  if (workspace.annotations.length > 0) {
    const list = element('details', 'cherry-annotation-list');
    const summary = element('summary');
    summary.textContent = `${context.i18n.t('annotation.manage')} (${workspace.annotations.length})`;
    list.append(summary);
    for (const annotation of workspace.annotations) {
      list.append(
        annotation.kind === 'text'
          ? textControls(context, annotation, run)
          : strokeControls(context, annotation, run),
      );
    }
    tools.append(list);
  }
  return tools;
}

export function annotationExtent(annotation: AnnotationModel): { readonly x: number; readonly y: number } {
  if (annotation.kind === 'text') {
    return { x: annotation.rect.x + annotation.rect.width, y: annotation.rect.y + annotation.rect.height };
  }
  return {
    x: Math.max(0, ...annotation.points.map((point) => point.x)),
    y: Math.max(0, ...annotation.points.map((point) => point.y)),
  };
}
