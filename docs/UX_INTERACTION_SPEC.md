# Cherry-ToDo UX Interaction Spec

## Purpose

This document defines interaction and UX direction for Cherry-ToDo.

The goal is to make task creation, editing, deletion, and same-day flow handling feel direct and low-friction.

---

## Main principle

Cherry-ToDo should feel like manipulating task cards directly, not filling out a database form.

Preferred behavior:

- actions happen near the object being edited
- large modals are reduced where possible
- dangerous actions still require confirmation
- keyboard shortcuts should feel natural
- mobile should use touch-first patterns

---

## Task creation

Current behavior uses a central modal.

Future direction:

- show a small popup near the creation point on desktop
- use a bottom sheet on mobile
- focus the task name input immediately
- allow quick confirmation with Enter
- allow cancel with Escape

Suggested keys:

```text
Enter = confirm
Esc   = cancel
Tab   = move between fields
Click outside = cancel or close, depending on context
```

---

## Task editing

Editing should support both quick edits and detailed edits.

Possible direction:

- double-click or selected action opens quick edit
- detailed edit can still use a larger panel/modal later
- date editing should clearly distinguish date, datetime, and unscheduled

---

## Delete confirmation

Deleting directly from a small button is risky.

Future direction:

- show a confirmation popup near the task
- clearly explain what happens to child tasks
- allow cancel easily

Possible child-task handling options:

- reconnect children to deleted task's parent
- delete subtree
- cancel

The current implementation reconnects children in a simple way. This behavior should be documented and made visible in UI later.

---

## Drag behavior

Dragging should feel predictable.

Rules:

- while dragging, the card should follow the pointer naturally
- snapping should not surprise the user
- date lane highlights should provide feedback before confirmation
- branch creation ghost cards should not snap while still being dragged

---

## Same-day display

Tasks with the same date should not lose their flow structure.

Bad direction:

```text
6/30
A
B
C
```

Better direction:

```text
6/30
A ───→ B
```

Branch example:

```text
6/30
     ┌→ B
A ───┼→ C
     └→ D
```

---

## Modal usage rule

Use large modals for:

- detailed edit screens
- destructive actions
- settings
- cases where the user needs to focus

Avoid large modals for:

- simple task creation
- quick rename
- simple date selection near a card

---

## Mobile interaction direction

Desktop interactions should not be copied directly to mobile.

Mobile should use:

- bottom sheets
- large touch targets
- long press only when necessary
- visible handles for drag/branch creation
- swipe actions only when they do not conflict with scrolling

See `MOBILE_UX_SPEC.md`.

---

## Acceptance conditions

A UX change is valid when:

- users can predict what will happen
- task relationships remain visible
- accidental deletion is harder
- mobile scrolling and dragging do not fight each other
- quick actions stay quick
