# Cherry V2.0 Basic Design

Status: **Draft — basic-design freeze candidate**  
Requirements: `../requirements/REQUIREMENTS.md`  
Detailed Flow execution semantics: `FLOW_EXECUTION_RULES.md`

## 1. Design objective

Cherry V2.0 is built as a set of small, independently testable parts that are assembled at explicit composition boundaries.

The architecture must make these statements true:

> A feature is added by composing or extending explicit contracts, not by patching unrelated runtime functions.

> The standard Cherry UI is a replaceable client of Cherry Core/Application, not the place where business rules live.

V2 uses a **modular hexagonal / ports-and-adapters architecture** with feature-oriented modules and a formal **UI package contract**.

The design is intentionally headless at its center: Domain and Application code know nothing about DOM APIs, browser storage, concrete file formats, or the chosen UI rendering library.

## 2. Dependency rule

Allowed dependency direction:

```text
UI package / Presentation ─────┐
                              │ intents / read models
                              v
                         UI Contract
                              │
                              v
                         Application
                              │
                              v
                           Domain
                              ^
                              │ ports/contracts
Infrastructure / Adapters ────┘

Composition Root depends on all concrete implementations and wires them together.
```

Rules:

1. Domain imports no outer layer.
2. Application imports Domain and port types only.
3. Infrastructure implements ports; Domain/Application never import concrete adapters.
4. UI packages invoke Application use cases through the UI/application-facing contract and read query models/selectors.
5. UI packages never call persistence directly.
6. Cross-module imports use each module's public entry point only.
7. `composition/` is the only place allowed to know multiple concrete implementations at once.
8. UI framework types MUST NOT appear in Domain/Application public contracts.
9. The default UI MUST be replaceable without rewriting Task, Flow, Schedule, storage, migration, or History logic.

## 3. Recommended source layout

```text
src/
  composition/
    create-application.ts
    create-browser-application.ts
    create-ui.ts

  modules/
    workspace/
      domain/
      application/
      ports/
      index.ts
    task/
      domain/
      application/
      index.ts
    flow/
      domain/
      application/
      index.ts
    schedule/
      domain/
      application/
      index.ts
    board/
      domain/
      application/
      index.ts
    history/
      application/
      index.ts
    annotation/
      domain/
      application/
      index.ts
    interoperability/
      application/
      ports/
      index.ts
    startup/
      application/
      index.ts

  ui-contract/
    read-models/
    intents/
    capabilities/
    semantic-tokens/
    index.ts

  ui/
    default/
      app-shell/
      start/
      board/
        layers/
        interaction/
      list/
      task-editor/
      mobile/
      desktop/
      shared/
      index.ts

  adapters/
    persistence/
      memory/
      browser/
    native-file/
    importers/
      ics/
      csv/
    exporters/
      csv/
    platform/
      browser-clock.ts
      browser-id-generator.ts
      browser-files.ts

  shared/
    result/
    ids/
    validation/

test/
  domain/
  application/
  contracts/
  interaction/
  integration/
  regression/
  e2e/
```

The initial repository MAY keep these as directories rather than publishing separate npm packages. The boundary is still treated as a package/API boundary so extraction later does not require redesigning Core.

## 4. Module catalog and ownership

| Module | Owns | Does not own |
| --- | --- | --- |
| Workspace | workspace/tab identity, document aggregate, tab lifecycle | DOM, concrete persistence, task rendering |
| Task | Task entity and task-level invariants | Flow topology, board coordinates |
| Flow | structural/reference edges, DAG invariants, merge/branch/reorder/connect/disconnect, execution availability | connector rendering |
| Schedule | schedule value object and schedule-changing rules | date-lane geometry |
| Board | settings, positions, layout inputs/outputs, drop-intent semantics | Task meaning or persistence |
| History | reversible command transactions | pointer events or persistence format |
| Annotation | text/stroke annotation data and operations | Task/list semantics |
| Interoperability | import/export orchestration and normalized transfer models | concrete ICS/CSV parser implementation |
| Startup | app startup/session state machine | Board rendering |
| Persistence adapters | storage engine implementation | business rules |
| UI contract | application-facing read models, intents, capabilities, semantic hooks | concrete DOM/framework implementation |
| UI package | rendering, input collection, confirmations, accessibility, responsive presentation | domain mutation and persistence |

## 5. Canonical data model

### 5.1 Workspace document

```ts
interface WorkspaceDocument {
  schemaVersion: number;
  id: WorkspaceId;
  name: string;
  tabs: Record<TabId, TabDocument>;
  tabOrder: TabId[];
  meta: RevisionMeta;
}

interface RevisionMeta {
  createdAt: string;
  updatedAt: string;
  revision: number;
}
```

`activeTabId`, current modal, active drag, keyboard state, selected Task, and transient UI-package state are session state, not semantic workspace data.

### 5.2 Tab document

```ts
interface TabDocument {
  id: TabId;
  name: string;
  tasks: Record<TaskId, Task>;
  flowEdges: Record<FlowEdgeId, FlowEdge>;
  annotations: Record<AnnotationId, Annotation>;
  board: BoardDocumentState;
  meta: RevisionMeta;
}
```

Tabs are isolation boundaries for normal planning operations. Cross-tab movement is an application use case that validates and transfers all required entities transactionally.

### 5.3 Task and derived goals

```ts
interface Task {
  id: TaskId;
  title: string;
  notes: string;
  status: "todo" | "done";
  schedule: Schedule;
  appearance: {
    importance: "none" | "low" | "medium" | "high" | "urgent";
  };
  meta: RevisionMeta;
}
```

V2 does **not** add a separate persisted `goal` type merely to distinguish goals from tasks.

Goal meaning is derived from structural Flow:

```text
outgoing structural edge count 0 or 1 → ordinary Task
outgoing structural edge count 2+     → derived branching goal
```

Therefore:

- a standalone goal is simply one Task,
- a root Task is not automatically a goal,
- a nested Task may become a goal if it branches,
- changing Flow topology can change whether a Task is currently treated as a goal.

Importance is stored semantically; actual colors are theme tokens in the UI package. The importance value may remain stored even if later topology means the Task is no longer displayed as a goal.

### 5.4 Goal completion evaluator

Derived goal completion is application/domain behavior, not UI behavior.

For a derived branching goal `G`, define its structural completion set as Tasks reachable from `G` through outgoing structural edges. Reference edges do not participate.

```text
all Tasks in structural completion set are done
→ G becomes done automatically
```

The evaluator MUST:

- handle nested goals,
- handle shared descendants after structural merges,
- never recurse through reference cycles,
- be deterministic under topological traversal,
- de-duplicate shared descendants,
- emit one logical completion/reopening change per affected goal rather than UI-side cascading mutations.

Cherry distinguishes automatic goal completion from explicit manual completion.

If Cherry auto-completed a goal and a required downstream structural Task later becomes incomplete, the auto-completed goal reopens automatically as part of the same consequence transaction.

A goal explicitly completed by the user is not silently reopened merely by the derived-goal evaluator.

### 5.5 Schedule

```ts
type Schedule =
  | { kind: "none" }
  | { kind: "date"; date: LocalDate }
  | {
      kind: "datetime";
      date: LocalDate;
      time: LocalTime;
      timeZone?: string;
    };
```

`LocalDate` is validated `YYYY-MM-DD`; `LocalTime` is validated local time data. Date-only values are never converted through JavaScript UTC `Date` arithmetic as a storage representation.

A time zone is optional so normal local planning can remain simple while imported calendar events can preserve zone intent when required.

### 5.6 Flow edges: structural DAG + reference graph

```ts
type FlowEdge = StructuralFlowEdge | ReferenceFlowEdge;

interface StructuralFlowEdge {
  id: FlowEdgeId;
  kind: "continuation" | "branch";
  fromTaskId: TaskId;
  toTaskId: TaskId;
  order: number;
  meta: RevisionMeta;
}

interface ReferenceFlowEdge {
  id: FlowEdgeId;
  kind: "reference";
  fromTaskId: TaskId;
  toTaskId: TaskId;
  meta: RevisionMeta;
}
```

Structural graph invariants:

- structural edges form a directed acyclic graph (DAG),
- a Task MAY have multiple incoming structural edges so flows can merge,
- a Task has at most one outgoing `continuation` edge,
- zero or more outgoing `branch` edges are allowed and explicitly ordered,
- duplicate `(kind, from, to)` edges are rejected,
- self edges are rejected,
- adding a structural edge that would create a cycle is rejected.

A structural root is a Task with zero incoming structural edges. A root is not automatically a goal.

Example supported merge:

```text
      ┌→ B ─┐
A ────┤     ├→ D
      └→ C ─┘
```

Reference edges:

- may form cycles,
- may create `A → B → C → A`,
- are directional,
- never participate in structural goal completion, structural execution locks, DAG ordering, or automatic structural layout unless a future explicit algorithm says otherwise,
- are removed transactionally when an endpoint Task is deleted.

The separation keeps cyclic/freehand relationships available while allowing structural algorithms to operate on an acyclic DAG.

### 5.7 Derived completion availability and merge gates

Completion availability is derived from the structural graph; it is not stored as an independently mutable `locked` boolean.

Conceptually:

```ts
type TaskCompletionAvailability =
  | { kind: "available" }
  | {
      kind: "blocked-by-merge";
      gateTaskIds: TaskId[];
      remainingPredecessorIds: TaskId[];
    };
```

A Task with two or more incoming structural edges is a merge execution gate.

If any direct structural predecessor of the merge target is incomplete, that merge target cannot be completed.

A normal one-line structural chain is not a hard prerequisite system:

```text
A □ → B □ → C □
```

`B` and `C` remain completable because ordinary Flow communicates intended order.

However, a currently closed merge gate propagates its blocked execution state into its downstream structural region:

```text
A ✓ ─┐
     ├→ C 🔒 → D 🔒
B □ ─┘
```

When `B` becomes complete, the gate opens and both `C` and `D` become available again.

A blocked Task remains editable, schedulable, movable, and inspectable; only completion is unavailable due to this rule.

### 5.8 Board document state

```ts
interface BoardDocumentState {
  settings: {
    showDateLanes: boolean;
    autoLayout: boolean;
    timeGuide: "auto" | "shown" | "hidden";
  };
  positions: Record<TaskId, Point>;
  annotationViewportPolicy?: "board";
}
```

Positions are presentation data. Layout output does not modify Task/Flow/Schedule unless a separate command is explicitly executed.

A viewport (`scroll`, `zoom`) may be stored as local session/view preference, but it is not required to be part of the portable semantic document.

### 5.9 Annotation

```ts
type Annotation = TextAnnotation | StrokeAnnotation;

interface TextAnnotation {
  id: AnnotationId;
  kind: "text";
  rect: Rect;
  text: string;
  styleToken: string;
  meta: RevisionMeta;
}

interface StrokeAnnotation {
  id: AnnotationId;
  kind: "stroke";
  points: Point[];
  widthToken: string;
  styleToken: string;
  meta: RevisionMeta;
}
```

Annotations are Board entities, not Tasks. Stroke points are simplified at commit time; raw pointer samples are transient.

## 6. Application mutation model

V2 uses named commands/use cases instead of global mutation.

Representative commands:

```text
workspace.create
workspace.rename
workspace.createTab
workspace.removeTab
workspace.moveFlowToTab

task.create
task.update
task.setStatus
task.previewStatusChange
task.deleteOnly
task.deleteDownstreamFlow

flow.connectContinuation
flow.connectBranch
flow.connectReference
flow.disconnect
flow.reorder
flow.merge
flow.previewMutation

schedule.set
schedule.clear

board.setSettings
board.moveTask
board.relayout

annotation.createText
annotation.updateText
annotation.move
annotation.resize
annotation.addStroke
annotation.delete
```

Every command returns a typed result:

```ts
type CommandResult<T> =
  | { ok: true; value: T; changes: ChangeSet; events: AppEvent[] }
  | { ok: false; error: AppError };
```

### 6.1 Ordinary command transaction

A command transaction performs:

1. input validation,
2. domain invariant validation,
3. state change,
4. dependent derived-goal/execution-availability evaluation,
5. history inverse/patch creation when reversible,
6. event publication,
7. persistence scheduling when persistence is allowed.

The UI receives the result; it does not perform steps 2–7 itself.

### 6.2 Plan-before-commit for completion invalidation

Some commands can turn an already-completed Task into a state that is invalid under the current merge-gate rules. Examples include reopening a merge predecessor or connecting a new incomplete predecessor to an already-completed merge.

These commands use a revision-aware plan/confirm/commit boundary.

Conceptually:

```ts
interface CompletionImpactPlan {
  baseRevision: number;
  directChanges: TaskId[];
  autoReopenedGoalIds: TaskId[];
  invalidatedCompletedTaskIds: TaskId[];
  newlyBlockedTaskIds: TaskId[];
}
```

Flow:

```text
user intent
→ Application computes impact plan
→ no canonical mutation yet
→ UI shows confirmation if completed Tasks would reopen
→ cancel: discard plan
→ confirm: revision-check/recompute
→ commit all validated changes transactionally
```

Example confirmation:

```text
この変更により、完了済みのタスクが未完了に戻ります。
続行しますか？
```

If the document/graph changed after the plan was produced, commit rejects the stale plan or recomputes it before applying mutation.

## 7. Query/read model

UI packages read through selectors/query services, not by knowing every internal collection.

Examples:

```text
workspace.getActiveTab
flow.getRoots
flow.getStructuralSuccessors
flow.getStructuralPredecessors
flow.getTopologicalOrder
flow.isDerivedGoal
flow.getCompletionAvailability
flow.getBlockingMergeGates
flow.getOutgoingReferences
schedule.getTasksForDate
schedule.getUndatedTasks
board.getResolvedPositions
list.getExecutionItems
```

Board and List may build different read models from the same semantic document.

Because structural Flow is a DAG, read models MUST NOT assume exclusive single-parent ownership. A merged Task is one canonical Task even if more than one upstream path reaches it.

Read models may expose a blocked Task's gate/progress information, but UI packages cannot override the Application's completion validation.

## 8. History design

History is application-level and records logical user operations.

- A drag creates at most one history entry on successful drop, not one per pointer movement.
- A stroke creates one entry when the stroke is committed, not one per sampled point.
- Reordering or merging Flow stores the edge changes required to reverse it.
- Delete stores enough removed entities/edges to restore safely.
- Automatic goal completion/reopening caused by one user command belongs to the same logical transaction where practical.
- Confirmed invalidation that reopens completed Tasks is stored with the initiating status/Flow mutation as one logical transaction where practical.

The initial implementation uses inverse changes/patches, not full event sourcing. Event sourcing is not required to satisfy V2 requirements.

## 9. Interaction architecture

### 9.1 Interaction coordinator

The Board has one `InteractionCoordinator` with an explicit state machine:

```text
idle
├─ panning
├─ dragging-task
├─ creating-connection
├─ reordering-flow
├─ drawing-stroke
├─ editing-annotation
└─ editing-text
```

Only the active state owns pointer/touch movement and release events.

Desktop and mobile controllers translate platform gestures into the same interaction intents, but do not have to use the same gesture.

### 9.2 Mobile existing-task connection is intentionally not frozen

V2 requires the **capability** to connect existing Tasks on mobile, but the exact interaction is deferred until the Core/Application path is stable enough to prototype multiple approaches.

Possible experiments include selection + target tap, an action sheet + target picker, a dedicated temporary connection mode, or another touch-specific interaction.

No candidate is normative yet. The chosen design must:

- call the same Flow application commands as desktop,
- not fight task drag, board pan/scroll, or edge auto-scroll,
- use one gesture owner,
- remain replaceable inside the UI package without Core changes.

### 9.3 Drag state is ephemeral

While dragging a Task:

```ts
interface TaskDragSession {
  taskId: TaskId;
  origin: Point;
  preview: Point;
  candidate: DropTarget | null;
}
```

No canonical Task/Schedule/Flow mutation occurs during pointer movement.

At release:

```text
pointer release
→ DropTargetResolver
→ DropIntent
→ preview/confirmation if required
→ application command
→ canonical state change
```

If the operation is cancelled or invalid, the drag session disappears and canonical position/schedule remains unchanged.

This is the structural fix for the class of bug represented by #222.

### 9.4 Drop target resolver

`DropTargetResolver` consumes Board geometry, not arbitrary DOM side effects.

Possible targets:

```text
TaskTarget(taskId)
DateLaneTarget(date, geometry/state)
FlowInsertionTarget(...)
FreeBoardTarget(point)
NoTarget
```

Date lane hit detection uses lane geometry/overlap and explicit z/priority rules. Collapsed lanes are still first-class targets with their own actual geometry; a normal card center is never assumed to represent a narrower target.

### 9.5 Edge auto-scroll

`EdgeAutoScrollService` is called only by an active drag/reorder interaction. It calculates scroll delta and updated preview position in the same animation frame. It never registers a second competing pointer handler.

## 10. Flow operations

### 10.1 Connect existing Tasks

Connection creation is two-stage:

```text
Interaction chooses source + target + desired relation
→ Flow application command validates
→ if completion consequences exist, produce impact plan
→ confirm when required
→ Edge is created transactionally
```

Validation includes:

- source/target exist,
- source != target,
- duplicate rejection,
- outgoing continuation uniqueness,
- structural cycle prevention,
- reference-cycle allowance policy.

Multiple incoming structural edges are valid and are the mechanism for a structural merge.

### 10.2 Reorder structural flow

Reorder is expressed as a semantic transformation of edges, never an x/y sort.

Example:

```text
A → B → C
```

to

```text
A → C → B
```

is one transaction that rewrites the affected structural edges and then emits `flow.changed`. Schedule remains untouched. Auto-layout MAY react after the semantic commit.

### 10.3 Merge structural flow

Creating a merge is an ordinary structural connect operation whose target already has another structural predecessor, provided the resulting graph stays acyclic.

Example:

```text
A → C
B → C
```

The target remains one canonical Task `C`. Board/List/Layout code must not clone `C` just to satisfy a tree-based renderer.

If creating or rewiring a merge would invalidate already-completed Tasks, the operation uses the impact-plan confirmation process before mutation.

### 10.4 Merge execution gates

A merge target with any incomplete direct structural predecessor reports `blocked-by-merge` and cannot be newly marked complete.

The blocked state propagates structurally downstream while the gate remains unresolved.

```text
A ✓ ─┐
     ├→ C 🔒 → D 🔒
B □ ─┘
```

When `B` is completed, both `C` and `D` become available. Neither is auto-completed by the gate opening.

This rule is intentionally different from normal one-line Flow, where sequence alone does not lock later Tasks.

### 10.5 Delete behavior

When a Task participates in structural Flow, Presentation asks for deletion scope before dispatching a destructive command.

#### Delete this Task only

The application removes the selected Task and attempts to preserve the surrounding structural paths by reconnecting predecessors to successors when that reconnection is valid.

```text
A → B → C
Delete B only
→ A → C
```

Root deletion leaves successors as roots where no predecessor remains. Leaf deletion removes the incoming relationship and preserves upstream Tasks. Merge/branch cases are validated transactionally and duplicate edges are not created.

#### Delete this Task and downstream Flow

This command removes the selected Task plus only the following **single unambiguous structural chain**.

Traversal stops before the next Task if that next Task is either:

- a merge point (`incoming structural edge count >= 2`), or
- a branch point (`outgoing structural edge count >= 2`).

The junction Task itself is preserved.

Example merge boundary:

```text
A → B → C ─┐
            ├→ D → E
X ──────────┘
```

Deleting downstream from `B` removes `B` and `C`, then stops before `D`.

Example branch boundary:

```text
A → B → C
        ├→ D
        └→ E
```

Deleting downstream from `B` stops before `C`, preserving the branch junction and both branches.

The full removal set is calculated before mutation. Both deletion paths participate in History where practical.

## 11. Schedule and Board composition

The four Board combinations are produced by composing two independent settings.

### Lanes shown + auto layout on

- Schedule-aware layout may align scheduled Tasks to date lanes.
- Undated Tasks remain undated and occupy a defined free/undated layout area.

### Lanes shown + auto layout off

- Date lanes render as helper/background geometry.
- Existing manual positions remain authoritative.
- Dropping explicitly onto a lane may create `schedule.set`.

### Lanes hidden + auto layout on

- Structural Flow may still be automatically arranged.
- Existing Schedule remains available to List/badges/queries.

### Lanes hidden + auto layout off

- Full freehand positioning.
- Structural/reference Flow still exists.
- Optional annotation tools may be composed in.

Toggling a setting does not call a Schedule command.

### 11.1 DAG-aware layout

Auto-layout consumes a structural DAG, not a tree. It must:

- accept multiple predecessors for a merged Task,
- assign one resolved position to one canonical Task,
- avoid recursive duplication of merged descendants,
- use a cycle check before layout,
- keep Reference edges out of structural rank/order calculations unless a future explicit algorithm opts in.

Execution blocked/unblocked state is semantic read-model data and does not create duplicate layout nodes.

## 12. Startup/session architecture

`StartupController` owns an explicit state machine:

```text
Booting
→ NeedStorageDecision | Restoring | Start
→ Workspace
→ RecoverableError
```

Startup sequence:

1. Render minimal application shell.
2. Resolve storage consent/policy before any persistent workspace read/write that requires permission.
3. Use Memory repository until permission exists.
4. If persistence is allowed, initialize the persistent browser repository and resolve restorable context.
5. Validate referenced workspace/tab.
6. Transition to `Workspace` or `Start`.
7. Lazy-initialize Board-only components only after `Workspace` is selected.

Start is a route/state, not a modal over Board.

`SessionRepository` stores restorable context only when persistent storage has been allowed. Before consent, session context remains ephemeral.

## 13. Persistence design

Application port:

```ts
interface WorkspaceRepository {
  list(): Promise<WorkspaceSummary[]>;
  load(id: WorkspaceId): Promise<WorkspaceDocument | null>;
  save(document: WorkspaceDocument, expectedRevision?: number): Promise<SaveResult>;
  delete(id: WorkspaceId): Promise<void>;
}
```

Initial implementations:

- `MemoryWorkspaceRepository` — always available, ephemeral.
- `BrowserWorkspaceRepository` — persistent adapter enabled only after explicit user permission.

The application chooses the repository through composition/policy; modules do not branch on `localStorage` or IndexedDB themselves.

The concrete browser storage engine can be selected behind `BrowserWorkspaceRepository` without changing Application. IndexedDB is allowed and may be preferable as workspace/annotation payloads grow; the consent requirement applies regardless of engine.

### 13.1 Mandatory storage consent flow

```text
No persistence consent
→ Memory repository only
→ explain persistent local storage
→ Allow
   → initialize browser repository
   → persistence may begin
→ Not now
   → remain memory-only for this session
```

Rules:

- no workspace/task persistence before **Allow**,
- **Not now** is not consent,
- the app remains usable after **Not now**,
- consent may be persisted only after consent has been granted,
- disabling persistence or clearing data is explicit and destructive-confirmed.

## 14. Schema migration and V1 compatibility

Migration pipeline:

```text
raw input
→ format/envelope decode
→ identify schema/version
→ parse into untrusted candidate
→ sequential migrators
→ schema validation
→ domain invariant validation
→ candidate summary
→ commit/import
```

The old V1 runtime is never executed to migrate data.

V2 compatibility policy:

- supported native V1 `.cherry` files are an official migration target,
- supported encrypted V1 `.cherry` envelopes are an official migration target,
- legacy browser-storage recovery is best-effort,
- migration is non-destructive,
- failed legacy recovery never blocks a clean V2 session.

Migration tests use frozen V1 fixtures. A failed migration cannot overwrite the source or the current V2 workspace.

## 15. Native `.cherry` format boundary

Serialization and encryption are separate ports:

```ts
interface WorkspaceCodec {
  encode(document: WorkspaceDocument): Uint8Array;
  decode(bytes: Uint8Array): DecodeResult;
}

interface WorkspaceEnvelopeCipher {
  encrypt(bytes: Uint8Array, secret: string): Promise<Uint8Array>;
  decrypt(bytes: Uint8Array, secret: string): Promise<Uint8Array>;
}
```

This lets V2 preserve/import encrypted V1 files without tying Domain/Application code to WebCrypto or one encryption policy.

## 16. Interoperability architecture

Common ports:

```ts
interface WorkspaceImporter {
  probe(input: ImportInput): Promise<boolean>;
  import(input: ImportInput, context: ImportContext): Promise<ImportCandidate>;
}

interface WorkspaceExporter {
  export(document: WorkspaceDocument, options: ExportOptions): Promise<ExportArtifact>;
}
```

Pipeline:

```text
File UI
→ select importer
→ parse into normalized candidate
→ validate
→ show import summary/warnings
→ application command creates tab/workspace
```

ICS and CSV adapters cannot mutate current workspace while parsing.

## 17. Formal UI package architecture

V2.0 treats the UI as a formal replaceable implementation boundary.

Conceptually:

```text
Cherry Domain/Application
          │
          v
     UI Contract
          │
    ┌─────┴───────────────┐
    v                     v
Default Cherry UI     Future UI package
(Sashimi/current)     Minimal/Touch/etc.
```

The initial implementation ships one production UI package. Multiple production UIs are not required for V2.0, but the contract that makes replacement possible **is** required.

### 17.1 UI contract contents

The contract may expose:

```text
Read models / selectors
Application intents / command facades
Interaction capabilities
Localized string keys/messages
Semantic component/state tokens
Navigation/startup state
Typed error presentation data
Impact plans / confirmation descriptors
```

The contract does not expose:

```text
Domain collection internals
Concrete repository instances
localStorage / IndexedDB handles
Framework component types
Raw theme colors as semantic data
Global mutable functions
```

A UI package factory can be conceptually represented as:

```ts
interface CherryUIPackage {
  mount(context: CherryUIContext): CherryUIHandle;
}
```

`CherryUIContext` contains only the application-facing contract needed by the UI package.

### 17.2 Standard Board rendering

The default UI Board is layered deliberately:

```text
BoardViewport
├─ BoardGuideLayer        (date lanes/time guides)
├─ FlowConnectorLayer     (directional structural/reference edges)
├─ TaskLayer              (Task cards)
├─ AnnotationLayer        (text/strokes)
└─ InteractionOverlay     (drag preview, target preview, selection handles)
```

Each layer receives a read model and emits intents. No layer owns Workspace persistence.

### 17.3 Adaptive Task editor

One `TaskEditorModel` exposes fields and submit/cancel actions.

Default presentation strategy:

- desktop: anchored popover/side editor when geometry permits,
- mobile: bottom sheet/panel candidate,
- constrained desktop: centered dialog fallback.

All strategies call the same Task/Schedule application use cases.

### 17.4 Merge-gate and invalidation presentation

The UI contract exposes completion availability and impact-plan information semantically.

Default UI may render a blocked Task with a lock/progress affordance such as:

```text
🔒 前提タスク 1 / 2 完了
```

or for inherited downstream blocking:

```text
🔒 前の合流タスクの完了待ち
```

When an operation would reopen completed Tasks, the UI MUST show a confirmation before invoking the commit phase. The UI does not calculate which Tasks are affected; it displays the Application-provided impact plan.

### 17.5 Semantic styling hooks

The default UI SHOULD expose stable semantic states/tokens such as task-card, selected, completed, blocked-by-merge, derived-goal, importance, connection kind, and danger action so large visual redesigns can happen without modifying business logic.

This is a styling/extensibility boundary, not permission for arbitrary untrusted plugin execution.

## 18. Error model

Expected failures return typed errors; they do not rely on thrown strings crossing layers.

Categories:

```text
ValidationError
InvariantError
NotFoundError
ConflictError
PersistenceError
MigrationError
ImportError
Permission/CapabilityError
StalePlanError
CompletionBlockedError
```

UI packages map errors to localized messages. Infrastructure retains technical cause information for diagnostics without exposing sensitive contents unnecessarily.

## 19. Events

Application events are notifications after a successful commit, not a second mutation API.

Examples:

```text
workspace.created
workspace.loaded
workspace.changed
tab.changed
task.created
task.updated
task.deleted
task.completionAvailabilityChanged
flow.changed
goal.autoCompleted
goal.autoReopened
schedule.changed
board.changed
annotation.changed
storage.statusChanged
```

Event handlers cannot mutate the store behind command validation. If a follow-up mutation is needed, it dispatches another explicit command/use case through the normal transaction boundary.

## 20. Technology boundary

The architecture assumes **TypeScript in strict mode with ES modules** for V2 source so contracts and discriminated unions are compiler-checked.

Recommended build/test baseline is **Vite + Vitest** because it can still emit a static GitHub Pages site while providing deterministic module builds and fast tests.

The Domain/Application/UI-contract design intentionally does **not** require a specific UI framework. A UI framework decision, if any, is internal to a UI package and must not leak framework types into public contracts.

## 21. Implementation dependency order

Implementation should follow this order after design freeze:

1. Toolchain, lint/type/test baseline, import-boundary rules.
2. Shared IDs/Result/schema utilities.
3. Task + Schedule value model.
4. Structural DAG/reference Flow model, merge support, and invariant tests.
5. Derived-goal detection/completion/reopening evaluator.
6. Merge execution-gate availability evaluator and downstream blocking propagation.
7. Revision-aware completion-impact planner and plan/confirm/commit command support.
8. Workspace aggregate/document validation.
9. Application store, command transactions, History, and chain-limited deletion commands.
10. Memory repository + schema codec/migrators.
11. Startup state machine + mandatory storage-consent policy.
12. Browser persistence adapter.
13. UI contract and contract tests.
14. Minimal default Start/Board/List shell wired only through the UI contract.
15. Task editor + desktop Task/Flow/Schedule interactions.
16. Merge-gate/invalidation confirmation UI.
17. Board DAG layout/drop resolver + #222 regression.
18. Mobile InteractionCoordinator/edge scroll; prototype connection UX without freezing it prematurely.
19. Goal appearance + automatic goal-completion presentation.
20. Freehand/reference edges/annotations.
21. `.cherry` V1 import, including supported encrypted V1 files, + native V2 export/import.
22. Best-effort legacy browser-storage recovery.
23. ICS/CSV adapters.
24. Broader E2E, accessibility, performance, UI-package swap proof, and release hardening.

The order is dependency-driven: a UI feature is not implemented before the semantic component it needs exists.

## 22. Remaining design-freeze questions

After the 2026-09-14 Flow review, the major structural semantics are resolved:

- structural Flow is a branching/merging DAG,
- derived goals and auto-completion/reopening are defined,
- downstream deletion stops before branch/merge junctions,
- merge targets are execution gates,
- blocked state propagates downstream from a closed merge gate,
- ordinary one-line Flow remains non-blocking,
- completed-state invalidation requires Application impact planning and UI confirmation,
- UI package replacement is a V2.0 boundary,
- persistent browser storage requires explicit opt-in.

The following product/UX decision remains intentionally deferred rather than blocking Core design:

1. **Mobile existing-task connection UX:** capability is required, but the exact touch interaction will be selected after prototype testing against the stable Flow commands.

Any newly discovered semantic ambiguity should be resolved before the affected implementation milestone rather than patched inside Presentation.

## 23. Basic-design freeze criteria

Basic design is ready to freeze when:

- every MUST requirement has one owning module,
- structural DAG/reference edge semantics are accepted,
- branch/merge and derived-goal completion/reopening semantics are accepted,
- merge-gate/downstream-blocking/invalidation-confirmation semantics are accepted,
- chain-limited downstream deletion semantics are accepted,
- persisted data model is accepted,
- explicit persistence consent and V1 migration boundaries are accepted,
- UI package contract is accepted,
- interaction state ownership is accepted,
- startup state machine is accepted,
- test strategy can verify the contracts,
- no feature requires a direct global/runtime patch to fit the design.
