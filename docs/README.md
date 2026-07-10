# Cherry Documentation Guide

Last reviewed: **2026-07-10**

Cherry has accumulated product notes, feature specifications, migration plans, progress logs, and issue discussions while the prototype evolved quickly.

This page explains which documents are authoritative and where new information belongs.

---

## Start here

Read these in order:

1. [`REQUIREMENTS.md`](REQUIREMENTS.md)  
   Canonical product requirements, domain model, architectural principles, extension design, migration rules, and definition of done.

2. [`IMPLEMENTATION_PLAN.md`](IMPLEMENTATION_PLAN.md)  
   Canonical implementation sequence, dependencies, release phases, and mapping of current GitHub issues.

3. [`UI_SYSTEM.md`](UI_SYSTEM.md)  
   Cherry-owned design system and reusable UI component policy, technology candidates, testing requirements, and incremental migration plan.

4. [`PRODUCT_VISION.md`](PRODUCT_VISION.md)  
   The concise product purpose and “flow first, schedule second” philosophy.

5. [`TECHNICAL_ARCHITECTURE.md`](TECHNICAL_ARCHITECTURE.md)  
   Description of the current prototype architecture. This is primarily an **as-is** document; the target architecture is defined in `REQUIREMENTS.md`.

6. [`MANUAL_TEST_CHECKLIST.md`](MANUAL_TEST_CHECKLIST.md)  
   Current browser/manual regression checks.

---

## Source-of-truth order

When documents disagree, use this order:

```text
1. REQUIREMENTS.md
2. Accepted Architecture Decision Record (future docs/adr/)
3. IMPLEMENTATION_PLAN.md
4. Focused feature specification, including UI_SYSTEM.md
5. Current GitHub issue and accepted maintainer decision
6. Historical roadmap/progress/release notes
```

A recent issue may propose changing a canonical rule, but the rule is not changed until the canonical document or an accepted ADR is updated.

---

## Document categories

### Canonical documents

| Document | Purpose |
| --- | --- |
| [`REQUIREMENTS.md`](REQUIREMENTS.md) | What Cherry is and which product/technical rules must hold |
| [`IMPLEMENTATION_PLAN.md`](IMPLEMENTATION_PLAN.md) | What is implemented next and in which dependency order |
| `docs/adr/` (planned) | Why a major architecture decision changed |

These documents should stay relatively small in number. Do not create another broad “master spec” without replacing or updating one of them.

### Product, UI, and UX specifications

| Document | Scope |
| --- | --- |
| [`UI_SYSTEM.md`](UI_SYSTEM.md) | Cherry UI design tokens, components, dependency policy, testing, extension use, and migration |
| [`PRODUCT_VISION.md`](PRODUCT_VISION.md) | Product purpose and long-term character |
| [`PROJECT_SPEC.md`](PROJECT_SPEC.md) | Prototype-era product overview and terminology |
| [`LAYOUT_AND_SCHEDULE_SPEC.md`](LAYOUT_AND_SCHEDULE_SPEC.md) | Flow/layout/schedule interaction details |
| [`UX_INTERACTION_SPEC.md`](UX_INTERACTION_SPEC.md) | General create/edit/delete/drag UX |
| [`MOBILE_UX_SPEC.md`](MOBILE_UX_SPEC.md) | Mobile-specific screen and interaction direction |
| [`MOBILE_FLOW_MAP_SPEC.md`](MOBILE_FLOW_MAP_SPEC.md) | Mobile minimap behavior |
| [`WELCOME_SPLASH_SPEC.md`](WELCOME_SPLASH_SPEC.md) | First-run/welcome behavior from the prototype stage |

Focused specifications may explain detailed behavior, but must not redefine the core domain model independently.

### Data and migration specifications

| Document | Scope |
| --- | --- |
| [`SCHEDULE_MIGRATION_PLAN.md`](SCHEDULE_MIGRATION_PLAN.md) | Legacy `targetAt` to schedule migration |
| [`DATE_TARGET_SPEC.md`](DATE_TARGET_SPEC.md) | Date-line hit testing and boundary behavior |
| [`MIGRATION_NOTES.md`](MIGRATION_NOTES.md) | Migration history/temporary compatibility notes |

Migration documents must state the source and target schema, rollback/failure behavior, and when compatibility code can be removed.

### Development and quality documents

| Document | Scope |
| --- | --- |
| [`DEVELOPMENT_SETUP.md`](DEVELOPMENT_SETUP.md) | Local development instructions |
| [`CODEBASE_MODULE_PLAN.md`](CODEBASE_MODULE_PLAN.md) | Earlier incremental file-split plan; retained as migration background |
| [`MANUAL_TEST_CHECKLIST.md`](MANUAL_TEST_CHECKLIST.md) | Manual regression checks |
| [`KNOWN_ISSUES.md`](KNOWN_ISSUES.md) | User-visible/current prototype limitations |
| [`ORIGINALITY_REVIEW.md`](ORIGINALITY_REVIEW.md) | Product originality and inspiration boundaries |

### Historical and status documents

| Document | Purpose |
| --- | --- |
| [`ROADMAP.md`](ROADMAP.md) | Earlier phase roadmap and completed history |
| [`PROJECT_PROGRESS.md`](PROJECT_PROGRESS.md) | Dated development snapshots and corrections |
| `RELEASE_NOTES*.md` | Released behavior and known limitations at release time |

Historical/status documents must not be used as the current implementation queue when they conflict with `IMPLEMENTATION_PLAN.md`.

---

## Where new information belongs

### A new product rule

Update `REQUIREMENTS.md`. If it is a major trade-off or reversal, add an ADR as well.

### A new feature request

Create or update a GitHub issue. Link it to the relevant requirement and implementation phase. Do not add an entire speculative feature to the canonical requirements unless the direction is accepted.

### A reusable UI component or visual-system rule

Update `UI_SYSTEM.md`. Product-specific interaction details may also belong in the relevant UX/mobile/layout specification.

A feature must not introduce a new one-off control style when an equivalent Cherry UI component or token already exists.

### Detailed interaction design

Update the focused UX/mobile/layout specification and link the issue.

### A schema migration

Create a focused migration document or ADR containing:

- old shape
- target shape
- normalization rules
- compatibility period
- failure/rollback behavior
- test cases
- bridge removal condition

### Current work status

Update the GitHub issue/PR. Add a dated entry to `PROJECT_PROGRESS.md` only when the context is important for future maintainers or AI assistants.

### Released behavior

Update release notes. Release notes are historical and should not be silently rewritten to describe future plans.

---

## Documentation maintenance rules

1. Prefer links over copying the same rule into several files.
2. A focused spec should begin by linking to the canonical requirement it refines.
3. Mark prototype-era assumptions as current, planned, implemented, superseded, or historical.
4. Remove stale checklists after their issue is complete, or preserve them clearly as history.
5. Do not treat chat history as the only record of a design decision.
6. Do not put implementation status in a timeless product-vision document.
7. Update the “Last reviewed” date only after checking the document against current code/issues.
8. Use user-facing term `Cherry`; use `Cherry-ToDo` only for repository/URL/legacy compatibility contexts.
9. New application UI should use Cherry UI components/tokens or document why a new primitive is necessary.
10. Third-party UI libraries must remain implementation details behind Cherry-owned APIs wherever practical.

---

## Planned cleanup after this documentation reset

The documentation-only cleanup should proceed separately from behavior changes:

1. Add banners to `ROADMAP.md`, `PROJECT_PROGRESS.md`, `PROJECT_SPEC.md`, and `CODEBASE_MODULE_PLAN.md` explaining their current role.
2. Audit detailed specs for repeated or contradictory product rules.
3. Mark completed prototype specifications as implemented/historical where appropriate.
4. Remove or redirect duplicate root-level documentation files.
5. Create `docs/adr/README.md` and the first ADR when a major model decision is implemented (likely structural edge model, storage strategy, or final UI dependency selection).
6. Update `README.md` and `README_ja.md` to point contributors to this documentation guide.
7. Create a temporary UI inventory before component migration and remove it when the migration tracker replaces it.
