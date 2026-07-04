# Cherry-ToDo Technical Architecture

## Purpose

This document explains the current technical structure of Cherry-ToDo.

The current codebase is still a prototype. Some files are compatibility or fix layers that should eventually be merged into a cleaner structure.

---

## Tech stack

Cherry-ToDo currently uses:

```text
HTML
CSS
Vanilla JavaScript
localStorage
SVG
GitHub Pages
```

There is no build step and no frontend framework yet.

The app can run by opening `index.html`, though using a local static server is recommended during development.

---

## Current repository structure

```text
.
├── index.html
├── style.css
├── ux-fix.css
├── safety-fix.css
├── app.js
├── ux-fix.js
├── mobile.js
├── safety-fix.js
├── final-fix.js
├── date-target-fix.js
├── docs/
├── README.md
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
└── LICENSE
```

---

## Main files

### `index.html`

Defines the app shell:

- top bar
- toolbar buttons
- board area
- SVG link layer
- date lane layer
- task block layer
- task creation modal
- date change modal
- script loading order

### `style.css`

Base visual styles for the board, task blocks, toolbar, date lanes, links, and modals.

### `ux-fix.css`

Additional UI/UX patches.

### `app.js`

Main app implementation.

Current responsibilities include:

- state creation
- task creation
- localStorage save/load
- rendering
- date lane rendering
- task link rendering
- task card rendering
- drag interactions
- branch creation
- modals
- auto layout
- undo
- reset

This file is currently too large and should eventually be split into modules.

### `mobile.js`

Mobile-specific behavior and layout adjustments.

### `safety-fix.js`

Compatibility and safety fixes.

### `final-fix.js`

Late-stage prototype fixes.

### `date-target-fix.js`

Date target hit-testing fixes.

Important idea:

```text
date       = visual hot line date
targetDate = candidate date for save/modal
```

This prevents boundary drops from using the wrong date.

---

## Current task model

Current simplified task shape:

```js
Task = {
  id: string,
  title: string,
  parentId: string | null,
  x: number,
  y: number,
  targetAt: string,
  status: "todo" | "done",
  branchMode: "same" | "branch" | null
}
```

Current limitations:

- every task effectively has a date
- unscheduled tasks are not cleanly represented yet
- `targetAt` mixes schedule intent with date storage

---

## Planned task model

Future schedule-aware shape:

```js
Task = {
  id: string,
  title: string,
  parentId: string | null,
  x: number,
  y: number,
  schedule: {
    type: "none" | "date" | "datetime",
    date: string | null,
    time: string | null
  },
  status: "todo" | "done",
  branchMode: "same" | "branch" | null
}
```

Migration from `targetAt` to `schedule` is designed in [`SCHEDULE_MIGRATION_PLAN.md`](SCHEDULE_MIGRATION_PLAN.md).

---

## Schedule migration architecture

The migration should be staged so existing localStorage data remains readable.

Recommended order:

1. Add schedule helper functions.
2. Normalize loaded tasks in memory.
3. Read dates through schedule-aware accessors.
4. Dual-write `schedule` and legacy `targetAt` for dated tasks during transition.
5. Add unscheduled UI.
6. Stop depending on direct `targetAt` reads.

Important safety rule:

```text
Migration must not use today as a fallback for missing or invalid dates.
```

`todayISO()` can still be used as an intentional default for new task creation, but not as a migration fallback for existing data.

Suggested module destination later:

```text
core/
  schedule-model.js
storage/
  migration.js
```

Until the codebase is split, the helpers can live near the storage helpers in `app.js` or in a small standalone script loaded before layout logic.

---

## Storage

Current compatibility key:

```text
quest-sticky-todo-v10
```

This internal key may remain temporarily to avoid breaking existing saved data.

When renaming storage keys, migration must be implemented explicitly.

During the schedule migration, do not rename the storage key. Keep v10 readable and write the new `schedule` field into the existing state shape.

---

## Rendering flow

Current rendering is centered around a full board render cycle.

Conceptual flow:

```text
requestRender()
  -> render()
      -> ensureContentSize()
      -> renderLanes()
      -> renderLinks()
      -> renderNotes()
```

Layering:

```text
SVG links
Date lanes
Task blocks
Ghost task block / modal UI
```

---

## Layout model

Desktop:

```text
x-axis = dates
y-axis = branches / tracks
```

Mobile:

```text
y-axis = dates
x-axis = branches / tracks
```

Current layout still tends to grow downward or sideways when many branches share the same date. This should be redesigned with subtree-based layout and same-day subflow support.

---

## Recommended future module structure

```text
core/
  task-model.js
  schedule-model.js
  tree-utils.js

storage/
  local-storage.js
  migration.js

layout/
  date-axis-layout.js
  flow-layout.js
  hybrid-layout.js
  same-day-subflow.js

render/
  board-view.js
  lane-view.js
  link-view.js
  task-card-view.js
  list-view.js

interaction/
  drag-task.js
  create-branch.js
  selection.js
  keyboard.js

ui/
  task-popup.js
  date-popup.js
  confirm-popup.js
  bottom-sheet.js

mobile/
  mobile-list-view.js
  mobile-flow-view.js
  touch-gestures.js
```

---

## Change checklist

Before changing layout, drag behavior, or scheduling logic, check:

- Does this preserve parent-child task relationships?
- Does this keep date and targetDate separate?
- Does this avoid treating unscheduled tasks as today?
- Does this work in both desktop and mobile layouts?
- Does this keep existing localStorage data readable?
- Does this reduce or increase fix-layer complexity?

---

## Suggested reading order for contributors

1. `README.md`
2. `docs/PROJECT_SPEC.md`
3. `docs/PRODUCT_VISION.md`
4. `docs/TECHNICAL_ARCHITECTURE.md`
5. `docs/DATE_TARGET_SPEC.md`
6. `docs/LAYOUT_AND_SCHEDULE_SPEC.md`
7. `docs/SCHEDULE_MIGRATION_PLAN.md`
8. `docs/UX_INTERACTION_SPEC.md`
9. `docs/MOBILE_UX_SPEC.md`
10. `app.js`
11. `date-target-fix.js`
