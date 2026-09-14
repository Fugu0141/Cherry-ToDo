# Cherry V2.0

Cherry V2.0 is a ground-up redesign of Cherry-ToDo.

This branch intentionally does **not** inherit the V1 implementation architecture. V1 remains preserved on the `main` branch and in Git history as a behavior/reference source.

## Current phase

V2.0 is currently in the **requirements and basic-design phase**.

Implementation must not begin until the following are completed and reviewed:

1. All currently open GitHub Issues are classified.
2. V2.0 requirements cover every Issue that remains in scope.
3. Core domain concepts and module boundaries are defined.
4. Dependency direction and public interfaces are defined.
5. Persistence, migration, UI, and testing strategies are defined.

## Design goal

Cherry V2.0 should be built from small, reusable, replaceable components with explicit contracts. Features should be assembled from independent parts rather than implemented through cross-cutting patches.

Primary goals:

- high reuse
- low coupling / high cohesion
- explicit dependencies
- testable business logic
- replaceable infrastructure and UI
- no hidden global state
- stable data contracts
- regression prevention through automated tests

## Branch model

- `main`: current V1 line / historical reference
- `v2.0`: V2.0 integration branch
- `chore/v2-bootstrap`: V2.0 clean-slate preparation branch
- feature/design branches: created from `v2.0` after the bootstrap is merged

See [`docs/README.md`](docs/README.md) for the V2 documentation layout.
