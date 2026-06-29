# Migration Notes

Cherry-ToDo was originally developed inside the `ToDo/` directory of `Fugu0141.github.io`.

This document records the migration to the standalone `Fugu0141/Cherry-ToDo` repository.

---

## Why the project was moved

The app was moved to a separate repository because:

- the old repository was mainly a personal website
- the app needs its own issues and pull requests
- contributors should not need access to unrelated personal site files
- the project needs its own documentation, license, and contribution rules
- GitHub Pages deployment should be managed independently

---

## Migration summary

Initial migration:

- app source files were copied from `Fugu0141.github.io/ToDo`
- existing prototype documentation was imported
- the standalone project name became `Cherry-ToDo`
- MIT License was added

Follow-up cleanup:

- README was rewritten for Cherry-ToDo
- visible app title/header were updated
- documentation was moved into `docs/`
- contribution and code of conduct files were added
- originality review notes were added

---

## Name compatibility

User-facing project name:

```text
Cherry-ToDo
```

Old prototype name may still appear in:

- commit history
- old screenshots
- compatibility notes
- internal localStorage keys
- comments describing migration history

Internal compatibility names should not be changed unless a migration plan exists.

---

## Storage compatibility

Current localStorage key:

```text
quest-sticky-todo-v10
```

This key should remain until a proper migration is implemented.

A future migration could:

1. read from the old key
2. convert task data if necessary
3. write to a new Cherry-ToDo key
4. preserve or backup the old data
5. avoid data loss if migration fails

---

## Old URL handling

The old app URL may be replaced by a simple redirect or migration notice later.

Possible notice:

```text
Cherry-ToDo has moved to a standalone repository.
Please use the new GitHub Pages URL.
```

---

## Migration checklist

- [x] Create standalone repository.
- [x] Import current app files.
- [x] Add MIT License.
- [x] Update README.
- [x] Update visible app branding.
- [x] Move specifications into `docs/`.
- [x] Add contribution guide.
- [x] Add code of conduct.
- [x] Add originality review.
- [ ] Confirm GitHub Pages URL.
- [ ] Add migration notice to the old `Fugu0141.github.io/ToDo` page if needed.
- [ ] Create initial issues for next development tasks.
