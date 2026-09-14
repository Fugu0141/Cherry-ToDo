# Cherry V2.0

Cherry V2.0 is a ground-up redesign of Cherry-ToDo.

This branch intentionally does **not** inherit the V1 implementation architecture. V1 remains preserved on the `main` branch and in Git history as a behavior/reference source.

## Current phase

The V2.0 **requirements and Core/Application basic design are frozen for implementation** as of 2026-09-14.

Implementation is controlled by [`docs/v2/IMPLEMENTATION_PLAN.md`](docs/v2/IMPLEMENTATION_PLAN.md). Each phase has explicit scope, non-goals, and exit criteria so later features do not leak into earlier foundation work.

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

## Development baseline

Phase 1 establishes TypeScript strict mode, Vite, Vitest, lint/format checks, architecture-boundary checks, and CI before product features are implemented.

See [`docs/v2/DEVELOPMENT_SETUP.md`](docs/v2/DEVELOPMENT_SETUP.md) for setup and commands.

## Branch model

- `main`: V1 line / historical reference
- `v2.0`: V2.0 integration branch
- feature branches: created from the current `v2.0` and kept within the active implementation phase

See [`docs/README.md`](docs/README.md) for the V2 documentation layout.
