# Cherry V2.0 Flow Execution Rules

Status: **Accepted execution semantics for V2.0 — 2026-09-14**  
Related: `../adr/0004-structural-dag-merges-and-derived-goals.md`, `../adr/0006-merge-gates-and-invalidation.md`

This document records the execution semantics that sit on top of the structural Flow DAG. These rules are Domain/Application rules; UI packages only visualize them, request operations, and present required confirmations.

## 1. Derived branching goals

A separate persisted Goal entity is not required.

```text
outgoing structural edges 0 or 1 → ordinary Task
outgoing structural edges 2+     → derived branching goal
```

Root/top-level status alone does not create goal semantics.

### 1.1 Automatic completion

A derived branching goal is automatically completed when every Task required by its outgoing structural Flow is complete.

Rules:

- only structural Flow participates,
- reference/cyclic edges are ignored,
- shared descendants after a merge are evaluated once,
- nested goals are supported,
- one user operation and its resulting derived completion changes should form one logical History transaction where practical.

### 1.2 Automatic reopening

Cherry distinguishes an automatic goal completion from an explicit manual completion.

If Cherry automatically completed a branching goal and a required downstream structural Task later becomes incomplete, Cherry automatically reopens that goal.

If the user explicitly completed the goal manually, the derived-goal evaluator does not silently undo that explicit manual completion merely because a downstream Task changes.

Automatic reopening caused by the same user operation belongs to that operation's planned consequence set and History transaction.

## 2. Structural merge as an execution gate

A Task with two or more incoming structural edges is a **merge target** and therefore an **execution gate**.

A merge target cannot be newly marked complete until all of its direct structural predecessor Tasks are complete.

Example:

```text
A ✓ ─┐
     ├→ C 🔒
B □ ─┘
```

`C` is visible and editable, but completion is unavailable.

When all incoming predecessor Tasks are complete:

```text
A ✓ ─┐
     ├→ C □
B ✓ ─┘
```

`C` becomes available for normal completion. It is **not** automatically completed merely because its prerequisites became complete.

### 2.1 A normal one-line Flow is not a prerequisite lock

Cherry's ordinary Flow primarily communicates **the intended order of work**. A simple chain does not, by itself, forbid completing a later Task.

Therefore this is allowed as ordinary Flow behavior:

```text
A □ → B □ → C □
```

`B` and `C` are not automatically locked merely because `A` is unfinished.

This keeps normal Cherry Flow lightweight instead of turning every connection into a strict dependency system.

## 3. Merge-gate blocking propagates downstream

Although an ordinary one-line Flow is not locked, a Task that is downstream of a **currently closed merge gate** inherits that gate's blocked execution state.

Example:

```text
A ✓ ─┐
     ├→ C 🔒 → D 🔒
B □ ─┘
```

`C` is blocked because not all merge prerequisites are complete. `D` is also blocked because it lies behind the unresolved execution gate at `C`.

When `B` is completed:

```text
A ✓ ─┐
     ├→ C □ → D □
B ✓ ─┘
```

The gate opens and the inherited downstream block disappears.

### 3.1 Propagation rule

For a structural Task `T`, completion is blocked when either:

1. `T` itself is a merge target with one or more incomplete direct structural predecessors, or
2. at least one structural path leading to `T` passes through an unresolved merge gate whose downstream dependency has not yet been released.

Conceptually, the application computes a derived execution availability rather than persisting a separate `locked` flag.

```ts
type TaskCompletionAvailability =
  | { kind: "available" }
  | {
      kind: "blocked-by-merge";
      gateTaskIds: TaskId[];
      remainingPredecessorIds: TaskId[];
    };
```

A Task can therefore be blocked by more than one unresolved merge gate in a larger DAG.

Reference/cyclic edges never create or propagate structural execution locks.

### 3.2 UI behavior for blocked Tasks

A blocked Task remains a real editable Task. The user may still, where otherwise valid:

- edit its title/notes,
- change its schedule,
- move it on the Board,
- inspect its Flow relationships.

The UI MUST NOT present normal completion as available while the Application reports `blocked-by-merge`.

The Application command MUST reject a completion attempt even if a UI package incorrectly enables the control.

The default UI should explain the reason succinctly, for example:

```text
🔒 前提タスク 1 / 2 完了
```

or, for an inherited block:

```text
🔒 前の合流タスクの完了待ち
```

Exact wording and visuals remain a UI-package decision.

## 4. Invalidation of already-completed Tasks

A completed Task may become invalid under the current structural execution rules when, for example:

- one of a merge target's completed predecessors is reopened,
- a new incomplete structural predecessor is connected to an already-completed merge target,
- a Flow edit causes an already-completed Task to become downstream of a closed merge gate.

Cherry MUST NOT leave the graph in a state where a Task is `done` while its current merge-gate execution condition says that completion is not available.

After user confirmation, affected completed Tasks are reopened to `todo` and become blocked as appropriate.

Example:

```text
Before:
A ✓ ─┐
     ├→ C ✓ → D ✓
B ✓ ─┘

User attempts to reopen B.

Planned result:
A ✓ ─┐
     ├→ C 🔒 → D 🔒
B □ ─┘
```

`C` and `D` return to incomplete because the execution gate they depend on is no longer satisfied.

Any auto-completed branching goals affected by the same change are also reopened according to Section 1.2.

### 4.1 Confirmation is mandatory when completion would be rolled back

Before committing an operation that would automatically change one or more already-completed Tasks back to incomplete, Cherry MUST calculate and expose the consequence set to Presentation.

The UI MUST ask for confirmation before committing the destructive semantic change.

Example user-facing wording:

```text
この変更により、完了済みのタスクが未完了に戻ります。
続行しますか？
```

The confirmation may additionally show the number or names of affected Tasks when useful.

Cancelling the confirmation leaves the entire canonical graph unchanged.

This applies whether the invalidation was caused by a status change or by a structural Flow edit.

### 4.2 Plan-then-commit command pattern

The Application should model these operations as a plan/commit boundary rather than letting the UI guess impact.

Conceptually:

```ts
interface CompletionImpactPlan {
  directChanges: TaskId[];
  autoReopenedGoalIds: TaskId[];
  invalidatedCompletedTaskIds: TaskId[];
  newlyBlockedTaskIds: TaskId[];
}
```

Flow/status operations that may invalidate completion first produce or expose this plan. Presentation confirms when `invalidatedCompletedTaskIds` is non-empty, then the Application commits the validated plan transactionally.

The plan MUST be recomputed or revision-checked at commit time so stale UI confirmation cannot apply to a changed graph.

## 5. Downstream deletion is chain-limited

Cherry does not interpret “delete downstream Flow” as recursive deletion of an arbitrary DAG subtree.

The operation removes only the selected Task and the following **single unambiguous chain**.

Traversal stops **before** a junction Task when either condition becomes true:

- the next Task is a merge point (`incoming structural edge count >= 2`),
- the next Task is a branch point (`outgoing structural edge count >= 2`).

The junction Task itself remains.

### 5.1 Merge boundary example

```text
A → B → C ─┐
            ├→ D → E
X ──────────┘
```

Starting a downstream deletion at `B` deletes `B` and `C`, then stops before `D` because `D` is a merge point.

Result:

```text
X → D → E
```

### 5.2 Branch boundary example

```text
A → B → C
        ├→ D
        └→ E
```

Starting a downstream deletion at `B` stops before branch point `C`. The branch junction and everything after it remain.

The implementation may need to reconnect or promote the preserved junction according to the ordinary safe-delete rules, but it must not cross that junction and delete unrelated branches automatically.

### 5.3 Safety properties

- A destructive traversal never crosses a branch or merge junction automatically.
- A Task used by another structural path is never deleted merely because another path was removed.
- The planned removal set is computed before mutation and shown/confirmed by Presentation where useful.
- The command is transactional and participates in Undo/Redo where practical.

## 6. Tests required

At minimum add Domain/Application tests for:

1. a 2-way branch becoming a derived goal,
2. automatic goal completion after all required descendants complete,
3. auto-completed goal reopening when a required descendant reopens,
4. manual goal completion not being silently undone by the derived-goal evaluator,
5. an ordinary one-line Flow not locking later Tasks,
6. `A done + B todo → C` blocking completion of merge target `C`,
7. completing `B` unlocking `C` without auto-completing it,
8. `A/B → C → D` propagating a closed merge gate from `C` to `D`,
9. resolving the gate unlocking both `C` and `D`,
10. UI-level bypass attempts still being rejected by the completion command,
11. reopening a predecessor of completed `C/D` producing an invalidation plan before mutation,
12. cancelling the invalidation confirmation leaving the graph unchanged,
13. confirming the invalidation reopening affected completed Tasks transactionally,
14. connecting a new incomplete predecessor to an already-completed merge target requiring confirmation before rollback,
15. downstream deletion stopping before a merge junction,
16. downstream deletion stopping before a branch junction,
17. Undo restoring the deleted chain and structural edges,
18. shared descendants never being duplicated by traversal/read models,
19. reference edges never creating merge locks,
20. stale confirmation plans being rejected or recomputed after graph revision changes.
