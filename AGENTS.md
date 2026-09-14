# Cherry V2.0 Agent Rules

## Development phase

Cherry V2.0 requirements and Core/Application basic design are frozen. Implementation follows `docs/v2/IMPLEMENTATION_PLAN.md` phase by phase.

Do not skip a phase's exit criteria or pull later-phase product features into an earlier-phase PR merely because the dependency is convenient.

## Source of truth

- `main` is the V1 behavior/reference line.
- `v2.0` is the V2 integration line.
- `docs/v2/DESIGN_FREEZE.md` and accepted ADRs take precedence over older draft wording.
- `docs/v2/IMPLEMENTATION_PLAN.md` controls implementation sequence and phase scope.

If V1 code conflicts with an accepted V2 requirement/design, the V2 document wins.

## Architecture constraints

Design for reusable components that can be assembled through explicit interfaces.

- Keep domain logic framework/browser independent.
- Keep application orchestration separate from domain rules.
- Access storage, time, IDs, files, browser capabilities, and other side effects through ports/interfaces.
- Infrastructure depends on those ports, not the reverse.
- UI must not directly mutate persistence or global state.
- Prefer dependency injection/composition at an application entry point.
- Every module exposes the smallest practical public API.
- Cross-module consumers use public entry points rather than another module's internals.
- Avoid compatibility bridges unless explicitly approved by an ADR.

## Quality gates

Before a phase or feature is considered complete, its applicable exit criteria and acceptance tests must pass. Run `npm run check` for the Phase 1 engineering baseline once the toolchain is present.
