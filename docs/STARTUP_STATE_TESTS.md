# Startup State Manual Test Matrix

Related issues: #87, #88, #92

This document defines the focused manual regression matrix for Cherry's explicit startup boundary, storage-mode choice, and active-context restoration.

The broader release checklist remains in [`MANUAL_TEST_CHECKLIST.md`](MANUAL_TEST_CHECKLIST.md). These cases should be run whenever startup, storage, workspace restoration, or the Start page changes.

## Expected startup states

```text
booting
→ storage-choice | start | workspace
→ fatal-recovery (only when startup cannot finish)
```

While Cherry is in `booting`, the startup surface must remain the only visible application surface. The selected final surface may prepare behind it, but unfinished Start, board, list, or storage-choice UI must not flash in front of the startup surface.

The transition rule is:

```text
show one startup surface
→ prepare the selected final surface behind it
→ confirm the final surface is ready
→ reveal it once
```

## Test cases

### 1. First visit / no storage decision

1. Clear `cherry-storage-consent-v1`.
2. Reload Cherry.
3. Confirm the startup surface appears first.
4. Confirm the storage-choice UI does not flash before the startup surface is ready to hand over.
5. Confirm no unfinished board or Start page becomes visible during loading.
6. Choose **Use only this time** / the ephemeral-session option.
7. Confirm the real Start page replaces the startup surface once.
8. Create a new tab and confirm a usable empty board opens.

### 2. Ephemeral session behavior

1. Start with no persistent-storage consent.
2. Choose the ephemeral-session option.
3. Create a tab and at least one task.
4. Confirm the current page session remains usable while the page stays open.
5. Reload the page.
6. Confirm ephemeral task/workspace data is not restored as persistent saved work.
7. Confirm Cherry returns to a valid startup flow instead of showing a blank or half-mounted screen.

### 3. Persistent mode with no restorable context

1. Choose persistent local storage.
2. Remove `cherry-session-context-v1`, or set `lastRoute` to `start`.
3. Reload Cherry.
4. Confirm the startup surface is shown first.
5. Confirm the real Start page appears without a board flash.
6. Confirm the Start page is interactive after the startup surface disappears.

### 4. Valid workspace restoration

1. Use persistent mode.
2. Create at least two tabs.
3. Open the second tab.
4. Leave Cherry while the workspace route is active.
5. Reload.
6. Confirm the startup surface stays visible while restoration is checked.
7. Confirm the last active tab appears directly.
8. Confirm the Start page does not flash over the board.
9. Confirm task data in both tabs remains intact.

### 5. Board/List view restoration

1. Use persistent mode with a valid workspace and active tab.
2. Switch to List view.
3. Reload.
4. Confirm the same tab is restored in List view.
5. Switch back to Board view.
6. Reload again.
7. Confirm the same tab is restored in Board view.
8. Confirm neither view briefly appears before the selected restored view.

### 6. Reload from Start page

1. Use persistent mode and create at least one workspace tab.
2. Open the Start page intentionally.
3. Reload.
4. Confirm Cherry restores the Start route rather than forcing the workspace open.
5. Confirm existing workspace data is still available from the Start page.

### 7. Stale active-tab metadata

1. Keep a valid saved workspace.
2. Change `activeTabId` in `cherry-session-context-v1` to an ID that does not exist.
3. Reload.
4. Confirm Cherry falls back safely to the Start page.
5. Confirm no placeholder tab is invented.
6. Confirm the existing readable workspace data is unchanged.

### 8. Corrupt session metadata

1. Keep a valid saved workspace.
2. Store invalid JSON in `cherry-session-context-v1`.
3. Reload.
4. Confirm Cherry falls back to a valid Start flow.
5. Confirm the existing readable workspace data is unchanged.
6. Confirm no uncaught startup error leaves a blank screen.

### 9. Startup surface continuity

Run the first-visit, Start-route, and workspace-restoration cases while watching the entire load sequence.

Confirm all of the following:

- only one startup surface is visible during `booting`
- the storage-choice dialog never appears above the startup surface before hand-off
- the Start page does not appear and then disappear before the workspace route
- the board does not flash before the Start route
- the final surface appears only once after readiness
- the startup surface fades as one whole layer rather than exposing intermediate layers
- no blank frame is visible between startup and the final surface

### 10. Startup failure containment

1. Temporarily block one of the scripts required for the selected startup route.
2. Reload and wait for the recovery state.
3. Confirm the startup/recovery surface remains visible instead of exposing a half-mounted app.
4. Confirm the reload action is available.
5. Confirm no storage-clearing action is performed automatically.
6. Restore the blocked script and confirm a normal reload succeeds.

### 11. Existing persistent data compatibility

1. Start with existing compatible Cherry prototype data in browser storage.
2. Reload after upgrading to the current startup implementation.
3. Confirm the startup boundary does not clear or replace readable task/workspace data.
4. Confirm the expected Start or workspace route is chosen from valid metadata.
5. Confirm task dates, status, branches, tabs, and the active view remain readable.

### 12. Mobile viewport

Repeat cases 1, 3, 4, 6, and 9 below 780 px width.

Confirm:

- the startup surface remains readable without horizontal overflow
- the loading/status UI stays inside the viewport and safe-area region
- the final mobile surface does not flash behind the startup surface
- the hand-off occurs once, just as on desktop

## Release evidence

For a release candidate, record:

- commit SHA tested
- browser and version
- desktop viewport
- mobile device or emulated viewport
- storage mode used for each case
- whether pre-existing persistent data was used
- console errors or warnings
- links to any blocking failures

Do not mark startup behavior as verified from code review alone.