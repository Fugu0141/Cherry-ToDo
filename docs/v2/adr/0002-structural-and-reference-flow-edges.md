# ADR-0002: Separate structural Flow edges from cyclic/reference Flow edges

Status: **Partially superseded by ADR-0004 — retained for decision history**

> The structural/reference edge split remains part of V2.0. The original single-parent structural assumption in this ADR is obsolete. ADR-0004 is authoritative for the structural DAG and merge rules.

## Context

Cherry needs all of the following:

- ordinary continuation chains,
- branches,
- explicit flow reorder,
- connecting existing Tasks,
- future/freehand cyclic links,
- deterministic list grouping and auto-layout.

A single `parentId` cannot represent these cleanly. Allowing arbitrary cycles in the same relationship used for recursive tree layout would force every structural algorithm to handle general graphs and would make ownership/order ambiguous.

## Decision

Represent Task connections as explicit directed `FlowEdge` entities with two semantic families.

### Structural edges

Kinds: `continuation` and `branch`.

The original proposal below assumed a single-parent structural tree/forest. **That cardinality assumption is superseded by ADR-0004**, which allows multiple incoming structural edges while keeping the structural graph acyclic.

Structural edges in the original proposal:

- are acyclic,
- allowed at most one incoming structural edge per Task (**superseded by ADR-0004**),
- have explicit branch order,
- define executable flow, list/read-model grouping, and auto-layout input subject to the DAG rules in ADR-0004.

### Reference edges

Kind: `reference`.

Reference edges:

- are directed,
- may form cycles such as `A → B → C → A`,
- are rendered as meaningful task-flow connections,
- do not participate in structural execution or algorithms that require the acyclic structural DAG.

The UI may describe both in user-facing “flow” language; the distinction is an internal correctness boundary.

## Alternatives considered

### Keep `parentId` + `flowOrder`

Rejected because it does not naturally support multiple existing-task links or cycles and keeps relationship data embedded in Task.

### Make every edge a general cyclic graph edge

Rejected for the initial stable V2 design because primary execution/layout behavior benefits from a separately validated acyclic structural graph.

### Use board x/y order as flow order

Rejected because visual position is presentation state and must not become hidden semantic data.

## Consequences

Positive:

- #80 reorder is a structural edge transaction,
- #82 cycles are supported through reference edges without recursive-layout failure,
- #83 connector renderer consumes one edge abstraction,
- #93 mobile/desktop connection UIs share the same command contract,
- structural algorithms remain deterministic while supporting merges through ADR-0004.

Trade-off:

Users may see two kinds of connections that are internally different. Presentation must make any meaningful difference understandable without exposing graph-theory terminology.

See ADR-0004 for the accepted V2.0 structural DAG, branching, merge, and derived-goal semantics.