from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text()
    if old not in text:
        raise SystemExit(f"pattern not found in {path}: {old[:100]!r}")
    file.write_text(text.replace(old, new, 1))


path = 'src/ui/game/index.ts'
replace_once(
    path,
    "import { InteractionCoordinator } from '../default/interaction/interaction-coordinator';\n",
    "import { InteractionCoordinator } from '../default/interaction/interaction-coordinator';\nimport { installDesktopHandleConnection } from './interaction/desktop-handle-connection';\n",
)
replace_once(
    path,
    "      handle.addEventListener('click', (event) => {\n        event.stopPropagation();\n",
    "      handle.addEventListener('click', (event) => {\n        event.stopPropagation();\n        if (handle.dataset.suppressClick === 'true') {\n          delete handle.dataset.suppressClick;\n          return;\n        }\n",
)
old = """      boardCleanup = installMobileBoardInteraction({
        scroll,
        canvas,
        workspace,
        collapsedLaneIds,
        coordinator,
        dropTask: (taskId, target) => {
          void perform(context.intents.board.dropTask({ taskId, target }));
        },
      });
      scroll.append(canvas);
"""
new = """      const mobileCleanup = installMobileBoardInteraction({
        scroll,
        canvas,
        workspace,
        collapsedLaneIds,
        coordinator,
        dropTask: (taskId, target) => {
          void perform(context.intents.board.dropTask({ taskId, target }));
        },
      });
      const handleCleanup = installDesktopHandleConnection({
        scroll,
        canvas,
        resolveKind: (sourceTaskId) =>
          workspace.connections.some(
            (edge) => edge.fromTaskId === sourceTaskId && edge.kind !== 'reference',
          )
            ? 'branch'
            : 'continuation',
        createNext: (sourceTaskId, kind) => {
          selectedTaskId = sourceTaskId;
          connectDraft = null;
          createDraft = { parentTaskId: sourceTaskId, kind };
          render();
        },
        connectExisting: (sourceTaskId, targetTaskId, kind) => {
          connectDraft = null;
          selectedTaskId = targetTaskId;
          void perform(
            context.intents.flow.connect({ fromTaskId: sourceTaskId, toTaskId: targetTaskId, kind }),
          );
        },
      });
      boardCleanup = () => {
        handleCleanup();
        mobileCleanup();
      };
      scroll.append(canvas);
"""
replace_once(path, old, new)

path = 'src/ui/game/styles.css'
marker = ".cg-flow-layer marker path { fill: #747b84; }\n"
styles = """.cg-flow-preview { fill: none; stroke: var(--cg-accent); stroke-width: 3.5; stroke-linecap: round; stroke-dasharray: 9 7; pointer-events: none; filter: drop-shadow(0 3px 5px rgba(216,51,82,.18)); }
.cg-board-task[data-connecting=\"true\"] { border-color: var(--cg-accent); box-shadow: 0 0 0 3px rgba(216,51,82,.11), 0 13px 30px rgba(24,28,35,.12); }
.cg-board-task[data-flow-drop-target=\"true\"] { border-color: var(--cg-accent); transform: translateY(-2px) scale(1.025); box-shadow: 0 0 0 5px rgba(216,51,82,.12), 0 15px 34px rgba(24,28,35,.14); }
"""
replace_once(path, marker, marker + styles)
