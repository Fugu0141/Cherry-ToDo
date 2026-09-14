# Cherry V2.0

Cherry V2.0 is a ground-up redesign of Cherry-ToDo.

This branch intentionally does **not** inherit the V1 implementation architecture. V1 remains preserved on the `main` branch and in Git history as a behavior/reference source.

## Current phase

The V2.0 **requirements and Core/Application basic design are frozen for implementation** as of 2026-09-14.

The final review covered the open-Issue inventory, requirements, module/dependency boundaries, Flow/Goal/merge/delete semantics, persistence consent, V1 migration, replaceable UI boundary, startup architecture, and test strategy.

The exact mobile gesture/UI for connecting existing Tasks remains intentionally deferred to prototype testing; the capability and Core command contract are already required and this does not block implementation.

The authoritative freeze record is [`docs/v2/DESIGN_FREEZE.md`](docs/v2/DESIGN_FREEZE.md).

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

- `main`: V1 line / historical reference
- `v2.0`: V2.0 integration branch
- feature/design branches: created from `v2.0` after the bootstrap is merged

See [`docs/README.md`](docs/README.md) for the V2 documentation layout.