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

### Automatic goal reopening

Cherry distinguishes completion caused automatically by the derived-goal evaluator from an explicit manual completion.

- If Cherry automatically completed a derived branching goal and a required downstream structural Task later becomes incomplete again, the automatically completed goal MUST reopen automatically.
- An explicit manual completion is user intent and is not silently rewritten by the automatic goal-completion evaluator merely because a downstream Task changes.
- Automatic completion/reopening is performed by Domain/Application behavior, not UI-side cascading mutations.

### Merge completion gate

A Task with two or more incoming structural edges is a structural merge target.

A merge target MUST NOT be newly marked complete while any of its direct incoming structural predecessor Tasks are incomplete.

Example:

```text
A done ─┐
        ├→ C locked
B todo ─┘
```

After all direct predecessors are complete, the merge target becomes completable:

```text
A done ─┐
        ├→ C todo / available
B done ─┘
```

This rule is a Domain/Application invariant. UI packages may visualize the locked state differently, but no UI package may bypass the completion gate.

Completing all predecessors unlocks the merge target; it does **not** automatically complete the merge target itself.

The behavior for an already-completed merge target when a predecessor is later reopened, or when a new incomplete predecessor is connected afterward, remains a design-freeze question.

### Chain-limited downstream deletion

The destructive operation “delete this Task and downstream Flow” is intentionally conservative.

It removes only the selected Task and the single unambiguous structural chain that follows it. Traversal MUST stop before a structural junction:

- a **merge boundary**: the next Task has two or more incoming structural edges,
- a **branch boundary**: the next Task has two or more outgoing structural edges.

The boundary Task itself is preserved. Cherry does not cross a branch or merge automatically during a downstream destructive operation.

Example:

```text
A → B → C ─┐
            ├→ D
X ──────────┘
```

Deleting `B` with downstream scope may remove `B` and `C`, but traversal stops before shared merge Task `D`.

This avoids deleting Tasks that belong to another path and removes the need to guess ownership in a DAG.

## Consequences

- Auto-layout, List/read models, traversal, import/export, and History must be DAG-aware.
- A merged Task is one canonical Task even when several upstream paths reach it.
- Tree-only ownership assumptions are invalid for shared downstream Tasks.
- Goal-completion logic must de-duplicate shared descendants.
- Automatic goal completion must record whether the completion was automatic or explicit enough for the evaluator/history layer to preserve user intent.
- Merge targets expose a derived completion-availability state to read models/UI packages.
- Downstream deletion is a chain operation, not a recursive graph-subtree delete.
- Branch and merge junctions are safety boundaries for destructive traversal.

## Remaining design-freeze question

If a merge target was validly completed and one of its predecessor Tasks later becomes incomplete (or a new incomplete predecessor is connected), should Cherry automatically reopen that merge target, or preserve the historical completion and only block future completion transitions?
