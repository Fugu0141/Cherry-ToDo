# Cherry V2.0 Development Setup

Status: **V2 release-candidate development setup — 2026-09-14**

## Prerequisites

- Node.js 24 LTS is the CI reference runtime.
- Node.js 22.13 or newer is supported by the package engine range.
- npm is the repository package manager for V2.

## Install

```bash
npm ci
```

`package-lock.json` is committed. Do not replace `npm ci` with an unpinned dependency install in CI.

## Common commands

```bash
npm run dev                # Vite development server
npm run typecheck          # TypeScript strict-mode check
npm run test               # Vitest unit/application/contract/integration suite
npm run test:e2e           # Playwright desktop/mobile browser journeys
npm run lint               # ESLint
npm run format:check       # Prettier verification
npm run boundaries         # architecture/import-boundary guard
npm run build              # static production build
npm run metrics            # production bundle reference metrics
npm run static:verify      # relative/static deployment verification
npm run traceability:check # requirements -> acceptance-evidence audit
npm run check              # normal V2 quality gate
npm run release:check      # complete local release gate (requires Playwright Chromium)
```

For the browser gate on a fresh machine, install Chromium first:

```bash
npx playwright install --with-deps chromium
npm run release:check
```

Use `npm run dev` or `npm run preview` to open Cherry. Do not open the source `index.html` directly through `file://`; ES modules are expected to be served over HTTP and browsers will otherwise report CORS/module-loading errors.

## Source boundaries

The V2 source layout follows the accepted architecture and `design/BASIC_DESIGN.md`.

- `src/modules/` contains Domain/Application modules and their public APIs.
- `src/ui-contract/` is the formal application-facing UI boundary.
- `src/ui/` contains replaceable UI package implementations.
- `src/adapters/` contains concrete infrastructure.
- `src/composition/` is the wiring boundary and is the only layer allowed to know multiple concrete implementations at once.
- `src/shared/` contains low-level framework-independent utilities.

`npm run boundaries` rejects important dependency-direction violations. UI packages must use the UI/Application-facing contract rather than importing Domain internals or persistence adapters for convenience.

## Testing and release discipline

Implementation follows `IMPLEMENTATION_PLAN.md` and the authority order in `DESIGN_FREEZE.md`. New normative requirements must be added to `REQUIREMENT_TRACEABILITY.md`; `npm run traceability:check` fails when a requirement/principle heading has no release evidence row.

Pull requests targeting `v2.0` run the normal V2 quality gate. The V2 Release Gate additionally verifies requirement traceability, production bundle metrics, static/GitHub-Pages-compatible output, and Playwright desktop/mobile journeys including accessibility checks.

A V2 release candidate is not ready to merge while any required quality, browser, migration/data-safety, architecture, or traceability gate is knowingly failing.
