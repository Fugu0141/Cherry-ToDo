# Cherry V2.0 Project Charter

## Objective

Rebuild Cherry from requirements upward so that future development is faster, safer, and easier to reason about.

## Problems V2 must address

The previous development line accumulated behavior through incremental fixes and migration bridges. This made module ownership unclear, increased regression risk, and made large changes such as Core migration expensive.

V2 therefore starts by defining requirements and architecture before implementation.

## Required outcomes

- Every current Open Issue has an explicit disposition.
- Every in-scope Issue maps to one or more requirements.
- Requirements have acceptance criteria.
- Every responsibility has one owning module/layer.
- Dependencies point in one documented direction.
- Business rules are testable without the UI or concrete persistence.
- Infrastructure implementations are replaceable behind contracts.
- UI behavior is built from reusable components and application APIs.
- Data format/versioning and V1 migration policy are explicit.
- Regression tests are planned before implementation begins.

## Development gates

### Gate 1 — Issue inventory

All current Open Issues are classified as one of:

- V2 requirement
- duplicate / merged requirement
- obsolete due to V2 redesign
- deferred beyond V2.0
- needs product decision

### Gate 2 — Requirements freeze

Functional/non-functional requirements and acceptance criteria are approved.

### Gate 3 — Basic-design freeze

Domain model, modules, dependencies, persistence, UI boundaries, data migration, and test architecture are approved.

### Gate 4 — Implementation

Implementation proceeds by component/feature from the accepted documents.

## V1 policy

`main` remains the historical/reference implementation. No V1 source is copied into V2 merely for convenience. Reuse is allowed only after reviewing whether the code fits the V2 contracts and quality requirements.
