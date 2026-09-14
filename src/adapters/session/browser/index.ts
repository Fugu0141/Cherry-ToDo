import type {
  SessionContext,
  SessionRepository,
  StorageConsentStore,
  WorkspaceView,
} from '../../../modules/startup/index';
import { parseTabId, parseWorkspaceId } from '../../../shared/ids/index';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const CONSENT_KEY = 'cherry.v2.storage-consent';
const SESSION_KEY = 'cherry.v2.session-context';
const GRANTED_VALUE = 'granted';

function isWorkspaceView(value: unknown): value is WorkspaceView {
  return value === 'board' || value === 'list';
}

export class BrowserStorageConsentStore implements StorageConsentStore {
  readonly #storage: StorageLike;

  constructor(storage: StorageLike) {
    this.#storage = storage;
  }

  isGranted(): Promise<boolean> {
    return Promise.resolve(this.#storage.getItem(CONSENT_KEY) === GRANTED_VALUE);
  }

  grant(): Promise<void> {
    this.#storage.setItem(CONSENT_KEY, GRANTED_VALUE);
    return Promise.resolve();
  }

  revoke(): Promise<void> {
    this.#storage.removeItem(CONSENT_KEY);
    return Promise.resolve();
  }
}

export class BrowserSessionRepository implements SessionRepository {
  readonly #storage: StorageLike;

  constructor(storage: StorageLike) {
    this.#storage = storage;
  }

  load(): Promise<SessionContext | null> {
    const raw = this.#storage.getItem(SESSION_KEY);
    if (raw === null) return Promise.resolve(null);

    try {
      const parsed: unknown = JSON.parse(raw);
      if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return Promise.resolve(null);
      }

      const record = parsed as Record<string, unknown>;
      if (typeof record.workspaceId !== 'string' || typeof record.tabId !== 'string') {
        return Promise.resolve(null);
      }
      if (!isWorkspaceView(record.view)) return Promise.resolve(null);

      const workspaceId = parseWorkspaceId(record.workspaceId);
      const tabId = parseTabId(record.tabId);
      if (!workspaceId.ok || !tabId.ok) return Promise.resolve(null);

      return Promise.resolve({
        workspaceId: workspaceId.value,
        tabId: tabId.value,
        view: record.view,
      });
    } catch {
      return Promise.resolve(null);
    }
  }

  save(context: SessionContext): Promise<void> {
    this.#storage.setItem(
      SESSION_KEY,
      JSON.stringify({
        workspaceId: context.workspaceId,
        tabId: context.tabId,
        view: context.view,
      }),
    );
    return Promise.resolve();
  }

  clear(): Promise<void> {
    this.#storage.removeItem(SESSION_KEY);
    return Promise.resolve();
  }
}
