# Contributing to Cherry V2.0

Cherry V2.0 is currently being redesigned from the requirements upward.

## Current rule

During the requirements/basic-design phase, implementation PRs should not add product features unless the corresponding requirement and design have already been accepted.

Before implementation, every feature must have:

1. a requirement / acceptance criteria,
2. an owning module,
3. an explicit public contract,
4. a dependency direction,
5. a test strategy.

## Branching

Create work branches from `v2.0` after the bootstrap branch is merged. Keep PRs focused on one design decision, component, or feature.

## Architecture principles

- Prefer composition over cross-module mutation.
- Domain/application code must not depend directly on browser APIs or concrete storage implementations.
- Infrastructure implements contracts owned by inner layers.
- UI consumes application-facing APIs and must not own business rules.
- Avoid hidden globals and implicit side effects.
- Components should be independently testable and replaceable.

## V1 reference

Do not copy V1 structure automatically. Refer to `main` only to discover required behavior, compatibility constraints, and lessons learned.

## License

By contributing, you agree that your contribution will be licensed under the repository's MIT License.
