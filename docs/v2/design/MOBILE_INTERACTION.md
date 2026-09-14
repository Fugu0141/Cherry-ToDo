# Cherry V2 Mobile interaction design

**Status:** Accepted for the default V2 UI — 2026-09-14

This document resolves the one mobile interaction choice intentionally left open by `DESIGN_FREEZE.md`: the exact default-UI interaction for connecting existing Tasks on touch devices. It does not change Core or Application semantics.

## 1. Ownership rule

One `InteractionCoordinator` owns each active pointer/touch sequence. The relevant default-UI states are:

```text
idle
├─ panning
├─ dragging-task
└─ creating-connection
```

A second controller may not claim the same active sequence. Board edge auto-scroll is not an interaction owner; it is a service called only by the active Task-drag controller.

## 2. Board pan and Task drag

- Touch/pen on Board background starts `panning`.
- Touch/pen on a Task card body starts `dragging-task` after a movement threshold.
- Buttons, inputs, selectors and other explicit controls keep their own native touch action and do not start pan or drag.
- Desktop mouse drag/drop remains a Presentation concern mapping to the same typed Board drop intent.
- During a mobile Task drag, canonical state is unchanged until release resolves one typed drop target.

## 3. Edge auto-scroll

Only the active Task-drag controller invokes edge auto-scroll.

For each animation frame it:

1. computes requested scroll from pointer proximity to the visible Board edge,
2. clamps the scroll to the actual scroll range,
3. applies the actual scroll delta, and
4. applies that same delta to the drag preview.

This keeps preview and Board movement coherent and avoids a competing edge-scroll pointer handler.

## 4. Existing-Task connection UX

The accepted mobile-native interaction is **explicit temporary connection mode**:

1. On the source Task, the user chooses a visible connection relation: continuation, branch, or reference.
2. The `InteractionCoordinator` enters `creating-connection` with that source Task and relation.
3. Other Tasks expose an explicit **connection target** action.
4. Tapping a target produces the existing `ConnectTasksIntent` and calls the same `flow.connect` UI/Application contract used by desktop.
5. Choosing the source itself does nothing and keeps target selection active.
6. Cancel exits connection mode without canonical mutation.

Connection creation is deliberately **not** initiated by long-press, dragging a hidden handle, or another gesture that competes with Task movement or Board pan.

## 5. Mobile Flow presentation

Mobile Board and List are alternate presentations of the same Flow graph.

- Board keeps structural connectors, branch/Goal and merge semantics visible.
- List must display structural predecessors and successors for each Task rather than reducing the workspace to an unrelated flat todo list.
- Reference relationships are shown separately from structural predecessor/successor context.
- The Task editor uses the same Task intents as desktop.

## 6. Flow-first first-run UX

On an empty mobile workspace, the dominant call to action is to create the first Task and begin a Flow. Storage/import/destructive actions remain secondary to this path.

## 7. Touch accessibility

Primary mobile controls use approximately 44px minimum touch targets. Required actions have visible labels or accessible names and do not depend on hover. Destructive Task actions remain inside the contextual Task editor rather than occupying the primary Board surface.

## 8. Acceptance conditions

The default UI is accepted when automated tests verify that:

- Task drag and Board pan have mutually exclusive ownership,
- edge auto-scroll updates scroll and drag preview coherently,
- connection mode blocks competing drag/pan ownership,
- selecting a target emits the ordinary `ConnectTasksIntent`,
- branch/merge context survives List presentation,
- no mobile-specific Domain or Application command path is introduced.
