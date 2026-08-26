// save/crypto.ts — doc 02 §7.2 encrypted transfer codes
// AES-GCM-256 via WebCrypto, fresh 12-byte IV per export, wire format
//   MLC1.<key_id>.<iv_b64url>.<ciphertext_b64url>
// base64url, no padding. Import pipeline is strict-order, fail-closed, and
// never reveals which check failed (single generic auth-failure message).

import { KEY_ID, saveKeyBytes } from './key.js';
import { SAVE_SCHEMA_VERSION } from './validate.js';

export const CODE_PREFIX = 'MLC1';
const IV_BYTES = 12;
const KEY_ID_BYTE = KEY_ID; // 0x01

/** Failure reasons mapped 1:1 onto the §7.2 copy table (strings.json saveio.*). */
export type ImportFailure =
  | 'not_a_code' // garbage / wrong prefix
  | 'damaged' // auth/decrypt failure (generic on purpose)
  | 'wrong_key_version' // unknown key_id byte
  | 'newer_schema' // payload version > current
  | 'schema_invalid'; // failed validation after decrypt

export type ImportOutcome =
  | { ok: true; data: unknown } // validated by caller via validateSaveData pipeline step 5/6
  | { ok: false; reason: ImportFailure };

export function isCryptoAvailable(): boolean {
  return (
    typeof crypto !== 'undefined' &&
    typeof crypto.subtle !== 'undefined' &&
    typeof crypto.subtle.importKey === 'function'
  );
}

// ---- base64url (no padding, no +/) -----------------------------------------

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i] as number);
  }
  const b64 = btoa(binary);
  return b64.replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

function fromBase64Url(text: string): Uint8Array | null {
  if (text.length === 0) return null;
  // Strict alphabet check — reject anything with +, /, = or non-base64 chars.
  if (!/^[A-Za-z0-9_-]+$/.test(text)) return null;
  let b64 = text.replaceAll('-', '+').replaceAll('_', '/');
  while (b64.length % 4 !== 0) b64 += '=';
  try {
    const binary = atob(b64);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

// ---- key handling -----------------------------------------------------------

let cachedKey: CryptoKey | null = null;

async function getAesKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey;
  const raw = saveKeyBytes();
  cachedKey = await crypto.subtle.importKey('raw', raw as unknown as BufferSource, 'AES-GCM', false, [
    'encrypt',
    'decrypt',
  ]);
  return cachedKey;
}

// ---- export -----------------------------------------------------------------

/**
 * Encrypt a §7.1 save JSON string into an MLC1 code.
 * Fresh random 12-byte IV per call — never reuse an IV with this key.
 */
export async function exportSaveCode(saveJson: string): Promise<string> {
  const key = await getAesKey();
  const iv = new Uint8Array(IV_BYTES);
  crypto.getRandomValues(iv);

  const plaintext = new TextEncoder().encode(saveJson);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    key,
    plaintext as unknown as BufferSource,
  );

  const keyIdByte = new Uint8Array([KEY_ID_BYTE]);
  return [
    CODE_PREFIX,
    toBase64Url(keyIdByte),
    toBase64Url(iv),
    toBase64Url(new Uint8Array(ciphertext)),
  ].join('.');
}

// ---- import (strict order, fail closed — doc 02 §7.2) -----------------------

/**
 * Pipeline, in order:
 *  1. trim + verify MLC1 prefix        → not_a_code
 *  2. parse segments, decode IV+ct     → not_a_code
 *  3. key_id known?                    → wrong_key_version
 *  4. decrypt+authenticate             → damaged (generic; never say why)
 *  5. JSON parse                       → schema_invalid (parse is part of payload sanity)
 *  (schema validation and newer-version checks continue in importSaveCode below)
 */
export async function decryptSaveCode(rawInput: string): Promise<ImportOutcome> {
  const input = rawInput.trim();

  // Step 1: prefix.
  if (!input.startsWith(`${CODE_PREFIX}.`)) return { ok: false, reason: 'not_a_code' };

  // Step 2: segments + decode.
  const segments = input.split('.');
  if (segments.length !== 4) return { ok: false, reason: 'not_a_code' };
  const [, keyIdSegment, ivSegment, ctSegment] = segments;
  const keyIdBytes = fromBase64Url(keyIdSegment ?? '');
  const iv = fromBase64Url(ivSegment ?? '');
  const ct = fromBase64Url(ctSegment ?? '');
  if (!keyIdBytes || !iv || !ct) return { ok: false, reason: 'not_a_code' };

  // Step 3: known key id?
  if (keyIdBytes.length !== 1 || (keyIdBytes[0] ?? -1) !== KEY_ID_BYTE) {
    return { ok: false, reason: 'wrong_key_version' };
  }
  if (iv.length !== IV_BYTES || ct.length < 16) return { ok: false, reason: 'not_a_code' };

  // Step 4: decrypt+authenticate. Any failure → single generic message.
  try {
    const key = await getAesKey();
    const plainBuf = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as unknown as BufferSource },
      key,
      ct as unknown as BufferSource,
    );
    // Step 5: JSON parse of the authenticated plaintext.
    const text = new TextDecoder().decode(plainBuf);
    try {
      return { ok: true, data: JSON.parse(text) };
    } catch {
      return { ok: false, reason: 'schema_invalid' };
    }
  } catch {
    return { ok: false, reason: 'damaged' };
  }
}

/**
 * Full import: decrypt then validate schema + version gates (§7.2 steps 5–6).
 * Returns a SaveData-shaped object (already migrated) or the failure reason.
 */
export async function importSaveCode(
  rawInput: string,
): Promise<{ ok: true; data: Record<string, unknown> } | { ok: false; reason: ImportFailure }> {
  const decrypted = await decryptSaveCode(rawInput);
  if (!decrypted.ok) return decrypted;

  const obj = decrypted.data;
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    return { ok: false, reason: 'schema_invalid' };
  }

  // Step 6 (version gate): newer than current refuses BEFORE schema validation
  // so we can show the "update first" copy rather than "damaged inside".
  const record = obj as Record<string, unknown>;
  const version = record['version'];
  if (typeof version === 'number' && Number.isInteger(version) && version > SAVE_SCHEMA_VERSION) {
    return { ok: false, reason: 'newer_schema' };
  }

  // Schema validation happens in the caller (save/store.ts importPipeline)
  // because it also drives localStorage writes; here we only enforce that it
  // will run — returning the parsed object for the strict validator.
  return { ok: true, data: record };
}
