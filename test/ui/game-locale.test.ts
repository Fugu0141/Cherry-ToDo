import { describe, expect, it } from 'vitest';

import { parseCherryLocale } from '../../src/ui/game/locale';

describe('Cherry Game UI locale preference', () => {
  it('accepts Japanese and English', () => {
    expect(parseCherryLocale('ja')).toBe('ja');
    expect(parseCherryLocale('en')).toBe('en');
  });

  it('falls back to Japanese for missing or unsupported values', () => {
    expect(parseCherryLocale(null)).toBe('ja');
    expect(parseCherryLocale('fr')).toBe('ja');
  });
});
