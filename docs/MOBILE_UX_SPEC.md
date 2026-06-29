# Cherry-ToDo Mobile UX Spec

## Purpose

This document defines the mobile UI/UX direction for Cherry-ToDo.

The desktop board should not simply be squeezed into a phone screen. Mobile needs a different interaction model that preserves the same concept while reducing frustration.

---

## Current problem

The desktop board is powerful, but on a phone it can become hard to use:

- small cards
- difficult dragging
- scrolling and dragging conflict
- too much information at once
- date lanes and branches can become confusing

Mobile should feel lighter and more game-like.

---

## Mobile design principle

```text
PC版をそのまま縮小しない
PC版の考え方をスマホ操作へ落とし込む
```

Mobile should prioritize:

- quick checking
- easy completion
- simple task creation
- readable flows
- low stress touch operations

---

## Screen candidates

### 1. List-centered mode

Default mobile screen.

Shows:

- today
- upcoming
- unscheduled
- grouped by root task

Good for execution.

### 2. Root flow mode

Shows one root task and its branches at a time.

Good for understanding a project without showing the entire board.

### 3. Simplified board mode

A reduced board for users who still want visual layout.

Should avoid showing too much at once.

---

## Touch interactions

Suggested interactions:

```text
Tap       = select / open quick actions
Long tap  = start drag or open context menu
Drag      = move task when using a visible handle
Swipe     = complete / postpone only where safe
+ handle  = create child task
```

Avoid hidden gestures that users cannot discover.

---

## Input UI

Use bottom sheets for mobile creation and editing.

Good mobile input behavior:

- large fields
- large buttons
- no tiny close targets
- keyboard does not cover important controls
- task title is focused when appropriate

---

## Drag and scroll conflict

Dragging must not fight normal page scrolling.

Possible solutions:

- require a handle for drag
- use long press before drag starts
- lock scroll only after drag begins
- keep normal vertical scroll easy

---

## Layout direction

Mobile layout can use:

```text
y-axis = dates
x-axis = branches / tracks
```

But this should be reconsidered if it becomes hard to operate.

Alternative views may be better for phone use.

---

## Touch target guideline

Important controls should be easy to tap.

Avoid relying on tiny hover-only controls, because hover does not exist on touch devices.

---

## Implementation phases

1. Improve mobile readability.
2. Add bottom sheet for task creation/editing.
3. Add list-centered mobile mode.
4. Add root flow mode.
5. Redesign drag behavior with touch handles.
6. Revisit mobile board layout.

---

## Acceptance conditions

A mobile change is valid when:

- the user can create and complete tasks without zooming
- scrolling feels natural
- drag behavior is intentional, not accidental
- task hierarchy is still understandable
- the app does not feel like a broken desktop page
