# Cherry V2.0 Test Strategy

Status: **Draft**

## Goal

Testing is part of the architecture, not a release-time cleanup step. Every semantic rule should be testable without mounting the full application whenever possible.

## Test pyramid

### 1. Domain unit tests

Fast pure tests for:

- Schedule validation and date-only behavior,
- Flow invariants and cycle policy,
- structural reorder transformations,
- Task/Annotation validation,
- schema normalization helpers.

No DOM, storage, clock, or network.

### 2. Application/use-case tests

Use in-memory ports to verify:

- command transactions,
- Undo/Redo,
- Task delete/recovery behavior,
- connect/reorder operations,
- Schedule changes,
- Board setting changes not mutating semantic data,
- import candidate commit behavior,
- startup state transitions.

### 3. Port contract tests

Every adapter implementation runs against shared contracts.

Examples:

- `WorkspaceRepositoryContract`
- `WorkspaceCodecContract`
- `ImporterContract`
- `IdGeneratorContract` when relevant

A browser repository and memory repository should satisfy the same observable repository behavior where their capabilities overlap.

### 4. Migration/fixture tests

Frozen V1 fixtures verify:

- supported legacy data can be decoded,
- migration is deterministic,
- dates do not become today accidentally,
- unsupported/corrupt data fails non-destructively,
- encrypted native files fail safely with wrong credentials,
- import never overwrites current data before validation.

### 5. Interaction tests

Test the InteractionCoordinator as a state machine independent of pixel-perfect rendering:

- only one gesture owner at a time,
- drag cancel leaves canonical state unchanged,
- drag + edge-scroll updates preview coherently,
- drawing mode prevents task drag,
- mobile connection flow does not steal normal card drag,
- drop resolver produces the intended typed DropIntent.

### 6. Presentation component tests

Verify component behavior and accessibility contracts:

- Task editor submits the same application command from desktop/mobile presentations,
- destructive actions are not primary on mobile,
- directional connectors represent edge direction,
- theme state remains distinguishable without color alone,
- i18n keys are used for user-facing strings.

### 7. End-to-end acceptance tests

E2E covers complete critical journeys on desktop and mobile viewport profiles:

```text
start → create workspace → create Task → add continuation/branch
→ reorder/connect → schedule → reload/restore → export/import
```

Additional journeys cover freehand/reference links, annotation persistence, and external import when those features land.

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
R-BOARD-001 hiding lanes preserves Schedule
R-STORAGE-002 memory mode works without persistent storage
R-INTEROP-002 failed import leaves workspace unchanged
```

A release checklist can be generated from requirements with missing acceptance coverage rather than maintained as an unrelated hand-written list.

## CI gates

Once implementation begins, pull requests should require:

1. TypeScript typecheck.
2. Import-boundary/dependency rule check.
3. Unit/application/contract tests.
4. Formatting/linting checks chosen for V2.
5. Build of the static production site.

E2E may run on every PR or a scoped subset depending on runtime cost, but critical startup/create/save/restore tests should remain frequent.

## Manual testing

Manual checks remain useful for:

- visual density,
- touch feel,
- real mobile browser keyboard behavior,
- drag/drop feel,
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
- data migration/compatibility impact is documented.
