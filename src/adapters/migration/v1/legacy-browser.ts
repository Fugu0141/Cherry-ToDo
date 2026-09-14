import { prepareV1Migration, type PreparedV1Migration, type V1MigrationOptions } from './index';

export const V1_WORKSPACE_STORAGE_KEY = 'cherry-workspace-v1';
export const V1_TASK_STORAGE_KEYS = [
  'quest-sticky-todo-v10',
  'quest-sticky-todo-v9',
  'quest-sticky-todo-v8',
  'quest-sticky-todo-v6',
  'quest-sticky-todo-v5',
  'quest-sticky-todo-v4',
  'quest-sticky-todo-v3',
  'quest-sticky-todo-v2',
] as const;

export type LegacyBrowserRecoveryResult =
  | { readonly kind: 'none' }
  | {
      readonly kind: 'prepared';
      readonly sourceKey: string;
      readonly migration: PreparedV1Migration;
    }
  | {
      readonly kind: 'failed';
      readonly sourceKey: string;
      readonly message: string;
    };

export interface LegacyBrowserStorageReader {
  getItem(key: string): string | null;
}

function safeRead(storage: LegacyBrowserStorageReader, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

export function recoverLegacyBrowserV1(
  storage: LegacyBrowserStorageReader,
  options: V1MigrationOptions = {},
): LegacyBrowserRecoveryResult {
  const workspaceRaw = safeRead(storage, V1_WORKSPACE_STORAGE_KEY);
  if (workspaceRaw !== null && workspaceRaw.trim().length > 0) {
    const prepared = prepareV1Migration(workspaceRaw, options);
    return prepared.ok
      ? { kind: 'prepared', sourceKey: V1_WORKSPACE_STORAGE_KEY, migration: prepared.value }
      : {
          kind: 'failed',
          sourceKey: V1_WORKSPACE_STORAGE_KEY,
          message: prepared.error.message,
        };
  }

  for (const key of V1_TASK_STORAGE_KEYS) {
    const raw = safeRead(storage, key);
    if (raw === null || raw.trim().length === 0) continue;
    let state: unknown;
    try {
      state = JSON.parse(raw) as unknown;
    } catch {
      return { kind: 'failed', sourceKey: key, message: 'Legacy task storage is not valid JSON.' };
    }
    const now = options.now ?? new Date().toISOString();
    const wrapped = {
      version: 1,
      activeTabId: 'legacy-tab',
      tabs: [
        {
          id: 'legacy-tab',
          name: 'Recovered legacy tasks',
          state,
          updatedAt: now,
        },
      ],
      updatedAt: now,
    };
    const prepared = prepareV1Migration(wrapped, options);
    return prepared.ok
      ? { kind: 'prepared', sourceKey: key, migration: prepared.value }
      : { kind: 'failed', sourceKey: key, message: prepared.error.message };
  }

  return { kind: 'none' };
}
