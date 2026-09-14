import {
  validateWorkspaceDocument,
  type WorkspaceCodec,
  type WorkspaceDecodeError,
  type WorkspaceDocument,
} from '../../modules/workspace/index';
import { err, ok, type Result } from '../../shared/result/index';

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => canonicalize(item));
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, canonicalize(item)]),
    );
  }
  return value;
}

function invalidShape(message: string): Result<WorkspaceDocument, WorkspaceDecodeError> {
  return err({ code: 'invalid-shape', message });
}

export class NativeV2WorkspaceCodec implements WorkspaceCodec {
  encode(document: WorkspaceDocument): Uint8Array {
    const json = JSON.stringify(canonicalize(document));
    return new TextEncoder().encode(json);
  }

  decode(bytes: Uint8Array): Result<WorkspaceDocument, WorkspaceDecodeError> {
    let text: string;
    try {
      text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch {
      return err({ code: 'invalid-utf8', message: 'Workspace bytes are not valid UTF-8.' });
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text) as unknown;
    } catch {
      return err({ code: 'invalid-json', message: 'Workspace bytes are not valid JSON.' });
    }

    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return invalidShape('Workspace JSON root must be an object.');
    }

    try {
      const validated = validateWorkspaceDocument(parsed as WorkspaceDocument);
      if (!validated.ok) {
        return err({
          code: 'invalid-workspace',
          message: 'Workspace JSON does not satisfy Cherry V2 invariants.',
          causes: validated.error,
        });
      }
      return ok(validated.value);
    } catch {
      return invalidShape('Workspace JSON is missing required nested structures.');
    }
  }
}
