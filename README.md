# Cherry-ToDo

Cherry-ToDo is an open-source sticky note todo app for organizing tasks as flows, branches, and schedules.

Instead of treating tasks as a flat list, Cherry-ToDo lets you start from a root task and extend child tasks like branches. The board is for building and viewing the flow of work, while the future list view is intended for quickly checking what needs to be done today or soon.

> Current status: prototype / early OSS migration

## Demo

https://fugu0141.github.io/Cherry-ToDo/

## Concept

```text
Build the flow of tasks, then find what to do today.
```

Cherry-ToDo focuses on these ideas:

- Root tasks work like projects, tags, or big categories.
- Child tasks represent the actual things to do.
- Task relationships are shown as branches instead of only a list.
- Dates are useful, but they are not the main structure.
- Unscheduled tasks should be treated as `unscheduled`, not as `today`.
- The project is being prepared for open-source development.

## Features

Current prototype features:

- Sticky-note style task cards
- Root task creation
- Child task creation by dragging from the `+` handle
- Parent-child task links
- Date lanes
- Drag-and-drop task movement
- Date change modal when dropping on boundaries or blank areas
- Done / todo toggle
- Auto layout
- Undo
- Local save with `localStorage`

Planned or under discussion:

- Better schedule model: none / date / datetime
- List view for today's and upcoming tasks
- Same-day subflow layout
- Context popups instead of large modals
- Better mobile UI and touch interactions
- Codebase cleanup and module separation

## Usage

This is a static web app. For local use, open `index.html` in a browser.

For development, using a local static server is recommended:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000/
```

## Repository structure

```text
.
├── index.html                  # GitHub Pages entry point
├── src/
│   ├── css/                    # Stylesheets loaded by index.html
│   └── js/                     # Runtime JavaScript loaded by index.html
├── docs/                       # Specs, roadmap, architecture, and test notes
├── .github/                    # Issue and pull request templates
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
├── LICENSE
└── .gitignore
```

For the detailed placement rules, see [`docs/CODEBASE_STRUCTURE.md`](docs/CODEBASE_STRUCTURE.md).

## Documentation

Start here:

1. [`docs/PROJECT_SPEC.md`](docs/PROJECT_SPEC.md)
2. [`docs/PRODUCT_VISION.md`](docs/PRODUCT_VISION.md)
3. [`docs/TECHNICAL_ARCHITECTURE.md`](docs/TECHNICAL_ARCHITECTURE.md)
4. [`docs/CODEBASE_STRUCTURE.md`](docs/CODEBASE_STRUCTURE.md)
5. [`docs/ROADMAP.md`](docs/ROADMAP.md)
6. [`docs/DEVELOPMENT_SETUP.md`](docs/DEVELOPMENT_SETUP.md)
7. [`docs/MANUAL_TEST_CHECKLIST.md`](docs/MANUAL_TEST_CHECKLIST.md)
8. [`docs/KNOWN_ISSUES.md`](docs/KNOWN_ISSUES.md)
9. [`docs/DATE_TARGET_SPEC.md`](docs/DATE_TARGET_SPEC.md)
10. [`docs/LAYOUT_AND_SCHEDULE_SPEC.md`](docs/LAYOUT_AND_SCHEDULE_SPEC.md)
11. [`docs/UX_INTERACTION_SPEC.md`](docs/UX_INTERACTION_SPEC.md)
12. [`docs/MOBILE_UX_SPEC.md`](docs/MOBILE_UX_SPEC.md)
13. [`docs/MIGRATION_NOTES.md`](docs/MIGRATION_NOTES.md)
14. [`docs/ORIGINALITY_REVIEW.md`](docs/ORIGINALITY_REVIEW.md)

## Development notes

Cherry-ToDo was originally developed under `Fugu0141.github.io/ToDo` and was moved to this standalone repository for open-source development.

Some file names and internal compatibility keys may still contain older project names for migration compatibility. User-facing names and documentation should use `Cherry-ToDo`.

Before changing behavior, run through [`docs/MANUAL_TEST_CHECKLIST.md`](docs/MANUAL_TEST_CHECKLIST.md). Known prototype limitations are tracked in [`docs/KNOWN_ISSUES.md`](docs/KNOWN_ISSUES.md).

## Contributing

Contributions are welcome after the codebase and specifications become stable enough for collaboration.

Please read [`CONTRIBUTING.md`](CONTRIBUTING.md) before opening issues or pull requests.

## License

MIT License. See [`LICENSE`](LICENSE).
