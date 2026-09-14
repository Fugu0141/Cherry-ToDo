# Freehand, Reference Flow, and Annotations

Status: **Phase 8 implementation contract — 2026-09-14**

This document records the V2.0 behavior implemented for freehand planning and annotations. It is subordinate to `../DESIGN_FREEZE.md` and accepted ADRs.

## 1. Freehand is a Board composition, not another workspace model

Cherry does not introduce a whiteboard-specific Task or Workspace model.

The initial freehand planning composition is:

```text
date lanes hidden
+ auto layout off
+ normal Task/Flow editing
+ optional annotations
```

Switching to this composition changes Board presentation settings only. It does not rewrite Task Schedule or Flow relationships.

## 2. Reference Flow

Reference edges remain directed Flow edges but are outside the structural DAG.

- Reference edges may form cycles such as `A → B → C → A`.
- Self-links remain unsupported in V2.0.
- Reference edges do not participate in derived-goal completion, merge execution gates, structural blocking, or structural auto-layout.
- The default renderer consumes the finite edge collection directly and therefore does not recursively traverse a reference cycle.
- Reference connectors retain a directional arrowhead and a distinct non-color-only edge presentation from structural connections.

## 3. Annotation model

Annotations are separate entities stored in `TabDocument.annotations`. They are never Tasks and do not appear in Task List/Schedule semantics.

V2.0 supports:

- text annotations: Board rectangle, text, and a small style token set;
- stroke annotations: Board-coordinate points, width token, and style token.

Initial standard-UI style tokens are intentionally small and can be visually redesigned later without changing annotation semantics.

## 4. Editing and History

The Application layer owns annotation mutation commands. The UI does not mutate persisted annotation objects directly.

Supported logical operations are:

- create,
- edit text,
- move,
- resize/scale,
- style change,
- stroke-width change,
- delete.

Each committed operation participates in the shared Workspace History, so Undo/Redo restores annotation state together with other V2 document state.

## 5. Drawing interaction ownership

Stroke drawing extends the existing `InteractionCoordinator` using `drawing-stroke` ownership.

During an active drawing pointer session:

- Board pan cannot claim the same interaction,
- Task drag cannot claim the same interaction,
- connection creation cannot claim ownership,
- collected points remain ephemeral until pointer-up commits one annotation command.

Pointer-cancel discards the in-progress preview.

## 6. Point sampling and payload bounds

The default drawing controller throttles dense pointer samples before commit. The Application annotation helper then applies a second deterministic simplification/bounding pass.

The initial persisted stroke limit is 512 sampled points per committed stroke. First and final points are preserved by the simplifier.

This is an implementation safety bound, not a promise that drawing fidelity or exact thresholds are visually frozen. Phase 10 or later UX refinement may tune sampling while preserving the same annotation contract.

## 7. Persistence

Annotations are part of the canonical `WorkspaceDocument`. The native V2 codec therefore preserves them through save/load and full-fidelity native export/import.

Validation occurs before a decoded document is accepted, consistent with the existing V2 non-destructive candidate pipeline.

## 8. Deliberately deferred polish

Phase 8 establishes functional capability, not final whiteboard ergonomics. The following can be refined later without changing Core semantics:

- annotation toolbar placement,
- direct-manipulation resize handles,
- stroke smoothing feel,
- exact visual style mapping,
- annotation selection visuals,
- keyboard shortcuts and advanced drawing affordances.

The V2.0 scope deliberately remains smaller than a general-purpose Miro-style shape suite.
