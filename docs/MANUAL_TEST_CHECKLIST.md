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

## First-run welcome window

- [ ] Clear `localStorage.cherry-todo-welcome-dismissed-v1` and reload the app.
- [ ] Confirm the welcome window appears on the first launch.
- [ ] Confirm the welcome window describes Cherry-ToDo as an OSS app.
- [ ] Confirm `はじめる`, the close button, backdrop click, and `Esc` close the window.
- [ ] Confirm closing the window writes `cherry-todo-welcome-dismissed-v1 = true`.
- [ ] Reload the app and confirm the window does not appear again.
- [ ] Confirm the GitHub, contribution, and release notes links open in a new tab.
- [ ] Confirm the donation/support entry is shown as a placeholder and is not a broken link.
- [ ] Confirm the welcome window fits inside a mobile-sized viewport.
- [ ] Confirm task data under `quest-sticky-todo-v10` is not changed by dismissing the window.

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

### Date-only timezone behavior

- [ ] Today's lane uses the browser's local calendar date, not UTC date.
- [ ] New root tasks default to the browser's local calendar date.
- [ ] New child tasks created by touch fallback also default to the local calendar date.
- [ ] Date lane / boundary date math stores plain `YYYY-MM-DD` strings.
- [ ] Adding one day around month and year boundaries does not shift by timezone.
- [ ] Existing saved task dates do not change after reload.

---

## List view behavior

- [ ] The `リスト表示` button switches from board view to list view.
- [ ] The `ボード表示` button switches back from list view to board view.
- [ ] The list shows unscheduled action tasks in the `未定` section.
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
- [ ] Reloading the page preserves tasks, dates, status, branches, and schedule objects.
- [ ] Reset only clears the app state after confirmation.
- [ ] Dismissing first-run onboarding writes only `cherry-todo-welcome-dismissed-v1` and does not rewrite task data.

### Schedule migration behavior

- [ ] Old tasks with only `targetAt` load as `schedule.type = "date"`.
- [ ] Missing `targetAt` and missing `schedule` become `schedule.type = "none"`.
- [ ] Invalid `targetAt` values become `schedule.type = "none"` and do not become today.
- [ ] Existing valid `schedule` is authoritative over legacy `targetAt`.
- [ ] Editing a dated task dual-writes `schedule.date` and legacy `targetAt`.
- [ ] Clearing a task date input saves the task as `schedule.type = "none"`.
- [ ] Unscheduled tasks do not create a date lane from their invalid or missing legacy date.

---

## Scroll boundary behavior

- [ ] Desktop board does not allow meaningless vertical scrolling into blank space.
- [ ] Desktop board still expands downward when many branch tracks exist.
- [ ] Mobile board does not allow meaningless horizontal scrolling into blank space.
- [ ] Mobile board still expands sideways when branch tracks need more room.
- [ ] Switching between desktop and mobile viewport sizes does not preserve stale inline canvas sizes.

---

## Mobile viewport check

- [ ] The app switches to vertical mode at mobile width.
- [ ] Date labels stay usable on the left side.
- [ ] Task cards remain large enough to tap.
- [ ] The selected task title is not covered by card-level control buttons.
- [ ] Dragging does not cause unusable page scrolling.
- [ ] Modals fit on the screen.
- [ ] List view rows remain readable on a mobile-sized viewport.
- [ ] List view done / todo and board-open controls are easy to tap.
- [ ] Same-day expanded lanes remain scrollable and readable in vertical mode.
- [ ] The first-run welcome window fits on the screen and remains scrollable when needed.

### Mobile Flow Map behavior

- [ ] The Flow Map is visible on mobile board view and hidden at desktop width.
- [ ] The Flow Map shows simplified task nodes without task titles.
- [ ] Parent-child links appear as simplified lines.
- [ ] The Flow Map behaves like a fixed-scale local game minimap, not a full-board scaled-down map.
- [ ] Scrolling the board moves the mapped task dots and keeps their size stable.
- [ ] Selecting a task updates the matching minimap marker.
- [ ] Tapping inside the Flow Map scrolls the board toward that area.
- [ ] Dragging inside the Flow Map continuously navigates the board.
- [ ] The Flow Map becomes more visible while scrolling or interacting, then fades back.
- [ ] Existing board editing, creation, dragging, completion, and mobile action dock behavior still works.

### Mobile action dock behavior

- [ ] Selecting a task on mobile shows the action dock near the selected task block, not fixed to the bottom edge.
- [ ] The dock appears below the task block when there is room and above/inside the viewport when there is not.
- [ ] The dock stays inside the viewport near left and right edges.
- [ ] The dock follows the selected task block while scrolling.
- [ ] Deselecting a task hides the dock.
- [ ] The card-level done, delete, and add controls do not overlap the task body on mobile.
- [ ] The dock can toggle done / todo.
- [ ] The dock can create a child branch task from the selected task.
- [ ] Repeated dock `＋追加` from the same selected parent creates sibling branches, not a linear same-branch chain.
- [ ] After saving a dock-created task, the original parent stays selected so another tap adds another sibling.
- [ ] The dock can open edit mode for the selected task.
- [ ] The dock delete button is labeled `削除` and opens the same confirmation flow as the desktop toolbar.
- [ ] Opening a modal hides the dock until the modal closes.
- [ ] Desktop card controls are unchanged.

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
