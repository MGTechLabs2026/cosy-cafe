// save/store.ts — doc 02 §7.1 primary save + §7.2 import pipeline tail
// Plaintext JSON in localStorage by design (players own their local save);
// encryption applies only to export codes. Autosave = evening recap only,
// single atomic write, never during service.

import { importSaveCode } from './crypto.js';
import {
  SAVE_SCHEMA_VERSION,
  SAVE_STORAGE_KEY,
  createInitialSave,
  validateSaveData,
} from './validate.js';
import type { SaveData } from './validate.js';

/** Probe key stays namespaced separately from the real save (never collide). */
const PROBE_KEY = `${SAVE_STORAGE_KEY}/probe`;

export { SAVE_SCHEMA_VERSION, SAVE_STORAGE_KEY };

export type LoadResult =
  | { ok: true; data: SaveData }
  | { ok: false; reason: 'missing' | 'corrupt' };

/** True when localStorage is readable+writable (SSR/private-mode safe). */
export function isStorageAvailable(): boolean {
  try {
    if (typeof localStorage === 'undefined') return false;
    localStorage.setItem(PROBE_KEY, '1');
    localStorage.removeItem(PROBE_KEY);
    return true;
  } catch {
    return false;
  }
}

/**
 * Migration chain, oldest first (doc 02 §7.1). Each entry migrates save at
 * version N to N+1. Never hot-patch old keys silently.
 *
 * v1 → v2 (M2): adds the new fields with safe defaults; nothing existing is
 * rewritten. Defaults: hearts {} (0 points = 0 hearts), heart_points_today {}
 * (fresh day cap), flags.wren_usual_revealed false (mystery intact), letters []
 * (existing players keep playing; the journal archive simply starts empty).
 *
 * v2 → v3 (M3): adds arc progress flags with safe defaults.
 *
 * v3 → v4 (M4): adds settings.text_size default 100% (doc 05 §6 text-size).
 *
 * v4 → v5 (M5): adds narrative system flags with safe defaults.
 *
 * v5 → v6 (M6): adds activity ledger counters with safe defaults.
 */
function migrateV1toV2(data: Record<string, unknown>): Record<string, unknown> {
  return {
    ...data,
    hearts: data['hearts'] ?? {},
    heart_points_today: data['heart_points_today'] ?? {},
    letters: data['letters'] ?? [],
    flags: {
      discovered_recipes: [],
      learned_prefs: [],
      seen_scenes: [],
      wren_usual_revealed: false,
      ...(isRecord(data['flags']) ? data['flags'] : {}),
    },
  };
}

function migrateV2toV3(data: Record<string, unknown>): Record<string, unknown> {
  const flags = isRecord(data['flags']) ? data['flags'] : {};
  return {
    ...data,
    flags: {
      ...flags,
      fenwick_arc_complete: flags['fenwick_arc_complete'] ?? false,
      fenwick_epilogue_done: flags['fenwick_epilogue_done'] ?? false,
      wren_arc_complete: flags['wren_arc_complete'] ?? false,
      wren_epilogue_done: flags['wren_epilogue_done'] ?? false,
      title_music_box_unlocked: flags['title_music_box_unlocked'] ?? false,
      sela_intro_done: flags['sela_intro_done'] ?? false,
      bram_intro_done: flags['bram_intro_done'] ?? false,
      nia_intro_done: flags['nia_intro_done'] ?? false,
    },
  };
}

function migrateV3toV4(data: Record<string, unknown>): Record<string, unknown> {
  const flags = isRecord(data['flags']) ? data['flags'] : {};
  const settings = isRecord(data['settings']) ? data['settings'] : {};
  return {
    ...data,
    flags: {
      ...flags,
      // M4: one-shot chili gift + kettle auto-open default un-fired for
      // existing saves.
      fenwick_chili_granted: flags['fenwick_chili_granted'] ?? false,
      kettle_auto_opened: flags['kettle_auto_opened'] ?? false,
    },
    settings: {
      ...settings,
      text_size: settings['text_size'] ?? 100,
    },
  };
}

function migrateV4toV5(data: Record<string, unknown>): Record<string, unknown> {
  const flags = isRecord(data['flags']) ? data['flags'] : {};
  return {
    ...data,
    flags: {
      ...flags,
      // v5 — Narrative system flags with safe defaults
      current_chapter: 0,
      chapter_entered_day: { 0: (data['day'] as number) ?? 1 },
      letters_delivered: (data['letters'] as string[]) ?? [],
      letters_read: [],
      letters_dismissed: [],
      dominant_dimension_history: [],
      trajectory_hint: null,
      ending_achieved: undefined,
      ending_day: undefined,
      marigold_mystery_layer: 1,
      wren_clues_gathered: 0,
      playthrough_count: 0,
      previous_endings: [],
    },
  };
}

function migrateV5toV6(data: Record<string, unknown>): Record<string, unknown> {
  const flags = isRecord(data['flags']) ? data['flags'] : {};
  return {
    ...data,
    flags: {
      ...flags,
      // v6 — Activity ledger counters with safe defaults
      activity_total_serves: 0,
      activity_favorite_serves: 0,
      activity_correct_serves: 0,
      activity_serves_by_npc: {},
      activity_serves_by_recipe: {},
      activity_total_chats: 0,
      activity_chats_by_npc: {},
      activity_total_brews: 0,
      activity_experimental_brews: 0,
      activity_wren_mystery_brews: 0,
      activity_recipe_discoveries: 0,
      activity_discovered_recipes: [],
      activity_journal_opens_total: 0,
      activity_journal_opens_by_tab: {},
      activity_upgrade_purchases: 0,
      activity_days_skipped: 0,
      activity_early_closes: 0,
      activity_letters_read: 0,
      activity_letters_dismissed: 0,
      activity_read_letter_ids: [],
      activity_dismissed_letter_ids: [],
      activity_wren_visits: 0,
      activity_wren_mystery_clues: 0,
      activity_ingredients_purchased: 0,
      activity_version: 1,
    },
  };
}

/** Local structural guard (store.ts stays free of validator imports cycles). */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

type MigrationFn = (data: Record<string, unknown>) => Record<string, unknown>;
const MIGRATIONS: readonly MigrationFn[] = [migrateV1toV2, migrateV2toV3, migrateV3toV4, migrateV4toV5, migrateV5toV6];

function migrate(data: Record<string, unknown>): Record<string, unknown> {
  let current = data;
  const fromVersion = typeof current['version'] === 'number' ? (current['version'] as number) : 1;
  for (let v = fromVersion; v < SAVE_SCHEMA_VERSION; v++) {
    const fn = MIGRATIONS[v - 1];
    if (!fn) break;
    current = fn(current);
    current['version'] = v + 1;
  }
  return current;
}

/**
 * Read + validate the live save (M4 robustness gate C):
 * a corrupt/unparseable blob NEVER crash-loops — it is reported once with a
 * console warn, moved aside under `<key>/corrupt-backup`, and the game falls
 * back to `missing` so callers start fresh. The damaged data is preserved for
 * manual recovery instead of being silently destroyed.
 */
export function loadSave(): LoadResult {
  try {
    const raw = localStorage.getItem(SAVE_STORAGE_KEY);
    if (raw === null) return { ok: false, reason: 'missing' };
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      console.warn(
        `[Moonleaf] Save at "${SAVE_STORAGE_KEY}" is not valid JSON — starting fresh. ` +
          `The damaged save was kept at "${SAVE_STORAGE_KEY}/corrupt-backup".`,
      );
      quarantineCorruptSave(raw);
      return { ok: false, reason: 'corrupt' };
    }
    if (!isRecord(parsed)) {
      console.warn(`[Moonleaf] Save at "${SAVE_STORAGE_KEY}" has an unreadable shape — starting fresh.`);
      quarantineCorruptSave(raw);
      return { ok: false, reason: 'corrupt' };
    }
    const migrated = migrate(parsed);
    const result = validateSaveData(migrated);
    return result.ok ? result : { ok: false, reason: 'corrupt' };
  } catch {
    return { ok: false, reason: 'corrupt' };
  }
}

/** Keep the damaged blob reachable for manual recovery, then clear the slot. */
function quarantineCorruptSave(raw: string): void {
  try {
    localStorage.setItem(`${SAVE_STORAGE_KEY}/corrupt-backup`, raw);
    localStorage.removeItem(SAVE_STORAGE_KEY);
  } catch {
    // Storage unusable — nothing more we can do; caller already fell back.
  }
}

/** Atomic write of the whole save blob. Throws only if storage is unusable. */
export function writeSave(data: SaveData): void {
  localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(data));
}

/** Remove the save entirely (used by explicit "start over" confirmation). */
export function clearSave(): void {
  localStorage.removeItem(SAVE_STORAGE_KEY);
}

// ---- Import pipeline tail (§7.2 steps 5–7) ----------------------------------

export type ImportStage =
  | { ok: true; preview: SaveData }
  | { ok: false; reason: 'not_a_code' | 'damaged' | 'wrong_key_version' | 'newer_schema' | 'schema_invalid' };

/**
 * Validate an imported code end-to-end WITHOUT touching localStorage.
 * The caller shows the preview modal from `preview`; only after the player
 * confirms does it call commitImportedSave() (step 7, atomic replace).
 */
export async function buildImportPreview(rawInput: string): Promise<ImportStage> {
  const parsed = await importSaveCode(rawInput);
  if (!parsed.ok) return parsed;

  // Step 5/6: schema-validate required fields and value ranges, migrate.
  const migrated = migrate(parsed.data);
  const validated = validateSaveData(migrated);
  if (!validated.ok) return { ok: false, reason: 'schema_invalid' };
  return { ok: true, preview: validated.data };
}

/** Step 7: atomic replace of moonleaf_save_v1 after player confirmation. */
export function commitImportedSave(preview: SaveData): void {
  writeSave({ ...preview, version: SAVE_SCHEMA_VERSION });
}

export function freshSave(): SaveData {
  return createInitialSave();
}
