# ADR-0001: Modular hexagonal architecture

Status: **Accepted for V2.0 — 2026-09-14**

## Context

V1 accumulated behavior across root scripts, runtime bridges, feature patches, Core migration code, and presentation files. Changes increasingly required understanding script order and unrelated behavior.

V2 needs independent reusable parts with explicit dependency direction.

## Decision

Use a modular hexagonal / ports-and-adapters architecture with feature-oriented modules.

- Domain is platform/framework independent.
- Application owns use-case orchestration and mutation transactions.
- Ports describe required side effects/capabilities.
- Infrastructure implements ports.
- Presentation calls application contracts and consumes read models.
- A composition root is the only place that wires concrete implementations.
- Module internals are private; cross-module access uses public `index` contracts.

## Consequences

Positive:

- business logic can be tested without browser/UI,
- storage/import/UI implementations are replaceable,
- module ownership is explicit,
- features are composed instead of monkey-patched,
- future sync can implement a repository boundary rather than rewrite Task logic.

Costs:

- more interfaces/files than an ad-hoc script application,
- design discipline and import-boundary checks are required,
- composition/bootstrap code becomes an explicit responsibility.

These costs are accepted because V2 exists specifically to reduce the long-term cost of cross-cutting patches.