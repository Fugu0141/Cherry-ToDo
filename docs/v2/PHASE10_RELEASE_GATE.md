# Cherry V2 Phase 10 Release Gate

Status: **Release-candidate ready — 2026-09-14**

This document turns Phase 10 of `IMPLEMENTATION_PLAN.md` into an executable release gate. It is not a new source of product semantics; `DESIGN_FREEZE.md`, accepted ADRs, and the requirements remain authoritative.

## Phase 10 closure

The initial audit gaps are now implemented:

- Playwright exercises the production-style application through desktop and mobile Chromium profiles.
- Axe audits critical Start/workspace/editor/mobile surfaces for serious/critical accessibility violations.
- light, dark, and system theme behavior is browser-tested.
- `cherry:boot` is measured in the browser journey and bundle/static-output metrics are reported in CI.
- `src/ui/minimal-test` proves the composition root can mount a second contract-compatible UI package without Core/Application edits.
- browser persistence can be explicitly disabled or destructively cleared after consent.
- derived branching-goal importance is editable and has a textual, non-color-only marker.
- `R-WORKSPACE-001` is completed end-to-end: users can create/switch named planning tabs, tab content/Board state is independent, and active-tab session restoration is tested.
- requirement traceability is both documented and machine-checked.

## Executable release gate

The Release Gate requires:

1. Prettier, ESLint, strict TypeScript, architecture boundaries, Vitest, and Vite production build;
2. machine verification that every normative requirement/principle heading has a `PASS` traceability row;
3. production bundle metrics and static relative-asset verification;
4. desktop/mobile Playwright journeys against the production-style app;
5. Axe checks with no known serious/critical violation on the audited critical surfaces;
6. persistence opt-in/restore/disable/clear journeys;
7. multiple planning-tab independence and active-tab restore;
8. non-color-only derived-goal importance and Flow meaning;
9. light/dark/system theme checks;
10. V1 migration and import non-destruction coverage;
11. whole-UI replacement contract proof.

`npm run release:check` is the local equivalent of the release workflow after Playwright Chromium is installed.

## Architecture/manual audit record

Manual source review on 2026-09-14 confirmed the following items that are architectural rather than meaningfully proven by a single browser assertion:

- V2 feature integration does not use global function replacement/monkey patching.
- Domain/Application public contracts do not expose a UI framework type.
- the local model keeps stable IDs, revisions/audit metadata, and repository ports suitable for a future sync adapter without requiring a network connection today.
- directional/relationship meaning is available through arrow/shape/textual affordances and is not intentionally encoded only by color.
- migration/import flows use candidate validation/commit boundaries rather than executing V1 runtime code.

## Final reference evidence

The clean PR #271 release gate after the multiple-tab and traceability work recorded:

- Prettier, ESLint, strict TypeScript, architecture boundaries, and Vite production build: PASS;
- Architecture boundaries: 62 TypeScript files checked;
- Vitest: 37 files / 119 tests PASS;
- requirement traceability: 67 normative requirement/principle IDs mapped;
- static deployment verification: PASS with 2 relative local asset references;
- Playwright: 16 PASS / 2 intentional project-specific skips across desktop/mobile Chromium profiles;
- production bundle: 117,965 bytes total / 31,409 gzip bytes;
- browser `cherry:boot` reference measurement: desktop 2.00 ms, mobile 2.40 ms.

The browser timing and bundle figures identify one CI reference run and are evidence, not universal device budgets. The release workflow remains authoritative for later candidate changes.

## Release-candidate decision

All Phase 10 decision criteria are satisfied for the current candidate:

1. all normal quality gates pass;
2. critical desktop and mobile E2E journeys pass;
3. release accessibility/theme checks pass;
4. required interactions do not depend on hover or color alone;
5. Start does not initialize workspace-only Board/layout/annotation work before the resolved route requires them;
6. the production UI can be replaced by the minimal compatible package without Core/Application changes;
7. migration/import/recovery failures do not overwrite the last readable workspace;
8. static production output is verified for the supported GitHub Pages path model;
9. `REQUIREMENT_TRACEABILITY.md` passes its machine audit;
10. `RELEASE_NOTES.md` and `KNOWN_LIMITATIONS.md` describe shipped behavior accurately;
11. temporary Phase 10 patch workflows/scripts have been removed from the candidate branch.

Any code or release-document change after this evidence must pass V2 CI and V2 Release Gate again before merge.
