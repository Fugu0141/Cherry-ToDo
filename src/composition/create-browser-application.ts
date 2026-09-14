import {
  BrowserWorkspaceRepository,
  IndexedDbBinaryStore,
} from '../adapters/persistence/browser/index';
import { MemoryWorkspaceRepository } from '../adapters/persistence/memory/index';
import {
  BrowserSessionRepository,
  BrowserStorageConsentStore,
  type StorageLike,
} from '../adapters/session/browser/index';
import { MemorySessionRepository } from '../adapters/session/memory/index';
import { NativeV2WorkspaceCodec } from '../adapters/serialization/index';
import {
  PersistenceCoordinator,
  StartupController,
  type PersistentStorageBundle,
  type WorkspaceRuntimeInitializer,
} from '../modules/startup/index';
import type { WorkspaceRepository } from '../modules/workspace/index';

export interface BrowserApplicationEnvironment {
  readonly storage: StorageLike;
  readonly indexedDb?: IDBFactory;
}

export interface BrowserApplicationComposition {
  readonly persistence: PersistenceCoordinator;
  readonly startup: StartupController;
}

export interface BrowserApplicationCompositionOptions {
  readonly initializeWorkspaceRuntime?: WorkspaceRuntimeInitializer;
  readonly createPersistentWorkspaceRepository?: () => WorkspaceRepository;
}

function createPersistentBundle(
  environment: BrowserApplicationEnvironment,
  createPersistentWorkspaceRepository: () => WorkspaceRepository,
): PersistentStorageBundle {
  const workspaceRepository = createPersistentWorkspaceRepository();
  const sessionRepository = new BrowserSessionRepository(environment.storage);

  return {
    workspaceRepository,
    sessionRepository,
    async clearAll(): Promise<void> {
      for (const summary of await workspaceRepository.list()) {
        await workspaceRepository.delete(summary.id);
      }
      await sessionRepository.clear();
    },
  };
}

export function createBrowserApplicationComposition(
  environment: BrowserApplicationEnvironment,
  options: BrowserApplicationCompositionOptions = {},
): BrowserApplicationComposition {
  const codec = new NativeV2WorkspaceCodec();
  const memoryWorkspaceRepository = new MemoryWorkspaceRepository();
  const memorySessionRepository = new MemorySessionRepository();
  const consentStore = new BrowserStorageConsentStore(environment.storage);

  const createPersistentWorkspaceRepository =
    options.createPersistentWorkspaceRepository ??
    (() => {
      if (environment.indexedDb === undefined) {
        throw new Error('IndexedDB is unavailable in this browser environment.');
      }
      return new BrowserWorkspaceRepository(
        new IndexedDbBinaryStore(environment.indexedDb),
        codec,
      );
    });

  const persistence = new PersistenceCoordinator(
    memoryWorkspaceRepository,
    memorySessionRepository,
    consentStore,
    () =>
      Promise.resolve(
        createPersistentBundle(environment, createPersistentWorkspaceRepository),
      ),
  );

  const startup = new StartupController(
    persistence,
    options.initializeWorkspaceRuntime,
  );

  return { persistence, startup };
}
