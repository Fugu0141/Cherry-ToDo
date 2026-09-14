import { describe, expect, it } from 'vitest';

import { createBrowserApplicationComposition } from '../../src/composition/create-browser-application';
import { CherryUIRuntime } from '../../src/composition/cherry-ui-runtime';

class FakeStorage {
  readonly #values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.#values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.#values.set(key, value);
  }

  removeItem(key: string): void {
    this.#values.delete(key);
  }
}

function workspace(runtime: CherryUIRuntime) {
  const screen = runtime.getScreen();
  if (screen.kind !== 'workspace') throw new Error('Expected workspace screen.');
  return screen.workspace;
}

describe('T-REG-222 collapsed date-lane drop', () => {
  it('assigns the semantic lane date regardless of collapsed geometry and undoes atomically', async () => {
    const runtime = new CherryUIRuntime(
      createBrowserApplicationComposition({ storage: new FakeStorage() }),
      'ja',
    );
    await runtime.boot();
    await runtime.intents.storage.notNow();
    await runtime.intents.workspace.create({ name: 'Regression' });
    await runtime.intents.task.create({ title: 'Lane anchor' });
    await runtime.intents.task.create({ title: 'Dragged' });

    let model = workspace(runtime);
    const anchor = model.tasks[0];
    const dragged = model.tasks[1];
    if (anchor === undefined || dragged === undefined) throw new Error('Expected Tasks.');

    await runtime.intents.task.setSchedule(anchor.id, { kind: 'date', date: '2026-09-20' });
    model = workspace(runtime);
    expect(model.board.lanes.some((lane) => lane.date === '2026-09-20')).toBe(true);

    const dropped = await runtime.intents.board.dropTask({
      taskId: dragged.id,
      target: {
        kind: 'date-lane',
        date: '2026-09-20',
        point: { x: 20, y: 0 },
        collapsed: true,
      },
    });
    expect(dropped).toEqual({ kind: 'ok' });

    model = workspace(runtime);
    expect(model.tasks.find((task) => task.id === dragged.id)?.schedule).toEqual({
      kind: 'date',
      date: '2026-09-20',
    });

    expect(await runtime.intents.history.undo()).toEqual({ kind: 'ok' });
    model = workspace(runtime);
    expect(model.tasks.find((task) => task.id === dragged.id)?.schedule).toEqual({ kind: 'none' });
  });

  it('commits manual canvas placement only after a resolved drop', async () => {
    const runtime = new CherryUIRuntime(
      createBrowserApplicationComposition({ storage: new FakeStorage() }),
      'ja',
    );
    await runtime.boot();
    await runtime.intents.storage.notNow();
    await runtime.intents.workspace.create({ name: 'Manual Board' });
    await runtime.intents.task.create({ title: 'Move me' });

    let model = workspace(runtime);
    const task = model.tasks[0];
    if (task === undefined) throw new Error('Expected Task.');
    await runtime.intents.workspace.setBoardSettings({
      showDateLanes: false,
      autoLayout: false,
      timeGuide: 'hidden',
    });

    expect(
      await runtime.intents.board.dropTask({
        taskId: task.id,
        target: { kind: 'canvas', point: { x: 420, y: 180 } },
      }),
    ).toEqual({ kind: 'ok' });
    model = workspace(runtime);
    expect(model.tasks.find((candidate) => candidate.id === task.id)?.position).toEqual({
      x: 420,
      y: 180,
    });
  });
});
