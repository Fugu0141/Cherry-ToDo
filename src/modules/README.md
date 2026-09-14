# V2 modules

Phase 2 establishes the first canonical Domain modules.

- `task` — Task semantic data and validation.
- `schedule` — timezone-neutral local date/date-time values.
- `flow` — structural DAG/reference edge model and graph invariants.
- `board` — Board settings and presentation positions kept separate from Task semantics.
- `annotation` — serialization-facing annotation data types; editing behavior remains Phase 8 work.
- `workspace` — Workspace/Tab aggregate validation and schema version.

Each module exposes its public Domain API only through its top-level `index.ts`.
Application commands, History, persistence, and UI behavior intentionally remain out of scope until later phases.
