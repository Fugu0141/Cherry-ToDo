# Cherry V2.0 Requirement Traceability

Status: **Release-candidate evidence — 2026-09-14**

This matrix maps every normative product principle, requirement, and non-functional requirement in `requirements/REQUIREMENTS.md` to automated or explicitly documented manual acceptance evidence. `scripts/verify-requirement-traceability.mjs` prevents a requirement heading from being added without a row here.

`DESIGN_FREEZE.md` and accepted ADRs remain authoritative where older requirement prose is superseded. In particular, the current derived branching goal has no normal manual completion action; its completion is evaluator-controlled.

| ID | Evidence | Acceptance | Status |
| --- | --- | --- | --- |
| P-001 | `test/application/board-drop.test.ts`, `test/integration/phase6-board-layout.test.ts` | Flow, Schedule, and Board movement remain independent. | PASS |
| P-002 | `test/application/application-store.test.ts`, `test/integration/phase3-history.test.ts`, `test/regression/issue-222-date-lane-drop.test.ts` | Canonical changes occur only after resolved commands/confirmation. | PASS |
| P-003 | `test/domain/board-layout.test.ts`, `test/domain/phase8-reference-and-annotation.test.ts` | Freehand/annotation behavior composes with the same model. | PASS |
| P-004 | `test/e2e/release-critical.spec.ts` | Main journeys keep destructive/storage actions secondary to planning. | PASS |
| P-005 | `test/integration/phase7-mobile-flow.test.ts`, `test/e2e/release-critical.spec.ts` | Desktop/mobile share Application semantics while using adaptive interactions. | PASS |
| P-006 | `test/integration/phase4-startup-consent.test.ts`, `test/e2e/release-critical.spec.ts` | Ephemeral memory-only use remains fully usable. | PASS |
| P-007 | `test/migration/phase9-v1-migration.test.ts`, `test/interop/phase9-external-interop.test.ts`, `test/integration/phase4-repository-codec.test.ts` | Failed data operations do not replace the readable canonical workspace. | PASS |
| P-008 | `test/contracts/ui-contract.test.ts`, `test/contracts/ui-replaceability.test.ts` | Core/Application remain usable behind a replaceable UI contract. | PASS |
| R-DATA-001 | `test/domain/ids.test.ts`, `test/integration/phase4-repository-codec.test.ts` | Stable IDs survive validated native round-trips. | PASS |
| R-DATA-002 | `test/domain/workspace.test.ts`, `test/migration/phase9-v1-migration.test.ts` | Schema version and migration paths are explicit and tested. | PASS |
| R-DATA-003 | `test/domain/task.test.ts`, `test/application/board-drop.test.ts`, `test/domain/phase8-reference-and-annotation.test.ts` | Semantic and presentation state stay separate. | PASS |
| R-DATA-004 | `test/application/application-store.test.ts`, `test/contracts/ui-contract.test.ts` | Named Application commands own canonical mutation. | PASS |
| R-START-001 | `test/integration/phase4-startup-consent.test.ts`, `test/e2e/release-critical.spec.ts` | Startup resolves storage/start/restore before workspace-only presentation. | PASS |
| R-START-002 | `test/integration/phase4-startup-consent.test.ts`, `test/e2e/release-critical.spec.ts` | Valid workspace/tab/view context restores and invalid context falls back safely. | PASS |
| R-STORAGE-001 | `test/integration/phase4-repository-codec.test.ts`, `test/integration/phase4-browser-composition.test.ts` | Memory and browser persistence implement repository ports. | PASS |
| R-STORAGE-002 | `test/integration/phase4-startup-consent.test.ts`, `test/e2e/release-critical.spec.ts` | No persistent user-data write precedes opt-in; disable/clear requires explicit action/confirmation. | PASS |
| R-WORKSPACE-001 | `test/application/application-store.test.ts`, `test/e2e/release-critical.spec.ts` | Multiple named tabs keep independent content/Board state and active tab restores. | PASS |
| R-WORKSPACE-002 | `test/migration/phase9-v1-migration.test.ts` | Supported V1 plain/encrypted data migrates through readers rather than V1 runtime. | PASS |
| R-TASK-001 | `test/domain/task.test.ts`, `test/domain/workspace.test.ts` | Task semantic data excludes Board/renderer ownership. | PASS |
| R-TASK-002 | `test/domain/execution.test.ts`, `test/domain/flow.test.ts` | Branching-goal meaning derives from structural topology. | PASS |
| R-TASK-003 | `test/domain/execution.test.ts`, `test/application/application-store.test.ts` | Freeze-authoritative evaluator auto-completes/reopens derived goals; direct manual goal completion is rejected. | PASS |
| R-FLOW-001 | `test/domain/flow.test.ts` | Explicit structural/reference edges enforce DAG invariants. | PASS |
| R-FLOW-002 | `test/application/application-store.test.ts`, `test/integration/phase3-history.test.ts` | Structural reorder changes Flow only and is undoable. | PASS |
| R-FLOW-003 | `test/domain/flow.test.ts`, `test/interaction/mobile-connection-flow.test.ts`, `test/e2e/release-critical.spec.ts` | Existing tasks can be connected on desktop/mobile with invariant validation. | PASS |
| R-FLOW-004 | `test/domain/phase8-reference-and-annotation.test.ts` | Reference cycles remain separate from structural traversal. | PASS |
| R-FLOW-005 | `test/integration/phase6-flow-presentation.test.ts`, `test/e2e/release-critical.spec.ts` | Connectors are directional and relationship meaning is also textual/non-color-only. | PASS |
| R-FLOW-006 | `test/domain/flow.test.ts`, `test/domain/execution.test.ts`, `test/domain/board-layout.test.ts` | Branch/merge DAGs retain one canonical Task per entity. | PASS |
| R-FLOW-007 | `test/application/application-store.test.ts`, `test/integration/phase6d-desktop-maintenance.test.ts` | Delete-only and chain-limited downstream deletion obey frozen junction rules. | PASS |
| R-FLOW-008 | `test/domain/execution.test.ts`, `test/application/application-store.test.ts` | Merge targets enforce direct-predecessor execution gates in Core. | PASS |
| R-FLOW-009 | `test/domain/execution.test.ts`, `test/application/application-store.test.ts` | Ordinary chains stay flexible; unresolved merge blocking propagates downstream only structurally. | PASS |
| R-FLOW-010 | `test/application/application-store.test.ts`, `test/integration/phase3-history.test.ts` | Revision-aware impact preview/cancel/confirm prevents silent completion invalidation. | PASS |
| R-HISTORY-001 | `test/integration/phase3-history.test.ts`, `test/application/phase8-annotations.test.ts` | Supported reversible semantic/annotation operations participate in shared Undo/Redo. | PASS |
| R-SCHEDULE-001 | `test/domain/schedule.test.ts` | `none`, date, and datetime are explicit; date-only is timezone-neutral. | PASS |
| R-BOARD-001 | `test/domain/board-layout.test.ts`, `test/integration/phase6-board-layout.test.ts` | Lane/layout/time-guide settings compose without rewriting Schedule. | PASS |
| R-BOARD-002 | `test/application/board-drop.test.ts`, `test/integration/phase6-board-layout.test.ts` | Manual placement is Board presentation state. | PASS |
| R-BOARD-003 | `test/domain/phase8-reference-and-annotation.test.ts`, `test/application/phase8-annotations.test.ts` | Freehand uses the same Task/Workspace model. | PASS |
| R-BOARD-004 | `test/domain/board-layout.test.ts`, `test/integration/phase6-board-layout.test.ts` | Auto-layout handles DAG branches/merges without Task duplication/recursion. | PASS |
| R-DROP-001 | `test/domain/drop-intent.test.ts`, `test/regression/issue-222-date-lane-drop.test.ts` | Drop intent is explicit; invalid/collapsed-lane drops cannot desynchronize canonical Schedule. | PASS |
| R-APPEARANCE-001 | `test/e2e/release-critical.spec.ts`, `test/integration/phase4-repository-codec.test.ts` | Derived-goal importance is editable, textual/non-color-only, and persisted in native data. | PASS |
| R-ANNOTATION-001 | `test/application/phase8-annotations.test.ts`, `test/domain/phase8-reference-and-annotation.test.ts` | Text annotations are separate entities with supported edits and never Tasks. | PASS |
| R-ANNOTATION-002 | `test/interaction/phase8-drawing-owner.test.ts`, `test/application/phase8-annotations.test.ts` | Stroke input is simplified and drawing has explicit interaction ownership. | PASS |
| R-ANNOTATION-003 | `test/integration/phase8-annotation-persistence.test.ts`, `test/application/phase8-annotations.test.ts` | Annotations persist and participate in History. | PASS |
| R-EDITOR-001 | `test/integration/phase5-ui-runtime.test.ts`, `test/e2e/release-critical.spec.ts` | Desktop/mobile editor surfaces use the same intents; dialog cancel/keyboard Escape is explicit. | PASS |
| R-MOBILE-001 | `test/interaction/mobile-flow-presentation.test.ts`, `test/e2e/release-critical.spec.ts` | Mobile first-run emphasizes creating/connecting a Flow. | PASS |
| R-MOBILE-002 | `test/interaction/mobile-flow-presentation.test.ts`, `test/integration/phase7-mobile-flow.test.ts` | Mobile Board/List preserve branch/merge/reference context. | PASS |
| R-MOBILE-003 | `test/interaction/mobile-board-interaction.test.ts`, `test/e2e/release-critical.spec.ts` | Required mobile actions are touch-safe and not hover-only. | PASS |
| R-INTERACTION-001 | `test/interaction/interaction-coordinator.test.ts`, `test/interaction/edge-auto-scroll.test.ts`, `test/interaction/phase8-drawing-owner.test.ts` | One coordinator owns each active pointer/touch interaction. | PASS |
| R-UI-001 | `test/contracts/ui-contract.test.ts`, `test/integration/phase5-ui-runtime.test.ts` | Formal framework-independent UI package contract is exercised. | PASS |
| R-UI-002 | `test/contracts/ui-replaceability.test.ts` | Composition mounts a second compatible UI without Core/Application changes. | PASS |
| R-UI-003 | `test/contracts/ui-contract.test.ts` | Semantic state tokens/hooks are public while raw theme values stay out of Core. | PASS |
| R-INTEROP-001 | `test/integration/phase4-repository-codec.test.ts`, `test/migration/phase9-v1-migration.test.ts` | Native workspace serialization preserves supported semantic/presentation data. | PASS |
| R-INTEROP-002 | `test/migration/phase9-v1-migration.test.ts`, `test/interop/phase9-external-interop.test.ts` | Imports validate temporary candidates and return safe failures. | PASS |
| R-INTEROP-003 | `test/interop/phase9-external-interop.test.ts` | Supported VEVENT subset converts safely and recurrence is bounded/reported. | PASS |
| R-INTEROP-004 | `test/interop/phase9-external-interop.test.ts` | CSV paths cover UTF-8 and malformed relationships/dates predictably. | PASS |
| R-SYNC-READY-001 | `test/domain/ids.test.ts`, `test/integration/phase4-repository-codec.test.ts`; manual architecture audit in `PHASE10_RELEASE_GATE.md` | Stable IDs/revisions/repository ports remain local-first and sync-ready. | PASS |
| R-I18N-001 | `test/contracts/ui-contract.test.ts` | UI strings route through locale dictionaries; business logic does not own UI copy. | PASS |
| R-THEME-001 | `test/e2e/theme-accessibility.spec.ts` | Light, dark, and system presentations remain readable and semantically equivalent. | PASS |
| R-A11Y-001 | `test/e2e/release-critical.spec.ts`, `test/e2e/theme-accessibility.spec.ts` | Axe release audit, keyboard/touch controls, textual blocked/goal meaning. | PASS |
| NFR-ARCH-001 | `scripts/check-boundaries.mjs`, `npm run boundaries` | Module public boundaries are repository-enforced. | PASS |
| NFR-ARCH-002 | `scripts/check-boundaries.mjs`, `npm run boundaries` | Dependency direction rejects Domain/Application leakage. | PASS |
| NFR-ARCH-003 | `test/contracts/ui-replaceability.test.ts`, `test/integration/phase4-browser-composition.test.ts` | UI and infrastructure capabilities are replaceable through ports/composition. | PASS |
| NFR-ARCH-004 | `scripts/check-boundaries.mjs`; manual source audit in `PHASE10_RELEASE_GATE.md` | V2 integration uses imports/composition, not global function replacement. | PASS |
| NFR-ARCH-005 | `test/contracts/ui-replaceability.test.ts`, `npm run boundaries` | UI framework types do not leak into Core/Application public contracts. | PASS |
| NFR-PERF-001 | `test/e2e/release-critical.spec.ts`, `scripts/report-build-metrics.mjs` | Startup architecture is lazy and CI records reference measurements rather than universal budgets. | PASS |
| NFR-QUALITY-001 | `scripts/verify-requirement-traceability.mjs`, this matrix | Every normative requirement/principle heading is release-gated for traceability. | PASS |
| NFR-QUALITY-002 | `test/regression/issue-222-date-lane-drop.test.ts` | #222 has a focused regression fixture; reproducible regressions follow regression-first policy. | PASS |
| NFR-DATA-001 | `test/migration/phase9-v1-migration.test.ts`, `test/interop/phase9-external-interop.test.ts` | Migration/import validates before commit and preserves last readable data on failure. | PASS |

## Manual release acceptance recorded for Phase 10

The automated suite is supplemented by a source/architecture review on 2026-09-14: V2 contains no feature integration based on global function replacement; UI connector meaning has a non-color textual/shape representation; storage-clear copy is explicitly destructive; sync readiness remains a repository/model concern with no mandatory network dependency. These checks are release evidence, not permission to weaken the automated tests above.
