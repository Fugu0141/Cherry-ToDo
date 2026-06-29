# Known Issues

This document tracks known limitations in the current Cherry-ToDo prototype.

These are not all bugs. Some are intentional prototype tradeoffs that should be improved before the app becomes easier for contributors to extend.

---

## Current limitations

### Schedule data is still date-string based

Current tasks use `targetAt` as a date string. The roadmap calls for replacing this with a clearer schedule model:

```js
schedule: {
  type: "none" | "date" | "datetime",
  date: string | null,
  time: string | null
}
```

Impact:

- Unscheduled tasks cannot be represented properly yet.
- Date-only and datetime tasks are not separated.
- Some logic treats missing dates as today.

Planned direction:

- Design a safe migration from `targetAt`.
- Keep old data readable.
- Avoid silently changing unscheduled tasks into today's tasks.

---

### Fix-layer scripts make behavior harder to reason about

The current app loads several scripts after `app.js` to patch or extend behavior.

Impact:

- Behavior depends on script order.
- Contributors have to inspect multiple files to understand one interaction.
- Refactoring is harder because logic is spread across patch layers.

Planned direction:

- Move storage, layout, rendering, and interaction logic into explicit modules.
- Keep compatibility and migration logic documented.

---

### Same-day layout is still basic

Tasks with the same date are currently separated mostly by track layout.

Impact:

- A date with many tasks can grow vertically or horizontally too much.
- Same-day child flows are not visually grouped as strongly as planned.
- The board can feel list-like inside one date instead of becoming a small same-day work area.

Planned direction:

- Add a same-day subflow layout.
- Preserve parent-child readability inside one date.
- Reduce unnecessary board growth.

---

### Mobile interactions need dedicated design

The current mobile mode changes the board orientation, but touch behavior is still close to the desktop interaction model.

Impact:

- Dragging and scrolling can conflict.
- Contextual editing is still modal-heavy.
- Small controls can be hard to tap consistently.

Planned direction:

- Add mobile bottom sheets.
- Improve touch targets.
- Reduce scroll and drag conflicts.

---

### GitHub Pages deployment is not confirmed here

The repository is prepared as a static app, but deployment settings still need to be checked in GitHub.

Impact:

- Contributors cannot rely on a confirmed public demo URL yet.
- Documentation may need the final URL once deployment is enabled.

Planned direction:

- Confirm GitHub Pages source and branch.
- Add the public demo URL to README after deployment is verified.

---

## When adding a known issue

Please include:

- short title
- affected area
- steps to reproduce, if it is a bug
- expected behavior
- actual behavior
- whether it blocks future roadmap work

For actionable work, create a GitHub issue and link it from this document when possible.
