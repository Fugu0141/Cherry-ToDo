# Mobile Flow Map Spec

## Purpose

The **Flow Map** is a mobile board minimap for Cherry-ToDo.

It exists to solve one specific mobile problem: the board can be larger than the phone screen, so the user can lose both the current position and the overall task-flow structure.

The Flow Map should behave like a game minimap. It is not a smaller copy of the board. It is a lightweight orientation tool.

```text
Main board = read and edit task content
Flow Map   = understand current position and rough structure
```

Related issue: [#38](https://github.com/Fugu0141/Cherry-ToDo/issues/38)

---

## Design goals

- Show where the user currently is in the full board.
- Show the rough shape of the task structure.
- Make linear, branched, and dense areas recognizable at a glance.
- Keep the main board usable without forcing a separate mobile-only layout.
- Preserve Cherry-ToDo's core idea: task flow comes first, dates are a supporting axis.

---

## Non-goals

The Flow Map should not:

- display readable task titles
- replace the board or list view
- become a full editor
- show every detail from task cards
- require high visual precision to be useful

If the user needs to read or edit a task, they should use the main board or a task detail UI.

---

## Information shown

The minimap should show only structural information.

Recommended elements:

- task nodes as small blocks or dots
- parent-child links as thin lines
- date lane boundaries or major date bands when useful
- current viewport rectangle
- selected task marker
- optional selected-path highlight for nearby parent / child links

Task text should be omitted.

The minimap should answer these questions:

```text
Where am I?
How large is the board?
Is the flow mostly straight, branched, or dense?
Where is the selected task in the larger structure?
```

---

## Viewport indicator

The viewport indicator is the most important element.

It represents the part of the board currently visible on the phone screen.

When the main board scrolls, the viewport rectangle must move in the minimap. This gives the user immediate feedback that they are looking at one part of a larger flow.

---

## Selection sync

When a task is selected on the main board, the corresponding node in the Flow Map should change visual state.

Possible states:

```text
normal node
selected node
connected-to-selected node
completed / muted node
```

The selected node should be easy to spot, but the minimap should stay subtle enough that it does not compete with the main task cards.

---

## Navigation behavior

The Flow Map should be synchronized with board scrolling.

### Main board to Flow Map

When the user scrolls or pans the main board:

```text
board scroll position -> minimap viewport rectangle position
```

### Flow Map to main board

When the user taps or drags inside the Flow Map:

```text
minimap position -> board scroll position
```

This makes the minimap usable as both:

- a position indicator
- a navigation shortcut

---

## Placement and visibility

Initial direction:

- Fixed near the top-right of the mobile board.
- Small and semi-transparent by default.
- More visible while the user scrolls, drags, or touches it.
- Optional expanded state when tapped, if the compact view becomes too small.

The minimap must not cover essential task controls or input buttons.

---

## Coordinate model

The implementation can treat the board as a large world and the phone screen as a camera.

```text
board/world coordinates -> minimap coordinates
```

Example mapping:

```js
miniX = (taskX - boardMinX) * scale + padding
miniY = (taskY - boardMinY) * scale + padding
```

Viewport rectangle:

```js
miniViewportX = (scrollLeft - boardMinX) * scale + padding
miniViewportY = (scrollTop - boardMinY) * scale + padding
miniViewportWidth = viewportWidth * scale
miniViewportHeight = viewportHeight * scale
```

When the user interacts with the minimap, the mapping should be reversed:

```js
scrollLeft = (miniX - padding) / scale + boardMinX
scrollTop = (miniY - padding) / scale + boardMinY
```

The exact code may differ depending on the current board scroll container and layout logic.

---

## Rendering notes

The Flow Map should be cheap to render.

Recommended approach:

- render nodes and links using SVG or Canvas
- recalculate node positions when layout changes
- update the viewport rectangle on scroll
- throttle or requestAnimationFrame scroll updates if needed
- avoid DOM-heavy mini task cards

The minimap should use the same underlying task positions as the board, but with simplified drawing.

---

## Edge cases

The implementation should handle:

- only one task
- no task selected
- very tall mobile board
- very wide branch layout
- dense same-day tasks
- tasks outside the initially visible region
- orientation changes or viewport resize
- completed tasks being visually muted on the board

---

## Acceptance criteria

- [ ] The Flow Map is visible on mobile board view.
- [ ] Task nodes are represented in simplified form.
- [ ] Parent-child links are represented in simplified form.
- [ ] The current viewport is shown as a rectangle or equivalent marker.
- [ ] Scrolling the board updates the viewport marker.
- [ ] Tapping or dragging the minimap moves the board position.
- [ ] Selecting a task updates the corresponding minimap marker.
- [ ] The minimap remains useful without readable task titles.
- [ ] The minimap does not block important mobile controls.
- [ ] Existing board editing, creation, dragging, and completion behavior still works.

---

## Manual test ideas

1. Create a simple straight chain across several dates.
2. Confirm the minimap shows a mostly linear structure.
3. Scroll the mobile board and confirm the viewport rectangle moves.
4. Select a task and confirm the minimap marker changes.
5. Create a branch and confirm the rough branch shape appears.
6. Add many tasks to the same area and confirm density is recognizable.
7. Tap or drag the minimap and confirm the board moves to the expected area.
8. Confirm the minimap is still useful even though task titles are hidden.
