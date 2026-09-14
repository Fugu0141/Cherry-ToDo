# Cherry V2 UI/UX Overhaul

Status: **Implementation target — 2026-09-14**

This document records the UI/UX recovery work requested after the first full V2 release-candidate build was manually tested. The V2 Domain/Application/Persistence architecture remains authoritative; this work replaces the product-facing interaction layer rather than reverting the architecture.

## Product rule

Cherry is a visual planning tool, not an administration form.

The Board itself MUST be the primary control surface. Frequent actions MUST be available by directly touching the Task or its Flow handles. Forms and settings remain available for precision and accessibility, but they MUST NOT be the primary path for ordinary planning.

The visual direction keeps the good part of the first V2 UI: simple, quiet, low-chrome presentation. Interaction density and discoverability are restored from the earlier Cherry prototype.

## V1 interaction inventory to recover

The `main` prototype established useful interaction patterns which V2 initially lost or weakened:

- click/tap a Task to select it;
- create the next Task from the selected Task rather than returning to a global form;
- drag a connection handle to show a live Flow preview;
- drop onto an existing Task to connect it;
- continue work from the current context after creating a child/branch Task;
- keep low-frequency controls away from the main planning surface;
- expose a selected-Task action dock on mobile;
- use a mobile Flow Map/minimap for navigation;
- use mobile bottom-sheet style editing instead of a desktop modal squeezed onto a phone;
- provide tab lifecycle actions (create/rename/duplicate/delete) without permanently occupying the Board;
- preserve Board/List, date lanes, auto layout, undo, theme, storage and import/export affordances without making them compete with Task creation.

## Interaction hierarchy

### Level 1 — direct manipulation

Always easy to discover:

- select Task;
- drag Task;
- complete/reopen Task;
- create next Task;
- drag Flow handle;
- edit selected Task;
- switch Board/List;
- Undo/Redo.

### Level 2 — contextual controls

Visible after selection or while an interaction is active:

- branch/reference connection kind;
- destructive Task actions;
- schedule editing;
- Flow disconnect/reorder where applicable.

### Level 3 — workspace tools

Kept in a compact tools/settings surface:

- date lane visibility;
- auto layout;
- time guide;
- annotations/freehand;
- persistence controls;
- import/export;
- infrequent tab/workspace management.

## Desktop Board target

```text
┌ Cherry   Workspace                     Board | List   ↶ ↷  ⋯ ┐
├ Plan A  Plan B  +                                             ┤
│                                                               │
│       ┌──────────── Task A ────────────┐                       │
│       │ title                       ●──┼──── drag Flow         │
│       │ date / state                  │                       │
│       └───────────────────────────────┘                       │
│             [✓] [＋] [✎] [⋯]      contextual dock            │
│                         \                                     │
│                          \──────→ Task B                      │
│                                                               │
│                                              ＋ Add Task        │
└───────────────────────────────────────────────────────────────┘
```

The old global `from / kind / to / connect` form is retained only as a fallback/precision tool and is not part of the normal planning path.

## Mobile target

- Board pans from empty space.
- Task drag owns the pointer when started on a Task body.
- Selecting a Task reveals a fixed bottom action dock.
- The selected Task is never hidden behind the dock.
- Flow connection is explicit and does not compete with panning.
- A compact Flow Map provides spatial navigation.
- Task editor is presented as a bottom sheet.

## Parity matrix

| Earlier Cherry behavior | First V2 RC | Overhaul target |
| --- | --- | --- |
| Task selection | edit button dominated | direct card selection |
| Create child/next Task | global create form | contextual `+` |
| Existing Task connection | drag handle + preview | restore direct drag |
| Branch creation | spatial/contextual | contextual kind choice |
| Mobile selected actions | action dock | restore action dock |
| Mobile map | Flow Map | restore V2-native Flow Map |
| Tab create | persistent form | compact `+` |
| Tab rename/duplicate/delete | missing in V2 UI | restore lifecycle menu |
| Low-frequency layout settings | toolbar-heavy | tools popover/drawer |
| Board/List | available | keep, visually simplify |
| Task editor | modal | desktop anchored/modal, mobile bottom sheet |
| Visual style | patch-heavy V1 / simple V2 | keep V2 simplicity, improve hierarchy |

## Architecture boundary

The overhaul MUST use `CherryUIContext` and its intents. UI code MUST NOT import Domain/Application/adapters directly. Missing user-facing operations are added to the UI contract and implemented through composition/Application commands rather than by mutating canonical state in the DOM layer.

The existing `DefaultCherryUI` remains a valid contract-compatible reference implementation. The production UI may wrap or replace it while the interaction overhaul is developed, preserving the Phase 5 replaceability proof.

## Acceptance criteria

The overhaul is not complete merely because the screen looks cleaner. Manual testing MUST establish that a new user can perform the following without reading documentation:

1. create the first Task;
2. select it;
3. create a next Task from it;
4. branch from it;
5. connect to an existing Task;
6. drag Tasks and understand where they will land;
7. complete/reopen/edit/delete a selected Task;
8. switch tabs and Board/List;
9. find date/layout/annotation tools without those tools dominating the Board;
10. perform the same core planning loop at mobile width.
