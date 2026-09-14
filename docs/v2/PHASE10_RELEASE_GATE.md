# Cherry V2 Phase 10 Release Gate

Status: **Active hardening plan — 2026-09-14**

This document turns Phase 10 of `IMPLEMENTATION_PLAN.md` into an executable release gate. It is not a new source of product semantics; `DESIGN_FREEZE.md`, accepted ADRs, and the requirements remain authoritative.

## Baseline at Phase 10 start

Phase 9 is merged into `v2.0`. The normal V2 quality gate already covers formatting, linting, strict TypeScript, architecture boundaries, Vitest, and a Vite production build.

The Phase 10 audit found these remaining release-readiness gaps:

- `test/e2e/` has no executable browser journey yet.
- only the production `src/ui/default` package exists; whole-UI replacement has not yet been demonstrated by a second compatible package.
- CI has no dedicated browser/release gate.
- accessibility behavior is partially implemented but has no release-level automated audit.
- the default V2 stylesheet is primarily light-theme presentation and needs explicit light/dark/system verification.
- startup/performance assumptions need measurable assertions rather than documentation alone.
- release traceability, known limitations, and the final release checklist are not yet frozen.

## Phase 10 work slices

### 10A — Browser release harness

- Add browser-level E2E tooling and a reproducible local/CI web server configuration.
- Cover critical desktop and mobile user journeys.
- Run against the production-style Vite application rather than a mocked UI.

### 10B — Accessibility and themes

- Add automated accessibility checks for Start, workspace Board/List, dialogs, and mobile viewport.
- Fix release-blocking keyboard/name/role/contrast or color-only issues found by the audit.
- Make light, dark, and system theme behavior explicit and testable.

### 10C — Performance and startup architecture

- Prove Start does not initialize workspace-only Board/layout/annotation work before a workspace is selected/restored.
- Add documented reference-environment measurements for startup and production bundle size.
- Treat measurements as evidence, not guessed universal budgets.

### 10D — UI replaceability proof

- Add a deliberately minimal alternate/test UI package implementing `CherryUIPackage`.
- Prove the composition root can select it without changing Domain/Application modules.
- Keep the alternate package small enough that it tests the boundary instead of becoming a second product UI.

### 10E — Release traceability and deployment

- Map every in-scope MUST requirement to automated coverage or an explicit manual acceptance item.
- Validate static production output and GitHub Pages-compatible routing/assets.
- Audit sync-readiness, persistence/recovery failure paths, and migration non-destruction.
- Publish V2 release notes, known limitations, contributor setup, and the final release checklist.

## Release-candidate gate

Cherry V2 may be called release-candidate ready only when all of the following are true:

1. formatting, lint, strict typecheck, architecture boundaries, unit/application/integration tests, and production build pass;
2. critical desktop and mobile E2E journeys pass in CI;
3. release-level accessibility checks pass with no known critical violations;
4. required interactions do not depend on hover or color alone;
5. light, dark, and system theme modes remain readable and semantically equivalent;
6. Start does not initialize heavy workspace-only features before the resolved route requires them;
7. the production UI can be replaced by the minimal compatible UI package without Core/Application changes;
8. migration/import/recovery failures do not overwrite the last readable workspace;
9. static deployment output is verified for the supported GitHub Pages path model;
10. every in-scope MUST requirement has acceptance coverage or an explicit manual verification entry;
11. release notes and known limitations describe the shipped behavior accurately.

## Evidence policy

Release evidence should be reproducible from repository commands and CI. Machine-specific performance numbers must name the reference environment and must not be presented as universal guarantees.
