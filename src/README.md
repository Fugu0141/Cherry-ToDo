# Cherry V2 Source Layout

Phase 1 establishes the V2 engineering skeleton from the frozen Basic Design. Product semantics intentionally remain absent until later phases.

- `composition/` — application/bootstrap wiring boundary.
- `modules/` — future feature-oriented Domain/Application/ports modules.
- `ui-contract/` — future formal UI-facing contract.
- `ui/` — future replaceable UI package implementations.
- `adapters/` — future concrete infrastructure adapters.
- `shared/` — framework-independent shared primitives.

Cross-layer dependency rules are checked by `npm run boundaries`.
