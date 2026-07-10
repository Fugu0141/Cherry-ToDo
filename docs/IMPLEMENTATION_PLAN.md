# Cherry Implementation Plan

Status: **Canonical implementation plan**  
Last reviewed: **2026-07-10**  
Planning horizon: v0.1 stabilization, v0.2 foundation/features, v0.3+ architecture

This document translates the requirements in [`REQUIREMENTS.md`](REQUIREMENTS.md) and the current GitHub issues into an ordered implementation program.

It is the primary source of truth for **what should be implemented first, what depends on what, and which work must stay separate**.

GitHub issues remain the place for detailed acceptance criteria, discussion, and PR linkage. This plan determines sequence and scope boundaries.

---

## 1. Planning rules

### 1.1 Product direction is fixed before implementation detail

Every implementation must preserve:

```text
Flow first
Schedule second
User intent wins
Mobile is designed separately
Data safety over cleverness
```

### 1.2 Foundations before dependent features

Features that depend on unstable state, storage, flow, layout, or interaction behavior must not be implemented first as isolated runtime patches.

For example:

```text
Do not add cyclic connectors
before structural edges and traversal rules are explicit.

Do not add CSV round-trip
before the canonical task/schedule/edge schema is stable.

Do not redesign mobile connection gestures
by installing another pointer handler beside the current one.
```

### 1.3 One responsibility per PR

A PR should normally do one of the following:

- add/clarify a model or migration
- extract one coherent module without changing behavior
- implement one focused feature
- fix one interaction/performance problem
- update canonical documentation

Schema migration, UI redesign, and unrelated cleanup should not be combined unless inseparable.

### 1.4 No new broad patch layers

New work must not add broad runtime overrides that replace several existing functions.

A temporary compatibility adapter is allowed only when:

- its scope is narrow
- it is named as a bridge
- the removal phase is documented
- regression tests/manual cases exist

### 1.5 Issue status and plan status are different

An issue may remain open as a parent/design tracker even when parts are complete. The phase tables below state the implementation order; issue checkboxes should be updated as PRs land.

---

## 2. Issue grouping and consolidation

The current open issues describe six larger workstreams.

### A. Release baseline and documentation

- #66 — v0.1 public prototype checklist
- #76 — small alignment audit
- #77 — remove obsolete board guidance

### B. Core architecture, startup, and persistence

- #6 — module separation roadmap
- #87 — startup/start-screen architecture and performance
- #88 — restore active workspace/tab on reload
- #92 — local persistence transparency/consent
- #90 — future cross-device sync design

### C. Semantic task/flow/schedule model

- #79 — composable board settings and schedule behavior
- #80 — explicit same-branch flow order
- #78 — goal importance/color
- #69 — older no-date-lanes design

`#69` is conceptually superseded by the more complete composable-settings design in `#79`. It should be closed as superseded or converted into a checklist linked to #79 after maintainer review; it should not produce a separate incompatible “mode”.

### D. Board and canvas capabilities

- #81 — freehand canvas parent design
- #82 — loop/cyclic connections
- #83 — directional arrows
- #84 — free-floating text
- #85 — drawing annotations

`#81` is the parent. `#82`–`#85` are implementation children and must remain separate PRs.

### E. Mobile and interaction redesign

- #5 — mobile touch parent tracker
- #86 — first-user mobile flow-first redesign
- #93 — mobile existing-task connection and edge scrolling
- #33 — desktop inline editor

### F. Interoperability

- #89 — ICS import and CSV import/export

This depends on stable schedule, workspace, and flow schemas.

---

## 3. Dependency map

```text
v0.1 baseline (#66)
        ↓
Canonical requirements/docs (this PR)
        ↓
Startup + persistence boundary (#87, #88, #92)
        ↓
Core module seams / command-event foundation (#6)
        ↓
Schedule + board settings model (#79)
        ↓
Explicit structural flow order / edge foundation (#80)
        ↓
 ┌───────────────┬─────────────────┬──────────────────┐
 ↓               ↓                 ↓                  ↓
Mobile UX       Desktop editor     Import/export      Goal styling
#5 #86 #93      #33                #89                #78
        ↓
Directional/reference connector foundation (#83)
        ↓
Freehand/canvas children (#82, #84, #85 under #81)
        ↓
Future sync preparation/implementation (#90)
```

Some visual polish can proceed in parallel, but semantic and persistence dependencies must not be skipped.

---

## 4. Release strategy

### v0.1.x — Stable public prototype baseline

Purpose: preserve a known working baseline before architecture changes.

Required outcome:

- current core flow is testable
- known limitations are honest
- release/tag exists
- no large schema or architecture change is hidden in release prep

### v0.2.0 — Foundation release

Purpose: establish the semantic and architectural base for future features.

Expected core scope:

- clean startup route/state
- restore active context
- storage abstraction and persistence choice
- explicit core module seams
- schedule/board settings normalization
- explicit structural flow order foundation
- no requirement to finish every freehand/canvas feature

### v0.2.x — Focused feature releases

Purpose: add UX, interoperability, styling, and board capabilities on top of the stable foundation.

Possible increments:

- v0.2.1: mobile/start/list simplification
- v0.2.2: desktop inline editing and flow reordering UI
- v0.2.3: interoperability adapters
- v0.2.4: freehand connector/text foundation

Exact version numbering is flexible; dependency order is not.

### v0.3+ — External extension/sync maturity

Purpose:

- stable plugin API
- permission/trust policy for third-party plugins
- sync/backup provider architecture
- stronger automated testing and performance work

---

## 5. Phase 0 — Documentation reset and baseline freeze

Related: this documentation work, #66

### Goals

- Create one canonical requirements document.
- Create one canonical implementation plan.
- Define the role of every existing document.
- Stop using stale roadmap/progress files as competing sources of truth.
- Preserve a v0.1 behavior baseline before deeper refactoring.

### Work

- [x] Add `REQUIREMENTS.md`.
- [x] Add `IMPLEMENTATION_PLAN.md`.
- [x] Add `docs/README.md` as the documentation map.
- [ ] Review README/README_ja against current functionality.
- [ ] Run and update the manual test checklist.
- [ ] Update release notes and known limitations.
- [ ] Tag/release the v0.1 public prototype when the checklist passes.

### Documentation decisions

- `ROADMAP.md` becomes a historical/high-level roadmap and points here for current ordering.
- `PROJECT_PROGRESS.md` becomes an append-only snapshot/history file, not the current work queue.
- Detailed specs remain supporting documents.
- New architecture decisions that change canonical rules should later use `docs/adr/NNNN-title.md`.

### Exit criteria

- Maintainer can answer “what is Cherry?”, “what do we build next?”, and “which document wins?” without reading chat history.
- v0.1 behavior is documented and testable.

---

## 6. Phase 1 — Startup and persistence foundation

Issues: #87, #88, #92  
Architecture support: #6

This phase comes first because current startup, workspace, and localStorage behavior are intertwined with late-loaded UI scripts.

### 6.1 Introduce explicit startup state

Target states:

```text
booting
storage-choice (only when needed)
start
workspace
fatal-recovery
```

Implementation steps:

1. Add a small bootstrap module that reads only the minimum metadata needed to choose the first screen.
2. Do not initialize board layout/rendering until `workspace` is chosen.
3. Render start screen as a normal app view, not a late overlay.
4. Measure first clean paint and remove unnecessary startup work.

Maps to: #87

### 6.2 Restore active context

Persist minimal session metadata separately from full workspace content:

```js
{
  lastRoute: "start" | "workspace",
  activeWorkspaceId,
  activeTabId,
  activeView
}
```

Rules:

- Validate references before restore.
- Fall back to start safely.
- Do not create fake placeholder data when the referenced tab is missing.

Maps to: #88

### 6.3 Add storage adapters

Introduce a boundary before further schema work:

```text
MemoryStorage
LocalBrowserStorage
```

All feature modules must stop writing `localStorage` directly.

### 6.4 Persistence transparency and consent

For #92, implement a product-safe version after deciding policy:

- explain that work can be saved in the browser
- allow persistent local mode or ephemeral session mode
- provide a clear “clear local data” action
- never claim legal/GDPR necessity without a separate legal basis review
- ensure refusal does not make the app unusable

Recommended first UX:

```text
Save work on this device
[Use local saving] [Use for this session]
```

This is clearer than blocking the app behind legalistic text.

### Tests

- cold start with no data
- start in ephemeral mode
- allow persistent mode
- reload from start screen
- reload from workspace/tab/list/board
- stale active tab id
- corrupted stored metadata
- storage unavailable/quota error

### Exit criteria

- Board does not mount before needed.
- Reload restores context predictably.
- Feature modules no longer need direct persistence calls.

---

## 7. Phase 2 — Core module and extension seams

Issue: #6

This phase does **not** implement third-party plugins yet. It creates the contracts that built-in features will use.

### 7.1 Adopt native ES modules

- Add `src/app/bootstrap.js` entry point.
- Migrate one coherent area at a time.
- Keep GitHub Pages deployment build-free.
- Replace dynamic loading chains that make theme code load unrelated systems.

### 7.2 Extract domain/store core

Recommended order:

1. date/schedule pure helpers
2. workspace normalization/migrations
3. state store and selectors
4. command dispatcher/history
5. event bus
6. storage orchestration

### 7.3 Create registries

Initial built-in registries:

- commands/actions
- views
- toolbar/context actions
- importers/exporters
- board tools

### 7.4 Compatibility bridge

During migration, create one explicit `legacy-bridge` instead of many files replacing globals.

It may temporarily expose legacy calls, but must:

- delegate into commands/selectors
- log/deprecate direct global use in development
- have an issue/checklist for removal

### Tests

- command transaction and undo
- event subscribe/unsubscribe
- module initialization independent of script order
- failed built-in extension does not erase state

### Exit criteria

- A new built-in feature can register an action/view without replacing `render` or editing core globals.
- Storage, state, and rendering are no longer one inseparable `app.js` responsibility.

---

## 8. Phase 3 — Schedule and composable board settings

Primary issue: #79  
Supersedes/absorbs: #69  
Uses schedule migration work from #2/documents

### 8.1 Normalize state model

Target tab state:

```js
{
  tasks,
  edges,
  board: {
    settings: {
      showDateLanes,
      autoLayout,
      timeGuide
    },
    positions,
    viewport
  },
  viewState
}
```

Migration rules:

- old `showLanes` → `board.settings.showDateLanes`
- valid `schedule` wins
- valid `targetAt` → `schedule.type: date`
- missing/invalid persisted date → `schedule.type: none`
- do not bump/delete the old data without backup/rollback strategy

### 8.2 Make schedule helpers authoritative

Audit and replace direct `targetAt` reads in:

- lanes
- layout
- list
- create/edit
- import/export
- tab duplication
- mobile map where relevant

### 8.3 Implement independent settings

Order:

1. add normalized setting helpers with no visual change
2. date lanes show/hide without schedule mutation
3. allow undated tasks while lanes are shown
4. add auto-layout off/manual position preservation
5. make relayout an explicit command
6. introduce optional datetime edit UI
7. add contextual time guide only after schedule behavior is stable

### 8.4 Undated task handling

Default:

- keep undated branches in the current tab
- never assign fake dates
- allow explicit date-lane drop to schedule

Optional later commands:

- arrange into an undated area
- move a subtree to another tab

### Tests

All four board setting combinations, mixed dated/undated branches, lane toggling, reload, native file round trip, mobile/list behavior.

### Exit criteria

- #69 can be closed as superseded by #79.
- Date-lane visibility is purely visual.
- Auto layout can be disabled without losing manual positions.
- Undated tasks are first-class.

---

## 9. Phase 4 — Explicit structural flow order and edges

Primary issue: #80

This is the semantic prerequisite for reliable reorder, arrows, loops, import/export, and future sync.

### 9.1 Stage A: selectors over legacy structure

Before changing serialization, make all features use shared selectors:

- structural children
- primary goal
- ordered sequence
- descendants/subtree
- validation

### 9.2 Stage B: explicit order

Add a stable `order` value to current structural children while preserving existing visual order during migration.

Migration should derive initial order once from existing behavior, then stop using title/date as hidden structural order.

### 9.3 Stage C: explicit edge serialization

Migrate `parentId`/`branchMode` to structural edge records.

Rules:

- preserve current flow exactly
- reject invalid structural cycles
- one incoming structural edge per action in the initial model
- goal tasks anchor structural forests

### 9.4 Stage D: reorder command and UI

Command examples:

```text
flow.moveBefore(taskId, targetId)
flow.moveAfter(taskId, targetId)
flow.moveToBranch(taskId, parentId, index)
```

Desktop:

- drag with insertion/edge preview

Mobile:

- explicit move-before/move-after action in bottom sheet

Reordering must not change schedule.

### Tests

- A→B→C to A→C→B
- branch and subtree move
- undo
- same date and mixed dates
- old data migration
- list respects explicit order

### Exit criteria

- Flow order is stored semantically.
- Layout/list/import no longer infer order from position/date/title.

---

## 10. Phase 5 — UX implementation on stable commands

### 10.1 Mobile flow-first redesign

Issues: #5, #86, #93

Split #86 into focused child issues before implementation:

1. start-screen information hierarchy
2. mobile board selected-task actions
3. mobile list hierarchy/readability
4. secondary/destructive action placement
5. first-use interaction guidance

Rules:

- one primary CTA on start
- secondary import/export/settings grouped
- delete behind “More”
- selected task exposes context actions
- no dense manual text replacing interaction design

### 10.2 Mobile gesture controller

For #93:

- move edge auto-scroll inside the core drag session
- update board scroll and dragged coordinates in the same animation frame
- use one owner for the pointer/touch session
- existing-task connection begins from selected-task action, not card-move gesture
- keep `＋追加` creation intact

### 10.3 Desktop inline editor

Issue: #33

Implement as a registered task-editor surface using commands, not as another function override.

- anchor near source task
- viewport collision fallback
- keyboard confirm/cancel
- mobile retains its own surface
- schedule fields use canonical model

### 10.4 Visual cleanup

Issues: #76, #77

These may happen earlier if low risk, but should be verified after major UI changes so they are not immediately invalidated.

### Tests

Touch drag/scroll, keyboard operation, viewport placement, progressive disclosure, screen-reader labels for important actions.

---

## 11. Phase 6 — Goal importance and connector rendering

### 11.1 Goal importance

Issue: #78

Implement after task role and native serialization are stable.

Data:

```js
appearance.importance = none | low | medium | high | urgent
```

Rules:

- goal tasks only in first version
- subtle tokens, theme-aware
- icon/label/border accompanies color
- native import/export preserves value

### 11.2 Directional connectors

Issue: #83

Implement in the edge renderer after explicit structural edges exist.

- structural sequence/branch arrows
- reference edges visibly distinct
- selected/highlight state remains readable
- Flow Map uses simplified edge semantics

---

## 12. Phase 7 — Interoperability adapters

Issue: #89

Prerequisites:

- canonical workspace schema
- canonical schedule
- explicit flow order/edges
- transaction-safe import destination

### 12.1 Shared adapter API

```js
Importer = {
  id,
  extensions,
  parse(file, options) -> ImportCandidate
}

Exporter = {
  id,
  export(workspace, options) -> Blob
}
```

### 12.2 ICS

First release:

- common VEVENT/VTODO fields
- bounded/explicit recurrence handling
- new-tab default
- optional order-based connection only with clear wording
- import summary/warnings

### 12.3 CSV

Offer two schemas:

- simple user CSV
- full Cherry CSV for round trip

Full format should preserve ids, role, status, schedule, edges/order, and positions where applicable.

### Tests

- Japanese UTF-8
- missing fields
- invalid dates/times
- duplicate ids
- missing parents/edge endpoints
- parse failure leaves current workspace unchanged
- native `.cherry` remains preferred backup

---

## 13. Phase 8 — Freehand board and annotations

Parent: #81  
Children: #82, #84, #85  
Connector renderer: #83

Prerequisites:

- `showDateLanes: false`
- `autoLayout: false`
- stable positions
- explicit structural/reference edges
- board-tool registry
- command/history foundation

### 13.1 Reference/cyclic links (#82)

Implement cycles as `reference` edges first.

Do not permit structural cycles until a separate requirement explains how list grouping, auto layout, completion, and traversal should behave.

### 13.2 Text annotations (#84)

- separate annotation model
- create/edit/move/delete commands
- hidden toolbar/tool when unused
- native serialization and undo

### 13.3 Drawing layer (#85)

- simple stroke points, width, and erase/delete
- pointer-type-aware input
- avoid conflict with pan/card drag
- optional simplification/compression for saved strokes

### Exit criteria

- Normal task UI remains uncluttered.
- Canvas tools cannot corrupt or flatten task-flow data.
- Native export/import round-trips annotations and reference links.

---

## 14. Phase 9 — Future sync and external plugins

Issue: #90

### 14.1 Sync preparation only during v0.2

Add only metadata that has immediate local value:

- stable ids
- schema version
- created/updated timestamps
- workspace revision

Do not add a backend or account system merely because metadata exists.

### 14.2 Architecture decision before implementation

An ADR must decide:

- local-first strategy
- snapshot vs operation log
- provider/backend direction
- conflict preservation policy
- encryption/privacy expectations

### 14.3 External plugins

Before arbitrary plugins are supported, decide:

- install source and trust
- capabilities/permissions
- storage namespace
- UI contribution limits
- failure isolation
- API version lifecycle

Until then, plugin registration is for built-in/trusted local modules only.

---

## 15. Per-issue disposition table

| Issue | Disposition | Planned phase | Key dependency |
| --- | --- | ---: | --- |
| #5 | Keep as mobile parent | 5 | commands + mobile gesture ownership |
| #6 | Expand from file split to module/contracts migration | 2 | v0.1 baseline, storage boundary |
| #33 | Implement as registered desktop editor | 5 | schedule commands |
| #66 | Finish baseline/release checklist | 0 | current prototype testing |
| #69 | Supersede/merge into #79 | 3 | maintainer issue cleanup decision |
| #76 | Focused polish | 0/5 | stable target UI |
| #77 | Focused removal | 0/5 | none |
| #78 | Implement goal appearance property | 6 | role/schema/native format |
| #79 | Canonical board/schedule implementation tracker | 3 | storage/core seams |
| #80 | Canonical structural order tracker | 4 | selectors/commands |
| #81 | Keep as freehand parent | 8 | board settings + edge/tools foundation |
| #82 | Reference cyclic links first | 8 | explicit edge types |
| #83 | Directional edge renderer | 6 | explicit edges |
| #84 | Text annotation plugin/tool | 8 | annotation model/history |
| #85 | Drawing annotation plugin/tool | 8 | tool/gesture ownership |
| #86 | Split into mobile UX child issues | 5 | startup + commands |
| #87 | Implement first | 1 | bootstrap/storage metadata |
| #88 | Implement with startup state | 1 | stable workspace/tab ids |
| #89 | Adapter-based implementation | 7 | schedule + edges + transaction import |
| #90 | Design/prepare only; implementation later | 9 | stable ids/revisions |
| #91 | Add to simplified start view | 5 | startup view + i18n service |
| #92 | Implement persistence choice/ephemeral mode | 1 | storage abstraction |
| #93 | Integrate into mobile gesture controller | 5 | command + gesture foundation |

---

## 16. Documentation cleanup tasks

### Keep as canonical

- `REQUIREMENTS.md`
- `IMPLEMENTATION_PLAN.md`
- `docs/README.md`

### Keep as focused supporting specifications

- `PRODUCT_VISION.md`
- `SCHEDULE_MIGRATION_PLAN.md`
- `LAYOUT_AND_SCHEDULE_SPEC.md`
- `UX_INTERACTION_SPEC.md`
- `MOBILE_UX_SPEC.md`
- `MOBILE_FLOW_MAP_SPEC.md`
- `DATE_TARGET_SPEC.md`
- `MANUAL_TEST_CHECKLIST.md`
- `DEVELOPMENT_SETUP.md`
- `ORIGINALITY_REVIEW.md`

These documents should be shortened or updated over time to link to canonical requirements instead of repeating broad product rules.

### Convert to status/history roles

- `ROADMAP.md`: high-level release history; add a banner linking to this plan.
- `PROJECT_PROGRESS.md`: dated development log; remove claims that it is always the first/current source.
- `RELEASE_NOTES*.md`: immutable release history.
- `MIGRATION_NOTES.md`: completed/temporary migration record.

### Deprecate or merge when reviewed

- Duplicate root-level/manual checklist files should point to the `docs/` version or be removed.
- Stale specifications for already-shipped behavior should be marked implemented/historical rather than left as future plans.
- Any document that repeats issue text without adding a stable rule should be replaced by an issue link.

---

## 17. Definition of ready for an implementation issue

An issue is ready when it includes:

- user problem
- relationship to canonical requirement IDs or principles
- explicit in-scope/out-of-scope
- data model impact
- migration/backward compatibility impact
- desktop/mobile interaction decision
- undo/failure behavior
- dependencies
- acceptance criteria
- testing plan

Large design issues should be split before coding begins.

---

## 18. Definition of done for a phase

A phase is complete when:

- all exit criteria pass
- related manual/automated tests exist
- issue/PR status reflects reality
- canonical documents are updated
- obsolete bridges/patches for that phase are removed or have a dated removal task
- no known data-loss path remains
- next phase can build on stable contracts rather than internal globals
