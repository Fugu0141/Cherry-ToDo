import type { WorkspaceRepository } from '../../../modules/workspace/index';
import {
  commitPreparedV1Migration,
  type PreparedV1Migration,
  type V1MigrationCommitResult,
} from './index';

export type V1MigrationDecision = 'cancel' | 'confirm';

export type V1MigrationResolution =
  | { readonly kind: 'cancelled' }
  | V1MigrationCommitResult;

export function resolvePreparedV1Migration(
  repository: WorkspaceRepository,
  prepared: PreparedV1Migration,
  decision: 'cancel',
): Promise<{ readonly kind: 'cancelled' }>;
export function resolvePreparedV1Migration(
  repository: WorkspaceRepository,
  prepared: PreparedV1Migration,
  decision: 'confirm',
): Promise<V1MigrationCommitResult>;
export function resolvePreparedV1Migration(
  repository: WorkspaceRepository,
  prepared: PreparedV1Migration,
  decision: V1MigrationDecision,
): Promise<V1MigrationResolution> {
  return decision === 'cancel'
    ? Promise.resolve({ kind: 'cancelled' })
    : commitPreparedV1Migration(repository, prepared);
}
