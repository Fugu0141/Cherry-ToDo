# ADR-0007: Goal scope and junction deletion

Status: Accepted for V2.0 - 2026-09-14

This ADR refines ADR-0004 and ADR-0006. If older wording conflicts with this ADR, this ADR takes precedence.

## Goal completion scope

A Task with two or more outgoing structural edges is a derived branching goal.

Its completion scope is every structural Task reachable downstream from that goal until the structural paths terminate. A merge does not end the scope. Shared descendants are evaluated once. Reference edges are ignored.

A derived branching goal is completed only by the Flow evaluator. The standard Board and List UI do not show a normal completion control for it, and Application rejects direct user completion of a current derived branching goal. If later Flow changes add unfinished downstream work, the normal impact-plan and confirmation rules apply before the completed goal is reopened.

## Delete-one reconnection

Deleting only one Task reconnects surrounding Flow only when the mapping is unambiguous.

- One predecessor and one successor: reconnect predecessor to successor.
- One predecessor and multiple successors: reconnect the predecessor to every successor, preserving branch order.
- Multiple predecessors and one successor: reconnect every predecessor to the successor, preserving the merge.
- Multiple predecessors and multiple successors: do not automatically create every possible predecessor-successor relationship. Remove the deleted Task and its incident edges, leave the surrounding groups disconnected, and require confirmation because Flow continuity will be broken.

Application computes the planned result. Presentation only explains and confirms it. Undo restores the original Task and edges.

## Consequences

Goal completion uses full downstream DAG reachability rather than stopping at a merge. Adding new downstream work can reopen a completed goal after confirmation. Derived goals are evaluator-controlled rather than user-completable. Junction deletion uses predecessor/successor cardinality and never invents many-to-many relationships.
