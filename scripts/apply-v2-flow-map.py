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
    "import { installDesktopHandleConnection } from './interaction/desktop-handle-connection';\n",
    "import { installDesktopHandleConnection } from './interaction/desktop-handle-connection';\nimport { installMobileFlowMap } from './interaction/mobile-flow-map';\n",
)
replace_once(
    path,
    "      boardCleanup = () => {\n        handleCleanup();\n        mobileCleanup();\n      };\n",
    "      const flowMapCleanup = installMobileFlowMap({\n        scroll,\n        canvas,\n        workspace,\n        selectedTaskId: () => selectedTaskId,\n      });\n      boardCleanup = () => {\n        flowMapCleanup();\n        handleCleanup();\n        mobileCleanup();\n      };\n",
)

path = 'src/ui/game/styles.css'
marker = ".cg-connect-hint { position: fixed; top: 72px; left: 50%; transform: translateX(-50%); z-index: 35; padding: 9px 14px; border-radius: 999px; background: #202124; color: #fff; font-size: 12px; box-shadow: var(--cg-shadow); }\n"
styles = r'''
.cg-flow-map { position: fixed; right: 14px; bottom: 92px; z-index: 31; width: 132px; height: 168px; border: 1px solid rgba(210,214,220,.9); border-radius: 18px; overflow: hidden; background: rgba(255,255,255,.90); box-shadow: 0 12px 32px rgba(24,28,35,.12); backdrop-filter: blur(14px); touch-action: none; opacity: .36; transform: scale(.94); transform-origin: bottom right; transition: opacity 180ms ease, transform 180ms ease; }
.cg-flow-map[data-active="true"], .cg-flow-map:focus-visible { opacity: .94; transform: scale(1); }
.cg-flow-map[hidden] { display: none; }
.cg-flow-map > svg { display: block; width: 100%; height: 100%; }
.cg-flow-map-label { position: absolute; top: 7px; left: 9px; z-index: 2; color: var(--cg-muted); font-size: 8px; font-weight: 900; letter-spacing: .13em; }
.cg-flow-map-edge { fill: none; stroke: #a0a6ae; stroke-width: 1.3; }
.cg-flow-map-edge.branch { stroke: #d96a80; }
.cg-flow-map-node { fill: #727a84; }
.cg-flow-map-node.done { opacity: .35; }
.cg-flow-map-node.selected { fill: var(--cg-accent); stroke: #fff; stroke-width: 1.8; }
.cg-flow-map-viewport { fill: rgba(216,51,82,.025); stroke: rgba(216,51,82,.4); stroke-width: 1; stroke-dasharray: 3 3; }
@media (min-width: 901px) { .cg-flow-map { display: none !important; } }
'''
replace_once(path, marker, marker + styles)
