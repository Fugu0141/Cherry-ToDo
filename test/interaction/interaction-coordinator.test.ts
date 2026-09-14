import { describe, expect, it } from 'vitest';

import {
  InteractionCoordinator,
  interactionDistanceSquared,
} from '../../src/ui/default/interaction/interaction-coordinator';

describe('InteractionCoordinator', () => {
  it('allows exactly one active pointer owner', () => {
    const coordinator = new InteractionCoordinator();

    expect(
      coordinator.beginPointer({
        kind: 'dragging-task',
        pointerId: 7,
        point: { x: 10, y: 20 },
        subjectId: 'task-a',
      }),
    ).toBe(true);
    expect(
      coordinator.beginPointer({
        kind: 'panning',
        pointerId: 8,
        point: { x: 30, y: 40 },
      }),
    ).toBe(false);
    expect(coordinator.ownsPointer(7, 'dragging-task')).toBe(true);
    expect(coordinator.ownsPointer(8)).toBe(false);

    expect(coordinator.updatePointer(8, { x: 50, y: 60 })).toBeNull();
    const moved = coordinator.updatePointer(7, { x: 13, y: 24 });
    expect(moved?.kind).toBe('dragging-task');
    expect(interactionDistanceSquared(coordinator.state)).toBe(25);

    expect(coordinator.endPointer(8)).toBeNull();
    expect(coordinator.endPointer(7)?.kind).toBe('dragging-task');
    expect(coordinator.state).toEqual({ kind: 'idle' });
  });

  it('keeps connection mode mutually exclusive with drag and pan sessions', () => {
    const coordinator = new InteractionCoordinator();

    expect(coordinator.beginConnection('task-a', 'branch')).toBe(true);
    expect(
      coordinator.beginPointer({
        kind: 'dragging-task',
        pointerId: 1,
        point: { x: 0, y: 0 },
      }),
    ).toBe(false);
    expect(coordinator.state).toEqual({
      kind: 'creating-connection',
      sourceTaskId: 'task-a',
      relation: 'branch',
    });

    expect(coordinator.completeConnection()?.kind).toBe('creating-connection');
    expect(
      coordinator.beginPointer({
        kind: 'panning',
        pointerId: 2,
        point: { x: 5, y: 6 },
      }),
    ).toBe(true);
  });

  it('cancels any active interaction without mutating external state', () => {
    const coordinator = new InteractionCoordinator();
    coordinator.beginPointer({
      kind: 'panning',
      pointerId: 3,
      point: { x: 1, y: 2 },
    });

    expect(coordinator.cancel()?.kind).toBe('panning');
    expect(coordinator.state).toEqual({ kind: 'idle' });
    expect(coordinator.cancel()).toBeNull();
  });
});
