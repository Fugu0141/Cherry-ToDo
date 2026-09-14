import { describe, expect, it } from 'vitest';

import { createBrowserApplicationComposition } from '../../src/composition/create-browser-application';
import { CherryUIRuntime } from '../../src/composition/cherry-ui-runtime';
import type { UIActionResult, WorkspaceScreenModel } from '../../src/ui-contract/index';

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

function workspaceScreen(runtime: CherryUIRuntime): WorkspaceScreenModel {
  const screen = runtime.getScreen();
  expect(screen.kind).toBe('workspace');
  if (screen.kind !== 'workspace') throw new Error('Expected workspace screen.');
  return screen.workspace;
}

async function acceptIfRequired(
  runtime: CherryUIRuntime,
  result: UIActionResult,
): Promise<UIActionResult> {
  if (result.kind !== 'confirmation-required') return result;
  return runtime.intents.confirmation.confirm(result.confirmation.id);
}

describe('Phase 6D desktop maintenance', () => {
  it('supports linear Flow reorder, disconnect, scoped deletion and Undo/Redo through the UI contract', async () => {
    const application = createBrowserApplicationComposition({ storage: new FakeStorage() });
    const runtime = new CherryUIRuntime(application, 'ja');

    await runtime.boot();
    expect(await runtime.intents.storage.notNow()).toEqual({ kind: 'ok' });
    expect(await runtime.intents.workspace.create({ name: 'Phase 6D Workspace' })).toEqual({
      kind: 'ok',
    });

    await runtime.intents.task.create({ title: 'A' });
    await runtime.intents.task.create({ title: 'B' });
    await runtime.intents.task.create({ title: 'C' });

    let workspace = workspaceScreen(runtime);
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
        fromTaskId: b.id,
        toTaskId: c.id,
        kind: 'continuation',
      }),
    ).toEqual({ kind: 'ok' });

    workspace = workspaceScreen(runtime);
    expect(workspace.linearFlowOrder).toEqual([a.id, b.id, c.id]);
    expect(workspace.canUndo).toBe(true);
    expect(workspace.canRedo).toBe(false);

    expect(await runtime.intents.flow.reorder([b.id, a.id, c.id])).toEqual({ kind: 'ok' });
    workspace = workspaceScreen(runtime);
    expect(workspace.linearFlowOrder).toEqual([b.id, a.id, c.id]);

    expect(await runtime.intents.history.undo()).toEqual({ kind: 'ok' });
    expect(workspaceScreen(runtime).linearFlowOrder).toEqual([a.id, b.id, c.id]);
    expect(workspaceScreen(runtime).canRedo).toBe(true);

    expect(await runtime.intents.history.redo()).toEqual({ kind: 'ok' });
    workspace = workspaceScreen(runtime);
    expect(workspace.linearFlowOrder).toEqual([b.id, a.id, c.id]);

    const firstEdge = workspace.connections.find(
      (edge) => edge.fromTaskId === b.id && edge.toTaskId === a.id,
    );
    if (firstEdge === undefined) throw new Error('Expected B -> A connection.');

    expect(await runtime.intents.flow.disconnect(firstEdge.id)).toEqual({ kind: 'ok' });
    workspace = workspaceScreen(runtime);
    expect(workspace.connections).toHaveLength(1);
    expect(workspace.linearFlowOrder).toBeNull();

    expect(await runtime.intents.history.undo()).toEqual({ kind: 'ok' });
    workspace = workspaceScreen(runtime);
    expect(workspace.connections).toHaveLength(2);
    expect(workspace.linearFlowOrder).toEqual([b.id, a.id, c.id]);

    expect(await acceptIfRequired(runtime, await runtime.intents.task.deleteOnly(a.id))).toEqual({
      kind: 'ok',
    });
    workspace = workspaceScreen(runtime);
    expect(workspace.tasks.map((task) => task.id)).toEqual([b.id, c.id]);
    expect(workspace.connections).toHaveLength(1);
    expect(workspace.connections[0]).toMatchObject({ fromTaskId: b.id, toTaskId: c.id });

    expect(await runtime.intents.history.undo()).toEqual({ kind: 'ok' });
    workspace = workspaceScreen(runtime);
    expect(workspace.tasks).toHaveLength(3);
    expect(workspace.linearFlowOrder).toEqual([b.id, a.id, c.id]);

    expect(
      await acceptIfRequired(runtime, await runtime.intents.task.deleteDownstream(a.id)),
    ).toEqual({ kind: 'ok' });
    workspace = workspaceScreen(runtime);
    expect(workspace.tasks.map((task) => task.id)).toEqual([b.id]);
    expect(workspace.connections).toHaveLength(0);

    expect(await runtime.intents.history.undo()).toEqual({ kind: 'ok' });
    workspace = workspaceScreen(runtime);
    expect(workspace.tasks).toHaveLength(3);
    expect(workspace.linearFlowOrder).toEqual([b.id, a.id, c.id]);
  });
});
