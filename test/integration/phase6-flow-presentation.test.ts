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
  expect(screen.kind).toBe('workspace');
  if (screen.kind !== 'workspace') throw new Error('Expected workspace screen.');
  return screen.workspace;
}

describe('Phase 6C Flow presentation', () => {
  it('projects derived Goal, merge target and directional connector geometry', async () => {
    const runtime = new CherryUIRuntime(
      createBrowserApplicationComposition({ storage: new FakeStorage() }),
      'ja',
    );

    await runtime.boot();
    await runtime.intents.storage.notNow();
    await runtime.intents.workspace.create({ name: 'Flow presentation' });
    await runtime.intents.task.create({ title: 'A' });
    await runtime.intents.task.create({ title: 'B' });
    await runtime.intents.task.create({ title: 'C' });
    await runtime.intents.task.create({ title: 'D' });

    const [a, b, c, d] = workspaceScreen(runtime).tasks;
    if (a === undefined || b === undefined || c === undefined || d === undefined) {
      throw new Error('Expected four Tasks.');
    }

    await runtime.intents.flow.connect({ fromTaskId: a.id, toTaskId: b.id, kind: 'branch' });
    await runtime.intents.flow.connect({ fromTaskId: a.id, toTaskId: c.id, kind: 'branch' });
    await runtime.intents.flow.connect({ fromTaskId: b.id, toTaskId: d.id, kind: 'continuation' });
    await runtime.intents.flow.connect({ fromTaskId: c.id, toTaskId: d.id, kind: 'continuation' });

    const workspace = workspaceScreen(runtime);
    expect(workspace.tasks.find((task) => task.id === a.id)?.isDerivedGoal).toBe(true);
    expect(workspace.tasks.find((task) => task.id === d.id)?.isMergeTarget).toBe(true);
    expect(workspace.connections).toHaveLength(4);
    expect(workspace.connections.every((connection) => connection.path !== null)).toBe(true);
  });
});
