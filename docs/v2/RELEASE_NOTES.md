# Cherry V2.0 Release Notes

Status: **Release-candidate notes — 2026-09-14**

Cherry V2.0 is a design-first rebuild of Cherry around explicit Domain/Application contracts. It keeps flow planning as the semantic center while separating Schedule, Board placement, storage, migration, annotations, and UI presentation.

## Highlights

- Structural Flow is a validated DAG with ordinary continuations, branching, converging merges, and separate cyclic/reference edges.
- Branching goals are derived from topology. Their completion is evaluator-controlled, and merge execution gates block invalid completion without turning ordinary chains into hard dependencies.
- Revision-aware impact planning warns before a topology/status change would reopen completed work; Undo/Redo restores supported semantic changes as logical transactions.
- Board and List share the same canonical Tasks/Flow. Date lanes, auto layout, manual placement, time guidance, and Schedule remain independent concepts.
- Workspaces support multiple named planning tabs with independent semantic content and Board settings. The active workspace/tab/view is restorable session context.
- Desktop and mobile use the same Application commands. Mobile includes touch-safe existing-task Flow connection, coordinated drag/pan ownership, and edge auto-scroll.
- Freehand planning adds reference connections, text annotations, and stroke annotations without creating a second Task model.
- Browser persistence is opt-in. Cherry remains usable in memory when persistence is declined, and settings can stop saving or explicitly clear local Cherry data.
- Supported V1 `.cherry` data, including supported encrypted envelopes, migrates through a non-destructive boundary. V2 also includes bounded ICS import and documented CSV interoperability.
- The standard UI consumes a formal UI contract; a minimal alternate UI package is mounted in tests to prove whole-UI replaceability.
- Japanese/English i18n boundaries, light/dark/system themes, accessibility release audits, static deployment verification, production bundle metrics, and desktop/mobile browser journeys are part of the release gate.

## Compatibility and data safety

V2 does not execute V1 runtime code to migrate old workspaces. Import/migration works on a temporary candidate, validates it, and only commits a valid result. Native V2 data is schema-versioned, and persistent browser writes are gated by explicit user consent.

See `KNOWN_LIMITATIONS.md` for intentionally deferred features and `REQUIREMENT_TRACEABILITY.md` for requirement-level evidence.
