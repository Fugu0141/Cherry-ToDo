import { err, ok, type Result } from '../../../shared/result/index';
import { validateWorkspaceDocument, type WorkspaceDocument } from '../domain/workspace';
import type { WorkspaceCodec, WorkspaceDecodeError } from '../ports/workspace-codec';
import {
  workspaceSummary,
  type WorkspaceRepository,
  type WorkspaceSaveResult,
  type WorkspaceSummary,
} from '../ports/workspace-repository';

export interface PreparedWorkspaceCandidate {
  readonly document: WorkspaceDocument;
  readonly summary: WorkspaceSummary;
}

export type WorkspaceCandidateError =
  | WorkspaceDecodeError
  | {
      readonly code: 'invalid-workspace';
      readonly message: string;
      readonly causes: ReturnType<typeof validateWorkspaceDocument> extends Result<
        WorkspaceDocument,
        infer E
      >
        ? E
        : never;
    };

export function prepareWorkspaceCandidate(
  codec: WorkspaceCodec,
  bytes: Uint8Array,
): Result<PreparedWorkspaceCandidate, WorkspaceCandidateError> {
  const decoded = codec.decode(bytes);
  if (!decoded.ok) return err(decoded.error);

  const validated = validateWorkspaceDocument(decoded.value);
  if (!validated.ok) {
    return err({
      code: 'invalid-workspace',
      message: 'Decoded data failed Cherry V2 workspace invariants.',
      causes: validated.error,
    });
  }

  return ok({
    document: validated.value,
    summary: workspaceSummary(validated.value),
  });
}

export async function commitPreparedWorkspaceCandidate(
  repository: WorkspaceRepository,
  candidate: PreparedWorkspaceCandidate,
  expectedRevision?: number,
): Promise<WorkspaceSaveResult> {
  return repository.save(candidate.document, expectedRevision);
}
