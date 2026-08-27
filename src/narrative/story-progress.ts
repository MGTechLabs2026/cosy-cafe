// src/narrative/story-progress.ts — explicit story progress model
// Pure TypeScript, zero platform imports. Typed IDs for story content.

/** Unique identifiers for story beats (letters, scenes, convergence events) */
export type StoryBeatId = 
  | `letter_${string}`
  | `scene_${string}`
  | `convergence_${string}`
  | `ending_${string}`;

/** Unique identifier for letters */
export type LetterId = string & { readonly __brand: unique symbol };

/** Unique identifier for scenes */
export type SceneId = string & { readonly __brand: unique symbol };

/** Unique identifier for chapters */
export type ChapterId = 0 | 1 | 2 | 3 | 4 | 5;

/** Unique identifier for endings */
export type EndingId = 'keeper' | 'builder' | 'wanderer' | 'community';

/** Type-safe letter ID factory */
export function letterId(id: string): LetterId {
  return id as LetterId;
}

/** Type-safe scene ID factory */
export function sceneId(id: string): SceneId {
  return id as SceneId;
}

/** Unique identifier for NPC arcs */
export type ArcId = 
  | 'fenwick_arc'
  | 'sela_arc'
  | 'bram_arc'
  | 'nia_arc'
  | 'wren_arc';

/** Chapter state */
export interface ChapterState {
  /** Current chapter */
  current: ChapterId;
  /** Day this chapter was entered */
  enteredDay: number;
  /** Mandatory beats completed in this chapter */
  mandatoryCompleted: string[];
  /** Mandatory beats remaining in this chapter */
  mandatoryRemaining: string[];
  /** Whether this chapter has converged */
  converged: boolean;
}

/** NPC arc progress */
export interface ArcProgress {
  /** Arc identifier */
  id: ArcId;
  /** Whether intro scene has played */
  introDone: boolean;
  /** Whether middle scenes have played */
  middlesDone: boolean;
  /** Whether resolution scene has played */
  resolutionDone: boolean;
  /** Whether epilogue has played */
  epilogueDone: boolean;
  /** Arc-specific flags */
  flags: Record<string, boolean>;
}

/** Story progress — all completed/seen content */
export interface StoryProgress {
  /** Chapter state */
  chapter: ChapterState;
  /** Completed story beats (letter IDs, scene IDs, convergence IDs) */
  completedBeats: Set<StoryBeatId>;
  /** NPC arcs progress */
  arcs: Map<ArcId, ArcProgress>;
  /** Delivered letter IDs */
  lettersDelivered: Set<LetterId>;
  /** Read letter IDs */
  lettersRead: Set<LetterId>;
  /** Seen scene IDs */
  scenesSeen: Set<SceneId>;
  /** Active narrative flags */
  flags: Record<string, boolean>;
  /** Owned upgrades */
  upgradesOwned: Set<string>;
  /** Total stars */
  stars: number;
  /** Days skipped */
  daysSkipped: number;
  /** Day each chapter was entered */
  chapterEnteredDay: Map<ChapterId, number>;
  /** Previously achieved endings */
  previousEndings: EndingId[];
  /** Playthrough count */
  playthroughCount: number;
}

/** Story progress with ending achieved */
export interface StoryProgressWithEnding extends StoryProgress {
  /** Achieved ending (if any) */
  endingAchieved: EndingId | null;
  /** Day ending was achieved */
  endingDay: number | null;
}

/** Default empty story progress */
export function createEmptyStoryProgress(): StoryProgress {
  return {
    chapter: {
      current: 0,
      enteredDay: 1,
      mandatoryCompleted: [],
      mandatoryRemaining: [],
      converged: false,
    },
    completedBeats: new Set(),
    arcs: new Map(),
    lettersDelivered: new Set(),
    lettersRead: new Set(),
    scenesSeen: new Set(),
    flags: {},
    upgradesOwned: new Set(),
    stars: 0,
    daysSkipped: 0,
    chapterEnteredDay: new Map([[0, 1]]),
    previousEndings: [],
    playthroughCount: 0,
  };
}

/** Create story progress from save data */
export function createStoryProgressFromSave(save: {
  day: number;
  stars: number;
  flags: Record<string, unknown>;
  upgrades: string[];
  letters: string[];
  seen_scenes: string[];
}): StoryProgress {
  const progress = createEmptyStoryProgress();
  
  // Chapter state
  const currentChapter = (save.flags['current_chapter'] as number) ?? 0;
  progress.chapter.current = currentChapter as ChapterId;
  progress.chapter.enteredDay = (save.flags['chapter_entered_day'] as Record<number, number>)?.[currentChapter] ?? save.day;
  
  // Chapter mandatory beats
  // (Would need chapter config to determine remaining - simplified here)
  
  // Letters
  for (const l of save.flags['letters_delivered'] as string[] ?? []) {
    progress.lettersDelivered.add(l as LetterId);
  }
  for (const l of save.flags['letters_read'] as string[] ?? []) {
    progress.lettersRead.add(l as LetterId);
  }
  for (const l of save.letters ?? []) {
    progress.lettersDelivered.add(l as LetterId);
  }
  
  // Scenes
  for (const s of save.seen_scenes ?? []) {
    progress.scenesSeen.add(s as SceneId);
    progress.completedBeats.add(`scene_${s}` as StoryBeatId);
  }
  
  // Flags
  for (const [k, v] of Object.entries(save.flags)) {
    if (typeof v === 'boolean') progress.flags[k] = v;
  }
  
  // Upgrades
  for (const u of save.upgrades ?? []) {
    progress.upgradesOwned.add(u);
  }
  
  // Stars
  progress.stars = save.stars;
  
  // Days skipped (approximate)
  const expectedServes = save.day * 5;
  const actualServes = save.flags['total_serves'] as number ?? 0;
  progress.daysSkipped = Math.max(0, Math.floor((expectedServes - actualServes) / 5));
  
  // Chapter entered days
  const enteredDayMap = save.flags['chapter_entered_day'] as Record<number, number> ?? {};
  for (const [k, v] of Object.entries(enteredDayMap)) {
    const chapterNum = Number(k);
    if (chapterNum >= 0 && chapterNum <= 5) {
      progress.chapterEnteredDay.set(chapterNum as ChapterId, v);
    }
  }
  
  // Previous endings
  progress.previousEndings = (save.flags['previous_endings'] as string[] ?? []) as EndingId[];
  
  // Playthrough count
  progress.playthroughCount = (save.flags['playthrough_count'] as number) ?? 0;
  
  // Arc progress from flags
  const arcFlags: Record<ArcId, { introDone: boolean; middlesDone: boolean; resolutionDone: boolean; epilogueDone: boolean }> = {
    fenwick_arc: {
      introDone: (save.flags['sela_intro_done'] as boolean) ?? false,
      middlesDone: false,
      resolutionDone: (save.flags['fenwick_arc_complete'] as boolean) ?? false,
      epilogueDone: (save.flags['fenwick_epilogue_done'] as boolean) ?? false,
    },
    sela_arc: {
      introDone: (save.flags['sela_intro_done'] as boolean) ?? false,
      middlesDone: false,
      resolutionDone: false,
      epilogueDone: false,
    },
    bram_arc: {
      introDone: (save.flags['bram_intro_done'] as boolean) ?? false,
      middlesDone: false,
      resolutionDone: false,
      epilogueDone: false,
    },
    nia_arc: {
      introDone: (save.flags['nia_intro_done'] as boolean) ?? false,
      middlesDone: false,
      resolutionDone: false,
      epilogueDone: false,
    },
    wren_arc: {
      introDone: false,
      middlesDone: (save.flags['wren_usual_revealed'] as boolean) ?? false,
      resolutionDone: (save.flags['wren_arc_complete'] as boolean) ?? false,
      epilogueDone: (save.flags['wren_epilogue_done'] as boolean) ?? false,
    },
  };
  
  for (const [id, data] of Object.entries(arcFlags)) {
    progress.arcs.set(id as ArcId, {
      id: id as ArcId,
      ...data,
      flags: {},
    });
  }
  
  return progress;
}

/** Check if a beat is completed */
export function isBeatCompleted(progress: StoryProgress, beatId: StoryBeatId): boolean {
  return progress.completedBeats.has(beatId);
}

/** Mark a beat as completed */
export function markBeatCompleted(progress: StoryProgress, beatId: StoryBeatId): void {
  progress.completedBeats.add(beatId);
}

/** Check if letter is delivered */
export function isLetterDelivered(progress: StoryProgress, letterId: LetterId): boolean {
  return progress.lettersDelivered.has(letterId);
}

/** Check if letter is read */
export function isLetterRead(progress: StoryProgress, letterId: LetterId): boolean {
  return progress.lettersRead.has(letterId);
}

/** Check if scene is seen */
export function isSceneSeen(progress: StoryProgress, sceneId: SceneId): boolean {
  return progress.scenesSeen.has(sceneId);
}

/** Check if flag is set */
export function isFlagSet(progress: StoryProgress, flag: string): boolean {
  return progress.flags[flag] === true;
}

/** Check if upgrade is owned */
export function isUpgradeOwned(progress: StoryProgress, upgradeId: string): boolean {
  return progress.upgradesOwned.has(upgradeId);
}