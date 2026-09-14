import { describe, expect, it } from 'vitest';

import { MemoryWorkspaceRepository } from '../../src/adapters/persistence/memory/index';
import { createBrowserApplicationComposition } from '../../src/composition/create-browser-application';
import { createEmptyBoardDocumentState } from '../../src/modules/board/index';
import {
  CHERRY_V2_SCHEMA_VERSION,
  type WorkspaceDocument,
} from '../../src/modules/workspace/index';
import {
  parseTabId,
  parseWorkspaceId,
  type TabId,
  type WorkspaceId,
} from '../../src/shared/ids/index';
import { revisionMeta } from '../domain/fixtures';

function unwrap<T>(result: { readonly ok: true; readonly value: T } | { readonly ok: false }): T {
  if (!result.ok) throw new Error('Invalid Phase 4C test fixture.');
  return result.value;
}

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

const workspaceId: WorkspaceId = unwrap(parseWorkspaceId('browser-composition-workspace'));
const tabId: TabId = unwrap(parseTabId('plan'));

function workspace(): WorkspaceDocument {
  return {
    schemaVersion: CHERRY_V2_SCHEMA_VERSION,
    id: workspaceId,
    name: 'Browser Composition Workspace',
    tabs: {
      [tabId]: {
        id: tabId,
        name: 'Plan',
        tasks: {},
        flowEdges: {},
        annotations: {},
        board: createEmptyBoardDocumentState(),
        meta: revisionMeta,
      },
    },
    tabOrder: [tabId],
    meta: revisionMeta,
  };
}

describe('Phase 4 browser composition', () => {
  it('stays memory-only before consent, persists after Allow, and restores on a later boot', async () => {
    const storage = new FakeStorage();
    const persistentWorkspaces = new MemoryWorkspaceRepository();
    let persistentFactoryCalls = 0;

    const first = createBrowserApplicationComposition(
      { storage },
      {
        createPersistentWorkspaceRepository: () => {
          persistentFactoryCalls += 1;
          return persistentWorkspaces;
        },
      },
    );

    expect((await first.startup.boot()).kind).toBe('need-storage-decision');
    expect(first.persistence.mode).toBe('memory');
    expect(persistentFactoryCalls).toBe(0);

    expect(await first.persistence.workspaceRepository.save(workspace())).toEqual({
      kind: 'saved',
      revision: 0,
    });
    await first.startup.rememberSession({ workspaceId, tabId, view: 'list' });

    const allowed = await first.startup.chooseAllow();
    expect(allowed.kind).toBe('workspace');
    expect(first.persistence.mode).toBe('persistent');
    expect(persistentFactoryCalls).toBe(1);
    expect(await persistentWorkspaces.load(workspaceId)).toEqual(workspace());

    let restoredRuntimeInitializations = 0;
    const second = createBrowserApplicationComposition(
      { storage },
      {
        createPersistentWorkspaceRepository: () => {
          persistentFactoryCalls += 1;
          return persistentWorkspaces;
        },
        initializeWorkspaceRuntime: (_document, context) => {
          expect(context).toEqual({ workspaceId, tabId, view: 'list' });
          restoredRuntimeInitializations += 1;
          return Promise.resolve();
        },
      },
    );

    const restored = await second.startup.boot();
    expect(restored.kind).toBe('workspace');
    expect(second.persistence.mode).toBe('persistent');
    expect(persistentFactoryCalls).toBe(2);
    expect(restoredRuntimeInitializations).toBe(1);
  });

  it('does not require IndexedDB until persistence is actually activated', async () => {
    const storage = new FakeStorage();
    const composition = createBrowserApplicationComposition({ storage });

    expect((await composition.startup.boot()).kind).toBe('need-storage-decision');
    expect(composition.persistence.mode).toBe('memory');
    expect((await composition.startup.chooseNotNow()).kind).toBe('start');
    expect(composition.persistence.mode).toBe('memory');
  });
});
