// save/validate.ts — doc 02 §7.1 schema validation
// Hand-rolled validator (~1 KB per doc 08); no dependency. Fail-closed.

export const SAVE_SCHEMA_VERSION = 6;
export const SAVE_STORAGE_KEY = 'moonleaf_save_v1';

// Shape mirrors doc 02 §7.1 exactly:
// {version, day, coins, stars, inventory{}, upgrades[], flags{...}, settings{...}}
// v2 additions (M2, each documented in the report): hearts{},
// heart_points_today{}, flags.wren_usual_revealed, letters[].
// v3 additions (M3): arc progress flags.
// v4 addition (M4): settings.text_size — UI body scale percent (doc 05 §6).
export interface SaveFlags {
  discovered_recipes: string[];
  learned_prefs: string[];
  seen_scenes: string[];
  /** v2 — Old Wren's "usual" revealed? Gates his "?" mystery order. */
  wren_usual_revealed: boolean;
  /** M3 — Character arc progress flags */
  fenwick_arc_complete: boolean;
  fenwick_epilogue_done: boolean;
  wren_arc_complete: boolean;
  wren_epilogue_done: boolean;
  title_music_box_unlocked: boolean;
  sela_intro_done: boolean;
  bram_intro_done: boolean;
  nia_intro_done: boolean;
  /**
   * M4 — Fenwick epilogue chili crate granted exactly once (inventory+shelf).
   * Lives in flags (not a counter) because it is a one-shot world event.
   */
  fenwick_chili_granted: boolean;
  /** M4 — tutorial step 4 (doc 05 §3.1): kettle auto-opened once this save. */
  kettle_auto_opened: boolean;

  /** v5 — Narrative system flags */
  /** Current narrative chapter (0–5) */
  current_chapter: number;
  /** Day each chapter was entered */
  chapter_entered_day: Record<number, number>;
  /** IDs of delivered letters */
  letters_delivered: string[];
  /** IDs of letters player actually opened */
  letters_read: string[];
  /** IDs of letters player dismissed without reading */
  letters_dismissed: string[];
  /** Per-chapter peak dimension */
  dominant_dimension_history: string[];
  /** Current trajectory hint */
  trajectory_hint: 'care' | 'comfort' | 'curiosity' | 'community' | 'independence' | null;
  /** Ending achieved */
  ending_achieved?: 'keeper' | 'builder' | 'wanderer' | 'community' | undefined;
  ending_day?: number | undefined;
  /** Marigold mystery layer (1–5) */
  marigold_mystery_layer: number;
  /** Wren clues gathered (0–3) */
  wren_clues_gathered: number;
  /** Playthrough count for replay features */
  playthrough_count: number;
  /** Previously achieved endings */
  previous_endings: string[];
  
  /** v6 — Activity ledger counters (compact, replaces heuristics) */
  /** Total serves this playthrough */
  activity_total_serves: number;
  /** Favorite serves this playthrough */
  activity_favorite_serves: number;
  /** Correct serves this playthrough */
  activity_correct_serves: number;
  /** Serves per NPC */
  activity_serves_by_npc: Record<string, number>;
  /** Serves per recipe */
  activity_serves_by_recipe: Record<string, number>;
  /** Total chats this playthrough */
  activity_total_chats: number;
  /** Chats per NPC */
  activity_chats_by_npc: Record<string, number>;
  /** Total brews this playthrough */
  activity_total_brews: number;
  /** Experimental brews */
  activity_experimental_brews: number;
  /** Wren mystery brews */
  activity_wren_mystery_brews: number;
  /** Recipe discoveries */
  activity_recipe_discoveries: number;
  /** Discovered recipes list */
  activity_discovered_recipes: string[];
  /** Journal opens total */
  activity_journal_opens_total: number;
  /** Journal opens per tab */
  activity_journal_opens_by_tab: Record<string, number>;
  /** Upgrade purchases */
  activity_upgrade_purchases: number;
  /** Days skipped */
  activity_days_skipped: number;
  /** Early closes */
  activity_early_closes: number;
  /** Letters read count */
  activity_letters_read: number;
  /** Letters dismissed count */
  activity_letters_dismissed: number;
  /** Read letter IDs */
  activity_read_letter_ids: string[];
  /** Dismissed letter IDs */
  activity_dismissed_letter_ids: string[];
  /** Wren visits */
  activity_wren_visits: number;
  /** Wren mystery clues gathered */
  activity_wren_mystery_clues: number;
  /** Ingredients purchased total */
  activity_ingredients_purchased: number;
  /** Activity ledger version */
  activity_version: number;
}

export interface SaveSettings {
  relaxed_mode: boolean;
  reduced_motion: boolean;
  master_vol: number; // 0..1
  /**
   * v4 — text-size setting (doc 05 §6): body scale percent for every DOM
   * panel (dialogue/journal/recap). One of TEXT_SIZES.
   */
  text_size: number; // 100 | 125 | 150
}

/** Allowed text-size steps (doc 05 §6: 100% / 125% / 150%). */
export const TEXT_SIZES: readonly number[] = [100, 125, 150];

export interface SaveData {
  version: number;
  day: number;
  coins: number;
  stars: number;
  total_serves: number;
  chatted_this_service: boolean;
  inventory: Record<string, number>;
  upgrades: string[];
  /** v2 — charId → lifetime float heart points; displayed hearts = floor. */
  hearts: Record<string, number>;
  /** v2 — charId → points gained today (reset each morning). */
  heart_points_today: Record<string, number>;
  /** v2 — mail archive ids in arrival order (journal Letters tab). */
  letters: string[];
  flags: SaveFlags;
  settings: SaveSettings;
}

/** Result of validating an untrusted JSON blob. */
export type ValidationResult =
  | { ok: true; data: SaveData }
  | { ok: false };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === 'string');
}

/** Record of finite numbers (heart points). Rejects arrays/NaN/Infinity. */
function readNumberRecord(value: unknown): Record<string, number> | null {
  if (!isRecord(value)) return null;
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(value)) {
    if (!isFiniteNumber(v)) return null;
    out[k] = v;
  }
  return out;
}

/**
 * Validate required fields and value ranges (doc 02 §7.2 step 5):
 * coins ≥ 0, stars 0–5, day ≥ 1, version integer.
 * Unknown extra keys are tolerated (forward-compatible reading), but every
 * field the game relies on must be present and in range — fail closed.
 */
export function validateSaveData(input: unknown): ValidationResult {
  if (!isRecord(input)) return { ok: false };

  // version: positive integer (newer versions are a separate failure case,
  // handled by the import pipeline before this validator).
  const version = input['version'];
  if (!isFiniteNumber(version) || !Number.isInteger(version) || version < 1) {
    return { ok: false };
  }

  const day = input['day'];
  if (!isFiniteNumber(day) || !Number.isInteger(day) || day < 1) return { ok: false };

  const coins = input['coins'];
  if (!isFiniteNumber(coins) || !Number.isInteger(coins) || coins < 0) return { ok: false };

  const stars = input['stars'];
  if (!isFiniteNumber(stars) || !Number.isInteger(stars) || stars < 0 || stars > 5) {
    return { ok: false };
  }

  // total_serves / chatted flag: optional at v1 boundary but validated if present.
  let totalServes = 0;
  if (input['total_serves'] !== undefined) {
    const ts = input['total_serves'];
    if (!isFiniteNumber(ts) || !Number.isInteger(ts) || ts < 0) return { ok: false };
    totalServes = ts;
  }
  let chatted = false;
  if (input['chatted_this_service'] !== undefined) {
    if (typeof input['chatted_this_service'] !== 'boolean') return { ok: false };
    chatted = input['chatted_this_service'] as boolean;
  }

  // inventory: record of non-negative finite numbers.
  const rawInventory = input['inventory'];
  if (!isRecord(rawInventory)) return { ok: false };
  const inventory: Record<string, number> = {};
  for (const [k, v] of Object.entries(rawInventory)) {
    if (!isFiniteNumber(v) || !Number.isInteger(v) || v < 0) return { ok: false };
    inventory[k] = v;
  }

  // upgrades: string array.
  const rawUpgrades = input['upgrades'];
  if (!isStringArray(rawUpgrades)) return { ok: false };

  // v2 fields — REQUIRED at v2 (migration guarantees them for v1 blobs):
  // hearts / heart_points_today: records of finite numbers (float points).
  const hearts = readNumberRecord(input['hearts']);
  if (!hearts) return { ok: false };
  const heartPointsToday = readNumberRecord(input['heart_points_today']);
  if (!heartPointsToday) return { ok: false };

  // letters: string array (mail archive ids).
  const rawLetters = input['letters'];
  if (!isStringArray(rawLetters)) return { ok: false };

  // flags: all four fields required, string arrays + reveal flag + M3 arc flags.
  const rawFlags = input['flags'];
  if (!isRecord(rawFlags)) return { ok: false };
  const disc = rawFlags['discovered_recipes'];
  const prefs = rawFlags['learned_prefs'];
  const scenes = rawFlags['seen_scenes'];
  const wrenRevealed = rawFlags['wren_usual_revealed'];
  if (!isStringArray(disc) || !isStringArray(prefs) || !isStringArray(scenes)) {
    return { ok: false };
  }
  if (typeof wrenRevealed !== 'boolean') return { ok: false };

  // M3 arc flags (optional for backwards compat, default false)
  const fenwickArcComplete = rawFlags['fenwick_arc_complete'];
  const fenwickEpilogueDone = rawFlags['fenwick_epilogue_done'];
  const wrenArcComplete = rawFlags['wren_arc_complete'];
  const wrenEpilogueDone = rawFlags['wren_epilogue_done'];
  const titleMusicBoxUnlocked = rawFlags['title_music_box_unlocked'];
  const selaIntroDone = rawFlags['sela_intro_done'];
  const bramIntroDone = rawFlags['bram_intro_done'];
  const niaIntroDone = rawFlags['nia_intro_done'];

  // Validate M3 flags if present
  if (fenwickArcComplete !== undefined && typeof fenwickArcComplete !== 'boolean') return { ok: false };
  if (fenwickEpilogueDone !== undefined && typeof fenwickEpilogueDone !== 'boolean') return { ok: false };
  if (wrenArcComplete !== undefined && typeof wrenArcComplete !== 'boolean') return { ok: false };
  if (wrenEpilogueDone !== undefined && typeof wrenEpilogueDone !== 'boolean') return { ok: false };
  if (titleMusicBoxUnlocked !== undefined && typeof titleMusicBoxUnlocked !== 'boolean') return { ok: false };
  if (selaIntroDone !== undefined && typeof selaIntroDone !== 'boolean') return { ok: false };
  if (bramIntroDone !== undefined && typeof bramIntroDone !== 'boolean') return { ok: false };
  if (niaIntroDone !== undefined && typeof niaIntroDone !== 'boolean') return { ok: false };

  // v5 narrative flags (optional for backwards compat, default false/0/empty)
  const currentChapter = rawFlags['current_chapter'];
  const chapterEnteredDay = rawFlags['chapter_entered_day'];
  const lettersDelivered = rawFlags['letters_delivered'];
  const lettersRead = rawFlags['letters_read'];
  const lettersDismissed = rawFlags['letters_dismissed'];
  const dominantDimensionHistory = rawFlags['dominant_dimension_history'];
  const trajectoryHint = rawFlags['trajectory_hint'];
  const endingAchieved = rawFlags['ending_achieved'];
  const endingDay = rawFlags['ending_day'];
  const marigoldMysteryLayer = rawFlags['marigold_mystery_layer'];
  const wrenCluesGathered = rawFlags['wren_clues_gathered'];
  const playthroughCount = rawFlags['playthrough_count'];
  const previousEndings = rawFlags['previous_endings'];

  // v6 activity ledger flags (optional for backwards compat, default 0/empty)
  const activityTotalServes = rawFlags['activity_total_serves'];
  const activityFavoriteServes = rawFlags['activity_favorite_serves'];
  const activityCorrectServes = rawFlags['activity_correct_serves'];
  const activityServesByNpc = rawFlags['activity_serves_by_npc'];
  const activityServesByRecipe = rawFlags['activity_serves_by_recipe'];
  const activityTotalChats = rawFlags['activity_total_chats'];
  const activityChatsByNpc = rawFlags['activity_chats_by_npc'];
  const activityTotalBrews = rawFlags['activity_total_brews'];
  const activityExperimentalBrews = rawFlags['activity_experimental_brews'];
  const activityWrenMysteryBrews = rawFlags['activity_wren_mystery_brews'];
  const activityRecipeDiscoveries = rawFlags['activity_recipe_discoveries'];
  const activityDiscoveredRecipes = rawFlags['activity_discovered_recipes'];
  const activityJournalOpensTotal = rawFlags['activity_journal_opens_total'];
  const activityJournalOpensByTab = rawFlags['activity_journal_opens_by_tab'];
  const activityUpgradePurchases = rawFlags['activity_upgrade_purchases'];
  const activityDaysSkipped = rawFlags['activity_days_skipped'];
  const activityEarlyCloses = rawFlags['activity_early_closes'];
  const activityLettersRead = rawFlags['activity_letters_read'];
  const activityLettersDismissed = rawFlags['activity_letters_dismissed'];
  const activityReadLetterIds = rawFlags['activity_read_letter_ids'];
  const activityDismissedLetterIds = rawFlags['activity_dismissed_letter_ids'];
  const activityWrenVisits = rawFlags['activity_wren_visits'];
  const activityWrenMysteryClues = rawFlags['activity_wren_mystery_clues'];
  const activityIngredientsPurchased = rawFlags['activity_ingredients_purchased'];
  const activityVersion = rawFlags['activity_version'];

  if (currentChapter !== undefined && (!isFiniteNumber(currentChapter) || !Number.isInteger(currentChapter) || currentChapter < 0 || currentChapter > 5)) return { ok: false };
  if (chapterEnteredDay !== undefined && !isRecord(chapterEnteredDay)) return { ok: false };
  if (lettersDelivered !== undefined && !isStringArray(lettersDelivered)) return { ok: false };
  if (lettersRead !== undefined && !isStringArray(lettersRead)) return { ok: false };
  if (lettersDismissed !== undefined && !isStringArray(lettersDismissed)) return { ok: false };
  if (dominantDimensionHistory !== undefined && !isStringArray(dominantDimensionHistory)) return { ok: false };
  if (trajectoryHint !== undefined && trajectoryHint !== null && typeof trajectoryHint === 'string' && !['care', 'comfort', 'curiosity', 'community', 'independence'].includes(trajectoryHint)) return { ok: false };
  if (endingAchieved !== undefined && typeof endingAchieved === 'string' && !['keeper', 'builder', 'wanderer', 'community'].includes(endingAchieved)) return { ok: false };
  if (endingDay !== undefined && (!isFiniteNumber(endingDay) || !Number.isInteger(endingDay) || endingDay < 1)) return { ok: false };
  if (marigoldMysteryLayer !== undefined && (!isFiniteNumber(marigoldMysteryLayer) || !Number.isInteger(marigoldMysteryLayer) || marigoldMysteryLayer < 1 || marigoldMysteryLayer > 5)) return { ok: false };
  if (wrenCluesGathered !== undefined && (!isFiniteNumber(wrenCluesGathered) || !Number.isInteger(wrenCluesGathered) || wrenCluesGathered < 0 || wrenCluesGathered > 3)) return { ok: false };
  if (playthroughCount !== undefined && (!isFiniteNumber(playthroughCount) || !Number.isInteger(playthroughCount) || playthroughCount < 0)) return { ok: false };
  if (previousEndings !== undefined && !isStringArray(previousEndings)) return { ok: false };
  
  // v6 activity validation (optional, defaults applied)
  if (activityTotalServes !== undefined && (!isFiniteNumber(activityTotalServes) || activityTotalServes < 0)) return { ok: false };
  if (activityFavoriteServes !== undefined && (!isFiniteNumber(activityFavoriteServes) || activityFavoriteServes < 0)) return { ok: false };
  if (activityCorrectServes !== undefined && (!isFiniteNumber(activityCorrectServes) || activityCorrectServes < 0)) return { ok: false };
  if (activityServesByNpc !== undefined && !isRecord(activityServesByNpc)) return { ok: false };
  if (activityServesByRecipe !== undefined && !isRecord(activityServesByRecipe)) return { ok: false };
  if (activityTotalChats !== undefined && (!isFiniteNumber(activityTotalChats) || activityTotalChats < 0)) return { ok: false };
  if (activityChatsByNpc !== undefined && !isRecord(activityChatsByNpc)) return { ok: false };
  if (activityTotalBrews !== undefined && (!isFiniteNumber(activityTotalBrews) || activityTotalBrews < 0)) return { ok: false };
  if (activityExperimentalBrews !== undefined && (!isFiniteNumber(activityExperimentalBrews) || activityExperimentalBrews < 0)) return { ok: false };
  if (activityWrenMysteryBrews !== undefined && (!isFiniteNumber(activityWrenMysteryBrews) || activityWrenMysteryBrews < 0)) return { ok: false };
  if (activityRecipeDiscoveries !== undefined && (!isFiniteNumber(activityRecipeDiscoveries) || activityRecipeDiscoveries < 0)) return { ok: false };
  if (activityDiscoveredRecipes !== undefined && !isStringArray(activityDiscoveredRecipes)) return { ok: false };
  if (activityJournalOpensTotal !== undefined && (!isFiniteNumber(activityJournalOpensTotal) || activityJournalOpensTotal < 0)) return { ok: false };
  if (activityJournalOpensByTab !== undefined && !isRecord(activityJournalOpensByTab)) return { ok: false };
  if (activityUpgradePurchases !== undefined && (!isFiniteNumber(activityUpgradePurchases) || activityUpgradePurchases < 0)) return { ok: false };
  if (activityDaysSkipped !== undefined && (!isFiniteNumber(activityDaysSkipped) || activityDaysSkipped < 0)) return { ok: false };
  if (activityEarlyCloses !== undefined && (!isFiniteNumber(activityEarlyCloses) || activityEarlyCloses < 0)) return { ok: false };
  if (activityLettersRead !== undefined && (!isFiniteNumber(activityLettersRead) || activityLettersRead < 0)) return { ok: false };
  if (activityLettersDismissed !== undefined && (!isFiniteNumber(activityLettersDismissed) || activityLettersDismissed < 0)) return { ok: false };
  if (activityReadLetterIds !== undefined && !isStringArray(activityReadLetterIds)) return { ok: false };
  if (activityDismissedLetterIds !== undefined && !isStringArray(activityDismissedLetterIds)) return { ok: false };
  if (activityWrenVisits !== undefined && (!isFiniteNumber(activityWrenVisits) || activityWrenVisits < 0)) return { ok: false };
  if (activityWrenMysteryClues !== undefined && (!isFiniteNumber(activityWrenMysteryClues) || activityWrenMysteryClues < 0)) return { ok: false };
  if (activityIngredientsPurchased !== undefined && (!isFiniteNumber(activityIngredientsPurchased) || activityIngredientsPurchased < 0)) return { ok: false };
  if (activityVersion !== undefined && (!isFiniteNumber(activityVersion) || !Number.isInteger(activityVersion) || activityVersion < 1)) return { ok: false };

  // settings: all fields with ranges.
  const rawSettings = input['settings'];
  if (!isRecord(rawSettings)) return { ok: false };
  const relaxed = rawSettings['relaxed_mode'];
  const reducedMotion = rawSettings['reduced_motion'];
  const masterVol = rawSettings['master_vol'];
  if (
    typeof relaxed !== 'boolean' ||
    typeof reducedMotion !== 'boolean' ||
    !isFiniteNumber(masterVol) ||
    masterVol < 0 ||
    masterVol > 1
  ) {
    return { ok: false };
  }

  // v4 — text_size: one of the allowed steps; absent/invalid falls back to 100.
  const rawTextSize = rawSettings['text_size'];
  let textSize = 100;
  if (rawTextSize !== undefined) {
    if (!isFiniteNumber(rawTextSize) || !TEXT_SIZES.includes(rawTextSize)) return { ok: false };
    textSize = rawTextSize;
  }

  return {
    ok: true,
    data: {
      version,
      day,
      coins,
      stars,
      total_serves: totalServes,
      chatted_this_service: chatted,
      inventory,
      upgrades: rawUpgrades,
      hearts,
      heart_points_today: heartPointsToday,
      letters: rawLetters,
      flags: {
        discovered_recipes: disc,
        learned_prefs: prefs,
        seen_scenes: scenes,
        wren_usual_revealed: wrenRevealed,
        fenwick_arc_complete: typeof rawFlags['fenwick_arc_complete'] === 'boolean' ? rawFlags['fenwick_arc_complete'] : false,
        fenwick_epilogue_done: typeof rawFlags['fenwick_epilogue_done'] === 'boolean' ? rawFlags['fenwick_epilogue_done'] : false,
        wren_arc_complete: typeof rawFlags['wren_arc_complete'] === 'boolean' ? rawFlags['wren_arc_complete'] : false,
        wren_epilogue_done: typeof rawFlags['wren_epilogue_done'] === 'boolean' ? rawFlags['wren_epilogue_done'] : false,
        title_music_box_unlocked: typeof rawFlags['title_music_box_unlocked'] === 'boolean' ? rawFlags['title_music_box_unlocked'] : false,
        sela_intro_done: typeof rawFlags['sela_intro_done'] === 'boolean' ? rawFlags['sela_intro_done'] : false,
        bram_intro_done: typeof rawFlags['bram_intro_done'] === 'boolean' ? rawFlags['bram_intro_done'] : false,
        nia_intro_done: typeof rawFlags['nia_intro_done'] === 'boolean' ? rawFlags['nia_intro_done'] : false,
        fenwick_chili_granted: typeof rawFlags['fenwick_chili_granted'] === 'boolean' ? rawFlags['fenwick_chili_granted'] : false,
        kettle_auto_opened: typeof rawFlags['kettle_auto_opened'] === 'boolean' ? rawFlags['kettle_auto_opened'] : false,
        // v5 narrative flags with safe defaults
        current_chapter: typeof rawFlags['current_chapter'] === 'number' ? rawFlags['current_chapter'] : 0,
        chapter_entered_day: (isRecord(rawFlags['chapter_entered_day']) ? rawFlags['chapter_entered_day'] : { 0: day }) as Record<number, number>,
        letters_delivered: isStringArray(rawFlags['letters_delivered']) ? rawFlags['letters_delivered'] : (rawLetters ?? []),
        letters_read: isStringArray(rawFlags['letters_read']) ? rawFlags['letters_read'] : [],
        letters_dismissed: isStringArray(rawFlags['letters_dismissed']) ? rawFlags['letters_dismissed'] : [],
        dominant_dimension_history: isStringArray(rawFlags['dominant_dimension_history']) ? rawFlags['dominant_dimension_history'] : [],
        trajectory_hint: (rawFlags['trajectory_hint'] === 'care' || rawFlags['trajectory_hint'] === 'comfort' || rawFlags['trajectory_hint'] === 'curiosity' || rawFlags['trajectory_hint'] === 'community' || rawFlags['trajectory_hint'] === 'independence') ? rawFlags['trajectory_hint'] : null,
        ending_achieved: (rawFlags['ending_achieved'] === 'keeper' || rawFlags['ending_achieved'] === 'builder' || rawFlags['ending_achieved'] === 'wanderer' || rawFlags['ending_achieved'] === 'community') ? rawFlags['ending_achieved'] : undefined,
        ending_day: (typeof rawFlags['ending_day'] === 'number' && Number.isInteger(rawFlags['ending_day']) && rawFlags['ending_day'] >= 1) ? rawFlags['ending_day'] : undefined,
        marigold_mystery_layer: (typeof rawFlags['marigold_mystery_layer'] === 'number' && Number.isInteger(rawFlags['marigold_mystery_layer']) && rawFlags['marigold_mystery_layer'] >= 1 && rawFlags['marigold_mystery_layer'] <= 5) ? rawFlags['marigold_mystery_layer'] : 1,
        wren_clues_gathered: (typeof rawFlags['wren_clues_gathered'] === 'number' && Number.isInteger(rawFlags['wren_clues_gathered']) && rawFlags['wren_clues_gathered'] >= 0 && rawFlags['wren_clues_gathered'] <= 3) ? rawFlags['wren_clues_gathered'] : 0,
        playthrough_count: (typeof rawFlags['playthrough_count'] === 'number' && Number.isInteger(rawFlags['playthrough_count']) && rawFlags['playthrough_count'] >= 0) ? rawFlags['playthrough_count'] : 0,
        previous_endings: isStringArray(rawFlags['previous_endings']) ? rawFlags['previous_endings'] : [],
        // v6 activity ledger flags with safe defaults
        activity_total_serves: typeof rawFlags['activity_total_serves'] === 'number' ? rawFlags['activity_total_serves'] : 0,
        activity_favorite_serves: typeof rawFlags['activity_favorite_serves'] === 'number' ? rawFlags['activity_favorite_serves'] : 0,
        activity_correct_serves: typeof rawFlags['activity_correct_serves'] === 'number' ? rawFlags['activity_correct_serves'] : 0,
        activity_serves_by_npc: (isRecord(rawFlags['activity_serves_by_npc']) ? rawFlags['activity_serves_by_npc'] : {}) as Record<string, number>,
        activity_serves_by_recipe: (isRecord(rawFlags['activity_serves_by_recipe']) ? rawFlags['activity_serves_by_recipe'] : {}) as Record<string, number>,
        activity_total_chats: typeof rawFlags['activity_total_chats'] === 'number' ? rawFlags['activity_total_chats'] : 0,
        activity_chats_by_npc: (isRecord(rawFlags['activity_chats_by_npc']) ? rawFlags['activity_chats_by_npc'] : {}) as Record<string, number>,
        activity_total_brews: typeof rawFlags['activity_total_brews'] === 'number' ? rawFlags['activity_total_brews'] : 0,
        activity_experimental_brews: typeof rawFlags['activity_experimental_brews'] === 'number' ? rawFlags['activity_experimental_brews'] : 0,
        activity_wren_mystery_brews: typeof rawFlags['activity_wren_mystery_brews'] === 'number' ? rawFlags['activity_wren_mystery_brews'] : 0,
        activity_recipe_discoveries: typeof rawFlags['activity_recipe_discoveries'] === 'number' ? rawFlags['activity_recipe_discoveries'] : 0,
        activity_discovered_recipes: isStringArray(rawFlags['activity_discovered_recipes']) ? rawFlags['activity_discovered_recipes'] : [],
        activity_journal_opens_total: typeof rawFlags['activity_journal_opens_total'] === 'number' ? rawFlags['activity_journal_opens_total'] : 0,
        activity_journal_opens_by_tab: (isRecord(rawFlags['activity_journal_opens_by_tab']) ? rawFlags['activity_journal_opens_by_tab'] : {}) as Record<string, number>,
        activity_upgrade_purchases: typeof rawFlags['activity_upgrade_purchases'] === 'number' ? rawFlags['activity_upgrade_purchases'] : 0,
        activity_days_skipped: typeof rawFlags['activity_days_skipped'] === 'number' ? rawFlags['activity_days_skipped'] : 0,
        activity_early_closes: typeof rawFlags['activity_early_closes'] === 'number' ? rawFlags['activity_early_closes'] : 0,
        activity_letters_read: typeof rawFlags['activity_letters_read'] === 'number' ? rawFlags['activity_letters_read'] : 0,
        activity_letters_dismissed: typeof rawFlags['activity_letters_dismissed'] === 'number' ? rawFlags['activity_letters_dismissed'] : 0,
        activity_read_letter_ids: isStringArray(rawFlags['activity_read_letter_ids']) ? rawFlags['activity_read_letter_ids'] : [],
        activity_dismissed_letter_ids: isStringArray(rawFlags['activity_dismissed_letter_ids']) ? rawFlags['activity_dismissed_letter_ids'] : [],
        activity_wren_visits: typeof rawFlags['activity_wren_visits'] === 'number' ? rawFlags['activity_wren_visits'] : 0,
        activity_wren_mystery_clues: typeof rawFlags['activity_wren_mystery_clues'] === 'number' ? rawFlags['activity_wren_mystery_clues'] : 0,
        activity_ingredients_purchased: typeof rawFlags['activity_ingredients_purchased'] === 'number' ? rawFlags['activity_ingredients_purchased'] : 0,
        activity_version: typeof rawFlags['activity_version'] === 'number' ? rawFlags['activity_version'] : 1,
      },
      settings: { relaxed_mode: relaxed, reduced_motion: reducedMotion, master_vol: masterVol, text_size: textSize },
    },
  };
}

/** Build the initial save for a brand-new game (day 1, empty ledger). */
export function createInitialSave(): SaveData {
  return {
    version: SAVE_SCHEMA_VERSION,
    day: 1,
    coins: 0,
    stars: 0,
    total_serves: 0,
    chatted_this_service: false,
    inventory: {
      tea_leaves: 10,
      honey: 6,
      moonleaf: 4,
      cocoa: 0,
      ember_chili: 0,
      cloud_sugar: 0,
      frostberries: 0,
      ginger_root: 0,
      sage: 0,
    },
    upgrades: [],
    hearts: {},
    heart_points_today: {},
    // Day-1 Marigold letter seeds the archive (journal Letters tab).
    letters: ['letter_marigold_1'],
    flags: {
            discovered_recipes: ['R001', 'R002'],
            learned_prefs: [],
            seen_scenes: [],
            wren_usual_revealed: false,
            fenwick_arc_complete: false,
            fenwick_epilogue_done: false,
            wren_arc_complete: false,
            wren_epilogue_done: false,
            title_music_box_unlocked: false,
            sela_intro_done: false,
            bram_intro_done: false,
            nia_intro_done: false,
            fenwick_chili_granted: false,
            kettle_auto_opened: false,
            // v5 — Narrative system flags
            current_chapter: 0,
            chapter_entered_day: { 0: 1 },
            letters_delivered: ['letter_marigold_1'],
            letters_read: [],
            letters_dismissed: [],
            dominant_dimension_history: [],
            trajectory_hint: null,
            // ending_achieved: omitted (optional)
            // ending_day: omitted (optional)
            marigold_mystery_layer: 1,
            wren_clues_gathered: 0,
            playthrough_count: 0,
            previous_endings: [],
            // v6 — Activity ledger flags
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
    settings: { relaxed_mode: true, reduced_motion: false, master_vol: 0.8, text_size: 100 },
  };
}
