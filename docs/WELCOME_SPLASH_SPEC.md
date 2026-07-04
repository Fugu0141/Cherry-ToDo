# Welcome Splash Specification

## Purpose

The welcome splash is a lightweight first-run concept window for new Cherry users.

It should communicate the product idea quickly:

```text
Flow first, date second.
```

Cherry is an open-source app, but the first-run window should not feel like a project dashboard. It should first explain the Cherry concept, then provide small community links for users who want them.

## Current behavior

- The splash appears only when the browser has not stored the dismissed flag yet.
- Closing the splash writes this flag to `localStorage`:

```text
cherry-todo-welcome-dismissed-v1
```

- The dismissed flag is separate from the task storage key:

```text
quest-sticky-todo-v10
```

- This keeps first-run onboarding independent from saved task data and legacy task migration.
- Closing by the primary button, close button, backdrop click, or `Esc` all count as dismissal.
- The splash is injected by `welcome-splash.js` so the base HTML stays focused on the app shell.

## Content

The current splash intentionally stays simple:

- Cherry brand
- short concept line
- one concise product description
- a small flow example: root task → child task → today's task
- one primary start button
- small footer links for GitHub, contribution guide, donation placeholder, and release notes

Donation support is intentionally shown as a quiet placeholder until a proper destination exists.

Release notes currently point to GitHub Releases so the destination can work before a custom release page exists.

## UX rules

- The splash must not reappear for returning users after they dismiss it once.
- The splash must not clear or rewrite task data.
- The splash should feel light and close to Cherry's existing task-block UI.
- The splash should be usable on desktop and mobile viewports.
- The splash should be dismissible by mouse, touch, and keyboard.
- Keyboard focus should stay inside the splash while it is open.
- Links should open in a new tab with `rel="noopener noreferrer"`.

## Future work

Possible follow-ups:

- Add a visible `About / Welcome` entry in the app menu so users can reopen the splash later.
- Replace the donation placeholder with a real support page.
- Add a custom in-app release notes page if GitHub Releases is not enough.
- Localize the content if English documentation becomes the primary entry point for contributors.

## Manual checks

1. Clear `localStorage.cherry-todo-welcome-dismissed-v1`.
2. Reload the app and confirm the splash appears.
3. Close the splash and confirm the flag becomes `true`.
4. Reload again and confirm the splash does not appear.
5. Confirm existing `quest-sticky-todo-v10` task data remains unchanged.
6. Test at desktop width and mobile width.
7. Confirm `Esc` closes the splash.
8. Confirm GitHub, contribution, and release notes links open in a new tab.
