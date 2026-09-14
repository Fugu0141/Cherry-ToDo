# Cherry V2.0 Open Issue Inventory

Status: **Draft for V2 requirements review**  
Inventory date: 2026-09-14  
Source: all currently open GitHub Issues in `Fugu0141/Cherry-ToDo`

## Purpose

V2 must not turn every historical Issue into a separate patch. This inventory converts each open Issue into one of five dispositions:

- **FOUNDATIONAL** — drives a V2 model or architecture boundary.
- **REQUIREMENT** — remains a user-facing V2 requirement.
- **EPIC / ABSORB** — broad tracker whose behavior is absorbed into smaller V2 requirements.
- **SUPERSEDED** — old implementation plan replaced by the V2 redesign; its intent is preserved where useful.
- **DEFER IMPLEMENTATION** — not a V2.0 runtime feature, but V2 must avoid blocking it architecturally.

No GitHub Issue is closed merely by creating this inventory. Issue state changes should happen only after the corresponding V2 requirements are accepted.

## Complete inventory

| Issue | V2 disposition | Requirement / design destination | V2 treatment |
| --- | --- | --- | --- |
| #5 Parent: Improve mobile touch interactions | EPIC / ABSORB | `R-MOBILE-*`, `R-INTERACTION-*` | Absorb remaining touch targets, drag/scroll conflict, date-label usability, mobile editor choice, and mobile tests into the V2 mobile interaction system. |
| #6 Roadmap: Plan codebase module separation | SUPERSEDED | `NFR-ARCH-*` | The V1 extraction plan is obsolete. Its goal is replaced by a clean modular architecture with explicit public contracts and import boundaries. |
| #33 Redesign desktop task creation as inline side editor | REQUIREMENT | `R-EDITOR-001` | Implement one adaptive task editor contract. Desktop uses an anchored editor/popover where practical; mobile may use a sheet. Do not create a desktop-only business path. |
| #66 v0.1 public prototype checklist | SUPERSEDED (V1-only) | Historical reference only | This is a V1 release checklist and is not a V2 product requirement. V2 gets its own quality gates and release criteria. |
| #69 Complete no-date-lanes mode | FOUNDATIONAL | `R-BOARD-*`, `R-SCHEDULE-*` | Replace the idea of a special mode with composable board settings. Schedule remains semantic data; date lanes are a view/helper layer. |
| #78 Color coding for top-level goal tasks | REQUIREMENT | `R-APPEARANCE-001` | Provide semantic importance/marker data independent of theme colors. UI initially exposes it for top-level goals and remains accessible without relying on color alone. |
| #80 Reorder an existing same-branch flow | FOUNDATIONAL | `R-FLOW-002` | Flow order must be explicit semantic data. Reordering changes Flow edges/order, never board coordinates or dates. |
| #81 Miro-like freehand canvas tools | EPIC / ABSORB | `R-BOARD-003`, `R-ANNOTATION-*`, `R-FLOW-004` | Keep task flow primary. Freehand capability is a composition of board settings plus optional connector/annotation components, not a separate workspace type. |
| #82 Loop and cyclic task connections | FOUNDATIONAL | `R-FLOW-004` | Support directed cyclic/reference flow links without allowing cycles to break structural auto-layout/list traversal. |
| #83 Directional arrow connectors | REQUIREMENT | `R-FLOW-005` | Flow connectors render direction. Rendering consumes Flow edges; it does not own relationship semantics. |
| #84 Free-floating text boxes | REQUIREMENT | `R-ANNOTATION-001` | Text annotations are separate entities, never Tasks. Support create/edit/move/resize/style/delete/history/persistence. |
| #85 Hand-drawn annotation layer | REQUIREMENT | `R-ANNOTATION-002` | Stroke annotations are separate board entities. Drawing is an explicit interaction state and cannot compete with task drag/pan. |
| #86 Mobile flow-first first-time UX | EPIC / REQUIREMENT | `R-MOBILE-*`, `R-START-*` | Make first action obvious, progressively disclose secondary actions, keep destructive actions secondary, and preserve flow meaning in Board/List views. |
| #87 Start-screen overlay/startup performance | FOUNDATIONAL | `R-START-001`, `NFR-PERF-001` | Startup is an explicit state machine. The Board is not mounted and then covered by a Start overlay. Heavy modules initialize only when required. |
| #89 ICS import and CSV import/export | REQUIREMENT | `R-INTEROP-*` | Implement format adapters through a common import/export pipeline. Import is transactional and `.cherry` remains full-fidelity. |
| #90 Cross-device sync | DEFER IMPLEMENTATION | `R-SYNC-READY-001` | Do not implement hosted sync in the initial V2.0 build. Use stable IDs, revisions, repository ports, and migration-safe data so sync can be added later without another rewrite. |
| #92 Explicit LocalStorage consent | REQUIREMENT | `R-STORAGE-002` | Persistence is a policy choice. Before persistent browser storage is enabled, Cherry can run through an in-memory repository. The UI explains storage and provides clear/disable controls. |
| #93 Mobile existing-task connection and drag-edge scrolling | FOUNDATIONAL / REQUIREMENT | `R-INTERACTION-001`, `R-FLOW-003` | Centralize gesture ownership. Connection creation, task movement, pan, and edge auto-scroll cannot install competing pointer handlers. |
| #222 Collapsed completed date-lane drop bug | REGRESSION REQUIREMENT | `R-DROP-001`, `T-REG-222` | Canonical schedule may only change through an explicit schedule command. Drag placement is ephemeral until a valid drop intent is resolved. Collapsed lanes have explicit hit geometry. |

## Supporting completed work to preserve

Several open Issues depend on already-completed behavior. V2 must preserve the user capability, not the V1 implementation:

- #71: connecting existing tasks is already a product capability on desktop; V2 moves it behind Flow commands.
- #79: established the separation of Flow, Schedule, Board Layout, and View Helpers and the rule that user intent must not be inferred from coordinates.
- #88: active workspace/tab restoration after reload is already expected behavior and is retained by the V2 startup/session design.
- PR #67: established workspace tabs, start view, i18n, tutorial, and `.cherry` workspace import/export behavior. V2 may redesign the implementation but must deliberately decide compatibility.

## Consolidated workstreams

The 19 open Issues collapse into these V2 workstreams:

1. **Workspace / Startup / Storage** — #87, #90, #92 and completed #88.
2. **Task / Flow graph** — #80, #82, #83, #93 and completed #71.
3. **Schedule / Board / Drop intent** — #69, #222 and completed #79.
4. **Adaptive interaction / UX** — #5, #33, #86, #93.
5. **Annotations / Freehand** — #81, #84, #85.
6. **Appearance** — #78.
7. **Interoperability** — #89.
8. **Architecture / quality** — #6 and the V2 rewrite itself.
9. **Historical V1 release work** — #66; not carried into V2 as a feature.

This consolidation is intentional: one well-defined component should resolve several Issues instead of adding one patch layer per Issue.
