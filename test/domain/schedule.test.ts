import { describe, expect, it } from 'vitest';

import {
  parseLocalDate,
  scheduleAtDateTime,
  scheduleOnDate,
} from '../../src/modules/schedule/index';

describe('Schedule', () => {
  it('keeps date-only values timezone-neutral and unchanged', () => {
    const result = scheduleOnDate('2026-09-14');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({ kind: 'date', date: '2026-09-14' });
      expect('timeZone' in result.value).toBe(false);
    }
  });

  it('validates calendar dates without JavaScript Date conversion', () => {
    expect(parseLocalDate('2024-02-29').ok).toBe(true);
    expect(parseLocalDate('2026-02-29').ok).toBe(false);
    expect(parseLocalDate('2026-13-01').ok).toBe(false);
  });

  it('allows an optional zone only on datetime values', () => {
    const result = scheduleAtDateTime('2026-09-14', '13:45', 'Asia/Tokyo');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({
        kind: 'datetime',
        date: '2026-09-14',
        time: '13:45',
        timeZone: 'Asia/Tokyo',
      });
    }
  });
});
