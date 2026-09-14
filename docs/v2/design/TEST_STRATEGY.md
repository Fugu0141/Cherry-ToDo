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
- derived goal completion over the full reachable structural Flow, including Tasks after reconvergence,
- automatic reopening of completed derived goals through validated consequences,
- merge-gate completion availability,
- propagation of a closed merge gate to downstream structural Tasks,
- ordinary one-line Flow remaining non-blocking,
- delete-one predecessor/successor cardinality planning,
- Task/Annotation validation,
- schema normalization helpers.

No DOM, storage, clock, or network.

### 2. Application/use-case tests

Use in-memory ports to verify:

- command transactions,
- Undo/Redo,
- Task-only removal and Flow reconnection,
- one-to-many deletion preserving branch shape,
- many-to-one deletion preserving merge shape,
- many-to-many deletion not inventing cross-product relationships,
- chain-limited downstream removal stopping before branch/merge junctions,
- connect/reorder/merge operations,
- automatic goal completion only after every reachable structural descendant is complete,
- completed goal reopening through the impact-plan flow when required downstream work becomes incomplete,
- direct user completion of a current derived branching goal being rejected,
- blocked completion commands being rejected even if requested by Presentation,
- completion/topology changes producing a revision-aware impact plan before completed Tasks are reopened,
- cancelling invalidation confirmation leaving canonical state untouched,
- confirming invalidation reopening affected Tasks and applying new blocked states transactionally,
- stale impact plans being rejected or recomputed,
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

Derived branching-goal read models must not expose a normal user completion action.

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
- blocked merge/downstream Tasks present completion as unavailable,
- blocked state explains the cause without relying only on color,
- invalidation that reopens completed Tasks shows confirmation before mutation,
- cancelling that confirmation performs no canonical mutation,
- derived branching goals render their goal/importance/progress state without relying only on color,
- derived branching goals do not display a normal completion checkbox/button,
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
→ observe merge completion gate
→ complete prerequisites
→ verify gate unlocks downstream region
→ complete the entire reachable downstream Flow
→ verify goal auto-completion
→ reopen a merge prerequisite
→ confirm affected completed Tasks return to incomplete
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
- A current derived branching goal exposes no normal manual completion action.

### T-GOAL-002 — Full reachable-Flow automatic completion

For a derived branching goal, every reachable structural descendant must be complete before the parent goal auto-completes. A merge/reconvergence does not end the completion scope, so later Tasks after the merge remain required. Shared descendants are counted once. Reference edges do not affect completion.

Adding a new unfinished structural descendant underneath an already-completed goal must produce an impact plan before the goal is reopened.

A direct user completion request for a current derived branching goal is rejected by Application.

### T-FLOW-GATE-001 — Merge target blocks completion

```text
A ✓ ─┐
     ├→ C 🔒
B □ ─┘
```

Verify:

- `C` reports `blocked-by-merge`,
- a completion command for `C` is rejected,
- completing `B` unlocks `C`,
- unlocking `C` does not auto-complete it.

### T-FLOW-GATE-002 — Closed merge gate propagates downstream

```text
A ✓ ─┐
     ├→ C 🔒 → D 🔒
B □ ─┘
```

Verify:

- `C` is blocked by its own merge prerequisites,
- `D` inherits blocked completion because it lies behind `C`,
- completing `B` unlocks both `C` and `D`,
- the equivalent ordinary chain `A □ → B □ → C □` has no such completion lock.

### T-FLOW-INVALIDATE-001 — Reopening a prerequisite requires confirmation

Start from a completed merge target and completed downstream Task. Attempt to reopen one predecessor.

Verify:

1. Application computes an impact plan before mutation.
2. The plan includes completed Tasks that would reopen.
3. Canonical state remains unchanged until confirmation.
4. Cancel leaves the graph exactly as before.
5. Confirm applies all planned status changes transactionally.
6. Affected Tasks then report blocked completion when appropriate.
7. Any affected completed branching goals reopen in the same logical operation.
8. Undo restores the prior statuses/edges consistently.

### T-FLOW-INVALIDATE-002 — New incomplete predecessor invalidates completed merge

Given a completed merge target, connect a new incomplete structural predecessor. Verify that the operation produces an impact plan and cannot silently leave the target `done` behind a newly closed merge gate.

### T-FLOW-INVALIDATE-003 — Stale impact plans are unsafe to commit

Calculate an invalidation plan, then change the graph revision before commit. Commit must reject or recompute the stale plan rather than applying consequences calculated against an older graph.

### T-DELETE-CHAIN-001 — Downstream deletion stops at junctions

Verify that downstream deletion removes only a single unambiguous chain and stops before the next branch or merge junction. The preserved junction and unrelated paths remain canonical and valid.

### T-DELETE-ONE-001 — Junction reconnection is conservative

Verify:

- one predecessor / one successor reconnects directly,
- one predecessor / multiple successors preserves the branch and deterministic order,
- multiple predecessors / one successor preserves the merge,
- multiple predecessors / multiple successors creates no automatic predecessor-successor cross-product edges,
- the many-to-many case exposes a confirmation plan before the surrounding Flow is disconnected,
- cancel changes nothing,
- confirm removes the junction Task and its incident edges,
- Undo restores the exact original Task and edges.

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

Tests SHOULD carry requirement IDs or accepted ADR IDs in names or metadata. ADR-0007 is the current authority for full downstream goal completion and delete-one junction reconnection until the main requirements draft is consolidated.

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

Manual checks remain useful for visual density, touch feel, real mobile browser keyboard behavior, drag/drop feel, merged-flow readability, blocked-task explanation clarity, invalidation-confirmation clarity, mobile existing-task connection prototypes, theme aesthetics, and assistive-technology review.

Manual testing must not be the only protection for pure business rules that can be automated.

## Definition of Done for a feature

A feature is not complete until requirement/ADR traceability is identified, the owning module is clear, domain/application tests cover semantic rules, relevant adapter/UI tests exist, regressions are covered, desktop/mobile behavior is checked when shared, migration impact is documented, and UI changes do not bypass the formal UI/application boundary.
