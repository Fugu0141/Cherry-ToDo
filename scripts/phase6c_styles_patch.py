from pathlib import Path

p = Path('src/ui/default/styles.css')
s = p.read_text()
old = '.cherry-date-lane { position: absolute; left: 12px; right: 12px; border: 1px solid #e2e5e9; border-radius: 18px; background: rgba(255,255,255,.52); pointer-events: none; }'
new = '.cherry-date-lane { position: absolute; left: 12px; right: 12px; border: 1px solid #e2e5e9; border-radius: 18px; background: rgba(255,255,255,.52); pointer-events: auto; z-index: 0; }\n.cherry-date-lane[data-drop-active="true"] { border-color: #d83352; background: rgba(216,51,82,.07); }'
if old not in s:
    raise SystemExit('date lane style target not found')
s = s.replace(old, new, 1)
s += '''

/* Phase 6C: Flow graph presentation */
.cherry-flow-layer { position: absolute; inset: 0; width: 100%; height: 100%; z-index: 1; pointer-events: none; overflow: visible; }
.cherry-flow-line { fill: none; stroke: #68717d; stroke-width: 2.5; vector-effect: non-scaling-stroke; }
.cherry-flow-line[data-cherry-state="flow-branch"] { stroke: #d83352; stroke-width: 3; }
.cherry-flow-line[data-cherry-state="flow-reference"] { stroke: #89919c; stroke-width: 2; stroke-dasharray: 7 7; }
.cherry-task-badges { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 9px; }
.cherry-task-badge { display: inline-flex; align-items: center; min-height: 22px; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 800; letter-spacing: .02em; }
.cherry-task-badge.goal { color: #ad2945; background: #fff0f3; }
.cherry-task-badge.merge { color: #67520e; background: #fff7d6; }
.cherry-task[data-cherry-state~="merge-target"] { box-shadow: inset 0 -4px 0 #d8b02f, 0 4px 16px rgba(25,29,36,.04); }
.cherry-task-connectors { display: flex; justify-content: flex-end; align-items: center; gap: 5px; margin-top: 10px; min-height: 28px; }
.cherry-flow-handle { width: 28px; height: 28px; display: inline-grid; place-items: center; border: 1px solid #d6dae0; border-radius: 999px; background: #fff; color: #59616d; padding: 0; font-weight: 850; }
.cherry-flow-handle:hover, .cherry-flow-handle:focus-visible { border-color: #d83352; color: #d83352; outline: 2px solid rgba(216,51,82,.16); outline-offset: 2px; }
.cherry-flow-handle.active { color: white; border-color: #d83352; background: #d83352; }
.cherry-flow-target-button { border: 1px solid #d83352; border-radius: 999px; background: #fff0f3; color: #ae2945; padding: 5px 10px; font-size: 11px; font-weight: 800; }
.cherry-task[data-cherry-state~="flow-connect-source"] { outline: 3px solid rgba(216,51,82,.55); outline-offset: 3px; }
.cherry-task[data-cherry-state~="flow-connect-target"] { outline: 2px dashed rgba(216,51,82,.34); outline-offset: 3px; }
.cherry-task.dragging { opacity: .44; }
'''
p.write_text(s)
