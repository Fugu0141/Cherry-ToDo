import { describe, expect, it } from 'vitest';

import { MemoryWorkspaceRepository } from '../../src/adapters/persistence/memory/index';
import { MemorySessionRepository } from '../../src/adapters/session/memory/index';
import { createEmptyBoardDocumentState } from '../../src/modules/board/index';
import {
  PersistenceCoordinator,
  StartupController,
  type PersistentStorageBundle,
  type SessionContext,
  type StorageConsentStore,
} from '../../src/modules/startup/index';
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
  if (!result.ok) throw new Error('Invalid startup test fixture.');
  return result.value;
}

const workspaceId: WorkspaceId = unwrap(parseWorkspaceId('startup-workspace'));
const tabId: TabId = unwrap(parseTabId('plan'));

function workspace(): WorkspaceDocument {
  return {
    schemaVersion: CHERRY_V2_SCHEMA_VERSION,
    id: workspaceId,
    name: 'Startup Workspace',
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

function session(overrides: Partial<SessionContext> = {}): SessionContext {
  return {
    workspaceId,
    tabId,
    view: 'board',
    ...overrides,
  };
}

class FakeConsentStore implements StorageConsentStore {
  granted: boolean;
  grantCalls = 0;
  revokeCalls = 0;

  constructor(granted = false) {
    this.granted = granted;
  }

  isGranted(): Promise<boolean> {
    return Promise.resolve(this.granted);
  }

  grant(): Promise<void> {
    this.granted = true;
    this.grantCalls += 1;
    return Promise.resolve();
  }

  revoke(): Promise<void> {
    this.granted = false;
    this.revokeCalls += 1;
    return Promise.resolve();
  }
}

function persistentBundle(
  workspaceRepository = new MemoryWorkspaceRepository(),
  sessionRepository = new MemorySessionRepository(),
): PersistentStorageBundle & { readonly clearCalls: { value: number } } {
  const clearCalls = { value: 0 };
  return {
    workspaceRepository,
    sessionRepository,
    clearCalls,
    async clearAll(): Promise<void> {
      clearCalls.value += 1;
      for (const summary of await workspaceRepository.list()) {
        await workspaceRepository.delete(summary.id);
      }
      await sessionRepository.clear();
    },
  };
}

describe('Phase 4 startup and storage consent', () => {
  it('boots with memory only and Not now never initializes persistent storage', async () => {
    const memoryWorkspaces = new MemoryWorkspaceRepository([workspace()]);
    const memorySession = new MemorySessionRepository();
    const consent = new FakeConsentStore(false);
    const persistent = persistentBundle();
    let persistentFactoryCalls = 0;
    let runtimeInitializations = 0;

    const coordinator = new PersistenceCoordinator(memoryWorkspaces, memorySession, consent, () => {
      persistentFactoryCalls += 1;
      return Promise.resolve(persistent);
    });
    const controller = new StartupController(coordinator, () => {
      runtimeInitializations += 1;
      return Promise.resolve();
    });

    expect((await controller.boot()).kind).toBe('need-storage-decision');
    expect(coordinator.mode).toBe('memory');
    expect(persistentFactoryCalls).toBe(0);
    expect(runtimeInitializations).toBe(0);

    expect((await controller.chooseNotNow()).kind).toBe('start');
    expect(persistentFactoryCalls).toBe(0);
    expect(consent.granted).toBe(false);
    expect(await memoryWorkspaces.load(workspaceId)).toEqual(workspace());
    expect(runtimeInitializations).toBe(0);
  });

  it('Allow migrates the current memory session and only then switches to persistent mode', async () => {
    const currentWorkspace = workspace();
    const currentSession = session();
    const memoryWorkspaces = new MemoryWorkspaceRepository([currentWorkspace]);
    const memorySession = new MemorySessionRepository(currentSession);
    const persistentWorkspaces = new MemoryWorkspaceRepository();
    const persistentSession = new MemorySessionRepository();
    const persistent = persistentBundle(persistentWorkspaces, persistentSession);
    const consent = new FakeConsentStore(false);
    let runtimeInitializations = 0;

    const coordinator = new PersistenceCoordinator(memoryWorkspaces, memorySession, consent, () =>
      Promise.resolve(persistent),
    );
    const controller = new StartupController(coordinator, () => {
      runtimeInitializations += 1;
      return Promise.resolve();
    });

    expect((await controller.boot()).kind).toBe('need-storage-decision');
    const state = await controller.chooseAllow();

    expect(state.kind).toBe('workspace');
    expect(coordinator.mode).toBe('persistent');
    expect(consent.granted).toBe(true);
    expect(consent.grantCalls).toBe(1);
    expect(await persistentWorkspaces.load(workspaceId)).toEqual(currentWorkspace);
    expect(await persistentSession.load()).toEqual(currentSession);
    expect(runtimeInitializations).toBe(1);
  });

  it('restores a valid persistent context on a later boot', async () => {
    const persistent = persistentBundle(
      new MemoryWorkspaceRepository([workspace()]),
      new MemorySessionRepository(session({ view: 'list' })),
    );
    const consent = new FakeConsentStore(true);
    let persistentFactoryCalls = 0;
    let runtimeInitializations = 0;

    const coordinator = new PersistenceCoordinator(
      new MemoryWorkspaceRepository(),
      new MemorySessionRepository(),
      consent,
      () => {
        persistentFactoryCalls += 1;
        return Promise.resolve(persistent);
      },
    );
    const controller = new StartupController(coordinator, (_workspace, context) => {
      expect(context.view).toBe('list');
      runtimeInitializations += 1;
      return Promise.resolve();
    });

    const state = await controller.boot();
    expect(state.kind).toBe('workspace');
    expect(coordinator.mode).toBe('persistent');
    expect(persistentFactoryCalls).toBe(1);
    expect(runtimeInitializations).toBe(1);
  });

  it('falls back to Start for stale context without deleting readable workspace data', async () => {
    const missingTabId = unwrap(parseTabId('missing-tab'));
    const persistentWorkspaces = new MemoryWorkspaceRepository([workspace()]);
    const persistentSession = new MemorySessionRepository(session({ tabId: missingTabId }));
    const persistent = persistentBundle(persistentWorkspaces, persistentSession);
    const consent = new FakeConsentStore(true);
    let runtimeInitializations = 0;

    const coordinator = new PersistenceCoordinator(
      new MemoryWorkspaceRepository(),
      new MemorySessionRepository(),
      consent,
      () => Promise.resolve(persistent),
    );
    const controller = new StartupController(coordinator, () => {
      runtimeInitializations += 1;
      return Promise.resolve();
    });

    expect((await controller.boot()).kind).toBe('start');
    expect(await persistentWorkspaces.load(workspaceId)).toEqual(workspace());
    expect(await persistentSession.load()).toBeNull();
    expect(runtimeInitializations).toBe(0);
  });

  it('refuses to overwrite a persistent workspace with the same ID during Allow', async () => {
    const memoryWorkspace = workspace();
    const persistentWorkspace = { ...workspace(), name: 'Existing Persistent Workspace' };
    const consent = new FakeConsentStore(false);
    const persistentWorkspaces = new MemoryWorkspaceRepository([persistentWorkspace]);
    const persistent = persistentBundle(persistentWorkspaces);

    const coordinator = new PersistenceCoordinator(
      new MemoryWorkspaceRepository([memoryWorkspace]),
      new MemorySessionRepository(),
      consent,
      () => Promise.resolve(persistent),
    );
    const controller = new StartupController(coordinator);

    await controller.boot();
    expect((await controller.chooseAllow()).kind).toBe('recoverable-error');
    expect(coordinator.mode).toBe('memory');
    expect(consent.granted).toBe(false);
    expect(await persistentWorkspaces.load(workspaceId)).toEqual(persistentWorkspace);
  });

  it('requires confirmation before clearing persistence and keeps the session usable afterward', async () => {
    const currentWorkspace = workspace();
    const memoryWorkspaces = new MemoryWorkspaceRepository([currentWorkspace]);
    const memorySession = new MemorySessionRepository(session());
    const consent = new FakeConsentStore(false);
    const persistent = persistentBundle();
    const coordinator = new PersistenceCoordinator(memoryWorkspaces, memorySession, consent, () =>
      Promise.resolve(persistent),
    );

    expect((await coordinator.allowPersistence()).kind).toBe('activated');
    expect(coordinator.mode).toBe('persistent');

    expect(
      await coordinator.disablePersistence({ clearPersistentData: true, confirmed: false }),
    ).toEqual({ kind: 'confirmation-required' });
    expect(coordinator.mode).toBe('persistent');
    expect(consent.granted).toBe(true);
    expect(persistent.clearCalls.value).toBe(0);

    expect(
      await coordinator.disablePersistence({ clearPersistentData: true, confirmed: true }),
    ).toEqual({ kind: 'disabled' });
    expect(coordinator.mode).toBe('memory');
    expect(consent.granted).toBe(false);
    expect(persistent.clearCalls.value).toBe(1);
    expect(await memoryWorkspaces.load(workspaceId)).toEqual(currentWorkspace);
    expect(await memorySession.load()).toEqual(session());
  });
});
