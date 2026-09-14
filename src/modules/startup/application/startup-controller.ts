import type { WorkspaceDocument } from '../../workspace/index';
import { PersistenceCoordinator } from './persistence-coordinator';
import type { SessionContext } from '../ports/startup-storage';

export type StartupState =
  | { readonly kind: 'booting' }
  | { readonly kind: 'need-storage-decision' }
  | { readonly kind: 'restoring' }
  | { readonly kind: 'start' }
  | {
      readonly kind: 'workspace';
      readonly workspace: WorkspaceDocument;
      readonly context: SessionContext;
    }
  | { readonly kind: 'recoverable-error'; readonly message: string };

export type WorkspaceRuntimeInitializer = (
  workspace: WorkspaceDocument,
  context: SessionContext,
) => Promise<void>;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown startup error.';
}

export class StartupController {
  readonly #persistence: PersistenceCoordinator;
  readonly #initializeWorkspaceRuntime: WorkspaceRuntimeInitializer;
  #state: StartupState = { kind: 'booting' };

  constructor(
    persistence: PersistenceCoordinator,
    initializeWorkspaceRuntime: WorkspaceRuntimeInitializer = () => Promise.resolve(),
  ) {
    this.#persistence = persistence;
    this.#initializeWorkspaceRuntime = initializeWorkspaceRuntime;
  }

  get state(): StartupState {
    return this.#state;
  }

  async boot(): Promise<StartupState> {
    this.#state = { kind: 'booting' };
    const activation = await this.#persistence.activateStoredConsent();

    if (activation.kind === 'not-granted') {
      this.#state = { kind: 'need-storage-decision' };
      return this.#state;
    }

    if (activation.kind === 'failed') {
      this.#state = { kind: 'recoverable-error', message: activation.message };
      return this.#state;
    }

    return this.#restore();
  }

  async chooseNotNow(): Promise<StartupState> {
    return this.#restore();
  }

  async chooseAllow(): Promise<StartupState> {
    const activation = await this.#persistence.allowPersistence();
    if (activation.kind === 'workspace-conflict') {
      this.#state = {
        kind: 'recoverable-error',
        message: `Persistent storage already contains workspace IDs: ${activation.workspaceIds.join(', ')}`,
      };
      return this.#state;
    }
    if (activation.kind === 'failed') {
      this.#state = { kind: 'recoverable-error', message: activation.message };
      return this.#state;
    }
    return this.#restore();
  }

  async rememberSession(context: SessionContext): Promise<void> {
    await this.#persistence.sessionRepository.save(context);
  }

  async clearSession(): Promise<void> {
    await this.#persistence.sessionRepository.clear();
  }

  async #restore(): Promise<StartupState> {
    this.#state = { kind: 'restoring' };

    try {
      const context = await this.#persistence.sessionRepository.load();
      if (context === null) {
        this.#state = { kind: 'start' };
        return this.#state;
      }

      const workspace = await this.#persistence.workspaceRepository.load(context.workspaceId);
      if (workspace === null || workspace.tabs[context.tabId] === undefined) {
        await this.#persistence.sessionRepository.clear();
        this.#state = { kind: 'start' };
        return this.#state;
      }

      this.#state = { kind: 'workspace', workspace, context };
      await this.#initializeWorkspaceRuntime(workspace, context);
      return this.#state;
    } catch (error) {
      this.#state = { kind: 'recoverable-error', message: errorMessage(error) };
      return this.#state;
    }
  }
}
