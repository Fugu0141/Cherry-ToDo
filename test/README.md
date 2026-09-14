# V2 Tests

The V2 test layout mirrors the frozen test strategy:

- `domain/` — pure semantic rules.
- `application/` — use cases, commands, transactions, History.
- `contracts/` — ports, UI-contract, and architecture contracts.
- `interaction/` — gesture/interaction state machines.
- `integration/` — adapter and composition integration.
- `regression/` — focused reported-bug fixtures.
- `e2e/` — critical user journeys.

Phase 1 includes a real contract-layer smoke test so Vitest exercises source code immediately. Later phases populate the remaining directories as their semantics are implemented.
