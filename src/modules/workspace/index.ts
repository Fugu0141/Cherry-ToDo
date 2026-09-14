export {
  CHERRY_V2_SCHEMA_VERSION,
  validateWorkspaceDocument,
  type TabDocument,
  type WorkspaceDocument,
  type WorkspaceValidationError,
} from './domain/workspace';

export {
  ApplicationStore,
  type ApplicationError,
  type ConnectFlowInput,
  type MutationOutcome,
  type MutationPreview,
  type UpdateAnnotationInput,
  type UpdateTaskInput,
} from './application/application-store';

export type { CompletionImpactPlan } from './application/semantic-transaction';

export {
  commitPreparedWorkspaceCandidate,
  prepareWorkspaceCandidate,
  type PreparedWorkspaceCandidate,
  type WorkspaceCandidateError,
} from './application/workspace-candidate';

export {
  WorkspaceRepositoryCorruptDataError,
  workspaceSummary,
  type WorkspaceRepository,
  type WorkspaceSaveResult,
  type WorkspaceSummary,
} from './ports/workspace-repository';

export type { WorkspaceCodec, WorkspaceDecodeError } from './ports/workspace-codec';
