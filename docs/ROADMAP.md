# Cherry Roadmap

This roadmap describes the current direction of Cherry. It is not a fixed promise; priorities may change as the project evolves.

---

## Phase 0: OSS migration and cleanup

Goal: make the repository understandable as a standalone open-source project.

- [x] Move the app from `Fugu0141.github.io/ToDo` to this repository.
- [x] Update visible branding to `Cherry`.
- [x] Add README, license, contribution guide, and code of conduct.
- [x] Move project specifications into `docs/`.
- [x] Add originality review notes.
- [x] Review remaining old internal names and keep only compatibility-related ones.
- [x] Confirm GitHub Pages deployment settings. See [#1](https://github.com/Fugu0141/Cherry-ToDo/issues/1).
- [x] Create initial issues for planned work.
- [x] Add a first-run welcome window for OSS introduction and community links. See [#44](https://github.com/Fugu0141/Cherry-ToDo/issues/44) and [`WELCOME_SPLASH_SPEC.md`](WELCOME_SPLASH_SPEC.md).

Notes:

- Old `quest-sticky-todo-*` storage keys are intentionally kept for localStorage compatibility until a dedicated migration is implemented.
- User-facing documentation and visible branding should continue to use `Cherry`.
- The repository name and GitHub Pages URL may still use `Cherry-ToDo`.
- The welcome splash uses a separate `cherry-todo-welcome-dismissed-v1` key and must not affect task storage compatibility.

Initial roadmap issues:

- [#1 Confirm GitHub Pages deployment settings](https://github.com/Fugu0141/Cherry-ToDo/issues/1)
- [#2 Design safe migration from targetAt to schedule model](https://github.com/Fugu0141/Cherry-ToDo/issues/2)
- [#3 Add execution-focused list view](https://github.com/Fugu0141/Cherry-ToDo/issues/3)
- [#4 Design same-day subflow layout](https://github.com/Fugu0141/Cherry-ToDo/issues/4)
- [#5 Improve mobile touch interactions](https://github.com/Fugu0141/Cherry-ToDo/issues/5)
- [#6 Plan codebase module separation](https://github.com/Fugu0141/Cherry-ToDo/issues/6)
- [#44 Add first-run welcome window](https://github.com/Fugu0141/Cherry-ToDo/issues/44)

---

## Phase 1: Stabilize the prototype

Goal: make the current implementation easier to test and maintain.

- [ ] Check desktop behavior after repository migration.
- [ ] Check mobile behavior after repository migration.
- [ ] Verify localStorage compatibility.
- [x] Document known bugs.
- [ ] Reduce fragile fix-layer behavior where possible.
- [x] Add a simple manual test checklist.

New support docs:

- [`MANUAL_TEST_CHECKLIST.md`](MANUAL_TEST_CHECKLIST.md)
- [`KNOWN_ISSUES.md`](KNOWN_ISSUES.md)
- [`WELCOME_SPLASH_SPEC.md`](WELCOME_SPLASH_SPEC.md)

---

## Phase 2: Schedule model

Goal: separate schedule intent from the current `targetAt` date string.

Tracking issue: [#2](https://github.com/Fugu0141/Cherry-ToDo/issues/2)

Planned model:

```js
schedule: {
  type: "none" | "date" | "datetime",
  date: string | null,
  time: string | null
}
```

Tasks:

- [x] Design migration from `targetAt`. See [`SCHEDULE_MIGRATION_PLAN.md`](SCHEDULE_MIGRATION_PLAN.md).
- [ ] Add unscheduled task support.
- [ ] Add date-only and datetime states.
- [ ] Update date lane rendering.
- [ ] Update task creation and editing UI.

---

## Phase 3: List view

Goal: add an execution-focused view.

Tracking issue: [#3](https://github.com/Fugu0141/Cherry-ToDo/issues/3)

- [ ] Show today's tasks.
- [ ] Show upcoming tasks.
- [ ] Show unscheduled tasks.
- [ ] Group child tasks by root task.
- [ ] Allow quick done / todo toggle.
- [ ] Keep the board and list views consistent.

---

## Phase 4: Layout redesign

Goal: make task flow easier to read as the board grows.

Tracking issue: [#4](https://github.com/Fugu0141/Cherry-ToDo/issues/4)

- [ ] Preserve root subtrees during layout.
- [ ] Reduce excessive vertical or horizontal growth.
- [ ] Improve collision handling.
- [ ] Add same-day subflow layout.
- [ ] Better distinguish same-day and cross-day edges.

---

## Phase 5: UX and mobile improvements

Goal: make the app feel lighter and more direct.

Tracking issue: [#5](https://github.com/Fugu0141/Cherry-ToDo/issues/5)

- [ ] Replace simple creation modals with contextual popups where appropriate.
- [ ] Add safer delete confirmation.
- [ ] Add mobile bottom sheets.
- [ ] Improve touch targets.
- [ ] Reduce scroll/drag conflicts on mobile.
- [ ] Add mobile Flow Map minimap for board navigation. See [#38](https://github.com/Fugu0141/Cherry-ToDo/issues/38) and [`MOBILE_FLOW_MAP_SPEC.md`](MOBILE_FLOW_MAP_SPEC.md).
- [ ] Add a way to reopen the welcome / about window after first dismissal.

---

## Phase 6: Codebase cleanup

Goal: make the project easier for contributors.

Tracking issue: [#6](https://github.com/Fugu0141/Cherry-ToDo/issues/6)

- [ ] Split `app.js` into smaller modules.
- [ ] Move storage logic into a storage module.
- [ ] Move layout logic into layout modules.
- [ ] Move rendering logic into render modules.
- [ ] Move interactions into interaction modules.
- [ ] Keep migration code explicit and documented.
