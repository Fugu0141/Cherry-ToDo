import { describe, expect, it } from 'vitest';

import {
  CHERRY_ONBOARDING_STEPS,
  shouldAutoOpenCherryOnboarding,
} from '../../src/ui/game/onboarding';

describe('Cherry onboarding', () => {
  it('auto-opens only for a first empty workspace in the current session', () => {
    expect(shouldAutoOpenCherryOnboarding({ seen: false, hasWorkspace: true, taskCount: 0 })).toBe(
      true,
    );
    expect(shouldAutoOpenCherryOnboarding({ seen: true, hasWorkspace: true, taskCount: 0 })).toBe(
      false,
    );
    expect(shouldAutoOpenCherryOnboarding({ seen: false, hasWorkspace: true, taskCount: 1 })).toBe(
      false,
    );
    expect(shouldAutoOpenCherryOnboarding({ seen: false, hasWorkspace: false, taskCount: 0 })).toBe(
      false,
    );
  });

  it('covers the direct-manipulation planning loop', () => {
    expect(CHERRY_ONBOARDING_STEPS).toHaveLength(4);
    expect(CHERRY_ONBOARDING_STEPS.map((step) => step.selector)).toEqual([
      '.cg-fab',
      '.cg-board-scroll',
      '.cg-tabs',
      '.cg-topbar-actions',
    ]);
  });
});
