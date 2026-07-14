# Startup State Manual Test Matrix

Related issue: #87

This document covers the first compatibility slice of Cherry's explicit startup-state work.

## Expected startup states

```text
booting
→ storage-choice | start | workspace
→ fatal-recovery (only when startup cannot finish)
```

The boot shell must be the only visible application surface while Cherry decides which real surface is safe to show.

## Test cases

### 1. First visit / no storage decision

1. Clear `cherry-storage-consent-v1`.
2. Reload Cherry.
3. Confirm the storage-choice dialog appears before any board or Start-page flash.
4. Choose **Use only this time**.
5. Confirm the real Start page replaces the boot shell.
6. Confirm creating a new tab opens a usable empty board.

### 2. Persistent mode with no restorable context

1. Set storage mode to persistent.
2. Remove `cherry-session-context-v1`, or set `lastRoute` to `start`.
3. Reload Cherry.
4. Confirm the boot shell is shown first.
5. Confirm the real Start page appears without a board flash.

### 3. Valid workspace restoration

1. Use persistent mode.
2. Create at least two tabs and open the second tab.
3. Leave Cherry while the workspace route is active.
4. Reload.
5. Confirm the boot shell is shown while restoration is checked.
6. Confirm the last active tab appears directly.
7. Confirm the Start page does not flash over the board.

### 4. Stale or corrupt restoration metadata

1. Keep a valid saved workspace.
2. Change `activeTabId` in `cherry-session-context-v1` to a missing tab, or store invalid JSON.
3. Reload.
4. Confirm Cherry falls back to the Start page.
5. Confirm the existing workspace data is still available and unchanged.

### 5. Startup failure containment

1. Temporarily block one of the required release-prep scripts.
2. Reload and wait for the recovery state.
3. Confirm the boot shell remains visible instead of exposing a half-mounted board.
4. Confirm the reload action is available.
5. Confirm no storage-clearing action is performed.

### 6. Mobile viewport

Repeat cases 1–4 below 780 px width and confirm the boot shell remains readable without horizontal overflow.
