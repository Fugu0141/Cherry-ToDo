import { err, ok, type Result } from '../../../shared/result/index';
import {
  prepareV1Migration,
  type PreparedV1Migration,
  type V1MigrationError,
  type V1MigrationOptions,
} from './index';

export interface V1EncryptedEnvelope {
  readonly format: 'cherry-workspace-encrypted';
  readonly version: 1;
  readonly kdf: {
    readonly name: 'PBKDF2';
    readonly hash: 'SHA-256';
    readonly iterations: 250000;
    readonly salt: string;
  };
  readonly cipher: {
    readonly name: 'AES-GCM';
    readonly iv: string;
  };
  readonly data: string;
}

export type V1EncryptedMigrationError =
  | { readonly code: 'invalid-envelope'; readonly message: string }
  | { readonly code: 'invalid-credentials'; readonly message: string }
  | { readonly code: 'crypto-unavailable'; readonly message: string }
  | { readonly code: 'migration-failed'; readonly cause: V1MigrationError };

type UnknownRecord = Readonly<Record<string, unknown>>;

function isRecord(value: unknown): value is UnknownRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function parseEnvelope(input: unknown): Result<V1EncryptedEnvelope, V1EncryptedMigrationError> {
  let parsed: unknown = input;
  if (typeof input === 'string') {
    try {
      parsed = JSON.parse(input);
    } catch {
      return err({ code: 'invalid-envelope', message: 'Encrypted Cherry file is not valid JSON.' });
    }
  }
  if (!isRecord(parsed) || !isRecord(parsed.kdf) || !isRecord(parsed.cipher)) {
    return err({ code: 'invalid-envelope', message: 'Encrypted Cherry envelope is malformed.' });
  }
  if (
    parsed.format !== 'cherry-workspace-encrypted' ||
    parsed.version !== 1 ||
    parsed.kdf.name !== 'PBKDF2' ||
    parsed.kdf.hash !== 'SHA-256' ||
    parsed.kdf.iterations !== 250000 ||
    typeof parsed.kdf.salt !== 'string' ||
    parsed.cipher.name !== 'AES-GCM' ||
    typeof parsed.cipher.iv !== 'string' ||
    typeof parsed.data !== 'string'
  ) {
    return err({ code: 'invalid-envelope', message: 'Unsupported encrypted Cherry V1 envelope.' });
  }
  return ok(parsed as unknown as V1EncryptedEnvelope);
}

function fromBase64(value: string): Uint8Array | null {
  try {
    const binary = atob(value);
    const result = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) result[index] = binary.charCodeAt(index);
    return result;
  } catch {
    return null;
  }
}

export async function decryptV1CherryEnvelope(
  input: unknown,
  passphrase: string,
  cryptoProvider: Crypto | undefined = globalThis.crypto,
): Promise<Result<unknown, V1EncryptedMigrationError>> {
  const envelope = parseEnvelope(input);
  if (!envelope.ok) return envelope;
  if (cryptoProvider?.subtle === undefined) {
    return err({ code: 'crypto-unavailable', message: 'Web Crypto is unavailable.' });
  }
  const salt = fromBase64(envelope.value.kdf.salt);
  const iv = fromBase64(envelope.value.cipher.iv);
  const ciphertext = fromBase64(envelope.value.data);
  if (salt === null || iv === null || ciphertext === null || salt.length === 0 || iv.length === 0) {
    return err({
      code: 'invalid-envelope',
      message: 'Encrypted Cherry envelope contains invalid base64.',
    });
  }

  try {
    const material = await cryptoProvider.subtle.importKey(
      'raw',
      new TextEncoder().encode(passphrase),
      'PBKDF2',
      false,
      ['deriveKey'],
    );
    const key = await cryptoProvider.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 250000,
        hash: 'SHA-256',
      },
      material,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt'],
    );
    const plaintext = await cryptoProvider.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
    return ok(JSON.parse(new TextDecoder().decode(plaintext)) as unknown);
  } catch {
    return err({
      code: 'invalid-credentials',
      message: 'The passphrase is incorrect or the encrypted Cherry file is damaged.',
    });
  }
}

export async function prepareEncryptedV1Migration(
  input: unknown,
  passphrase: string,
  options: V1MigrationOptions = {},
  cryptoProvider: Crypto | undefined = globalThis.crypto,
): Promise<Result<PreparedV1Migration, V1EncryptedMigrationError>> {
  const decrypted = await decryptV1CherryEnvelope(input, passphrase, cryptoProvider);
  if (!decrypted.ok) return decrypted;
  const prepared = prepareV1Migration(decrypted.value, options);
  return prepared.ok
    ? ok(prepared.value)
    : err({ code: 'migration-failed', cause: prepared.error });
}
