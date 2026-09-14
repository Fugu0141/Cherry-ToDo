# ADR-0004: Structural DAG, merges, and derived branching goals

Status: **Accepted for V2.0 — 2026-09-14**

Supersedes the single-parent structural-edge assumption in ADR-0002.

## Context

Cherry V2.0 needs primary flows that can branch and later converge again. It also needs goal behavior to follow the Flow structure instead of introducing a second independent goal model.

Example:

```text
      ┌→ B ─┐
A ────┤     ├→ D
      └→ C ─┘
```

## Decision

Structural Flow is a directed acyclic graph (DAG), not a single-parent tree.

- A Task may have multiple incoming structural edges.
- Structural cycles remain invalid.
- Reference edges remain the separate mechanism for intentional cyclic relationships.
- A Task with two or more outgoing structural edges is treated as a derived branching goal.
- A standalone item remains one ordinary Task; root/top-level status alone does not make it a goal.
- When all Tasks required by the structural branches below a derived goal are complete, Cherry automatically completes that goal.
- Reference edges do not participate in this automatic completion rule.

## Consequences

- Auto-layout, List/read models, traversal, import/export, and History must be DAG-aware.
- A merged Task is one canonical Task even when several upstream paths reach it.
- Tree-only ownership assumptions are invalid for shared downstream Tasks.
- Destructive downstream-scope behavior must explicitly define what happens to a Task that is shared with another upstream path.
- Goal-completion logic must de-duplicate shared descendants.

## Open follow-up decisions before design freeze

1. If a downstream Task is reopened after Cherry auto-completed its parent goal, should that goal automatically reopen? How does manual completion interact with this?
2. When a downstream-scope removal reaches a Task shared by another upstream path, should the shared Task always be preserved or can the user explicitly include it?
3. Presentation must decide how a merged Task appears in List/Board views while retaining one canonical identity.
