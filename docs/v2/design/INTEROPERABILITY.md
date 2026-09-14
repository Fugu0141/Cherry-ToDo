# V2 Migration and Interoperability

Status: Phase 9 implementation contract — 2026-09-14

This document records the supported Cherry V2 migration/interoperability boundary. It is subordinate to `../DESIGN_FREEZE.md` and accepted ADRs, especially ADR-0008.

## Safety rule

V2 never executes or imports the V1 runtime as a migration shortcut. All legacy/external input is parsed into an in-memory candidate, validated against V2 invariants, and committed only after the applicable confirmation step succeeds.

The source data is never rewritten during migration. A failed parse, decryption, validation, or repository commit must leave the last readable V2 workspace unchanged.

## Supported Cherry V1 input

Phase 9 supports:

- a plain V1 workspace object (`version: 1` with `tabs`),
- a plain V1 `.cherry` payload (`format: cherry-workspace`, `version: 1`),
- the V1 encrypted `.cherry` envelope (`format: cherry-workspace-encrypted`, `version: 1`).

The supported encrypted envelope is the V1 format shipped by Cherry:

- PBKDF2,
- SHA-256,
- 250,000 iterations,
- AES-GCM 256-bit key,
- base64 salt/IV/ciphertext.

Invalid credentials or damaged ciphertext return an error and never fall back to guessing plaintext.

### V1 Task mapping

V1 Task IDs are preserved when they are valid V2 stable IDs. V1 `parentId` relationships become structural Flow edges. The first ordinary child is imported as `continuation`; explicit `branchMode: branch` children are branches. If malformed V1 data contains multiple ordinary continuations from one parent, later continuations are normalized to branches with an explicit warning rather than creating an invalid V2 graph.

V1 board `x`/`y` coordinates are presentation state only. Finite coordinates are preserved in `BoardDocumentState.positions`; invalid coordinates are ignored with a warning.

V1 schedule data maps to V2 `none | date | datetime`. Legacy `targetAt` is accepted as a date-only fallback. Invalid dates are never replaced with “today”; they become unscheduled with an import warning.

### Completion normalization preview

A V1 completion state can conflict with V2 derived-goal semantics. Migration therefore produces two in-memory documents:

1. `candidate` — the direct legacy mapping,
2. `normalized` — the V2-valid execution-state normalization.

If a derived branching goal would change `done/todo`, `requiresConfirmation` is true and every change is listed in `completionNormalizations`. Cancel performs no repository write. Confirm commits the already validated normalized candidate transactionally.

## Legacy browser storage recovery

Recovery is best-effort and non-destructive. The reader checks the V1 workspace key first, then known historical task-state keys. Storage access exceptions, malformed JSON, or unsupported data return a recovery failure/none result and cannot block a clean V2 session.

Recovery never deletes or rewrites legacy localStorage keys.

## ICS import

ICS is an interoperability format, not a Cherry backup format. Phase 9 supports common `VEVENT` and `VTODO` records:

- `UID`,
- `SUMMARY`,
- `DESCRIPTION`,
- `DTSTART`,
- `DUE` for VTODO,
- `STATUS:COMPLETED`,
- date-only values,
- local date-time values,
- UTC (`Z`) date-times,
- `TZID` date-times.

`RRULE` is intentionally bounded: the component is imported once and an explicit warning states that recurrence was not expanded. V2 never expands an unbounded recurrence set during import.

Unsupported/malformed dates are imported as unscheduled Tasks with a warning. Relationships are not invented from calendar ordering.

## CSV format

CSV is a documented, simple interchange format. UTF-8 text, including Japanese, is preserved. It is not full fidelity: Board positions and annotations are not exported.

The required columns, in order, are:

```text
record_type,id,title,notes,status,schedule_kind,date,time,time_zone,importance,from_task_id,to_task_id,flow_kind,flow_order
```

`record_type=task` rows define Tasks. `record_type=flow` rows define Flow relationships. This allows stable Task/edge IDs and continuation/branch/reference relationships to round-trip while keeping the format human-editable.

Import rejects malformed Task IDs, duplicate IDs, invalid status/importance/schedules, missing Flow endpoints, invalid Flow kinds/orders, duplicate relationships, and structural cycles. Structural Flow order must be an explicit non-negative integer.

## External import destination

ICS and CSV imports produce a complete candidate Tab first. The default destination is always a **new Tab** in the current workspace. If the imported Tab ID already exists, V2 allocates a unique Tab ID; existing Tabs are not overwritten.

Commit uses the current workspace revision as an optimistic concurrency guard. If the workspace changed after preview/preparation, the import fails with a revision conflict instead of overwriting newer data.

## Native `.cherry` remains the backup format

V2 native `.cherry` serialization is the full-fidelity format for V2 data. CSV and ICS deliberately preserve only their documented subsets and must not be described as complete backup formats.
