# Cherry V2.0 Design Freeze Record

Status: **Frozen for implementation — 2026-09-14**

This record closes the V2 requirements/basic-design review for PR #251. It is the authority for freeze status and for the wording corrections listed below. Accepted ADRs remain the detailed source of truth for their topics.

## Freeze decision

The V2 Core/Application design is approved for implementation.

The only intentionally deferred product/UX choice is the exact mobile gesture/UI for connecting existing Tasks. The capability and Core command contract are required; the touch interaction will be selected through prototype testing and does not block Core implementation.

## Final Flow and Goal semantics

1. Structural Flow is an acyclic DAG that supports branching and merging.
2. Reference edges are separate and may form cycles; they do not participate in structural execution, goal completion, or structural layout.
3. A Task with two or more outgoing structural edges is a derived branching goal.
4. A derived branching goal has **no normal manual completion control**. Application rejects direct user completion while the Task is currently a derived branching goal.
5. A derived branching goal completes only when **every structural Task reachable downstream from it** is complete. Reconvergence does not end the goal scope; shared descendants are evaluated once.
6. If a change would make a completed derived goal or another completed Task invalid, Application calculates an impact plan first and Presentation asks for confirmation before canonical mutation.
7. When an ordinary completed Task is promoted into a derived branching goal and unfinished reachable descendants make the current completion invalid, the same impact-plan/confirm/commit rule applies.
8. When a derived branching goal becomes an ordinary Task again, its current `done`/`todo` state is preserved and the ordinary completion control returns.
9. A Task with two or more incoming structural edges is a merge execution gate. It cannot be completed until all direct structural predecessors are complete.
10. A closed merge gate propagates completion blocking downstream. Ordinary one-line Flow by itself remains non-blocking because ordinary Flow primarily communicates intended order.

## Final deletion semantics

### Delete this Task and downstream Flow

Deletion follows only the single unambiguous chain and stops **before** the next branch or merge junction. The junction itself and unrelated/shared paths are preserved.

### Delete this Task only

Reconnection is based on predecessor/successor cardinality:

- 1 predecessor / 1 successor: reconnect directly.
- 1 predecessor / many successors: reconnect the predecessor to the successors and preserve the branch.
- many predecessors / 1 successor: reconnect the predecessors to the successor and preserve the merge.
- many predecessors / many successors: do not invent a predecessor × successor cross-product. Remove the selected junction and incident edges, leave the surrounding groups disconnected, and require confirmation that Flow continuity will be broken.

Undo restores the original Task and edges.

## Persistence and migration freeze

- Persistent browser storage is opt-in. Until explicit **Allow**, Cherry uses the in-memory repository and MUST NOT write workspace/task data to persistent browser storage.
- Supported native V1 `.cherry` files and supported encrypted V1 `.cherry` envelopes are official migration targets.
- Legacy browser-storage recovery is best effort and non-destructive.
- V1 import is parsed and validated as a temporary candidate. If V2 rules require completion-state normalization, Cherry shows a migration preview before commit. Cancel leaves both the source and current V2 workspace unchanged; confirm commits the normalized candidate transactionally.

## Architecture and toolchain freeze

The following decisions are approved for V2 implementation:

- modular hexagonal / ports-and-adapters architecture,
- Domain/Application remain headless,
- formal replaceable UI package boundary,
- TypeScript strict mode + ES modules,
- Vite static build baseline,
- Vitest unit/application/contract test baseline,
- static deployment remains compatible with GitHub Pages.

A presentation framework remains an implementation choice inside the UI package and MUST NOT leak into Domain/Application public contracts.

## Normative wording corrections

The following older draft passages are superseded by this freeze record and ADR-0007/ADR-0008:

- `requirements/REQUIREMENTS.md` `R-TASK-003`: wording about a user manually completing a current derived branching goal is obsolete. Current derived branching goals are evaluator-controlled and expose no normal manual completion action.
- `design/BASIC_DESIGN.md` section 5.4: wording that distinguishes an explicit manual completion of a current derived branching goal is obsolete for the same reason.
- `design/FLOW_EXECUTION_RULES.md` section 1.2 and its old manual-goal-completion test item: current derived branching goals cannot be directly user-completed.
- `adr/0004-structural-dag-merges-and-derived-goals.md`: references to preserving explicit manual completion of a current derived branching goal are superseded by ADR-0007 and ADR-0008.
- `issues/OPEN_ISSUE_INVENTORY.md` row #78: “top-level goal” reflects the historical Issue wording. The V2 implementation target is the current **derived branching goal**, not every root/top-level Task.

Where those draft passages conflict with accepted ADR-0007, ADR-0008, or this record, the accepted ADRs and this record take precedence.

## Review result

The final review found no unresolved Core semantic blocker after applying the precedence/corrections above. Requirement ownership, DAG/merge semantics, Goal behavior, deletion safety, persistence consent, migration safety, replaceable UI boundary, interaction ownership, startup architecture, and test strategy are sufficient to begin implementation.

Implementation should preserve requirement/ADR traceability and add automated tests at the semantic layer before or with each feature. The mobile existing-task connection gesture remains deliberately deferred to the UI prototype phase.