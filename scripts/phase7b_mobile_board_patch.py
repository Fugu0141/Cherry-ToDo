from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f'{label} target not found')
    return text.replace(old, new, 1)


p = Path('src/ui/default/index.ts')
s = p.read_text()
s = replace_once(
    s,
    "} from '../../ui-contract/index';\n",
    "} from '../../ui-contract/index';\nimport { InteractionCoordinator } from './interaction/interaction-coordinator';\nimport { installMobileBoardInteraction } from './interaction/mobile-board-interaction';\n",
    'imports',
)
s = replace_once(
    s,
    """  connectTarget: (taskId: string) => void,
  cancelConnection: () => void,
): HTMLElement {
  const scroll = element('main', 'cherry-board-scroll');""",
    """  connectTarget: (taskId: string) => void,
  cancelConnection: () => void,
  interactionCoordinator: InteractionCoordinator,
  registerInteractionCleanup: (cleanup: () => void) => void,
): HTMLElement {
  const scroll = element('main', 'cherry-board-scroll');""",
    'renderBoard signature',
)
s = replace_once(
    s,
    """  scroll.append(canvas);
  return scroll;
}""",
    """  registerInteractionCleanup(
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

  scroll.append(canvas);
  return scroll;
}""",
    'mobile interaction install',
)
s = replace_once(
    s,
    """  connectTarget: (taskId: string) => void,
  cancelConnection: () => void,
): void {
  const header = element('header', 'cherry-header');""",
    """  connectTarget: (taskId: string) => void,
  cancelConnection: () => void,
  interactionCoordinator: InteractionCoordinator,
  registerInteractionCleanup: (cleanup: () => void) => void,
): void {
  const header = element('header', 'cherry-header');""",
    'renderWorkspace signature',
)
s = replace_once(
    s,
    """          connectTarget,
          cancelConnection,
        )
      : renderList(""",
    """          connectTarget,
          cancelConnection,
          interactionCoordinator,
          registerInteractionCleanup,
        )
      : renderList(""",
    'renderBoard call',
)
s = replace_once(
    s,
    """    let lastWorkspaceId: string | null = null;
    const collapsedLaneIds = new Set<string>();

    const render = (): void => {
      const screen = context.getScreen();""",
    """    let lastWorkspaceId: string | null = null;
    const collapsedLaneIds = new Set<string>();
    const interactionCoordinator = new InteractionCoordinator();
    let boardInteractionCleanup: (() => void) | null = null;

    const render = (): void => {
      boardInteractionCleanup?.();
      boardInteractionCleanup = null;
      const screen = context.getScreen();""",
    'mount interaction state',
)
s = replace_once(
    s,
    """        () => {
          connectionDraft = null;
          render();
        },
      );
    };""",
    """        () => {
          connectionDraft = null;
          render();
        },
        interactionCoordinator,
        (cleanup) => {
          boardInteractionCleanup = cleanup;
        },
      );
    };""",
    'renderWorkspace call',
)
s = replace_once(
    s,
    """      unmount() {
        document.removeEventListener('keydown', onKeyDown);
        unsubscribe();""",
    """      unmount() {
        boardInteractionCleanup?.();
        interactionCoordinator.cancel();
        document.removeEventListener('keydown', onKeyDown);
        unsubscribe();""",
    'unmount cleanup',
)
p.write_text(s)


p = Path('src/ui/default/interaction/mobile-board-interaction.ts')
s = p.read_text()
s = replace_once(
    s,
    """  readonly grabOffset: InteractionPoint;
  latestPointer: InteractionPoint;""",
    """  readonly grabOffset: InteractionPoint;
  readonly originPointer: InteractionPoint;
  latestPointer: InteractionPoint;""",
    'drag origin field',
)
s = replace_once(
    s,
    """        grabOffset: { x: event.clientX - cardRect.left, y: event.clientY - cardRect.top },
        latestPointer: { x: event.clientX, y: event.clientY },""",
    """        grabOffset: { x: event.clientX - cardRect.left, y: event.clientY - cardRect.top },
        originPointer: { x: event.clientX, y: event.clientY },
        latestPointer: { x: event.clientX, y: event.clientY },""",
    'drag origin assignment',
)
s = replace_once(
    s,
    """      const moved = current.moved || interactionDistanceSquared({
        kind: 'dragging-task',
        pointerId: current.pointerId,
        origin: { x: event.clientX, y: event.clientY },
        current: current.latestPointer,
        subjectId: current.taskId,
      }) >= DRAG_THRESHOLD_SQUARED;""",
    """      const dx = current.latestPointer.x - current.originPointer.x;
      const dy = current.latestPointer.y - current.originPointer.y;
      const moved = current.moved || dx * dx + dy * dy >= DRAG_THRESHOLD_SQUARED;""",
    'drag finish threshold',
)
p.write_text(s)


p = Path('src/ui/default/styles.css')
s = p.read_text()
addition = """

/* Phase 7B: mobile single-owner Board interaction */
@media (max-width: 680px), (pointer: coarse) {
  .cherry-board-scroll {
    touch-action: none;
    overscroll-behavior: contain;
    min-height: calc(100dvh - 196px);
  }

  .cherry-board-task {
    touch-action: none;
  }

  .cherry-board-task.touch-dragging {
    transition: none;
    z-index: 8;
    box-shadow: 0 18px 44px rgba(25, 29, 36, .18);
  }

  .cherry-flow-handle,
  .cherry-flow-target-button,
  .cherry-icon-button,
  .cherry-date-lane-label {
    min-width: 44px;
    min-height: 44px;
  }
}
"""
if '/* Phase 7B: mobile single-owner Board interaction */' not in s:
    s += addition
p.write_text(s)
