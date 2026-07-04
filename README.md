# Cherry

[English](./README.md) | [日本語](./README_ja.md)

Cherry is an open-source task flow todo app for organizing task blocks as flows, branches, and schedules.

Instead of treating tasks as a flat list, Cherry lets you start from a root task and extend child tasks like branches. The board is for building and viewing the flow of work, while the future list view is intended for quickly checking what needs to be done today or soon.

> Current status: prototype / early OSS migration
>
> Repository name: `Cherry-ToDo`

## Demo

https://fugu0141.github.io/Cherry-ToDo/

## Concept

```text
Build the flow of tasks, then find what to do today.
```

Cherry focuses on these ideas:

- Root tasks work like projects, tags, or big categories.
- Child tasks represent the actual things to do.
- Task relationships are shown as branches instead of only a list.
- Dates are useful, but they are not the main structure.
- Unscheduled tasks should be treated as `unscheduled`, not as `today`.
- The project is being prepared for open-source development.

## Features

Current prototype features:

- Task block cards
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
- First-run welcome / OSS introduction window

Planned or under discussion:

- Better schedule model: none / date / datetime
- List view for today's and upcoming tasks
- Same-day subflow layout
- Context popups instead of large modals
- Better mobile UI and touch interactions
- Donation / support entry point
- Release notes entry point
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
├── index.html
├── style.css
├── app.js
├── ux-fix.css
├── ux-fix.js
├── mobile.js
├── safety-fix.css
├── safety-fix.js
├── final-fix.js
├── date-only-utils.js
├── date-target-fix.js
├── state-storage.js
├── mobile-flow-map.css
├── mobile-flow-map.js
├── welcome-splash.css
├── welcome-splash.js
├── docs/
│   ├── PROJECT_SPEC.md
│   ├── PRODUCT_VISION.md
│   ├── TECHNICAL_ARCHITECTURE.md
│   ├── DATE_TARGET_SPEC.md
│   ├── LAYOUT_AND_SCHEDULE_SPEC.md
│   ├── UX_INTERACTION_SPEC.md
│   ├── MOBILE_UX_SPEC.md
│   ├── WELCOME_SPLASH_SPEC.md
│   ├── ROADMAP.md
│   ├── DEVELOPMENT_SETUP.md
│   ├── MANUAL_TEST_CHECKLIST.md
│   ├── KNOWN_ISSUES.md
│   ├── MIGRATION_NOTES.md
│   └── ORIGINALITY_REVIEW.md
├── .github/
│   ├── ISSUE_TEMPLATE/
│   └── PULL_REQUEST_TEMPLATE.md
├── README.md
├── README_ja.md
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
├── .gitignore
└── LICENSE
```

## Documentation

Start here:

1. [`docs/PROJECT_SPEC.md`](docs/PROJECT_SPEC.md)
2. [`docs/PRODUCT_VISION.md`](docs/PRODUCT_VISION.md)
3. [`docs/TECHNICAL_ARCHITECTURE.md`](docs/TECHNICAL_ARCHITECTURE.md)
4. [`docs/ROADMAP.md`](docs/ROADMAP.md)
5. [`docs/DEVELOPMENT_SETUP.md`](docs/DEVELOPMENT_SETUP.md)
6. [`docs/MANUAL_TEST_CHECKLIST.md`](docs/MANUAL_TEST_CHECKLIST.md)
7. [`docs/KNOWN_ISSUES.md`](docs/KNOWN_ISSUES.md)
8. [`docs/DATE_TARGET_SPEC.md`](docs/DATE_TARGET_SPEC.md)
9. [`docs/LAYOUT_AND_SCHEDULE_SPEC.md`](docs/LAYOUT_AND_SCHEDULE_SPEC.md)
10. [`docs/UX_INTERACTION_SPEC.md`](docs/UX_INTERACTION_SPEC.md)
11. [`docs/MOBILE_UX_SPEC.md`](docs/MOBILE_UX_SPEC.md)
12. [`docs/WELCOME_SPLASH_SPEC.md`](docs/WELCOME_SPLASH_SPEC.md)
13. [`docs/MIGRATION_NOTES.md`](docs/MIGRATION_NOTES.md)
14. [`docs/ORIGINALITY_REVIEW.md`](docs/ORIGINALITY_REVIEW.md)

## Development notes

Cherry was originally developed under `Fugu0141.github.io/ToDo` and was moved to this standalone repository for open-source development.

Some file names, URLs, repository names, and internal compatibility keys may still contain `Cherry-ToDo` or older project names for migration compatibility. User-facing app names and documentation should use `Cherry`.

Before changing behavior, run through [`docs/MANUAL_TEST_CHECKLIST.md`](docs/MANUAL_TEST_CHECKLIST.md). Known prototype limitations are tracked in [`docs/KNOWN_ISSUES.md`](docs/KNOWN_ISSUES.md).

## Contributing

Contributions are welcome after the codebase and specifications become stable enough for collaboration.

Please read [`CONTRIBUTING.md`](CONTRIBUTING.md) before opening issues or pull requests.

## License

MIT License. See [`LICENSE`](LICENSE).
