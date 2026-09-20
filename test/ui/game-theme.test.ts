import { describe, expect, it } from 'vitest';

import { parseCherryThemePreference } from '../../src/ui/game/theme';

describe('Cherry Game UI theme preference', () => {
  it('accepts supported theme values', () => {
    expect(parseCherryThemePreference('system')).toBe('system');
    expect(parseCherryThemePreference('light')).toBe('light');
    expect(parseCherryThemePreference('dark')).toBe('dark');
  });

  it('falls back to system for missing or unsupported values', () => {
    expect(parseCherryThemePreference(null)).toBe('system');
    expect(parseCherryThemePreference('sepia')).toBe('system');
  });
});
