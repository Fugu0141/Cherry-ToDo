# Cherry V2 Phase 10 Release Gate

Status: **Release-candidate evidence — final PR verification pending — 2026-09-14**

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

## Current reference evidence

The last fully green gate before the final multiple-tab audit recorded 37 Vitest files / 117 tests, 14 Playwright passes / 2 intentional project-specific skips, static deployment verification, and a production bundle of about 114 kB (about 30.7 kB gzip). Browser `cherry:boot` measurements in that run were 2.70 ms on the desktop profile and 1.70 ms on the mobile profile.

These numbers are historical reference evidence only. The final PR gate after the multiple-tab completion is authoritative, and performance values are not universal device budgets.

## Release-candidate decision rule

Cherry V2 may be called release-candidate ready only when all of the following are true:

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
11. PR #271's final V2 CI and V2 Release Gate are green on the clean branch with no temporary patch workflows/scripts.
