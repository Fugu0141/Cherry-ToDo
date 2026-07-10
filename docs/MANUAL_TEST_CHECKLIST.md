# Manual Test Checklist

Use this checklist before merging changes that affect behavior, layout, storage, import/export, or interaction logic.

Cherry is still a build-free static prototype, so these checks are intentionally browser-focused. This document defines what must be tested; unchecked items are not evidence that a test has passed.

---

## Test environment

Recommended baseline:

- Run the app from a local static server.
- Test in a modern desktop browser.
- Test once at a mobile-sized viewport.
- Keep browser developer tools open and watch for console errors.
- For release testing, record the browser name/version and viewport size.

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
- [ ] Confirm the user-facing app name is `Cherry`.
- [ ] Confirm old `Cherry-ToDo` wording appears only where needed for repository URLs, compatibility keys, or historical documentation.
- [ ] Confirm existing `localStorage` data is not cleared unexpectedly.
- [ ] Confirm the Start page, board, and list do not overlap after initial loading.

---

## Start page and workspace tabs

- [ ] With no workspace tabs, confirm the Start page remains open and offers a clear primary action to start new work.
- [ ] Create a new tab and confirm the board opens with an empty state.
- [ ] Create several tabs and switch between them from the tab rail.
- [ ] Confirm each tab preserves its own tasks, dates, status, branch relationships, and view mode.
- [ ] Rename a tab and confirm the new name appears in the tab rail and Start page.
- [ ] Duplicate a tab and confirm the copied tab contains independent task data.
- [ ] Delete a tab and confirm a destructive confirmation appears.
- [ ] Confirm deleting the active tab selects a valid remaining tab.
- [ ] Confirm deleting the last tab returns to the Start page.
- [ ] Confirm the new-tab button stays reachable when the tab rail overflows.
- [ ] Confirm opening the Start page does not discard unsaved changes in the active tab.
- [ ] Reload and record whether the expected active workspace/tab/view is restored; known restoration gaps should be linked to #88.

---

## First-run introduction and tutorial

- [ ] Clear `localStorage.cherry-todo-welcome-dismissed-v1` and reload the app.
- [ ] Confirm the first-run introduction appears once.
- [ ] Confirm the introduction describes Cherry as an open-source task-flow app.
- [ ] Confirm the primary action, close button, backdrop click, and `Esc` close the introduction where supported.
- [ ] Confirm closing the introduction writes `cherry-todo-welcome-dismissed-v1 = true`.
- [ ] Reload and confirm the introduction does not appear again.
- [ ] Confirm GitHub, contribution, and release-note links open safely.
- [ ] Confirm the introduction fits inside a mobile-sized viewport and remains scrollable.
- [ ] Confirm dismissing onboarding does not rewrite task data under `quest-sticky-todo-v10`.
- [ ] Open the tutorial and step through every page.
- [ ] Confirm tutorial previews do not resize or jump unexpectedly between steps.
- [ ] Confirm closing and reopening the tutorial leaves the workspace usable.

---

## Language and theme

- [ ] Switch the UI between Japanese and English.
- [ ] Confirm the Start page, toolbar, task dialogs, list view, tab actions, tutorial, and file dialogs update language consistently.
- [ ] Confirm task titles and user-entered tab names are not translated.
- [ ] Switch among system, light, and dark themes.
- [ ] Confirm text, controls, cards, list rows, dialogs, and selected states remain readable in each theme.
- [ ] Reload and confirm the selected language/theme preference behaves as intended.

---

## Core task flow

- [ ] Create a goal/task from the primary `タスクを追加` / `Add task` action.
- [ ] Confirm task creation is visually stronger than low-frequency toolbar actions.
- [ ] Create a child task by dragging or tapping the `+` handle.
- [ ] Create a same-flow child.
- [ ] Create a branch child.
- [ ] Edit an existing task title.
- [ ] Edit an existing task date.
- [ ] Toggle a task between todo and done.
- [ ] Select and deselect a task.
- [ ] Delete a selected task through the confirmation flow.
- [ ] Undo the latest supported semantic action.
- [ ] Confirm creating, editing, deleting, and undoing update both the board and list views.

---

## Existing-task connection on desktop

- [ ] At desktop width, drag from a task connection handle without creating a new task immediately.
- [ ] Confirm valid existing target tasks receive a clear connection preview.
- [ ] Connect two valid existing tasks and confirm the relationship is saved and rendered.
- [ ] Confirm cancelling or dropping on no valid target leaves the original structure unchanged.
- [ ] Confirm invalid self-connections are rejected.
- [ ] Confirm connections that would violate current structural rules are rejected without corrupting state.
- [ ] Confirm normal task dragging still works after using connection mode.
- [ ] Confirm mobile task creation and dragging are unchanged; mobile existing-task connection is tracked separately in #93.

---

## Date lane behavior

- [ ] Date lanes render around task dates.
- [ ] Today's lane or active date band is visible.
- [ ] Dragging a task over a date lane highlights the lane.
- [ ] Dropping inside a date lane explicitly moves the task to that date.
- [ ] Dropping on a date boundary opens the date-change UI.
- [ ] Cancelling the date change restores the original task position and date.
- [ ] Saving the date change updates the task and re-layouts the board.
- [ ] Turning date lanes off does not remove or rewrite task dates.
- [ ] Turning date lanes off does not break task dragging.
- [ ] Turning date lanes back on restores lane rendering with the original dates.
- [ ] An undated task does not silently become today's task when lane visibility changes.

### Date-only timezone behavior

- [ ] Today's lane uses the browser's local calendar date, not the UTC date.
- [ ] New dated tasks default to the browser's local calendar date where a default is intended.
- [ ] New child tasks created by touch fallback use the local calendar date where a default is intended.
- [ ] Date lane/boundary math stores plain `YYYY-MM-DD` strings.
- [ ] Adding one day around month and year boundaries does not shift because of timezone conversion.
- [ ] Existing saved task dates do not change after reload.

---

## List view behavior

- [ ] The list action switches from board view to list view.
- [ ] The board action switches back from list view to board view.
- [ ] The list shows undated action tasks in the undated section.
- [ ] The list shows today's or overdue tasks in the due section.
- [ ] The list shows future tasks in the upcoming section.
- [ ] Tasks are grouped under the correct goal/top-level flow.
- [ ] Toggling done/todo from the list updates board state.
- [ ] Opening a task from a list row returns to the board and selects the correct task.
- [ ] List filters remain usable and do not cover rows at mobile width.
- [ ] Reloading preserves the latest task status and list data.

---

## Layout behavior

- [ ] Auto layout keeps parent-child links readable.
- [ ] Same-flow tasks stay in a clear sequence.
- [ ] Branch tasks move to separate tracks.
- [ ] Tasks with the same date do not fully overlap.
- [ ] Link lines update after drag, edit, connect, delete, and undo.
- [ ] Board size grows enough to show all task cards.
- [ ] Vertical layout remains usable and does not lose relationships.

### Same-day subflow behavior

- [ ] A parent and same-flow child with the same date extend inside the same date area instead of becoming a plain stack.
- [ ] Multiple same-date same-flow tasks keep a left-to-right flow on desktop.
- [ ] Multiple same-date same-flow tasks keep a top-to-bottom flow at mobile width.
- [ ] Same-date branch children stay readable on separate tracks.
- [ ] A widened same-date lane does not hide the next date label or line.
- [ ] Dragging into or across a widened same-date lane selects the expected date.

---

## Drag-edge scrolling

- [ ] On desktop, dragging a task near the board edge scrolls in the expected direction.
- [ ] On desktop, connecting tasks near the board edge scrolls without losing the connection preview.
- [ ] Moving away from the edge stops automatic scrolling promptly.
- [ ] Releasing or cancelling the drag stops automatic scrolling.
- [ ] Edge scrolling does not continue after switching views or closing a dialog.
- [ ] Mobile edge scrolling behavior is unchanged and remains tracked separately in #93.

---

## Storage compatibility

- [ ] Existing data under `quest-sticky-todo-v10` loads correctly.
- [ ] Older compatible keys load when no current-key data exists.
- [ ] New changes save back to the current storage key.
- [ ] Workspace data under `cherry-workspace-v1` remains readable.
- [ ] Reloading preserves tasks, dates, status, branches, schedule objects, and tabs.
- [ ] Reset clears app state only after confirmation.
- [ ] Dismissing first-run onboarding writes only its onboarding preference and does not rewrite task data.
- [ ] Storage exceptions do not leave the app on an unusable blank screen.

### Schedule migration behavior

- [ ] Old tasks with only `targetAt` load as `schedule.type = "date"`.
- [ ] Missing `targetAt` and missing `schedule` become `schedule.type = "none"`.
- [ ] Invalid `targetAt` values become `schedule.type = "none"` and do not become today.
- [ ] Existing valid `schedule` is authoritative over legacy `targetAt`.
- [ ] Editing a dated task dual-writes `schedule.date` and legacy `targetAt` while compatibility is required.
- [ ] Clearing a task date saves the task as `schedule.type = "none"`.
- [ ] Undated tasks do not create a lane from invalid or missing legacy dates.

---

## Workspace file import/export

### Encrypted `.cherry`

- [ ] Export a workspace with multiple tabs to an encrypted `.cherry` file.
- [ ] Confirm export requires a passphrase and passphrase confirmation.
- [ ] Import with the correct passphrase and confirm all tabs and task data are restored.
- [ ] Confirm a wrong passphrase fails without replacing the current readable workspace.
- [ ] Test both add/merge and replace import modes.
- [ ] Confirm cancelling any export/import dialog leaves state unchanged.
- [ ] Confirm the file warning explains that a forgotten passphrase cannot be recovered.

### iCalendar VTODO (`.ics`)

- [ ] Export `.ics` and confirm the file is clearly described as unencrypted/plain text.
- [ ] Inspect the file and confirm expected tasks appear as VTODO entries.
- [ ] Import a supported `.ics` file into a new or merged tab.
- [ ] Confirm unsupported or malformed calendar input fails safely.
- [ ] Confirm basic ICS round-trip does not claim to preserve unsupported Cherry-only flow semantics.

---

## Scroll boundary behavior

- [ ] Desktop board does not allow meaningless vertical scrolling into blank space.
- [ ] Desktop board still expands downward when many branch tracks exist.
- [ ] Mobile board does not allow meaningless horizontal scrolling into blank space.
- [ ] Mobile board still expands sideways when branch tracks need more room.
- [ ] Switching between desktop and mobile viewport sizes does not preserve stale inline canvas sizes.

---

## Mobile viewport check

- [ ] The app switches to vertical board orientation at mobile width.
- [ ] Date labels stay usable on the left side.
- [ ] Task cards and important actions are large enough to tap.
- [ ] The selected task title is not covered by card-level controls.
- [ ] Dragging and page scrolling do not become unusably conflicted.
- [ ] Dialogs and bottom sheets fit the viewport and remain scrollable.
- [ ] List rows and list controls remain readable and tappable.
- [ ] Same-day expanded lanes remain scrollable and readable.
- [ ] The first-run introduction and tutorial fit the screen.
- [ ] Low-priority toolbar actions do not crowd out task creation.

### Mobile Flow Map behavior

- [ ] The Flow Map appears on mobile board view and is hidden at desktop width.
- [ ] The Flow Map shows simplified task nodes without task titles.
- [ ] Parent-child links appear as simplified lines.
- [ ] The Flow Map behaves like a fixed-scale local minimap, not a full-board thumbnail.
- [ ] Scrolling the board moves mapped task dots while keeping marker size stable.
- [ ] Selecting a task updates the matching minimap marker.
- [ ] Tapping inside the Flow Map scrolls toward that area.
- [ ] Dragging inside the Flow Map continuously navigates the board.
- [ ] The Flow Map becomes more visible during interaction and fades when idle.
- [ ] Normal board editing, creation, dragging, completion, and action-dock behavior still works.

### Mobile action dock behavior

- [ ] Selecting a task shows the action dock near the selected task rather than as a permanent global toolbar.
- [ ] The dock chooses a visible position above or below the task and stays inside viewport edges.
- [ ] The dock follows the selected task while scrolling.
- [ ] Deselecting the task hides the dock.
- [ ] Card controls do not overlap the task body.
- [ ] The dock can toggle done/todo.
- [ ] The dock can create a child/branch task from the selected task.
- [ ] Repeated add actions from the same selected parent create the intended sibling branches.
- [ ] After saving a dock-created task, selection behavior supports the next intended action.
- [ ] The dock can open edit mode.
- [ ] The dock delete action uses the same confirmation policy as desktop.
- [ ] Opening a dialog hides or disables the dock until the dialog closes.

### Mobile bottom-sheet behavior

- [ ] Task creation opens as a bottom sheet at mobile width.
- [ ] Date-change UI opens as a bottom sheet at mobile width.
- [ ] Inputs are large enough to edit without accidental zoom or missed taps.
- [ ] Cancel and confirm actions are easy to reach.
- [ ] The sheet respects viewport height and remains scrollable.
- [ ] Desktop dialog layout is unchanged.

---

## Release evidence

For a release candidate, record:

- [ ] Commit SHA tested
- [ ] Desktop browser/version and viewport
- [ ] Mobile browser/device or emulated viewport
- [ ] Whether existing local data was used
- [ ] Whether `.cherry` and `.ics` round-trips were tested
- [ ] Console errors or warnings observed
- [ ] Links to every blocking failure

Do not mark the release checklist complete from code review alone.

---

## Regression notes

When a check fails, record:

- browser and viewport size
- steps to reproduce
- expected behavior
- actual behavior
- whether it also happens after a reload
- whether existing local data was involved

Move known limitations into `docs/KNOWN_ISSUES.md` and create/link a GitHub issue for actionable work.