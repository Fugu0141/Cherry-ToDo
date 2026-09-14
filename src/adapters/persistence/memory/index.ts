import {
  validateWorkspaceDocument,
  workspaceSummary,
  type WorkspaceDocument,
  type WorkspaceRepository,
  type WorkspaceSaveResult,
  type WorkspaceSummary,
} from '../../../modules/workspace/index';
import type { WorkspaceId } from '../../../shared/ids/index';

function cloneWorkspace(document: WorkspaceDocument): WorkspaceDocument {
  return structuredClone(document);
}

export class MemoryWorkspaceRepository implements WorkspaceRepository {
  readonly #documents = new Map<string, WorkspaceDocument>();

  constructor(initialDocuments: readonly WorkspaceDocument[] = []) {
    for (const document of initialDocuments) {
      const validated = validateWorkspaceDocument(document);
      if (!validated.ok) {
        throw new Error('MemoryWorkspaceRepository requires valid initial documents.');
      }
      this.#documents.set(document.id, cloneWorkspace(document));
    }
  }

  list(): Promise<readonly WorkspaceSummary[]> {
    return Promise.resolve(
      [...this.#documents.values()]
        .map((document) => workspaceSummary(document))
        .sort(
          (left, right) => left.name.localeCompare(right.name) || left.id.localeCompare(right.id),
        ),
    );
  }

  load(id: WorkspaceId): Promise<WorkspaceDocument | null> {
    const document = this.#documents.get(id);
    return Promise.resolve(document === undefined ? null : cloneWorkspace(document));
  }

  save(document: WorkspaceDocument, expectedRevision?: number): Promise<WorkspaceSaveResult> {
    const validated = validateWorkspaceDocument(document);
    if (!validated.ok) {
      return Promise.resolve({ kind: 'invalid-document', errors: validated.error });
    }

    const existing = this.#documents.get(document.id);
    if (expectedRevision !== undefined) {
      const actualRevision = existing?.meta.revision ?? null;
      if (actualRevision !== expectedRevision) {
        return Promise.resolve({ kind: 'revision-conflict', expectedRevision, actualRevision });
      }
    }

    this.#documents.set(document.id, cloneWorkspace(validated.value));
    return Promise.resolve({ kind: 'saved', revision: document.meta.revision });
  }

  delete(id: WorkspaceId): Promise<void> {
    this.#documents.delete(id);
    return Promise.resolve();
  }
}
