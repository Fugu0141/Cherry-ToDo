# Cherry V2.0 Agent Rules

## Development phase

Cherry V2.0 is currently in requirements definition and basic design.

Do not implement product features before their requirements and owning module are defined.

## Source of truth

- `main` is the V1 behavior/reference line.
- `v2.0` is the V2 integration line.
- V2 documentation under `docs/v2/` becomes the source of truth for new development.

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
- Avoid compatibility bridges unless explicitly approved by an ADR.

## Quality gates

Before a V2 feature is considered complete, it must have acceptance criteria and automated tests at the appropriate layer.
