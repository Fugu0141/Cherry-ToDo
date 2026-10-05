import { describe, expect, it } from 'vitest';

import { layoutBoard, type BoardLayoutEdgeInput } from '../../src/modules/board/index';
import { parseTaskId, type TaskId } from '../../src/shared/ids/index';

function unwrap<T>(result: { readonly ok: true; readonly value: T } | { readonly ok: false }): T {
  if (!result.ok) throw new Error('Invalid fixture value.');
  return result.value;
}

function taskId(value: string): TaskId {
  return unwrap(parseTaskId(value));
}

const root = taskId('root');
const first = taskId('Z-task');
const second = taskId('A-task');
const third = taskId('M-task');

const edges: readonly BoardLayoutEdgeInput[] = [
  { fromTaskId: root, toTaskId: first, kind: 'branch', order: 0 },
  { fromTaskId: root, toTaskId: second, kind: 'branch', order: 1 },
  { fromTaskId: root, toTaskId: third, kind: 'branch', order: 2 },
];

function tasks(scheduleDate: string | null) {
  return [root, first, second, third].map((id) => ({ id, scheduleDate }));
}

describe('issue #287 semantic branch order', () => {
  it('keeps branch order on the desktop cross axis even when Task IDs sort differently', () => {
    const layout = layoutBoard(
      tasks(null),
      edges,
      { showDateLanes: false, autoLayout: true, timeGuide: 'auto' },
      'horizontal',
    );

    expect(layout.tasks[first]?.point.y).toBeLessThan(layout.tasks[second]?.point.y ?? Infinity);
    expect(layout.tasks[second]?.point.y).toBeLessThan(layout.tasks[third]?.point.y ?? Infinity);
  });

  it('keeps branch order on the mobile cross axis', () => {
    const layout = layoutBoard(
      tasks(null),
      edges,
      { showDateLanes: false, autoLayout: true, timeGuide: 'auto' },
      'vertical',
    );

    expect(layout.tasks[first]?.point.x).toBeLessThan(layout.tasks[second]?.point.x ?? Infinity);
    expect(layout.tasks[second]?.point.x).toBeLessThan(layout.tasks[third]?.point.x ?? Infinity);
  });

  it('keeps the same semantic branch order with date lanes enabled', () => {
    const desktop = layoutBoard(
      tasks('2026-10-05'),
      edges,
      { showDateLanes: true, autoLayout: true, timeGuide: 'auto' },
      'horizontal',
    );
    const mobile = layoutBoard(
      tasks('2026-10-05'),
      edges,
      { showDateLanes: true, autoLayout: true, timeGuide: 'auto' },
      'vertical',
    );

    expect(desktop.tasks[first]?.point.y).toBeLessThan(desktop.tasks[second]?.point.y ?? Infinity);
    expect(desktop.tasks[second]?.point.y).toBeLessThan(desktop.tasks[third]?.point.y ?? Infinity);
    expect(mobile.tasks[first]?.point.x).toBeLessThan(mobile.tasks[second]?.point.x ?? Infinity);
    expect(mobile.tasks[second]?.point.x).toBeLessThan(mobile.tasks[third]?.point.x ?? Infinity);
  });
});
