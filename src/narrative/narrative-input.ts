// src/narrative/narrative-input.ts — narrow read-only interface for narrative system
// The ONLY place that translates SaveData into narrative-consumable data.

import type { ActivityCounters } from './activity-ledger';

export { type ActivityCounters } from './activity-ledger';

export type NarrativeDimension =
  | 'care'
  | 'curiosity'
  | 'community'
  | 'comfort'
  | 'independence';

export type NarrativeChapter = 0 | 1 | 2 | 3 | 4 | 5;

export interface RelationshipSnapshot {
  heartPoints: Record<string, number>;
  heartPointsToday: Record<string, number>;
  displayedHearts: Record<string, number>;
  learnedPrefs: string[];
  heartsBreadth: number;
  uniqueNPCsServed: number;
}

export interface RecipeSnapshot {
  discoveredRecipes: string[];
  totalRecipes: number;
  hintCardsRead: number;
  experimentalBrewCount: number;
  wrenMysteryBrewCount: number;
  wrenVisits: number;
  wrenScenesSeen: number;
}

export interface UpgradeSnapshot {
  ownedUpgrades: string[];
  upgradesOwned: number;
  maxUpgrades: number;
  shelfCapacity: number;
  maxShelfCapacity: number;
  inventoryKinds: number;
  maxInventoryKinds: number;
  shopVisits: number;
}

export interface LetterSnapshot {
  archivedLetters: string[];
  lettersDelivered: string[];
  lettersRead: string[];
  lettersDismissed: string[];
  townLettersDelivered: number;
  maxLetters: number;
}

export interface StorySnapshot {
  chapter: number;
  chapterEnteredDay: Record<number, number>;
  marigoldMysteryLayer: number;
  wrenCluesGathered: number;
  seenScenes: string[];
  flags: Record<string, boolean>;
  trajectoryHint: 'care' | 'comfort' | 'curiosity' | 'community' | 'independence' | null;
  endingAchieved: 'keeper' | 'builder' | 'wanderer' | 'community' | null;
  playthroughCount: number;
  previousEndings: string[];
  marigoldLettersDelivered: string[];
  npcLettersDelivered: Record<string, string[]>;
  mysteryLettersDelivered: string[];
  townLettersDelivered: string[];
  branchLettersDelivered: string[];
}

export interface ActivitySnapshot {
  day: number;
  totalServes: number;
  stars: number;
  coins: number;
  avgHearts: number;
  favoriteServeRatio: number;
  chatCount: number;
  chatRatio: number;
  journalOpensPerDay: number;
  recipeDiscoveryRatio: number;
  experimentalBrewCount: number;
  experimentalBrewRatio: number;
  wrenMysteryBrewCount: number;
  wrenMysteryBrewRatio: number;
  wrenVisits: number;
  uniqueNPCsServed: number;
  heartsBreadth: number;
  lettersArchivedRatio: number;
  townTabOpensPerDay: number;
  upgradesOwnedRatio: number;
  starsRatio: number;
  shelfCapacityRatio: number;
  inventoryKindsRatio: number;
  shopVisitsPerDay: number;
  daysSkippedRatio: number;
  earlyCloseRatio: number;
  relaxedMode: boolean;
  daysSkipped: number;
  serviceDays: number;
  earlyCloses: number;
  relaxedModeSetting: boolean;
  /** Real activity counters from ledger */
  activity: ActivityCounters;
}

export interface NarrativeInput {
  relationships: RelationshipSnapshot;
  recipes: RecipeSnapshot;
  upgrades: UpgradeSnapshot;
  letters: LetterSnapshot;
  story: StorySnapshot;
  activity: ActivitySnapshot;
}

const REGULAR_NPCS = ['fenwick', 'sela', 'bram', 'nia', 'wren'] as const;
const HINTED_RECIPES = ['R004', 'R005', 'R006', 'R007'] as const;

interface SaveDataLike {
  day: number;
  stars: number;
  coins: number;
  total_serves: number;
  hearts: Record<string, number>;
  heart_points_today: Record<string, number>;
  inventory: Record<string, number>;
  upgrades: readonly string[];
  letters: readonly string[];
  flags: {
    discovered_recipes: readonly string[];
    learned_prefs: readonly string[];
    seen_scenes: readonly string[];
    current_chapter: number;
    chapter_entered_day: Record<number, number>;
    letters_delivered: readonly string[];
    letters_read: readonly string[];
    letters_dismissed: readonly string[];
    dominant_dimension_history: readonly string[];
    trajectory_hint: 'care' | 'comfort' | 'curiosity' | 'community' | 'independence' | null;
    ending_achieved?: 'keeper' | 'builder' | 'wanderer' | 'community';
    ending_day?: number;
    marigold_mystery_layer: number;
    wren_clues_gathered: number;
    playthrough_count: number;
    previous_endings: readonly string[];
    wren_usual_revealed: boolean;
    fenwick_arc_complete: boolean;
    fenwick_epilogue_done: boolean;
    wren_arc_complete: boolean;
    wren_epilogue_done: boolean;
    title_music_box_unlocked: boolean;
    sela_intro_done: boolean;
    bram_intro_done: boolean;
    nia_intro_done: boolean;
    fenwick_chili_granted: boolean;
    kettle_auto_opened: boolean;
    [key: string]: unknown;
  };
  settings: {
    relaxed_mode: boolean;
    reduced_motion: boolean;
    master_vol: number;
    text_size: number;
  };
}

interface ResultType {
  relationships: RelationshipSnapshot;
  recipes: RecipeSnapshot;
  upgrades: UpgradeSnapshot;
  letters: LetterSnapshot;
  story: StorySnapshot;
  activity: ActivitySnapshot;
}

/**
 * Create NarrativeInput from SaveData.
 * This is the ONLY place that translates SaveData into narrative input.
 */
export function createNarrativeInput(save: {
  day: number;
  stars: number;
  coins: number;
  total_serves: number;
  hearts: Record<string, number>;
  heart_points_today: Record<string, number>;
  inventory: Record<string, number>;
  upgrades: readonly string[];
  letters: readonly string[];
  flags: {
    discovered_recipes: readonly string[];
    learned_prefs: readonly string[];
    seen_scenes: readonly string[];
    current_chapter: number;
    chapter_entered_day: Record<number, number>;
    letters_delivered: readonly string[];
    letters_read: readonly string[];
    letters_dismissed: readonly string[];
    dominant_dimension_history: readonly string[];
    trajectory_hint: 'care' | 'comfort' | 'curiosity' | 'community' | 'independence' | null;
    ending_achieved?: 'keeper' | 'builder' | 'wanderer' | 'community';
    ending_day?: number;
    marigold_mystery_layer: number;
    wren_clues_gathered: number;
    playthrough_count: number;
    previous_endings: readonly string[];
    wren_usual_revealed: boolean;
    fenwick_arc_complete: boolean;
    fenwick_epilogue_done: boolean;
    wren_arc_complete: boolean;
    wren_epilogue_done: boolean;
    title_music_box_unlocked: boolean;
    sela_intro_done: boolean;
    bram_intro_done: boolean;
    nia_intro_done: boolean;
    fenwick_chili_granted: boolean;
    kettle_auto_opened: boolean;
    // v6 activity ledger flags
    activity_total_serves: number;
    activity_favorite_serves: number;
    activity_correct_serves: number;
    activity_serves_by_npc: Record<string, number>;
    activity_serves_by_recipe: Record<string, number>;
    activity_total_chats: number;
    activity_chats_by_npc: Record<string, number>;
    activity_total_brews: number;
    activity_experimental_brews: number;
    activity_wren_mystery_brews: number;
    activity_recipe_discoveries: number;
    activity_discovered_recipes: readonly string[];
    activity_journal_opens_total: number;
    activity_journal_opens_by_tab: Record<string, number>;
    activity_upgrade_purchases: number;
    activity_days_skipped: number;
    activity_early_closes: number;
    activity_letters_read: number;
    activity_letters_dismissed: number;
    activity_read_letter_ids: readonly string[];
    activity_dismissed_letter_ids: readonly string[];
    activity_wren_visits: number;
    activity_wren_mystery_clues: number;
    activity_ingredients_purchased: number;
    activity_version: number;
    [key: string]: unknown;
  };
  settings: {
    relaxed_mode: boolean;
    reduced_motion: boolean;
    master_vol: number;
    text_size: number;
  };
}): ResultType {
  // --- Relationships ---
  const heartPoints: Record<string, number> = {};
  const heartPointsToday: Record<string, number> = {};
  const displayedHearts: Record<string, number> = {};

  for (const npc of REGULAR_NPCS) {
    heartPoints[npc] = save.hearts[npc] ?? 0;
    heartPointsToday[npc] = save.heart_points_today[npc] ?? 0;
    const points = save.hearts[npc] ?? 0;
    displayedHearts[npc] = Math.floor(points + 1e-9);
  }

  const heartsBreadth = REGULAR_NPCS.filter(npc => (save.hearts[npc] ?? 0) > 0).length;
  const uniqueNPCsServed = REGULAR_NPCS.filter(npc => (save.hearts[npc] ?? 0) > 0).length;
  const learnedPrefs = [...save.flags.learned_prefs];

  // --- Recipes ---
  const discoveredRecipes = [...save.flags.discovered_recipes];
  const totalRecipes = 8;
  const hintCardsRead = HINTED_RECIPES.filter(r => save.flags.discovered_recipes.includes(r)).length;
  const experimentalBrewCount = 0;
  const wrenMysteryBrewCount = 0;
  const wrenScenesSeen = save.flags.seen_scenes.filter(s => s.startsWith('wren_')).length;

  const wrenHeartsVal = save.hearts['wren'] ?? 0;
  const wrenVisits = Math.floor(wrenHeartsVal + 1e-9) + save.flags.seen_scenes.filter(s => s.startsWith('wren_')).length;

  // --- Upgrades ---
  const ownedUpgrades = [...save.upgrades];
  const upgradesOwned = save.upgrades.length;
  const maxUpgrades = 7;
  const biggerShelfCount = save.upgrades.filter(u => u === 'bigger_shelf').length;
  const shelfCapacity = 6 + biggerShelfCount * 3;
  const maxShelfCapacity = 12;
  const inventoryKinds = Object.values(save.inventory).filter(v => v > 0).length;
  const maxInventoryKinds = 9;
  const shopVisits = save.upgrades.length + Object.values(save.inventory).reduce((a, b) => a + b, 0);

  // --- Letters ---
  const archivedLetters = [...save.letters];
  const lettersDelivered = [...save.flags.letters_delivered];
  const lettersRead = [...save.flags.letters_read];
  const lettersDismissed = [...save.flags.letters_dismissed];
  const townLettersDeliveredCount = save.letters.filter(l => l.startsWith('town_')).length;
  const maxLetters = 40;

  // --- Story ---
  const chapter = save.flags.current_chapter ?? 0;
  const chapterEnteredDay = { ...save.flags.chapter_entered_day };
  const marigoldMysteryLayer = save.flags.marigold_mystery_layer ?? 1;
  const wrenCluesGathered = save.flags.wren_clues_gathered ?? 0;
  const seenScenes = [...save.flags.seen_scenes];
  
  const flags: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(save.flags)) {
    if (typeof value === 'boolean') flags[key] = value;
  }
  
  const trajectoryHint = save.flags.trajectory_hint ?? null;
  const endingAchieved = (save.flags.ending_achieved as 'keeper' | 'builder' | 'wanderer' | 'community' | undefined) ?? null;
  const playthroughCount = save.flags.playthrough_count ?? 0;
  const previousEndings = [...(save.flags.previous_endings ?? [])];

  const marigoldLettersDelivered = save.flags.letters_delivered.filter(l => l.startsWith('marigold_'));
  
  const npcLettersDelivered: Record<string, string[]> = {
    fenwick: [],
    sela: [],
    bram: [],
    nia: [],
    wren: [],
  };
  const mysteryLettersDelivered: string[] = [];
  const townLettersDeliveredArr: string[] = [];
  const branchLettersDelivered: string[] = [];

  for (const letter of save.flags.letters_delivered) {
    if (letter.startsWith('fenwick_')) (npcLettersDelivered['fenwick'] ??= []).push(letter);
    else if (letter.startsWith('sela_')) (npcLettersDelivered['sela'] ??= []).push(letter);
    else if (letter.startsWith('bram_')) (npcLettersDelivered['bram'] ??= []).push(letter);
    else if (letter.startsWith('nia_')) (npcLettersDelivered['nia'] ??= []).push(letter);
    else if (letter.startsWith('wren_')) (npcLettersDelivered['wren'] ??= []).push(letter);
    else if (letter.startsWith('mystery_')) mysteryLettersDelivered.push(letter);
    else if (letter.startsWith('town_')) townLettersDeliveredArr.push(letter);
    else if (letter.startsWith('reactive_')) branchLettersDelivered.push(letter);
  }

  // --- Activity ---
  const day = save.day;
  const totalServes = save.total_serves ?? 0;
  const stars = save.stars;
  const coins = save.coins;

  const avgHearts = ((save.hearts['fenwick'] ?? 0) + (save.hearts['sela'] ?? 0) + (save.hearts['bram'] ?? 0) + (save.hearts['nia'] ?? 0) + (save.hearts['wren'] ?? 0)) / 5;

  let favoriteServeEstimate = 0;
  for (const npc of REGULAR_NPCS) {
    favoriteServeEstimate += Math.floor((save.hearts[npc] ?? 0) + 1e-9);
  }
  const favoriteServeRatio = totalServes > 0 ? favoriteServeEstimate / totalServes : 0;

  let chatCount = 0;
  for (const pointsToday of Object.values(save.heart_points_today)) {
    chatCount += Math.floor(pointsToday / 0.25);
  }
  const chatRatioVal = totalServes > 0 ? chatCount / totalServes : 0;

  const journalOpens = (save.flags.letters_read?.length ?? 0) + save.flags.discovered_recipes.length;
  const journalOpensPerDay = save.day > 0 ? journalOpens / save.day : 0;

  const experimentalBrewRatio = 0;
  const wrenMysteryBrewRatio = 0;
  const recipeDiscoveryRatio = 0;

  const heartsBreadthVal = REGULAR_NPCS.filter(npc => Math.floor((save.hearts[npc] ?? 0) + 1e-9) >= 1).length;

  const lettersArchivedRatio = save.letters.length / 40;
  const townTabOpensPerDay = save.day > 0 ? save.letters.filter(l => l.startsWith('town_')).length / save.day : 0;
  const upgradesOwnedRatio = save.upgrades.length / 7;
  const starsRatio = save.stars / 5;
  const biggerShelfCountVal = save.upgrades.filter(u => u === 'bigger_shelf').length;
  const shelfCapacityVal = 6 + biggerShelfCountVal * 3;
  const shelfCapacityRatio = shelfCapacityVal / 12;
  const inventoryKindsRatio = inventoryKinds / 9;
  const shopVisitsVal = save.upgrades.length + Object.values(save.inventory).reduce((a, b) => a + b, 0);
  const shopVisitsPerDay = save.day > 0 ? shopVisitsVal / save.day : 0;

  const expectedServes = save.day * 5;
  const actualServes = save.total_serves ?? 0;
  const daysSkipped = Math.max(0, Math.floor((expectedServes - actualServes) / 5));
  const serviceDays = Math.max(1, save.day - daysSkipped);
  const daysSkippedRatio = daysSkipped / 14;
  const earlyCloses = 0;
  const earlyCloseRatio = serviceDays > 0 ? 0 / serviceDays : 0;
  const relaxedModeSetting = save.settings.relaxed_mode ?? true;

  const result: ResultType = {
    relationships: {
      heartPoints: { ...save.hearts },
      heartPointsToday: { ...save.heart_points_today },
      displayedHearts,
      learnedPrefs,
      heartsBreadth,
      uniqueNPCsServed,
    },
    recipes: {
      discoveredRecipes,
      totalRecipes,
      hintCardsRead,
      experimentalBrewCount,
      wrenMysteryBrewCount,
      wrenVisits,
      wrenScenesSeen,
    },
    upgrades: {
      ownedUpgrades,
      upgradesOwned,
      maxUpgrades,
      shelfCapacity,
      maxShelfCapacity,
      inventoryKinds,
      maxInventoryKinds,
      shopVisits,
    },
    letters: {
      archivedLetters,
      lettersDelivered,
      lettersRead,
      lettersDismissed,
      townLettersDelivered: townLettersDeliveredCount,
      maxLetters,
    },
    story: {
      chapter,
      chapterEnteredDay,
      marigoldMysteryLayer,
      wrenCluesGathered,
      seenScenes,
      flags,
      trajectoryHint,
      endingAchieved,
      playthroughCount,
      previousEndings,
      marigoldLettersDelivered,
      npcLettersDelivered,
      mysteryLettersDelivered,
      townLettersDelivered: townLettersDeliveredArr,
      branchLettersDelivered,
    },
    activity: {
      day,
      totalServes,
      stars,
      coins,
      avgHearts,
      favoriteServeRatio,
      chatCount,
      chatRatio: chatRatioVal,
      journalOpensPerDay,
      recipeDiscoveryRatio,
      experimentalBrewCount,
      experimentalBrewRatio,
      wrenMysteryBrewCount,
      wrenMysteryBrewRatio,
      wrenVisits,
      uniqueNPCsServed,
      heartsBreadth: heartsBreadthVal,
      lettersArchivedRatio,
      townTabOpensPerDay,
      upgradesOwnedRatio,
      starsRatio,
      shelfCapacityRatio,
      inventoryKindsRatio,
      shopVisitsPerDay,
      daysSkippedRatio,
      earlyCloseRatio,
      relaxedMode: relaxedModeSetting,
      daysSkipped,
      serviceDays,
      earlyCloses,
      relaxedModeSetting,
      activity: {
        totalServes: save.flags.activity_total_serves ?? save.total_serves ?? 0,
        favoriteServeCount: save.flags.activity_favorite_serves ?? 0,
        correctServeCount: save.flags.activity_correct_serves ?? 0,
        servesByNpc: save.flags.activity_serves_by_npc ?? {},
        servesByRecipe: save.flags.activity_serves_by_recipe ?? {},
        totalChats: save.flags.activity_total_chats ?? 0,
        chatsByNpc: save.flags.activity_chats_by_npc ?? {},
        totalBrews: save.flags.activity_total_brews ?? 0,
        experimentalBrewCount: save.flags.activity_experimental_brews ?? 0,
        wrenMysteryBrewCount: save.flags.activity_wren_mystery_brews ?? 0,
        recipeDiscoveryCount: save.flags.activity_recipe_discoveries ?? 0,
        discoveredRecipes: [...(save.flags.activity_discovered_recipes ?? save.flags.discovered_recipes ?? [])],
        journalOpensTotal: save.flags.activity_journal_opens_total ?? 0,
        journalOpensByTab: save.flags.activity_journal_opens_by_tab ?? {},
        upgradePurchaseCount: save.flags.activity_upgrade_purchases ?? save.upgrades.length,
        daysSkipped: save.flags.activity_days_skipped ?? 0,
        earlyCloses: save.flags.activity_early_closes ?? 0,
        lettersReadCount: save.flags.activity_letters_read ?? save.flags.letters_read?.length ?? 0,
        lettersDismissedCount: save.flags.activity_letters_dismissed ?? save.flags.letters_dismissed?.length ?? 0,
        readLetterIds: [...(save.flags.activity_read_letter_ids ?? save.flags.letters_read ?? [])],
        dismissedLetterIds: [...(save.flags.activity_dismissed_letter_ids ?? save.flags.letters_dismissed ?? [])],
        wrenVisits: save.flags.activity_wren_visits ?? 0,
        wrenMysteryClues: save.flags.activity_wren_mystery_clues ?? 0,
        ingredientsPurchasedTotal: save.flags.activity_ingredients_purchased ?? 0,
        version: save.flags.activity_version ?? 1,
      },
    },
  };

  return result;
}