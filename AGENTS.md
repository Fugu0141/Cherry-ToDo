# AGENTS.md

This file defines repository-level instructions for coding agents working on Cherry.

Cherry is an open-source task-flow planning tool. Agents are expected to make small, reviewable, dependency-safe changes that preserve user data and the product's flow-first design.

## 1. Instruction priority

When instructions conflict, use this order:

1. The maintainer's explicit task for the current run.
2. `docs/REQUIREMENTS.md` for product rules and target architecture.
3. `docs/IMPLEMENTATION_PLAN.md` for implementation order, dependencies, and scope boundaries.
4. The relevant GitHub issue for detailed acceptance criteria and discussion.
5. Supporting specifications under `docs/`.
6. Existing implementation details and local conventions.

Do not silently violate the canonical requirements or implementation plan. If a requested change appears to conflict with them, identify the conflict clearly and make only the smallest safe progress that does not invent a new product or architecture decision.

## 2. Product principles that must not drift

Every change must preserve these principles:

- Flow first, schedule second.
- User intent wins.
- Mobile is designed separately from desktop.
- Data safety over cleverness.
- Progressive disclosure over feature-list UI.
- Direct manipulation should have predictable consequences.
- Local-first usage must remain possible.
- Internal behavior should move toward named modules and stable contracts, not undocumented global replacement.

In particular:

- Do not infer semantic task order, priority, date, or time from board coordinates alone.
- Hiding date lanes must not delete schedule data.
- Showing date lanes must not assign fake dates to undated tasks.
- Reordering flow must not silently change schedule data.
- Freehand movement must not silently rewrite semantic flow data.
- Mobile interactions must not be implemented by blindly reusing desktop pointer behavior.

## 3. Autonomous work protocol

When the task is broad, such as "continue development", "work through issues", or "pick the next task":

1. Inspect the current default branch and repository state.
2. Inspect open pull requests before starting new implementation work.
3. If an unfinished agent/Codex PR already covers the next dependency-safe task, continue or repair that PR instead of creating a duplicate.
4. Read `docs/IMPLEMENTATION_PLAN.md` and choose the earliest incomplete dependency-safe unit of work.
5. Read the target issue and relevant supporting docs before changing code.
6. Implement exactly one coherent responsibility unless the maintainer explicitly asks for a larger combined task.
7. Run the most relevant available checks.
8. Open or update a Draft PR by default and report remaining manual checks and risks.

Do not start a dependent feature merely because its issue looks easy. Dependency order is part of correctness in Cherry.

## 4. Design and parent issues are not automatic implementation tickets

Some issues intentionally describe a broad design direction or parent workstream. Do not treat them as permission to implement every idea in one PR.

Examples include broad architecture, mobile redesign, freehand/canvas parent work, flow-model design, and future sync design.

For a design/parent issue:

- Read its child issues and dependency notes.
- Implement only a clearly defined child or phase with settled acceptance criteria.
- If a required product or schema decision is still unresolved, document the decision needed instead of guessing.
- Do not turn a parent issue into a mega-PR.

## 5. One responsibility per PR

A PR should normally do one of the following:

- add or clarify one model/migration,
- extract one coherent module without changing behavior,
- implement one focused feature,
- fix one interaction/performance problem,
- add focused regression coverage,
- update canonical documentation.

Avoid mixing schema migration, UI redesign, unrelated cleanup, and architecture refactoring in the same PR unless they are genuinely inseparable.

Keep diffs small enough that a maintainer can understand the reason for every changed file.

## 6. Core and legacy migration rules

Cherry is incrementally moving behavior out of legacy runtime code into `src/core` and explicit runtime bridges.

When touching state, history, commands, storage, workspace behavior, or cross-feature events:

- Prefer existing Core stores, selectors, commands, event buses, storage orchestration, workspace helpers, registries, and explicit bridges.
- Do not create a new broad monkey-patch layer that replaces several unrelated globals/functions.
- Do not reintroduce direct global mutation when an existing Core contract already covers the responsibility.
- Keep compatibility bridges narrow, named, documented, and removable.
- Preserve behavior while migrating responsibility; do not combine a large migration with unrelated UX changes.
- Avoid rewriting `app.js` wholesale merely to make it cleaner.

Legacy code may still be authoritative for behavior that has not migrated yet. Move one coherent responsibility at a time.

## 7. Storage, migration, and user-data safety

User data safety is a release requirement, not an optional cleanup concern.

- Existing saved workspaces must remain readable unless an explicit migration plan says otherwise.
- Preserve `.cherry` native workspace compatibility.
- Preserve the existing localStorage compatibility key `quest-sticky-todo-v10` unless the task explicitly includes a safe migration path.
- Never perform a destructive migration without a readable fallback or rollback strategy.
- A failed parse, migration, import, or storage operation must not silently overwrite the last readable workspace.
- Do not invent cloud/network requirements for features that are currently local-first.
- Import failures should leave the current workspace intact.
- New persisted fields need safe defaults for older data.

If a schema change is necessary, keep normalization and migration explicit and test old data paths.

## 8. Flow, schedule, layout, and view separation

Keep these responsibilities conceptually separate:

- Flow: semantic task relationships and order.
- Schedule: none/date/datetime data.
- Board layout: positions and automatic/manual placement.
- View helpers: lanes, guides, badges, minimaps, filters, and presentation state.

Do not use one layer as a hidden source of truth for another.

Examples of invalid shortcuts:

- using `x/y` as semantic order,
- assigning a date because a visual lane became visible,
- changing flow because a card was visually nudged,
- using title sorting as permanent structural order after explicit flow order exists.

## 9. Desktop and mobile interaction safety

Desktop and mobile may share commands and data models, but interaction controllers may differ.

For mobile work:

- Respect touch target sizes.
- Avoid competing pointer/touch handlers for the same gesture.
- Prefer one owner for a drag session.
- Keep task movement, board panning, and connection creation unambiguous.
- Do not rely on hover.
- Do not expose destructive actions as primary actions.

For desktop work:

- Preserve keyboard workflows where practical.
- Keep board context visible for contextual editing when the relevant design calls for it.
- Avoid adding desktop-specific behavior that changes the shared semantic model.

Always test both interaction families when a change touches shared behavior.

## 10. UI and language rules

- Keep task creation and the next useful action visually stronger than secondary tools.
- Keep destructive and low-frequency actions behind contextual or secondary UI where practical.
- Do not add persistent visual noise merely to expose every capability.
- Preserve light/dark/system theme readability.
- Do not rely on color alone for critical meaning.
- Use user-facing product language rather than internal graph terminology when possible.
- Update the existing i18n layer when adding user-facing strings; do not hard-code one language into shared UI.

## 11. Static deployment constraints

Cherry is currently a build-free static web application deployed through GitHub Pages.

Unless the task explicitly changes this architecture:

- Do not add a framework or mandatory build pipeline just for convenience.
- Do not add a runtime server requirement.
- Keep direct static hosting functional.
- Avoid dependencies that require secret credentials for basic app startup.
- Keep module loading compatible with the current static deployment approach.

A build-system or framework migration is an architecture decision, not incidental cleanup.

## 12. Testing and validation

Run the narrowest useful checks first, then broader checks when the change warrants them.

For JavaScript changes:

- Perform syntax/static checks available in the repository/environment.
- Add or update focused automated tests when changing pure Core logic or a regression that can be tested reliably.
- Do not introduce a heavyweight test/build system solely to validate one tiny patch unless the task is specifically about test infrastructure.

For user-facing/runtime changes, validate the relevant parts of `docs/MANUAL_TEST_CHECKLIST.md` and report anything that still needs human browser verification.

At minimum, consider regressions in:

- app startup and console errors,
- root and child task creation,
- edit/delete/done/todo,
- drag and date-lane movement,
- undo/redo,
- workspace/tab restore,
- localStorage compatibility,
- `.cherry` import/export,
- board and list views,
- desktop and mobile behavior when shared interaction code changed.

Do not claim a manual browser check passed if it was not actually performed.

## 13. Issue and PR hygiene

Before implementation:

- Confirm the target issue is still open/relevant.
- Check related issues and merged/open PRs for overlapping work.
- Avoid duplicate implementations.

Branch naming for agent-created branches should normally use:

```text
agent/<short-description>
```

PRs should:

- have one clear purpose,
- explain what changed and why,
- mention compatibility and migration impact,
- list automated checks performed,
- list remaining manual checks,
- mention the relevant issue when appropriate,
- remain Draft until the implementation is ready for maintainer review unless explicitly instructed otherwise.

Do not merge your own PR unless the maintainer explicitly asks for that merge in the current task.

Do not close broad parent/design issues merely because one child implementation landed.

## 14. Documentation discipline

When a change alters product rules, architecture, persisted schema, or dependency order, update the relevant canonical/supporting documentation in the same focused work or clearly identify the required follow-up.

Do not create a competing roadmap or source of truth.

Current hierarchy:

- `docs/REQUIREMENTS.md` = canonical product and target architecture.
- `docs/IMPLEMENTATION_PLAN.md` = canonical sequencing and dependency plan.
- GitHub issues = detailed acceptance criteria, discussion, and PR linkage.
- Other `docs/` files = supporting specifications, migration notes, manual tests, release notes, and historical context.

## 15. Stop conditions for autonomous agents

Stop implementation and report the blocker instead of guessing when:

- a required product decision is unresolved,
- two canonical rules materially conflict,
- the next issue depends on an unfinished prerequisite,
- a change would require destructive data migration without a defined recovery path,
- a mobile gesture would require competing ownership with existing drag behavior,
- the only apparent solution is another broad runtime monkey patch,
- a change would silently alter `.cherry` or localStorage compatibility outside scope,
- repository state indicates overlapping work that would make a second PR unsafe.

Stopping with a precise decision request is better than shipping an invented architecture.

## 16. End-of-run report

At the end of an autonomous development run, report:

- issue or PR handled,
- files/responsibility changed,
- tests/checks performed,
- manual checks still required,
- compatibility or migration impact,
- known risks,
- the next dependency-safe task, if applicable.

The goal is not maximum code output. The goal is safe, understandable progress through Cherry's dependency graph.
