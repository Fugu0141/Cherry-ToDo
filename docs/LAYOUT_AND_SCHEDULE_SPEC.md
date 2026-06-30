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
- root tasks can look like dated executable tasks even when they are being used as project/context headings
- future unscheduled tasks need to coexist with dated tasks without being confused with root headings

---

## Core rule

```text
フローが主役
日付は補助軸
```

Cherry-ToDo should not force every task into a strict calendar grid.

Dates should help users understand timing without destroying the visible task flow.

---

## Task role model

Cherry-ToDo should distinguish task role from task schedule.

```text
Root task = project / context heading
Child task = executable action
```

This distinction matters because a root task can have no real due date while still owning children that have dates.

A root task should not be treated the same as an unscheduled child task.

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

Root tasks are the visible starting points of flows, but they should be understood as context headings rather than executable todo rows.

Long-term board layout should avoid making root tasks look like they belong to a normal date lane.

---

## Root task placement

Root tasks should eventually live in a project/context area rather than inside the ordinary date lanes.

Reason:

```text
Root task on 6/30 lane
= confusing: "Do I do the whole project on 6/30?"
```

Preferred meaning:

```text
[Project / Root]
  ├ [Unscheduled action]
  ├ [6/30 action]
  └ [7/1 action]
```

The board should make these roles visually different:

- root task: project heading / flow anchor
- unscheduled child task: executable action with no date yet
- dated child task: executable action assigned to a date or date-time

This keeps the future unscheduled model from becoming ambiguous.

---

## Unscheduled tasks

Unscheduled tasks are not today.

```text
日付なし = 未定
今日 = 今日
```

Unscheduled tasks should have their own visual treatment and should not automatically appear in today's lane.

Unscheduled child tasks are still executable tasks. They are different from root tasks.

```text
Root task      = heading / context
Unscheduled    = action without a date
Dated task     = action with a date
```

A mixed subtree should be allowed:

```text
Root
├ Unscheduled child
├ 6/30 child
└ 7/1 child
```

The layout should show that all three children belong to the same root, while also making the schedule state of each child clear.

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

Migration from the current `targetAt` field should follow [`SCHEDULE_MIGRATION_PLAN.md`](SCHEDULE_MIGRATION_PLAN.md).

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
- root tasks remain project/context anchors and do not become ordinary dated actions

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

## Mixed scheduled / unscheduled subtrees

A root subtree may contain both scheduled and unscheduled children.

Example:

```text
Project Root
├ Idea整理       schedule: none
├ ワーク12ページ schedule: date 2026-06-30
└ 提出           schedule: datetime 2026-07-01 18:30
```

The layout should avoid implying that the root itself shares the date of its children.

Possible long-term board treatment:

```text
Project / Context     未定          6/30          7/1
[Project Root] ───── [Idea整理] ── [ワーク] ─── [提出]
```

On mobile, the same idea may become vertically oriented:

```text
[Project Root]
   ↓
未定
[Idea整理]

6/30
[ワーク]

7/1
[提出]
```

The exact rendering can change, but the semantic rule should not:

```text
Root is context.
Unscheduled is an action state.
Date lanes are for scheduled actions.
```

---

## Date-aware edge types

Edges should eventually be classified by date relationship:

- same-day edge
- cross-day edge
- root-to-unscheduled edge
- root-to-dated edge
- mixed scheduled/unscheduled edge
- unscheduled edge

This will make layout and rendering easier to reason about.

---

## Implementation priority

1. Introduce a schedule model separate from `targetAt`.
2. Add migrations from the current storage format.
3. Preserve root subtree structure during layout.
4. Separate root/context placement from executable task placement.
5. Add unscheduled task visual treatment.
6. Implement same-day subflow rendering.
7. Improve collision avoidance.
8. Add list view integration.

---

## Acceptance conditions

A layout change is valid when:

- task relationships stay readable
- dates are still visible
- root tasks do not look like ordinary dated executable tasks
- unscheduled tasks do not become today
- unscheduled child tasks are visually distinct from root headings
- mixed scheduled/unscheduled subtrees remain understandable
- same-day branches do not lose their structure
- desktop and mobile layout assumptions remain compatible
