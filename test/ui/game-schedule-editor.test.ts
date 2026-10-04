import { describe, expect, it } from 'vitest';

import { inferScheduleEditorKind } from '../../src/ui/game/schedule-editor';

describe('Cherry Game UI schedule editor inference', () => {
  it('treats an empty date as unscheduled', () => {
    expect(inferScheduleEditorKind('', '')).toBe('none');
    expect(inferScheduleEditorKind('', '16:45')).toBe('none');
  });

  it('infers date-only and date-time schedules from the entered fields', () => {
    expect(inferScheduleEditorKind('2026-10-05', '')).toBe('date');
    expect(inferScheduleEditorKind('2026-10-05', '16:45')).toBe('datetime');
  });
});
