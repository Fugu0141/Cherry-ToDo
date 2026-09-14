import type { TabId, WorkspaceId } from '../../../shared/ids/index';
import type { WorkspaceRepository } from '../../workspace/index';

export type WorkspaceView = 'board' | 'list';

export interface SessionContext {
  readonly workspaceId: WorkspaceId;
  readonly tabId: TabId;
  readonly view: WorkspaceView;
}

export interface SessionRepository {
  load(): Promise<SessionContext | null>;
  save(context: SessionContext): Promise<void>;
  clear(): Promise<void>;
}

export interface StorageConsentStore {
  isGranted(): Promise<boolean>;
  grant(): Promise<void>;
  revoke(): Promise<void>;
}

export interface PersistentStorageBundle {
  readonly workspaceRepository: WorkspaceRepository;
  readonly sessionRepository: SessionRepository;
  clearAll(): Promise<void>;
}

export type PersistentStorageFactory = () => Promise<PersistentStorageBundle>;
