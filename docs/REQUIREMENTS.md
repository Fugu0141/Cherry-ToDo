# Cherry Requirements and Target Architecture

Status: **Canonical requirements document**  
Last reviewed: **2026-07-10**  
Applies to: Cherry v0.2 series and the architecture prepared for later releases

This document is the primary source of truth for what Cherry is, which product rules must not drift, and what technical structure the project should move toward.

Detailed feature notes may exist in other documents and GitHub issues. When they conflict with this document, this document wins unless an explicit architecture decision updates it.

Normative wording:

- **MUST**: required for correctness or product identity.
- **SHOULD**: expected unless a documented reason justifies another choice.
- **MAY**: optional.

---

## 1. Product definition

Cherry is an open-source task-flow planning tool.

Its central idea is:

```text
Build the flow of work first.
Add dates and other guidance only when they help.
```

Japanese product statement:

```text
やることの流れを作って、今日やることを見失わないToDoアプリ
```

Cherry is not primarily a calendar, Gantt chart, whiteboard, or flat todo list. It can borrow useful ideas from those tools, but task relationships remain the center of the product.

### 1.1 Main user problem

Users often know that they need to accomplish a larger goal, but do not yet know the exact sequence, branches, dates, or details.

Cherry MUST help users move naturally through this process:

```text
Vague goal
→ break it into tasks
→ connect tasks into a flow
→ revise the order or branches
→ add dates only where useful
→ find the next executable work
```

### 1.2 Screen responsibilities

```text
Board view = build, revise, and understand task flow
List view  = execute tasks and check what needs attention
Start view = enter or restore a workspace without visual overload
```

These views MUST share the same semantic task data. A view must not invent a separate interpretation of the user's work.

---

## 2. Product principles

### PRD-001: Flow first, schedule second

Task relationships are the primary structure. Schedule information is an independent layer.

The application MUST NOT infer a task's date, time, priority, or semantic order only from its board coordinates.

### PRD-002: User intent wins

Cherry MUST NOT silently rewrite semantic data because a visual setting changed.

Examples:

- Hiding date lanes MUST NOT remove dates.
- Showing date lanes MUST NOT assign dates to undated tasks.
- Moving a card freely MUST NOT change schedule or flow order unless the interaction explicitly says it will.
- Reordering a flow MUST NOT change dates.

### PRD-003: Progressive disclosure

The most important current action SHOULD be visually strongest. Advanced, destructive, or low-frequency actions SHOULD appear only when needed.

For a new user, the first useful action is normally:

```text
Create a goal/task and begin a flow.
```

Import, export, encryption explanations, deletion, debugging controls, and project/community links MUST NOT compete with that first action.

### PRD-004: Direct manipulation with predictable consequences

Users SHOULD be able to manipulate cards and connections near the objects they are editing.

Before committing a structural change, Cherry SHOULD preview what will happen. Undo MUST restore semantic changes such as create, delete, reconnect, reorder, and annotation edits.

### PRD-005: Mobile is a separate interaction design

Mobile MUST NOT be treated as a smaller desktop board.

Desktop and mobile MAY expose the same capability through different interactions:

- Desktop: pointer drag, anchored popover, keyboard shortcuts.
- Mobile: selected-task actions, bottom sheets, explicit handles, touch-safe movement.

### PRD-006: Clarity over visual decoration

Cherry may use branch/cherry metaphors, color, arrows, and annotations, but they MUST support understanding rather than create noise.

### PRD-007: Local-first and user-controlled

Cherry MUST remain usable without an account or network connection.

Local persistence, native `.cherry` files, and future synchronization MUST be designed so users can recover or export their work.

### PRD-008: Contributor-friendly internals

Core behavior MUST be understandable through named modules and stable contracts. New features MUST NOT depend on undocumented global-variable replacement or script-order monkey patching.

---

## 3. Non-goals

The following are not current goals:

- Rebuilding every feature of Miro, Notion, Trello, or a calendar application.
- Requiring an account for basic use.
- Real-time multi-user collaboration in the v0.2 series.
- Making all task relationships cyclic by default.
- Using board position as hidden priority, list order, date, or time.
- Loading arbitrary third-party JavaScript plugins before the extension API and security model are stable.
- A large framework rewrite merely for fashion or code style.

---

## 4. Domain model

Cherry MUST separate semantic work data from visual presentation data.

### 4.1 Workspace

A workspace is the full user-controlled unit that can be saved, exported, restored, and eventually synchronized.

Target shape:

```js
Workspace = {
  schemaVersion: number,
  id: string,
  name: string,
  tabs: Tab[],
  activeTabId: string | null,
  createdAt: string,
  updatedAt: string,
  revision: number
}
```

Requirements:

- IDs MUST remain stable across reload and native export/import.
- `schemaVersion` MUST select an explicit migration pipeline.
- A failed migration/import MUST NOT overwrite the last readable workspace.
- Future sync metadata MAY be added without making network use mandatory.

### 4.2 Tab

A tab is an independent planning surface inside a workspace.

```js
Tab = {
  id: string,
  name: string,
  tasks: Record<string, Task>,
  edges: Record<string, Edge>,
  annotations: Record<string, Annotation>,
  board: BoardState,
  viewState: ViewState,
  createdAt: string,
  updatedAt: string
}
```

Each tab SHOULD preserve its own board settings and positions.

### 4.3 Task

A task is a semantic work item. Board coordinates are not part of its meaning.

```js
Task = {
  id: string,
  role: "goal" | "action",
  title: string,
  notes: string,
  status: "todo" | "done",
  schedule: Schedule,
  appearance: {
    importance: "none" | "low" | "medium" | "high" | "urgent"
  },
  createdAt: string,
  updatedAt: string
}
```

Rules:

- A `goal` provides context and anchors a flow.
- An `action` is executable work.
- Existing top-level/root cards SHOULD migrate to `role: "goal"` where that matches current semantics.
- User-facing wording SHOULD avoid internal graph terms such as “root task”.
- Existing data without `role`, `notes`, `appearance`, or timestamps MUST remain readable through defaults.

### 4.4 Schedule

```js
Schedule =
  | { type: "none", date: null, time: null }
  | { type: "date", date: "YYYY-MM-DD", time: null }
  | { type: "datetime", date: "YYYY-MM-DD", time: "HH:mm" }
```

Rules:

- `none` means undated, not today.
- A time MUST NOT exist without a date.
- Date-only values MUST remain timezone-neutral `YYYY-MM-DD` strings.
- Moving a `datetime` task to a different date SHOULD keep its time unless the user explicitly changes it.
- Migration MUST NOT use today as a fallback for missing persisted dates.

### 4.5 Edges and flow semantics

The current `parentId` and `branchMode` model combines hierarchy, connection, and order. That is sufficient for the prototype but not for explicit reordering, extra links, or safe cycles.

Target edge model:

```js
Edge = {
  id: string,
  fromTaskId: string,
  toTaskId: string,
  kind: "sequence" | "branch" | "reference",
  order: number,
  createdAt: string
}
```

Rules:

- `sequence` and `branch` are **structural edges**.
- Structural edges define primary flow order, goal grouping, list-flow order, and auto-layout input.
- Structural edges MUST form a directed acyclic forest in the first stable implementation.
- An action SHOULD have no more than one incoming structural edge.
- `order` MUST be explicit. Date, title, and board coordinates MUST NOT silently become flow order.
- `reference` edges are additional visual/semantic relationships.
- Reference edges MAY form cycles and loops.
- Reference edges MUST NOT be used by tree traversal, goal grouping, or automatic structural layout unless a specific algorithm explicitly supports them.

This separation allows loop connectors without breaking the primary executable flow.

### 4.6 Board state

```js
BoardState = {
  settings: {
    showDateLanes: boolean,
    autoLayout: boolean,
    timeGuide: "auto" | "shown" | "hidden"
  },
  positions: Record<string, { x: number, y: number }>,
  viewport: { x: number, y: number, zoom: number }
}
```

Rules:

- Board position is presentation state.
- `showDateLanes` is a view preference and MUST NOT rewrite schedule data.
- With `autoLayout: false`, stored positions are authoritative.
- With `autoLayout: true`, Cherry MAY compute positions from structural flow and schedule data.
- Turning auto layout back on SHOULD require an explicit relayout command or an clearly communicated result.
- Undated tasks MUST remain undated in every board setting combination.

### 4.7 View state

```js
ViewState = {
  mode: "board" | "list",
  listFilters: {},
  selectedTaskId: string | null
}
```

Semantic data MUST survive changing views. Temporary selections MAY be session-only.

### 4.8 Annotations

Annotations are not tasks.

```js
Annotation =
  | { id, type: "text", text, x, y, width, height, ... }
  | { id, type: "stroke", points, width, ... }
```

Rules:

- Annotations MUST NOT appear in the task list.
- Annotation create/edit/delete MUST participate in undo/history.
- Native `.cherry` export/import MUST preserve annotations once introduced.
- Canvas tools SHOULD remain hidden when unused.

---

## 5. Functional requirements

### FR-START-001: Explicit startup state

Startup MUST use an explicit state machine such as:

```text
booting
→ storage decision/consent when required
→ restore previous workspace OR show start screen
→ mount the selected application view
```

The board MUST NOT render first and then receive the start screen as a late overlay.

### FR-START-002: Context restoration

When a valid active workspace and tab can be restored, reload SHOULD return to that context.

If restoration is invalid or unsafe, Cherry MUST fall back to the start screen without corrupting data.

### FR-STORAGE-001: Storage abstraction

Core code MUST depend on a storage interface rather than call `localStorage` throughout feature code.

Minimum adapter contract:

```js
StorageAdapter = {
  loadWorkspace(): Promise<Workspace | null>,
  saveWorkspace(workspace): Promise<void>,
  clearWorkspace(): Promise<void>,
  isAvailable(): boolean
}
```

The first adapters SHOULD be:

- in-memory/session adapter
- local browser storage adapter

Future file or sync adapters MAY implement the same boundary.

### FR-STORAGE-002: Transparent local persistence

Cherry MUST clearly explain when browser persistence is used and provide user control over saved local data.

If persistence is not enabled or available, Cherry MUST still support an ephemeral session mode.

The exact consent requirement is a product/privacy policy decision and SHOULD be reviewed separately from unsupported legal claims.

### FR-BOARD-001: Composable settings

Date lanes, auto layout, and time guidance MUST be independent settings rather than separate incompatible workspace types.

Supported combinations include:

```text
Date lanes shown  + auto layout on
Date lanes shown  + auto layout off
Date lanes hidden + auto layout on
Date lanes hidden + auto layout off (freehand board)
```

### FR-BOARD-002: Date lanes as a helper layer

Date lanes MUST reflect schedule data but MUST NOT own it.

Dropping into a date lane MAY explicitly assign/change a date. Moving outside date lanes MUST be visual-only unless the interaction clearly represents a schedule change.

### FR-FLOW-001: Explicit reordering

Users MUST eventually be able to change a structural sequence such as:

```text
A → B → C
```

to:

```text
A → C → B
```

This action changes structural edges/order, not only coordinates.

### FR-FLOW-002: Existing-task connection

Connecting existing tasks MUST use core commands and edge validation.

Desktop and mobile MAY use different interaction surfaces. Mobile connection MUST NOT reuse a gesture needed for normal card movement.

### FR-FLOW-003: Directional connectors

Connections SHOULD visually communicate direction. The renderer MUST distinguish structural and reference edges without relying only on color.

### FR-LIST-001: Execution-focused list

The list view MUST consume semantic task, schedule, goal grouping, and structural flow-order data.

A recommended ordering is:

```text
schedule date
→ time
→ structural flow order
→ creation order/title fallback
```

Board coordinates MUST NOT determine list order.

### FR-MOBILE-001: Clear primary action

The mobile start screen MUST make the first meaningful action obvious. Secondary actions MUST use progressive disclosure.

### FR-MOBILE-002: Gesture ownership

A single gesture controller SHOULD own each active pointer/touch operation.

Scrolling, card movement, edge auto-scroll, connection creation, and annotation drawing MUST NOT install competing pointer handlers for the same session.

### FR-MOBILE-003: Touch-safe controls

Primary mobile controls MUST be reachable, readable, and large enough to use without zooming. Destructive actions SHOULD live behind a secondary action/menu.

### FR-IMPORT-001: Native format

`.cherry` is the full-fidelity native workspace format.

It MUST preserve all supported semantic and presentation data and MUST include a schema version.

### FR-IMPORT-002: Import transaction safety

External import MUST parse and validate into a temporary candidate before changing the current workspace.

On failure, the current workspace MUST remain unchanged.

### FR-IMPORT-003: Format adapters

ICS and CSV support SHOULD be implemented as importer/exporter adapters rather than embedded inside tab UI code.

External import SHOULD create a new tab by default unless the user explicitly chooses another destination.

### FR-SYNC-001: Future-compatible identity

Workspace, tab, task, edge, and annotation IDs MUST be stable enough for future synchronization.

Sync is not required for v0.2.0, but v0.2 data migrations MUST NOT make future revision/conflict metadata impossible.

---

## 6. Target software architecture

### 6.1 Architectural rule

Core owns state and invariants. Features request changes through commands. Views observe state through selectors/events.

```text
UI / built-in feature / future plugin
              ↓ command
        Application core
              ↓ validates
        Domain state store
              ↓ event/snapshot
          Views and services
```

No feature should need to replace a global function to participate.

### 6.2 Core responsibilities

The core MUST own:

- schema validation and migration
- workspace/tab/task/edge invariants
- commands and undo transactions
- event publication
- storage orchestration
- extension registration
- startup state

The core MUST NOT own detailed board rendering, list markup, importer-specific parsing, or mobile presentation.

### 6.3 Commands

All semantic mutations SHOULD be named commands, for example:

```text
workspace.create
workspace.restore
workspace.setActiveTab
task.create
task.update
task.delete
flow.connect
flow.disconnect
flow.reorder
schedule.set
board.moveTask
board.setSettings
annotation.create
annotation.update
annotation.delete
```

A command transaction SHOULD contain:

- input validation
- before snapshot or inverse operation
- state mutation
- emitted events
- persistence scheduling

### 6.4 Events

The event API SHOULD expose stable domain events, not internal rendering calls.

Examples:

```text
workspace:loaded
workspace:changed
tab:changed
task:created
task:updated
task:deleted
flow:changed
board:settings-changed
view:changed
storage:status-changed
```

Event handlers MUST be removable and SHOULD NOT depend on script load order.

### 6.5 Selectors

Views SHOULD read state through selectors such as:

```text
getActiveTab()
getTask(id)
getStructuralChildren(id)
getGoalForTask(id)
getTasksForDate(date)
getUndatedTasks()
getOrderedFlow(rootId)
```

This prevents each view from inventing its own traversal and sorting rules.

### 6.6 Extension host

Cherry SHOULD first implement an internal extension host used by built-in features.

```js
Cherry = {
  apiVersion: 1,
  commands,
  events,
  selectors,
  views,
  toolbar,
  importers,
  exporters,
  boardTools,
  plugins
}
```

Minimum registries:

- view registry
- command/action registry
- toolbar/context-action registry
- importer/exporter registry
- board-tool registry
- renderer/decorator registry where necessary

### 6.7 Plugin lifecycle

```js
Plugin = {
  id: string,
  version: string,
  apiVersion: number,
  activate(context): void | Promise<void>,
  deactivate?(): void | Promise<void>
}
```

Rules:

- IDs MUST be unique.
- API compatibility MUST be checked before activation.
- Registration MUST return a disposable/unregister function.
- Built-in features SHOULD use the same public contracts planned for extensions.
- Arbitrary remote plugins are deferred until permissions, isolation, and trust are designed.

### 6.8 Prohibited coupling

New architecture code MUST NOT rely on:

- assigning over another module's function (`render = ...`)
- accessing mutable global `state` directly from features
- undocumented `window.*` variables
- DOM selectors as the only integration contract
- a theme file loading unrelated application subsystems
- script load order as an implicit dependency resolver

Temporary compatibility bridges MAY exist during migration, but they MUST be named, documented, tested, and have a removal phase.

### 6.9 Module system

Cherry SHOULD adopt native browser ES modules before considering a bundler.

This preserves static GitHub Pages deployment while providing explicit `import`/`export` boundaries.

A bundler or framework MAY be introduced later only when it solves a documented requirement.

### 6.10 Target directory structure

```text
src/
  app/
    bootstrap.js
    startup-state.js
    app-shell.js
  core/
    store.js
    commands.js
    events.js
    history.js
    plugin-registry.js
  domain/
    workspace.js
    task.js
    edge.js
    schedule.js
    board-settings.js
    selectors.js
  services/
    storage/
      storage-adapter.js
      memory-storage.js
      local-storage.js
      migrations.js
    interchange/
      cherry-format.js
      ics-importer.js
      csv-importer.js
      csv-exporter.js
  views/
    start/
    board/
    list/
  interactions/
    desktop/
    mobile/
  plugins/
    builtin/
      board-view/
      list-view/
      workspace-tabs/
      import-export/
      annotations/
  styles/
  test/
```

Migration to this structure MUST be incremental. No single PR should move every responsibility at once.

---

## 7. Migration requirements

### MIG-001: Preserve existing data

Current `quest-sticky-todo-v10` and compatible legacy data MUST remain readable until a separately reviewed storage-key migration exists.

### MIG-002: Pure versioned migrations

Migrations SHOULD be pure and idempotent:

```js
migrate(input) -> normalizedWorkspace
```

They MUST NOT render UI or write storage while transforming data.

### MIG-003: Safe targetAt transition

When a valid `schedule` exists, it is authoritative. Legacy `targetAt` MAY be dual-written during transition, but new feature code SHOULD stop reading it directly.

### MIG-004: Parent/branch transition

The explicit edge model SHOULD be introduced in stages:

1. Add selectors/helpers around existing `parentId`/`branchMode`.
2. Add explicit structural order without visual behavior changes.
3. Introduce serialized edges with migration from existing parent links.
4. Move all traversal/layout/list logic to edge selectors.
5. Add reference/cyclic edges only after structural traversal is safe.

### MIG-005: No broad patch replacement

Feature work during migration MUST use narrow adapters or new modules. Adding another broad `*-fix.js` runtime override is not an acceptable long-term solution.

---

## 8. Quality requirements

### QUAL-001: Automated coverage for pure logic

The project SHOULD add automated tests for:

- schedule normalization
- workspace migrations
- edge validation and cycle rules
- flow reordering
- selectors and list ordering
- import validation

Pure domain tests SHOULD not require a browser DOM.

### QUAL-002: Browser smoke coverage

Critical flows SHOULD have browser-level smoke tests:

- startup route decision
- local persistence/ephemeral mode
- restore active tab
- create/edit/delete/undo
- connect/reorder
- date-lane behavior
- mobile drag/scroll ownership
- native export/import round trip

### QUAL-003: Performance

The start view SHOULD be the first clean paint when no workspace is restored. Board layout MUST NOT run before the board is needed.

Large tabs SHOULD avoid unnecessary full rerenders during pointer movement.

### QUAL-004: Accessibility

Important actions MUST be keyboard reachable on desktop and have accessible names. Color MUST NOT be the only carrier of importance, state, or edge type.

### QUAL-005: Error containment

A failed plugin, importer, optional view, or persistence adapter SHOULD NOT destroy the current in-memory workspace.

---

## 9. Documentation and decision rules

- `PRODUCT_VISION.md` explains why Cherry exists.
- This document defines canonical product and target architecture requirements.
- `IMPLEMENTATION_PLAN.md` defines sequence, dependencies, and issue mapping.
- Feature specs explain detailed interactions within these boundaries.
- GitHub issues track concrete problems and acceptance criteria.
- Architecture decisions that change this document SHOULD be recorded in a future `docs/adr/` directory.

A feature is not approved merely because it is technically possible. It must fit the product principles and preserve data/interaction invariants.

---

## 10. Definition of done

A feature or refactor is done only when:

- its behavior matches the relevant requirement and issue acceptance criteria
- semantic data changes occur through a named command or documented compatibility bridge
- existing workspace data still loads
- native `.cherry` compatibility is preserved or migrated explicitly
- undo/history behavior is defined
- desktop and mobile impact is considered
- failure behavior is safe
- tests or a documented manual test case cover the change
- canonical documents are updated when the design changes
- no unexplained runtime patch layer is added
