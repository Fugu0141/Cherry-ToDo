# Cherry v0.1.0 Release Notes

Cherry v0.1.0 is the first public-prototype release candidate.

Cherry is an open-source task-flow planning app that organizes work as connected goals, actions, and branches instead of only a flat list. The focus of v0.1 is to make the core idea understandable and testable: build the flow first, then use dates and the execution list to find what needs attention.

The release must not be tagged only from code review. Complete [`MANUAL_TEST_CHECKLIST.md`](MANUAL_TEST_CHECKLIST.md) and record release evidence in issue #66 first.

## Highlights

- Create goal/task blocks and extend them as same-flow actions or branches.
- View parent-child relationships through board links and relationship-aware layout.
- Connect two existing tasks by dragging a connection handle on desktop.
- Use date lanes to schedule work without making dates the primary structure.
- Switch between the flow-building board and the execution list over the same task data.
- Group undated, due, and upcoming actions under their top-level goal/flow in the list.
- Edit tasks, change todo/done state, delete with confirmation, and undo supported actions.
- Use automatic and vertical layout commands.
- Start from a dedicated Start page and organize work across multiple workspace tabs.
- Open, rename, duplicate, delete, and create tabs from the Start page or tab rail.
- Use Japanese or English UI and system/light/dark themes.
- Learn the concept through the first-run introduction and interactive tutorial.
- Use mobile vertical board orientation, selected-task action dock, bottom sheets, and Flow Map/minimap.
- Scroll the desktop board automatically near an edge while moving or connecting tasks.
- Keep existing local data readable through compatibility storage keys.
- Export/import a full workspace as an encrypted `.cherry` file.
- Import/export basic iCalendar VTODO (`.ics`) data for compatibility.

## Workspace and file behavior

### Encrypted `.cherry` format

The `.cherry` file is the prototype full-workspace backup format. One file contains all workspace tabs and their Cherry state.

The current envelope uses:

- Format identifier: `cherry-workspace-encrypted`
- Version: `1`
- Encryption: AES-GCM
- Key derivation: PBKDF2 with SHA-256
- Random salt and IV for each export
- PBKDF2 iteration count: 250,000

The passphrase is required to import the file again. Cherry does not store or recover it. Test an import before relying on an export as the only backup.

### iCalendar VTODO (`.ics`)

ICS import/export is a compatibility feature, not a full Cherry backup.

- The file is plain text and is not encrypted.
- Basic task/date information can be exchanged as VTODO entries.
- Cherry-specific flow relationships, tabs, board positions, and other presentation state may not survive the conversion.
- Use `.cherry` when the whole workspace must be preserved.

## Known limitations

Cherry v0.1 remains an early prototype.

- Startup still mounts legacy application code before later Start-page and release modules finish loading.
- Active workspace/tab/view restoration is not yet implemented through the v0.2 validation contract.
- Persistence is still coupled directly to `localStorage`; an ephemeral session adapter and clear persistence choice are planned.
- Schedule behavior still supports legacy `targetAt` values while the normalized schedule model is completed.
- Structural flow order and serialized edges are not yet explicit.
- The codebase still depends on compatibility/fix layers and script order.
- Same-day dense flows can still become visually crowded.
- Mobile touch behavior is usable but not fully redesigned; existing-task connection remains desktop-only.
- The desktop create/edit experience is still dialog-based rather than a complete inline editor.
- ICS is lossy for Cherry-specific semantics.
- Browser-local data is not cross-device synchronization.

See [`KNOWN_ISSUES.md`](KNOWN_ISSUES.md) for the maintained limitation list and tracking issues.

## Required release checks

Before tagging `v0.1.0`, verify at minimum:

- clean startup and no console errors
- Start page and workspace tab operations
- Japanese/English and theme switching
- first-run introduction and tutorial
- goal/task creation, editing, branching, completion, deletion, and undo
- desktop existing-task connection and drag-edge scrolling
- date-lane and date-only timezone behavior
- board/list consistency
- mobile viewport, action dock, bottom sheets, and Flow Map
- legacy localStorage compatibility
- encrypted `.cherry` export/import with correct and incorrect passphrases
- basic `.ics` import/export behavior and plain-text warning
- intended GitHub Pages demo URL

Record the tested commit SHA, browser/version, viewport, console output, and every failure in issue #66.

## Upgrade notes

Existing local task data should continue to load from the legacy storage keys. The v0.1 workspace wrapper stores multiple tabs under `cherry-workspace-v1` while retaining the current task-state key for compatibility.

Do not delete or rewrite older readable data as part of release preparation. Future schema changes must use explicit migrations and preserve the last readable workspace when migration/import fails.

## Release stance

This is not the final task manager or the completed v0.2 architecture. It is a public prototype intended to show Cherry's flow-first direction and gather feedback on:

- whether task flows and branches are easier to understand than a flat list
- whether the execution list helps users find the next work
- whether date lanes support planning without taking over the product
- whether the Start page and workspace tabs are understandable
- whether mobile orientation and controls are usable
- whether local backup/import expectations are clear

Large startup, storage, schema, edge, mobile, and module changes belong to the ordered phases in [`IMPLEMENTATION_PLAN.md`](IMPLEMENTATION_PLAN.md).