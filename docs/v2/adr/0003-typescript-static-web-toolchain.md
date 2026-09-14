# ADR-0003: TypeScript strict-mode static web toolchain

Status: **Accepted for V2.0 — 2026-09-14**

## Context

V2 relies on stable contracts, discriminated unions, explicit data versions, typed command results, and replaceable ports. The V1 build-free JavaScript model made many cross-module contracts implicit and allowed runtime-only failures.

Cherry must remain deployable as a static web application.

## Decision

Use TypeScript in strict mode with ES modules for V2 source.

Recommended baseline:

- TypeScript strict mode,
- Vite for development/build and static production output,
- Vitest for fast unit/application/contract tests,
- static deployment output compatible with GitHub Pages.

No specific presentation framework is selected by this ADR. Domain/Application public contracts must remain independent of any UI framework chosen later.

## Consequences

Positive:

- module contracts are compiler-checked,
- Schedule/Flow unions become safer,
- refactors surface broken consumers earlier,
- test/build tooling is standardized,
- production remains static-hostable.

Costs:

- V2 introduces a build step,
- contributors need Node/tooling rather than only opening `index.html`,
- generated output must not become a second source of truth.

The build-step cost is accepted because reducing runtime integration errors is a primary V2 goal.