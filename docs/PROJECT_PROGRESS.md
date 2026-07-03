# Cherry-ToDo Project Progress

This file records the current development state so maintainers and AI assistants can avoid losing context between sessions.

Cherry-ToDo is still moving quickly, so this document should be treated as the first place to check before starting a new phase.

---

## Working rules

- Do not merge, close, reopen, mark ready for review, or convert a draft PR unless the maintainer explicitly asks for that state change.
- A draft PR means **intentionally not merge-ready**, even if GitHub says it is technically mergeable.
- Before starting the "next phase", check this file, open PRs, and open issues.
- Prefer branch + PR for changes. Do not push directly to `main` unless the maintainer clearly asks for it.
- PR descriptions should say whether the work is ready, parked, blocked, or waiting for manual testing.
- When a misunderstanding happens, record the correction here instead of relying on chat memory.

---

## Current snapshot

Last updated: 2026-07-03 JST

| Item | Status | Meaning | Next action |
| --- | --- | --- | --- |
| #45 Add simple first-run concept window | Draft | Parked intentionally. This should not be marked ready or merged yet. | Keep it as a planned welcome/about feature until the maintainer decides timing. |
| #46 Fix timezone-safe date-only helpers | Merged | Bug-fix PR for timezone-safe date-only handling. Does not hard-code JST. | Keep regression checks in the manual checklist. |
| #47 Add project progress log | Merged | Adds this project progress log and communication rules. | Keep this file updated when state changes. |
| #38 Add mobile Flow Map minimap | Implementation PR in progress | Mobile board overview idea: game-like minimap for understanding the task flow. | Test the Flow Map PR before merge. |
| #37 Add Japanese README | Open / docs | Japanese documentation for Japanese users and community onboarding. | Create `README_ja.md` later. |
| #33 Redesign desktop task creation as inline side editor | Open / future UX | Reduce context switching by showing a compact editor near the task. | Implement separately from storage/schema work. |
| #6 Plan codebase module separation | Open / ongoing | Larger cleanup direction. | Avoid large refactors while behavior is still changing quickly. |

---

## Recent correction

2026-07-03:

- PR #45 was accidentally marked ready for review during phase progression.
- This was incorrect because #45 was intentionally left as draft by the maintainer.
- PR #45 has been converted back to draft.
- New rule: do not change PR readiness/merge state unless the maintainer explicitly asks.

---

## Product decisions to preserve

- Cherry-ToDo's core idea is **flow first, date second**.
- Task dates should be treated as calendar labels, not exact timestamps.
- Do not fix timezone behavior by hard-coding Japan time.
- The app should work naturally for users in any timezone.
- Date-only task values should remain plain `YYYY-MM-DD` strings.
- Cherry-ToDo should avoid turning the main board into a manual; documentation and welcome surfaces should stay lightweight.
- The first-run welcome/about window is useful, but it does not need to be merged immediately.
- Donation/support and release notes entry points can stay planned or placeholder until their actual destinations are ready.
- The mobile Flow Map should behave like a game minimap: orientation first, task text/detail second.

---

## Communication checklist before starting work

When asked to continue development:

1. Check this progress file.
2. Check open PRs and identify which ones are draft, parked, ready, or blocked.
3. Check the related issue before changing scope.
4. State what will be changed and what will not be touched.
5. Do not alter PR state unless explicitly asked.
6. Update this file when the project state changes.

---

## Suggested next work queue

1. Keep #45 draft until the maintainer wants the first-run welcome window included.
2. Manually test the mobile Flow Map minimap implementation for #38.
3. If #38 is merged, continue mobile UX polish under #5.
4. Add Japanese README (#37) when documentation/community onboarding becomes the priority.
