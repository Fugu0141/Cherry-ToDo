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

function workspaceScreen(runtime: CherryUIRuntime) {
  const screen = runtime.getScreen();
  if (screen.kind !== 'workspace') throw new Error('Expected workspace screen.');
  return screen.workspace;
}

describe('Phase 6A desktop Board layout', () => {
  it('combines DAG layout and date lanes without rewriting Schedule', async () => {
    const runtime = new CherryUIRuntime(
      createBrowserApplicationComposition({ storage: new FakeStorage() }),
      'ja',
    );
    await runtime.boot();
    await runtime.intents.storage.notNow();
    await runtime.intents.workspace.create({ name: 'Board Layout' });

    for (const title of ['A', 'B', 'C', 'D']) {
      expect(await runtime.intents.task.create({ title })).toEqual({ kind: 'ok' });
    }

    let workspace = workspaceScreen(runtime);
    const [a, b, c, d] = workspace.tasks;
    if (a === undefined || b === undefined || c === undefined || d === undefined) {
      throw new Error('Expected four Tasks.');
    }

    await runtime.intents.flow.connect({
      fromTaskId: a.id,
      toTaskId: b.id,
      kind: 'continuation',
    });
    await runtime.intents.flow.connect({
      fromTaskId: a.id,
      toTaskId: c.id,
      kind: 'branch',
    });
    await runtime.intents.flow.connect({
      fromTaskId: b.id,
      toTaskId: d.id,
      kind: 'continuation',
    });
    await runtime.intents.flow.connect({
      fromTaskId: c.id,
      toTaskId: d.id,
      kind: 'continuation',
    });

    expect(
      await runtime.intents.task.setSchedule(b.id, { kind: 'date', date: '2026-09-15' }),
    ).toEqual({ kind: 'ok' });
    expect(
      await runtime.intents.task.setSchedule(c.id, {
        kind: 'datetime',
        date: '2026-09-16',
        time: '14:30',
      }),
    ).toEqual({ kind: 'ok' });

    workspace = workspaceScreen(runtime);
    expect(workspace.board.settings).toEqual({
      showDateLanes: true,
      autoLayout: true,
      timeGuide: 'auto',
    });
    expect(workspace.board.lanes.map((lane) => lane.id)).toEqual([
      'date:2026-09-15',
      'date:2026-09-16',
      'undated',
    ]);

    const beforeSchedules = Object.fromEntries(
      workspace.tasks.map((task) => [task.id, task.schedule]),
    );
    const byId = new Map(workspace.tasks.map((task) => [task.id, task]));
    expect(byId.get(a.id)?.position).not.toBeNull();
    expect(byId.get(d.id)?.position).not.toBeNull();
    expect((byId.get(d.id)?.position?.x ?? 0) > (byId.get(b.id)?.position?.x ?? 0)).toBe(true);

    expect(
      await runtime.intents.workspace.setBoardSettings({
        showDateLanes: false,
        autoLayout: true,
        timeGuide: 'shown',
      }),
    ).toEqual({ kind: 'ok' });

    workspace = workspaceScreen(runtime);
    expect(workspace.board.lanes.map((lane) => lane.id)).toEqual(['all']);
    expect(workspace.board.settings.timeGuide).toBe('shown');
    expect(Object.fromEntries(workspace.tasks.map((task) => [task.id, task.schedule]))).toEqual(
      beforeSchedules,
    );

    expect(
      await runtime.intents.workspace.setBoardSettings({
        showDateLanes: true,
        autoLayout: false,
        timeGuide: 'hidden',
      }),
    ).toEqual({ kind: 'ok' });
    workspace = workspaceScreen(runtime);
    expect(workspace.board.settings.autoLayout).toBe(false);
    expect(workspace.tasks.every((task) => task.position !== null)).toBe(true);
    expect(Object.fromEntries(workspace.tasks.map((task) => [task.id, task.schedule]))).toEqual(
      beforeSchedules,
    );
  });
});
