// tests/narrative-input.test.ts — tests for NarrativeInput adapter and evaluator
import { describe, it, expect } from 'vitest';
import { createNarrativeInput, type NarrativeInput } from '../src/narrative/narrative-input';
import { evaluateNarrativeState } from '../src/narrative/narrative-state';

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
  });
});

describe('evaluateNarrativeState', () => {
  it('evaluates state from NarrativeInput', () => {
    const save = createMockSaveData({
      day: 7,
      stars: 2,
      coins: 500,
      total_serves: 30,
      hearts: { fenwick: 3, sela: 2, bram: 1, nia: 1, wren: 1 },
      heart_points_today: { fenwick: 0.5, sela: 0.25, bram: 0, nia: 0, wren: 0 },
      flags: {
        discovered_recipes: ['R001', 'R002', 'R003', 'R004', 'R005'],
        seen_scenes: ['wren_1', 'wren_2'],
        current_chapter: 1,
        chapter_entered_day: { 0: 1, 1: 7 },
        trajectory_hint: 'care',
        marigold_mystery_layer: 2,
        wren_clues_gathered: 1,
        letters_delivered: ['letter_marigold_1', 'letter_fenwick_1', 'town_news_1'],
        letters_read: ['letter_marigold_1', 'letter_fenwick_1'],
        letters_dismissed: [],
      },
      upgrades: ['bigger_shelf', 'second_kettle'],
    });

    const input = createNarrativeInput(save);
    const state = evaluateNarrativeState(input);

    expect(state.dimensions).toBeDefined();
    expect(state.dominantDimension).toBeDefined();
    expect(state.trajectory).toBeDefined();
    expect(state.chapter).toBe(1);
    expect(state.marigoldMysteryLayer).toBe(2);
    expect(state.wrenCluesGathered).toBe(1);
    expect(state.trajectoryLocked).toBe(false); // chapter 1 < 3
  });

  it('can run with mocked NarrativeInput without SaveData', () => {
    // Direct mock of NarrativeInput - no SaveData construction needed
    const mockInput: NarrativeInput = {
      relationships: {
        heartPoints: { fenwick: 2, sela: 1, bram: 0, nia: 0, wren: 0 },
        heartPointsToday: { fenwick: 0, sela: 0, bram: 0, nia: 0, wren: 0 },
        displayedHearts: { fenwick: 2, sela: 1, bram: 0, nia: 0, wren: 0 },
        learnedPrefs: ['fenwick'],
        heartsBreadth: 2,
        uniqueNPCsServed: 2,
      },
      recipes: {
        discoveredRecipes: ['R001', 'R002', 'R003', 'R004'],
        totalRecipes: 8,
        hintCardsRead: 1,
        experimentalBrewCount: 0,
        wrenMysteryBrewCount: 0,
        wrenVisits: 2,
        wrenScenesSeen: 2,
      },
      upgrades: {
        ownedUpgrades: ['bigger_shelf'],
        upgradesOwned: 1,
        maxUpgrades: 7,
        shelfCapacity: 9,
        maxShelfCapacity: 12,
        inventoryKinds: 3,
        maxInventoryKinds: 9,
        shopVisits: 1,
      },
      letters: {
        archivedLetters: ['letter_marigold_1'],
        lettersDelivered: ['letter_marigold_1', 'letter_fenwick_1'],
        lettersRead: ['letter_marigold_1'],
        lettersDismissed: [],
        townLettersDelivered: 0,
        maxLetters: 40,
      },
      story: {
        chapter: 1,
        chapterEnteredDay: { 0: 1, 1: 7 },
        marigoldMysteryLayer: 2,
        wrenCluesGathered: 1,
        seenScenes: ['wren_1'],
        flags: {},
        trajectoryHint: 'care',
        endingAchieved: null,
        playthroughCount: 0,
        previousEndings: [],
        marigoldLettersDelivered: ['letter_marigold_1'],
        npcLettersDelivered: { fenwick: ['letter_fenwick_1'], sela: [], bram: [], nia: [], wren: [] },
        mysteryLettersDelivered: [],
        townLettersDelivered: [],
        branchLettersDelivered: [],
      },
      activity: {
        day: 7,
        totalServes: 30,
        stars: 2,
        coins: 500,
        avgHearts: 0.8,
        favoriteServeRatio: 0.1,
        chatCount: 3,
        chatRatio: 0.1,
        journalOpensPerDay: 0.5,
        recipeDiscoveryRatio: 0.5,
        experimentalBrewCount: 0,
        experimentalBrewRatio: 0,
        wrenMysteryBrewCount: 0,
        wrenMysteryBrewRatio: 0,
        wrenVisits: 2,
        uniqueNPCsServed: 2,
        heartsBreadth: 2,
        lettersArchivedRatio: 0.025,
        townTabOpensPerDay: 0,
        upgradesOwnedRatio: 0.14,
        starsRatio: 0.4,
        shelfCapacityRatio: 0.75,
        inventoryKindsRatio: 0.33,
        shopVisitsPerDay: 0.14,
        daysSkippedRatio: 0,
        earlyCloseRatio: 0,
        relaxedMode: true,
        daysSkipped: 0,
        serviceDays: 7,
        earlyCloses: 0,
        relaxedModeSetting: true,
      },
    };

    const state = evaluateNarrativeState(mockInput);

    expect(state.dimensions).toBeDefined();
    expect(state.dominantDimension).toBeDefined();
    expect(state.trajectory).toBeDefined();
    expect(state.chapter).toBe(1);
    expect(state.trajectoryLocked).toBe(false);
  });

  it('computes care dimension from relationships', () => {
    const mockInput: NarrativeInput = {
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
      activity: { day: 10, totalServes: 50, stars: 3, coins: 1000, avgHearts: 2.2, favoriteServeRatio: 0.8, chatCount: 10, chatRatio: 0.2, journalOpensPerDay: 0.5, recipeDiscoveryRatio: 0.125, experimentalBrewCount: 0, experimentalBrewRatio: 0, wrenMysteryBrewCount: 0, wrenMysteryBrewRatio: 0, wrenVisits: 0, uniqueNPCsServed: 5, heartsBreadth: 5, lettersArchivedRatio: 0.025, townTabOpensPerDay: 0, upgradesOwnedRatio: 0, starsRatio: 0.6, shelfCapacityRatio: 0.5, inventoryKindsRatio: 0.11, shopVisitsPerDay: 0, daysSkippedRatio: 0, earlyCloseRatio: 0, relaxedMode: true, daysSkipped: 0, serviceDays: 10, earlyCloses: 0, relaxedModeSetting: true },
    };

    const state = evaluateNarrativeState(mockInput);

    // High relationship depth should yield high care
    expect(state.dimensions.care).toBeGreaterThan(0.5);
    // With care dominant, trajectory should be 'relationship'
    expect(state.trajectory).toBe('relationship');
  });

  it('computes curiosity dimension from discovery', () => {
    const mockInput: NarrativeInput = {
      relationships: { heartPoints: {}, heartPointsToday: {}, displayedHearts: {}, learnedPrefs: [], heartsBreadth: 0, uniqueNPCsServed: 0 },
      recipes: { discoveredRecipes: ['R001', 'R002', 'R003', 'R004', 'R005', 'R006', 'R007'], totalRecipes: 8, hintCardsRead: 4, experimentalBrewCount: 10, wrenMysteryBrewCount: 5, wrenVisits: 10, wrenScenesSeen: 5 },
      upgrades: { ownedUpgrades: [], upgradesOwned: 0, maxUpgrades: 7, shelfCapacity: 6, maxShelfCapacity: 12, inventoryKinds: 1, maxInventoryKinds: 9, shopVisits: 0 },
      letters: { archivedLetters: [], lettersDelivered: [], lettersRead: [], lettersDismissed: [], townLettersDelivered: 0, maxLetters: 40 },
      story: { chapter: 3, chapterEnteredDay: { 0: 1, 3: 10 }, marigoldMysteryLayer: 3, wrenCluesGathered: 3, seenScenes: ['wren_1', 'wren_2', 'wren_3', 'wren_4', 'wren_5'], flags: {}, trajectoryHint: 'curiosity', endingAchieved: null, playthroughCount: 0, previousEndings: [], marigoldLettersDelivered: [], npcLettersDelivered: { fenwick: [], sela: [], bram: [], nia: [], wren: [] }, mysteryLettersDelivered: [], townLettersDelivered: [], branchLettersDelivered: [] },
      activity: { day: 10, totalServes: 50, stars: 1, coins: 500, avgHearts: 0, favoriteServeRatio: 0, chatCount: 0, chatRatio: 0, journalOpensPerDay: 2, recipeDiscoveryRatio: 0.875, experimentalBrewCount: 10, experimentalBrewRatio: 0.2, wrenMysteryBrewCount: 5, wrenMysteryBrewRatio: 0.1, wrenVisits: 10, uniqueNPCsServed: 0, heartsBreadth: 0, lettersArchivedRatio: 0, townTabOpensPerDay: 0, upgradesOwnedRatio: 0, starsRatio: 0.2, shelfCapacityRatio: 0.5, inventoryKindsRatio: 0.11, shopVisitsPerDay: 0, daysSkippedRatio: 0, earlyCloseRatio: 0, relaxedMode: false, daysSkipped: 0, serviceDays: 10, earlyCloses: 0, relaxedModeSetting: false },
    };

    const state = evaluateNarrativeState(mockInput);

    expect(state.dimensions.curiosity).toBeGreaterThan(0.5);
    expect(state.trajectory).toBe('curiosity');
  });

  it('computes comfort dimension from café investment', () => {
    const mockInput: NarrativeInput = {
      relationships: { heartPoints: {}, heartPointsToday: {}, displayedHearts: {}, learnedPrefs: [], heartsBreadth: 1, uniqueNPCsServed: 1 },
      recipes: { discoveredRecipes: ['R001', 'R002'], totalRecipes: 8, hintCardsRead: 0, experimentalBrewCount: 0, wrenMysteryBrewCount: 0, wrenVisits: 0, wrenScenesSeen: 0 },
      upgrades: { ownedUpgrades: ['bigger_shelf', 'second_kettle', 'recipe_hints', 'title_music_box', 'comfort_furniture', 'autobrewer', 'express_service'], upgradesOwned: 7, maxUpgrades: 7, shelfCapacity: 12, maxShelfCapacity: 12, inventoryKinds: 9, maxInventoryKinds: 9, shopVisits: 20 },
      letters: { archivedLetters: [], lettersDelivered: [], lettersRead: [], lettersDismissed: [], townLettersDelivered: 0, maxLetters: 40 },
      story: { chapter: 3, chapterEnteredDay: { 0: 1, 3: 10 }, marigoldMysteryLayer: 1, wrenCluesGathered: 0, seenScenes: [], flags: {}, trajectoryHint: 'comfort', endingAchieved: null, playthroughCount: 0, previousEndings: [], marigoldLettersDelivered: [], npcLettersDelivered: { fenwick: [], sela: [], bram: [], nia: [], wren: [] }, mysteryLettersDelivered: [], townLettersDelivered: [], branchLettersDelivered: [] },
      activity: { day: 10, totalServes: 50, stars: 5, coins: 1000, avgHearts: 0.2, favoriteServeRatio: 0.1, chatCount: 0, chatRatio: 0, journalOpensPerDay: 0, recipeDiscoveryRatio: 0.25, experimentalBrewCount: 0, experimentalBrewRatio: 0, wrenMysteryBrewCount: 0, wrenMysteryBrewRatio: 0, wrenVisits: 0, uniqueNPCsServed: 1, heartsBreadth: 1, lettersArchivedRatio: 0, townTabOpensPerDay: 0, upgradesOwnedRatio: 1, starsRatio: 1, shelfCapacityRatio: 1, inventoryKindsRatio: 1, shopVisitsPerDay: 2, daysSkippedRatio: 0, earlyCloseRatio: 0, relaxedMode: true, daysSkipped: 0, serviceDays: 10, earlyCloses: 0, relaxedModeSetting: true },
    };

    const state = evaluateNarrativeState(mockInput);

    expect(state.dimensions.comfort).toBeGreaterThan(0.7);
    expect(state.trajectory).toBe('cafe');
  });

  it('locks trajectory at chapter 3', () => {
    const mockInput: NarrativeInput = {
      relationships: { heartPoints: { fenwick: 2 }, heartPointsToday: {}, displayedHearts: { fenwick: 2 }, learnedPrefs: [], heartsBreadth: 1, uniqueNPCsServed: 1 },
      recipes: { discoveredRecipes: ['R001'], totalRecipes: 8, hintCardsRead: 0, experimentalBrewCount: 0, wrenMysteryBrewCount: 0, wrenVisits: 0, wrenScenesSeen: 0 },
      upgrades: { ownedUpgrades: [], upgradesOwned: 0, maxUpgrades: 7, shelfCapacity: 6, maxShelfCapacity: 12, inventoryKinds: 1, maxInventoryKinds: 9, shopVisits: 0 },
      letters: { archivedLetters: [], lettersDelivered: [], lettersRead: [], lettersDismissed: [], townLettersDelivered: 0, maxLetters: 40 },
      story: { chapter: 3, chapterEnteredDay: { 0: 1, 3: 10 }, marigoldMysteryLayer: 1, wrenCluesGathered: 0, seenScenes: [], flags: {}, trajectoryHint: 'care', endingAchieved: null, playthroughCount: 0, previousEndings: [], marigoldLettersDelivered: [], npcLettersDelivered: { fenwick: [], sela: [], bram: [], nia: [], wren: [] }, mysteryLettersDelivered: [], townLettersDelivered: [], branchLettersDelivered: [] },
      activity: { day: 10, totalServes: 50, stars: 1, coins: 500, avgHearts: 0.4, favoriteServeRatio: 0.5, chatCount: 5, chatRatio: 0.1, journalOpensPerDay: 0.5, recipeDiscoveryRatio: 0.125, experimentalBrewCount: 0, experimentalBrewRatio: 0, wrenMysteryBrewCount: 0, wrenMysteryBrewRatio: 0, wrenVisits: 0, uniqueNPCsServed: 1, heartsBreadth: 1, lettersArchivedRatio: 0, townTabOpensPerDay: 0, upgradesOwnedRatio: 0, starsRatio: 0.2, shelfCapacityRatio: 0.5, inventoryKindsRatio: 0.11, shopVisitsPerDay: 0, daysSkippedRatio: 0, earlyCloseRatio: 0, relaxedMode: true, daysSkipped: 0, serviceDays: 10, earlyCloses: 0, relaxedModeSetting: true },
    };

    const state = evaluateNarrativeState(mockInput);

    expect(state.trajectoryLocked).toBe(true);
  });

  it('handles fresh save with minimal activity', () => {
    // Fresh save: no relationships, no recipes, no upgrades, no activity
    // Independence naturally emerges as dominant (no engagement yet)
    const mockInput: NarrativeInput = {
      relationships: { heartPoints: {}, heartPointsToday: {}, displayedHearts: {}, learnedPrefs: [], heartsBreadth: 0, uniqueNPCsServed: 0 },
      recipes: { discoveredRecipes: [], totalRecipes: 8, hintCardsRead: 0, experimentalBrewCount: 0, wrenMysteryBrewCount: 0, wrenVisits: 0, wrenScenesSeen: 0 },
      upgrades: { ownedUpgrades: [], upgradesOwned: 0, maxUpgrades: 7, shelfCapacity: 6, maxShelfCapacity: 12, inventoryKinds: 1, maxInventoryKinds: 9, shopVisits: 0 },
      letters: { archivedLetters: [], lettersDelivered: [], lettersRead: [], lettersDismissed: [], townLettersDelivered: 0, maxLetters: 40 },
      story: { chapter: 1, chapterEnteredDay: { 0: 1 }, marigoldMysteryLayer: 1, wrenCluesGathered: 0, seenScenes: [], flags: {}, trajectoryHint: null, endingAchieved: null, playthroughCount: 0, previousEndings: [], marigoldLettersDelivered: [], npcLettersDelivered: { fenwick: [], sela: [], bram: [], nia: [], wren: [] }, mysteryLettersDelivered: [], townLettersDelivered: [], branchLettersDelivered: [] },
      activity: { day: 1, totalServes: 0, stars: 0, coins: 100, avgHearts: 0, favoriteServeRatio: 0, chatCount: 0, chatRatio: 0, journalOpensPerDay: 0, recipeDiscoveryRatio: 0, experimentalBrewCount: 0, experimentalBrewRatio: 0, wrenMysteryBrewCount: 0, wrenMysteryBrewRatio: 0, wrenVisits: 0, uniqueNPCsServed: 0, heartsBreadth: 0, lettersArchivedRatio: 0, townTabOpensPerDay: 0, upgradesOwnedRatio: 0, starsRatio: 0, shelfCapacityRatio: 0.5, inventoryKindsRatio: 0.11, shopVisitsPerDay: 0, daysSkippedRatio: 0, earlyCloseRatio: 0, relaxedMode: true, daysSkipped: 0, serviceDays: 1, earlyCloses: 0, relaxedModeSetting: true },
    };

    const state = evaluateNarrativeState(mockInput);

    // Fresh save: independence is naturally highest (no engagement yet)
    // This is expected behavior - player hasn't engaged with any system
    expect(state.dominantDimension).toBe('independence');
    expect(state.trajectory).toBe('curiosity');
  });
});

describe('SaveData → NarrativeInput → NarrativeState pipeline', () => {
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
      },
      upgrades: ['bigger_shelf', 'second_kettle', 'recipe_hints'],
    });

    // Full pipeline
    const input = createNarrativeInput(save);
    const state = evaluateNarrativeState(input);

    expect(input).toBeDefined();
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