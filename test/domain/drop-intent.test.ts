import { describe, expect, it } from 'vitest';

import {
  resolveDropIntent,
  type BoardSettings,
  type ResolveDropIntentInput,
} from '../../src/modules/board/index';
import { parseTaskId, type TaskId } from '../../src/shared/ids/index';

function id(value: string): TaskId {
  const parsed = parseTaskId(value);
  if (!parsed.ok) throw new Error(`Invalid test id: ${value}`);
  return parsed.value;
}

const A = id('A');
const B = id('B');
const manual: BoardSettings = {
  showDateLanes: true,
  autoLayout: false,
  timeGuide: 'auto',
};
const auto: BoardSettings = {
  showDateLanes: true,
  autoLayout: true,
  timeGuide: 'auto',
};

function resolve(input: Omit<ResolveDropIntentInput, 'taskId'>) {
  return resolveDropIntent({ taskId: A, ...input });
}

describe('Board DropIntent resolver', () => {
  it('resolves blank-canvas drops only when manual layout is enabled', () => {
    expect(
      resolve({ settings: manual, target: { kind: 'canvas', point: { x: 120, y: 80 } } }),
    ).toEqual({ kind: 'visual-move', point: { x: 120, y: 80 } });

    expect(
      resolve({ settings: auto, target: { kind: 'canvas', point: { x: 120, y: 80 } } }),
    ).toEqual({ kind: 'cancel' });
  });

  it('uses semantic lane date identically for expanded and collapsed lanes', () => {
    const expanded = resolve({
      settings: auto,
      target: {
        kind: 'date-lane',
        date: '2026-09-20',
        point: { x: 120, y: 40 },
        collapsed: false,
      },
    });
    const collapsed = resolve({
      settings: auto,
      target: {
        kind: 'date-lane',
        date: '2026-09-20',
        point: { x: 120, y: 4 },
        collapsed: true,
      },
    });

    expect(expanded).toEqual({ kind: 'assign-date', date: '2026-09-20' });
    expect(collapsed).toEqual({ kind: 'assign-date', date: '2026-09-20' });
  });

  it('keeps a lane-local point when assigning a date in manual layout', () => {
    expect(
      resolve({
        settings: manual,
        target: {
          kind: 'date-lane',
          date: '2026-09-20',
          point: { x: 300, y: 25 },
          collapsed: true,
        },
      }),
    ).toEqual({ kind: 'assign-date', date: '2026-09-20', point: { x: 300, y: 25 } });
  });

  it('resolves existing-task connection only in explicit connect mode and rejects self drop', () => {
    expect(resolve({ settings: manual, target: { kind: 'task', taskId: B } })).toEqual({
      kind: 'cancel',
    });
    expect(
      resolve({ settings: manual, target: { kind: 'task', taskId: B }, connectMode: true }),
    ).toEqual({ kind: 'connect-task', targetTaskId: B });
    expect(
      resolve({ settings: manual, target: { kind: 'task', taskId: A }, connectMode: true }),
    ).toEqual({ kind: 'cancel' });
  });

  it('requires explicit reorder mode and cancellation always wins', () => {
    const target = { kind: 'flow-reorder', orderedTaskIds: [B, A] } as const;
    expect(resolve({ settings: auto, target })).toEqual({ kind: 'cancel' });
    expect(resolve({ settings: auto, target, reorderMode: true })).toEqual({
      kind: 'reorder-flow',
      orderedTaskIds: [B, A],
    });
    expect(
      resolve({
        settings: manual,
        target: { kind: 'canvas', point: { x: 1, y: 2 } },
        cancelled: true,
      }),
    ).toEqual({ kind: 'cancel' });
  });
});
