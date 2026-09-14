# Cherry V2.0 Basic Design

Status: **Draft — basic-design freeze candidate**  
Requirements: `../requirements/REQUIREMENTS.md`

## 1. Design objective

Cherry V2.0 is built as a set of small, independently testable parts that are assembled at one composition boundary.

The architecture must make this statement true:

> A feature is added by composing or extending explicit contracts, not by patching unrelated runtime functions.

V2 uses a **modular hexagonal / ports-and-adapters architecture** with feature-oriented modules.

The design is intentionally headless at its center: Domain and Application code know nothing about DOM APIs, browser storage, concrete file formats, or the chosen UI rendering library.

## 2. Dependency rule

Allowed dependency direction:

```text
Presentation ───────────────┐
                           │
                           v
                     Application
                           │
                           v
                        Domain
                           ^
                           │ ports/contracts
                           │
Infrastructure/Adapters ───┘

Composition Root depends on all concrete modules and wires them together.
```

Rules:

1. Domain imports no outer layer.
2. Application imports Domain and port types only.
3. Infrastructure implements ports; Domain/Application never import concrete adapters.
4. Presentation invokes Application use cases and reads query models/selectors.
5. Presentation never calls persistence directly.
6. Cross-module imports use each module's public entry point only.
7. `composition/` is the only place allowed to know concrete implementations of multiple layers at once.

## 3. Recommended source layout

```text
src/
  composition/
    create-application.ts
    create-browser-application.ts

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

  presentation/
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

  shared/
    result/
    ids/
    validation/

test/
  domain/
  application/
  contracts/
  integration/
  regression/
  e2e/
```

A module may omit folders it does not need. Internal paths are private; consumers import from `modules/<name>/index.ts`.

## 4. Module catalog and ownership

| Module | Owns | Does not own |
| --- | --- | --- |
| Workspace | workspace/tab identity, document aggregate, tab lifecycle | DOM, concrete persistence, task rendering |
| Task | Task entity and task-level invariants | Flow topology, board coordinates |
| Flow | directed structural/reference edges, graph invariants, reorder/connect/disconnect | connector SVG/Canvas rendering |
| Schedule | schedule value object and schedule-changing rules | date-lane geometry |
| Board | settings, positions, layout inputs/outputs, drop-intent semantics | Task meaning or storage |
| History | reversible command transactions | pointer events or persistence format |
| Annotation | text/stroke annotation data and operations | Task/list semantics |
| Interoperability | import/export orchestration and normalized transfer models | concrete ICS/CSV parser implementation |
| Startup | app startup/session state machine | Board rendering |
| Persistence adapters | storage engine implementation | business rules |
| Presentation | rendering, input collection, accessibility, responsive presentation | domain mutation and persistence |

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

`activeTabId`, current modal, active drag, keyboard state, and selected Task are session state, not semantic workspace data.

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

### 5.3 Task

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

A top-level goal is derived from structural Flow ownership: a Task with no incoming structural edge is a top-level Task. V2 does not duplicate this fact with a second `parentId` source of truth.

Importance is stored semantically; actual colors are theme tokens in Presentation.

### 5.4 Schedule

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

### 5.5 Flow edges

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

Structural graph invariants for the first stable V2 implementation:

- a Task has at most one incoming structural edge,
- structural edges are acyclic,
- a Task has at most one outgoing `continuation` edge,
- zero or more outgoing `branch` edges are allowed and explicitly ordered,
- duplicate `(kind, from, to)` edges are rejected,
- self edges are rejected.

Reference edges:

- may form cycles,
- may create `A → B → C → A`,
- are directional,
- never participate in recursive structural ownership/auto-layout unless a future explicit algorithm says otherwise,
- are removed transactionally when an endpoint Task is deleted.

This split resolves #80 and #82 without forcing cycle-safe behavior into every tree/forest algorithm.

### 5.6 Board document state

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

### 5.7 Annotation

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
workspace.moveSubflowToTab

task.create
task.update
task.setStatus
task.delete

flow.connectContinuation
flow.connectBranch
flow.connectReference
flow.disconnect
flow.reorder

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

A command transaction performs:

1. input validation,
2. domain invariant validation,
3. state change,
4. history inverse/patch creation when reversible,
5. event publication,
6. persistence scheduling.

The UI receives the result; it does not perform steps 2–6 itself.

## 7. Query/read model

Presentation reads through selectors/query services, not by knowing every internal collection.

Examples:

```text
workspace.getActiveTab
flow.getRoots
flow.getStructuralChildren
flow.getOutgoingReferences
flow.getOrderedSubflow
schedule.getTasksForDate
schedule.getUndatedTasks
board.getResolvedPositions
list.getExecutionItems
```

Board and List may build different read models from the same semantic document.

## 8. History design

History is application-level and records logical user operations.

- A drag creates at most one history entry on successful drop, not one per pointer movement.
- A stroke creates one entry when the stroke is committed, not one per sampled point.
- Reordering a flow stores the edge changes required to reverse it.
- Delete stores enough removed entities/edges to restore safely.

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

### 9.2 Drag state is ephemeral

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

### 9.3 Drop target resolver

`DropTargetResolver` consumes Board geometry, not arbitrary DOM side effects.

Possible targets:

```text
TaskTarget(taskId)
DateLaneTarget(date, geometry/state)
FlowInsertionTarget(...)
FreeBoardTarget(point)
NoTarget
```

Date lane hit detection uses lane geometry/overlap and explicit z/priority rules. Collapsed lanes are still first-class targets with their own actual geometry; a 220px card center is never assumed to represent a narrower target.

### 9.4 Edge auto-scroll

`EdgeAutoScrollService` is called only by an active drag/reorder interaction. It calculates scroll delta and updated preview position in the same animation frame. It never registers a second competing pointer handler.

## 10. Flow operations

### 10.1 Connect existing Tasks

Connection creation is two-stage:

```text
Interaction chooses source + target + desired relation
→ Flow application command validates
→ Edge is created transactionally
```

Validation includes:

- source/target exist,
- source != target,
- duplicate rejection,
- incoming structural ownership,
- continuation uniqueness,
- structural cycle prevention,
- reference-cycle allowance policy.

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

### 10.3 Delete behavior

Default safe behavior:

- deleting one Task removes its incident edges,
- structural children are preserved and become top-level Tasks unless the user explicitly selected a separate “delete this subflow” operation,
- annotations are unaffected unless explicitly attached by a future feature.

This avoids silent destructive cascade and gives subtree deletion its own explicit command if later required.

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
2. Resolve storage policy/availability needed for restoration.
3. Load the last session reference if allowed/available.
4. Validate referenced workspace/tab.
5. Transition to `Workspace` or `Start`.
6. Lazy-initialize Board-only components only after `Workspace` is selected.

Start is a route/state, not a modal over Board.

`SessionRepository` stores only restorable context such as last workspace/tab and optional view mode. It is separate from the portable workspace document.

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
- `BrowserWorkspaceRepository` — persistent adapter enabled only by storage policy.

The application chooses the repository through composition/policy; modules do not branch on `localStorage` themselves.

### 13.1 Storage consent flow

```text
No persistence decision
→ Memory repository
→ explain persistent local storage
→ Allow: initialize browser repository and optionally save/migrate
→ Not now: continue memory-only for this session
```

Disabling persistence clears/forgets browser-persisted Cherry data only after an explicit user action and confirmation appropriate to destructive data removal.

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

Compatibility adapters may understand:

- supported V1 `.cherry` workspace envelopes,
- explicitly supported legacy browser-storage snapshots.

Migration tests use frozen fixtures from V1. A failed migration cannot overwrite the source or the current V2 workspace.

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

## 17. Presentation composition

Board rendering is layered deliberately:

```text
BoardViewport
├─ BoardGuideLayer        (date lanes/time guides)
├─ FlowConnectorLayer     (directional structural/reference edges)
├─ TaskLayer              (Task cards)
├─ AnnotationLayer        (text/strokes)
└─ InteractionOverlay     (drag preview, target preview, selection handles)
```

Each layer receives a read model and emits intents. No layer owns Workspace persistence.

### 17.1 Adaptive Task editor

One `TaskEditorModel` exposes fields and submit/cancel actions.

Presentation strategy:

- desktop: anchored popover/side editor when geometry permits,
- mobile: bottom sheet/panel,
- constrained desktop: centered dialog fallback.

All strategies call the same Task/Schedule application use cases.

### 17.2 Mobile action model

Selecting a Task exposes a contextual action model such as:

```text
Edit
Add next
Add branch
Connect existing
Complete / reopen
More…
```

Delete and low-frequency actions live under `More` unless a later UX decision deliberately changes this.

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
```

Presentation maps errors to localized messages. Infrastructure retains technical cause information for diagnostics without exposing sensitive contents unnecessarily.

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
flow.changed
schedule.changed
board.changed
annotation.changed
storage.statusChanged
```

Event handlers cannot mutate the store behind command validation. If a follow-up mutation is needed, it dispatches another explicit command.

## 20. Technology boundary

The architecture assumes **TypeScript in strict mode with ES modules** for V2 source so contracts and discriminated unions are compiler-checked.

Recommended build/test baseline is **Vite + Vitest** because it can still emit a static GitHub Pages site while providing deterministic module builds and fast tests.

The Domain/Application design intentionally does **not** require a specific UI framework. A UI framework decision, if any, is presentation-only and must not leak framework types into module public contracts.

## 21. Implementation dependency order

Implementation should follow this order after design freeze:

1. Toolchain, lint/type/test baseline, import-boundary rules.
2. Shared IDs/Result/schema utilities.
3. Task + Schedule value model.
4. Flow model and invariant tests.
5. Workspace aggregate/document validation.
6. Application store, command transactions, History.
7. Memory repository + schema codec/migrators.
8. Startup/session state machine.
9. Browser persistence + storage policy.
10. Minimal Start/Board/List shell.
11. Task editor + Task/Flow/Schedule interactions.
12. Board settings/layout/drop resolver + #222 regression.
13. Mobile InteractionCoordinator/edge scroll.
14. Goal appearance.
15. Freehand/reference edges/annotations.
16. `.cherry` V1 import + native V2 export/import.
17. ICS/CSV adapters.
18. Broader E2E, accessibility, performance and release hardening.

The order is dependency-driven: a UI feature is not implemented before the semantic component it needs exists.

## 22. Basic-design freeze criteria

Basic design is ready to freeze when:

- every MUST requirement has one owning module,
- Flow structural/reference edge semantics are accepted,
- persisted data model is accepted,
- storage/migration boundary is accepted,
- interaction state ownership is accepted,
- startup state machine is accepted,
- test strategy can verify the contracts,
- no feature requires a direct global/runtime patch to fit the design.
