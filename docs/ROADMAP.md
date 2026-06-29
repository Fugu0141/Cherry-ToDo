# Cherry-ToDo Roadmap

This roadmap describes the current direction of Cherry-ToDo. It is not a fixed promise; priorities may change as the project evolves.

---

## Phase 0: OSS migration and cleanup

Goal: make the repository understandable as a standalone open-source project.

- [x] Move the app from `Fugu0141.github.io/ToDo` to this repository.
- [x] Update visible branding to `Cherry-ToDo`.
- [x] Add README, license, contribution guide, and code of conduct.
- [x] Move project specifications into `docs/`.
- [x] Add originality review notes.
- [ ] Review remaining old internal names and keep only compatibility-related ones.
- [ ] Confirm GitHub Pages deployment settings.
- [ ] Create initial issues for planned work.

---

## Phase 1: Stabilize the prototype

Goal: make the current implementation easier to test and maintain.

- [ ] Check desktop behavior after repository migration.
- [ ] Check mobile behavior after repository migration.
- [ ] Verify localStorage compatibility.
- [ ] Document known bugs.
- [ ] Reduce fragile fix-layer behavior where possible.
- [ ] Add a simple manual test checklist.

---

## Phase 2: Schedule model

Goal: separate schedule intent from the current `targetAt` date string.

Planned model:

```js
schedule: {
  type: "none" | "date" | "datetime",
  date: string | null,
  time: string | null
}
```

Tasks:

- [ ] Design migration from `targetAt`.
- [ ] Add unscheduled task support.
- [ ] Add date-only and datetime states.
- [ ] Update date lane rendering.
- [ ] Update task creation and editing UI.

---

## Phase 3: List view

Goal: add an execution-focused view.

- [ ] Show today's tasks.
- [ ] Show upcoming tasks.
- [ ] Show unscheduled tasks.
- [ ] Group child tasks by root task.
- [ ] Allow quick done / todo toggle.
- [ ] Keep the board and list views consistent.

---

## Phase 4: Layout redesign

Goal: make task flow easier to read as the board grows.

- [ ] Preserve root subtrees during layout.
- [ ] Reduce excessive vertical or horizontal growth.
- [ ] Improve collision handling.
- [ ] Add same-day subflow layout.
- [ ] Better distinguish same-day and cross-day edges.

---

## Phase 5: UX and mobile improvements

Goal: make the app feel lighter and more direct.

- [ ] Replace simple creation modals with contextual popups where appropriate.
- [ ] Add safer delete confirmation.
- [ ] Add mobile bottom sheets.
- [ ] Improve touch targets.
- [ ] Reduce scroll/drag conflicts on mobile.

---

## Phase 6: Codebase cleanup

Goal: make the project easier for contributors.

- [ ] Split `app.js` into smaller modules.
- [ ] Move storage logic into a storage module.
- [ ] Move layout logic into layout modules.
- [ ] Move rendering logic into render modules.
- [ ] Move interactions into interaction modules.
- [ ] Keep migration code explicit and documented.
