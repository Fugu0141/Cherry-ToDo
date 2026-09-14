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
  type UpdateTaskInput,
} from './application/application-store';

export type { CompletionImpactPlan } from './application/semantic-transaction';
