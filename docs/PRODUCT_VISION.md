# Cherry Product Vision

## Purpose

This document describes the intended direction of Cherry.

Cherry is not meant to be just another list-based todo app. Its goal is to help users make sense of work by arranging tasks as connected flows.

---

## Product statement

```text
やることの流れを作って、今日やることを見失わないToDoアプリ
```

Cherry should help users:

- break down a vague project into smaller actions
- connect tasks by order and dependency
- branch work when multiple paths appear
- see deadlines without making dates the only structure
- quickly find what should be done today

---

## Screen philosophy

```text
ボード画面 = 流れを作る・構造を見る場所
リスト画面 = 今日やること・期日が近いタスクを見る場所
```

The board and list should not compete with each other.

The board is for thinking and organizing.
The list is for execution.

---

## Root task philosophy

Root tasks are not normal action items.

They should primarily behave like:

- project names
- tags
- categories
- work themes
- section headings

Example:

```text
個人開発
  ├ READMEを書く
  ├ Issueを整理する
  └ GitHub Pagesを設定する
```

The root task gives context. The child tasks are the things the user actually does.

```text
Root task  = context / heading
Child task = executable action
```

In the list view, the root task should be shown as context while child tasks become the actual action items. Root tasks should not usually appear as rows with done / todo controls.

On the board, root tasks can still appear as cards because they are the visible starting points of flows.

---

## Schedule philosophy

Dates are important, but they should support the flow instead of replacing it.

Cherry should eventually support:

```js
schedule: {
  type: "none" | "date" | "datetime",
  date: "2026-06-30" | null,
  time: "18:30" | null
}
```

Rules:

- `none` means unscheduled.
- `date` means a day is set, but no specific time.
- `datetime` means both day and time are set.
- Unscheduled tasks must not be treated as today.

---

## Interaction philosophy

The app should feel light and direct.

Preferred direction:

- create tasks near where the user acts
- reduce large modal interruptions
- keep drag behavior predictable
- allow free movement during interaction
- align or snap only after confirmation when needed
- make mobile interactions touch-first, not desktop-shrunk

---

## Design direction

Cherry can use the metaphor of cherries and branches lightly:

- connected tasks as stems or branches
- small tasks as fruits or notes
- growth from root tasks

However, the app should not become decorative at the cost of usability.

Clarity comes first.

---

## Long-term goal

Cherry should become a small, understandable, open-source task planning tool that is easy to modify and friendly to contributors.

The ideal project is:

- simple enough to run as a static web app
- documented enough for new contributors
- flexible enough to grow into a better task management workflow
- original enough to stand apart from existing products
