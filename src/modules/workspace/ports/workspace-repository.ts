import type { WorkspaceId } from '../../../shared/ids/index';
import type { WorkspaceDocument, WorkspaceValidationError } from '../domain/workspace';

export interface WorkspaceSummary {
  readonly id: WorkspaceId;
  readonly name: string;
  readonly revision: number;
  readonly updatedAt: string;
}

export type WorkspaceSaveResult =
  | { readonly kind: 'saved'; readonly revision: number }
  | {
      readonly kind: 'revision-conflict';
      readonly expectedRevision: number;
      readonly actualRevision: number | null;
    }
  | {
      readonly kind: 'invalid-document';
      readonly errors: readonly WorkspaceValidationError[];
    };

export interface WorkspaceRepository {
  list(): Promise<readonly WorkspaceSummary[]>;
  load(id: WorkspaceId): Promise<WorkspaceDocument | null>;
  save(document: WorkspaceDocument, expectedRevision?: number): Promise<WorkspaceSaveResult>;
  delete(id: WorkspaceId): Promise<void>;
}

export class WorkspaceRepositoryCorruptDataError extends Error {
  readonly workspaceId: WorkspaceId;
  readonly reason: string;

  constructor(workspaceId: WorkspaceId, reason: string) {
    super(`Stored workspace "${workspaceId}" is not a readable Cherry V2 document: ${reason}`);
    this.name = 'WorkspaceRepositoryCorruptDataError';
    this.workspaceId = workspaceId;
    this.reason = reason;
  }
}

export function workspaceSummary(document: WorkspaceDocument): WorkspaceSummary {
  return {
    id: document.id,
    name: document.name,
    revision: document.meta.revision,
    updatedAt: document.meta.updatedAt,
  };
}
