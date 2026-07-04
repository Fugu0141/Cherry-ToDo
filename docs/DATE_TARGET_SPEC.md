# Cherry-ToDo Date Target Spec

## Purpose

This document defines how Cherry-ToDo decides the target date when a task block is placed on a date lane, boundary line, or blank area.

The goal is to keep drag-and-drop date behavior stable and predictable.

---

## Basic principle

Date judgment should follow what the user appears to be doing on the screen.

Do not decide only from the raw pointer position.

Use one shared date hit result shape:

```js
{
  kind: "lane" | "line" | "blank" | "none",
  date: "YYYY-MM-DD" | null,
  targetDate: "YYYY-MM-DD" | null,
  mode: "snap" | "ask" | "free"
}
```

---

## Meaning of fields

### `kind`

The type of area detected.

- `lane`: inside a date lane
- `line`: near a date boundary line
- `blank`: blank area related to nearby dates
- `none`: no meaningful date area

### `date`

The date used for visual feedback such as purple hot lane or hot line display.

### `targetDate`

The date that should be used as the default value for saving or for the date change modal.

### `mode`

Suggested behavior:

- `snap`: safe to snap directly
- `ask`: ask the user before saving
- `free`: keep free movement

---

## Important separation

`date` and `targetDate` are not always the same.

Example:

```text
Jun 28 | Jul 3 boundary
visual line: 2026-07-03
target date: 2026-06-29
```

The visual boundary line can represent the next existing lane, while the actual intended date can be the missing date after the previous lane.

---

## Desktop horizontal layout

Desktop layout uses dates from left to right.

Rules:

- inside a lane: that lane date
- on a boundary line: previous side + 1 day when appropriate
- blank area after a lane: previous date + 1 day
- blank area after the last lane: last date + 1 day

---

## Mobile vertical layout

Mobile layout uses dates from top to bottom.

Rules:

- inside a lane: that lane date
- on a boundary line: upper side + 1 day when appropriate
- blank area under a lane: previous date + 1 day
- blank area under the last lane: last date + 1 day

---

## Forbidden pattern

Do not use only `kind === "lane"` to choose the default date.

```js
const defaultDate = hit.kind === "lane" ? hit.date : todayISO();
```

This loses the candidate date for boundaries and blank areas.

---

## Preferred pattern

Use `targetDate` first.

```js
const defaultDate = hit.targetDate || hit.date || todayISO();
```

---

## Timezone rule

Calendar-only values are not instants in time.

Cherry-ToDo should treat task dates as plain `YYYY-MM-DD` strings and should not hard-code Japan time or any other fixed timezone.

Rules:

- `todayISO()` must return the browser's local calendar date.
- Saved task dates should stay as plain `YYYY-MM-DD` strings.
- Date-only values should not be converted through `new Date("YYYY-MM-DD")` for display or storage.
- Date addition should use UTC-based date parts and then format back to `YYYY-MM-DD`.

Use the shared helper in `date-only-utils.js` when possible:

```js
window.cherryDateOnly.today();
window.cherryDateOnly.normalize(value);
window.cherryDateOnly.addDays("2026-07-13", 1);
```

The helper keeps local "today" local, while keeping date arithmetic stable across timezones.

---

## New task creation rule

When creating a child task by dragging from the `+` handle, the ghost task block should move freely during drag.

It should not snap to a date lane while the user is still deciding where to place it.

After release, the app can use the recent hit result to decide whether to open a modal or save a date.

---

## Acceptance conditions

A change is valid when:

- date lane drops save the lane date
- boundary drops use the intended candidate date
- blank area drops do not fall back to today unexpectedly
- desktop and mobile layouts behave consistently
- timezone drift does not shift dates by one day
- local today is not accidentally replaced by UTC today
- visual hot lines and saved dates do not get mixed up
