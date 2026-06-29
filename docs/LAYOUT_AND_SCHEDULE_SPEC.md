# Cherry-ToDo Layout and Schedule Spec

## Purpose

This document defines the intended layout and scheduling direction for Cherry-ToDo.

The main goal is to keep task flow as the primary structure while still making dates useful.

---

## Current layout problem

The current auto layout can grow too much in one direction when many roots or branches exist.

Problems:

- branches can stretch too far downward or sideways
- tasks with the same date can collapse into simple vertical stacking
- parent-child relationships can become harder to read
- date layout and flow layout can fight each other

---

## Core rule

```text
フローが主役
日付は補助軸
```

Cherry-ToDo should not force every task into a strict calendar grid.

Dates should help users understand timing without destroying the visible task flow.

---

## Root subtrees

Each root task should be treated as a subtree.

```text
Root
├ Child A
│ └ Child A-1
└ Child B
```

Layout should preserve the shape of each subtree before trying to align everything to dates.

---

## Unscheduled tasks

Unscheduled tasks are not today.

```text
日付なし = 未定
今日 = 今日
```

Unscheduled tasks should have their own visual treatment and should not automatically appear in today's lane.

---

## Future schedule model

Planned model:

```js
schedule: {
  type: "none" | "date" | "datetime",
  date: "2026-06-30" | null,
  time: "18:30" | null
}
```

Meanings:

- `none`: no date or time is set
- `date`: date is set, time is not set
- `datetime`: date and time are both set

---

## Layout modes

### Flow layout

Prioritizes the parent-child structure.

Good for:

- thinking through a project
- seeing dependencies
- understanding branches

### Date layout

Prioritizes the date axis.

Good for:

- seeing when tasks are due
- checking upcoming work

### Hybrid layout

Combines both:

- root/subtree shape is preserved
- dated tasks move toward date lanes
- unscheduled tasks stay in a separate area

Hybrid layout is the preferred long-term direction.

---

## Same-day tasks

Tasks with the same date should not always be stacked vertically.

If parent and child share the same date, their relationship should still be visible inside that date area.

Example:

```text
6/30
┌──────────────┐
│ A ───→ B      │
└──────────────┘
```

Branch example:

```text
6/30
┌──────────────┐
│      ┌→ B     │
│ A ───┼→ C     │
│      └→ D     │
└──────────────┘
```

---

## Date-aware edge types

Edges should eventually be classified by date relationship:

- same-day edge
- cross-day edge
- mixed scheduled/unscheduled edge
- unscheduled edge

This will make layout and rendering easier to reason about.

---

## Implementation priority

1. Introduce a schedule model separate from `targetAt`.
2. Add migrations from the current storage format.
3. Preserve root subtree structure during layout.
4. Add unscheduled task visual treatment.
5. Implement same-day subflow rendering.
6. Improve collision avoidance.
7. Add list view integration.

---

## Acceptance conditions

A layout change is valid when:

- task relationships stay readable
- dates are still visible
- unscheduled tasks do not become today
- same-day branches do not lose their structure
- desktop and mobile layout assumptions remain compatible
