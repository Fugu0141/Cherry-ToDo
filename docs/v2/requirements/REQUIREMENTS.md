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
→ revise order, branches, and merges
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
- A change that would reopen already-completed Tasks MUST be previewed/confirmed before canonical mutation.

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

### P-008 — UI is a replaceable product component

Cherry Core/Application MUST remain usable independently of the standard V2 UI. V2.0 MUST define a formal presentation/UI contract so the standard UI can later be replaced by another compatible UI package without rewriting Task, Flow, Schedule, storage, migration, or history logic.

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

### R-STORAGE-002 — Explicit opt-in before persistent browser storage

Cherry MUST obtain explicit user permission before enabling or writing Cherry user data to persistent browser storage, including `localStorage`, IndexedDB, or an equivalent persistent browser store.

Before permission is granted:

- Cherry MUST operate through the in-memory repository,
- Cherry MUST NOT silently persist workspace/task data,
- the UI MUST explain what local persistence does and that the data remains on the device under the local-only implementation,
- the user MUST be able to choose **Allow** or **Not now**.

Choosing **Not now** MUST keep Cherry fully usable for the current session without persistence. A refusal MUST NOT be silently converted into consent.

After permission is granted, Cherry MAY persist the consent state and workspace data through the approved persistent adapter. Settings MUST provide a way to disable persistent saving and clear locally persisted Cherry data with an explicit destructive confirmation.

This is a product/privacy requirement; the documentation MUST NOT claim a specific law universally requires this behavior without separate legal review. Covers #92.

### R-WORKSPACE-001 — Multiple planning tabs

A workspace MUST support multiple named tabs/planning surfaces. Each tab MUST keep its own semantic content and Board settings. Active-tab restoration is session/workspace state, not a global singleton hidden in UI code.

### R-WORKSPACE-002 — Safe V1 transition

V2 MUST NOT reuse V1 runtime code merely for compatibility. Compatibility is implemented at the boundary through explicit readers/migrators.

Official V1 compatibility for V2 MUST cover supported native `.cherry` workspace files, including supported encrypted V1 `.cherry` envelopes. Legacy browser-storage recovery is best-effort and MUST remain non-destructive.

Supported V1 data MUST either:

1. migrate into a validated V2 candidate document, or
2. fail with a clear non-destructive error.

Legacy browser-storage data MAY be offered as a recovery path when a safe reader is practical, but failure to recover it MUST NOT block the V2 runtime.

## 6. Task and Flow requirements

### R-TASK-001 — Task entity

A Task MUST contain semantic work data only: identity, title/content, completion state, optional notes/metadata, optional schedule, appearance marker, and audit metadata. Board coordinates and connector rendering data MUST NOT live inside Task semantics.

### R-TASK-002 — Derived branching goals

Cherry MUST NOT require a separate persisted `goal` entity/type merely to represent a goal.

A standalone item is represented as one Task. A Task becomes a **derived branching goal** when it has two or more outgoing structural Flow connections. This goal meaning is derived from current Flow topology and MUST update when topology changes.

A Task with zero or one outgoing structural connection remains an ordinary Task for this rule, even if it is a root/top-level item.

### R-TASK-003 — Automatic completion and reopening of branching goals

When every structural task required by all outgoing branches of a derived branching goal has been completed, Cherry MUST automatically mark that parent goal complete.

The completion calculation:

- MUST use structural Flow only,
- MUST ignore reference/cyclic edges,
- MUST work for nested branches and structural merges,
- MUST de-duplicate shared descendants,
- MUST be deterministic and testable without UI code.

If Cherry automatically completed a branching goal and a required downstream structural Task later becomes incomplete, Cherry MUST automatically reopen that goal.

A goal that the user explicitly completed manually MUST NOT be silently reopened merely by the derived-goal evaluator. Automatic and manual completion intent MUST therefore remain distinguishable at the application/history level where needed.

### R-FLOW-001 — Explicit Flow edges and structural DAG

Task relationships MUST be represented by explicit directed Flow-edge entities rather than inferred from coordinates or encoded only through a Task `parentId`.

V2 distinguishes:

- **structural edges** — the primary acyclic task-flow graph used for execution, list/read models, goal derivation, and auto-layout,
- **reference/cyclic edges** — additional directed relationships that may form cycles without becoming part of the structural DAG.

The structural Flow MUST support both **branching** and **merging**. A Task MAY therefore have multiple incoming structural edges. Structural cycles remain forbidden.

### R-FLOW-002 — Semantic reordering

Users MUST be able to reorder an existing structural flow (for example `A → B → C` to `A → C → B`). Reordering MUST change Flow semantics and MUST NOT change Schedule or use Board coordinates as its source of truth. Undo MUST restore the prior relationship. Covers #80.

### R-FLOW-003 — Connect existing tasks

Users MUST be able to connect existing tasks through Flow commands with validation for self-links, duplicates, and structural invariants.

Desktop MAY use direct drag/drop with a preview. Mobile MUST also support connecting existing Tasks, but the concrete mobile gesture/UI is intentionally **not frozen yet**. The chosen mobile interaction MUST be prototyped separately and MUST NOT conflict with normal task movement, board pan/scroll, or edge auto-scroll. Covers completed #71 and open #93.

### R-FLOW-004 — Cyclic/reference connections

Freehand-capable boards MUST support directed cyclic connections such as `A → B → C → A` without infinite recursion, app freeze, or corruption.

Cyclic/reference edges MUST NOT accidentally become input to structural traversal/auto-layout algorithms that require an acyclic graph. Self-links are out of scope for the first V2 implementation unless explicitly enabled later. Covers #82.

### R-FLOW-005 — Directional connector presentation

Flow connections SHOULD render direction clearly, including arrowheads or an equivalent directional affordance. Connector rendering MUST be replaceable and MUST consume Flow data rather than own it. Direction and edge type MUST remain understandable without relying on color alone. Covers #83.

### R-FLOW-006 — Structural merge support

Cherry MUST support converging structural flows such as:

```text
A → C
B → C
```

and branch-then-merge flows such as:

```text
      ┌→ B ─┐
A ────┤     ├→ D
      └→ C ─┘
```

Layout, traversal, completion, history, import/export, and validation MUST treat the structural graph as a DAG rather than assuming a tree/forest with single-parent ownership.

### R-FLOW-007 — Explicit deletion scope with chain-limited downstream deletion

Deleting a Task that participates in structural Flow MUST ask the user to choose the destructive scope rather than silently guessing.

At minimum the UI MUST offer concepts equivalent to:

- **Delete this Task only** — remove the selected Task while preserving the surrounding Flow where a valid reconnection can be formed; root/leaf cases preserve the remaining Tasks without accidental cascade.
- **Delete this Task and its downstream Flow** — remove the selected Task and the following single unambiguous structural chain after confirmation.

For downstream Flow deletion, traversal MUST stop before the next structural junction. A junction is reached when the next Task is either:

- a merge point with two or more incoming structural edges, or
- a branch point with two or more outgoing structural edges.

The junction Task itself MUST be preserved. Deletion MUST NOT cross a branch/merge junction automatically or delete a Task that is shared by another structural path merely because one path was selected.

Delete operations MUST be transactional and undoable where practical.

### R-FLOW-008 — Merge targets are execution gates

A Task with two or more incoming structural edges is a merge execution gate.

A merge target MUST NOT be newly marked complete while one or more direct structural predecessor Tasks are incomplete.

Example:

```text
A ✓ ─┐
     ├→ C 🔒
B □ ─┘
```

`C` remains editable and schedulable, but completion is unavailable until `B` is also complete.

When all merge prerequisites become complete, the merge target becomes available for normal completion. It MUST NOT auto-complete merely because the gate opened.

The Application/Domain MUST enforce this rule even if a UI package incorrectly enables a completion control.

### R-FLOW-009 — Ordinary chains remain flexible; closed merge gates propagate blocking

A normal one-line structural Flow does not, by itself, create hard completion prerequisites. Cherry uses ordinary Flow primarily to show intended task order.

Therefore `A □ → B □ → C □` MUST NOT automatically lock `B` or `C` merely because `A` is incomplete.

However, when a Task lies structurally downstream of an unresolved merge execution gate, it MUST inherit that blocked completion state until the gate is resolved.

Example:

```text
A ✓ ─┐
     ├→ C 🔒 → D 🔒
B □ ─┘
```

Completing `B` opens the gate and makes both `C` and `D` available for normal completion.

Reference/cyclic edges MUST NOT create or propagate these structural execution locks.

Completion availability SHOULD be derived from the current structural DAG rather than persisted as an independently mutable `locked` flag.

### R-FLOW-010 — Completion invalidation requires impact planning and confirmation

If a status or structural Flow change would cause one or more already-completed Tasks to become invalid under the current merge-gate rules, Cherry MUST NOT silently mutate those completed Tasks.

Before canonical mutation:

1. Application MUST calculate the affected completion/blocked-state consequence set against a known document/graph revision.
2. Presentation MUST warn the user that completed Tasks will return to incomplete.
3. The user MUST be able to cancel with no canonical mutation.
4. On confirmation, the validated consequences MUST be committed transactionally with the initiating change where practical.

Example wording:

```text
この変更により、完了済みのタスクが未完了に戻ります。
続行しますか？
```

The same rule applies when invalidation is caused by:

- reopening a merge predecessor,
- connecting a new incomplete predecessor to a completed merge,
- rewiring completed Tasks behind a closed merge gate.

The resulting transaction MAY reopen affected auto-completed branching goals as required by `R-TASK-003`.

A stale consequence plan MUST be rejected or recomputed if the graph/document revision changed before commit.

### R-HISTORY-001 — Undo/redo at command boundaries

Create, update, delete, reconnect, reorder, schedule changes, Board movement, and annotation edits MUST participate in a shared history mechanism when the operation is user-visible and reversible.

History SHOULD store command-level inverse operations/patches rather than serializing the entire workspace for every pointer update.

Automatic goal-completion/reopening and confirmed merge-gate invalidation caused by one user command SHOULD be recorded as the same logical transaction where practical.

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

### R-BOARD-004 — DAG-aware layout

Auto-layout MUST accept structural branching and merging without duplicating canonical Task entities, entering recursive loops, or treating a merged Task as if it were independently owned by only one parent.

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

Users MUST be able to assign a small semantic importance/marker set to a **derived branching goal**. Theme-specific color is a presentation mapping, not the stored meaning.

The UI MUST preserve selected/completed/destructive states and MUST NOT rely on color alone. The marker MUST survive persistence and native import/export. If topology changes so the Task is no longer a branching goal, the persisted marker MUST remain safe and MUST NOT corrupt the model; Presentation decides whether it remains visible/editable. Covers #78.

### R-ANNOTATION-001 — Text annotations

Free-floating text boxes MUST be separate Annotation entities. Users can create, edit, move, resize, style within a small supported set, and delete them. They MUST NOT appear as Tasks in List/Schedule views. Covers #84.

### R-ANNOTATION-002 — Stroke annotations

Hand-drawn strokes MUST use Board coordinates and an explicit drawing interaction state. Point collection SHOULD be simplified/throttled so save/history payload does not grow without bound. Drawing MUST NOT compete with pan/task drag. Covers #85.

### R-ANNOTATION-003 — Annotation persistence/history

Supported annotations MUST survive reload and `.cherry` export/import and participate in Undo/Redo as logical operations.

## 9. Adaptive editor, mobile UX, and replaceable UI

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

### R-UI-001 — Formal UI package contract in V2.0

V2.0 MUST expose a formal presentation/UI contract and ship the standard Cherry UI as one implementation of that contract.

The contract MUST be based on stable application-facing concepts such as read models/selectors, intents/commands, interaction capabilities, localized strings/keys, and semantic presentation tokens. It MUST NOT expose Domain internals or require a specific rendering framework.

### R-UI-002 — Whole-UI replaceability

The composition root MUST be able to select/wire a compatible UI package without changing Domain/Application modules.

A replacement UI MUST be able to provide its own Start screen, Board, List, Task editor, desktop/mobile interaction surfaces, connector renderer, and visual theme while reusing the same application commands and data model.

V2.0 only needs to ship one production UI package, but the replacement boundary itself is a required V2.0 feature.

### R-UI-003 — Semantic styling boundary

The standard UI SHOULD expose stable semantic component/state hooks or tokens so visual redesigns do not require business-logic changes. Raw theme colors and framework-specific component types MUST NOT leak into Domain/Application public contracts.

## 10. Interoperability requirements

### R-INTEROP-001 — `.cherry` is full-fidelity native format

`.cherry` MUST preserve all supported semantic and presentation data required to reconstruct a workspace. Serialization, validation/migration, and optional encryption MUST be separate replaceable components.

### R-INTEROP-002 — Transactional import pipeline

Import MUST parse, normalize, migrate, and validate a temporary candidate before replacing/adding user data. Failure leaves the current workspace untouched and returns a structured error/result summary.

### R-INTEROP-003 — ICS import adapter

A common `VEVENT` subset MUST be importable as Cherry Tasks with safe Schedule conversion. Recurrence MUST be bounded or explicitly skipped/reported; unbounded recurrence expansion is forbidden. External import SHOULD create a new tab by default unless the user explicitly chooses another destination. Covers #89.

### R-INTEROP-004 — CSV adapter

Cherry MUST support a documented CSV export and a safe simple CSV import. UTF-8 Japanese text, date/time validation, duplicate IDs, missing relationships, and invalid Flow edges MUST be handled predictably. Full-fidelity backup remains `.cherry`, not CSV. Covers #89.

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

Blocked completion MUST be communicated with an accessible non-color-only explanation.

## 13. Non-functional requirements

### NFR-ARCH-001 — Modular contracts

Every module MUST expose a documented public API. Cross-module imports into another module's internal files are forbidden.

### NFR-ARCH-002 — Dependency direction

Domain code MUST NOT depend on Browser APIs, UI frameworks, storage engines, import parsers, or concrete adapters. Application use cases depend on domain types and ports. Infrastructure implements ports. UI packages depend on the application-facing UI/presentation contract.

### NFR-ARCH-003 — Replaceability and testability

Storage, clocks, ID generation, file codecs, importers/exporters, platform capabilities, and the UI package MUST be injectable/replaceable in tests and composition.

### NFR-ARCH-004 — No hidden global mutation

V2 MUST NOT use global function replacement/monkey patching as a feature integration mechanism.

### NFR-ARCH-005 — UI framework isolation

No UI framework type may appear in Domain/Application public contracts. A future UI package implemented with a different rendering technology MUST be able to consume the same application-facing contract.

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
- arbitrary plugin execution beyond the formal UI-package boundary,
- V1 release checklist #66.

## 15. Requirements freeze exit criteria

Requirements may be frozen when:

1. every currently open Issue has a disposition,
2. every in-scope Issue maps to requirement IDs,
3. product principles contain no unresolved contradiction,
4. V1 compatibility boundaries are explicit,
5. structural branch/merge semantics and derived-goal completion/reopening behavior are explicit,
6. chain-limited deletion semantics at branch/merge junctions are explicit,
7. merge execution-gate, downstream blocking, and invalidation-confirmation behavior are explicit,
8. the V2 UI package contract is accepted,
9. basic design assigns every requirement to an owning module,
10. test strategy can verify the MUST-level acceptance criteria.
