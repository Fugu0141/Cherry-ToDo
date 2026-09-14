# ADR-0002: Separate structural Flow edges from cyclic/reference Flow edges

Status: **Proposed for V2 design freeze**

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

Structural edges:

- are acyclic,
- allow at most one incoming structural edge per Task,
- have explicit branch order,
- define top-level ownership, executable flow, list grouping, and auto-layout input.

### Reference edges

Kind: `reference`.

Reference edges:

- are directed,
- may form cycles such as `A → B → C → A`,
- are rendered as meaningful task-flow connections,
- do not participate in structural ownership or algorithms that assume an acyclic forest.

The UI may describe both in user-facing “flow” language; the distinction is an internal correctness boundary.

## Alternatives considered

### Keep `parentId` + `flowOrder`

Rejected because it does not naturally support multiple existing-task links or cycles and keeps relationship data embedded in Task.

### Make every edge a general cyclic graph edge

Rejected for the initial stable V2 design because it makes deterministic primary ownership, subtree operations, beginner auto-layout, and list grouping unnecessarily complex.

### Use board x/y order as flow order

Rejected because visual position is presentation state and must not become hidden semantic data.

## Consequences

Positive:

- #80 reorder is a structural edge transaction,
- #82 cycles are supported without recursive-layout failure,
- #83 connector renderer consumes one edge abstraction,
- #93 mobile/desktop connection UIs share the same command contract,
- list/auto-layout remains deterministic.

Trade-off:

Users may see two kinds of connections that are internally different. Presentation must make any meaningful difference understandable without exposing graph-theory terminology.
