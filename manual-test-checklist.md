# Cherry-ToDo Manual Test Checklist

This checklist covers behavior that is easy to break during layout and mobile interaction changes.

## Same-day subflow layout

### 1. Same-day sibling branch

Expected shape:

```text
A -> B
  -> C
```

Steps:

1. Create a root task `A`.
2. Add child task `B` on the same date as `A`.
3. Select `A` again.
4. Add child task `C` on the same date as `A`.
5. Run auto layout if needed.

Pass conditions:

- `B` and `C` remain siblings under `A`.
- The layout does not collapse into `A -> B -> C` unless that was explicitly requested as the same branch.
- Same-day links are visually distinguishable from cross-day links.

### 2. Same-day chain

Expected shape:

```text
A -> B -> C
```

Steps:

1. Create root task `A`.
2. Add `B` as a same-branch child on the same date.
3. Select `B`.
4. Add `C` as a same-branch child on the same date.

Pass conditions:

- `A`, `B`, and `C` are shown as a compact same-day flow.
- The date lane expands only enough to fit the same-day columns.
- Links stay readable and do not overlap task text.

### 3. Mixed same-day and cross-day flow

Expected shape:

```text
A -> B      -> D
  -> C
```

Steps:

1. Create root task `A`.
2. Add same-day children `B` and `C`.
3. Add child `D` from `B` on a later date.
4. Run auto layout.

Pass conditions:

- Same-day children remain inside the same date area.
- Later-date children move into the later date lane.
- Cross-day links remain visually different from same-day links.

### 4. Vertical and horizontal layout modes

Steps:

1. Build one same-day sibling branch and one same-day chain.
2. Switch between horizontal layout and vertical layout.
3. Run auto layout in both modes.

Pass conditions:

- Same-day columns are preserved in both modes.
- Date labels and date lines remain readable.
- The board does not grow excessively in the cross-axis direction.

### 5. Drag and date-change modal

Steps:

1. Create a same-day child task.
2. Drag it into a different date lane.
3. Drag it onto a date boundary or blank area and confirm the date-change modal.

Pass conditions:

- The task's internal target date updates correctly.
- Same-day columns are recalculated after the move.
- The task does not leave behind stale same-day spacing.

### 6. Done, delete, and list-view consistency

Steps:

1. Mark a same-day child task as done.
2. Delete a same-day child task.
3. Switch to list view and back.

Pass conditions:

- Done state does not break layout.
- Deleting a task recalculates same-day spacing.
- List view reflects the same task/date state as the board.

## Mobile modal sanity check

Steps:

1. Open the task create modal on mobile.
2. Focus the task name field.
3. Open and close the virtual keyboard.
4. Save and cancel from the modal.

Pass conditions:

- The modal stays compact.
- The modal returns after the keyboard closes.
- The modal does not bounce during focus changes.
- Save and cancel remain tappable.
