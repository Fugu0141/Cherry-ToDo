# Cherry V2.0 Requirements Definition

Status: **Draft — requirements freeze candidate**  
Applies to: Cherry V2.0 redesign  
Issue traceability: `docs/v2/issues/OPEN_ISSUE_INVENTORY.md`

## 1. Purpose

Cherry V2.0 is a design-first rebuild intended to make future development faster, safer, and easier to reason about.

The V2 implementation must be assembled from reusable components with explicit contracts. Product behavior must not depend on script order, global monkey patches, hidden cross-module state, or UI code directly mutating persistence.

Normative terms:

- **MUST** — required for V2 correctness or product identity.
- **SHOULD** — expected unless an accepted ADR documents a better trade-off.
- **MAY** — optional.

## 2. Product definition

Cherry is a **flow-first task planning application**.

The primary user journey is:

```text
Create a goal or task
→ break it down
→ connect tasks into a visible flow
→ revise order and branches
→ add dates/times only where useful
→ execute from Board or List view
```

Cherry is not primarily a calendar, Gantt chart, whiteboard, or flat todo list. Calendar, canvas, and list concepts may support the task flow but must not replace it as the semantic center.

## 3. Product principles

### P-001 — Flow first, schedule second

Flow relationships and schedule are independent semantic concepts. Adding, hiding, or moving a visual element MUST NOT silently rewrite the other concept.

### P-002 — User intent is authoritative

Semantic data changes only through an operation whose meaning is clear to the user.

Examples:

- Hiding date lanes MUST NOT delete dates.
- Showing date lanes MUST NOT assign dates to undated tasks.
- Freehand movement MUST NOT reorder the flow.
- Flow reordering MUST NOT change dates/times.
- Cancelling a drag/drop MUST NOT leave canonical data in an intermediate state.

### P-003 — Composition instead of modes and patches

Independent capabilities SHOULD be represented by independent settings/components and composed together.

For example, freehand planning is produced by `date lanes hidden + auto layout off + optional annotations`; it is not a second incompatible workspace implementation.

### P-004 — Progressive disclosure

The next useful action SHOULD be visually strongest. Destructive, advanced, storage, import/export, and debugging actions SHOULD remain secondary until needed.

### P-005 — Desktop and mobile share semantics, not necessarily gestures

Desktop and mobile MUST execute the same application commands and preserve the same data invariants. They MAY use different interaction controllers and presentation surfaces.

### P-006 — Local-first and user-controlled

Cherry MUST remain usable without an account or network connection. Persistent browser storage is optional; an ephemeral in-memory session MUST remain possible.

### P-007 — Data safety before convenience

A failed parse, migration, import, persistence operation, or future synchronization attempt MUST NOT silently destroy the last readable workspace.

## 4. Core data requirements

### R-DATA-001 — Stable identities

Workspace, tab, task, flow-edge, and annotation entities MUST have stable unique IDs that survive save/load and native `.cherry` export/import.

### R-DATA-002 — Versioned documents

Persisted workspace documents MUST contain a `schemaVersion`. Every schema change MUST use an explicit, tested migration path.

### R-DATA-003 — Semantic/presentation separation

Task meaning, Flow relationships, Schedule, Board placement, View state, and Annotations MUST be represented separately. Board coordinates MUST NOT be used as hidden Task order, priority, date, or time.

### R-DATA-004 — Transactional mutations

Semantic mutations MUST be executed through named application commands/use cases. UI components MUST NOT directly mutate persisted/domain state.

## 5. Workspace, startup, and storage

### R-START-001 — Explicit startup state machine

Startup MUST decide the initial application state before mounting heavy Board UI.

Minimum states:

```text
booting
→ storage-policy decision when necessary
→ restoring OR start
→ workspace
→ recoverable-error when required
```

The Start view MUST NOT be implemented as a delayed overlay on a Board that has already initialized. Covers #87.

### R-START-002 — Context restoration

When a previously active workspace/tab can be safely restored, reload SHOULD reopen it. Invalid or missing context MUST fall back cleanly to Start without corrupting data. Preserves completed #88 behavior.

### R-STORAGE-001 — Repository abstraction

Application/domain code MUST access saved workspaces through a repository port. Direct `localStorage`/IndexedDB/file-system calls outside infrastructure adapters are forbidden.

At minimum V2 requires:

- an in-memory repository,
- a persistent browser repository,
- a migration/import path for supported V1 data.

### R-STORAGE-002 — Persistent-storage policy and consent

Before browser persistence is enabled, Cherry MUST explain what local persistence does and provide an explicit user choice. Choosing not to enable persistence MUST leave the app usable in an ephemeral session.

Settings MUST provide a way to disable persistent saving and clear locally persisted Cherry data. This is a product/privacy requirement; the documentation MUST NOT claim a specific law universally requires this behavior without separate legal review. Covers #92.

### R-WORKSPACE-001 — Multiple planning tabs

A workspace MUST support multiple named tabs/planning surfaces. Each tab MUST keep its own semantic content and Board settings. Active-tab restoration is session/workspace state, not a global singleton hidden in UI code.

### R-WORKSPACE-002 — Safe V1 transition

V2 MUST NOT reuse V1 runtime code merely for compatibility. Compatibility is implemented at the boundary through explicit readers/migrators.

Supported V1 `.cherry` data and any explicitly supported legacy browser data MUST either:

1. migrate into a validated V2 candidate document, or
2. fail with a clear non-destructive error.

## 6. Task and Flow requirements

### R-TASK-001 — Task entity

A Task MUST contain semantic work data only: identity, title/content, completion state, optional notes/metadata, optional schedule, appearance marker, and audit metadata. Board coordinates and connector rendering data MUST NOT live inside Task semantics.

### R-FLOW-001 — Explicit Flow edges

Task relationships MUST be represented by explicit directed Flow-edge entities rather than inferred from coordinates or encoded only through a Task `parentId`.

V2 distinguishes:

- **structural edges** — primary sequence/branch relationships used for executable flow, list grouping, and auto-layout,
- **reference/cyclic edges** — additional directed relationships that may form cycles without becoming recursive structural ownership.

### R-FLOW-002 — Semantic reordering

Users MUST be able to reorder an existing structural flow (for example `A → B → C` to `A → C → B`). Reordering MUST change Flow semantics and MUST NOT change Schedule or use Board coordinates as its source of truth. Undo MUST restore the prior relationship. Covers #80.

### R-FLOW-003 — Connect existing tasks

Users MUST be able to connect existing tasks through Flow commands with validation for self-links, duplicates, ownership, and structural invariants.

Desktop MAY use direct drag/drop with a preview. Mobile MUST use an interaction that does not conflict with normal task movement (for example selection + action sheet/target picker). Covers completed #71 and open #93.

### R-FLOW-004 — Cyclic/reference connections

Freehand-capable boards MUST support directed cyclic connections such as `A → B → C → A` without infinite recursion, app freeze, or corruption.

Cyclic/reference edges MUST NOT accidentally become input to structural traversal/auto-layout algorithms that require an acyclic structure. Self-links are out of scope for the first V2 implementation unless explicitly enabled later. Covers #82.

### R-FLOW-005 — Directional connector presentation

Flow connections SHOULD render direction clearly, including arrowheads or an equivalent directional affordance. Connector rendering MUST be replaceable and MUST consume Flow data rather than own it. Direction and edge type MUST remain understandable without relying on color alone. Covers #83.

### R-HISTORY-001 — Undo/redo at command boundaries

Create, update, delete, reconnect, reorder, schedule changes, Board movement, and annotation edits MUST participate in a shared history mechanism when the operation is user-visible and reversible.

History SHOULD store command-level inverse operations/patches rather than serializing the entire workspace for every pointer update.

## 7. Schedule, Board, and layout requirements

### R-SCHEDULE-001 — Explicit schedule value

Schedule MUST have an explicit discriminated form equivalent to:

```text
none
 date(YYYY-MM-DD)
 datetime(YYYY-MM-DD + local time/time-zone policy)
```

`none` means genuinely undated, not “today”. Time MUST NOT exist without a date. Date-only values MUST remain timezone-neutral.

### R-BOARD-001 — Composable Board settings

Date lanes, auto layout, and time guidance MUST be independent Board settings. At minimum these combinations are valid:

```text
lanes shown  + auto layout on
lanes shown  + auto layout off
lanes hidden + auto layout on
lanes hidden + auto layout off
```

No combination may silently create or delete Schedule data. Covers #69 and preserves #79 design intent.

### R-BOARD-002 — Manual placement is presentation state

With auto layout off, user positions are authoritative presentation data. With auto layout on, a Layout component MAY compute positions from structural Flow and Schedule. Switching settings MUST be explicit about whether a relayout will happen.

### R-BOARD-003 — Freehand composition

A freehand planning experience MUST be obtained by composing Board settings and optional capabilities, not by creating a second Task/Workspace model. Task-flow editing remains primary even when annotations are enabled. Covers parent #81.

### R-DROP-001 — Explicit drop intent and canonical-state safety

Dragging MUST operate on ephemeral interaction state until a drop target resolves to a valid intent.

Examples of intents:

- visual move only,
- assign/change date,
- connect to task,
- reorder flow,
- cancel/no-op.

Only the resulting application command may alter canonical data. A cancelled/invalid drop MUST discard the ephemeral placement.

Collapsed/completed date lanes MUST expose real hit geometry; hit testing MUST NOT rely on a card-center heuristic that can place a card visually beside one date while leaving another canonical Schedule. Covers #222.

## 8. Appearance and annotations

### R-APPEARANCE-001 — Goal importance marker

Users MUST be able to assign a small semantic importance/marker set to a top-level goal. Theme-specific color is a presentation mapping, not the stored meaning.

The UI MUST preserve selected/completed/destructive states and MUST NOT rely on color alone. The marker MUST survive persistence and native import/export. Covers #78.

### R-ANNOTATION-001 — Text annotations

Free-floating text boxes MUST be separate Annotation entities. Users can create, edit, move, resize, style within a small supported set, and delete them. They MUST NOT appear as Tasks in List/Schedule views. Covers #84.

### R-ANNOTATION-002 — Stroke annotations

Hand-drawn strokes MUST use Board coordinates and an explicit drawing interaction state. Point collection SHOULD be simplified/throttled so save/history payload does not grow without bound. Drawing MUST NOT compete with pan/task drag. Covers #85.

### R-ANNOTATION-003 — Annotation persistence/history

Supported annotations MUST survive reload and `.cherry` export/import and participate in Undo/Redo as logical operations.

## 9. Adaptive editor and mobile UX

### R-EDITOR-001 — One editor contract, adaptive presentation

Create/edit behavior MUST use one application-facing editor contract.

- Desktop SHOULD present a compact editor anchored near the source Task/toolbar when space allows, while keeping Board context visible.
- Mobile MAY present the same fields/commands through a bottom sheet or touch-safe panel.
- A fallback centered dialog is allowed when placement constraints require it.
- Keyboard confirmation/cancel behavior MUST be explicit on desktop.

Covers #33 without introducing separate desktop business logic.

### R-MOBILE-001 — Flow-first onboarding

First-time mobile UX MUST make starting a flow the dominant action. Import/export, storage details, deletion, OSS/community links, and advanced settings MUST use progressive disclosure. Covers #5 and #86.

### R-MOBILE-002 — Flow-preserving Board/List views

Mobile Board and List views MUST preserve Flow meaning. List view MUST NOT degrade into an unrelated flat todo list; relationships/grouping and the next useful action must remain understandable.

### R-MOBILE-003 — Touch-safe contextual actions

Primary touch actions MUST have comfortable hit targets. Destructive actions SHOULD be behind a secondary action/menu. Hover-only discovery is forbidden for required mobile behavior.

### R-INTERACTION-001 — Single gesture owner

At most one interaction controller owns an active pointer/touch sequence. Task dragging, Board panning, connection creation, edge auto-scroll, annotation drawing, and text editing MUST NOT register competing handlers for the same session.

Edge auto-scroll is a service used by the active drag controller and updates scroll + dragged preview coherently. Covers #93 and remaining #5 drag/scroll concerns.

## 10. Interoperability requirements

### R-INTEROP-001 — `.cherry` is full-fidelity native format

`.cherry` MUST preserve all supported semantic and presentation data required to reconstruct a workspace. Serialization, validation/migration, and optional encryption MUST be separate replaceable components.

### R-INTEROP-002 — Transactional import pipeline

Import MUST parse, normalize, migrate, and validate a temporary candidate before replacing/adding user data. Failure leaves the current workspace untouched and returns a structured error/result summary.

### R-INTEROP-003 — ICS import adapter

A common `VEVENT` subset MUST be importable as Cherry Tasks with safe Schedule conversion. Recurrence MUST be bounded or explicitly skipped/reported; unbounded recurrence expansion is forbidden. External import SHOULD create a new tab by default unless the user explicitly chooses another destination. Covers #89.

### R-INTEROP-004 — CSV adapter

Cherry MUST support a documented CSV export and a safe simple CSV import. UTF-8 Japanese text, date/time validation, duplicate IDs, missing parents, and invalid relationships MUST be handled predictably. Full-fidelity backup remains `.cherry`, not CSV. Covers #89.

## 11. Future sync readiness

### R-SYNC-READY-001 — Sync-compatible local model

Initial V2.0 does not require hosted cross-device synchronization. However, the data model MUST preserve stable entity IDs, document revisions, update metadata, and a replaceable repository boundary so later sync does not require moving business rules out of browser-storage code.

The design MUST leave room for conflict/tombstone metadata and offline-first synchronization without making a network connection mandatory. Covers #90 at architecture-readiness level.

## 12. Internationalization, themes, and accessibility baseline

### R-I18N-001

User-facing strings MUST pass through an i18n boundary. Shared business logic MUST NOT contain Japanese/English UI strings.

### R-THEME-001

Light, dark, and system-theme presentation MUST remain readable. Semantic state MUST NOT be encoded by raw color values in domain data.

### R-A11Y-001

Required actions MUST be keyboard-accessible where applicable on desktop and touch-accessible on mobile. Critical meaning MUST NOT rely only on color or hover.

## 13. Non-functional requirements

### NFR-ARCH-001 — Modular contracts

Every module MUST expose a documented public API. Cross-module imports into another module's internal files are forbidden.

### NFR-ARCH-002 — Dependency direction

Domain code MUST NOT depend on Browser APIs, UI frameworks, storage engines, import parsers, or concrete adapters. Application use cases depend on domain types and ports. Infrastructure implements ports. Presentation depends on application-facing contracts.

### NFR-ARCH-003 — Replaceability and testability

Storage, clocks, ID generation, file codecs, importers/exporters, and platform capabilities MUST be injectable/replaceable in tests and composition.

### NFR-ARCH-004 — No hidden global mutation

V2 MUST NOT use global function replacement/monkey patching as a feature integration mechanism.

### NFR-PERF-001 — Startup work budget by architecture

The Start view MUST NOT initialize Board layout/rendering, annotation canvas, or other heavy workspace-only capabilities before a workspace is selected/restored. Performance measurements SHOULD be added before implementation freeze; optimization targets must be based on a documented reference environment rather than guessed numbers.

### NFR-QUALITY-001 — Requirement traceability

Every MUST-level requirement implemented in V2 MUST map to one or more automated or explicitly documented manual acceptance tests.

### NFR-QUALITY-002 — Regression first

A reported reproducible bug SHOULD receive a focused regression test at the lowest practical layer before or with its fix. #222 is the first mandatory regression fixture for the V2 drag/drop geometry rules.

### NFR-DATA-001 — Non-destructive migration

No migration/import may overwrite the last readable user document before the migrated candidate passes schema and invariant validation.

## 14. Out of scope for initial V2 implementation

Unless later moved into scope by an accepted requirement change:

- hosted account/authentication backend,
- real-time multi-user collaboration,
- full Miro-compatible drawing/shape suite,
- unbounded recurrence expansion,
- self-loop Flow edges,
- arbitrary plugin execution,
- V1 release checklist #66.

## 15. Requirements freeze exit criteria

Requirements may be frozen when:

1. every currently open Issue has a disposition,
2. every in-scope Issue maps to requirement IDs,
3. product principles contain no unresolved contradiction,
4. V1 compatibility boundaries are explicit,
5. basic design assigns every requirement to an owning module,
6. test strategy can verify the MUST-level acceptance criteria.
