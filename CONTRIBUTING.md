# Contributing to Cherry V2.0

Cherry V2.0 is implemented from a frozen design in bounded phases.

## Start here

Before changing code, read:

1. `docs/v2/DESIGN_FREEZE.md`
2. `docs/v2/IMPLEMENTATION_PLAN.md`
3. the relevant accepted ADRs and requirements
4. `docs/v2/DEVELOPMENT_SETUP.md`

## Phase rule

Implementation PRs must stay inside the active phase scope. A later-phase feature should not be added early simply because nearby code is already being changed.

Before implementation, every feature must have:

1. a requirement / acceptance criteria,
2. an owning module,
3. an explicit public contract,
4. a dependency direction,
5. a test strategy.

## Branching

Create focused work branches from the current `v2.0`. A phase is a milestone, not one mega-PR; prefer small reviewable PRs whose combined result satisfies the phase exit criteria.

## Architecture principles

- Prefer composition over cross-module mutation.
- Domain/application code must not depend directly on browser APIs or concrete storage implementations.
- Infrastructure implements contracts owned by inner layers.
- UI consumes application-facing APIs and must not own business rules.
- Avoid hidden globals and implicit side effects.
- Components should be independently testable and replaceable.
- Cross-module code must use public module entry points.

## Quality baseline

Once the Phase 1 toolchain is present, run:

```bash
npm ci
npm run check
```

A PR targeting `v2.0` should not merge while the V2 CI quality job fails.

## V1 reference

Do not copy V1 structure automatically. Refer to `main` only to discover required behavior, compatibility constraints, and lessons learned.

## License

By contributing, you agree that your contribution will be licensed under the repository's MIT License.
