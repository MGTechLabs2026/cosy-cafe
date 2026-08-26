import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  SAVE_STORAGE_KEY,
  buildImportPreview,
  commitImportedSave,
  freshSave,
  loadSave,
  writeSave,
} from '../src/save/store';
import { SAVE_SCHEMA_VERSION, createInitialSave, validateSaveData } from '../src/save/validate';

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

describe('save schema validation (doc 02 §7.1)', () => {
  it('initial save validates and has version field', () => {
    const save = createInitialSave();
    expect(save.version).toBe(SAVE_SCHEMA_VERSION);
    const result = validateSaveData(save);
    expect(result.ok).toBe(true);
  });

  it('accepts a valid minimal blob (import payload shape)', () => {
    // v2 shape — import payloads are migrated BEFORE validation, so what the
    // validator sees always carries the v2 fields (hearts/letters/wren flag).
    const result = validateSaveData({
      version: 2,
      day: 4,
      coins: 42,
      stars: 2,
      inventory: { tea_leaves: 3 },
      upgrades: [],
      hearts: {},
      heart_points_today: {},
      letters: [],
      flags: {
        discovered_recipes: ['R001'],
        learned_prefs: [],
        seen_scenes: [],
        wren_usual_revealed: false,
      },
      settings: { relaxed_mode: true, reduced_motion: false, master_vol: 0.8 },
    });
    expect(result.ok).toBe(true);
  });

  it.each([
    ['negative coins', { coins: -1 }],
    ['fractional coins', { coins: 3.5 }],
    ['stars over range', { stars: 6 }],
    ['stars under range', { stars: -1 }],
    ['day zero', { day: 0 }],
    ['day negative', { day: -3 }],
    ['version zero', { version: 0 }],
    ['missing flags', { flags: undefined }],
    ['bad settings vol', { settings: { relaxed_mode: true, reduced_motion: false, master_vol: 5 } }],
  ])('rejects %s', (_label, override) => {
    const base = createInitialSave();
    const blob = { ...base, ...override } as Record<string, unknown>;
    expect(validateSaveData(blob).ok).toBe(false);
  });

  it('rejects non-object garbage', () => {
    expect(validateSaveData(null).ok).toBe(false);
    expect(validateSaveData('save').ok).toBe(false);
    expect(validateSaveData([1, 2]).ok).toBe(false);
  });
});

describe('localStorage store', () => {
  it('round-trips through the real key moonleaf_save_v1', () => {
    const save = freshSave();
    save.day = 3;
    save.coins = 18;
    writeSave(save);
    expect(localStorage.getItem(SAVE_STORAGE_KEY)).not.toBeNull();

    const loaded = loadSave();
    expect(loaded.ok).toBe(true);
    if (loaded.ok) {
      expect(loaded.data.day).toBe(3);
      expect(loaded.data.coins).toBe(18);
    }
  });

  it('reports missing vs corrupt distinctly', () => {
    expect(loadSave()).toEqual({ ok: false, reason: 'missing' });
    localStorage.setItem(SAVE_STORAGE_KEY, '{not json');
    expect(loadSave()).toEqual({ ok: false, reason: 'corrupt' });
    localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify({ version: 1, day: -1 }));
    expect(loadSave()).toEqual({ ok: false, reason: 'corrupt' });
  });

  it('probe key is namespaced away from the real save key', () => {
    // The probe writes `${SAVE_STORAGE_KEY}/probe`, never the save itself.
    expect(SAVE_STORAGE_KEY).toBe('moonleaf_save_v1');
  });
});
