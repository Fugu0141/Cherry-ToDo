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
- If Cherry auto-completed a goal and a required downstream structural Task becomes incomplete, the goal automatically reopens.
- Explicit manual goal completion is not silently undone merely by the derived-goal evaluator.
- Reference edges do not participate in automatic goal completion/reopening.

### Merge execution semantics

A Task with two or more incoming structural edges is a structural merge target and an execution gate.

A merge target MUST NOT be newly marked complete while any direct structural predecessor is incomplete.

A closed merge gate also blocks completion of its downstream structural region until the gate opens.

Example:

```text
A ✓ ─┐
     ├→ C 🔒 → D 🔒
B □ ─┘
```

When `B` becomes complete, `C` and `D` become available for normal completion. Neither is auto-completed by the gate opening.

Ordinary one-line Flow remains non-blocking unless it lies behind a closed merge gate.

Detailed invalidation/confirmation semantics are defined in ADR-0006.

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

## Consequences

- Auto-layout, List/read models, traversal, import/export, and History must be DAG-aware.
- A merged Task is one canonical Task even when several upstream paths reach it.
- Tree-only ownership assumptions are invalid for shared downstream Tasks.
- Goal-completion logic must de-duplicate shared descendants.
- Automatic goal completion/reopening must preserve enough intent/history information to distinguish automatic from manual completion.
- Merge targets expose a derived completion-availability state to read models/UI packages.
- A closed merge gate may create a derived blocked state in later Tasks without persisting a mutable `locked` flag.
- Downstream deletion is a chain operation, not a recursive graph-subtree delete.
- Branch and merge junctions are safety boundaries for destructive traversal.

## Resolved follow-up decisions

The original follow-up questions for this ADR are resolved:

1. **Auto-completed goal reopening:** yes; auto-completed goals reopen when a required structural descendant becomes incomplete. Manual completion remains distinguishable.
2. **Shared downstream deletion:** downstream deletion stops before branch/merge junctions and never automatically crosses shared graph structure.
3. **Completed merge invalidation:** if a user action would make completed Tasks invalid under the merge-gate rules, Application first computes an impact plan and Presentation requires confirmation before those Tasks are reopened. See ADR-0006.
4. **Merged Task identity:** merged Tasks remain one canonical semantic Task. Presentation may choose suitable indicators but may not clone the semantic entity to fake a tree.

See also:

- `0006-merge-gates-and-invalidation.md`
- `../design/FLOW_EXECUTION_RULES.md`
