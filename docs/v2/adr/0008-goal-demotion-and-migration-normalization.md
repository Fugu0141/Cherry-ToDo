# ADR-0008: Goal topology transitions and migration normalization

Status: **Accepted for V2.0 — 2026-09-14**

## Context

Cherry V2 derives branching-goal semantics from structural Flow topology. A Task can therefore move in either direction between an ordinary Task and a derived branching goal when Flow connections change. V1 data may also contain completion states that were valid under earlier behavior but conflict with V2 execution rules.

## Decision

### Goal demotion preserves current completion state

When a Task changes from a derived branching goal to an ordinary Task because its outgoing structural edge count falls below two, Cherry preserves the Task's current `status`.

Examples:

- an auto-completed branching goal that becomes an ordinary Task remains `done`,
- an incomplete branching goal that becomes an ordinary Task remains `todo`.

After demotion, the ordinary Task once again exposes the normal completion control because it is no longer evaluator-controlled as a branching goal.

Topology change alone is not a reason to rewrite the current status unless another independent V2 invariant requires invalidation.

### Goal promotion uses impact planning when current completion becomes invalid

When an ordinary Task becomes a derived branching goal because its outgoing structural edge count becomes two or more, the new goal condition takes effect immediately.

A current derived branching goal is evaluator-controlled and is complete only when every structural Task reachable downstream from it is complete.

If the Task was already `done` but the newly created branching goal has one or more incomplete required downstream Tasks, Cherry MUST NOT silently leave the new goal complete and MUST NOT silently reopen it.

Instead:

1. Application computes an impact plan before mutating canonical state.
2. The plan reports that the promoted Task would return to `todo` and includes any other completion changes caused by the same Flow edit.
3. Presentation warns the user and asks for confirmation.
4. Cancel leaves the Flow and completion state unchanged.
5. Confirm applies the Flow edit and planned status changes transactionally.

Example:

```text
Before:
A done -> B done

Proposed Flow edit:
       -> B done
A done
       -> C todo

Confirmed result:
       -> B done
A todo
       -> C todo
```

After promotion, the normal completion control is no longer shown for `A`. When every reachable structural descendant is complete, the Flow evaluator automatically completes `A`.

If the ordinary Task being promoted is already `todo`, no status rollback is required solely because of promotion, though other Flow invariants may still require confirmation.

### V1 migration uses preview-before-normalization

V1 `.cherry` migration must validate the imported candidate against current V2 Flow execution rules before committing it as a V2 workspace.

If the candidate contains completion states that conflict with V2 rules, migration must not silently rewrite them.

Examples include:

- a branching parent marked complete while reachable structural descendants remain incomplete,
- a completed merge target whose current predecessors would leave its execution gate closed,
- completed downstream Tasks located behind a closed merge gate.

The migration pipeline must produce a normalization preview describing the proposed changes before commit. Presentation must show the user that one or more Tasks will change status and allow cancellation.

If the user cancels, no V2 workspace is committed and the source remains unchanged.

If the user confirms, the normalized candidate is committed transactionally as V2 data.

The preview should include at least the number of affected Tasks and may include Task names/details when useful.

## Consequences

- Derived-goal status is topology-derived, but Task completion state is not erased merely because goal topology disappears.
- Promotion into a derived branching goal can invalidate an existing `done` state, but that rollback always follows the same plan-confirm-commit pattern used elsewhere in Cherry.
- A derived branching goal never gains a normal manual completion action merely because it was formerly an ordinary Task.
- V1 compatibility remains non-destructive and transparent.
- Migration normalization reuses the same invariant/impact-planning concepts used by live V2 Flow edits where practical.
- Tests must cover goal demotion for both `done` and `todo` states, goal promotion with and without required rollback, cancellation/confirmation behavior, and migration preview/cancel/confirm behavior for V2-invalid legacy completion states.
