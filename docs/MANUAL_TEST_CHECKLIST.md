# Manual Test Checklist

Use this checklist before merging changes that affect behavior, layout, storage, or interaction logic.

Cherry-ToDo is still a static prototype, so these checks are intentionally manual and browser-focused.

---

## Test environment

Recommended baseline:

- Run the app from a local static server.
- Test in a modern desktop browser.
- Test once at a mobile-sized viewport.
- Keep browser dev tools open and watch for console errors.

```bash
python -m http.server 8000
```

Open:

```text
http://localhost:8000/
```

---

## Before testing

- [ ] Confirm the app loads without a blank screen.
- [ ] Confirm there are no startup errors in the console.
- [ ] Confirm the header shows `Cherry-ToDo`.
- [ ] Confirm existing `localStorage` data is not cleared unexpectedly.

---

## Core task flow

- [ ] Create a root task from `＋ ルート`.
- [ ] Create a child task by dragging or tapping the `+` handle.
- [ ] Create a same-branch child.
- [ ] Create a branch child.
- [ ] Edit an existing task title.
- [ ] Edit an existing task date.
- [ ] Toggle a task between todo and done.
- [ ] Select and deselect a task.
- [ ] Delete a selected task.
- [ ] Undo the latest supported action.

---

## Date lane behavior

- [ ] Date lanes render around task dates.
- [ ] Today's lane or active date band is visible.
- [ ] Dragging a task over a date lane highlights the lane.
- [ ] Dropping inside a date lane moves the task to that date.
- [ ] Dropping on a date boundary opens the date change UI.
- [ ] Cancelling the date change restores the original task position and date.
- [ ] Saving the date change updates the task and re-layouts the board.
- [ ] Turning date lanes off does not break task dragging.
- [ ] Turning date lanes back on restores lane rendering.

---

## List view behavior

- [ ] The `リスト表示` button switches from board view to list view.
- [ ] The `ボード表示` button switches back from list view to board view.
- [ ] The list shows today's or overdue tasks in the `今日まで` section.
- [ ] The list shows future tasks in the `今後` section.
- [ ] Tasks are grouped by their root task.
- [ ] Toggling done / todo from the list updates the board state.
- [ ] Using `ボード` from a list row returns to the board and selects the task.
- [ ] Reloading the page preserves the latest task status.

---

## Layout behavior

- [ ] Auto layout keeps parent-child links readable.
- [ ] Same-branch tasks stay in a clear flow.
- [ ] Branch tasks move to separate tracks.
- [ ] Tasks with the same date do not fully overlap.
- [ ] Link lines update after drag, edit, delete, and undo.
- [ ] Board size grows enough to show all task cards.

### Same-day subflow behavior

- [ ] Parent and same-branch child with the same date extend inside the same date area instead of becoming a plain vertical stack.
- [ ] Multiple same-date same-branch tasks keep a left-to-right flow on desktop.
- [ ] Multiple same-date same-branch tasks keep a top-to-bottom flow on mobile width.
- [ ] Same-date branch children stay readable on separate tracks.
- [ ] A widened same-date lane does not hide the next date label or next date line.
- [ ] Dragging a task into or across a widened same-date lane still picks the expected date.

---

## Storage compatibility

- [ ] Existing data under `quest-sticky-todo-v10` loads correctly.
- [ ] Older compatible keys still load when no v10 data exists.
- [ ] New changes save back to the current storage key.
- [ ] Reloading the page preserves tasks, dates, status, and branches.
- [ ] Reset only clears the app state after confirmation.

---

## Mobile viewport check

- [ ] The app switches to vertical mode at mobile width.
- [ ] Date labels stay usable on the left side.
- [ ] Task cards remain large enough to tap.
- [ ] The `+`, done, and delete controls are reachable.
- [ ] Dragging does not cause unusable page scrolling.
- [ ] Modals fit on the screen.
- [ ] List view rows remain readable on a mobile-sized viewport.
- [ ] List view done / todo and board-open controls are easy to tap.
- [ ] Same-day expanded lanes remain scrollable and readable in vertical mode.

### Mobile bottom sheet behavior

- [ ] Task creation opens as a bottom sheet at mobile width.
- [ ] Date-change UI opens as a bottom sheet at mobile width.
- [ ] Inputs are large enough to edit without accidental zoom or missed taps.
- [ ] Cancel and confirm actions are both easy to tap near the bottom edge.
- [ ] The bottom sheet respects the mobile viewport height and remains scrollable when needed.
- [ ] Desktop modal layout is unchanged.

---

## Regression notes

When a check fails, record:

- browser and viewport size
- steps to reproduce
- expected behavior
- actual behavior
- whether the issue also happens after a page reload

Known problems should be moved into `docs/KNOWN_ISSUES.md` or a GitHub issue.
