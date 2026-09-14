import {
  validateWorkspaceDocument,
  WorkspaceRepositoryCorruptDataError,
  workspaceSummary,
  type WorkspaceCodec,
  type WorkspaceDocument,
  type WorkspaceRepository,
  type WorkspaceSaveResult,
  type WorkspaceSummary,
} from '../../../modules/workspace/index';
import { parseWorkspaceId, type WorkspaceId } from '../../../shared/ids/index';

export interface BrowserBinaryStore {
  listKeys(): Promise<readonly string[]>;
  get(key: string): Promise<Uint8Array | null>;
  put(key: string, value: Uint8Array): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed.'));
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () =>
      reject(transaction.error ?? new Error('IndexedDB transaction aborted.'));
    transaction.onerror = () =>
      reject(transaction.error ?? new Error('IndexedDB transaction failed.'));
  });
}

export class IndexedDbBinaryStore implements BrowserBinaryStore {
  readonly #factory: IDBFactory;
  readonly #databaseName: string;
  readonly #storeName: string;
  #databasePromise: Promise<IDBDatabase> | null = null;

  constructor(factory: IDBFactory, databaseName = 'cherry-v2', storeName = 'workspaces') {
    this.#factory = factory;
    this.#databaseName = databaseName;
    this.#storeName = storeName;
  }

  async listKeys(): Promise<readonly string[]> {
    const database = await this.#database();
    const transaction = database.transaction(this.#storeName, 'readonly');
    const done = transactionDone(transaction);
    const keys = await requestResult(transaction.objectStore(this.#storeName).getAllKeys());
    await done;

    return keys.map((key) => {
      if (typeof key !== 'string') {
        throw new Error('Cherry IndexedDB contains a non-string workspace key.');
      }
      return key;
    });
  }

  async get(key: string): Promise<Uint8Array | null> {
    const database = await this.#database();
    const transaction = database.transaction(this.#storeName, 'readonly');
    const done = transactionDone(transaction);
    const request = transaction.objectStore(this.#storeName).get(key) as IDBRequest<unknown>;
    const value: unknown = await requestResult(request);
    await done;

    if (value === undefined) return null;
    if (value instanceof Uint8Array) return value.slice();
    if (value instanceof ArrayBuffer) return new Uint8Array(value.slice(0));
    throw new Error(`IndexedDB workspace value for "${key}" is not binary data.`);
  }

  async put(key: string, value: Uint8Array): Promise<void> {
    const database = await this.#database();
    const transaction = database.transaction(this.#storeName, 'readwrite');
    const done = transactionDone(transaction);
    transaction.objectStore(this.#storeName).put(value.slice(), key);
    await done;
  }

  async delete(key: string): Promise<void> {
    const database = await this.#database();
    const transaction = database.transaction(this.#storeName, 'readwrite');
    const done = transactionDone(transaction);
    transaction.objectStore(this.#storeName).delete(key);
    await done;
  }

  async clear(): Promise<void> {
    const database = await this.#database();
    const transaction = database.transaction(this.#storeName, 'readwrite');
    const done = transactionDone(transaction);
    transaction.objectStore(this.#storeName).clear();
    await done;
  }

  #database(): Promise<IDBDatabase> {
    this.#databasePromise ??= new Promise((resolve, reject) => {
      const request = this.#factory.open(this.#databaseName, 1);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(this.#storeName)) {
          database.createObjectStore(this.#storeName);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB.'));
      request.onblocked = () => reject(new Error('Opening Cherry IndexedDB was blocked.'));
    });
    return this.#databasePromise;
  }
}

export class BrowserWorkspaceRepository implements WorkspaceRepository {
  readonly #store: BrowserBinaryStore;
  readonly #codec: WorkspaceCodec;

  constructor(store: BrowserBinaryStore, codec: WorkspaceCodec) {
    this.#store = store;
    this.#codec = codec;
  }

  async list(): Promise<readonly WorkspaceSummary[]> {
    const summaries: WorkspaceSummary[] = [];
    for (const key of await this.#store.listKeys()) {
      const parsedId = parseWorkspaceId(key);
      if (!parsedId.ok) {
        throw new Error(`Persistent workspace key "${key}" is invalid.`);
      }
      const document = await this.load(parsedId.value);
      if (document !== null) summaries.push(workspaceSummary(document));
    }
    return summaries.sort(
      (left, right) => left.name.localeCompare(right.name) || left.id.localeCompare(right.id),
    );
  }

  async load(id: WorkspaceId): Promise<WorkspaceDocument | null> {
    const bytes = await this.#store.get(id);
    if (bytes === null) return null;

    const decoded = this.#codec.decode(bytes);
    if (!decoded.ok) {
      throw new WorkspaceRepositoryCorruptDataError(id, decoded.error.message);
    }
    if (decoded.value.id !== id) {
      throw new WorkspaceRepositoryCorruptDataError(
        id,
        `stored document id is "${decoded.value.id}"`,
      );
    }
    return decoded.value;
  }

  async save(document: WorkspaceDocument, expectedRevision?: number): Promise<WorkspaceSaveResult> {
    const validated = validateWorkspaceDocument(document);
    if (!validated.ok) {
      return { kind: 'invalid-document', errors: validated.error };
    }

    if (expectedRevision !== undefined) {
      const existing = await this.load(document.id);
      const actualRevision = existing?.meta.revision ?? null;
      if (actualRevision !== expectedRevision) {
        return { kind: 'revision-conflict', expectedRevision, actualRevision };
      }
    }

    await this.#store.put(document.id, this.#codec.encode(validated.value));
    return { kind: 'saved', revision: document.meta.revision };
  }

  async delete(id: WorkspaceId): Promise<void> {
    await this.#store.delete(id);
  }

  async clear(): Promise<void> {
    await this.#store.clear();
  }
}

export function createDefaultBrowserWorkspaceRepository(
  codec: WorkspaceCodec,
  factory: IDBFactory | undefined = globalThis.indexedDB,
): BrowserWorkspaceRepository {
  if (factory === undefined) {
    throw new Error('IndexedDB is unavailable in this environment.');
  }
  return new BrowserWorkspaceRepository(new IndexedDbBinaryStore(factory), codec);
}
