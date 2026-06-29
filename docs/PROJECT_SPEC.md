# Cherry-ToDo Project Specification

## 1. Purpose

This document is the entry point for understanding Cherry-ToDo as an open-source project.

It explains the product goal, core concepts, current screens, task model, layout direction, and near-term development priorities so that contributors do not need to reverse-engineer the whole codebase before participating.

Related documents:

- `PRODUCT_VISION.md`
- `DATE_TARGET_SPEC.md`
- `LAYOUT_AND_SCHEDULE_SPEC.md`
- `UX_INTERACTION_SPEC.md`
- `MOBILE_UX_SPEC.md`
- `TECHNICAL_ARCHITECTURE.md`
- `ORIGINALITY_REVIEW.md`

---

## 2. Product overview

Cherry-ToDo is a sticky-note todo app for organizing work as a flow instead of a flat list.

A normal todo list treats tasks as separate rows:

```text
演習12ページ
演習13ページ
英単語
物理プリント
```

Cherry-ToDo treats tasks as connected work:

```text
数3ワーク
  ├ 演習12ページ
  │   └ 丸付け
  └ 演習13ページ
```

The core value is:

```text
やることの流れを作って、今日やることを見失わないToDoアプリ
```

---

## 3. Core concepts

### 3.1 Organize by flow

Tasks are not only independent items. They can be connected to parent tasks and shown as branches.

This makes it easier to see:

- why the task exists
- what it follows from
- where work branches
- what should happen next

### 3.2 Execute from a list

The board is useful for creating and understanding structure, but it can become heavy when the user only wants to know what to do now.

The intended screen roles are:

```text
Board view = create and understand task flow
List view  = check today's tasks and upcoming tasks
```

### 3.3 Flow first, dates second

Cherry-ToDo is not just a calendar app. Dates are important, but the main structure is the task flow.

```text
フローが主役
日付は補助軸
```

This means tasks should eventually support both scheduled and unscheduled states.

---

## 4. Terms

### Task

A unit of work managed by the user. In the current prototype, tasks are displayed as sticky-note style cards.

Main properties:

- title
- parent task
- target date / schedule
- status
- branch mode
- position

### Root task

A task with no parent.

In Cherry-ToDo, root tasks are closer to projects, tags, or large categories than to simple action items.

Examples:

```text
数3ワーク
英単語
物理プリント
文化祭準備
個人開発
```

### Child task / individual task

A task under a root task. These are usually the actual actions to do.

Examples:

```text
演習12ページ
英単語50個
プリント101番
READMEを修正する
```

### Branch

A connection from a parent task to a child task.

Cherry-ToDo uses branches to represent the flow of work.

### Same branch

A task that continues the main sequence from its parent.

```text
A → B → C
```

Current implementation: `branchMode: "same"`

### Branch task

A task that splits from the parent in another direction.

```text
A
├ B
└ C
```

Current implementation: `branchMode: "branch"`

### Date lane

A visual axis for target dates on the board.

- PC layout: dates progress left to right.
- Mobile layout: dates progress top to bottom.

### Unscheduled task

A task without a target date.

Important rule:

```text
日付なし = 未定
今日 = 今日
```

Unscheduled tasks must not be silently treated as today.

---

## 5. Screens

The intended product has at least these screens:

```text
1. Board view
2. List view
3. Mobile-friendly simplified views
```

### Board view

Current main screen.

Purpose:

- create root tasks
- extend branches
- see parent-child relationships
- arrange task flow
- understand target dates with date lanes
- drag tasks and update dates

Current features:

- root task creation
- task creation
- branch creation
- task editing
- task deletion
- done / todo toggle
- date lane toggle
- auto layout
- undo
- reset

### List view

Planned execution-focused screen.

Purpose:

- see what to do today
- see upcoming tasks
- see unscheduled tasks
- complete tasks quickly

Suggested display:

```text
Root task name
Individual task name    Due date
```

### Mobile views

Mobile should not simply shrink the desktop board.

Planned mobile directions:

- list-centered mode
- root-based flow mode
- simplified board mode
- bottom sheets for input
- touch-friendly long press, swipe, and handles

See `MOBILE_UX_SPEC.md`.

---

## 6. Current implementation notes

### Storage

The app currently saves task data in `localStorage`.

Current compatibility key:

```text
quest-sticky-todo-v10
```

This key may remain temporarily for migration compatibility even after the project was renamed to Cherry-ToDo.

### Date lane hit testing

Date hit testing separates:

```text
date:       date used for hot line display
targetDate: date used as the save candidate or modal default
```

This prevents boundary drops from showing one date but saving another unexpected date.

See `DATE_TARGET_SPEC.md`.

---

## 7. Priority roadmap

Current migration and development priorities:

1. Clean up repository branding and documentation.
2. Keep project specifications under `docs/`.
3. Add contribution and originality review documents.
4. Separate old compatibility patches from the core implementation.
5. Add unscheduled task support.
6. Prepare the schedule model: none / date / datetime.
7. Replace large modals with contextual popups where appropriate.
8. Add the first list view.
9. Redesign auto layout.
10. Improve same-day subflow display.
11. Improve mobile UI/UX.

---

## 8. Contribution readiness

Cherry-ToDo is being prepared for OSS collaboration.

Before large-scale contributions, the project should clarify:

- code structure
- accepted contribution scope
- issue labels
- PR review rules
- design direction
- what should not be copied from existing products

See `CONTRIBUTING.md` and `ORIGINALITY_REVIEW.md`.
