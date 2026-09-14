# ADR-0005: Formal replaceable UI package contract

Status: **Accepted for V2.0 — 2026-09-14**

## Context

Cherry V2.0 must keep UI implementation separate from Task, Flow, Schedule, persistence, migration, and History logic. The product direction requires more than merely keeping Domain code free of DOM APIs: the entire standard UI should be replaceable later without rewriting Core/Application.

This also helps mobile UX experimentation. Desktop and mobile can present the same commands differently, and a future UI package can redesign interaction completely while preserving semantics.

## Decision

V2.0 defines a formal UI package boundary.

Conceptually:

```text
Domain / Application
        │
        v
    UI Contract
        │
   ┌────┴───────────┐
   v                v
Default UI      Future UI
```

The UI contract exposes application-facing concepts only, including:

- read models/selectors,
- command/intents facades,
- interaction capabilities,
- localized message/string keys,
- semantic component/state tokens,
- typed presentation errors and startup/navigation state.

The UI contract does not expose:

- Domain collection internals,
- concrete persistence adapters,
- browser-storage handles,
- UI-framework component types,
- raw theme colors as semantic data,
- mutable global runtime hooks.

The initial V2.0 release only needs one production UI implementation, but that implementation is treated as one `CherryUIPackage` rather than as part of Core.

## Composition

The composition root selects and mounts a compatible UI package. Domain/Application modules do not import the concrete UI.

The repository may initially implement this boundary as directories inside one project rather than separate published packages. The API boundary must still be enforced so future extraction is straightforward.

## Styling boundary

The default UI should provide stable semantic states/tokens for concepts such as:

- task card,
- selected/completed state,
- derived branching goal,
- importance,
- structural/reference connector type,
- destructive action,
- interaction preview.

This permits major CSS/visual redesigns without moving semantic state into CSS or rewriting business logic.

## Consequences

Positive:

- UI redesigns and experiments are cheaper,
- mobile connection UX can change without Core changes,
- another rendering framework can be adopted later,
- tests can verify business behavior without mounting the full UI,
- the standard Cherry UI becomes a reusable, replaceable component.

Trade-offs:

- the UI contract itself becomes a versioned API that must stay intentionally small,
- Presentation cannot reach into convenient Domain internals,
- some framework-specific shortcuts must remain inside the UI package rather than leaking into shared contracts.
