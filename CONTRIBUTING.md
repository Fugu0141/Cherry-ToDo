# Contributing to Cherry

Thank you for your interest in Cherry.

Cherry is still an early prototype, so contribution rules are intentionally simple for now.

---

## Project direction

Cherry is a task flow todo app for organizing task blocks as flows, branches, and schedules.

Before contributing, please read:

1. `README.md`
2. `docs/PROJECT_SPEC.md`
3. `docs/PRODUCT_VISION.md`
4. `docs/TECHNICAL_ARCHITECTURE.md`
5. `docs/ORIGINALITY_REVIEW.md`

---

## Good first contribution areas

Good early contribution areas include:

- fixing small UI bugs
- improving documentation
- testing mobile behavior
- simplifying confusing code
- writing small issues with clear reproduction steps
- proposing UX improvements with screenshots or sketches

Please avoid large rewrites until the module structure is clearer.

---

## Before opening a pull request

Please check:

- The app still opens from `index.html`.
- Existing task creation still works.
- Dragging tasks still works.
- Date lane behavior still works.
- No user-facing text accidentally refers to old project names.
- The change does not copy UI, wording, or assets from another product.

---

## Pull request style

Small pull requests are preferred.

A good PR should include:

- what changed
- why it changed
- how to test it
- screenshots or short videos for UI changes

Example:

```text
Summary:
Fix date modal default when dropping on boundary

Test:
1. Create two tasks on different dates.
2. Drag one task to the boundary between lanes.
3. Confirm that the date modal opens with the expected target date.
```

---

## Issues

When opening an issue, please include:

- what happened
- what you expected
- browser / device information
- steps to reproduce
- screenshot or video if useful

---

## Design and originality

Cherry may take inspiration from general task-flow concepts, but it must not clone another product.

Do not contribute:

- copied UI from another app
- copied text or marketing copy
- copied icons or illustrations
- copied code without a compatible license

See `docs/ORIGINALITY_REVIEW.md`.

---

## License

By contributing, you agree that your contribution will be licensed under the MIT License used by this repository.
