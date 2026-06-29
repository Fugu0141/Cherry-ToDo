# Cherry-ToDo Date Target Spec

## Purpose

This document defines how Cherry-ToDo decides the target date when a sticky note is placed on a date lane, boundary line, or blank area.

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

Date math should avoid local timezone drift.

When adding days to an ISO date, use UTC-based construction:

```js
function addDaysISO(date, days = 1) {
  const [year, month, day] = normalizeDate(date).split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
```

This avoids `YYYY-MM-DD` shifting by timezone differences.

---

## New task creation rule

When creating a child task by dragging from the `+` handle, the ghost note should move freely during drag.

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
- visual hot lines and saved dates do not get mixed up
