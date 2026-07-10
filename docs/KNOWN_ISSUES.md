# Known Issues

This document tracks known limitations in the current Cherry prototype.

These are not all defects. Some are deliberate prototype tradeoffs that must be resolved before the architecture is stable enough for larger features.

The canonical product and architecture rules are in [`REQUIREMENTS.md`](REQUIREMENTS.md). Implementation order is defined in [`IMPLEMENTATION_PLAN.md`](IMPLEMENTATION_PLAN.md).

---

## Current limitations

### Startup is still assembled after the legacy board boot

The current application initializes the legacy board and then loads the Start page, workspace tabs, tutorial, and other release UI through later scripts.

Impact:

- The first screen is not controlled by an explicit startup state machine.
- Board work can happen before the user has chosen or restored a workspace.
- Startup behavior and performance depend on script order.
- A failure in a late-loaded script can leave partially initialized UI.

Planned direction:

- Implement the explicit `booting` / storage choice / Start / workspace / recovery states from #87.
- Mount the board only after a valid workspace route is selected.
- Restore active context through validated session metadata.

---

### Active workspace, tab, and view restoration is incomplete

Workspace tabs are persisted, but reload behavior does not yet implement the validated context-restoration contract required for v0.2.

Impact:

- Reload may not return users to the exact workspace, tab, and board/list state they expected.
- Missing or stale identifiers are not handled through a single recovery path.

Planned direction:

- Persist minimal session metadata separately from full workspace content.
- Validate workspace, tab, and view references before restoration.
- Fall back to the Start page without creating placeholder data or overwriting readable data.

Tracking: #88

---

### Persistence is coupled directly to `localStorage`

Several feature scripts still read and write browser storage directly.

Impact:

- Persistent local mode and ephemeral session mode are not cleanly separated.
- Storage-unavailable and quota-error behavior is inconsistent.
- Future file, backup, or sync providers cannot share a stable storage contract yet.
- Users are not yet offered a clear persistence choice at startup.

Planned direction:

- Introduce memory/session and local-browser storage adapters.
- Route feature code through a storage interface.
- Add transparent local-saving controls without making refusal block basic use.

Tracking: #92 and #6

---

### Schedule semantics still depend on legacy `targetAt` compatibility

The prototype includes schedule normalization helpers, but existing behavior and persistence still support the older `targetAt` date string.

Target model:

```js
schedule: {
  type: "none" | "date" | "datetime",
  date: string | null,
  time: string | null
}
```

Impact:

- Date-only and datetime behavior are not fully separated.
- Some UI and layout paths may still read legacy values directly.
- Undated behavior requires continued regression testing so missing dates never become today.
- Date-lane visibility and automatic layout are not yet normalized as independent board settings.

Planned direction:

- Keep valid existing data readable through explicit migration.
- Make schedule helpers authoritative in board, list, create/edit, import/export, tab duplication, and mobile code.
- Separate schedule data from date-lane visibility and board coordinates.

Tracking: #79

---

### Structural flow order and edges are not yet explicit

The current `parentId` / `branchMode` representation combines hierarchy, connection, and ordering.

Impact:

- Reordering a flow cannot be represented independently from layout behavior.
- Reliable directional/reference connectors and safe cycles require a clearer edge model.
- Import/export and future synchronization cannot depend on a stable structural order yet.

Planned direction:

- Introduce shared structural selectors.
- Add explicit stable order for structural children.
- Migrate to serialized structural edges before adding reference-edge cycles.

Tracking: #80, followed by #83 and #82

---

### Compatibility and fix-layer scripts make behavior harder to reason about

The current app loads many scripts after `app.js` to patch or extend behavior, including a release-preparation loader that dynamically adds more modules.

Impact:

- Behavior depends on script order and shared globals.
- Contributors must inspect multiple files to understand one interaction.
- A new feature can accidentally replace or duplicate existing handlers.
- Refactoring and automated testing are difficult.

Planned direction:

- Move startup, storage, state, commands, history, events, views, and tools behind named module contracts.
- Use one documented legacy bridge during migration instead of adding broad runtime overrides.
- Extract one coherent responsibility per pull request.

Tracking: #6

---

### Same-day layout is still basic

Tasks with the same date use relationship-aware spacing, but dense same-day flows can still consume too much space or become visually list-like.

Impact:

- A date with many tasks can grow excessively.
- Same-day child flows are not always grouped as strongly as intended.
- Dense branches can make link routing and date labels harder to read.

Planned direction:

- Preserve same-flow and branch relationships inside a same-day work area.
- Improve grouping without making board coordinates become semantic order.
- Keep date targeting predictable when a lane expands.

---

### Mobile interactions need a dedicated flow-first redesign

The current mobile UI includes a vertical board, action dock, bottom sheets, collapsed list controls, and a Flow Map. It is usable as a prototype, but it still inherits parts of the desktop interaction model.

Impact:

- Dragging and scrolling can conflict.
- Some controls and information compete for limited space.
- Existing-task connection is desktop-only.
- Desktop edge scrolling must not simply be copied onto touch input.

Planned direction:

- Redesign mobile around selecting a task and exposing only the next relevant actions.
- Define a touch-safe existing-task connection flow.
- Keep normal card movement distinct from connection gestures.
- Continue reducing low-priority information and oversized modal flows.

Tracking: #5, #86, and #93

---

### iCalendar interoperability is intentionally limited

The prototype can import/export basic iCalendar VTODO data, but this is not a complete semantic round trip for Cherry workspaces.

Impact:

- Cherry-only flow relationships, tab structure, board positions, annotations, and some status/schedule details may not survive ICS conversion.
- Calendar files are plain text and are not encrypted like `.cherry` files.
- CSV support and a stable importer/exporter registry do not exist yet.

Planned direction:

- Clearly label ICS as a compatibility export/import rather than a full backup.
- Stabilize task, schedule, edge, and workspace schemas before expanding interoperability.
- Add import/export adapters behind a registry after the core contracts are stable.

Tracking: #89

---

### Encrypted `.cherry` files depend on the passphrase

Workspace backups use password-based encryption. The passphrase is not stored or recoverable by Cherry.

Impact:

- A forgotten passphrase makes the exported file unrecoverable.
- Import failure messages cannot distinguish every wrong-passphrase or corrupt-file case.
- The current format is prototype version 1 and will require explicit migrations if it changes.

Required user expectation:

- Treat `.cherry` as the full-workspace backup format.
- Store the passphrase safely.
- Test import before relying on an export as the only backup.

---

### Public demo and release checks still require manual verification

The README contains the intended GitHub Pages demo URL, but availability and behavior must be confirmed as part of each release checklist rather than inferred from repository contents.

Impact:

- A documentation-only review cannot prove deployment, browser behavior, mobile usability, storage compatibility, or console cleanliness.

Planned direction:

- Run [`MANUAL_TEST_CHECKLIST.md`](MANUAL_TEST_CHECKLIST.md) against the release commit.
- Record browser/version, viewport, import/export checks, console output, and blocking failures in #66.
- Publish/tag v0.1 only after the release evidence is recorded.

---

## When adding a known issue

Include:

- a short title
- affected area
- steps to reproduce, when it is a defect
- expected behavior
- actual behavior
- data-loss or migration risk
- whether it blocks the current implementation phase
- a linked GitHub issue when actionable

Do not use this file as a competing roadmap. Ordering belongs in `IMPLEMENTATION_PLAN.md`.