from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f'{label} target not found')
    return text.replace(old, new, 1)


p = Path('src/ui/default/index.ts')
s = p.read_text()
s = replace_once(
    s,
    """} from '../../ui-contract/index';
import {
  beginMobileConnection,""",
    """} from '../../ui-contract/index';
import { renderAnnotationLayers, renderAnnotationTools } from './annotation-ui';
import { installAnnotationDrawing } from './interaction/annotation-drawing';
import {
  beginMobileConnection,""",
    'annotation UI imports',
)
s = replace_once(
    s,
    """  interactionCoordinator: InteractionCoordinator,
  registerInteractionCleanup: (cleanup: () => void) => void,
): HTMLElement {
  const scroll = element('main', 'cherry-board-scroll');
  const canvas = element('section', 'cherry-board-canvas');
  canvas.style.minWidth = `${Math.max(workspace.board.width, 760)}px`;
  canvas.style.minHeight = `${Math.max(workspace.board.height, 520)}px`;
  canvas.dataset.timeGuide = workspace.board.settings.timeGuide;""",
    """  interactionCoordinator: InteractionCoordinator,
  registerInteractionCleanup: (cleanup: () => void) => void,
  drawingEnabled: boolean,
): HTMLElement {
  const scroll = element('main', 'cherry-board-scroll');
  const canvas = element('section', 'cherry-board-canvas');
  const canvasWidth = Math.max(workspace.board.width, 760);
  const canvasHeight = Math.max(workspace.board.height, 520);
  canvas.style.minWidth = `${canvasWidth}px`;
  canvas.style.minHeight = `${canvasHeight}px`;
  canvas.dataset.timeGuide = workspace.board.settings.timeGuide;
  canvas.dataset.drawing = String(drawingEnabled);""",
    'renderBoard drawing signature',
)
s = replace_once(
    s,
    """    `0 0 ${Math.max(workspace.board.width, 760)} ${Math.max(workspace.board.height, 520)}`,
  );""",
    """    `0 0 ${canvasWidth} ${canvasHeight}`,
  );""",
    'flow layer dimensions',
)
s = replace_once(
    s,
    """  canvas.append(flowLayer);

  const droppedTaskId =""",
    """  canvas.append(flowLayer);
  for (const annotationNode of renderAnnotationLayers(workspace, canvasWidth, canvasHeight)) {
    canvas.append(annotationNode);
  }

  const droppedTaskId =""",
    'annotation layers',
)
s = replace_once(
    s,
    """    card.classList.add('cherry-board-task');
    card.draggable = true;""",
    """    card.classList.add('cherry-board-task');
    card.draggable = !drawingEnabled;""",
    'disable native task drag while drawing',
)
old_tail = """  registerInteractionCleanup(
    installMobileBoardInteraction({
      scroll,
      canvas,
      workspace,
      collapsedLaneIds,
      coordinator: interactionCoordinator,
      dropTask: (taskId, target) => {
        void perform(context, context.intents.board.dropTask({ taskId, target }));
      },
    }),
  );

  scroll.append(canvas);"""
new_tail = """  const drawingCleanup = installAnnotationDrawing({
    canvas,
    coordinator: interactionCoordinator,
    enabled: () => drawingEnabled,
    commitStroke: (points) => {
      void perform(
        context,
        context.intents.annotation.createStroke({
          points,
          widthToken: 'medium',
          styleToken: 'ink',
        }),
      );
    },
  });
  const mobileCleanup = installMobileBoardInteraction({
    scroll,
    canvas,
    workspace,
    collapsedLaneIds,
    coordinator: interactionCoordinator,
    dropTask: (taskId, target) => {
      void perform(context, context.intents.board.dropTask({ taskId, target }));
    },
  });
  registerInteractionCleanup(() => {
    drawingCleanup();
    mobileCleanup();
  });

  scroll.append(canvas);"""
s = replace_once(s, old_tail, new_tail, 'drawing/mobile cleanup composition')
s = replace_once(
    s,
    """  interactionCoordinator: InteractionCoordinator,
  registerInteractionCleanup: (cleanup: () => void) => void,
): void {
  const header =""",
    """  interactionCoordinator: InteractionCoordinator,
  registerInteractionCleanup: (cleanup: () => void) => void,
  drawingEnabled: boolean,
  setDrawingEnabled: (enabled: boolean) => void,
): void {
  const header =""",
    'renderWorkspace drawing signature',
)
s = replace_once(
    s,
    """    settings.append(timeGuide.wrap);
    toolbar.append(settings);
  }

  const content =""",
    """    settings.append(timeGuide.wrap);
    toolbar.append(settings);
    toolbar.append(
      renderAnnotationTools({
        context,
        workspace,
        drawingEnabled,
        setDrawingEnabled,
        run: (promise) => {
          void perform(context, promise);
        },
      }),
    );
  }

  const content =""",
    'annotation toolbar',
)
s = replace_once(
    s,
    """          interactionCoordinator,
          registerInteractionCleanup,
        )
      : renderList(""",
    """          interactionCoordinator,
          registerInteractionCleanup,
          drawingEnabled,
        )
      : renderList(""",
    'renderBoard drawing arg',
)
s = replace_once(
    s,
    """    let connectionDraft: FlowConnectionDraft | null = null;
    let lastWorkspaceId: string | null = null;
    const collapsedLaneIds =""",
    """    let connectionDraft: FlowConnectionDraft | null = null;
    let drawingEnabled = false;
    let lastWorkspaceId: string | null = null;
    const collapsedLaneIds =""",
    'drawing mount state',
)
s = replace_once(
    s,
    """      if (lastWorkspaceId !== screen.workspace.workspaceId) {
        collapsedLaneIds.clear();
        connectionDraft = null;
        lastWorkspaceId = screen.workspace.workspaceId;
      }""",
    """      if (lastWorkspaceId !== screen.workspace.workspaceId) {
        collapsedLaneIds.clear();
        connectionDraft = null;
        drawingEnabled = false;
        lastWorkspaceId = screen.workspace.workspaceId;
      }""",
    'drawing workspace reset',
)
s = replace_once(
    s,
    """        (taskId, kind) => {
          const draft = beginMobileConnection(interactionCoordinator, taskId, kind);""",
    """        (taskId, kind) => {
          drawingEnabled = false;
          const draft = beginMobileConnection(interactionCoordinator, taskId, kind);""",
    'drawing connection conflict',
)
s = replace_once(
    s,
    """        (cleanup) => {
          boardInteractionCleanup = cleanup;
        },
      );""",
    """        (cleanup) => {
          boardInteractionCleanup = cleanup;
        },
        drawingEnabled,
        (enabled) => {
          cancelMobileConnection(interactionCoordinator);
          connectionDraft = null;
          interactionCoordinator.cancel();
          drawingEnabled = enabled;
          render();
        },
      );""",
    'renderWorkspace drawing callbacks',
)
s = replace_once(
    s,
    """      if (event.key !== 'Escape') return;
      if (selectedTaskId === null && connectionDraft === null) return;
      selectedTaskId = null;
      cancelMobileConnection(interactionCoordinator);
      connectionDraft = null;
      render();""",
    """      if (event.key !== 'Escape') return;
      if (selectedTaskId === null && connectionDraft === null && !drawingEnabled) return;
      selectedTaskId = null;
      cancelMobileConnection(interactionCoordinator);
      interactionCoordinator.cancel();
      connectionDraft = null;
      drawingEnabled = false;
      render();""",
    'Escape drawing cancel',
)
p.write_text(s)

# Do not let an annotation surface start mobile pan.
p = Path('src/ui/default/interaction/mobile-board-interaction.ts')
s = p.read_text()
s = replace_once(
    s,
    """export function resolveMobileInteractionStart(input: {
  readonly overTask: boolean;
  readonly overInteractiveControl: boolean;
}): MobileInteractionStart {
  if (input.overInteractiveControl) return 'none';""",
    """export function resolveMobileInteractionStart(input: {
  readonly overTask: boolean;
  readonly overInteractiveControl: boolean;
  readonly overAnnotation?: boolean;
}): MobileInteractionStart {
  if (input.overInteractiveControl || input.overAnnotation === true) return 'none';""",
    'annotation mobile ownership policy',
)
s = replace_once(
    s,
    """    const overTask = target instanceof Element && target.closest('.cherry-board-task') !== null;
    const owner = resolveMobileInteractionStart({
      overTask,
      overInteractiveControl: isInteractiveControl(target),
    });""",
    """    const overTask = target instanceof Element && target.closest('.cherry-board-task') !== null;
    const overAnnotation = target instanceof Element && target.closest('.cherry-annotation') !== null;
    const owner = resolveMobileInteractionStart({
      overTask,
      overInteractiveControl: isInteractiveControl(target),
      overAnnotation,
    });""",
    'annotation mobile pointer target',
)
p.write_text(s)

# Functional Phase 8 presentation. Visual polish is intentionally deferred.
p = Path('src/ui/default/styles.css')
s = p.read_text()
addition = r'''

/* Phase 8: freehand and annotations */
.cherry-annotation-tools {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  width: 100%;
  padding-top: 10px;
  border-top: 1px solid #e5e7eb;
}

.cherry-annotation-tool-actions,
.cherry-annotation-transform {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.cherry-button.active {
  color: #fff;
  background: #d83352;
}

.cherry-annotation-list {
  width: min(760px, 100%);
}

.cherry-annotation-list summary {
  cursor: pointer;
  font-weight: 700;
  color: #5e6670;
}

.cherry-annotation-control-row {
  display: grid;
  grid-template-columns: minmax(150px, 1fr) auto auto auto;
  align-items: center;
  gap: 8px;
  padding: 10px 0;
  border-top: 1px solid #e8eaed;
}

.cherry-annotation-text-input {
  min-height: 64px;
}

.cherry-annotation-stroke-layer {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 2;
  overflow: visible;
}

.cherry-annotation-stroke,
.cherry-annotation-stroke-preview {
  fill: none;
  stroke: #343a42;
  stroke-linecap: round;
  stroke-linejoin: round;
  vector-effect: non-scaling-stroke;
}

.cherry-annotation-stroke[data-style-token='accent'] { stroke: #d83352; }
.cherry-annotation-stroke[data-style-token='muted'] { stroke: #89919c; }
.cherry-annotation-stroke[data-width-token='thin'] { stroke-width: 2; }
.cherry-annotation-stroke[data-width-token='medium'] { stroke-width: 4; }
.cherry-annotation-stroke[data-width-token='thick'] { stroke-width: 7; }

.cherry-annotation-stroke-preview {
  stroke: #d83352;
  stroke-width: 3;
  opacity: .72;
}

.cherry-text-annotation {
  position: absolute;
  z-index: 3;
  overflow: auto;
  padding: 10px 12px;
  border: 1px solid rgba(92, 97, 105, .24);
  border-radius: 10px;
  background: rgba(255, 252, 222, .94);
  box-shadow: 0 4px 14px rgba(25, 29, 36, .06);
  white-space: pre-wrap;
  pointer-events: auto;
}

.cherry-text-annotation[data-style-token='accent'] {
  border-color: rgba(216, 51, 82, .35);
  background: rgba(255, 238, 242, .94);
}

.cherry-text-annotation[data-style-token='muted'] {
  background: rgba(239, 241, 244, .94);
  color: #5e6670;
}

.cherry-board-canvas[data-drawing='true'] {
  cursor: crosshair;
}

.cherry-board-canvas[data-drawing='true'] .cherry-board-task,
.cherry-board-canvas[data-drawing='true'] .cherry-date-lane {
  pointer-events: none;
}

@media (max-width: 680px), (pointer: coarse) {
  .cherry-annotation-tools,
  .cherry-annotation-tool-actions {
    width: 100%;
  }

  .cherry-annotation-tool-actions .cherry-button,
  .cherry-annotation-transform .cherry-icon-button {
    min-height: 44px;
  }

  .cherry-annotation-control-row {
    grid-template-columns: 1fr;
  }
}
'''
if '/* Phase 8: freehand and annotations */' not in s:
    s += addition
p.write_text(s)
