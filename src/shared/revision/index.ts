import { err, ok, type Result } from '../result/index';

export interface RevisionMeta {
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly revision: number;
}

export interface RevisionMetaError {
  readonly code: 'invalid-revision' | 'invalid-created-at' | 'invalid-updated-at';
  readonly field: keyof RevisionMeta;
}

export function validateRevisionMeta(
  meta: RevisionMeta,
): Result<RevisionMeta, readonly RevisionMetaError[]> {
  const errors: RevisionMetaError[] = [];

  if (!Number.isSafeInteger(meta.revision) || meta.revision < 0) {
    errors.push({ code: 'invalid-revision', field: 'revision' });
  }

  if (meta.createdAt.trim().length === 0) {
    errors.push({ code: 'invalid-created-at', field: 'createdAt' });
  }

  if (meta.updatedAt.trim().length === 0) {
    errors.push({ code: 'invalid-updated-at', field: 'updatedAt' });
  }

  return errors.length === 0 ? ok(meta) : err(errors);
}
