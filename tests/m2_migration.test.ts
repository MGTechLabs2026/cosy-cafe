// M2 schema migration tests — doc 02 §7.1 (oldest-first migration rule) +
// brief §F: realistic v1 fixture gains defaults, validates, round-trips
// export/import, and tampered codes are still refused.

import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  SAVE_STORAGE_KEY,
  buildImportPreview,
  commitImportedSave,
  exportSaveCodeForTests,
  freshSave,
  loadSave,
  writeSave,
} from './helpers/m2_save_helpers';
import { SAVE_SCHEMA_VERSION, validateSaveData } from '../src/save/validate';
import type { SaveData } from '../src/save/validate';

// Minimal localStorage stub (node env has none).
class MemoryStorage {
  private map = new Map<string, string>();
  getItem(k: string): string | null {
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string): void {
    this.map.set(k, v);
  }
  removeItem(k: string): void {
    this.map.delete(k);
  }
  clear(): void {
    this.map.clear();
  }
}

beforeEach(() => {
  const storage = new MemoryStorage();
  vi.stubGlobal('localStorage', storage);
});

/**
 * Realistic v1 fixture — exactly what an M1 player's localStorage looked like:
 * v1 fields only, no hearts/heart_points_today/letters/wren flag.
 */
function makeV1Fixture(): Record<string, unknown> {
  return {
    version: 1,
    day: 6,
    coins: 87,
    stars: 2,
    total_serves: 44,
    chatted_this_service: false,
    inventory: { tea_leaves: 4, honey: 2, moonleaf: 1 },
    upgrades: ['window_bench'],
    flags: {
      discovered_recipes: ['R001', 'R002', 'R003'],
      learned_prefs: [],
      seen_scenes: [],
    },
    settings: { relaxed_mode: true, reduced_motion: false, master_vol: 0.8 },
  };
}

describe('migration v1 → v2 (doc 02 §7.1 oldest-first)', () => {
  it('v1 fixture loads through loadSave with defaults filled', () => {
    localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(makeV1Fixture()));
    const loaded = loadSave();
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;

    const data = loaded.data;
    expect(data.version).toBe(SAVE_SCHEMA_VERSION); // migrated to current
    // Existing fields untouched:
    expect(data.day).toBe(6);
    expect(data.coins).toBe(87);
    expect(data.stars).toBe(2);
    expect(data.total_serves).toBe(44);
    expect(data.upgrades).toEqual(['window_bench']);
    expect(data.flags.discovered_recipes).toEqual(['R001', 'R002', 'R003']);
    // New fields defaulted (brief §F):
    expect(data.hearts).toEqual({});
    expect(data.heart_points_today).toEqual({});
    expect(data.flags.wren_usual_revealed).toBe(false);
    expect(data.letters).toEqual([]);
  });

  it('migrated v1 validates cleanly against the v2 validator', () => {
    localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(makeV1Fixture()));
    const loaded = loadSave();
    expect(loaded.ok).toBe(true);
    if (loaded.ok) expect(validateSaveData(loaded.data).ok).toBe(true);
  });

  it('raw v1 blob WITHOUT migration fails validation (fail-closed preserved)', () => {
    const result = validateSaveData(makeV1Fixture());
    expect(result.ok).toBe(false); // missing v2-required fields pre-migration
  });

  it('v1 flags survive the merge (never hot-patched silently)', () => {
    const fixture = makeV1Fixture() as { flags: Record<string, unknown> };
    fixture.flags['learned_prefs'] = ['fenwick'];
    localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(fixture));
    const loaded = loadSave();
    expect(loaded.ok).toBe(true);
    if (loaded.ok) {
      expect(loaded.data.flags.learned_prefs).toEqual(['fenwick']);
      expect(loaded.data.flags.wren_usual_revealed).toBe(false);
    }
  });

  it('fresh saves are born at the current schema with the day-1 letter archived', () => {
    const save = freshSave();
    expect(save.version).toBe(SAVE_SCHEMA_VERSION); // v4 as of M4 (text_size)
    expect(save.letters).toContain('letter_marigold_1');
    expect(save.hearts).toEqual({});
  });

  it('v6 → v7 migration adds an empty letters_delivered_day map', () => {
    // Take a current save, strip the v7 field and relabel it v6 → the only
    // migration that should run is v6 → v7.
    const v6 = JSON.parse(JSON.stringify(freshSave())) as {
      version: number;
      flags: Record<string, unknown>;
    };
    v6.version = 6;
    v6.flags['letters_delivered'] = ['reactive_ingredient_low'];
    delete v6.flags['letters_delivered_day'];
    localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(v6));

    const loaded = loadSave();
    expect(loaded.ok).toBe(true);
    if (loaded.ok) {
      expect(loaded.data.version).toBe(SAVE_SCHEMA_VERSION);
      // Existing deliveries carry no cooldown history — the safe default.
      expect(loaded.data.flags.letters_delivered_day).toEqual({});
      expect(loaded.data.flags.letters_delivered).toContain('reactive_ingredient_low');
    }
  });
});

describe('export/import round-trip + tamper refusal at v2', () => {
  it('v2 save round-trips through an encrypted code with hearts intact', async () => {
    const save = freshSave();
    save.day = 9;
    save.coins = 210;
    save.upgrades = ['bigger_shelf', 'second_kettle'];
    save.hearts = { fenwick: 2.35, wren: 0.5 };
    save.heart_points_today = { fenwick: 0.25 };
    save.letters = ['letter_marigold_1', 'board_day2_hint'];
    save.flags.wren_usual_revealed = true;

    writeSave(save);
    const raw = localStorage.getItem(SAVE_STORAGE_KEY)!;
    const code = await exportSaveCodeForTests(raw);

    localStorage.removeItem(SAVE_STORAGE_KEY);

    const stage = await buildImportPreview(code);
    expect(stage.ok).toBe(true);
    if (!stage.ok) return;
    expect(stage.preview.version).toBe(SAVE_SCHEMA_VERSION);
    expect(stage.preview.day).toBe(9);
    expect(stage.preview.coins).toBe(210);
    expect(stage.preview.hearts).toEqual({ fenwick: 2.35, wren: 0.5 });
    expect(stage.preview.flags.wren_usual_revealed).toBe(true);

    commitImportedSave(stage.preview);
    const reloaded = loadSave();
    expect(reloaded.ok).toBe(true);
    if (reloaded.ok) {
      expect((reloaded.data as SaveData).hearts['fenwick']).toBeCloseTo(2.35, 9);
      expect((reloaded.data as SaveData).letters).toHaveLength(2);
    }
  });

  it('an encrypted V1 payload migrates inside the import pipeline', async () => {
    const code = await exportSaveCodeForTests(JSON.stringify(makeV1Fixture()));
    const stage = await buildImportPreview(code);
    expect(stage.ok).toBe(true);
    if (!stage.ok) return;
    expect(stage.preview.version).toBe(SAVE_SCHEMA_VERSION);
    expect(stage.preview.hearts).toEqual({});
    expect(stage.preview.day).toBe(6);
  });

  it('tampered codes are STILL refused by auth (not schema)', async () => {
    const code = await exportSaveCodeForTests(JSON.stringify(freshSave()));
    const idx = code.length - 4;
    const flipped =
      code.slice(0, idx) + (code[idx] === 'A' ? 'B' : 'A') + code.slice(idx + 1);
    const stage = await buildImportPreview(flipped);
    expect(stage.ok).toBe(false);
    if (!stage.ok) expect(stage.reason).toBe('damaged');
  });

  it('newer-than-current versions still refuse before validation', async () => {
    const future = freshSave();
    future.version = SAVE_SCHEMA_VERSION + 5;
    const code = await exportSaveCodeForTests(JSON.stringify(future));
    const stage = await buildImportPreview(code);
    expect(stage.ok).toBe(false);
    if (!stage.ok) expect(stage.reason).toBe('newer_schema');
  });

  it('storage key stays moonleaf_save_v1 (inner version drives migration)', () => {
    expect(SAVE_STORAGE_KEY).toBe('moonleaf_save_v1');
  });
});
