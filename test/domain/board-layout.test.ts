import { describe, expect, it } from 'vitest';
import { layoutBoard, type BoardSettings } from '../../src/modules/board/index';
import { parseTaskId, type TaskId } from '../../src/shared/ids/index';

function taskId(value: string): TaskId {
  const parsed = parseTaskId(value);
  if (!parsed.ok) throw new Error(`Invalid test TaskId: ${value}`);
  return parsed.value;
}

const AUTO_LANES: BoardSettings = {
  showDateLanes: true,
  autoLayout: true,
  timeGuide: 'auto',
};

const A = taskId('A');
const B = taskId('B');
const C = taskId('C');
const D = taskId('D');

function input(id: TaskId, scheduleDate: string | null = null) {
  return { id, scheduleDate } as const;
}

describe('DAG-aware Board layout', () => {
  it('places a structural chain in increasing ranks', () => {
    const result = layoutBoard(
      [input(A), input(B), input(C)],
      [
        { fromTaskId: A, toTaskId: B },
        { fromTaskId: B, toTaskId: C },
      ],
      { ...AUTO_LANES, showDateLanes: false },
    );

    expect(result.tasks[A]?.rank).toBe(0);
    expect(result.tasks[B]?.rank).toBe(1);
    expect(result.tasks[C]?.rank).toBe(2);
    expect(result.tasks[A]?.point.x).toBeLessThan(result.tasks[B]?.point.x ?? 0);
    expect(result.tasks[B]?.point.x).toBeLessThan(result.tasks[C]?.point.x ?? 0);
  });

  it('supports a vertical progression for mobile presentation', () => {
    const result = layoutBoard(
      [input(A), input(B), input(C)],
      [
        { fromTaskId: A, toTaskId: B },
        { fromTaskId: B, toTaskId: C },
      ],
      { ...AUTO_LANES, showDateLanes: false },
      'vertical',
    );

    expect(result.tasks[A]?.point.y).toBeLessThan(result.tasks[B]?.point.y ?? 0);
    expect(result.tasks[B]?.point.y).toBeLessThan(result.tasks[C]?.point.y ?? 0);
    expect(result.tasks[A]?.point.x).toBe(result.tasks[B]?.point.x);
  });

  it('lays out branch-then-merge DAGs without duplicating the merge Task', () => {
    const result = layoutBoard(
      [input(A), input(B), input(C), input(D)],
      [
        { fromTaskId: A, toTaskId: B },
        { fromTaskId: A, toTaskId: C },
        { fromTaskId: B, toTaskId: D },
        { fromTaskId: C, toTaskId: D },
      ],
      { ...AUTO_LANES, showDateLanes: false },
    );

    expect(result.tasks[D]?.rank).toBe(2);
    expect(Object.keys(result.tasks).filter((id) => id === D)).toHaveLength(1);
    expect(Object.keys(result.tasks)).toHaveLength(4);
  });

  it('creates deterministic date lanes with undated work last', () => {
    const result = layoutBoard(
      [input(A, '2026-09-16'), input(B, null), input(C, '2026-09-15')],
      [],
      AUTO_LANES,
    );

    expect(result.lanes.map((lane) => lane.id)).toEqual([
      'date:2026-09-15',
      'date:2026-09-16',
      'undated',
    ]);
    expect(result.tasks[C]?.laneId).toBe('date:2026-09-15');
    expect(result.tasks[B]?.laneId).toBe('undated');
  });

  it('uses vertical date lanes on desktop and horizontal date lanes on mobile', () => {
    const desktop = layoutBoard(
      [input(A, '2026-09-15'), input(B, '2026-09-16')],
      [{ fromTaskId: A, toTaskId: B }],
      AUTO_LANES,
      'horizontal',
    );
    const mobile = layoutBoard(
      [input(A, '2026-09-15'), input(B, '2026-09-16')],
      [{ fromTaskId: A, toTaskId: B }],
      AUTO_LANES,
      'vertical',
    );

    expect(desktop.lanes[0]?.startX).toBeLessThan(desktop.lanes[1]?.startX ?? 0);
    expect(desktop.lanes[0]?.startY).toBe(desktop.lanes[1]?.startY);
    expect(desktop.tasks[A]?.point.x).toBeLessThan(desktop.tasks[B]?.point.x ?? 0);

    expect(mobile.lanes[0]?.startY).toBeLessThan(mobile.lanes[1]?.startY ?? 0);
    expect(mobile.lanes[0]?.startX).toBe(mobile.lanes[1]?.startX);
    expect(mobile.tasks[A]?.point.y).toBeLessThan(mobile.tasks[B]?.point.y ?? 0);
  });

  it('keeps manual positions authoritative when auto layout is off', () => {
    const tasks = [
      { id: A, scheduleDate: '2026-09-15', manualPosition: { x: 123, y: 45 } },
      { id: B, scheduleDate: null, manualPosition: { x: 456, y: 78 } },
    ] as const;

    const hidden = layoutBoard(tasks, [], {
      showDateLanes: false,
      autoLayout: false,
      timeGuide: 'hidden',
    });
    expect(hidden.tasks[A]?.point).toEqual({ x: 123, y: 45 });
    expect(hidden.tasks[B]?.point).toEqual({ x: 456, y: 78 });

    const shown = layoutBoard(tasks, [], {
      showDateLanes: true,
      autoLayout: false,
      timeGuide: 'shown',
    });
    expect(shown.tasks[A]?.point.x).toBe(123);
    expect(shown.tasks[B]?.point.x).toBe(456);
    expect(tasks[0].manualPosition).toEqual({ x: 123, y: 45 });
    expect(tasks[1].manualPosition).toEqual({ x: 456, y: 78 });
  });

  it('supports every required lanes/auto-layout combination without losing Tasks', () => {
    for (const showDateLanes of [true, false]) {
      for (const autoLayout of [true, false]) {
        const result = layoutBoard(
          [input(A, '2026-09-15'), input(B), input(C, '2026-09-16')],
          [
            { fromTaskId: A, toTaskId: B },
            { fromTaskId: B, toTaskId: C },
          ],
          { showDateLanes, autoLayout, timeGuide: 'auto' },
        );
        expect(Object.keys(result.tasks)).toHaveLength(3);
      }
    }
  });
});
