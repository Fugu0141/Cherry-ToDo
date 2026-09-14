# Architecture Decision Records

Important V2 architectural decisions are recorded here so future changes do not silently reverse earlier assumptions.

## Current ADRs

- [`0001-modular-hexagonal-architecture.md`](0001-modular-hexagonal-architecture.md) — Proposed
- [`0002-structural-and-reference-flow-edges.md`](0002-structural-and-reference-flow-edges.md) — Proposed original split; its **single-parent structural assumption is superseded by ADR-0004**
- [`0003-typescript-static-web-toolchain.md`](0003-typescript-static-web-toolchain.md) — Proposed
- [`0004-structural-dag-merges-and-derived-goals.md`](0004-structural-dag-merges-and-derived-goals.md) — **Accepted for V2.0**
- [`0005-replaceable-ui-package-contract.md`](0005-replaceable-ui-package-contract.md) — **Accepted for V2.0**
- [`0006-merge-gates-and-invalidation.md`](0006-merge-gates-and-invalidation.md) — **Accepted for V2.0**
- [`0007-goal-scope-and-junction-deletion.md`](0007-goal-scope-and-junction-deletion.md) — **Accepted for V2.0**
- [`0008-goal-demotion-and-migration-normalization.md`](0008-goal-demotion-and-migration-normalization.md) — **Accepted for V2.0**

ADR-0004 keeps the useful structural/reference distinction from ADR-0002 but replaces the old single-parent tree/forest assumption with an acyclic structural DAG that supports merges.

ADR-0006 defines merge execution gates, downstream blocking, and confirmation before a structural/status change rolls completed work back to incomplete.

ADR-0007 defines full reachable-Flow completion for derived branching goals, removes their normal manual completion action, and defines unambiguous reconnection rules when deleting a single branch/merge junction Task.

ADR-0008 preserves a Task's current completion state when it stops being a derived branching goal and requires preview-before-normalization when imported V1 data conflicts with V2 execution rules.

Each ADR contains context, decision, alternatives/consequences as appropriate, and status. Proposed ADRs move to Accepted only through design review; accepted ADRs remain visible even if later superseded so the reason for architectural changes is preserved.
