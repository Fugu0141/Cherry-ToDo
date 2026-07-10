# Codebase Module Separation Plan

> **Status: Historical / superseded**  
> This document records the incremental script-splitting plan used for the prototype architecture.  
> The target module, command/event, storage, and extension architecture is now defined by [`../REQUIREMENTS.md`](../REQUIREMENTS.md) and ordered in [`../IMPLEMENTATION_PLAN.md`](../IMPLEMENTATION_PLAN.md).

Cherry-ToDo was originally a lightweight GitHub Pages prototype. This plan aimed to make the code easier to maintain without introducing a build step, bundler, framework migration, or deployment complexity.

## Historical goals

- Keep the app runnable as static files on GitHub Pages.
- Reduce the size and responsibility of `app.js` gradually.
- Keep compatibility and migration layers explicit.
- Avoid moving many behaviors at once.
- Prefer small additive scripts before deeper extraction.

## Prototype shape

The app used a base `app.js` plus layered compatibility, feature, and fix scripts loaded from `index.html`.

```text
app.js
  core state, storage, layout, rendering, drag/connect interactions,
  modals, keyboard shortcuts

schedule-model.js
  schedule migration and targetAt compatibility layer

same-day-layout.js
  same-day lane and branch layout patch

same-day-link-style.js
  same-day/cross-day link classification patch

mobile-ux.js
  mobile viewport, modal, and touch sizing behavior

mobile-action-bar.js
  selected-task action bar for mobile

list-view.js
  list rendering and view switching

*-fix.js
  compatibility and behavior patches
```

This supported rapid prototyping, but script order and function replacement became implicit architecture.

## Historical proposed split

### Storage and state helpers

Candidate responsibilities included storage keys, save scheduling, loading, snapshots, undo helpers, and initial-state creation.

Suggested target:

```text
state-storage.js
```

Rules included preserving compatibility keys and keeping schedule migration explicit rather than hiding it in storage.

### Schedule model and compatibility

The plan retained `schedule-model.js` for normalization and legacy `targetAt` accessors while global functions were still required.

### Layout helpers

Suggested targets:

```text
layout-core.js
layout-same-day.js
```

Responsibilities included date-lane calculations, coordinate helpers, branch/same-day layout, collision handling, and content sizing.

The plan required layout to remain separate from visual rendering where possible.

### Rendering helpers

Suggested targets:

```text
render-board.js
render-links.js
render-notes.js
render-lanes.js
```

Rendering was expected to consume layout results instead of deciding layout policy.

### Interaction handlers

Suggested targets:

```text
interactions-drag.js
interactions-connect.js
interactions-modal.js
interactions-keyboard.js
mobile-action-bar.js
```

The plan warned against splitting drag and modal behavior in the same PR and required destructive actions to remain explicit.

## Historical script-loading direction

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

Script order was treated as part of the architecture during the transition.

## Historical migration order

1. Add the plan document.
2. Extract storage helpers without changing behavior.
3. Move date/lane coordinate helpers.
4. Move branch layout helpers.
5. Move rendering helpers.
6. Move interaction groups separately.
7. Delete obsolete fix scripts only after their behavior was absorbed.

## Historical manual checks

Each extraction was expected to verify:

- old local data still loads
- changes still save and survive reload
- undo works after create/edit/delete/drag
- notes, links, lanes, and selection still render
- mobile layout still switches correctly
- list and board remain consistent
- GitHub Pages works without build tooling

## Why this is archived

The useful safety principles remain valid, but the target has changed from arranging global scripts more carefully to creating explicit native ES modules, storage adapters, commands, selectors, events, registries, and one controlled legacy bridge.

Current direction:

```text
prototype global scripts
→ explicit legacy bridge
→ native ES modules
→ core commands/selectors/events
→ built-in extension registries
```

Use [`../IMPLEMENTATION_PLAN.md`](../IMPLEMENTATION_PLAN.md) for the active migration sequence.