# Core Migration Regression Sweep

This is the focused integration checkpoint for the schedule/Core migration work that moved task creation, modal behavior, layout ownership, and persistence normalization out of late `schedule-model.js` overrides.

Use it after the ownership batch around PRs #244-#248 and again before retiring legacy `targetAt` compatibility.

## Required integrated browser checks

Run these as one connected scenario rather than isolated repetitions.

- [ ] Create a root task with no date and confirm it appears as undated.
- [ ] Create a child task from that flow and confirm its parent/branch relationship is correct.
- [ ] Give one task a date, then clear another task's date.
- [ ] Drag a dated task to another date lane and confirm the new date is kept.
- [ ] Trigger the boundary/date-change dialog once, cancel it, and confirm the original geometry and schedule are preserved.
- [ ] Use Undo after one schedule-affecting action and confirm the previous schedule state returns.
- [ ] Run Auto Layout and confirm dated and undated tasks remain readable without obvious overlap.
- [ ] Switch Board -> List -> Board and confirm dated/undated classification is unchanged.
- [ ] Reload and confirm task titles, parent relationships, branch modes, dates, and undated state all persist.
- [ ] Repeat one child-create or date-edit action at mobile width and confirm the same schedule intent is preserved.

## Deferred full-release matrix

These remain in `MANUAL_TEST_CHECKLIST.md` and do not need to be repeated for every Core-migration PR:

- all horizontal/vertical permutations
- all same-day multi-column permutations
- completed-date collapse combinations
- every mobile action-dock path
- encrypted `.cherry` import/export matrix
- full `.ics` round-trip matrix
- every legacy storage key

## Automated ownership guard

`test/core-migration-integration.test.mjs` protects the architectural boundary established by the migration:

- app-level task factory owns task/default-state construction
- app-level modal controller owns create/edit/date modal behavior
- Core runtime bridge owns command/history mirroring only
- `state-storage.js` owns persistence and requests normalization before serialization
- `schedule-model.js` owns schedule semantics and legacy compatibility, not UI/layout/persistence replacement
- schedule layout controller owns schedule-aware base layout
- date-target/date-modal layers cannot silently reclaim task-creation ownership
- script load order preserves those ownership boundaries

## `targetAt` status after this checkpoint

`targetAt` remains intentionally available as a legacy compatibility projection during the current storage phase. `schedule` is authoritative.

Do not remove the compatibility projection until all of the following are true:

1. active runtime readers no longer require direct `task.targetAt` access,
2. legacy writers no longer rely on assigning `task.targetAt` to change schedule intent,
3. old `quest-sticky-todo-v10` data still has an explicit migration path,
4. backward-compatible saved data is no longer required or a new storage-key migration is ready.

The next cleanup should therefore audit direct runtime `targetAt` reads/writes, not delete the compatibility accessor blindly.
