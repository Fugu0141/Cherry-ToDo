# Codebase Module Separation Plan

Cherry-ToDo is still a lightweight GitHub Pages prototype. The module split should make the code easier to maintain without introducing a build step, bundler, framework migration, or deployment complexity.

## Goals

- Keep the app runnable as static files on GitHub Pages.
- Reduce the size and responsibility of `app.js` gradually.
- Keep compatibility and migration layers explicit.
- Avoid moving many behaviors at once.
- Prefer small additive scripts before deeper extraction.

## Current shape

The app currently uses a base `app.js` plus layered compatibility / feature scripts loaded from `index.html`.

```text
app.js
  core state, storage, layout, rendering, drag/connect interactions, modals, keyboard shortcuts

schedule-model.js
  schedule migration and targetAt compatibility layer

same-day-layout.js
  same-day lane and branch layout patch

same-day-link-style.js
  link classification patch for same-day / cross-day visual styling

mobile-ux.js
  mobile viewport, modal, and touch sizing behavior

mobile-action-bar.js
  selected-task action bar for mobile

list-view.js
  list view rendering and view switching

*-fix.js
  older compatibility and behavior patches kept explicit while the prototype is evolving
```

This layered style is good for fast prototyping, but the next cleanup phase should turn the implicit patch order into clearer modules.

## Proposed module map

### 1. Storage and state helpers

Move first because these are small, stable, and easy to test manually.

Candidate responsibilities:

- `STORAGE_KEY`
- `saveNow()`
- `scheduleSave()`
- `load()`
- `snapshot()`
- undo stack helpers
- initial state creation once schedule migration is stable

Possible target file:

```text
state-storage.js
```

Rules:

- Keep the storage key unchanged unless an explicit migration issue says otherwise.
- Continue supporting compatible older localStorage keys.
- Do not hide schedule migration inside storage; call migration helpers explicitly.

### 2. Schedule model and compatibility

This already exists as `schedule-model.js`; keep it separate.

Candidate cleanup:

- Keep `schedule` normalization here.
- Keep legacy `targetAt` compatibility accessors here.
- Keep exported helpers on `window` until the app has a real module system.
- Avoid mixing layout rules into this file except date accessors needed by layout.

Possible future target:

```text
schedule-model.js
```

No immediate rename needed.

### 3. Layout helpers

Move after storage because layout touches many behaviors.

Candidate responsibilities:

- date lane calculations
- horizontal / vertical coordinate helpers
- branch layout
- same-day column layout
- track collision handling
- content size calculation

Possible target files:

```text
layout-core.js
layout-same-day.js
```

Rules:

- Keep visual rendering out of layout files where possible.
- Layout helpers may read task dates through `getTaskDate()` / `taskLayoutDate()`.
- Same-day layout should remain a clearly named layer, not a hidden patch.

### 4. Rendering helpers

Move only after layout helpers are stable.

Candidate responsibilities:

- `render()` orchestration
- lane rendering
- link rendering
- note rendering
- selected-state DOM sync
- month card update
- list-view rendering remains separate unless it shares enough helpers to justify merging

Possible target files:

```text
render-board.js
render-links.js
render-notes.js
render-lanes.js
```

Rules:

- Rendering should consume layout results, not decide layout policy.
- Keep DOM node lookup centralized or clearly grouped.

### 5. Interaction handlers

Move last because this area is easiest to break.

Candidate responsibilities:

- note dragging
- connect-handle dragging
- date hit testing during drag
- modal open/save/cancel flows
- keyboard shortcuts
- board deselection
- mobile action bar integration

Possible target files:

```text
interactions-drag.js
interactions-connect.js
interactions-modal.js
interactions-keyboard.js
mobile-action-bar.js
```

Rules:

- Do not split drag and modal behavior in the same PR.
- Keep destructive actions explicit and easy to audit.
- Backspace behavior should remain a separate UX decision, not an accidental extraction side effect.

## Script loading order

Until a build step exists, script order is part of the architecture. Keep `index.html` ordered from base to patches/features.

Suggested direction:

```html
<script src="./state-storage.js"></script>
<script src="./app.js"></script>
<script src="./schedule-model.js"></script>
<script src="./layout-same-day.js"></script>
<script src="./same-day-link-style.js"></script>
<script src="./mobile-ux.js"></script>
<script src="./list-view.js"></script>
<script src="./mobile-action-bar.js"></script>
```

During the transition, `app.js` may still define most base globals. New files should be loaded after the globals they patch or consume.

## Recommended migration order

1. Add this plan document.
2. Extract storage helpers into `state-storage.js` without changing behavior.
3. Move date/lane coordinate helpers into a layout file.
4. Move branch layout helpers into a layout file.
5. Move render helpers into rendering files.
6. Move drag/connect/modal/keyboard interactions one group at a time.
7. Delete obsolete `*-fix.js` files only after their behavior has been absorbed into named modules.

## Manual testing checklist for each extraction

After every module split PR, check:

- Existing localStorage still loads.
- New changes still save and survive reload.
- Undo still works after create/edit/delete/drag.
- Board rendering still shows notes, links, date lanes, and selected state.
- Mobile vertical mode still switches correctly.
- List view still matches board state.
- GitHub Pages deployment still works without build tooling.

## Non-goals for this phase

- No bundler.
- No TypeScript conversion.
- No framework rewrite.
- No localStorage schema bump unless a separate migration issue requires it.
- No behavior redesign hidden inside module extraction PRs.

## Issue coverage

This plan satisfies the identification part of #6:

- storage helpers that can move out of `app.js`
- layout helpers that can move into layout modules
- rendering helpers that can move into render modules
- interaction handlers that can move into interaction modules
- explicit migration / compatibility layering
- GitHub Pages static deployment constraints
