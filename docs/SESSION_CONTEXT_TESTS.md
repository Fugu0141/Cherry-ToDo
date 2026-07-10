# Session Context Restoration Manual Tests

Use these checks for the Phase 1 active-context restoration work tracked by issue #88.

The session metadata is stored separately from workspace contents under:

```text
cherry-session-context-v1
```

The feature must never invent a missing tab or overwrite workspace data when restoration fails.

## Open workspace restoration

- [ ] Create at least two tabs.
- [ ] Open the second tab and leave the Start page closed.
- [ ] Reload the page.
- [ ] Confirm the second tab opens again.
- [ ] Confirm tasks, dates, links, and statuses are unchanged.

## Start page restoration

- [ ] Open the Start page intentionally.
- [ ] Reload the page.
- [ ] Confirm the Start page remains open.
- [ ] Confirm no tab is deleted, duplicated, or replaced.

## View restoration

- [ ] Open a valid tab and switch to the execution list.
- [ ] Reload the page.
- [ ] Confirm the same tab and list view are restored.
- [ ] Switch back to the board and reload again.
- [ ] Confirm the board view is restored.

## Invalid context fallback

- [ ] Open DevTools and edit `cherry-session-context-v1` so `activeTabId` references a missing tab.
- [ ] Reload the page.
- [ ] Confirm Cherry falls back to the Start page.
- [ ] Confirm no placeholder or fake tab is created.
- [ ] Confirm the workspace remains readable.

## Corrupted metadata fallback

- [ ] Replace `cherry-session-context-v1` with invalid JSON.
- [ ] Reload the page.
- [ ] Confirm Cherry opens safely on the Start page.
- [ ] Confirm no console error prevents normal use.

## Storage unavailable behavior

- [ ] Test in a browser mode where local storage writes fail or are blocked, when practical.
- [ ] Confirm Cherry remains usable for the current page session.
- [ ] Confirm failure to save session metadata does not block task editing.

## Import/export regression

- [ ] Export an encrypted `.cherry` workspace.
- [ ] Import it by both merge and replace modes.
- [ ] Confirm session restoration does not alter the imported workspace.
- [ ] Reload after opening an imported tab and confirm that tab restores normally.

Record browser, viewport, expected result, actual result, and console output for any failed check.
