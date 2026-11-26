# Cherry V2.1 — Phase 1: Baseline and safety

Status: **In progress — audit and disposition proposal; browser verification pending**  
Date: 2026-11-27  
Baseline: [main / 8a90c4f](https://github.com/Fugu0141/Cherry-ToDo/tree/8a90c4fa86dda3ac5e313b83a194c7bdc211c825)  
Planning authority: [draft V2.1 stabilization proposal #308](https://github.com/Fugu0141/Cherry-ToDo/pull/308). This record is evidence, not a new normative specification. V2 accepted requirements remain in force. Phase 2 is not started.

## 1. Baseline and validation environment

- Current main contains V2 production TypeScript/Vite Game UI and V2 documentation; the branch references in README and AGENTS no longer describe this state.
- Node >=22.13.0; CI selects Node 24. npm scripts: `check` (format/lint/typecheck/boundaries/unit tests/build), `release:check` (check + traceability/metrics/static/E2E).
- Playwright config: desktop Chromium and Pixel 7 mobile Chromium, production preview on 127.0.0.1:4173. Four existing E2E files: game-ui-parity, release-critical, schedule-editor-inference, theme-accessibility.
- **Gate gap:** both `.github/workflows/ci.yml` and `release-gate.yml` target only `v2.0` for push/PR; main is not covered by these triggers. Pages deploy success is not release-gate success. Restore main coverage without weakening checks; retain v2.0 triggers until branch policy is reviewed.
- Source files and Git tree read at the pinned SHA. The local environment cannot resolve github.com to clone/install/run the app. No browser reproduction, benchmark or local test result is claimed. The restored PR gates ran successfully; see section 6 for actual evidence.
- Reproduction uses disposable workspaces/browser profiles only; never test destructive actions using real user data.

## 2. Document inventory (33 Markdown files)

The recursive Git tree at the baseline was not truncated. Inventory includes root guidance and all docs/ Markdown files; no files moved or deleted. Proposed destinations below require review.

| Files / group | Count | Disposition proposal |
| --- | ---: | --- |
| README.md, README_ja.md, AGENTS.md | 3 | Update branch/current phase and contributor guidance together; avoid duplicate normative text. |
| docs/README.md | 1 | Replace stale navigation with one active index; keep links valid. |
| docs/v2/PROJECT_CHARTER.md, DESIGN_FREEZE.md, IMPLEMENTATION_PLAN.md | 3 | Preserve historical baseline; consolidate active scope and decision precedence after review. V2 plan is historical, not the V2.1 plan. |
| docs/v2/DEVELOPMENT_SETUP.md | 1 | Retain active commands, verify against package.json/workflows. |
| docs/v2/KNOWN_LIMITATIONS.md, RELEASE_NOTES.md, PHASE10_RELEASE_GATE.md, REQUIREMENT_TRACEABILITY.md | 4 | Preserve V2 release evidence; audit present status and update active gate/traceability together. |
| docs/v2/UI_OVERHAUL.md | 1 | Review and reconcile with R-UI-101–104 before archiving or retaining. |
| docs/v2/requirements/README.md, REQUIREMENTS.md | 2 | Active functional baseline; retain stable IDs and reconcile corrections. |
| docs/v2/design/README.md, BASIC_DESIGN.md, FLOW_EXECUTION_RULES.md, FREEHAND_AND_ANNOTATIONS.md, INTEROPERABILITY.md, MOBILE_INTERACTION.md, TEST_STRATEGY.md | 7 | Review each for active semantics, draft conflicts and test criteria; do not rewrite accepted behavior by implication. |
| docs/v2/adr/README.md, ADR 0001–0008 | 9 | Preserve ADR history, clarify supersession. |
| docs/v2/issues/README.md, OPEN_ISSUE_INVENTORY.md | 2 | Preserve historical inventory; supersede its live tracker role with a reviewed V2.1 mapping. |

Specific conflicts:
- README/AGENTS/docs index and V2 implementation plan still assign main to V1 and v2.0 to integration; PR #304 released V2 to main.
- DESIGN_FREEZE line 17 says two or more outgoing edges; FLOW_EXECUTION_RULES lines 51–79 says unique independent successors (PR #289). Phase 2 should reconcile wording with accepted changes; no semantic change in this audit.
- FLOW_EXECUTION_RULES lines 95–99 retain obsolete manual Goal completion language; DESIGN_FREEZE lines 18, 68–74 explicitly supersede that behavior.
- RELEASE_NOTES and KNOWN_LIMITATIONS distinguish native V2 data and V1 migration, but production settings currently exposes CSV/ICS only; re-check capabilities before changing documentation (#294).

## 3. Open Issue inventory and proposed dispositions

Source: GitHub open-issues collection on 2026-11-27, 34 issues after excluding PRs #307 and #308. No state changes in Phase 1 before this mapping is reviewed. “Verify/close” is a proposal, not proof. “Carry” means candidate for a V2.1 specification and focused successor Issue; preserve links to original evidence. Priorities are provisional: P0 data integrity/loss, P1 core workflow and UI reliability, P2 refinement, future outside default scope. Close only after evidence or documented deferral/supersession; never mark a deferred item completed.

| Issue | Proposed disposition | Destination / evidence needed |
| --- | --- | --- |
| #303 | Carry P0 | Conflict recovery and monotonic revision; R-UI-104; two-tab regression. |
| #302 | Carry P0 | Atomic reference-connected creation; R-UI-104; failure + single undo. |
| #301 | Carry P1 | Preserve drafts / choose safe connection kind; R-UI-101/104. |
| #300 | Carry P1 | Accurate impact confirmation; R-UI-104. |
| #298 | Review / defer semantic expansion | R-UI-104; preserve existing chain-limited deletion unless approved spec amendment. |
| #297 | Carry P0 | Memory-only state/leave warning; R-UI-104. |
| #296 | Carry P1 | Residual storage cleanup without renewed consent; R-UI-104. |
| #295 | Carry P0 | Locale change without reload or memory loss; R-UI-101/104. |
| #294 | Carry P0 | Native backup/restore and V1 migration UI; existing interoperability and R-UI-104. |
| #284 | Verify/close | Merged PR #290 and release #304; run canonical import regressions. |
| #283 | Verify/close | Merged PR #289 and release #304; run Goal/Merge topology regressions. |
| #282 | Future | Movable areas/custom frames; excluded by #308; preserve design. |
| #277 | Carry P1 | Layout clipping/overlap; R-UI-102/103; reproduce current main. |
| #274 | Verify/close or carry residual P1 | Lane orientation and drop semantics; existing parity tests; R-UI-102. |
| #273 | Verify/close or carry residual P1 | Desktop/mobile progression; existing parity tests; R-UI-102. |
| #222 | Carry P1 if reproduced | Collapsed lane drop and re-layout; R-UI-102. |
| #93 | Verify/close or carry residual P1 | Touch connection and drag edge scroll; R-UI-101/103. |
| #92 | Verify/close or carry residual P0 | Explicit consent exists; check actual persistence and #296/#297 separately. |
| #90 | Future | Cross-device sync; preserve design, not V2.1 scope. |
| #89 | Verify/close or carry residual P1 | CSV/ICS interop; verify existing standard UI; native backup separately #294. |
| #87 | Superseded/verify residual P1 | V1 startup implementation replaced; startup and performance baseline R-UI-101/NFR-UI-101. |
| #86 | Carry/absorb P1 | First-time mobile UX; R-UI-103. |
| #85 | Verify/close or carry residual P1 | Stroke annotation creation/edit/persistence; R-UI-103. |
| #84 | Verify/close or carry residual P1 | Text annotation; creation in parity test; verify editing. |
| #83 | Verify/close or carry residual P1 | Directional connectors; R-UI-102. |
| #82 | Verify/close | Reference cycles only; structural cycles forbidden; preserve accepted semantics. |
| #81 | Absorb existing scope / defer expansion | Existing freehand capabilities only; no whiteboard suite expansion by default. |
| #80 | Verify/close or carry residual P1 | Existing flow reorder parity test; verify semantics and undo. |
| #78 | Verify/close or carry residual P2 | Importance/color; distinguish accepted importance from old top-level goal wording. |
| #69 | Verify/close or carry residual P1 | Composable lane settings; semantic schedule unchanged. |
| #66 | Superseded | V0.1 release checklist; preserve history. |
| #33 | Carry/absorb P1 | Adaptive anchored editor and safe draft; R-UI-103/104. |
| #6 | Superseded | V1 extraction replaced by V2 contracts; no wholesale rewrite. |
| #5 | Carry/absorb P1 | Mobile touch umbrella; split concrete regressions into R-UI-101/103. |

## 4. Safety and UI reproduction matrix

All observations below are static evidence at the baseline, not browser test outcomes. Record actual results, browser/profile, viewport, locale, theme, steps, screenshots/traces and test IDs before moving to Phase 2.

| ID | Priority / source | Evidence | Reproduction and expected acceptance |
| --- | --- | --- | --- |
| B01 | P0 #295 | src/ui/game/locale.ts: change handler calls window.location.reload(); current game-ui-parity locale test opts into storage and explicitly expects reload. | Decline storage, create workspace/task, switch ja→en→ja. Expect no navigation, same tasks, locale/lang updated. Repeat persistent mode and blocked preference storage. |
| B02 | P0 #294/#297 | src/ui/game/index.ts:1232–1275 exposes CSV/ICS and storage actions; no native backup action in this panel. | In disposable memory workspace, inspect settings and backup/restore path; test warning on reload and explicit consent. Expect full-fidelity backup, explicit memory mode and no silent abandonment; verify native capabilities separately. |
| B03 | P1 #296 | src/ui/game/index.ts:1247–1275 gates both stop and clear on persistentStorageEnabled. Existing E2E clears and stops in one operation, not stop-then-clear. | Persist disposable data, stop without clear, reopen settings. Expect residual storage cleanup remains reachable with explicit confirmation and current memory work retained. |
| B04 | P1 #301 | src/ui/game/index.ts:875–892 clears createDraft before promise success. | Force validation/save failure during task creation; expect title/date/time retained and no duplicate task; then retry. |
| B05 | P0 #302 | src/ui/game/index.ts:160–188 reference path calls task.create then flow.connect. | Force second operation failure in isolated integration fixture; expect neither task nor edge persists; success/undo/redo are one logical action. |
| B06 | P0 #303 | src/composition/cherry-ui-runtime.ts:458–462 and other save paths restore previous store on save failure. | Two tabs at same revision; save A then B; expect conflict surfaced, latest state recoverable, next edit succeeds; verify revision never reused after undo/redo. |
| B07 | P1 #300/#298 | src/composition/cherry-ui-runtime.ts:190–191 uses same reopen confirmation keys. | Compare completion invalidation vs continuity break and chain deletion; expect accurate scope/reasons, cancel leaves state unchanged. No deletion semantic expansion. |
| B08 | P1 R-UI-101 | src/ui/game/index.ts:1528–1533 replaces shell and cleans board each render; src/main.ts:30–33 installs post-mount helpers. | Scroll large board, open settings, type in form, expire notice during edit/drag. Expect unrelated updates preserve focus, selection, draft, scroll and gesture; inspect listener cleanup. |
| B09 | P1 #273/#274/#277/#222 | Existing geometry and parity tests cover orientation, lane drops and routing; current failures not yet reproduced. | Desktop/mobile, long ja/en labels, dates/undated, branches, merges and collapsed lanes. Check bounds/anchors, no unintended overlap, no semantic change from layout alone. |
| B10 | P1 R-UI-103 | Existing parity/accessibility coverage is a starting point, not full visual evidence. | Narrow/short viewport, keyboard entry, many tabs, themes, focus, dialogs, reduced motion. Verify reachability and consistency; capture reviewed visual baselines. |
| B11 | P2 NFR-UI-101 | src/composition/cherry-ui-runtime.ts:888–889 computes both layout orientations. | Reproducible 10/50/100/500-task fixtures; record cold/warm startup, layout/routing, DOM update and interaction costs. No invented thresholds; determine after measurement. |

## 5. Verification commands and completion gates

From a clean checkout of the baseline, using Node 24 and isolated browser data:

```sh
npm ci
npx playwright install chromium
npm run release:check
```

Run focused E2E with `npx playwright test test/e2e/game-ui-parity.spec.ts --project=desktop-chromium` and repeat with `--project=mobile-chromium`. Run the matrix above separately where existing tests do not exercise the failure path. Save actual observations in this record or linked evidence, including the reference environment. Failed existing tests must be recorded, not silently relaxed.

- [x] Pin current main and record toolchain/test configuration.
- [x] Inventory baseline documentation and identify precedence/branch-policy conflicts.
- [x] Inventory all 34 open Issues with proposed dispositions and priority.
- [x] Identify static data-safety/UI evidence and write reproduction matrix.
- [x] Restore CI/release gate coverage for PRs targeting main and verify checks on PR #309 (not merged; main push trigger not yet exercised).
- [ ] Reproduce and record UI and safety failures on desktop/mobile; classify any not reproducible.
- [ ] Capture baseline performance/visual evidence or explicitly agree what remains deferred to refinement.
- [ ] Owner reviews Issue/document disposition and prioritization; retain historical links.
- [ ] Record Phase 1 exit evidence and approve Phase 2 specification consolidation.

No production code, existing Issue state, accepted specification or release branch was changed by this audit. No phase completion is claimed.

## 6. Verified CI evidence and focused observation harness

PR #309 head `87642f7cb4a86b1042427fbcb1905504232f4b43`, with only the baseline document and main workflow triggers changed:
- [V2 CI run 45865392529](https://github.com/Fugu0141/Cherry-ToDo/actions/runs/45865392529): success.
- [V2 Release Gate run 45865392706](https://github.com/Fugu0141/Cherry-ToDo/actions/runs/45865392706): success. Logs: 46 test files / 159 unit and integration tests, 52 browser tests, 67 requirement IDs, 69 source files checked for architecture boundaries, 2 relative asset references verified.
- Production bundle total: 173,679 bytes (48,436 gzip bytes). Existing cherry:boot measure: 1.80 ms on both Chromium projects in this run; this is the instrumented boot span, not full page load or a device guarantee.
- Local git ls-remote still fails with DNS resolution. Additional observation tests are executed remotely, separately from the release gate.

Run `npx playwright test --config=playwright.phase1.config.ts` after installing dependencies and Chromium. The audit is isolated from ordinary release E2E; a green audit job means the observation scenario completed, not that the observed behavior is acceptable. JSON outcomes and screenshots are attached and uploaded; a failed setup is inconclusive, not evidence of a product defect. The branch-specific audit workflow should be removed or made generally reusable before final integration.

The initial harness covers B01, B03, desktop B08 draft retention, and B08 scroll / B09 overlap / B11 import-to-visible-card measurements for independent ten-task chains of 10/50/100/500 tasks on both existing Chromium profiles. Import-to-card timing includes browser/Playwright and import overhead; it is not layout-only timing or a reliable performance budget. One sample per case is exploratory. Branches, merges, annotation fixtures, failure injection, detailed layout/routing timings, repeated samples and real-device verification remain pending.

Audit result status: **pending execution**. No Phase 2 decisions or product fixes are made here.
