import type { Result } from '../../../shared/result/index';
import type { WorkspaceDocument, WorkspaceValidationError } from '../domain/workspace';

export type WorkspaceDecodeError =
  | { readonly code: 'invalid-utf8'; readonly message: string }
  | { readonly code: 'invalid-json'; readonly message: string }
  | { readonly code: 'invalid-shape'; readonly message: string }
  | {
      readonly code: 'invalid-workspace';
      readonly message: string;
      readonly causes: readonly WorkspaceValidationError[];
    };

export interface WorkspaceCodec {
  encode(document: WorkspaceDocument): Uint8Array;
  decode(bytes: Uint8Array): Result<WorkspaceDocument, WorkspaceDecodeError>;
}
