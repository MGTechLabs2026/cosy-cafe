// tests/narrative-input.test.ts — tests for NarrativeInput adapter, signals, evaluator, and state
import { describe, it, expect } from 'vitest';
import { createNarrativeInput, type NarrativeInput } from '../src/narrative/narrative-input';
import { calculateAllSignals } from '../src/narrative/narrative-signals';
import { evaluateNarrativeStateFromInput, type NarrativeState } from '../src/narrative/narrative-state';
import { createEmptyCounters } from '../src/narrative/activity-ledger';
import {
  NarrativeScheduler,
  createSchedulerStoryProgress,
} from '../src/narrative/narrative-scheduler';
import { CHAPTER_CONFIGS, ENDING_CONFIGS } from '../src/narrative/story-definitions';

export { 
  evaluateNarrativeStateFromInput, 
  createMockNarrativeInput, 
  createMockActivity,
  createEmptyCounters 
};

function createMockSaveData(overrides: Partial<{
  day: number;
  stars: number;
  coins: number;
  total_serves: number;
  hearts: Record<string, number>;
  heart_points_today: Record<string, number>;
  inventory: Record<string, number>;
  upgrades: string[];
  letters: string[];
  flags: {
    discovered_recipes: string[];
    learned_prefs: string[];
    seen_scenes: string[];
    current_chapter: number;
    chapter_entered_day: Record<number, number>;
    letters_delivered: string[];
    letters_read: string[];
    letters_dismissed: string[];
    dominant_dimension_history: string[];
    trajectory_hint: 'care' | 'comfort' | 'curiosity' | 'community' | 'independence' | null;
    ending_achieved?: 'keeper' | 'builder' | 'wanderer' | 'community';
    ending_day?: number;
    marigold_mystery_layer: number;
    wren_clues_gathered: number;
    playthrough_count: number;
    previous_endings: string[];
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
    activity_discovered_recipes: string[];
    activity_journal_opens_total: number;
    activity_journal_opens_by_tab: Record<string, number>;
    activity_upgrade_purchases: number;
    activity_days_skipped: number;
    activity_early_closes: number;
    activity_letters_read: number;
    activity_letters_dismissed: number;
    activity_read_letter_ids: string[];
    activity_dismissed_letter_ids: string[];
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
}>): {
  day: number;
  stars: number;
  coins: number;
  total_serves: number;
  hearts: Record<string, number>;
  heart_points_today: Record<string, number>;
  inventory: Record<string, number>;
  upgrades: string[];
  letters: string[];
  flags: {
    discovered_recipes: string[];
    learned_prefs: string[];
    seen_scenes: string[];
    current_chapter: number;
    chapter_entered_day: Record<number, number>;
    letters_delivered: string[];
    letters_read: string[];
    letters_dismissed: string[];
    dominant_dimension_history: string[];
    trajectory_hint: 'care' | 'comfort' | 'curiosity' | 'community' | 'independence' | null;
    ending_achieved?: 'keeper' | 'builder' | 'wanderer' | 'community';
    ending_day?: number;
    marigold_mystery_layer: number;
    wren_clues_gathered: number;
    playthrough_count: number;
    previous_endings: string[];
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
    activity_discovered_recipes: string[];
    activity_journal_opens_total: number;
    activity_journal_opens_by_tab: Record<string, number>;
    activity_upgrade_purchases: number;
    activity_days_skipped: number;
    activity_early_closes: number;
    activity_letters_read: number;
    activity_letters_dismissed: number;
    activity_read_letter_ids: string[];
    activity_dismissed_letter_ids: string[];
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
} {
  const defaultSave = {
    day: 1,
    stars: 0,
    coins: 100,
    total_serves: 0,
    hearts: { fenwick: 0, sela: 0, bram: 0, nia: 0, wren: 0 },
    heart_points_today: { fenwick: 0, sela: 0, bram: 0, nia: 0, wren: 0 },
    inventory: { tea_leaves: 10, honey: 6, moonleaf: 4, cocoa: 0, ember_chili: 0, cloud_sugar: 0, frostberries: 0, ginger_root: 0, sage: 0 },
    upgrades: [],
    letters: [],
    flags: {
      discovered_recipes: ['R001', 'R002'],
      learned_prefs: [],
      seen_scenes: [],
      current_chapter: 0,
      chapter_entered_day: { 0: 1 },
      letters_delivered: ['letter_marigold_1'],
      letters_read: [],
      letters_dismissed: [],
      dominant_dimension_history: [],
      trajectory_hint: null,
      marigold_mystery_layer: 1,
      wren_clues_gathered: 0,
      playthrough_count: 0,
      previous_endings: [],
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
    settings: { relaxed_mode: true, reduced_motion: false, master_vol: 1, text_size: 100 },
  };

  return {
    ...defaultSave,
    ...overrides,
    hearts: { ...defaultSave.hearts, ...(overrides.hearts ?? {}) },
    heart_points_today: { ...defaultSave.heart_points_today, ...(overrides.heart_points_today ?? {}) },
    inventory: { ...defaultSave.inventory, ...(overrides.inventory ?? {}) },
    upgrades: overrides.upgrades ?? defaultSave.upgrades,
    letters: overrides.letters ?? defaultSave.letters,
    flags: { ...defaultSave.flags, ...(overrides.flags ?? {}) },
    settings: { ...defaultSave.settings, ...(overrides.settings ?? {}) },
  };
}

function createMockActivity(counters: Partial<ReturnType<typeof createEmptyCounters>> = {}) {
  return {
    ...createEmptyCounters(),
    ...counters,
  };
}

function createMockNarrativeInput(overrides: Partial<NarrativeInput> = {}): NarrativeInput {
  const defaultActivity = {
    day: 1,
    totalServes: 0,
    stars: 0,
    coins: 100,
    avgHearts: 0,
    favoriteServeRatio: 0,
    chatCount: 0,
    chatRatio: 0,
    journalOpensPerDay: 0,
    recipeDiscoveryRatio: 0,
    experimentalBrewCount: 0,
    experimentalBrewRatio: 0,
    wrenMysteryBrewCount: 0,
    wrenMysteryBrewRatio: 0,
    wrenVisits: 0,
    uniqueNPCsServed: 0,
    heartsBreadth: 0,
    lettersArchivedRatio: 0,
    townTabOpensPerDay: 0,
    upgradesOwnedRatio: 0,
    starsRatio: 0,
    shelfCapacityRatio: 0.5,
    inventoryKindsRatio: 0.11,
    shopVisitsPerDay: 0,
    daysSkippedRatio: 0,
    earlyCloseRatio: 0,
    relaxedMode: true,
    daysSkipped: 0,
    serviceDays: 1,
    earlyCloses: 0,
    relaxedModeSetting: true,
    activity: createMockActivity(),
  };

  const defaultInput: NarrativeInput = {
    relationships: {
      heartPoints: { fenwick: 0, sela: 0, bram: 0, nia: 0, wren: 0 },
      heartPointsToday: { fenwick: 0, sela: 0, bram: 0, nia: 0, wren: 0 },
      displayedHearts: { fenwick: 0, sela: 0, bram: 0, nia: 0, wren: 0 },
      learnedPrefs: [],
      heartsBreadth: 0,
      uniqueNPCsServed: 0,
    },
    recipes: {
      discoveredRecipes: ['R001', 'R002'],
      totalRecipes: 8,
      hintCardsRead: 0,
      experimentalBrewCount: 0,
      wrenMysteryBrewCount: 0,
      wrenVisits: 0,
      wrenScenesSeen: 0,
    },
    upgrades: {
      ownedUpgrades: [],
      upgradesOwned: 0,
      maxUpgrades: 7,
      shelfCapacity: 6,
      maxShelfCapacity: 12,
      inventoryKinds: 3,
      maxInventoryKinds: 9,
      shopVisits: 0,
    },
    letters: {
      archivedLetters: ['letter_marigold_1'],
      lettersDelivered: ['letter_marigold_1'],
      lettersRead: ['letter_marigold_1'],
      lettersDismissed: [],
      townLettersDelivered: 0,
      maxLetters: 40,
    },
    story: {
      chapter: 0,
      chapterEnteredDay: { 0: 1 },
      marigoldMysteryLayer: 1,
      wrenCluesGathered: 0,
      seenScenes: [],
      flags: {},
      trajectoryHint: null,
      endingAchieved: null,
      playthroughCount: 0,
      previousEndings: [],
      marigoldLettersDelivered: ['letter_marigold_1'],
      npcLettersDelivered: { fenwick: [], sela: [], bram: [], nia: [], wren: [] },
      mysteryLettersDelivered: [],
      townLettersDelivered: [],
      branchLettersDelivered: [],
    },
    activity: defaultActivity,
  };

  return {
    ...defaultInput,
    ...overrides,
    activity: { ...defaultActivity, ...(overrides.activity ?? {}) },
  };
}

describe('createNarrativeInput', () => {
  it('creates valid NarrativeInput from minimal SaveData', () => {
    const save = createMockSaveData({});
    const input = createNarrativeInput(save);

    expect(input).toBeDefined();
    expect(input.relationships).toBeDefined();
    expect(input.recipes).toBeDefined();
    expect(input.upgrades).toBeDefined();
    expect(input.letters).toBeDefined();
    expect(input.story).toBeDefined();
    expect(input.activity).toBeDefined();
    expect(input.activity.activity).toBeDefined();
  });

  it('computes relationships correctly', () => {
    const save = createMockSaveData({
      hearts: { fenwick: 2.5, sela: 1.0, bram: 0, nia: 0, wren: 0 },
      heart_points_today: { fenwick: 0.5, sela: 0, bram: 0, nia: 0, wren: 0 },
    });
    const input = createNarrativeInput(save);

    expect(input.relationships.displayedHearts.fenwick).toBe(2);
    expect(input.relationships.displayedHearts.sela).toBe(1);
    expect(input.relationships.heartsBreadth).toBe(2);
    expect(input.relationships.uniqueNPCsServed).toBe(2);
  });

  it('computes recipes correctly', () => {
    const save = createMockSaveData({
      flags: {
        discovered_recipes: ['R001', 'R002', 'R003', 'R004'],
        seen_scenes: ['wren_1', 'wren_2'],
      },
    });
    const input = createNarrativeInput(save);

    expect(input.recipes.discoveredRecipes).toEqual(['R001', 'R002', 'R003', 'R004']);
    expect(input.recipes.hintCardsRead).toBe(1); // R004
    expect(input.recipes.wrenScenesSeen).toBe(2);
  });

  it('computes upgrades correctly', () => {
    const save = createMockSaveData({
      upgrades: ['bigger_shelf', 'second_kettle', 'recipe_hints'],
    });
    const input = createNarrativeInput(save);

    expect(input.upgrades.upgradesOwned).toBe(3);
    expect(input.upgrades.ownedUpgrades).toContain('bigger_shelf');
    expect(input.upgrades.shelfCapacity).toBe(9); // 6 + 3
    expect(input.upgrades.inventoryKinds).toBe(3); // tea_leaves, honey, moonleaf
  });

  it('computes letters correctly', () => {
    const save = createMockSaveData({
      letters: ['letter_marigold_1', 'town_news_1'],
      flags: {
        letters_delivered: ['letter_marigold_1', 'letter_fenwick_1', 'town_news_1'],
        letters_read: ['letter_marigold_1'],
        letters_dismissed: ['letter_fenwick_1'],
      },
    });
    const input = createNarrativeInput(save);

    expect(input.letters.lettersDelivered).toEqual(['letter_marigold_1', 'letter_fenwick_1', 'town_news_1']);
    expect(input.letters.lettersRead).toEqual(['letter_marigold_1']);
    expect(input.letters.lettersDismissed).toEqual(['letter_fenwick_1']);
    expect(input.letters.townLettersDelivered).toBe(1);
  });

  it('computes story correctly', () => {
    const save = createMockSaveData({
      day: 7,
      flags: {
        current_chapter: 1,
        chapter_entered_day: { 0: 1, 1: 7 },
        trajectory_hint: 'care',
        marigold_mystery_layer: 2,
        wren_clues_gathered: 1,
        playthrough_count: 0,
        seen_scenes: ['wren_1'],
      },
    });
    const input = createNarrativeInput(save);

    expect(input.story.chapter).toBe(1);
    expect(input.story.chapterEnteredDay[1]).toBe(7);
    expect(input.story.trajectoryHint).toBe('care');
    expect(input.story.marigoldMysteryLayer).toBe(2);
    expect(input.story.wrenCluesGathered).toBe(1);
    expect(input.story.seenScenes).toEqual(['wren_1']);
  });

  it('computes activity correctly', () => {
    const save = createMockSaveData({
      day: 5,
      stars: 2,
      coins: 250,
      total_serves: 20,
      hearts: { fenwick: 2, sela: 1, bram: 1, nia: 0, wren: 0 },
      heart_points_today: { fenwick: 0.5, sela: 0.25, bram: 0, nia: 0, wren: 0 },
    });
    const input = createNarrativeInput(save);

    expect(input.activity.day).toBe(5);
    expect(input.activity.totalServes).toBe(20);
    expect(input.activity.stars).toBe(2);
    expect(input.activity.coins).toBe(250);
    expect(input.activity.avgHearts).toBeCloseTo(0.8, 1);
    expect(input.activity.chatRatio).toBeGreaterThan(0);
    expect(input.activity.activity).toBeDefined();
  });
});

describe('narrative signals', () => {
  it('calculates relationship signals from input', () => {
    const input = createMockNarrativeInput({
      relationships: {
        heartPoints: { fenwick: 2, sela: 1, bram: 0, nia: 0, wren: 0 },
        heartPointsToday: {},
        displayedHearts: { fenwick: 2, sela: 1, bram: 0, nia: 0, wren: 0 },
        learnedPrefs: ['fenwick'],
        heartsBreadth: 2,
        uniqueNPCsServed: 2,
      },
      activity: {
        day: 1,
        totalServes: 10,
        stars: 1,
        coins: 200,
        avgHearts: 0.6,
        favoriteServeRatio: 0.3,
        chatCount: 3,
        chatRatio: 0.3,
        journalOpensPerDay: 0.5,
        recipeDiscoveryRatio: 0.25,
        experimentalBrewCount: 0,
        experimentalBrewRatio: 0,
        wrenMysteryBrewCount: 0,
        wrenMysteryBrewRatio: 0,
        wrenVisits: 1,
        uniqueNPCsServed: 2,
        heartsBreadth: 2,
        lettersArchivedRatio: 0,
        townTabOpensPerDay: 0,
        upgradesOwnedRatio: 0,
        starsRatio: 0.2,
        shelfCapacityRatio: 0.5,
        inventoryKindsRatio: 0.33,
        shopVisitsPerDay: 0,
        daysSkippedRatio: 0,
        earlyCloseRatio: 0,
        relaxedMode: true,
        daysSkipped: 0,
        serviceDays: 1,
        earlyCloses: 0,
        relaxedModeSetting: true,
        activity: createMockActivity({
          totalServes: 10,
          totalChats: 3,
          favoriteServeCount: 3,
          servesByNpc: { fenwick: 5, sela: 3, wren: 2 },
        }),
      },
    });

    const signals = calculateAllSignals(input);

    expect(signals.relationships.heartsBreadth).toBeCloseTo(0.4, 1);
    expect(signals.relationships.chatRatio).toBeCloseTo(0.3, 1);
    expect(signals.relationships.favoriteServeRatio).toBeCloseTo(0.3, 1);
    expect(signals.relationships.prefRatio).toBeCloseTo(0.2, 1);
    // uniqueNpcsServed = 3/5 = 0.6 (fenwick, sela, wren in servesByNpc)
    expect(signals.relationships.uniqueNpcsServed).toBeCloseTo(0.6, 1);
  });

  it('calculates activity signals from input', () => {
    const input = createMockNarrativeInput({
      activity: {
        day: 10,
        totalServes: 50,
        stars: 3,
        coins: 500,
        avgHearts: 1.2,
        favoriteServeRatio: 0.4,
        chatCount: 8,
        chatRatio: 0.16,
        journalOpensPerDay: 1.5,
        recipeDiscoveryRatio: 0.5,
        experimentalBrewCount: 5,
        experimentalBrewRatio: 0.1,
        wrenMysteryBrewCount: 2,
        wrenMysteryBrewRatio: 0.04,
        wrenVisits: 5,
        uniqueNPCsServed: 3,
        heartsBreadth: 3,
        lettersArchivedRatio: 0.1,
        townTabOpensPerDay: 0.3,
        upgradesOwnedRatio: 0.43,
        starsRatio: 0.6,
        shelfCapacityRatio: 0.75,
        inventoryKindsRatio: 0.56,
        shopVisitsPerDay: 1.2,
        daysSkippedRatio: 0.14,
        earlyCloseRatio: 0,
        relaxedMode: true,
        daysSkipped: 2,
        serviceDays: 8,
        earlyCloses: 0,
        relaxedModeSetting: true,
        activity: createMockActivity({
          totalBrews: 50,
          experimentalBrewCount: 5,
          wrenMysteryBrewCount: 2,
          totalChats: 8,
          totalServes: 50,
          lettersReadCount: 2,
          upgradePurchaseCount: 3,
          ingredientsPurchasedTotal: 12,
          daysSkipped: 2,
          journalOpensByTab: { town: 3, recipes: 5, regulars: 4, letters: 8 },
        }),
      },
      letters: {
        archivedLetters: [],
        lettersDelivered: ['letter_marigold_1', 'letter_fenwick_1', 'town_news_1'],
        lettersRead: ['letter_marigold_1', 'letter_fenwick_1'],
        lettersDismissed: ['town_news_1'],
        townLettersDelivered: 1,
        maxLetters: 40,
      },
      upgrades: {
        ownedUpgrades: ['bigger_shelf', 'second_kettle', 'recipe_hints'],
        upgradesOwned: 3,
        maxUpgrades: 7,
        shelfCapacity: 9,
        maxShelfCapacity: 12,
        inventoryKinds: 5,
        maxInventoryKinds: 9,
        shopVisits: 15,
      },
    });

    const signals = calculateAllSignals(input);

    expect(signals.activity.experimentalBrewRatio).toBeCloseTo(0.1, 1);
    expect(signals.activity.wrenMysteryBrewRatio).toBeCloseTo(0.04, 1);
    expect(signals.activity.journalOpensPerDay).toBeCloseTo(0.75, 1);
    expect(signals.activity.lettersReadRatio).toBeCloseTo(0.67, 1);
    expect(signals.activity.townLetterRatio).toBeCloseTo(0.025, 1);
    expect(signals.activity.shopVisitsPerDay).toBe(1); // capped at 1
    expect(signals.activity.daysSkippedRatio).toBeCloseTo(0.14, 1);
    expect(signals.activity.townTabOpensPerDay).toBeCloseTo(0.3, 1);
  });

  it('calculates progression signals from input', () => {
    const input = createMockNarrativeInput({
      activity: {
        day: 10,
        totalServes: 50,
        stars: 3,
        coins: 500,
        avgHearts: 1.2,
        favoriteServeRatio: 0.4,
        chatCount: 8,
        chatRatio: 0.16,
        journalOpensPerDay: 1.5,
        recipeDiscoveryRatio: 0.5,
        experimentalBrewCount: 5,
        experimentalBrewRatio: 0.1,
        wrenMysteryBrewCount: 2,
        wrenMysteryBrewRatio: 0.04,
        wrenVisits: 5,
        uniqueNPCsServed: 3,
        heartsBreadth: 3,
        lettersArchivedRatio: 0.1,
        townTabOpensPerDay: 0.3,
        upgradesOwnedRatio: 0.43,
        starsRatio: 0.6,
        shelfCapacityRatio: 0.75,
        inventoryKindsRatio: 0.56,
        shopVisitsPerDay: 1.2,
        daysSkippedRatio: 0.14,
        earlyCloseRatio: 0,
        relaxedMode: true,
        daysSkipped: 2,
        serviceDays: 8,
        earlyCloses: 0,
        relaxedModeSetting: true,
        activity: createMockActivity(),
      },
    });

    const signals = calculateAllSignals(input);

    expect(signals.progression.chapterProgress).toBeCloseTo(0, 1); // chapter 0
    expect(signals.progression.notRelaxed).toBe(0); // relaxed mode is true
  });
});

describe('narrative evaluator', () => {
  it('evaluates state from signals', () => {
    const input = createMockNarrativeInput({
      relationships: {
        heartPoints: { fenwick: 4, sela: 3, bram: 2, nia: 1, wren: 1 },
        heartPointsToday: {},
        displayedHearts: { fenwick: 4, sela: 3, bram: 2, nia: 1, wren: 1 },
        learnedPrefs: ['fenwick', 'sela', 'bram', 'nia'],
        heartsBreadth: 5,
        uniqueNPCsServed: 5,
      },
      recipes: {
        discoveredRecipes: ['R001'],
        totalRecipes: 8,
        hintCardsRead: 0,
        experimentalBrewCount: 0,
        wrenMysteryBrewCount: 0,
        wrenVisits: 0,
        wrenScenesSeen: 0,
      },
      upgrades: { ownedUpgrades: [], upgradesOwned: 0, maxUpgrades: 7, shelfCapacity: 6, maxShelfCapacity: 12, inventoryKinds: 1, maxInventoryKinds: 9, shopVisits: 0 },
      letters: { archivedLetters: [], lettersDelivered: ['letter_marigold_1'], lettersRead: ['letter_marigold_1'], lettersDismissed: [], townLettersDelivered: 0, maxLetters: 40 },
      story: { chapter: 3, chapterEnteredDay: { 0: 1, 3: 10 }, marigoldMysteryLayer: 3, wrenCluesGathered: 1, seenScenes: [], flags: {}, trajectoryHint: 'care', endingAchieved: null, playthroughCount: 0, previousEndings: [], marigoldLettersDelivered: [], npcLettersDelivered: { fenwick: [], sela: [], bram: [], nia: [], wren: [] }, mysteryLettersDelivered: [], townLettersDelivered: [], branchLettersDelivered: [] },
      activity: {
        day: 10,
        totalServes: 50,
        stars: 3,
        coins: 1000,
        avgHearts: 2.2,
        favoriteServeRatio: 0.8,
        chatCount: 10,
        chatRatio: 0.2,
        journalOpensPerDay: 0.5,
        recipeDiscoveryRatio: 0.125,
        experimentalBrewCount: 0,
        experimentalBrewRatio: 0,
        wrenMysteryBrewCount: 0,
        wrenMysteryBrewRatio: 0,
        wrenVisits: 0,
        uniqueNPCsServed: 5,
        heartsBreadth: 5,
        lettersArchivedRatio: 0.025,
        townTabOpensPerDay: 0,
        upgradesOwnedRatio: 0,
        starsRatio: 0.6,
        shelfCapacityRatio: 0.5,
        inventoryKindsRatio: 0.11,
        shopVisitsPerDay: 0,
        daysSkippedRatio: 0,
        earlyCloseRatio: 0,
        relaxedMode: true,
        daysSkipped: 0,
        serviceDays: 10,
        earlyCloses: 0,
        relaxedModeSetting: true,
        activity: createMockActivity({
          totalServes: 50,
          favoriteServeCount: 40,
          correctServeCount: 50,
          totalChats: 10,
          servesByNpc: { fenwick: 10, sela: 10, bram: 10, nia: 10, wren: 10 },
        }),
      },
    });

    const state = evaluateNarrativeStateFromInput(input);

    // High relationship depth should yield high care
    expect(state.dimensions.care).toBeGreaterThan(0.5);
    // With care dominant, trajectory should be 'relationship'
    expect(state.trajectory).toBe('relationship');
  });

  it('evaluates curiosity dimension from discovery', () => {
    const input = createMockNarrativeInput({
      relationships: { heartPoints: {}, heartPointsToday: {}, displayedHearts: {}, learnedPrefs: [], heartsBreadth: 0, uniqueNPCsServed: 0 },
      recipes: { discoveredRecipes: ['R001', 'R002', 'R003', 'R004', 'R005', 'R006', 'R007'], totalRecipes: 8, hintCardsRead: 4, experimentalBrewCount: 10, wrenMysteryBrewCount: 5, wrenVisits: 10, wrenScenesSeen: 5 },
      upgrades: { ownedUpgrades: [], upgradesOwned: 0, maxUpgrades: 7, shelfCapacity: 6, maxShelfCapacity: 12, inventoryKinds: 1, maxInventoryKinds: 9, shopVisits: 0 },
      letters: { archivedLetters: [], lettersDelivered: [], lettersRead: [], lettersDismissed: [], townLettersDelivered: 0, maxLetters: 40 },
      story: { chapter: 3, chapterEnteredDay: { 0: 1, 3: 10 }, marigoldMysteryLayer: 3, wrenCluesGathered: 3, seenScenes: ['wren_1', 'wren_2', 'wren_3', 'wren_4', 'wren_5'], flags: {}, trajectoryHint: 'curiosity', endingAchieved: null, playthroughCount: 0, previousEndings: [], marigoldLettersDelivered: [], npcLettersDelivered: { fenwick: [], sela: [], bram: [], nia: [], wren: [] }, mysteryLettersDelivered: [], townLettersDelivered: [], branchLettersDelivered: [] },
      activity: {
        day: 10,
        totalServes: 50,
        stars: 1,
        coins: 500,
        avgHearts: 0,
        favoriteServeRatio: 0,
        chatCount: 0,
        chatRatio: 0,
        journalOpensPerDay: 2,
        recipeDiscoveryRatio: 0.875,
        experimentalBrewCount: 10,
        experimentalBrewRatio: 0.2,
        wrenMysteryBrewCount: 5,
        wrenMysteryBrewRatio: 0.1,
        wrenVisits: 10,
        uniqueNPCsServed: 0,
        heartsBreadth: 0,
        lettersArchivedRatio: 0,
        townTabOpensPerDay: 0,
        upgradesOwnedRatio: 0,
        starsRatio: 0.2,
        shelfCapacityRatio: 0.5,
        inventoryKindsRatio: 0.11,
        shopVisitsPerDay: 0,
        daysSkippedRatio: 0,
        earlyCloseRatio: 0,
        relaxedMode: false,
        daysSkipped: 0,
        serviceDays: 10,
        earlyCloses: 0,
        relaxedModeSetting: false,
        activity: createMockActivity({
          totalServes: 50,
          totalBrews: 50,
          experimentalBrewCount: 10,
          wrenMysteryBrewCount: 5,
          recipeDiscoveryCount: 7,
          discoveredRecipes: ['R001', 'R002', 'R003', 'R004', 'R005', 'R006', 'R007'],
          journalOpensTotal: 20,
          journalOpensByTab: { recipes: 10, letters: 5, regulars: 3, town: 2 },
          wrenMysteryClues: 5,
        }),
      },
    });

    const state = evaluateNarrativeStateFromInput(input);

    expect(state.dimensions.curiosity).toBeGreaterThan(0.5);
    expect(state.trajectory).toBe('curiosity');
  });

  it('evaluates comfort dimension from café investment', () => {
    const input = createMockNarrativeInput({
      relationships: { heartPoints: {}, heartPointsToday: {}, displayedHearts: {}, learnedPrefs: [], heartsBreadth: 1, uniqueNPCsServed: 1 },
      recipes: { discoveredRecipes: ['R001', 'R002'], totalRecipes: 8, hintCardsRead: 0, experimentalBrewCount: 0, wrenMysteryBrewCount: 0, wrenVisits: 0, wrenScenesSeen: 0 },
      upgrades: { ownedUpgrades: ['bigger_shelf', 'second_kettle', 'recipe_hints', 'title_music_box', 'comfort_furniture', 'autobrewer', 'express_service'], upgradesOwned: 7, maxUpgrades: 7, shelfCapacity: 12, maxShelfCapacity: 12, inventoryKinds: 9, maxInventoryKinds: 9, shopVisits: 20 },
      letters: { archivedLetters: [], lettersDelivered: [], lettersRead: [], lettersDismissed: [], townLettersDelivered: 0, maxLetters: 40 },
      story: { chapter: 3, chapterEnteredDay: { 0: 1, 3: 10 }, marigoldMysteryLayer: 1, wrenCluesGathered: 0, seenScenes: [], flags: {}, trajectoryHint: 'comfort', endingAchieved: null, playthroughCount: 0, previousEndings: [], marigoldLettersDelivered: [], npcLettersDelivered: { fenwick: [], sela: [], bram: [], nia: [], wren: [] }, mysteryLettersDelivered: [], townLettersDelivered: [], branchLettersDelivered: [] },
      activity: {
        day: 10,
        totalServes: 50,
        stars: 5,
        coins: 1000,
        avgHearts: 0.2,
        favoriteServeRatio: 0.1,
        chatCount: 0,
        chatRatio: 0,
        journalOpensPerDay: 0,
        recipeDiscoveryRatio: 0.25,
        experimentalBrewCount: 0,
        experimentalBrewRatio: 0,
        wrenMysteryBrewCount: 0,
        wrenMysteryBrewRatio: 0,
        wrenVisits: 0,
        uniqueNPCsServed: 1,
        heartsBreadth: 1,
        lettersArchivedRatio: 0,
        townTabOpensPerDay: 0,
        upgradesOwnedRatio: 1,
        starsRatio: 1,
        shelfCapacityRatio: 1,
        inventoryKindsRatio: 1,
        shopVisitsPerDay: 2,
        daysSkippedRatio: 0,
        earlyCloseRatio: 0,
        relaxedMode: true,
        daysSkipped: 0,
        serviceDays: 10,
        earlyCloses: 0,
        relaxedModeSetting: true,
        activity: createMockActivity({
          totalServes: 50,
          upgradePurchaseCount: 7,
          ingredientsPurchasedTotal: 20,
          earlyCloses: 0,
        }),
      },
    });

    const state = evaluateNarrativeStateFromInput(input);

    expect(state.dimensions.comfort).toBeGreaterThan(0.7);
    expect(state.trajectory).toBe('cafe');
  });

  it('locks trajectory at chapter 3', () => {
    const input = createMockNarrativeInput({
      relationships: { heartPoints: { fenwick: 2 }, heartPointsToday: {}, displayedHearts: { fenwick: 2 }, learnedPrefs: [], heartsBreadth: 1, uniqueNPCsServed: 1 },
      recipes: { discoveredRecipes: ['R001'], totalRecipes: 8, hintCardsRead: 0, experimentalBrewCount: 0, wrenMysteryBrewCount: 0, wrenVisits: 0, wrenScenesSeen: 0 },
      upgrades: { ownedUpgrades: [], upgradesOwned: 0, maxUpgrades: 7, shelfCapacity: 6, maxShelfCapacity: 12, inventoryKinds: 1, maxInventoryKinds: 9, shopVisits: 0 },
      letters: { archivedLetters: [], lettersDelivered: [], lettersRead: [], lettersDismissed: [], townLettersDelivered: 0, maxLetters: 40 },
      story: { chapter: 3, chapterEnteredDay: { 0: 1, 3: 10 }, marigoldMysteryLayer: 1, wrenCluesGathered: 0, seenScenes: [], flags: {}, trajectoryHint: 'care', endingAchieved: null, playthroughCount: 0, previousEndings: [], marigoldLettersDelivered: [], npcLettersDelivered: { fenwick: [], sela: [], bram: [], nia: [], wren: [] }, mysteryLettersDelivered: [], townLettersDelivered: [], branchLettersDelivered: [] },
      activity: {
        day: 10,
        totalServes: 50,
        stars: 1,
        coins: 500,
        avgHearts: 0.4,
        favoriteServeRatio: 0.5,
        chatCount: 5,
        chatRatio: 0.1,
        journalOpensPerDay: 0.5,
        recipeDiscoveryRatio: 0.125,
        experimentalBrewCount: 0,
        experimentalBrewRatio: 0,
        wrenMysteryBrewCount: 0,
        wrenMysteryBrewRatio: 0,
        wrenVisits: 0,
        uniqueNPCsServed: 1,
        heartsBreadth: 1,
        lettersArchivedRatio: 0,
        townTabOpensPerDay: 0,
        upgradesOwnedRatio: 0,
        starsRatio: 0.2,
        shelfCapacityRatio: 0.5,
        inventoryKindsRatio: 0.11,
        shopVisitsPerDay: 0,
        daysSkippedRatio: 0,
        earlyCloseRatio: 0,
        relaxedMode: true,
        daysSkipped: 0,
        serviceDays: 10,
        earlyCloses: 0,
        relaxedModeSetting: true,
        activity: createMockActivity({
          totalServes: 50,
          favoriteServeCount: 25,
          correctServeCount: 50,
          totalChats: 5,
        }),
      },
    });

    const state = evaluateNarrativeStateFromInput(input);

    expect(state.trajectoryLocked).toBe(true);
  });

  it('handles fresh save with minimal activity', () => {
    const input = createMockNarrativeInput();

    const state = evaluateNarrativeStateFromInput(input);

    // Fresh save: independence is intentionally near-zero (under-instrumented),
    // so it must NOT be auto-assigned as the dominant dimension. A calm,
    // low-engagement player simply has no clear "independent" trajectory.
    expect(state.dimensions.independence).toBe(0);
    expect(state.dominantDimension).not.toBe('independence');
  });

  it('returns identical state for identical input (deterministic)', () => {
    const input = createMockNarrativeInput({
      activity: {
        day: 5,
        totalServes: 20,
        stars: 2,
        coins: 300,
        avgHearts: 0.8,
        favoriteServeRatio: 0.4,
        chatCount: 5,
        chatRatio: 0.25,
        journalOpensPerDay: 0.5,
        recipeDiscoveryRatio: 0.25,
        experimentalBrewCount: 0,
        experimentalBrewRatio: 0,
        wrenMysteryBrewCount: 0,
        wrenMysteryBrewRatio: 0,
        wrenVisits: 1,
        uniqueNPCsServed: 3,
        heartsBreadth: 3,
        lettersArchivedRatio: 0,
        townTabOpensPerDay: 0,
        upgradesOwnedRatio: 0,
        starsRatio: 0.4,
        shelfCapacityRatio: 0.5,
        inventoryKindsRatio: 0.33,
        shopVisitsPerDay: 0,
        daysSkippedRatio: 0,
        earlyCloseRatio: 0,
        relaxedMode: true,
        daysSkipped: 0,
        serviceDays: 5,
        earlyCloses: 0,
        relaxedModeSetting: true,
        activity: createMockActivity({
          totalServes: 20,
          favoriteServeCount: 8,
          correctServeCount: 20,
          totalChats: 5,
        }),
      },
      relationships: {
        heartPoints: { fenwick: 2, sela: 1, bram: 1, nia: 0, wren: 0 },
        heartPointsToday: {},
        displayedHearts: { fenwick: 2, sela: 1, bram: 1, nia: 0, wren: 0 },
        learnedPrefs: [],
        heartsBreadth: 3,
        uniqueNPCsServed: 3,
      },
    });

    const state1 = evaluateNarrativeStateFromInput(input);
    const state2 = evaluateNarrativeStateFromInput(input);

    expect(state1.dimensions).toEqual(state2.dimensions);
    expect(state1.dominantDimension).toBe(state2.dominantDimension);
    expect(state1.trajectory).toBe(state2.trajectory);
  });
});

describe('SaveData → NarrativeInput → Signals → NarrativeState pipeline', () => {
  it('works end-to-end with real SaveData', () => {
    const save = createMockSaveData({
      day: 10,
      stars: 3,
      coins: 800,
      total_serves: 45,
      hearts: { fenwick: 3, sela: 2, bram: 2, nia: 1, wren: 1 },
      heart_points_today: { fenwick: 0.5, sela: 0.25, bram: 0.25, nia: 0, wren: 0 },
      flags: {
        discovered_recipes: ['R001', 'R002', 'R003', 'R004', 'R005'],
        learned_prefs: ['fenwick', 'sela'],
        seen_scenes: ['wren_1', 'wren_2'],
        current_chapter: 2,
        chapter_entered_day: { 0: 1, 1: 7, 2: 10 },
        letters_delivered: ['letter_marigold_1', 'letter_fenwick_1', 'letter_sela_1', 'town_news_1', 'town_news_2'],
        letters_read: ['letter_marigold_1', 'letter_fenwick_1', 'letter_sela_1'],
        letters_dismissed: ['town_news_1'],
        trajectory_hint: 'care',
        marigold_mystery_layer: 3,
        wren_clues_gathered: 2,
        activity_total_serves: 45,
        activity_favorite_serves: 8,
        activity_correct_serves: 37,
        activity_total_chats: 5,
        activity_total_brews: 45,
        activity_experimental_brews: 0,
        activity_wren_mystery_brews: 0,
        activity_recipe_discoveries: 5,
        activity_days_skipped: 0,
        activity_early_closes: 0,
        activity_letters_read: 3,
        activity_letters_dismissed: 1,
      },
      upgrades: ['bigger_shelf', 'second_kettle', 'recipe_hints'],
    });

    // Full pipeline
    const input = createNarrativeInput(save);
    const signals = calculateAllSignals(input);
    const state = evaluateNarrativeStateFromInput(input);

    expect(input).toBeDefined();
    expect(signals).toBeDefined();
    expect(state).toBeDefined();
    expect(state.dimensions).toBeDefined();
    expect(state.dominantDimension).toBeDefined();
    expect(state.trajectory).toBeDefined();
    expect(state.chapter).toBe(2);
    expect(state.marigoldMysteryLayer).toBe(3);
    expect(state.wrenCluesGathered).toBe(2);
    expect(state.trajectoryLocked).toBe(false); // chapter 2 < 3
  });
});

// ============================================================
// NARRATIVE SEMANTIC CLEANUP — behavioral dimension tests (A–H)
// ============================================================
describe('Narrative Dimension Semantics (calm / no-punishment)', () => {
  // A — SHORT SESSION: few serves + early close must not raise independence
  it('A: short session (few serves, early close) does not raise independence or punish', () => {
    const input = createMockNarrativeInput({
      activity: {
        day: 10,
        totalServes: 5,
        stars: 1,
        coins: 100,
        avgHearts: 0.2,
        favoriteServeRatio: 0.2,
        chatCount: 1,
        chatRatio: 0.2,
        journalOpensPerDay: 0,
        recipeDiscoveryRatio: 0.1,
        experimentalBrewCount: 0,
        experimentalBrewRatio: 0,
        wrenMysteryBrewCount: 0,
        wrenMysteryBrewRatio: 0,
        wrenVisits: 0,
        uniqueNPCsServed: 1,
        heartsBreadth: 1,
        lettersArchivedRatio: 0,
        townTabOpensPerDay: 0,
        upgradesOwnedRatio: 0,
        starsRatio: 0.2,
        shelfCapacityRatio: 0.5,
        inventoryKindsRatio: 0.11,
        shopVisitsPerDay: 0,
        daysSkippedRatio: 0,
        earlyCloseRatio: 0.5,
        relaxedMode: true,
        daysSkipped: 0,
        serviceDays: 10,
        earlyCloses: 5,
        relaxedModeSetting: true,
        activity: createMockActivity({
          totalServes: 5,
          favoriteServeCount: 1,
          correctServeCount: 5,
          totalChats: 1,
          earlyCloses: 5,
        }),
      },
    });

    const state = evaluateNarrativeStateFromInput(input);

    // Early closes and few serves must NOT infer an "independent" personality.
    expect(state.dimensions.independence).toBe(0);
    // No dimension may be driven negative by low engagement.
    for (const v of Object.values(state.dimensions)) {
      expect(v).toBeGreaterThanOrEqual(0);
    }
  });

  // B — SKIPPED DAY: pacing change does not change personality interpretation
  it('B: skipping days does not change narrative personality (independence stays 0)', () => {
    const baseActivity = {
      day: 10,
      totalServes: 20,
      stars: 2,
      coins: 300,
      avgHearts: 0.4,
      favoriteServeRatio: 0.4,
      chatCount: 5,
      chatRatio: 0.25,
      journalOpensPerDay: 0.5,
      recipeDiscoveryRatio: 0.25,
      experimentalBrewCount: 0,
      experimentalBrewRatio: 0,
      wrenMysteryBrewCount: 0,
      wrenMysteryBrewRatio: 0,
      wrenVisits: 1,
      uniqueNPCsServed: 3,
      heartsBreadth: 3,
      lettersArchivedRatio: 0,
      townTabOpensPerDay: 0,
      upgradesOwnedRatio: 0,
      starsRatio: 0.4,
      shelfCapacityRatio: 0.5,
      inventoryKindsRatio: 0.33,
      shopVisitsPerDay: 0,
      daysSkippedRatio: 0,
      earlyCloseRatio: 0,
      relaxedMode: true,
      serviceDays: 10,
      earlyCloses: 0,
      relaxedModeSetting: true,
      activity: createMockActivity({
        totalServes: 20,
        favoriteServeCount: 8,
        correctServeCount: 20,
        totalChats: 5,
      }),
    };

    const noSkip = evaluateNarrativeStateFromInput(createMockNarrativeInput({
      activity: { ...baseActivity, daysSkipped: 0 },
    }));
    const withSkip = evaluateNarrativeStateFromInput(createMockNarrativeInput({
      activity: {
        ...baseActivity,
        daysSkipped: 6,
        daysSkippedRatio: 6 / 14,
        activity: createMockActivity({
          totalServes: 20,
          favoriteServeCount: 8,
          correctServeCount: 20,
          totalChats: 5,
        }),
      },
    }));

    // Skipped days are neutral pacing data — personality must not shift.
    expect(withSkip.dimensions.independence).toBe(0);
    expect(withSkip.dimensions.independence).toBe(noSkip.dimensions.independence);
    expect(noSkip.dimensions.independence).toBe(0);
  });

  // C — CARE: serving preferences + meaningful interaction raises CARE
  it('C: serving NPC preferences and interacting meaningfully raises CARE', () => {
    const input = createMockNarrativeInput({
      relationships: {
        heartPoints: { fenwick: 2, sela: 2, bram: 2, nia: 2, wren: 2 },
        heartPointsToday: {},
        displayedHearts: { fenwick: 2, sela: 2, bram: 2, nia: 2, wren: 2 },
        learnedPrefs: ['fenwick', 'sela', 'bram', 'nia', 'wren'],
        heartsBreadth: 5,
        uniqueNPCsServed: 5,
      },
      activity: {
        day: 10,
        totalServes: 40,
        stars: 1,
        coins: 300,
        avgHearts: 1,
        favoriteServeRatio: 0.8,
        chatCount: 10,
        chatRatio: 0.25,
        journalOpensPerDay: 0.5,
        recipeDiscoveryRatio: 0.25,
        experimentalBrewCount: 0,
        experimentalBrewRatio: 0,
        wrenMysteryBrewCount: 0,
        wrenMysteryBrewRatio: 0,
        wrenVisits: 1,
        uniqueNPCsServed: 5,
        heartsBreadth: 5,
        lettersArchivedRatio: 0,
        townTabOpensPerDay: 0,
        upgradesOwnedRatio: 0,
        starsRatio: 0.2,
        shelfCapacityRatio: 0.5,
        inventoryKindsRatio: 0.11,
        shopVisitsPerDay: 0,
        daysSkippedRatio: 0,
        earlyCloseRatio: 0,
        relaxedMode: true,
        daysSkipped: 0,
        serviceDays: 10,
        earlyCloses: 0,
        relaxedModeSetting: true,
        activity: createMockActivity({
          totalServes: 40,
          favoriteServeCount: 32,
          correctServeCount: 40,
          totalChats: 10,
        }),
      },
    });

    const state = evaluateNarrativeStateFromInput(input);
    expect(state.dimensions.care).toBeGreaterThan(0.5);
    expect(state.trajectory).toBe('relationship');
  });

  // D — CURIOSITY: experiments + discoveries raise CURIOSITY
  it('D: experimenting and discovering unusual recipes raises CURIOSITY', () => {
    const input = createMockNarrativeInput({
      recipes: {
        discoveredRecipes: ['R001', 'R002', 'R003', 'R004', 'R005', 'R006', 'R007'],
        totalRecipes: 8,
        hintCardsRead: 4,
        experimentalBrewCount: 10,
        wrenMysteryBrewCount: 5,
        wrenVisits: 10,
        wrenScenesSeen: 5,
      },
      activity: {
        day: 10,
        totalServes: 20,
        stars: 1,
        coins: 200,
        avgHearts: 0,
        favoriteServeRatio: 0,
        chatCount: 0,
        chatRatio: 0,
        journalOpensPerDay: 2,
        recipeDiscoveryRatio: 0.875,
        experimentalBrewCount: 10,
        experimentalBrewRatio: 0.2,
        wrenMysteryBrewCount: 5,
        wrenMysteryBrewRatio: 0.1,
        wrenVisits: 10,
        uniqueNPCsServed: 0,
        heartsBreadth: 0,
        lettersArchivedRatio: 0,
        townTabOpensPerDay: 0,
        upgradesOwnedRatio: 0,
        starsRatio: 0.2,
        shelfCapacityRatio: 0.5,
        inventoryKindsRatio: 0.11,
        shopVisitsPerDay: 0,
        daysSkippedRatio: 0,
        earlyCloseRatio: 0,
        relaxedMode: false,
        daysSkipped: 0,
        serviceDays: 10,
        earlyCloses: 0,
        relaxedModeSetting: false,
        activity: createMockActivity({
          totalServes: 20,
          totalBrews: 50,
          experimentalBrewCount: 10,
          wrenMysteryBrewCount: 5,
          recipeDiscoveryCount: 7,
          discoveredRecipes: ['R001', 'R002', 'R003', 'R004', 'R005', 'R006', 'R007'],
          journalOpensTotal: 20,
          journalOpensByTab: { recipes: 10, letters: 5, regulars: 3, town: 2 },
          wrenMysteryClues: 5,
        }),
      },
    });

    const state = evaluateNarrativeStateFromInput(input);
    expect(state.dimensions.curiosity).toBeGreaterThan(0.5);
    expect(state.trajectory).toBe('curiosity');
  });

  // E — COMMUNITY: chatting with multiple NPCs raises COMMUNITY
  it('E: chatting with multiple NPCs and broad engagement raises COMMUNITY', () => {
    const input = createMockNarrativeInput({
      relationships: {
        heartPoints: { fenwick: 1, sela: 1, bram: 1, nia: 1, wren: 1 },
        heartPointsToday: {},
        displayedHearts: { fenwick: 1, sela: 1, bram: 1, nia: 1, wren: 1 },
        learnedPrefs: [],
        heartsBreadth: 5,
        uniqueNPCsServed: 5,
      },
      letters: {
        archivedLetters: [],
        lettersDelivered: ['town_news_1', 'town_news_2', 'town_news_3'],
        lettersRead: ['town_news_1', 'town_news_2', 'town_news_3'],
        lettersDismissed: [],
        townLettersDelivered: 3,
        maxLetters: 40,
      },
      activity: {
        day: 10,
        totalServes: 50,
        stars: 1,
        coins: 200,
        avgHearts: 1,
        favoriteServeRatio: 0,
        chatCount: 40,
        chatRatio: 0.8,
        journalOpensPerDay: 0.5,
        recipeDiscoveryRatio: 0.1,
        experimentalBrewCount: 0,
        experimentalBrewRatio: 0,
        wrenMysteryBrewCount: 0,
        wrenMysteryBrewRatio: 0,
        wrenVisits: 1,
        uniqueNPCsServed: 5,
        heartsBreadth: 5,
        lettersArchivedRatio: 0,
        townTabOpensPerDay: 0.5,
        upgradesOwnedRatio: 0,
        starsRatio: 0.2,
        shelfCapacityRatio: 0.5,
        inventoryKindsRatio: 0.11,
        shopVisitsPerDay: 0,
        daysSkippedRatio: 0,
        earlyCloseRatio: 0,
        relaxedMode: true,
        daysSkipped: 0,
        serviceDays: 10,
        earlyCloses: 0,
        relaxedModeSetting: true,
        activity: createMockActivity({
          totalServes: 50,
          totalChats: 40,
          lettersReadCount: 3,
          journalOpensByTab: { town: 5 },
        }),
      },
    });

    const state = evaluateNarrativeStateFromInput(input);
    expect(state.dimensions.community).toBeGreaterThan(0.3);
    expect(state.trajectory).toBe('relationship');
  });

  // F — COMFORT: café investment raises COMFORT; high stars alone must not
  it('F: café investment raises COMFORT; stars without investment do not', () => {
    const invested = evaluateNarrativeStateFromInput(createMockNarrativeInput({
      upgrades: {
        ownedUpgrades: ['bigger_shelf', 'second_kettle', 'recipe_hints', 'comfort_furniture', 'title_music_box'],
        upgradesOwned: 5,
        maxUpgrades: 7,
        shelfCapacity: 12,
        maxShelfCapacity: 12,
        inventoryKinds: 9,
        maxInventoryKinds: 9,
        shopVisits: 10,
      },
      activity: {
        day: 10, totalServes: 50, stars: 5, coins: 1000, avgHearts: 0.2,
        favoriteServeRatio: 0.1, chatCount: 0, chatRatio: 0, journalOpensPerDay: 0,
        recipeDiscoveryRatio: 0.25, experimentalBrewCount: 0, experimentalBrewRatio: 0,
        wrenMysteryBrewCount: 0, wrenMysteryBrewRatio: 0, wrenVisits: 0,
        uniqueNPCsServed: 1, heartsBreadth: 1, lettersArchivedRatio: 0, townTabOpensPerDay: 0,
        upgradesOwnedRatio: 5 / 7, starsRatio: 1, shelfCapacityRatio: 1, inventoryKindsRatio: 1,
        shopVisitsPerDay: 1, daysSkippedRatio: 0, earlyCloseRatio: 0, relaxedMode: true,
        daysSkipped: 0, serviceDays: 10, earlyCloses: 0, relaxedModeSetting: true,
        activity: createMockActivity({ totalServes: 50, upgradePurchaseCount: 5, ingredientsPurchasedTotal: 10 }),
      },
    }));
    expect(invested.dimensions.comfort).toBeGreaterThan(0.7);

    // High stars but NO café investment → comfort must stay low (stars ≠ coziness)
    const starsOnly = evaluateNarrativeStateFromInput(createMockNarrativeInput({
      upgrades: {
        ownedUpgrades: [], upgradesOwned: 0, maxUpgrades: 7, shelfCapacity: 6,
        maxShelfCapacity: 12, inventoryKinds: 1, maxInventoryKinds: 9, shopVisits: 0,
      },
      activity: {
        day: 10, totalServes: 50, stars: 5, coins: 1000, avgHearts: 0.2,
        favoriteServeRatio: 0.1, chatCount: 0, chatRatio: 0, journalOpensPerDay: 0,
        recipeDiscoveryRatio: 0.25, experimentalBrewCount: 0, experimentalBrewRatio: 0,
        wrenMysteryBrewCount: 0, wrenMysteryBrewRatio: 0, wrenVisits: 0,
        uniqueNPCsServed: 1, heartsBreadth: 1, lettersArchivedRatio: 0, townTabOpensPerDay: 0,
        upgradesOwnedRatio: 0, starsRatio: 1, shelfCapacityRatio: 0.5, inventoryKindsRatio: 0.11,
        shopVisitsPerDay: 0, daysSkippedRatio: 0, earlyCloseRatio: 0, relaxedMode: true,
        daysSkipped: 0, serviceDays: 10, earlyCloses: 0, relaxedModeSetting: true,
        activity: createMockActivity({ totalServes: 50 }),
      },
    }));
    expect(starsOnly.dimensions.comfort).toBeLessThan(invested.dimensions.comfort);
  });

  // G — INDEPENDENCE: not inferred from skipped/early/low activity
  it('G: independence remains neutral when only pacing signals are present', () => {
    const input = createMockNarrativeInput({
      activity: {
        day: 14, totalServes: 10, stars: 1, coins: 50, avgHearts: 0,
        favoriteServeRatio: 0, chatCount: 0, chatRatio: 0, journalOpensPerDay: 0,
        recipeDiscoveryRatio: 0.1, experimentalBrewCount: 0, experimentalBrewRatio: 0,
        wrenMysteryBrewCount: 0, wrenMysteryBrewRatio: 0, wrenVisits: 0,
        uniqueNPCsServed: 1, heartsBreadth: 1, lettersArchivedRatio: 0, townTabOpensPerDay: 0,
        upgradesOwnedRatio: 0, starsRatio: 0.2, shelfCapacityRatio: 0.5, inventoryKindsRatio: 0.11,
        shopVisitsPerDay: 0, daysSkippedRatio: 8 / 14, earlyCloseRatio: 0.8, relaxedMode: false,
        daysSkipped: 8, serviceDays: 10, earlyCloses: 8, relaxedModeSetting: false,
        activity: createMockActivity({ totalServes: 10, earlyCloses: 8 }),
      },
    });

    const state = evaluateNarrativeStateFromInput(input);
    // Even with 8 skipped days + 8 early closes + no chats: independence is 0.
    expect(state.dimensions.independence).toBe(0);
  });

  // H — NO FAILURE FROM PACING: low/high/short-frequency players all reach ch5
  it('H: players with different pacing all retain valid progression (no hidden fail)', () => {
    const scheduler = new NarrativeScheduler(CHAPTER_CONFIGS, ENDING_CONFIGS);

    // Low-frequency, short-session player (skips days, few serves) — chapter 4, day 11.
    const lowFreq = evaluateNarrativeStateFromInput(createMockNarrativeInput({
      story: {
        chapter: 4, chapterEnteredDay: { 0: 1, 4: 10 }, marigoldMysteryLayer: 1,
        wrenCluesGathered: 0, seenScenes: [], flags: {}, trajectoryHint: null,
        endingAchieved: null, playthroughCount: 0, previousEndings: [],
        marigoldLettersDelivered: [], npcLettersDelivered: { fenwick: [], sela: [], bram: [], nia: [], wren: [] },
        mysteryLettersDelivered: [], townLettersDelivered: [], branchLettersDelivered: [],
      },
      activity: {
        day: 11, totalServes: 10, stars: 1, coins: 50, avgHearts: 0.2,
        favoriteServeRatio: 0.2, chatCount: 1, chatRatio: 0.1, journalOpensPerDay: 0,
        recipeDiscoveryRatio: 0.1, experimentalBrewCount: 0, experimentalBrewRatio: 0,
        wrenMysteryBrewCount: 0, wrenMysteryBrewRatio: 0, wrenVisits: 0, uniqueNPCsServed: 1,
        heartsBreadth: 1, lettersArchivedRatio: 0, townTabOpensPerDay: 0, upgradesOwnedRatio: 0,
        starsRatio: 0.2, shelfCapacityRatio: 0.5, inventoryKindsRatio: 0.11, shopVisitsPerDay: 0,
        daysSkippedRatio: 0, earlyCloseRatio: 0, relaxedMode: true, daysSkipped: 3, serviceDays: 8,
        earlyCloses: 0, relaxedModeSetting: true,
        activity: createMockActivity({ totalServes: 10, favoriteServeCount: 2 }),
      },
    }));

    // Chapter advancement is day-based + mandatory-beat based, INDEPENDENT of narrative
    // dimensions. A calm, low-engagement player still advances to chapter 5 by day 13.
    const progress = createSchedulerStoryProgress({}, [], [], [], []);
    const chapterProgress = scheduler.getChapterProgress(lowFreq, 13);
    expect(scheduler.shouldAdvanceChapter(chapterProgress, 13)).toBe(true);

    // At chapter 5, day 13, the ending evaluation beat is available to everyone.
    const ch5State = { ...lowFreq, chapter: 5 };
    expect(scheduler.getAvailableBeats(ch5State, progress, 13).some((b) => b.id === 'ending_evaluation')).toBe(true);

    // And the ending chosen for this calm player is the neutral keeper fallback,
    // never a pacing-inferred wanderer.
    expect(scheduler.evaluateEnding(ch5State, 13)).toBe('keeper');
  });
});