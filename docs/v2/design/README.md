# V2 Basic Design

- [`BASIC_DESIGN.md`](BASIC_DESIGN.md) — canonical draft architecture and module/data/interaction design.
- [`FLOW_EXECUTION_RULES.md`](FLOW_EXECUTION_RULES.md) — derived-goal completion, merge execution gates, blocking/invalidation, and deletion semantics.
- [`TEST_STRATEGY.md`](TEST_STRATEGY.md) — test pyramid, regression strategy, traceability, and Definition of Done.

Related architecture decisions:

- [`../adr/0001-modular-hexagonal-architecture.md`](../adr/0001-modular-hexagonal-architecture.md) — Proposed
- [`../adr/0002-structural-and-reference-flow-edges.md`](../adr/0002-structural-and-reference-flow-edges.md) — original structural/reference split; single-parent assumption superseded by ADR-0004
- [`../adr/0003-typescript-static-web-toolchain.md`](../adr/0003-typescript-static-web-toolchain.md) — Proposed
- [`../adr/0004-structural-dag-merges-and-derived-goals.md`](../adr/0004-structural-dag-merges-and-derived-goals.md) — **Accepted for V2.0**
- [`../adr/0005-replaceable-ui-package-contract.md`](../adr/0005-replaceable-ui-package-contract.md) — **Accepted for V2.0**
- [`../adr/0006-merge-gates-and-invalidation.md`](../adr/0006-merge-gates-and-invalidation.md) — **Accepted for V2.0**
- [`../adr/0007-goal-scope-and-junction-deletion.md`](../adr/0007-goal-scope-and-junction-deletion.md) — **Accepted for V2.0**

ADR-0007 is the latest decision for branching-goal completion scope and delete-one junction reconnection and takes precedence over conflicting older draft wording until the consolidation pass.

Implementation does not begin until the remaining design-freeze questions in `BASIC_DESIGN.md` are resolved and the relevant requirements/basic-design decisions are accepted/frozen.
