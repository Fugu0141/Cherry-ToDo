import { describe, expect, it } from 'vitest';

import {
  beginMobileConnection,
  cancelMobileConnection,
  completeMobileConnection,
} from '../../src/ui/default/interaction/mobile-connection-flow';
import { InteractionCoordinator } from '../../src/ui/default/interaction/interaction-coordinator';

describe('mobile existing-Task connection flow', () => {
  it('uses explicit temporary connection mode and returns the normal UI connect intent', () => {
    const coordinator = new InteractionCoordinator();

    expect(beginMobileConnection(coordinator, 'task-a', 'branch')).toEqual({
      fromTaskId: 'task-a',
      kind: 'branch',
    });
    expect(coordinator.state.kind).toBe('creating-connection');
    expect(
      coordinator.beginPointer({
        kind: 'dragging-task',
        pointerId: 1,
        point: { x: 0, y: 0 },
      }),
    ).toBe(false);

    expect(completeMobileConnection(coordinator, 'task-b')).toEqual({
      fromTaskId: 'task-a',
      toTaskId: 'task-b',
      kind: 'branch',
    });
    expect(coordinator.state).toEqual({ kind: 'idle' });
  });

  it('does not connect a Task to itself and keeps target selection active', () => {
    const coordinator = new InteractionCoordinator();
    beginMobileConnection(coordinator, 'task-a', 'continuation');

    expect(completeMobileConnection(coordinator, 'task-a')).toBeNull();
    expect(coordinator.state.kind).toBe('creating-connection');
    expect(cancelMobileConnection(coordinator)).toBe(true);
    expect(coordinator.state).toEqual({ kind: 'idle' });
  });

  it('does not start connection mode while a drag or pan owner is active', () => {
    const coordinator = new InteractionCoordinator();
    coordinator.beginPointer({
      kind: 'panning',
      pointerId: 9,
      point: { x: 10, y: 10 },
    });

    expect(beginMobileConnection(coordinator, 'task-a', 'reference')).toBeNull();
    expect(coordinator.state.kind).toBe('panning');
  });
});
