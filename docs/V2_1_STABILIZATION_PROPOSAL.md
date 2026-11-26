# Cherry V2.1 — Stability & Refinement

Status: **Draft for review (not an accepted specification)**
Baseline: `main` at `8a90c4fa86dda3ac5e313b83a194c7bdc211c825`
Target: V2.1 (provisional)

## Product direction and scope

Cherry is a flow-first, local-first task planning application. V2.1 improves the reliability, rendering quality, responsiveness, visual consistency and direct-manipulation experience of existing functionality. The V2 Domain/Application architecture, canonical data contracts, storage consent, and migration safety remain the foundation. No new framework, major architecture rewrite, cloud sync, collaboration, or custom frame feature (#282) is in scope by default. Existing capabilities must not be silently removed. Small enabling changes require a specification and acceptance criteria.

## Development policy

Use specification-driven development: observed problem → proposed specification and examples → owner review/acceptance → technical design and acceptance tests → focused Issue/PR → verification. Keep small iterative PRs; do not use implementation convenience as authority to change behavior. An accepted specification is normative; observed behavior, Issue discussions and archived designs are evidence, not competing authorities. Changes to accepted behavior require an explicit reviewed spec amendment. Keep existing requirement IDs where meaning is unchanged. No requirement is marked verified merely because it has a test reference.

## Audit findings and draft requirements

These findings are based on static inspection, not browser reproduction or performance measurements. IDs below are provisional; integrate them into the consolidated requirements and traceability scheme before implementation.

### R-UI-101 — Stable UI lifecycle and localized updates

Evidence: `src/ui/game/index.ts` (mount, renderWorkspace, render; root.replaceChildren(shell)), `src/main.ts` (post-mount installers).

- MUST preserve scroll position, selection, input drafts, focus and active gestures across unrelated UI updates, except for explicitly specified navigation/cancellation.
- MUST NOT rebuild the complete workspace merely to toggle settings, change selection or dismiss a notice.
- SHOULD use stable keyed views and explicit mount/update/unmount lifecycles; share UI primitives without duplicating business rules.
- MUST release event listeners, observers, timers and pointer ownership on disposal. Integrate theme, locale, onboarding and schedule editing into the intended lifecycle rather than relying on incidental DOM reconstruction.
- Acceptance: select a card in a scrolled board; toggle settings; expire a notice during text entry/drag; resize and switch views; verify preserved state as specified, no duplicate handlers, and correct disposal.
- Framework choice remains open. Measure and prototype incremental updates before adopting a framework.

### R-UI-102 — One presentation geometry contract

Evidence: `src/modules/board/domain/layout.ts`, `flow-geometry.ts`, `src/composition/cherry-ui-runtime.ts`, `src/ui/game/styles.css`, `src/ui/game/index.ts`.

- MUST use one consistent card-bounds model for layout, connector endpoints, obstacle avoidance, hit testing, lane geometry, contextual menus and Flow Map.
- MUST prevent content-dependent visual dimensions from silently diverging from layout dimensions. Decide fixed size with accessible overflow handling vs measured variable size before implementation.
- MUST ensure automatic placement does not overlap cards; intentional manual overlaps remain a separate policy. Keep horizontal desktop and vertical mobile progression, preserve semantic branch order, and never modify Flow/Schedule as a side effect of presentation.
- MUST define routing fallback behavior, including backwards/reference edges, crowded layouts and collapsed lanes; do not promise mathematically optimal routing.
- Acceptance: short and long Japanese/English titles, badges, branching/merging, dated/undated tasks, manual placement, collapse/expand, both orientations; verify card bounds, anchors and clipping with geometry assertions plus reviewed screenshots.
- References: #51, #57, #222, #273, #274, #277, #286, #287; PR #292, #293.

### R-UI-103 — Consistent visual and adaptive design

- MUST define semantic tokens for color, text, spacing, typography, surface, borders, focus, elevation and motion; use shared components and explicit states.
- MUST provide readable light/dark/system themes, Japanese/English labels, keyboard access, visible focus, reduced-motion behavior and usable touch targets.
- MUST keep dialogs and menus reachable in narrow/short viewports and when the software keyboard opens. Define anchor placement, collision/overflow, cancellation and focus restoration.
- SHOULD keep direct board manipulation, progressive disclosure and minimal pointer travel as Cherry's identity. Use device-appropriate gestures without changing semantics.
- Acceptance: review normal, hover, focus, selected, disabled, blocked, completed, error and pending states; exercise desktop/mobile, long labels, many tabs, viewport transitions and keyboard entry.
- References: #5, #14, #21, #25, #33, #76, #86, #93, #275, #278, #279.

### R-UI-104 — Safe feedback and editing

- MUST retain unsaved input until successful commit or explicit cancel. Prevent accidental duplicate submission.
- MUST preserve memory-only work during locale/theme changes; clearly indicate storage mode and warn where supported before abandoning unsaved work.
- MUST present deletion scope and semantic confirmation reasons accurately. Preserve accepted chain-limited deletion behavior unless a reviewed spec amendment changes it.
- MUST support atomic connected-task creation for all supported connection kinds; keep failure paths recoverable.
- Acceptance: failed validation, storage failure, confirmation cancel, reference creation failure, memory-mode locale change, persistence conflict and recovery; verify no unintended data loss.
- References: #294–298, #300–303; verify against current main before claiming resolution.

### NFR-UI-101 — Rendering performance

Evidence: `cherry-ui-runtime.ts` computes desktop and mobile layouts and per-edge obstacle sets; `flow-geometry.ts` evaluates routes.

- Measure before optimizing. Establish reproducible fixtures (e.g. 10/50/100/500 tasks with chains, branches, merges and annotations).
- Record reference environment, startup time, layout/routing cost, DOM update time, interaction latency and frame behavior; separate cold/warm results.
- Investigate caching, invalidation, active-orientation calculation and spatial indexing where measurements justify them. Do not trade correctness for speed.
- Set measurable budgets after baseline measurement and owner review; no invented performance promises.

### NFR-UI-102 — UI quality gate

- Preserve existing unit/integration/contract, architecture, accessibility and E2E gates.
- Extend existing `test/e2e/game-ui-parity.spec.ts` and related tests, rather than replacing them with screenshots alone.
- Add deterministic reviewed visual baselines, geometry invariants and interaction regression tests. Fix locale, font, viewport, time, device scale and animation settings where needed; never accept unexplained snapshot changes.
- Start with existing desktop/mobile Chromium projects; add Firefox/WebKit and real-device checks in a controlled matrix. Visual review remains required for intentional changes.
- Define explicit pass criteria, test evidence and traceability before declaring V2.1 complete.

## Documentation and Issue reorganization

Current docs contain stale main/v2.0 branch policy, draft statuses, completed implementation plans and precedence conflicts (e.g. Goal cardinality in DESIGN_FREEZE vs later FLOW_EXECUTION_RULES/#289). Consolidate active specifications without erasing historical evidence. Retain prior docs/ADRs through a tagged/identified Git baseline and/or clearly designated archive; update README, AGENTS, relative links, traceability scripts and CI together. Review every old Open Issue disposition before closing/reopening; record successor links. Preserve #90 and #282 as future design history, not V2.1 commitments. #283/#284 have merged fixes; confirm evidence before closing. No bulk closure before the inventory is reviewed.

## Proposed sequence and release criteria

1. **Baseline and safety:** record current main, inventory documents/issues, reproduce UI problems and prioritize data loss risks.
2. **Specification review:** consolidate existing functional rules and accept UI architecture, geometry, adaptive design, and quality requirements. Resolve open product choices explicitly.
3. **Stabilization:** focused PRs for verified failures; preserve existing Core contracts.
4. **Refinement:** improve rendering/UI performance and visual consistency against reviewed fixtures.
5. **Verification:** all applicable accepted criteria and existing release gates pass; no known unresolved critical data loss or release-blocking regressions; record measured performance and visual evidence.

## Open decisions (not silently frozen)

- Fixed vs measured variable task-card dimensions and title overflow behavior.
- Exact menu placement, adaptive breakpoints, design tokens, and mobile keyboard handling.
- Whether the existing DOM rendering approach or a component framework is preferable, based on prototype evidence.
- Performance thresholds, supported browser/device matrix and release-blocking definitions.
- Exact document consolidation and Issue dispositions; confirm before moving/deleting documents or bulk changing Issue state.

This draft does not replace the currently accepted V2 specifications, change production code, or claim verified behavior.
