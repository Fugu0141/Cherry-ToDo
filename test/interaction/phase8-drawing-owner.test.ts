import { describe, expect, it } from 'vitest';

import { InteractionCoordinator } from '../../src/ui/default/interaction/interaction-coordinator';

describe('Phase 8 drawing interaction ownership', () => {
  it('gives drawing one pointer owner and blocks Board pan/task drag until drawing ends', () => {
    const coordinator = new InteractionCoordinator();

    expect(
      coordinator.beginPointer({
        kind: 'drawing-stroke',
        pointerId: 8,
        point: { x: 10, y: 20 },
      }),
    ).toBe(true);
    expect(coordinator.ownsPointer(8, 'drawing-stroke')).toBe(true);

    expect(
      coordinator.beginPointer({
        kind: 'panning',
        pointerId: 8,
        point: { x: 10, y: 20 },
      }),
    ).toBe(false);
    expect(
      coordinator.beginPointer({
        kind: 'dragging-task',
        pointerId: 9,
        point: { x: 15, y: 25 },
      }),
    ).toBe(false);

    coordinator.updatePointer(8, { x: 30, y: 50 });
    expect(coordinator.endPointer(8)?.kind).toBe('drawing-stroke');
    expect(coordinator.state).toEqual({ kind: 'idle' });
  });
});
