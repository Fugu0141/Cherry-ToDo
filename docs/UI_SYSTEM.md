# Cherry UI System and Component Library

Status: **Proposed canonical supporting specification**  
Last reviewed: **2026-07-10**  
Related: [`REQUIREMENTS.md`](REQUIREMENTS.md), [`IMPLEMENTATION_PLAN.md`](IMPLEMENTATION_PLAN.md)

This document defines the policy for introducing a reusable UI system into Cherry.

The objective is not simply to install a ready-made CSS framework. Cherry needs a project-owned **design system and component library** that stabilizes spacing, alignment, interaction states, accessibility, themes, and extension points across the application.

---

## 1. Decision

Cherry will create an internal UI system called **Cherry UI**.

```text
Cherry UI
├── Design tokens
├── Layout primitives
├── Generic controls
├── Cherry-specific components
├── Interaction patterns
├── Component catalog
└── Visual/accessibility tests
```

Cherry owns the public component names, properties, events, themes, and design rules.

Third-party libraries may be used behind Cherry UI, but application features and plugins should not depend directly on a vendor's component tags or internal CSS.

---

## 2. Why this is necessary

The current prototype was developed quickly and now contains a base stylesheet plus many feature, release, mobile, rescue, and fix stylesheets.

This causes predictable quality problems:

- equivalent buttons can have different height, padding, radius, or shadow
- small alignment fixes are repeated in unrelated files
- later stylesheets can override earlier ones unexpectedly
- desktop and mobile controls drift apart
- focus, disabled, selected, loading, and destructive states are inconsistent
- new features recreate controls instead of reusing them
- extensions have no supported UI building blocks
- a visual change is difficult to test across all screens

A component library can reduce these problems, but a library alone does not guarantee perfect alignment. Cherry also needs:

```text
shared design tokens
+ layout rules
+ stable component APIs
+ state specifications
+ visual regression tests
+ gradual removal of old patch CSS
```

---

## 3. Goals

### UI-001: Visual consistency

Equivalent actions and surfaces MUST use consistent dimensions, spacing, typography, focus treatment, and interaction states.

### UI-002: Reusability

Start view, board, list view, desktop UI, mobile UI, and built-in extensions SHOULD compose the same reusable primitives.

### UI-003: Style isolation

A component's internal layout SHOULD not be changed accidentally by an unrelated global stylesheet.

### UI-004: Extension compatibility

Built-in plugins and future approved extensions SHOULD be able to use the same supported Cherry UI components and design tokens.

### UI-005: Accessibility

Keyboard operation, focus behavior, labels, dialogs, menus, touch targets, and disabled states MUST be implemented consistently.

### UI-006: Cherry identity

Cherry MUST retain its own visual identity. It should not look like an unmodified Bootstrap, Material, or vendor demo.

### UI-007: Incremental migration

Cherry UI MUST be introduced one component and one application surface at a time. A single full-UI rewrite is prohibited.

### UI-008: Replaceable dependencies

Changing or removing an underlying UI library SHOULD NOT require rewriting every Cherry feature or plugin.

---

## 4. Non-goals

Cherry UI is not intended to:

- become a complete general-purpose framework immediately
- provide every possible component
- replace the domain model, commands, or state architecture
- solve task-board geometry through generic components
- force every existing element into Shadow DOM in one migration
- require React, Vue, Angular, or another large application framework
- make Cherry dependent on a third-party CDN at runtime
- expose arbitrary third-party plugins before permissions and trust are designed

---

## 5. Architectural layers

### 5.1 Design tokens

Tokens are the shared decisions used by every component.

Initial categories:

- semantic colors
- spacing
- typography
- control heights
- touch target sizes
- radii
- borders
- shadows/elevation
- motion duration/easing
- focus treatment
- z-index layers
- responsive breakpoints

Example naming:

```css
:root {
  --ch-color-canvas: ...;
  --ch-color-surface: ...;
  --ch-color-surface-raised: ...;
  --ch-color-text: ...;
  --ch-color-text-muted: ...;
  --ch-color-border: ...;
  --ch-color-accent: ...;
  --ch-color-accent-contrast: ...;
  --ch-color-danger: ...;
  --ch-color-warning: ...;
  --ch-color-success: ...;
  --ch-color-focus: ...;

  --ch-space-1: 0.25rem;
  --ch-space-2: 0.5rem;
  --ch-space-3: 0.75rem;
  --ch-space-4: 1rem;
  --ch-space-5: 1.5rem;
  --ch-space-6: 2rem;

  --ch-control-height-sm: 2rem;
  --ch-control-height-md: 2.5rem;
  --ch-control-height-lg: 3rem;
  --ch-touch-target-min: 2.75rem;

  --ch-radius-sm: 0.5rem;
  --ch-radius-md: 0.75rem;
  --ch-radius-lg: 1rem;
  --ch-radius-pill: 999px;
}
```

Exact visual values are not fixed by this document. Semantic names and usage rules are the stable contract.

### 5.2 Layout primitives

Layout primitives standardize alignment and gaps without creating one-off flex/grid rules repeatedly.

Initial primitives:

```text
ch-stack      vertical flow with tokenized gap
ch-cluster    wrapping action group
ch-inline     non-wrapping inline alignment
ch-center     centered constrained content
ch-surface    standard panel/background/border/elevation
ch-divider    semantic separator
ch-scroll     standardized scroll container
```

A primitive may be a small Web Component or a documented CSS utility when behavior and style isolation are unnecessary.

### 5.3 Generic controls

Initial reusable controls:

```text
ch-button
ch-icon-button
ch-button-group
ch-field
ch-input
ch-textarea
ch-select
ch-checkbox
ch-switch
ch-dialog
ch-drawer
ch-menu
ch-menu-item
ch-tabs
ch-tab
ch-tooltip
ch-badge
ch-spinner
ch-empty-state
```

### 5.4 Cherry domain components

Domain components understand Cherry concepts but do not mutate application state directly.

```text
ch-task-card
ch-task-editor
ch-task-action-bar
ch-workspace-tab
ch-tab-strip
ch-list-task-row
ch-goal-heading
ch-schedule-badge
ch-start-action-card
ch-import-summary
ch-flow-map-shell
```

They receive view data and emit user intent. Cherry Core commands perform the actual state change.

### 5.5 Interaction patterns

Patterns define how components are assembled for common workflows.

Initial patterns:

- primary, secondary, quiet, and destructive action hierarchy
- selected-task contextual actions
- desktop anchored task editor
- mobile bottom sheet
- confirmation dialog
- empty workspace/start screen
- import destination and result summary
- saving, offline, loading, and error feedback
- toolbar overflow and progressive disclosure

---

## 6. Technology direction

### 6.1 Public format: Web Components

Cherry UI should expose browser-standard custom elements with a `ch-` prefix.

```html
<ch-button variant="primary">Create task</ch-button>
<ch-task-card task-id="task-123"></ch-task-card>
```

Reasons:

- works with plain HTML and ES modules
- preserves static GitHub Pages deployment
- usable without a framework
- reusable by built-in and future plugin surfaces
- supports scoped styles and explicit component APIs
- can be migrated one component at a time

### 6.2 Cherry-owned components: Lit

The current preferred implementation helper is **Lit**.

Lit builds standard Web Components and provides reactive properties, declarative templates, and scoped styles. Its official documentation explicitly supports use with any framework or no framework, progressive enhancement, and development without a required compilation step.

Lit is only the UI component implementation layer. It MUST NOT become Cherry's domain state store or command system.

Official reference: <https://lit.dev/docs/>

### 6.3 Generic complex controls: selective Web Awesome use

The current preferred provider for selected generic controls is **Web Awesome**.

Candidate provider components include:

- dialog
- drawer
- dropdown/menu
- tooltip
- tabs
- form controls where native HTML is insufficient
- progress/spinner

Web Awesome supports npm installation, individual component imports, direct browser bundles, and self-hosting. Some components and patterns are paid/Pro features, so Cherry's core functionality MUST use only dependencies whose license and availability are acceptable for the OSS project.

Official reference: <https://webawesome.com/docs/>

### 6.4 Wrapper rule

Product code SHOULD use Cherry-owned interfaces such as:

```html
<ch-dialog></ch-dialog>
```

rather than spreading provider-specific elements such as:

```html
<wa-dialog></wa-dialog>
```

throughout the application.

The Cherry wrapper is responsible for:

- mapping Cherry variants and tokens
- translating provider events into `ch-*` events
- localization
- common accessibility expectations
- dependency replacement
- limiting provider-specific CSS and APIs

A small feature may use a provider element directly during a proof of concept, but it MUST NOT become the stable application API before the wrapper decision is made.

### 6.5 Production dependency policy

- versions MUST be pinned
- production assets SHOULD be self-hosted
- the application MUST NOT depend on a `latest` CDN URL
- dependencies MUST be license-reviewed
- paid-only components MUST NOT be required for essential OSS functionality
- browser support and load size MUST be measured
- upgrades MUST be reviewed and tested

### 6.6 Alternatives not selected as the default

#### Material Web

Material Web is not selected as Cherry's foundation. Its official repository states that it is in maintenance mode pending new maintainers. It would also push Cherry toward a recognizable Material visual model.

Official reference: <https://github.com/material-components/material-web>

#### Shoelace

Shoelace itself is sunset and directs ongoing work to Web Awesome, so new Cherry work should not begin on Shoelace.

Official reference: <https://shoelace.style/>

#### Tailwind CSS

Tailwind can standardize utility use but does not by itself provide accessible component behavior, domain component APIs, style isolation, or a plugin-facing UI contract. It therefore does not solve the main architectural requirement.

#### Bootstrap

Bootstrap is effective for quickly styling conventional applications, but a broad adoption would create visual-identity and override pressure without solving Cherry-specific task-flow components.

---

## 7. Component API rules

### 7.1 Ownership

Cherry owns public component names, events, variants, slots, CSS parts, and semantic tokens.

### 7.2 Data flow

Components receive properties/data and emit intent events.

```js
card.addEventListener("ch-task-edit-request", event => {
  commands.execute("task.openEditor", event.detail);
});
```

A UI component MUST NOT:

- mutate the global workspace directly
- write storage
- replace core render functions
- infer semantic task changes from presentation-only movement

### 7.3 Event naming

Public events use the `ch-` prefix.

Examples:

```text
ch-activate
ch-change
ch-close-request
ch-task-edit-request
ch-task-move-request
ch-flow-connect-request
```

Events that must cross Shadow DOM SHOULD use `bubbles: true` and `composed: true`.

### 7.4 Variants

Use semantic variants:

```text
primary
secondary
quiet
danger
```

Do not use raw color names as behavioral API.

### 7.5 Styling extension points

Supported customization may use:

- documented CSS custom properties
- documented `::part()` names
- slots
- semantic size and variant properties

Consumers MUST NOT depend on undocumented internal Shadow DOM markup.

### 7.6 Localization

Components use translated labels supplied by the central localization service. They must not create another independent Japanese/English dictionary.

### 7.7 State matrix

Every interactive component documents and tests the applicable states:

```text
default
hover
focus-visible
active
selected
expanded
loading
disabled
invalid
danger
compact/mobile
light/dark
```

---

## 8. Theme and token rules

### 8.1 Semantic colors

Components request semantic roles such as `accent`, `surface-raised`, and `danger`, not hard-coded hexadecimal values.

Goal importance colors are separate from success/warning/danger application states.

### 8.2 Light, dark, and system modes

Theme selection occurs once at the application/root level. Components consume semantic tokens and MUST NOT contain independent theme-selection logic.

### 8.3 Color is not enough

Importance, selection, completion, warning, and destructive state MUST NOT rely only on color. Use labels, icons, border/shape, text, or accessible state where appropriate.

### 8.4 Board geometry exception

Task coordinates, connector paths, date-lane spacing, and canvas geometry are domain layout values, not ordinary UI spacing. They may use separate centralized board constants.

---

## 9. Accessibility requirements

Cherry UI components MUST:

- preserve a visible focus indicator
- support keyboard activation and navigation
- expose correct accessible names, roles, and states
- use appropriate disabled, selected, and expanded semantics
- restore focus after modal dialogs/drawers when appropriate
- trap focus only for truly modal surfaces
- connect validation/error messages to form controls
- respect reduced-motion preferences
- provide mobile-friendly touch targets
- avoid color-only meaning

Complex controls SHOULD use proven implementations rather than quick custom imitations when doing so reduces accessibility and interaction risk.

---

## 10. Component catalog and testing

### 10.1 UI Lab

Create a static development catalog such as:

```text
dev/ui-lab.html
```

It should display all components and states without requiring a real workspace.

Initial sections:

- tokens and typography
- buttons and icon buttons
- fields and validation
- dialogs, drawers, menus, tabs
- task card variants
- selected, done, and importance states
- list rows and goal headings
- mobile action bar
- start-screen patterns
- loading, empty, saving, and error states
- light and dark themes

A static catalog is sufficient initially; Storybook or another heavy catalog tool is not required.

### 10.2 Visual regression tests

Browser screenshot tests SHOULD cover:

- desktop light and dark
- representative mobile light and dark
- each important component state
- major application surfaces

They should detect:

- small alignment offsets
- accidental height/padding changes
- overflow and clipping
- missing selected/focus state
- theme regressions
- CSS leaking between features

### 10.3 Interaction tests

Tests SHOULD cover:

- keyboard activation
- focus movement/restoration
- menu/tab navigation
- dialog/drawer closing
- disabled behavior
- component event contracts
- representative mobile pointer behavior

### 10.4 Accessibility checks

Automated checks SHOULD run against UI Lab and major screens. Critical workflows also require manual keyboard review.

---

## 11. Plugin and extension policy

Built-in plugins and future approved extensions should receive supported UI access through the extension context.

Conceptual shape:

```js
context.ui = {
  components: {
    button: "ch-button",
    dialog: "ch-dialog",
    taskCard: "ch-task-card"
  },
  tokens,
  actions,
  surfaces
};
```

Extensions SHOULD:

- use Cherry semantic tokens
- register actions through supported registries
- avoid global CSS resets
- avoid undocumented component internals
- remain removable without leaving orphaned global styles

The extension API may later limit which components or surfaces are available based on trust/permissions.

---

## 12. Migration plan

### UI Phase 0: Inventory and freeze

- inventory current buttons, inputs, dialogs, tabs, cards, panels, badges, and action bars
- record current dimensions and duplicate implementations
- identify stylesheets patching the same selectors
- avoid adding new one-off control styles except release-blocking fixes

Temporary output may be `docs/UI_INVENTORY.md`.

### UI Phase 1: Tokens and base rules

- add semantic light/dark tokens
- add shared typography, spacing, control height, radius, focus, and motion rules
- map existing variables such as `--bg`, `--surface`, and `--accent` to the new tokens during transition
- replace broad element styling gradually; do not visually redesign everything at once

### UI Phase 2: Component foundation and UI Lab

- add the selected Web Component implementation approach
- pin and review Lit
- create registration and naming conventions
- create `dev/ui-lab.html`
- add initial screenshot tests
- perform a small proof of concept before finalizing Web Awesome adoption

Proof-of-concept components:

1. `ch-button`
2. `ch-dialog`
3. `ch-tabs` or `ch-drawer`

The proof of concept must compare:

- accessibility behavior
- theme integration
- bundle/load cost
- ease of self-hosting
- CSS isolation
- localization
- replacement/wrapper complexity

### UI Phase 3: Generic primitives

Implement and test, in small PRs:

1. buttons and icon buttons
2. surface/layout primitives
3. field/input shell
4. dialog and drawer
5. menu/dropdown
6. tabs
7. tooltip/badge/spinner

### UI Phase 4: Application shell

Migrate:

- startup shell and primary action hierarchy
- workspace tab strip
- toolbar and overflow actions
- language/theme controls
- import/export and confirmation dialogs

This phase should proceed together with startup/persistence architecture, not as later decoration.

### UI Phase 5: Domain components

Migrate:

- task card visual/control surface
- selected-task action bar
- task editor shell
- list task row
- goal heading and importance presentation
- schedule badge
- mobile and desktop editing surfaces

Task dragging, board geometry, and flow commands remain outside the visual component.

### UI Phase 6: Remove obsolete CSS patches

For each migrated surface:

- remove duplicate legacy implementation
- remove obsolete fix/rescue selectors
- move remaining purposeful layout styles into named modules
- verify UI Lab and application visual tests

Do not delete patch styles in bulk before the replacement surface is tested.

### UI Phase 7: Stabilize the extension-facing UI API

- document public properties, events, slots, parts, variants, and tokens
- version the Cherry UI API
- define deprecation policy
- expose components to built-in plugins
- consider a separately published package only after real reuse justifies it

---

## 13. Relationship to the main implementation plan

Cherry UI is a cross-cutting foundation and must not be postponed until all feature work is complete.

Recommended order:

```text
Documentation baseline
→ UI inventory and semantic tokens
→ startup/storage shell and first primitives
→ core commands/events/modules
→ workspace/tab/dialog migration
→ schedule/flow domain components
→ mobile and desktop interaction surfaces
→ remaining feature components
→ patch CSS retirement
```

The two architectural efforts solve different forms of coupling:

```text
Cherry Core prevents state and behavior coupling.
Cherry UI prevents visual and interaction coupling.
```

---

## 14. Risks and controls

### Risk: Vendor lock-in

Control: Cherry-owned wrappers, events, tokens, and component names.

### Risk: A library changes Cherry's identity

Control: Cherry owns design tokens and domain components; vendor default themes are not the product design.

### Risk: Larger startup cost

Control: import only required components, measure load cost, defer non-start components, self-host pinned assets.

### Risk: Shadow DOM makes styling harder

Control: document tokens, slots, and `::part()` extension points; do not hide layout that must be controlled by board geometry.

### Risk: Migration creates two competing UI systems

Control: migrate surface by surface, define an owner for each surface, remove the old implementation after tests pass.

### Risk: Library components still contain visual bugs

Control: UI Lab, visual regression tests, interaction tests, and Cherry-owned geometry rules.

---

## 15. Acceptance criteria

The Cherry UI foundation is successful when:

- new features can use common controls without inventing new spacing/state CSS
- equivalent controls match across start, board, list, desktop, and mobile
- built-in plugins can use stable UI components
- component styles do not unexpectedly affect unrelated features
- light/dark themes are token-driven
- visual tests detect small alignment and overflow regressions
- keyboard, focus, disabled, selected, and destructive states are consistent
- overlapping fix/rescue stylesheets decrease over time
- the underlying provider can be replaced without rewriting all features
- Cherry keeps its own visual identity

---

## 16. Definition of done for a component

A component is complete only when:

- its public properties, events, variants, slots, and styling points are documented
- applicable states appear in UI Lab
- light and dark modes are verified
- desktop and mobile sizing are considered
- keyboard and focus behavior are verified
- accessible name, role, and state are correct
- important variants have visual regression coverage
- it does not mutate domain state or storage directly
- it emits intent that application commands can handle
- its legacy implementation is removed or has an explicit migration task
