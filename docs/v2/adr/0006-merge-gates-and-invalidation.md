# ADR-0006: Merge execution gates, downstream blocking, and invalidation confirmation

Status: **Accepted for V2.0 — 2026-09-14**

## Context

Cherry's normal structural Flow primarily communicates the intended order of work. Making every simple `A → B → C` chain a strict prerequisite system would add friction and would change the product from a flexible flow planner into a dependency engine.

Structural merges are different. If two paths converge into one Task, completing the merged Task before all incoming prerequisite Tasks are complete contradicts the meaning of the merge.

Example:

```text
A ─┐
   ├→ C → D
B ─┘
```

Cherry also needs a predictable rule when a previously valid completed merge path becomes invalid because a predecessor is reopened or the Flow topology changes.

## Decision

### Normal chains remain non-blocking

A simple structural chain does not automatically lock later Tasks.

```text
A □ → B □ → C □
```

The user may still complete `B` or `C` if they choose. The connection communicates intended order, not a universal hard dependency.

### Merge targets are execution gates

A Task with two or more incoming structural edges is an execution gate.

The merge target cannot be marked complete until all direct structural predecessors are complete.

### A closed merge gate blocks its downstream structural region

While a merge execution gate is unresolved, Tasks structurally downstream from that gate inherit the blocked completion state.

```text
A ✓ ─┐
     ├→ C 🔒 → D 🔒
B □ ─┘
```

When the missing predecessor is completed, the gate opens and both the merge target and its downstream region become available again.

This does not turn unrelated one-line Flow into prerequisite locking. The block exists only because that chain lies behind an unresolved merge gate.

### Completion availability is derived, not persisted

The model does not store a mutable `locked` boolean on Task. Application/Domain derives completion availability from the current structural DAG.

Reference edges never create or propagate execution locks.

### Invalid completed states are repaired only after confirmation

If a user action would make one or more already-completed Tasks invalid under the merge-gate rules, Cherry first computes a consequence plan.

Examples include:

- reopening a predecessor of a completed merge,
- connecting a new incomplete predecessor to an already-completed merge target,
- rewiring Flow so completed Tasks move behind an unresolved merge gate.

If the consequence plan would reopen completed Tasks, Presentation MUST show a confirmation before canonical mutation.

Example wording:

```text
この変更により、完了済みのタスクが未完了に戻ります。
続行しますか？
```

Cancel leaves canonical state unchanged. Confirm applies the status change, downstream blocking changes, related auto-goal reopening, and History entry as one validated transaction where practical.

### Automatic goal reopening remains distinct from manual goal completion

A goal that Cherry auto-completed reopens when a required downstream structural Task becomes incomplete.

A goal that the user explicitly completed is not silently reopened merely by the derived-goal evaluator. Any separate invalidation rule that directly affects that Task still follows the ordinary consequence/confirmation process.

## Consequences

Positive:

- ordinary Flow remains flexible,
- merges acquire real semantic meaning,
- later Tasks behind an unresolved merge cannot appear completed out of logical order,
- the UI can explain why a Task is unavailable without owning the rule,
- alternate UI packages cannot bypass completion invariants,
- destructive rollback of completion is visible to the user before it happens.

Trade-offs:

- status and topology commands need impact planning before commit,
- read models must expose blocked reason/gate information,
- large DAG changes may invalidate multiple completed Tasks at once,
- confirmation UX must summarize affected Tasks without overwhelming the user.

## Required implementation shape

The Application layer should expose a revision-aware impact-plan/commit flow for operations that can invalidate completion.

A plan contains at least:

- completed Tasks that would reopen,
- auto-completed goals that would reopen,
- Tasks that would become newly blocked,
- the graph/document revision the plan was calculated from.

Commit must reject or recompute a stale plan if the graph changed after confirmation.

## Tests

V2 must test at least:

- simple one-line Flow stays completion-unlocked,
- unresolved merge target is blocked,
- downstream Tasks inherit the unresolved merge block,
- resolving the merge gate unlocks the downstream region,
- reference edges never create a lock,
- Application rejects completion of a blocked Task even if UI requests it,
- reopening a predecessor of completed merge/downstream Tasks produces an impact plan,
- cancel preserves all canonical statuses and edges,
- confirm reopens affected Tasks transactionally,
- adding a new incomplete predecessor to a completed merge follows the same confirmation rule,
- stale impact plans cannot be committed against a newer graph revision.
