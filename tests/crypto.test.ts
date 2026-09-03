// Crypto gates from doc 02 §7.2 / doc 06 §3 M1 exit criteria:
// round-trip, tamper-refusal (auth stage, NOT JSON parse), wrong-prefix,
// unknown key id, newer schema version, schema-invalid-after-decrypt.
// Node 20+ provides globalThis.crypto (WebCrypto) — no polyfill needed.

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CODE_PREFIX, decryptSaveCode, exportSaveCode, importSaveCode, isCryptoAvailable } from '../src/save/crypto';
import { KEY_ID } from '../src/save/key';
import {
  SAVE_STORAGE_KEY,
  buildImportPreview,
  commitImportedSave,
  freshSave,
} from '../src/save/store';
import { SAVE_SCHEMA_VERSION, createInitialSave } from '../src/save/validate';
import type { SaveData } from '../src/save/validate';

beforeEach(() => {
  const map = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
  });
});

function flipChar(s: string): string {
  // Flip one character in the middle of the ciphertext segment deterministically.
  const idx = s.length - 4;
  const ch = s[idx]!;
  const replacement = ch === 'A' ? 'B' : 'A';
  return s.slice(0, idx) + replacement + s.slice(idx + 1);
}

describe('crypto availability', () => {
  it('webcrypto is present in the test runtime', () => {
    expect(isCryptoAvailable()).toBe(true);
  });
});

describe('export format', () => {
  it('produces MLC1.<key_id>.<iv>.<ct> with base64url segments', async () => {
    const code = await exportSaveCode(JSON.stringify(createInitialSave()));
    expect(code.startsWith(`${CODE_PREFIX}.`)).toBe(true);
    const segs = code.split('.');
    expect(segs).toHaveLength(4);
    expect(segs[0]).toBe('MLC1');
    // key id byte 0x01 → base64url "AQ"
    expect(segs[1]).toBe('AQ');
    // no padding or standard-base64 alphabet anywhere
    for (const seg of segs.slice(1)) {
      expect(seg).not.toMatch(/[+/=]/);
    }
  });

  it('fresh IV per export — two codes of the same save differ', async () => {
    const json = JSON.stringify(createInitialSave());
    const a = await exportSaveCode(json);
    const b = await exportSaveCode(json);
    expect(a).not.toBe(b); // different IV → different ciphertext
    expect(a.split('.')[2]).not.toBe(b.split('.')[2]);
  });
});

describe('round-trip gate (doc 06 M1 exit)', () => {
  it('export → import → byte-identical state', async () => {
    const save: SaveData = createInitialSave();
    save.day = 7;
    save.coins = 123;
    save.stars = 3;
    save.total_serves = 61;
    save.flags.discovered_recipes.push('R003');
    const originalJson = JSON.stringify(save);

    const code = await exportSaveCode(originalJson);
    const parsed = await importSaveCode(code);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(JSON.stringify(parsed.data)).toBe(originalJson);
    }
  });

  it('full pipeline through buildImportPreview + commit', async () => {
    const save = createInitialSave();
    save.day = 12;
    save.coins = 77;
    writeSaveHelper(save);

    const raw = localStorage.getItem(SAVE_STORAGE_KEY)!;
    const code = await exportSaveCode(raw);

    // Simulate a wiped device:
    localStorage.removeItem(SAVE_STORAGE_KEY);

    const stage = await buildImportPreview(code);
    expect(stage.ok).toBe(true);
    if (stage.ok) {
      expect(stage.preview.day).toBe(12);
      expect(stage.preview.coins).toBe(77);
      expect(stage.preview.version).toBe(SAVE_SCHEMA_VERSION);
      commitImportedSave(stage.preview);
      expect(localStorage.getItem(SAVE_STORAGE_KEY)).not.toBeNull();
      const reloaded = JSON.parse(localStorage.getItem(SAVE_STORAGE_KEY)!) as SaveData;
      expect(reloaded.day).toBe(12);
    }
  });

  function writeSaveHelper(save: SaveData): void {
    localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(save));
  }
});

describe('tamper-refusal gate (auth must catch it, not JSON parse)', () => {
  it('flipping a char in the ciphertext → damaged (generic), never parses', async () => {
    const code = await exportSaveCode(JSON.stringify(createInitialSave()));
    const tampered = flipChar(code);

    // The failure MUST come from the auth/decrypt stage — i.e. reason 'damaged' —
    // not from schema validation after a successful decrypt.
    const result = await decryptSaveCode(tampered);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('damaged');
    }

    // And at the full-pipeline level the copy maps to the same generic bucket.
    const stage = await buildImportPreview(tampered);
    expect(stage.ok).toBe(false);
    if (!stage.ok) expect(stage.reason).toBe('damaged');
  });

  it('truncated code → refused before any decrypt attempt', async () => {
    const code = await exportSaveCode(JSON.stringify(createInitialSave()));
    const stage = await buildImportPreview(code.slice(0, code.length - 10));
    expect(stage.ok).toBe(false);
    if (!stage.ok) expect(['not_a_code', 'damaged']).toContain(stage.reason);
  });

  it('wrong prefix (garbage) → not_a_code', async () => {
    const stage = await buildImportPreview('SAVE-xyz-whatever-this-is-not-a-code');
    expect(stage.ok).toBe(false);
    if (!stage.ok) expect(stage.reason).toBe('not_a_code');
  });

  it('plaintext JSON pasted directly → not_a_code (no plaintext fallback ever)', async () => {
    const stage = await buildImportPreview(JSON.stringify(createInitialSave()));
    expect(stage.ok).toBe(false);
    if (!stage.ok) expect(stage.reason).toBe('not_a_code');
  });

  it('unknown key id byte → wrong_key_version', async () => {
    const code = await exportSaveCode(JSON.stringify(createInitialSave()));
    const segs = code.split('.');
    // Replace key-id segment with 0x02 → base64url "Ag".
    const tampered = [segs[0], 'Ag', segs[2], segs[3]].join('.');
    const result = await decryptSaveCode(tampered);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('wrong_key_version');
  });

  it('key id constant is 0x01 and encoded as expected', () => {
    expect(KEY_ID).toBe(0x01);
  });
});

describe('version gates', () => {
  it('newer schema version inside a valid code → newer_schema', async () => {
    const future = createInitialSave();
    future.version = SAVE_SCHEMA_VERSION + 5;
    const code = await exportSaveCode(JSON.stringify(future));
    const stage = await buildImportPreview(code);
    expect(stage.ok).toBe(false);
    if (!stage.ok) expect(stage.reason).toBe('newer_schema');
  });

  it('valid auth but garbage payload → schema_invalid (never applied)', async () => {
    const code = await exportSaveCode('{"hello": "world"}');
    const stage = await buildImportPreview(code);
    expect(stage.ok).toBe(false);
    if (!stage.ok) expect(stage.reason).toBe('schema_invalid');
  });

  it('valid auth but out-of-range values → schema_invalid', async () => {
    const bad = createInitialSave();
    bad.coins = -50;
    const code = await exportSaveCode(JSON.stringify(bad));
    const stage = await buildImportPreview(code);
    expect(stage.ok).toBe(false);
    if (!stage.ok) expect(stage.reason).toBe('schema_invalid');
  });
});

describe('import never touches storage until confirm', () => {
  it('failed import leaves current save untouched', async () => {
    const live = freshSave();
    live.day = 9;
    localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(live));

    const badStage = await buildImportPreview('garbage');
    expect(badStage.ok).toBe(false);
    expect(localStorage.getItem(SAVE_STORAGE_KEY)).toBe(JSON.stringify(live));

    // Even a SUCCESSFUL preview doesn't replace until commit:
    const goodCode = await exportSaveCode(JSON.stringify(createInitialSave()));
    const goodStage = await buildImportPreview(goodCode);
    expect(goodStage.ok).toBe(true);
    expect(localStorage.getItem(SAVE_STORAGE_KEY)).toBe(JSON.stringify(live));
  });
});

describe('failure-copy table coverage (strings.json ↔ §7.2)', () => {
  it('every pipeline reason has its exact calm string', async () => {
    const strings = (await import('../src/data/strings.json')).default;
    const cases: Array<[string, string]> = [
      ['not_a_code', strings.saveio.failureNotACode],
      ['damaged', strings.saveio.failureDamaged],
      ['wrong_key_version', strings.saveio.failureWrongVersion],
      ['newer_schema', strings.saveio.failureNewerVersion],
      ['schema_invalid', strings.saveio.failureSchemaInvalid],
    ];
    for (const [reason, copy] of cases) {
      expect(copy, `missing copy for ${reason}`).toBeTruthy();
      expect(copy.length).toBeGreaterThan(10);
    }
    // Exact §7.2 table strings:
    expect(strings.saveio.failureNotACode).toBe(
      'Hmm, that doesn\'t look like a Moonleaf Cozy Café save code.',
    );
    expect(strings.saveio.failureDamaged).toBe(
      'This code seems damaged — maybe a character got lost when copying it?',
    );
    expect(strings.saveio.failureWrongVersion).toBe(
      'This save comes from a different version of the game.',
    );
    expect(strings.saveio.failureNewerVersion).toBe(
      'This save is from a newer update. Please update the game first.',
    );
    expect(strings.saveio.failureSchemaInvalid).toBe(
      'This save is damaged inside. Starting fresh might be kindest.',
    );
  });
});
