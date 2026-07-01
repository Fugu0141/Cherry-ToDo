# Codebase Structure

Cherry-ToDo is currently a static GitHub Pages app. The repository should stay easy to understand without requiring a build step.

## Top-level rule

Keep the repository root small.

The root should contain only files that are expected at the project entry level:

- `index.html`
- `README.md`
- `CONTRIBUTING.md`
- `CODE_OF_CONDUCT.md`
- `LICENSE`
- `.gitignore`
- `.github/`
- `docs/`
- `src/`

## Runtime files

Runtime files loaded by `index.html` live under `src/`.

```text
src/
├── css/
│   ├── style.css
│   ├── ux-fix.css
│   ├── safety-fix.css
│   ├── list-view.css
│   ├── mobile-ux.css
│   ├── mobile-modal-stabilize.css
│   ├── mobile-action-bar.css
│   ├── same-day-link-style.css
│   └── keyboard-avoid.css
└── js/
    ├── app.js
    ├── state-storage.js
    ├── schedule-model.js
    ├── date-target-fix.js
    ├── same-day-layout.js
    ├── list-view.js
    ├── mobile.js
    ├── mobile-ux.js
    ├── mobile-action-bar.js
    ├── ux-fix.js
    ├── safety-fix.js
    ├── final-fix.js
    ├── same-day-link-style.js
    ├── keyboard-avoid.js
    └── bootstrap.js
```

## Documentation files

Project documents live under `docs/`.

Use `docs/` for:

- feature specs
- UX specs
- architecture notes
- migration plans
- manual test checklists
- known issues
- roadmap notes

Do not add duplicate checklist or spec files to the repository root.

## Naming guidance

The current prototype still has several additive patch files such as `*-fix.js`. That is acceptable during migration, but new files should prefer names based on the responsibility of the file rather than the phase that introduced it.

Good examples:

- `state-storage.js`
- `schedule-model.js`
- `mobile-action-bar.js`
- `same-day-layout.js`

Avoid new names like:

- `final-fix-2.js`
- `new-fix.js`
- `temporary-patch.js`

## GitHub Pages compatibility

`index.html` stays in the repository root so the published GitHub Pages URL continues to work without a build step.

When moving a runtime file, update the matching `<link>` or `<script>` path in `index.html` in the same pull request.
