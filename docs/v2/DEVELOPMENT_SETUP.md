# Cherry V2.0 Development Setup

Status: Phase 1 engineering baseline

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
npm run dev          # Vite development server
npm run typecheck    # TypeScript strict-mode check
npm run test         # Vitest test suite
npm run lint         # ESLint
npm run format:check # Prettier verification
npm run boundaries   # architecture/import-boundary guard
npm run build        # static production build
npm run check        # all Phase 1 quality gates in CI order
```

## Source boundaries

The V2 source layout follows `design/BASIC_DESIGN.md`.

- `src/modules/` contains feature/domain modules.
- `src/ui-contract/` is the formal application-facing UI boundary.
- `src/ui/` contains UI package implementations.
- `src/adapters/` contains concrete infrastructure.
- `src/composition/` is the wiring boundary and is the only layer allowed to know multiple concrete implementations at once.
- `src/shared/` contains low-level framework-independent utilities.

`npm run boundaries` rejects important dependency-direction violations before they can become runtime coupling. The checker includes representative allowed/forbidden rule self-tests and is repository-owned so its rules can evolve with accepted ADRs.

## Phase discipline

Implementation follows `IMPLEMENTATION_PLAN.md`.

Phase 1 establishes tooling only. Product Domain work begins in Phase 2 after the Phase 1 exit criteria pass on `v2.0`. Do not add Task, Flow, persistence, or production UI behavior to a Phase 1 PR merely because the toolchain makes it possible.

## CI

Pull requests targeting `v2.0` run `.github/workflows/ci.yml` and execute `npm run check`.

A Phase 1 change is not ready to merge if formatting, linting, type checking, architecture boundaries, tests, or the static production build fail.
