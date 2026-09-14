# V2 Basic Design

- [`../DESIGN_FREEZE.md`](../DESIGN_FREEZE.md) — **final V2.0 design-freeze authority and wording corrections**.
- [`BASIC_DESIGN.md`](BASIC_DESIGN.md) — architecture and module/data/interaction design baseline.
- [`FLOW_EXECUTION_RULES.md`](FLOW_EXECUTION_RULES.md) — derived-goal completion, merge execution gates, blocking/invalidation, and deletion semantics, subject to the freeze corrections.
- [`TEST_STRATEGY.md`](TEST_STRATEGY.md) — test pyramid, regression strategy, traceability, and Definition of Done.

Related architecture decisions:

- [`../adr/0001-modular-hexagonal-architecture.md`](../adr/0001-modular-hexagonal-architecture.md) — **Accepted for V2.0**
- [`../adr/0002-structural-and-reference-flow-edges.md`](../adr/0002-structural-and-reference-flow-edges.md) — **Partially superseded by ADR-0004**; structural/reference split retained
- [`../adr/0003-typescript-static-web-toolchain.md`](../adr/0003-typescript-static-web-toolchain.md) — **Accepted for V2.0**
- [`../adr/0004-structural-dag-merges-and-derived-goals.md`](../adr/0004-structural-dag-merges-and-derived-goals.md) — **Accepted for V2.0**
- [`../adr/0005-replaceable-ui-package-contract.md`](../adr/0005-replaceable-ui-package-contract.md) — **Accepted for V2.0**
- [`../adr/0006-merge-gates-and-invalidation.md`](../adr/0006-merge-gates-and-invalidation.md) — **Accepted for V2.0**
- [`../adr/0007-goal-scope-and-junction-deletion.md`](../adr/0007-goal-scope-and-junction-deletion.md) — **Accepted for V2.0**
- [`../adr/0008-goal-demotion-and-migration-normalization.md`](../adr/0008-goal-demotion-and-migration-normalization.md) — **Accepted for V2.0**

ADR-0007 is authoritative for full downstream branching-goal completion scope, no normal manual completion action on current derived branching goals, and delete-one junction reconnection.

ADR-0008 defines both directions of Task/Goal topology transition and requires user-visible normalization preview before V1 data that conflicts with V2 execution rules is committed.

The Core/Application design is frozen for implementation as of 2026-09-14. The exact mobile existing-task connection gesture remains intentionally deferred to UI prototype testing and is not a Core design blocker.