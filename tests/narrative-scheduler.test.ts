// tests/narrative-scheduler.test.ts — tests for narrative scheduler and letter scheduler
import { describe, it, expect } from 'vitest';
import { NarrativeScheduler, createSchedulerStoryProgress } from '../src/narrative/narrative-scheduler';
import { LetterScheduler } from '../src/narrative/letter-scheduler';
import { createLetterContext, type LetterContext } from '../src/narrative/narrative-input';
import {
  evaluateNarrativeStateFromInput,
  createMockNarrativeInput,
  createMockActivity,
  createEmptyCounters
} from './narrative-test-utils';
import { CHAPTER_CONFIGS, ENDING_CONFIGS, ALL_LETTERS, TRAJECTORY_RULES } from '../src/narrative/story-definitions';

function createMockState(overrides: Partial<{
  chapter: number;
  dimensions: Record<string, number>;
  dominantDimension: string | null;
  stars: number;
  daysSkipped: number;
  completedArcs: string[];
  flags: Record<string, boolean>;
  upgradesOwned: Record<string, boolean>;
  endingAchieved: string | null;
}> = {}) {
  const baseState = evaluateNarrativeStateFromInput(createMockNarrativeInput({
    story: {
      chapter: overrides.chapter ?? 1,
      chapterEnteredDay: { 0: 1, 1: 3 },
      marigoldMysteryLayer: 1,
      wrenCluesGathered: 0,
      endingAchieved: overrides.endingAchieved ?? null,
    },
    activity: {
      day: 5,
      stars: overrides.stars ?? 2,
      daysSkipped: overrides.daysSkipped ?? 0,
    },
    flags: overrides.flags ?? {},
    upgrades: Object.keys(overrides.upgradesOwned ?? {}),
  }));

  return {
    ...baseState,
    ...overrides,
    dimensions: overrides.dimensions ?? { care: 0.3, curiosity: 0.2, community: 0.2, comfort: 0.15, independence: 0.15 } as Record<string, number>,
    dominantDimension: overrides.dominantDimension ?? 'care',
    consumedBeats: [],
    completedArcs: overrides.completedArcs ?? [],
    flags: overrides.flags ?? {},
    upgradesOwned: overrides.upgradesOwned ?? {},
    stars: overrides.stars ?? 2,
    daysSkipped: overrides.daysSkipped ?? 0,
    chapterEnteredDay: { 0: 1, 1: 3 },
    endingAchieved: null,
    lettersDelivered: [],
    lettersRead: [],
    scenesSeen: [],
  };
}

function createMockSaveData(overrides: Partial<{
  day: number;
  stars: number;
  upgrades: string[];
  flags: Record<string, unknown>;
  seen_scenes: string[];
  discovered_recipes: string[];
  hearts: Record<string, number>;
  total_serves: number;
}> = {}) {
  const flags = {
    current_chapter: 1,
    letters_delivered: [],
    letters_read: [],
    letters_dismissed: [],
    marigold_ch0_welcome_delivered: true,
    ...overrides.flags,
  };
  const saveData = {
    day: overrides.day ?? 5,
    stars: overrides.stars ?? 2,
    upgrades: overrides.upgrades ?? [],
    flags,
    seen_scenes: overrides.seen_scenes ?? [],
    discovered_recipes: overrides.discovered_recipes ?? ['R001', 'R002'],
    hearts: { fenwick: 0, sela: 0, bram: 0, nia: 0, wren: 0, ...overrides.hearts },
    total_serves: overrides.total_serves ?? 20,
  };

  const lettersDelivered = (flags['letters_delivered'] as string[]) ?? [];
  const ctx: LetterContext = {
    day: saveData.day,
    chapter: (flags['current_chapter'] as number) ?? 1,
    stars: saveData.stars,
    upgradesOwned: saveData.upgrades,
    discoveredRecipes: saveData.discovered_recipes,
    seenScenes: saveData.seen_scenes,
    heartsByNpc: saveData.hearts,
    flags: Object.fromEntries(Object.entries(flags).filter(([, v]) => typeof v === 'boolean')) as Record<string, boolean>,
    lettersDelivered,
    lettersRead: (flags['letters_read'] as string[]) ?? [],
    totalServes: saveData.total_serves,
    daysSkipped: 0,
  };

  return { saveData, ctx };
}

describe('NarrativeScheduler', () => {
  const scheduler = new NarrativeScheduler(CHAPTER_CONFIGS, ENDING_CONFIGS);

  it('advances chapter 0 after day 2', () => {
    const state = createMockState({ chapter: 0 });
    const progress = scheduler.getChapterProgress(state, 3);
    expect(scheduler.shouldAdvanceChapter(progress, 3)).toBe(true);
  });

  it('advances chapter 0 when mandatory beats complete', () => {
    const state = createMockState({ chapter: 0 });
    const progress = scheduler.getChapterProgress(state, 1);
    progress.mandatoryBeatsRemaining = [];
    expect(scheduler.shouldAdvanceChapter(progress, 1)).toBe(true);
  });

  it('does not advance chapter 1 before day threshold', () => {
    const state = createMockState({ chapter: 1 });
    const progress = scheduler.getChapterProgress(state, 3);
    expect(scheduler.shouldAdvanceChapter(progress, 3)).toBe(false);
  });

  it('advances chapter 1 after day 4 with mandatory beats done', () => {
    const state = createMockState({ chapter: 1 });
    const progress = scheduler.getChapterProgress(state, 5);
    progress.mandatoryBeatsRemaining = [];
    expect(scheduler.shouldAdvanceChapter(progress, 5)).toBe(true);
  });

  it('advances convergence chapter on day threshold', () => {
    const state = createMockState({ chapter: 4 });
    const progress = scheduler.getChapterProgress(state, 12);
    expect(scheduler.shouldAdvanceChapter(progress, 12)).toBe(true);
  });

  it('evaluates ending at chapter 5 day 13', () => {
    const state = createMockState({
      chapter: 5,
      dimensions: { care: 0.7, curiosity: 0.1, community: 0.4, comfort: 0.3, independence: 0.2 },
      stars: 4,
    });
    const ending = scheduler.evaluateEnding(state, 13);
    expect(ending).toBeDefined();
    expect(['keeper', 'builder', 'wanderer', 'community']).toContain(ending);
  });

  it('does not evaluate ending before chapter 5', () => {
    const state = createMockState({ chapter: 4 });
    const ending = scheduler.evaluateEnding(state, 14);
    expect(ending).toBeNull();
  });

  it('does not evaluate ending if already achieved', () => {
    const state = createMockState({
      chapter: 5,
      endingAchieved: 'keeper',
    });
    (state as any).endingAchieved = 'keeper';
    const ending = scheduler.evaluateEnding(state, 14);
    expect(ending).toBeNull();
  });

  it('gets available beats for current chapter', () => {
    const state = createMockState({ chapter: 1 });
    const progress = createSchedulerStoryProgress({}, [], [], [], []);
    const beats = scheduler.getAvailableBeats(state, progress, 5);
    expect(beats.length).toBeGreaterThan(0);
    expect(beats.every(b => b.chapter === 1)).toBe(true);
  });
});

describe('LetterScheduler', () => {
  const letterScheduler = new LetterScheduler(ALL_LETTERS, TRAJECTORY_RULES);

  it('selects mandatory letter first', () => {
    const state = createMockState({ chapter: 0 });
    const { ctx } = createMockSaveData({
      day: 1,
      flags: { current_chapter: 0, marigold_ch0_welcome_delivered: false }
    });
    const deliveries = letterScheduler.selectNextLetters(state, ctx, 1);
    expect(deliveries.length).toBe(1);
    expect(deliveries[0].reason).toBe('mandatory');
    expect(deliveries[0].letterId).toBe('marigold_ch0_welcome');
  });

  it('prioritizes chapter-critical letters for relationship trajectory', () => {
    const state = createMockState({
      chapter: 2,
      dominantDimension: 'care',
      dimensions: { care: 0.7, curiosity: 0.2, community: 0.3, comfort: 0.1, independence: 0.1 },
    });
    const { ctx } = createMockSaveData({
      day: 6,
      flags: {
        letters_delivered: [],
        marigold_ch2_revelation_delivered: true,
        current_chapter: 2
      },
      hearts: { fenwick: 3, sela: 0, bram: 0, nia: 0, wren: 0 },
    });
    const deliveries = letterScheduler.selectNextLetters(state, ctx, 1);
    expect(deliveries.length).toBe(1);
    expect(deliveries[0].letterId).toContain('fenwick');
  });

  it('prioritizes cafe letters for comfort trajectory', () => {
    const state = createMockState({
      chapter: 2,
      dominantDimension: 'comfort',
      dimensions: { care: 0.2, curiosity: 0.1, community: 0.1, comfort: 0.8, independence: 0.1 },
      stars: 3,
    });
    const { ctx } = createMockSaveData({
      day: 6,
      flags: { letters_delivered: [], marigold_ch2_revelation_delivered: true },
      stars: 3,
      upgrades: ['bigger_shelf', 'second_kettle'],
    });
    const deliveries = letterScheduler.selectNextLetters(state, ctx, 1);
    expect(deliveries.length).toBe(1);
  });

  it('prioritizes mystery letters for curiosity trajectory', () => {
    const state = createMockState({
      chapter: 2,
      dominantDimension: 'curiosity',
      dimensions: { care: 0.1, curiosity: 0.7, community: 0.1, comfort: 0.1, independence: 0.3 },
    });
    const { ctx } = createMockSaveData({
      day: 5,
      flags: {
        letters_delivered: [],
        marigold_ch2_revelation_delivered: true,
        wren_clue_1: true,
        current_chapter: 2
      },
      discovered_recipes: ['R001', 'R002', 'R003', 'R004', 'R005'],
    });
    const deliveries = letterScheduler.selectNextLetters(state, ctx, 1);
    expect(deliveries.length).toBe(1);
    expect(deliveries[0].letterId).toContain('wren');
  });

  it('never selects already consumed letter', () => {
    const state = createMockState({ chapter: 1 });
    const { ctx } = createMockSaveData({
      day: 5,
      flags: { letters_delivered: ['marigold_ch0_welcome'] },
    });
    const eligible = letterScheduler.getEligibleLetters(state, ctx);
    expect(eligible.find(l => l.id === 'marigold_ch0_welcome')).toBeUndefined();
  });

  it('respects max per chapter per source limit (3)', () => {
    const state = createMockState({ chapter: 2 });
    const { ctx } = createMockSaveData({ day: 6 });
    const deliveries = letterScheduler.selectNextLetters(state, ctx, 10);
    const sourceCounts: Record<string, number> = {};
    for (const d of deliveries) {
      const letter = ALL_LETTERS.find(l => l.id === d.letterId);
      if (letter) {
        sourceCounts[letter.source] = (sourceCounts[letter.source] ?? 0) + 1;
      }
    }
    for (const count of Object.values(sourceCounts)) {
      expect(count).toBeLessThanOrEqual(3);
    }
  });

  it('filters by chapter - no future chapter letters', () => {
    const state = createMockState({ chapter: 1 });
    const { ctx } = createMockSaveData({ day: 5 });
    const eligible = letterScheduler.getEligibleLetters(state, ctx);
    expect(eligible.every(l => l.chapter <= 1)).toBe(true);
  });

  it('returns identical results for identical state (deterministic)', () => {
    const state = createMockState({ chapter: 2 });
    const { ctx } = createMockSaveData({ day: 6 });
    const deliveries1 = letterScheduler.selectNextLetters(state, ctx, 2);
    const deliveries2 = letterScheduler.selectNextLetters(state, ctx, 2);
    expect(deliveries1.map(d => d.letterId)).toEqual(deliveries2.map(d => d.letterId));
  });
});
