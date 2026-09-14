import { describe, expect, it } from 'vitest';

import { createBrowserApplicationComposition } from '../../src/composition/create-browser-application';
import { CherryUIRuntime } from '../../src/composition/cherry-ui-runtime';
import {
  beginMobileConnection,
  completeMobileConnection,
} from '../../src/ui/default/interaction/mobile-connection-flow';
import { InteractionCoordinator } from '../../src/ui/default/interaction/interaction-coordinator';

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

describe('Phase 7 mobile Flow vertical slice', () => {
  it('connects existing Tasks with the ordinary UI contract and preserves branch/merge semantics in List', async () => {
    const application = createBrowserApplicationComposition({ storage: new FakeStorage() });
    const runtime = new CherryUIRuntime(application, 'ja');
    const interaction = new InteractionCoordinator();

    await runtime.boot();
    await runtime.intents.storage.notNow();
    await runtime.intents.workspace.create({ name: 'Mobile Flow' });
    for (const title of ['A', 'B', 'C', 'D']) {
      expect(await runtime.intents.task.create({ title })).toEqual({ kind: 'ok' });
    }

    let workspace = workspaceScreen(runtime);
    const task = (title: string) => {
      const found = workspace.tasks.find((candidate) => candidate.title === title);
      if (found === undefined) throw new Error(`Missing Task ${title}`);
      return found;
    };

    const connect = async (
      fromTaskId: string,
      toTaskId: string,
      kind: 'continuation' | 'branch' | 'reference',
    ) => {
      expect(beginMobileConnection(interaction, fromTaskId, kind)).not.toBeNull();
      const intent = completeMobileConnection(interaction, toTaskId);
      expect(intent).not.toBeNull();
      if (intent === null) throw new Error('Expected a mobile connection intent.');
      expect(await runtime.intents.flow.connect(intent)).toEqual({ kind: 'ok' });
      workspace = workspaceScreen(runtime);
    };

    await connect(task('A').id, task('B').id, 'continuation');
    await connect(task('A').id, task('C').id, 'branch');
    await connect(task('B').id, task('D').id, 'continuation');
    await connect(task('C').id, task('D').id, 'continuation');

    workspace = workspaceScreen(runtime);
    expect(workspace.tasks.find((candidate) => candidate.title === 'A')?.isDerivedGoal).toBe(true);
    expect(workspace.tasks.find((candidate) => candidate.title === 'D')?.isMergeTarget).toBe(true);
    expect(workspace.connections).toHaveLength(4);

    expect(await runtime.intents.workspace.setView('list')).toEqual({ kind: 'ok' });
    workspace = workspaceScreen(runtime);
    expect(workspace.activeView).toBe('list');
    expect(workspace.connections.map((edge) => edge.kind)).toEqual([
      'continuation',
      'branch',
      'continuation',
      'continuation',
    ]);
    expect(workspace.tasks.find((candidate) => candidate.title === 'A')?.isDerivedGoal).toBe(true);
    expect(workspace.tasks.find((candidate) => candidate.title === 'D')?.isMergeTarget).toBe(true);
  });
});
