# Cherry V2.0 Flow Execution Rules

Status: **Draft — V2.0 design-freeze candidate**  
Related: `../adr/0004-structural-dag-merges-and-derived-goals.md`

This document records the execution semantics that sit on top of the structural Flow DAG. These rules are Domain/Application rules; UI packages only visualize and invoke them.

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

If the user explicitly completed the goal manually, the goal-completion evaluator does not silently undo that explicit completion merely because a downstream Task changes.

## 2. Structural merge completion gate

A Task with two or more incoming structural edges is a **merge target**.

A merge target cannot be newly marked complete until all of its direct structural predecessor Tasks are complete.

Example:

```text
A ✓ ─┐
     ├→ C 🔒
B □ ─┘
```

`C` is visible but completion is unavailable.

When all incoming predecessor Tasks are complete:

```text
A ✓ ─┐
     ├→ C □
B ✓ ─┘
```

`C` becomes available for normal completion. It is **not** automatically completed merely because the prerequisites became complete.

### 2.1 Application contract

The completion command must validate the merge gate even when a UI package incorrectly enables its completion control.

Conceptually:

```ts
TaskCompletionAvailability =
  | { kind: "available" }
  | {
      kind: "blocked-by-merge";
      remainingPredecessorIds: TaskId[];
      completed: number;
      total: number;
    };
```

Read models may expose this as a lock, progress value, explanation, or another accessible affordance. The visual representation is a UI-package decision.

### 2.2 Remaining invalidation decision

Still to freeze: if a merge target was already completed while its prerequisites were valid and a predecessor is later reopened — or a new incomplete predecessor is connected — determine whether the merge target automatically reopens or keeps its historical completion.

## 3. Downstream deletion is chain-limited

Cherry does not interpret “delete downstream Flow” as recursive deletion of an arbitrary DAG subtree.

The operation removes only the selected Task and the following **single unambiguous chain**.

Traversal stops **before** a junction Task when either condition becomes true:

- the next Task is a merge point (`incoming structural edge count >= 2`),
- the next Task is a branch point (`outgoing structural edge count >= 2`).

The junction Task itself remains.

### 3.1 Merge boundary example

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

### 3.2 Branch boundary example

```text
A → B → C
        ├→ D
        └→ E
```

Starting a downstream deletion at `B` stops before branch point `C`. The branch junction and everything after it remain.

The implementation may need to reconnect or promote the preserved junction according to the ordinary safe-delete rules, but it must not cross that junction and delete unrelated branches automatically.

### 3.3 Safety properties

- A destructive traversal never crosses a branch or merge junction automatically.
- A Task used by another structural path is never deleted merely because another path was removed.
- The planned removal set is computed before mutation and shown/confirmed by Presentation where useful.
- The command is transactional and participates in Undo/Redo where practical.

## 4. Tests required

At minimum add Domain/Application tests for:

1. a 2-way branch becoming a derived goal,
2. automatic goal completion after all required descendants complete,
3. auto-completed goal reopening when a required descendant reopens,
4. manual goal completion not being silently undone by the derived-goal evaluator,
5. `A done + B todo → C` blocking completion of merge target `C`,
6. completing `B` unlocking `C` without auto-completing it,
7. UI-level bypass attempts still being rejected by the completion command,
8. downstream deletion stopping before a merge junction,
9. downstream deletion stopping before a branch junction,
10. Undo restoring the deleted chain and structural edges,
11. shared descendants never being duplicated by traversal/read models.
