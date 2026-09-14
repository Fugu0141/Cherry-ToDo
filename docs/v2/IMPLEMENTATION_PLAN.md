# Cherry V2.0 Implementation Plan

Status: **Approved implementation roadmap — 2026-09-14**  
Applies to: `v2.0` implementation after design freeze  
Requirements: `requirements/REQUIREMENTS.md`  
Design freeze authority: `DESIGN_FREEZE.md`

## 1. Purpose

This document converts the frozen V2 requirements and basic design into bounded implementation phases.

The goal is to prevent Cherry V2 from becoming a sequence of unrelated feature patches. Each phase has:

- a clear product/architecture outcome,
- requirements it owns,
- explicit non-goals,
- testable exit criteria,
- dependencies on earlier phases.

A phase is a **milestone**, not necessarily one pull request. Work inside a phase SHOULD be split into small, reviewable PRs. The next phase MUST NOT become the main development focus until the current phase exit criteria are satisfied, unless this plan is deliberately amended.

## 2. Source-of-truth precedence

When implementation guidance conflicts, use this order:

1. `DESIGN_FREEZE.md`
2. accepted ADRs
3. `requirements/REQUIREMENTS.md`
4. `design/BASIC_DESIGN.md`
5. `design/FLOW_EXECUTION_RULES.md`
6. this implementation plan for sequencing/scope

The freeze corrections are especially important for derived branching goals: a current derived branching goal has no normal manual completion action and is completed only by the Flow evaluator.

## 3. Global implementation rules

These rules apply to every phase.

- `main` remains the V1/reference line.
- `v2.0` is the V2 integration branch.
- Development work branches from the current `v2.0`.
- Prefer multiple focused PRs over one phase-sized mega-PR.
- No UI component may bypass Application commands to mutate canonical state.
- No feature may introduce global monkey patches or hidden script-order dependencies.
- Every implemented MUST requirement must gain automated coverage or an explicit manual acceptance test.
- Reproducible regressions get a focused regression test before or with the fix.
- Cross-module imports use public module APIs only.
- A phase is complete only when its exit criteria pass on `v2.0` after integration.

## 4. Phase overview

| Phase | Outcome | User-visible state at phase end |
| --- | --- | --- |
| 1 | Engineering foundation | Build/test/static shell works; no product UI required |
| 2 | Canonical Domain model | Tasks, Schedule, Workspace and structural/reference Flow can be modeled and validated headlessly |
| 3 | Application + execution semantics | Full Flow/Goal/Merge/Delete/History behavior works headlessly through commands |
| 4 | Workspace persistence + startup + native V2 data | Workspaces can run in memory, opt into browser persistence, restore safely, and round-trip V2 data |
| 5 | UI contract + minimal Cherry shell | A replaceable default UI can create/open a workspace and exercise basic Task/Flow operations |
| 6 | Desktop core planning experience | Main Cherry desktop workflow is usable end-to-end, including Board/List/Schedule/merge rules |
| 7 | Mobile and adaptive interaction | Mobile becomes a first-class usable client of the same Core/Application |
| 8 | Freehand/reference/annotation capabilities | Optional freehand planning and annotations work without changing Task semantics |
| 9 | V1 migration + interoperability | Supported V1 `.cherry`, encrypted V1, ICS and CSV paths are safe and usable |
| 10 | Hardening and V2 release gate | Accessibility, performance, E2E, UI replaceability, docs and release checks pass |

---

## Phase 1 — Engineering foundation and architecture guardrails

### Goal

Create the smallest trustworthy development environment in which all later V2 code can be built, tested, and prevented from violating architecture boundaries.

### In scope

- TypeScript strict mode + ES modules.
- Vite static build compatible with GitHub Pages.
- Vitest baseline.
- Formatting/linting baseline chosen and documented.
- Import/dependency-boundary checks.
- Initial source directories from Basic Design.
- Shared test layout (`domain`, `application`, `contracts`, `integration`, `regression`, `e2e`).
- CI workflow for typecheck, tests, boundary checks and static build.
- Minimal composition/bootstrap placeholder that proves the build output can load.

### Requirements / decisions advanced

- NFR-ARCH-001
- NFR-ARCH-002
- NFR-ARCH-003
- NFR-ARCH-004
- NFR-ARCH-005
- NFR-QUALITY-001
- NFR-QUALITY-002
- ADR-0001
- ADR-0003
- ADR-0005 boundary preparation

### Explicit non-goals

- No production Task model yet.
- No Board implementation.
- No persistent storage.
- No visual redesign work.
- No V1 migration code.

### Exit criteria

Phase 1 is complete when:

1. clean checkout installs and builds deterministically,
2. TypeScript strict checking passes,
3. Vitest runs at least one real module test,
4. dependency-boundary violations fail CI,
5. production static output loads without V1 runtime code,
6. CI runs on V2 pull requests,
7. contributor setup for the new toolchain is documented.

---

## Phase 2 — Canonical Domain model

### Goal

Define the authoritative, UI-independent semantic model Cherry will use for the rest of V2.

### In scope

- Stable typed IDs.
- `Result` / typed error primitives.
- revision/audit metadata primitives.
- schema-version primitives.
- Task entity.
- Schedule value object: `none | date | datetime`.
- Structural Flow edges and reference edges.
- Structural DAG validation: duplicates, self-links, cycle prevention.
- Branching and multiple incoming structural edges (merge support).
- Workspace/Tab document aggregate and validation.
- Board semantic/presentation state separation and board-setting value types.
- Stable serialization-facing types without implementing every codec yet.
- sync-readiness metadata needed by the local model.

### Requirements / decisions advanced

- R-DATA-001
- R-DATA-002 (model/schema portion)
- R-DATA-003
- R-TASK-001
- R-TASK-002 (topology derivation primitive)
- R-FLOW-001
- R-FLOW-006
- R-SCHEDULE-001
- R-BOARD-001 (settings model)
- R-BOARD-002 (state separation)
- R-BOARD-004 (graph input contract)
- R-WORKSPACE-001 (document model)
- R-SYNC-READY-001
- ADR-0004 graph model

### Explicit non-goals

- No UI.
- No user commands/history yet.
- No goal auto-completion yet.
- No merge execution locking yet.
- No browser storage.

### Exit criteria

Phase 2 is complete when pure Domain tests prove:

1. valid chain, branch and merge graphs are accepted,
2. structural cycles/self-links/invalid duplicates are rejected without partial mutation,
3. reference cycles are representable separately,
4. Schedule date-only values remain timezone-neutral,
5. Workspace/Tab/Task/Flow IDs are stable typed values,
6. Board coordinates/settings cannot become hidden Flow or Schedule semantics,
7. one canonical Task can have multiple structural predecessors without duplication.

---

## Phase 3 — Application commands, Flow execution semantics, and History

### Goal

Make Cherry's important behavior work completely headlessly through explicit Application use cases before building real UI.

### In scope

- Application store / document transaction boundary.
- named Task/Flow/Schedule/Board commands.
- connect existing Tasks.
- semantic Flow reordering.
- derived branching-goal detection.
- full downstream goal completion evaluator.
- automatic goal reopening rules from the freeze record.
- no direct user completion command for a current derived branching goal.
- merge execution gates.
- downstream propagation of closed merge-gate blocking.
- revision-aware impact planning and confirm/commit flow.
- ordinary one-line Flow remains non-blocking.
- Delete this Task only reconnection rules.
- chain-limited downstream deletion rules.
- command-level Undo/Redo / History.
- query/read-model foundation for UI consumers.

### Requirements / decisions completed or substantially completed

- R-DATA-004
- R-TASK-002
- R-TASK-003 as corrected by `DESIGN_FREEZE.md`
- R-FLOW-002
- R-FLOW-003 Core/Application portion
- R-FLOW-006
- R-FLOW-007
- R-FLOW-008
- R-FLOW-009
- R-FLOW-010
- R-HISTORY-001
- ADR-0006
- ADR-0007
- ADR-0008 topology-transition behavior

### Explicit non-goals

- No browser confirmation dialog yet; tests provide confirmation decisions through Application APIs.
- No Board renderer/layout.
- No touch gestures.
- No V1 parsing.

### Exit criteria

Phase 3 is complete when the headless test suite proves at least:

1. `A → B → C` can be semantically reordered,
2. branch-then-merge graphs retain one canonical merge Task,
3. a branching parent has no direct manual-complete action,
4. the parent completes only when every reachable structural descendant is complete,
5. a closed merge gate blocks its target and downstream region,
6. ordinary chains remain non-blocking,
7. reopening prerequisites produces an impact plan before mutation,
8. cancel changes nothing and confirm commits transactionally,
9. 1→1, 1→many, many→1 delete-one reconnection behaves as frozen,
10. many→many delete-one creates no invented cross-product edges,
11. downstream delete stops before branch/merge junctions,
12. Undo/Redo restores exact semantic state for supported reversible commands.

---

## Phase 4 — Workspace lifecycle, persistence, startup, and native V2 data

### Goal

Make Cherry safely own user data and application startup before the main UI grows around it.

### In scope

- `WorkspaceRepository` port.
- `MemoryWorkspaceRepository`.
- persistent browser repository behind the same contract.
- exact persistent engine selection behind the adapter.
- mandatory explicit storage opt-in.
- no persistent workspace/task writes before **Allow**.
- disable/clear persistence flows at Application/capability level.
- Startup state machine.
- Start vs restore decision before Board initialization.
- active workspace/tab/view restoration when valid.
- schema validation/migration pipeline foundation.
- V2 native workspace codec and deterministic V2 round-trip.
- file/envelope interfaces kept separate from Domain.
- non-destructive candidate validation before commit.

### Requirements / decisions advanced

- R-START-001
- R-START-002
- R-STORAGE-001
- R-STORAGE-002
- R-WORKSPACE-001
- R-DATA-002
- R-INTEROP-001 V2-native portion
- R-INTEROP-002 pipeline foundation
- NFR-DATA-001
- NFR-PERF-001 architecture portion

### Explicit non-goals

- Supported V1 migration implementation waits for Phase 9.
- ICS/CSV waits for Phase 9.
- Rich visual Start screen waits for later UI phases.

### Exit criteria

Phase 4 is complete when integration tests prove:

1. first launch operates entirely through memory storage,
2. **Not now** remains usable and produces no persistent workspace/task writes,
3. **Allow** switches to the persistent adapter through policy/composition rather than Domain branching,
4. valid saved context restores safely,
5. stale/invalid context falls back without data loss,
6. Board-only services are not initialized while Start is the resolved route,
7. V2 native documents round-trip with IDs, Flow, Schedule and Board state intact,
8. invalid/corrupt candidates cannot overwrite the current readable workspace.

---

## Phase 5 — Formal UI contract and minimal usable Cherry shell

### Goal

Prove that Cherry can be operated through a replaceable UI package without leaking Core or persistence internals.

### In scope

- final `ui-contract` public API.
- read models/selectors.
- intent/command facade.
- capabilities.
- typed presentation errors.
- i18n boundary.
- semantic state/theme tokens.
- composition root selecting a UI package.
- default UI package skeleton.
- minimal Start screen.
- minimal Board surface.
- minimal Flow-preserving List surface.
- basic Task editor using the same Application contract.
- storage-choice presentation.
- basic create/edit/complete/connect operations sufficient for a vertical slice.

### Requirements / decisions advanced

- R-UI-001
- R-UI-002
- R-UI-003
- R-EDITOR-001 contract portion
- R-I18N-001
- R-THEME-001 boundary portion
- R-A11Y-001 baseline
- P-008
- ADR-0005

### Explicit non-goals

- UI does not need final visual polish.
- Desktop drag/drop can remain basic.
- Mobile-specific interaction is not required yet.
- Date-lane geometry and full auto-layout wait for Phase 6.

### Exit criteria

Phase 5 is complete when:

1. the default UI imports only the formal UI/Application-facing contract,
2. a contract test prevents reaching Domain internals or concrete persistence adapters,
3. another test/dummy UI package can mount through the same composition boundary,
4. a user can reach Start, create/open a workspace, create/edit a Task, create a simple Flow and see it in Board/List,
5. a derived branching goal does not expose a normal completion control,
6. storage permission can be granted/refused from UI without bypassing storage policy,
7. user-facing strings go through i18n.

---

## Phase 6 — Desktop core planning experience

### Goal

Deliver the first genuinely useful end-to-end Cherry V2 planning experience on desktop.

### In scope

- DAG-aware Board auto-layout.
- manual placement with auto-layout off.
- date lanes and all required Board setting combinations.
- typed DropIntent resolver.
- #222 collapsed date-lane regression fix by architecture.
- directional structural/reference connector rendering foundation.
- desktop existing-task connection interaction.
- desktop Flow reorder interaction.
- adaptive/anchored desktop Task editor.
- merge-gate blocked presentation.
- invalidation confirmation UI from Application-provided impact plans.
- deletion scope and many-to-many disconnect warning UI.
- derived-goal appearance/progress/importance editing.
- Board/List consistency.
- keyboard behavior and desktop accessibility baseline.

### Requirements / decisions advanced

- R-BOARD-001
- R-BOARD-002
- R-BOARD-004
- R-DROP-001
- R-FLOW-002 UI portion
- R-FLOW-003 desktop portion
- R-FLOW-005 structural rendering portion
- R-FLOW-007 UI portion
- R-FLOW-008 presentation
- R-FLOW-009 presentation
- R-FLOW-010 confirmation UI
- R-APPEARANCE-001
- R-EDITOR-001 desktop portion
- R-A11Y-001 desktop portion
- R-THEME-001
- NFR-QUALITY-002 / T-REG-222

### Explicit non-goals

- Mobile interaction polish waits for Phase 7.
- Freehand annotations wait for Phase 8.
- V1 import waits for Phase 9.

### Exit criteria

Phase 6 is complete when a desktop E2E path can:

1. start/open a workspace,
2. create continuations and branches,
3. merge flows,
4. see merge gates lock/unlock correctly,
5. auto-complete branching goals only when full downstream Flow is complete,
6. confirm completion rollback when a prerequisite/topology change invalidates completed work,
7. reorder existing Flow without changing Schedule,
8. switch date-lanes/auto-layout combinations without rewriting Schedule,
9. drag onto collapsed/expanded date lanes without visual/canonical mismatch (#222),
10. perform safe Task deletion with the frozen reconnection rules,
11. undo the supported semantic changes,
12. remain understandable without color-only state cues.

---

## Phase 7 — Mobile and adaptive interaction

### Goal

Make mobile a first-class presentation of the same V2 semantics rather than a reduced desktop port.

### In scope

- single `InteractionCoordinator` ownership model.
- mobile Board and Flow-preserving List.
- flow-first first-run UX.
- touch-safe contextual actions.
- mobile Task editor using the same editor/Application contract.
- predictable Board pan/task drag ownership.
- edge auto-scroll integrated with the active drag owner.
- prototype and select mobile existing-task connection UX.
- document the chosen gesture/UI once validated.
- touch/mobile accessibility checks.

### Requirements / decisions completed

- R-MOBILE-001
- R-MOBILE-002
- R-MOBILE-003
- R-INTERACTION-001
- R-FLOW-003 mobile portion
- R-EDITOR-001 mobile portion
- R-A11Y-001 mobile/touch portion

### Explicit non-goals

- Do not change Flow semantics to make a mobile gesture easier.
- Do not add independent mobile business logic.
- Do not add competing pointer handlers outside the active interaction owner.

### Exit criteria

Phase 7 is complete when:

1. normal mobile task drag and board pan do not steal each other's gesture sessions,
2. edge scrolling remains stable during active drag,
3. existing Tasks can be connected using a tested mobile-native flow,
4. the chosen connection UX is documented and acceptance-tested,
5. mobile Board and List preserve branch/merge meaning,
6. destructive actions are secondary/contextual,
7. first-time users have one obvious flow-starting action,
8. mobile uses the same Application commands as desktop.

---

## Phase 8 — Freehand, cyclic references, and annotations

### Goal

Add optional visual thinking tools without creating a second workspace/task model or weakening structural Flow invariants.

### In scope

- reference/cyclic connections.
- cyclic renderer behavior that cannot recurse infinitely.
- freehand Board composition (`lanes hidden + auto layout off`).
- text annotations.
- stroke annotations.
- annotation move/resize/style/delete.
- drawing interaction state.
- point throttling/simplification.
- annotation History.
- annotation persistence in V2 native format.
- connector direction for reference edges.

### Requirements / decisions completed

- R-FLOW-004
- R-FLOW-005 reference rendering portion
- R-BOARD-003
- R-ANNOTATION-001
- R-ANNOTATION-002
- R-ANNOTATION-003
- R-INTERACTION-001 drawing ownership extension

### Explicit non-goals

- No full Miro clone.
- No arbitrary shape library.
- No self-loop structural Flow.
- Reference edges never participate in structural goal completion or auto-layout semantics.

### Exit criteria

Phase 8 is complete when:

1. `A → B → C → A` can exist as reference edges without freezing traversal/rendering,
2. structural DAG rules remain unchanged,
3. freehand placement never rewrites semantic Flow/Schedule,
4. text/stroke annotations are never treated as Tasks,
5. drawing does not conflict with normal drag/pan,
6. annotations survive persistence/native export-import and Undo/Redo.

---

## Phase 9 — V1 migration and external interoperability

### Goal

Make V2 safe to adopt with real existing Cherry data and useful with common external formats.

### In scope

- supported native V1 `.cherry` reader/migrator.
- supported encrypted V1 `.cherry` envelope handling.
- migration normalization preview required by ADR-0008 / freeze record.
- cancel/confirm migration transaction.
- frozen V1 fixtures.
- best-effort legacy browser-storage recovery.
- ICS `VEVENT` import subset with bounded/explicit recurrence behavior.
- CSV documented export.
- safe simple CSV import.
- import summary/warnings.
- default external import destination policy (safe/new tab unless user deliberately chooses otherwise).

### Requirements / decisions completed

- R-WORKSPACE-002
- R-INTEROP-001
- R-INTEROP-002
- R-INTEROP-003
- R-INTEROP-004
- NFR-DATA-001 migration portion
- ADR-0008 migration normalization

### Explicit non-goals

- No hosted sync.
- No perfect arbitrary ICS implementation.
- No unbounded recurrence expansion.
- CSV is not the full-fidelity backup format.

### Exit criteria

Phase 9 is complete when:

1. supported plain V1 `.cherry` fixtures migrate deterministically,
2. supported encrypted V1 fixtures migrate with valid credentials and fail safely with invalid credentials,
3. conflicting legacy completion states show a preview before V2 normalization,
4. cancel leaves current V2 workspace/source unchanged,
5. migration/import failure cannot overwrite the last readable workspace,
6. legacy browser recovery failure cannot block a clean V2 session,
7. common ICS fixtures import safely with recurrence bounded/skipped explicitly,
8. CSV import/export preserves UTF-8 Japanese and validates malformed dates/IDs/relationships predictably.

---

## Phase 10 — Hardening and V2 release gate

### Goal

Prove that the complete V2 system is safe, replaceable, understandable, and deployable rather than merely feature-complete.

### In scope

- broad desktop/mobile E2E coverage.
- accessibility review and fixes.
- startup/runtime performance measurement on documented reference environments.
- production bundle/static deployment validation.
- full requirement-to-test traceability audit.
- UI-package swap proof with a minimal alternate/test UI.
- theme/light/dark/system review.
- error/recovery-path review.
- sync-readiness architecture audit (no hosted sync implementation).
- documentation/contributor/release documentation.
- known limitations.
- release checklist generated from requirement coverage rather than V1 checklist reuse.

### Requirements / decisions completed/verified

- R-SYNC-READY-001 audit
- R-I18N-001 verification
- R-THEME-001 verification
- R-A11Y-001 verification
- NFR-PERF-001
- NFR-QUALITY-001
- NFR-QUALITY-002
- all remaining MUST requirement traceability
- UI replaceability proof from R-UI-002 / ADR-0005

### Explicit non-goals

- hosted accounts/authentication,
- real-time collaboration,
- hosted cross-device sync,
- arbitrary plugin execution.

### Exit criteria

V2 is release-candidate ready only when:

1. every in-scope MUST requirement has acceptance coverage,
2. typecheck/build/unit/application/contract/integration gates pass,
3. critical desktop and mobile E2E journeys pass,
4. no known migration/import path can silently destroy the current readable workspace,
5. the default UI can be replaced by a minimal compatible UI without Core/Application changes,
6. startup does not initialize heavy Board features before the resolved route requires them,
7. accessibility-critical interactions work without hover/color-only meaning,
8. GitHub Pages/static production deployment is verified,
9. release notes and known limitations accurately describe the shipped V2 behavior.

## 5. Phase-to-requirement ownership rule

A requirement may begin in an earlier phase and be completed in a later phase. The phase descriptions distinguish **model/Core work** from **Presentation/adaptor completion** where necessary.

Before starting work in a phase, its PRs SHOULD cite the relevant requirement IDs and ADRs. Before declaring the phase complete, update this plan if actual implementation revealed a dependency or scope change.

## 6. What must not happen

The following are planning failures and require stopping/re-scoping rather than patching forward:

- beginning a later-phase UI feature because it looks easy while its semantic Core dependency is unfinished,
- adding a V1 compatibility shortcut by executing/reusing V1 runtime code,
- bypassing the UI/Application contract for convenience,
- adding a second mobile-specific business model,
- treating Board coordinates as hidden Flow/Schedule semantics,
- silently changing completed Tasks without an impact plan where one is required,
- persisting workspace/task data before explicit storage permission,
- making a phase “complete” while its mandatory tests/exit criteria are knowingly failing.

## 7. Immediate next step

The next development work is **Phase 1 only**.

Recommended first PR sequence:

1. `chore: establish TypeScript/Vite/Vitest baseline`
2. `chore: enforce V2 module dependency boundaries`
3. `ci: add V2 typecheck/test/build gates`
4. `docs: document V2 development setup and phase-1 completion evidence`

Do not begin Task/Flow implementation until Phase 1 exit criteria are satisfied.
