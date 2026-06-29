# Development Setup

Cherry-ToDo is currently a static web app with no build step.

---

## Requirements

Minimum:

- a modern browser
- a local static file server
- Git, if you want to contribute through branches and pull requests

Optional:

- VS Code or another editor
- browser dev tools

---

## Run locally

Clone the repository:

```bash
git clone https://github.com/Fugu0141/Cherry-ToDo.git
cd Cherry-ToDo
```

Start a local static server:

```bash
python -m http.server 8000
```

Open:

```text
http://localhost:8000/
```

---

## Why use a local server?

Opening `index.html` directly may work, but a local server is closer to how the app runs on GitHub Pages.

It also avoids some browser restrictions around local files.

---

## Current script loading order

`index.html` loads scripts in this order:

```text
app.js
ux-fix.js
mobile.js
safety-fix.js
final-fix.js
date-target-fix.js
```

This order matters because some files patch behavior defined by earlier files.

Long-term, these fix layers should be merged into a cleaner module structure.

---

## Manual smoke test

After changing code, check at least:

1. The app opens without console errors.
2. A root task can be created.
3. A child task can be created from the `+` handle.
4. A task can be dragged.
5. A task can be moved to another date lane.
6. Dropping near a boundary opens the date change UI.
7. Done / todo toggle works.
8. Undo works.
9. Existing localStorage data still loads.
10. Mobile width does not completely break the UI.

---

## Compatibility notes

Some internal names may still reference the old prototype name.

For example, the current localStorage key is:

```text
quest-sticky-todo-v10
```

Do not rename storage keys without a migration path.

---

## Recommended branch names

Examples:

```text
fix/date-boundary-target
feat/list-view
refactor/schedule-model
docs/update-roadmap
```

---

## Commit message style

Use short, descriptive commit messages.

Examples:

```text
Update README for Cherry-ToDo
Add originality review document
Fix date boundary target calculation
Refactor task rendering helpers
```
