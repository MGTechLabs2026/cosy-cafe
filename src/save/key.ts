// save/key.ts — doc 02 §7.2
// The single app key, compiled into the bundle. This is tamper-resistance,
// not DRM — secrecy from a determined attacker is an explicit non-goal.
// 32 bytes (256-bit) hex, generated once; the 1-byte key id lets keys rotate.

/** Key id embedded in MLC1 codes. Bump when SAVE_KEY_HEX rotates. */
export const KEY_ID = 0x01;

/** AES-256 key material as hex (32 bytes). */
export const SAVE_KEY_HEX =
  '05173d86b62216420c106312e7bb0c29247d2f2ebce265b65cd87d8fb5344255';

/** Decode the hex constant into importable key bytes. */
export function saveKeyBytes(): Uint8Array {
  if (!/^[0-9a-f]{64}$/i.test(SAVE_KEY_HEX)) {
    throw new Error('SAVE_KEY_HEX must be exactly 64 hex chars');
  }
  const out = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    out[i] = parseInt(SAVE_KEY_HEX.slice(i * 2, i * 2 + 2), 16) as number;
  }
  return out;
}
