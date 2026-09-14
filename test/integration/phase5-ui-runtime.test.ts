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

describe('Phase 5 UI runtime vertical slice', () => {
  it('supports Start -> workspace -> Tasks -> Flow -> List through the formal UI contract', async () => {
    const application = createBrowserApplicationComposition({ storage: new FakeStorage() });
    const runtime = new CherryUIRuntime(application, 'ja');

    await runtime.boot();
    expect(runtime.getScreen().kind).toBe('storage-decision');

    expect(await runtime.intents.storage.notNow()).toEqual({ kind: 'ok' });
    expect(runtime.getScreen().kind).toBe('start');

    expect(await runtime.intents.workspace.create({ name: 'Phase 5 Workspace' })).toEqual({
      kind: 'ok',
    });
    expect(workspaceScreen(runtime).workspaceName).toBe('Phase 5 Workspace');
    expect(workspaceScreen(runtime).activeView).toBe('board');

    await runtime.intents.task.create({ title: 'A' });
    await runtime.intents.task.create({ title: 'B' });
    await runtime.intents.task.create({ title: 'C' });

    let workspace = workspaceScreen(runtime);
    expect(workspace.tasks.map((task) => task.title)).toEqual(['A', 'B', 'C']);

    const [a, b, c] = workspace.tasks;
    if (a === undefined || b === undefined || c === undefined) {
      throw new Error('Expected three Tasks.');
    }

    expect(
      await runtime.intents.flow.connect({
        fromTaskId: a.id,
        toTaskId: b.id,
        kind: 'continuation',
      }),
    ).toEqual({ kind: 'ok' });
    expect(
      await runtime.intents.flow.connect({
        fromTaskId: a.id,
        toTaskId: c.id,
        kind: 'branch',
      }),
    ).toEqual({ kind: 'ok' });

    workspace = workspaceScreen(runtime);
    const derivedGoal = workspace.tasks.find((task) => task.id === a.id);
    expect(derivedGoal?.isDerivedGoal).toBe(true);
    expect(derivedGoal?.canManuallyComplete).toBe(false);
    expect(workspace.connections).toHaveLength(2);

    expect(
      await runtime.intents.task.update({
        taskId: b.id,
        title: 'B edited',
        notes: 'Visible through the UI read model',
      }),
    ).toEqual({ kind: 'ok' });
    expect(await runtime.intents.task.setCompleted(b.id, true)).toEqual({ kind: 'ok' });

    workspace = workspaceScreen(runtime);
    const edited = workspace.tasks.find((task) => task.id === b.id);
    expect(edited?.title).toBe('B edited');
    expect(edited?.notes).toBe('Visible through the UI read model');
    expect(edited?.status).toBe('done');

    expect(await runtime.intents.workspace.setView('list')).toEqual({ kind: 'ok' });
    expect(workspaceScreen(runtime).activeView).toBe('list');
  });
});
