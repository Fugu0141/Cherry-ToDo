# Cherry

[English](./README.md) | [日本語](./README_ja.md)

Cherry is an open-source task-flow planning app for organizing work as connected goals, actions, branches, and schedules.

Instead of starting from a flat list or calendar, Cherry lets you begin with a goal, break it into actions, and connect those actions into a visible flow. The board is for building and understanding that flow. The list view is for finding work that needs attention now or soon.

> Current status: v0.1 public-prototype baseline / v0.2 foundation development
>
> Repository name: `Cherry-ToDo`

## Demo

https://fugu0141.github.io/Cherry-ToDo/

## Product direction

```text
Build the flow of work first.
Add dates and other guidance only when they help.
```

Cherry follows these rules:

- Task relationships are the primary structure; schedules are a separate layer.
- A goal provides context, while action tasks represent executable work.
- Board coordinates must not silently become priority, date, or flow order.
- Hiding date lanes must not remove dates, and showing them must not assign dates.
- Undated work means undated, not today.
- Mobile interactions are designed separately rather than treated as a smaller desktop board.
- Local data must remain user-controlled and exportable.

The canonical product and architecture requirements are in [`docs/REQUIREMENTS.md`](docs/REQUIREMENTS.md).

## Current prototype features

- Goal/task creation and child-task creation from the `+` handle
- Same-flow continuation and branch creation
- Parent-child flow links and relationship-aware layout
- Desktop connection of two existing tasks by handle drag
- Date lanes and explicit date changes by drag-and-drop
- Board and execution-list views over the same task data
- Todo/done switching, editing, deletion, and undo
- Automatic and vertical layout commands
- Start page and multiple workspace tabs
- Tab open, rename, duplicate, delete, and inline new-tab controls
- Explicit startup routing so Start, workspace, and first-run storage choice are selected before the final surface is revealed
- Startup loading and recovery states that keep incomplete app surfaces hidden until the selected route is ready
- First-run choice between persistent browser storage and an ephemeral in-memory session
- Safe restoration of the last Start/workspace route, active tab, and board/list view when saved references remain valid
- Japanese and English UI
- First-run introduction and interactive tutorial
- Light, dark, and system themes
- Compatibility support for older local storage keys and persisted prototype data
- Encrypted `.cherry` workspace import/export
- Basic iCalendar VTODO (`.ics`) import/export
- Mobile vertical board layout, selected-task action dock, bottom-sheet dialogs, and Flow Map/minimap
- Desktop drag-edge scrolling while connecting or moving tasks

## Planned foundation work

The next implementation phases are intentionally foundation-first:

- Native ES-module boundaries for state, storage, commands, events, and views
- A normalized `none` / `date` / `datetime` schedule model
- Independent date-lane, auto-layout, and time-guide settings
- Explicit structural flow order and edge serialization
- A dedicated mobile connection interaction
- Desktop inline editing and clearer contextual actions
- Stable import/export adapters after the semantic schema is settled
- Reference connectors, text, and drawing annotations after the structural edge foundation

The required order and scope boundaries are defined in [`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md).

## Running locally

Cherry is a build-free static web app. A local static server is recommended because some browser features and file operations are more reliable in a normal HTTP context than when opening `index.html` directly.

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000/
```

Basic use does not require an account or network connection. On first use, Cherry lets you choose whether to keep work in persistent browser storage or use an ephemeral session. Ephemeral-session data is kept in memory and is not intended to survive closing or reloading the page. Use an encrypted `.cherry` export for a portable backup; the export passphrase cannot be recovered if lost.

## Repository structure

The current prototype still contains legacy scripts and focused compatibility layers. This list highlights the main entry points rather than every file.

```text
.
├── index.html                    # static application shell
├── startup-state.js              # chooses the initial startup route and controls the startup boundary
├── startup-shell.css             # startup/loading/recovery presentation
├── storage-adapter.js            # persistent-local and in-memory storage policy boundary
├── session-context.js            # Start/workspace, active-tab, and active-view restoration metadata
├── workspace-startup-guard.js    # final workspace readiness hand-off
├── app.js                        # current legacy application core
├── state-storage.js              # legacy-compatible task-state persistence bridge
├── schedule-model.js             # schedule normalization helpers
├── list-view.js                  # execution-list view
├── tab-manager.js                # Start page, workspace tabs, import/export
├── connect-existing-tasks.js     # desktop existing-task connection flow
├── mobile-*.js / mobile-*.css    # mobile-specific interactions and presentation
├── release-prep-loader.js        # loads current release UI modules and compatibility layers
├── docs/
│   ├── README.md                 # documentation map
│   ├── REQUIREMENTS.md           # canonical product and architecture rules
│   ├── IMPLEMENTATION_PLAN.md    # canonical implementation order
│   ├── RELEASE_NOTES.md          # v0.1 release notes
│   ├── DEVELOPMENT_SETUP.md
│   ├── MANUAL_TEST_CHECKLIST.md
│   ├── KNOWN_ISSUES.md
│   └── archive/                  # superseded planning documents
├── .github/
├── README.md
├── README_ja.md
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
└── LICENSE
```

## Documentation

Start here:

1. [`docs/README.md`](docs/README.md) — documentation map and source-of-truth rules
2. [`docs/REQUIREMENTS.md`](docs/REQUIREMENTS.md) — product and target architecture
3. [`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md) — ordered development phases
4. [`docs/RELEASE_NOTES.md`](docs/RELEASE_NOTES.md) — v0.1 release scope
5. [`docs/DEVELOPMENT_SETUP.md`](docs/DEVELOPMENT_SETUP.md) — local setup
6. [`docs/MANUAL_TEST_CHECKLIST.md`](docs/MANUAL_TEST_CHECKLIST.md) — required browser checks
7. [`docs/KNOWN_ISSUES.md`](docs/KNOWN_ISSUES.md) — current prototype limitations

Detailed interaction, layout, schedule, mobile, migration, and architecture notes remain supporting documents. When a supporting document conflicts with `docs/REQUIREMENTS.md`, the requirements document wins unless an explicit architecture decision updates it.

## Development notes

Cherry was originally developed under `Fugu0141.github.io/ToDo` and was moved to this standalone repository for open-source development.

Some file names, URLs, repository names, storage keys, and compatibility code may still contain `Cherry-ToDo` or older names. User-facing app text and current documentation should use `Cherry`.

The prototype currently depends on script order and compatibility layers. New work must not add another broad runtime override. Follow the implementation plan and extract one coherent responsibility at a time.

Before changing behavior, review [`docs/MANUAL_TEST_CHECKLIST.md`](docs/MANUAL_TEST_CHECKLIST.md). Known limitations are tracked in [`docs/KNOWN_ISSUES.md`](docs/KNOWN_ISSUES.md).

## Contributing

Contributions, bug reports, and product feedback are welcome. Please read [`CONTRIBUTING.md`](CONTRIBUTING.md) before opening an issue or pull request.

## License

MIT License. See [`LICENSE`](LICENSE).
