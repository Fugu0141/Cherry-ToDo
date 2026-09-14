import type { WorkspaceRepository } from '../../workspace/index';
import type {
  PersistentStorageBundle,
  PersistentStorageFactory,
  SessionContext,
  SessionRepository,
  StorageConsentStore,
} from '../ports/startup-storage';

export type PersistenceMode = 'memory' | 'persistent';

export type StoredConsentActivationResult =
  | { readonly kind: 'activated' }
  | { readonly kind: 'not-granted' }
  | { readonly kind: 'failed'; readonly message: string };

export type ExplicitPersistenceActivationResult =
  | { readonly kind: 'activated' }
  | { readonly kind: 'workspace-conflict'; readonly workspaceIds: readonly string[] }
  | { readonly kind: 'failed'; readonly message: string };

export type DisablePersistenceResult =
  | { readonly kind: 'disabled' }
  | { readonly kind: 'confirmation-required' }
  | { readonly kind: 'failed'; readonly message: string };

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown storage error.';
}

export class PersistenceCoordinator {
  readonly #memoryWorkspaceRepository: WorkspaceRepository;
  readonly #memorySessionRepository: SessionRepository;
  readonly #consentStore: StorageConsentStore;
  readonly #persistentFactory: PersistentStorageFactory;
  #persistentBundle: PersistentStorageBundle | null = null;
  #workspaceRepository: WorkspaceRepository;
  #sessionRepository: SessionRepository;
  #mode: PersistenceMode = 'memory';

  constructor(
    memoryWorkspaceRepository: WorkspaceRepository,
    memorySessionRepository: SessionRepository,
    consentStore: StorageConsentStore,
    persistentFactory: PersistentStorageFactory,
  ) {
    this.#memoryWorkspaceRepository = memoryWorkspaceRepository;
    this.#memorySessionRepository = memorySessionRepository;
    this.#consentStore = consentStore;
    this.#persistentFactory = persistentFactory;
    this.#workspaceRepository = memoryWorkspaceRepository;
    this.#sessionRepository = memorySessionRepository;
  }

  get mode(): PersistenceMode {
    return this.#mode;
  }

  get workspaceRepository(): WorkspaceRepository {
    return this.#workspaceRepository;
  }

  get sessionRepository(): SessionRepository {
    return this.#sessionRepository;
  }

  async activateStoredConsent(): Promise<StoredConsentActivationResult> {
    try {
      if (!(await this.#consentStore.isGranted())) return { kind: 'not-granted' };
      const bundle = await this.#persistentFactory();
      this.#activateBundle(bundle);
      return { kind: 'activated' };
    } catch (error) {
      return { kind: 'failed', message: errorMessage(error) };
    }
  }

  async allowPersistence(): Promise<ExplicitPersistenceActivationResult> {
    let bundle: PersistentStorageBundle;
    try {
      bundle = await this.#persistentFactory();
    } catch (error) {
      return { kind: 'failed', message: errorMessage(error) };
    }

    const copiedWorkspaceIds: string[] = [];
    let previousPersistentSession: SessionContext | null = null;
    let wroteSession = false;

    try {
      const memorySummaries = await this.#memoryWorkspaceRepository.list();
      const persistentSummaries = await bundle.workspaceRepository.list();
      const persistentIds = new Set(persistentSummaries.map((summary) => String(summary.id)));
      const conflicts = memorySummaries
        .map((summary) => String(summary.id))
        .filter((id) => persistentIds.has(id));

      if (conflicts.length > 0) {
        return { kind: 'workspace-conflict', workspaceIds: conflicts.sort() };
      }

      for (const summary of memorySummaries) {
        const document = await this.#memoryWorkspaceRepository.load(summary.id);
        if (document === null) continue;
        const saved = await bundle.workspaceRepository.save(document);
        if (saved.kind !== 'saved') {
          throw new Error(
            `Failed to copy in-memory workspace "${summary.id}" to persistent storage.`,
          );
        }
        copiedWorkspaceIds.push(String(summary.id));
      }

      previousPersistentSession = await bundle.sessionRepository.load();
      const memorySession = await this.#memorySessionRepository.load();
      if (memorySession !== null) {
        await bundle.sessionRepository.save(memorySession);
        wroteSession = true;
      }

      await this.#consentStore.grant();
      this.#activateBundle(bundle);
      return { kind: 'activated' };
    } catch (error) {
      const persistentSummaries = await bundle.workspaceRepository.list();
      for (const id of copiedWorkspaceIds) {
        const summary = persistentSummaries.find((candidate) => String(candidate.id) === id);
        if (summary !== undefined) await bundle.workspaceRepository.delete(summary.id);
      }

      if (wroteSession) {
        if (previousPersistentSession === null) await bundle.sessionRepository.clear();
        else await bundle.sessionRepository.save(previousPersistentSession);
      }

      return { kind: 'failed', message: errorMessage(error) };
    }
  }

  async disablePersistence(options: {
    readonly clearPersistentData: boolean;
    readonly confirmed: boolean;
  }): Promise<DisablePersistenceResult> {
    if (options.clearPersistentData && !options.confirmed) {
      return { kind: 'confirmation-required' };
    }

    try {
      const persistentBundle = this.#persistentBundle;
      if (this.#mode === 'persistent' && persistentBundle !== null) {
        for (const summary of await persistentBundle.workspaceRepository.list()) {
          const document = await persistentBundle.workspaceRepository.load(summary.id);
          if (document !== null) await this.#memoryWorkspaceRepository.save(document);
        }

        const context = await persistentBundle.sessionRepository.load();
        if (context === null) await this.#memorySessionRepository.clear();
        else await this.#memorySessionRepository.save(context);
      }

      await this.#consentStore.revoke();
      this.#activateMemory();

      if (options.clearPersistentData && persistentBundle !== null) {
        await persistentBundle.clearAll();
      }
      this.#persistentBundle = null;

      return { kind: 'disabled' };
    } catch (error) {
      return { kind: 'failed', message: errorMessage(error) };
    }
  }

  #activateBundle(bundle: PersistentStorageBundle): void {
    this.#persistentBundle = bundle;
    this.#workspaceRepository = bundle.workspaceRepository;
    this.#sessionRepository = bundle.sessionRepository;
    this.#mode = 'persistent';
  }

  #activateMemory(): void {
    this.#workspaceRepository = this.#memoryWorkspaceRepository;
    this.#sessionRepository = this.#memorySessionRepository;
    this.#mode = 'memory';
  }
}
