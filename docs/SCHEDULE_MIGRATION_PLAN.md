# Schedule Migration Plan

This document designs the migration from the current `targetAt` date string to the planned `schedule` object.

Related issue: [#2](https://github.com/Fugu0141/Cherry-ToDo/issues/2)

---

## Why this migration is needed

Cherry-ToDo currently stores each task with a `targetAt` date string.

```js
Task = {
  id: string,
  title: string,
  parentId: string | null,
  x: number,
  y: number,
  targetAt: string,
  status: "todo" | "done",
  branchMode: "same" | "branch" | null
}
```

This is useful for the current date-lane prototype, but it cannot represent all intended schedule states.

Main limitations:

- every task effectively has a date
- unscheduled tasks cannot be represented cleanly
- missing or invalid dates can accidentally become today
- date-only tasks and datetime tasks are not separated
- future list view logic would have to guess schedule intent from one string

The long-term model should make schedule intent explicit.

---

## Target model

Planned task shape:

```js
Task = {
  id: string,
  title: string,
  parentId: string | null,
  x: number,
  y: number,
  schedule: {
    type: "none" | "date" | "datetime",
    date: string | null,
    time: string | null
  },
  status: "todo" | "done",
  branchMode: "same" | "branch" | null
}
```

Schedule meanings:

| `schedule.type` | Meaning | `date` | `time` |
| --- | --- | --- | --- |
| `none` | unscheduled | `null` | `null` |
| `date` | date-only task | `YYYY-MM-DD` | `null` |
| `datetime` | date and time task | `YYYY-MM-DD` | `HH:mm` |

Important rule:

```text
日付なし = 未定
今日 = 今日
```

Unscheduled tasks must never silently become today's tasks.

---

## Compatibility principle

The migration must be safe for existing localStorage data.

Current storage key:

```text
quest-sticky-todo-v10
```

This key should remain until a later storage-key migration is designed.

During the first migration phase, the app should keep reading current v10 data and older compatible keys. The data shape can be normalized after loading.

---

## Migration strategy

Use a staged migration instead of a one-step replacement.

### Stage 1: Add schedule helpers

Add pure helper functions before changing rendering or interactions.

Suggested helpers:

```js
function isValidISODate(value) {}
function isValidTime(value) {}
function makeScheduleNone() {}
function makeScheduleDate(date) {}
function makeScheduleDateTime(date, time) {}
function scheduleFromLegacyTargetAt(targetAt) {}
function normalizeSchedule(schedule, legacyTargetAt) {}
function getTaskSchedule(task) {}
function getTaskDate(task) {}
function hasTaskDate(task) {}
```

These helpers should not directly mutate state unless the function name clearly says it does.

### Stage 2: Normalize loaded tasks in memory

After parsing localStorage data, normalize every task.

Rules:

1. If `task.schedule` is valid, keep it.
2. If `task.schedule` is missing and `task.targetAt` is a valid ISO date, create:

```js
schedule: {
  type: "date",
  date: task.targetAt,
  time: null
}
```

3. If both `task.schedule` and `task.targetAt` are missing or invalid, create:

```js
schedule: {
  type: "none",
  date: null,
  time: null
}
```

4. Do not use `todayISO()` as a fallback inside migration.

This is the most important safety rule.

### Stage 3: Read through schedule-aware accessors

Update code paths gradually so app logic reads dates through helpers instead of direct `task.targetAt` access.

Preferred pattern:

```js
const date = getTaskDate(task);
if (!date) {
  // unscheduled task behavior
}
```

Avoid:

```js
const date = normalizeDate(task.targetAt);
```

`normalizeDate()` currently falls back to today when the value is missing. That is useful for date inputs, but dangerous for schedule migration.

### Stage 4: Dual-write during transition

When editing a task date, write both the new schedule field and the legacy `targetAt` field.

Example:

```js
task.schedule = makeScheduleDate(targetDate);
task.targetAt = targetDate;
```

For unscheduled tasks:

```js
task.schedule = makeScheduleNone();
delete task.targetAt;
```

or, if deletion is too risky during the transition:

```js
task.schedule = makeScheduleNone();
task.targetAt = null;
```

The final choice should be made during implementation. The important part is that code must not read `targetAt` as authoritative once `schedule` exists.

### Stage 5: Add unscheduled UI

Only after schedule helpers are stable:

- allow creating a task with no date
- allow editing a task to remove its date
- render unscheduled tasks separately from today's lane
- show unscheduled tasks in the future list view

### Stage 6: Stop depending on `targetAt`

After rendering, layout, drag, editing, and list view logic use schedule helpers, `targetAt` becomes legacy-only.

At that point, a separate storage-key migration can be considered.

---

## Legacy mapping rules

### Existing normal dated task

Input:

```js
{ targetAt: "2026-06-30" }
```

Output:

```js
{
  targetAt: "2026-06-30",
  schedule: {
    type: "date",
    date: "2026-06-30",
    time: null
  }
}
```

### Missing legacy date

Input:

```js
{ targetAt: undefined }
```

Output:

```js
{
  schedule: {
    type: "none",
    date: null,
    time: null
  }
}
```

Do not convert this to today.

### Invalid legacy date

Input:

```js
{ targetAt: "tomorrow" }
```

Output:

```js
{
  schedule: {
    type: "none",
    date: null,
    time: null
  }
}
```

Optionally keep the invalid original value in a future debug or migration warning system, but do not use it for layout.

### Existing schedule object wins

Input:

```js
{
  targetAt: "2026-06-30",
  schedule: {
    type: "none",
    date: null,
    time: null
  }
}
```

Output:

```js
{
  targetAt: "2026-06-30",
  schedule: {
    type: "none",
    date: null,
    time: null
  }
}
```

Once `schedule` exists and is valid, it is authoritative.

---

## Validation rules

### ISO date

Valid date string:

```text
YYYY-MM-DD
```

Basic validation should reject impossible values such as:

- empty strings
- `null`
- `undefined`
- `2026-99-99`
- `tomorrow`
- full datetime strings when a date-only field is expected

### Time

Valid time string:

```text
HH:mm
```

Examples:

- `00:00`
- `09:30`
- `23:59`

Reject:

- `24:00`
- `9:30`
- `09:99`
- full datetime strings

---

## Rendering and layout policy

Schedule-aware code should classify tasks before layout.

Suggested helpers:

```js
function isUnscheduledTask(task) {
  return getTaskSchedule(task).type === "none";
}

function getTaskDate(task) {
  const schedule = getTaskSchedule(task);
  return schedule.type === "date" || schedule.type === "datetime"
    ? schedule.date
    : null;
}
```

Dated tasks:

- participate in date lanes
- can be placed by date-aware layout
- can appear in today's and upcoming list sections

Unscheduled tasks:

- do not create today's lane
- should eventually render in a separate unscheduled area
- should appear in an unscheduled list section

Temporary implementation option:

- Until unscheduled rendering exists, the app may keep prototype-created tasks dated by default.
- Migration code must still preserve genuinely unscheduled data as `schedule.type = "none"`.

---

## Date input policy

HTML date inputs need a concrete value or an empty string.

Rules:

- dated task -> input value is `schedule.date`
- unscheduled task -> input value is `""`
- saving an empty date input should create `schedule.type = "none"`
- saving a non-empty date input should create `schedule.type = "date"`

Do not fill an empty date input with today unless the user is creating a new task and the product intentionally chooses today as the default.

---

## New task creation policy

For now, the current prototype can keep defaulting newly created tasks to today's date.

However, creation logic should be written as an explicit product decision:

```js
const defaultSchedule = makeScheduleDate(todayISO());
```

not as an accidental side effect of `normalizeDate(undefined)`.

Later, root task creation may default to unscheduled if that feels better for the product.

---

## Storage policy

Do not rename the localStorage key in this migration.

Current write target remains:

```text
quest-sticky-todo-v10
```

Recommended saved shape during transition:

```js
{
  tasks: {
    [id]: {
      id,
      title,
      parentId,
      x,
      y,
      targetAt,   // legacy compatibility
      schedule,   // new source of truth
      status,
      branchMode
    }
  },
  showLanes: true
}
```

A later migration may introduce a new key such as:

```text
cherry-todo-v1
```

That should be a separate issue because it needs backup and rollback behavior.

---

## Backward and forward compatibility

### Backward compatibility

Old data with only `targetAt` must still load.

### Forward compatibility

New data with `schedule` should still be understandable by older code as much as possible during the transition.

This is why dual-write is useful for dated tasks.

Limitation:

- Older code cannot understand unscheduled tasks properly.
- That is acceptable once the migration PR clearly changes the app model.

---

## Implementation checklist

- [ ] Add schedule helper functions.
- [ ] Add task normalization after loading localStorage.
- [ ] Keep old storage keys readable.
- [ ] Avoid `todayISO()` fallback during migration.
- [ ] Make `schedule` authoritative when it exists.
- [ ] Keep `targetAt` dual-written for dated tasks during transition.
- [ ] Update date lane calculations to use schedule helpers.
- [ ] Update task creation and editing to write schedule.
- [ ] Add manual test cases for old data, invalid dates, and unscheduled tasks.
- [ ] Document any remaining direct `targetAt` access.

---

## Manual test cases

### Old v10 data loads

Given localStorage contains tasks with only `targetAt`, the app should load them as dated tasks.

Expected:

- no console errors
- date lanes show the same dates as before
- saving preserves task data

### Missing targetAt does not become today

Given a task has no `targetAt` and no `schedule`, migration should produce `schedule.type = "none"`.

Expected:

- the task is classified as unscheduled
- the task does not create today's lane by itself

### Invalid targetAt does not become today

Given a task has `targetAt: "tomorrow"`, migration should produce `schedule.type = "none"`.

Expected:

- no crash
- no accidental today fallback
- task is treated as unscheduled

### Existing schedule wins

Given a task has both `targetAt` and a valid `schedule`, the schedule object should be authoritative.

Expected:

- `schedule.type = "none"` remains unscheduled even if `targetAt` has a date
- `schedule.type = "date"` uses `schedule.date`
- `schedule.type = "datetime"` uses `schedule.date` for date lanes and preserves `schedule.time`

### Empty date input creates unscheduled task

When editing a task and clearing its date input, saving should set:

```js
schedule: {
  type: "none",
  date: null,
  time: null
}
```

Expected:

- task stops appearing as dated
- task does not become today

---

## Acceptance conditions

A migration implementation is acceptable when:

- existing `quest-sticky-todo-v10` data still loads
- old `targetAt` tasks become `schedule.type = "date"`
- missing or invalid dates become `schedule.type = "none"`
- `todayISO()` is not used as a migration fallback
- new schedule data is authoritative over legacy `targetAt`
- dated tasks continue to work in date lanes
- unscheduled tasks are not silently treated as today
- the code has a clear path to remove direct `targetAt` dependency later
