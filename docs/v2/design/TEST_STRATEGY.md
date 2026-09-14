# Cherry V2.0 Test Strategy

Status: **Draft**

## Goal

Testing is part of the architecture, not a release-time cleanup step. Every semantic rule should be testable without mounting the full application whenever possible.

## Test pyramid

### 1. Domain unit tests

Fast pure tests for:

- Schedule validation and date-only behavior,
- structural Flow DAG invariants,
- branch and merge creation,
- structural cycle rejection,
- reference-cycle allowance,
- structural reorder transformations,
- derived branching-goal detection,
- derived goal completion over nested branches and merged descendants,
- Task/Annotation validation,
- schema normalization helpers.

No DOM, storage, clock, or network.

### 2. Application/use-case tests

Use in-memory ports to verify:

- command transactions,
- Undo/Redo,
- Task-only removal and Flow reconnection,
- downstream-scope removal behavior once the shared-merge policy is frozen,
- connect/reorder/merge operations,
- automatic goal completion after the final required downstream Task completes,
- Schedule changes,
- Board setting changes not mutating semantic data,
- import candidate commit behavior,
- startup state transitions,
- persistence remaining disabled until explicit consent.

### 3. Port and UI-contract tests

Every adapter implementation runs against shared contracts.

Examples:

- `WorkspaceRepositoryContract`
- `WorkspaceCodecContract`
- `ImporterContract`
- `IdGeneratorContract` when relevant
- `CherryUIPackageContract`

A browser repository and memory repository should satisfy the same observable repository behavior where their capabilities overlap.

The default UI package must consume only the formal UI/application-facing contract. A contract test should fail if the default UI reaches into Domain internals or a concrete persistence adapter.

### 4. Migration/fixture tests

Frozen V1 fixtures verify:

- supported native V1 `.cherry` files can be decoded,
- supported encrypted V1 `.cherry` files can be decoded with valid credentials,
- wrong credentials fail safely,
- migration is deterministic,
- dates do not become today accidentally,
- unsupported/corrupt data fails non-destructively,
- legacy browser-storage recovery is best-effort and cannot damage the V2 workspace,
- import never overwrites current data before validation.

### 5. Storage-consent tests

`R-STORAGE-002` is a mandatory product/privacy test area.

At minimum:

1. First launch uses `MemoryWorkspaceRepository`.
2. Before **Allow**, no workspace/task data is written to `localStorage`, IndexedDB, or another persistent browser store.
3. Choosing **Not now** keeps the app usable and memory-only.
4. Choosing **Allow** enables the configured persistent adapter.
5. Consent may be remembered only after permission is granted.
6. Disabling persistence does not silently clear data; destructive clearing requires explicit confirmation.

These tests should use an instrumented persistence adapter so “no write before consent” is verified rather than inferred from UI state.

### 6. Interaction tests

Test the `InteractionCoordinator` as a state machine independent of pixel-perfect rendering:

- only one gesture owner at a time,
- drag cancel leaves canonical state unchanged,
- drag + edge-scroll updates preview coherently,
- drawing mode prevents task drag,
- mobile connection experiments do not steal normal card drag/pan,
- drop resolver produces the intended typed `DropIntent`.

The exact mobile existing-task connection gesture is intentionally not frozen yet. Once selected, its acceptance tests are added without changing Flow command tests.

### 7. Presentation/UI-package tests

Verify component behavior and accessibility contracts:

- Task editor submits the same application command from desktop/mobile presentations,
- destructive actions are not primary on mobile,
- directional connectors represent edge direction,
- a merged structural Task keeps one canonical identity,
- derived branching goals render their goal/importance state without relying only on color,
- theme state remains distinguishable without color alone,
- i18n keys are used for user-facing strings,
- the default UI can be mounted through `CherryUIPackage` without Domain/Application changes.

### 8. End-to-end acceptance tests

E2E covers complete critical journeys on desktop and mobile viewport profiles:

```text
start
→ explicit storage choice
→ create workspace
→ create Task
→ add continuation/branch
→ merge branches
→ complete downstream work
→ verify goal auto-completion
→ reorder/connect
→ schedule
→ reload/restore when persistence is allowed
→ export/import
```

Additional journeys cover freehand/reference links, annotation persistence, V1 `.cherry` migration, and external import when those features land.

## Structural DAG acceptance fixtures

At minimum the Flow suite must include:

### T-FLOW-MERGE-001 — Branch then merge

```text
      ┌→ B ─┐
A ────┤     ├→ D
      └→ C ─┘
```

Verify:

- `D` has two structural predecessors,
- no duplicate `D` Task is created,
- topological traversal terminates,
- auto-layout receives one canonical `D`,
- serialization/import preserves both incoming edges.

### T-FLOW-CYCLE-001 — Structural cycle is rejected

Given `A → B → C`, attempting `C → A` as structural Flow fails with an invariant error and leaves canonical state unchanged.

The same directional relationship MAY be represented through a reference edge when allowed by the command.

### T-GOAL-001 — Branching goal derivation

- Task with 0 outgoing structural edges → ordinary Task.
- Task with 1 outgoing structural edge → ordinary Task.
- Task with 2+ outgoing structural edges → derived branching goal.
- Root status alone does not imply goal status.

### T-GOAL-002 — Automatic completion

For a derived branching goal, completing every structurally required downstream Task completes the parent goal automatically. Shared descendants created by a merge are counted once. Reference edges do not affect completion.

A reopen test is added as soon as the design-freeze policy for auto-completed goal reopening is decided.

## Mandatory regression: T-REG-222

The V2 drop resolver must have a focused regression fixture for #222.

At minimum:

1. Create an Aug 24 scheduled Task.
2. Represent Aug 25 as a collapsed completed date lane narrower than a normal Task card.
3. Drag preview substantially over Aug 25 such that a center-only heuristic would be ambiguous.
4. Resolver must return `DateLaneTarget(2026-08-25)` when overlap/priority rules define Aug 25 as the intended target.
5. Commit must change Schedule through the schedule command.
6. Cancelling/invalidating the drop must leave original Schedule and canonical position unchanged.
7. Expanding/re-layout after a valid drop must not return the Task to Aug 24.
8. Horizontal and vertical geometry variants are tested.

The test should exercise geometry + intent resolution, not V1 implementation functions.

## Requirement traceability

Tests SHOULD carry requirement IDs in names or metadata, for example:

```text
R-FLOW-002 reorder continuation chain
R-FLOW-006 branch then merge
R-TASK-003 automatic branching-goal completion
R-BOARD-001 hiding lanes preserves Schedule
R-STORAGE-002 no persistent write before Allow
R-UI-001 default UI uses formal UI contract
R-INTEROP-002 failed import leaves workspace unchanged
```

A release checklist can be generated from requirements with missing acceptance coverage rather than maintained as an unrelated hand-written list.

## CI gates

Once implementation begins, pull requests should require:

1. TypeScript typecheck.
2. Import-boundary/dependency rule check.
3. Domain/application/contract tests.
4. UI-package boundary test.
5. Formatting/linting checks chosen for V2.
6. Static production build.

E2E may run on every PR or a scoped subset depending on runtime cost, but critical startup/create/save/restore tests should remain frequent.

## Manual testing

Manual checks remain useful for:

- visual density,
- touch feel,
- real mobile browser keyboard behavior,
- drag/drop feel,
- merged-flow readability,
- mobile existing-task connection prototypes,
- theme aesthetics,
- assistive-technology review.

Manual testing must not be the only protection for pure business rules that can be automated.

## Definition of Done for a feature

A feature is not complete until:

- requirement IDs are identified,
- owning module is clear,
- domain/application tests cover semantic rules,
- relevant adapter/UI tests exist,
- regression tests are added for fixed reproducible bugs,
- desktop/mobile behavior is checked when the capability is shared,
- data migration/compatibility impact is documented,
- UI changes do not bypass the formal UI/application boundary.
