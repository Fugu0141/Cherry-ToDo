# Cherry-ToDo Project Progress

> **Status: Historical snapshot / superseded**  
> This file records project state from the early prototype period. It is preserved for context, not used as the current work queue.  
> Use [`../IMPLEMENTATION_PLAN.md`](../IMPLEMENTATION_PLAN.md), current issues, and current pull requests for active work.

This file records the development state that was used so maintainers and AI assistants would not lose context between sessions.

---

## Working rules

- Do not merge, close, reopen, mark ready for review, or convert a draft PR unless the maintainer explicitly asks for that state change.
- A draft PR means **intentionally not merge-ready**, even if GitHub says it is technically mergeable.
- Before starting the "next phase", check this file, open PRs, and open issues.
- Prefer branch + PR for changes. Do not push directly to `main` unless the maintainer clearly asks for it.
- PR descriptions should say whether the work is ready, parked, blocked, or waiting for manual testing.
- When a misunderstanding happens, record the correction here instead of relying on chat memory.

---

## Current snapshot at the time

Last updated: 2026-07-04 JST

| Item | Status | Meaning | Next action at the time |
| --- | --- | --- | --- |
| #50 Fix mobile layout date and action bar issues | Merged | Date-line default-date behavior, drag-link visual continuity, and mobile action-button hiding were fixed with a narrowed patch. The broad relationship-layout override was removed before merge. | Watch for regressions. Do not treat this as a fix for #51. |
| #51 Mapping / auto-layout branch readability | Open / unresolved | Current auto-layout could still produce confusing long trunks and branch placement. Previous broad patching made the system more fragile. | Diagnose against `same-day-layout.js` and core `branchLayout` before adding more layout overrides. |
| #54 Trigger GitHub Pages redeploy | Merged | Recovery-only PR for a stuck/delayed GitHub Pages deployment. It left no final repository diff. | Check Pages from the repository UI if deployment is still delayed. |
| #49 Add mobile Flow Map minimap | Merged | Mobile board overview idea: game-like minimap for understanding the task flow. | Keep regression checks because layout fixes can affect Flow Map links. |
| #45 Add simple first-run concept window | Draft | Parked intentionally at the time. | Keep it as a planned welcome/about feature until the maintainer decides timing. |
| #46 Fix timezone-safe date-only helpers | Merged | Bug-fix PR for timezone-safe date-only handling. Does not hard-code JST. | Keep regression checks in the manual checklist. |
| #47 Add project progress log | Merged | Added this project progress log and communication rules. | Preserve the history when replacing the work queue. |
| #37 Add Japanese README | Open / docs | Japanese documentation for Japanese users and community onboarding. | Create `README_ja.md` later. |
| #33 Redesign desktop task creation as inline side editor | Open / future UX | Reduce context switching by showing a compact editor near the task. | Implement separately from storage/schema work. |
| #6 Plan codebase module separation | Open / ongoing | Larger cleanup direction. | Avoid large refactors while behavior is still changing quickly. |

---

## Corrections recorded at the time

### 2026-07-03

- PR #45 was accidentally marked ready for review during phase progression.
- This was incorrect because #45 was intentionally left as draft by the maintainer.
- PR #45 was converted back to draft.
- New rule: do not change PR readiness/merge state unless the maintainer explicitly asks.

### 2026-07-04

- PR #54 was merged only to retrigger GitHub Pages deployment.
- PR #50 was merged after being narrowed to date targeting and interaction stability.
- The broad `relationship-layout-fix.js` auto-layout override made the layout system more fragile and was removed before #50 was merged.
- Dragging a block did not refresh existing branch links during pointer movement, so links could visually detach until the next render. #50 added a narrow live-link refresh for this.
- #51 remained unresolved at the time; auto-layout readability was not considered fixed.

---

## Product decisions recorded at the time

- Cherry-ToDo's core idea is **flow first, date second**.
- Task dates should be treated as calendar labels, not exact timestamps.
- Do not fix timezone behavior by hard-coding Japan time.
- The app should work naturally for users in any timezone.
- Date-only task values should remain plain `YYYY-MM-DD` strings.
- Dropping a task on a date line should open the date-change UI with that line's date + 1 day as the default.
- Relationship readability should win over packing tasks as tightly as possible.
- Avoid broad runtime patches that override multiple layout/rendering functions at once.
- Cherry should avoid turning the main board into a manual; documentation and welcome surfaces should stay lightweight.
- The mobile Flow Map should behave like a game minimap: orientation first, task text/detail second.

These principles are now consolidated and superseded where necessary by [`../REQUIREMENTS.md`](../REQUIREMENTS.md).

---

## Historical suggested work queue

1. Diagnose #51 separately from #50 by tracing core `branchLayout`, `same-day-layout.js`, and link rendering responsibilities.
2. After #51 is understood, implement a smaller layout fix or refactor the layout model instead of stacking another broad patch.
3. Keep #45 draft until the maintainer wants the first-run welcome window included.
4. Add Japanese README (#37) when documentation/community onboarding becomes the priority.
5. Resume module separation (#6) only after the layout/date behavior is stable.

This queue is historical and MUST NOT replace the current [`../IMPLEMENTATION_PLAN.md`](../IMPLEMENTATION_PLAN.md).