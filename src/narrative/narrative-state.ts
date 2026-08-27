// src/narrative/narrative-state.ts — compute hidden narrative dimensions from narrative input
// Pure TypeScript, zero platform imports. Deterministic, derived from NarrativeInput.

import type { NarrativeInput, NarrativeDimension } from './narrative-input';

export interface NarrativeState {
  /** 0..1 for each dimension */
  dimensions: Record<NarrativeDimension, number>;
  /** Dominant dimension (or null if tied) */
  dominantDimension: NarrativeDimension | null;
  /** Second-highest dimension (or null) */
  secondaryDimension: NarrativeDimension | null;
  /** Computed trajectory based on dominant dimension */
  trajectory: 'relationship' | 'cafe' | 'curiosity' | null;
  /** Chapter this state applies to */
  chapter: number;
  /** Marigold mystery layer 1-5 */
  marigoldMysteryLayer: number;
  /** Wren clues gathered 0-3 */
  wrenCluesGathered: number;
  /** Wren scenes seen count */
  wrenScenesSeen: number;
  /** Whether trajectory is locked (after chapter 3) */
  trajectoryLocked: boolean;
  /** Achieved ending (if any) */
  endingAchieved: 'keeper' | 'builder' | 'wanderer' | 'community' | null;
  /** Days played this playthrough */
  day: number;
  /** Total playthroughs completed */
  playthroughCount: number;
  /** Previous endings achieved */
  previousEndings: string[];
}

/** Default dimension values when no data */
const DEFAULT_DIMENSIONS: Record<NarrativeDimension, number> = {
  care: 0,
  curiosity: 0,
  community: 0,
  comfort: 0,
  independence: 0,
};

/** Compute care dimension: relationship depth + preferred serve + chat */
function computeCare(input: NarrativeInput): number {
  const { relationships, activity } = input;
  
  // Heart breadth: how many NPCs have at least 1 heart
  const breadth = relationships.heartsBreadth / 5; // 0..1
  
  // Average displayed hearts across all NPCs
  const avgHearts = Object.values(relationships.displayedHearts).reduce((a, b) => a + b, 0) / 5;
  const heartsNorm = Math.min(avgHearts / 5, 1); // 0..1
  
  // Chat engagement (ratio of chats to serves)
  const chatRatio = activity.chatRatio;
  
  // Favorite serve accuracy
  const favoriteServeRatio = activity.favoriteServeRatio;
  
  // Learned preferences count
  const prefRatio = Math.min(relationships.learnedPrefs.length / 5, 1);
  
  return (
    breadth * 0.25 +
    heartsNorm * 0.25 +
    chatRatio * 0.2 +
    favoriteServeRatio * 0.15 +
    prefRatio * 0.15
  );
}

/** Compute curiosity dimension: recipe discovery + experimental brews + Wren mystery */
function computeCuriosity(input: NarrativeInput): number {
  const { recipes, activity, story } = input;
  
  // Recipe discovery ratio
  const discoveryRatio = recipes.discoveredRecipes.length / recipes.totalRecipes;
  
  // Hint cards read (R004-R007)
  const hintRatio = recipes.hintCardsRead / 4;
  
  // Experimental brew ratio
  const experimentalRatio = activity.experimentalBrewRatio;
  
  // Wren mystery brew ratio
  const wrenMysteryRatio = activity.wrenMysteryBrewRatio;
  
  // Wren scenes seen
  const wrenSceneRatio = Math.min(recipes.wrenScenesSeen / 6, 1);
  
  // Journal engagement (opens per day)
  const journalRatio = Math.min(activity.journalOpensPerDay / 2, 1);
  
  return (
    discoveryRatio * 0.25 +
    hintRatio * 0.15 +
    experimentalRatio * 0.2 +
    wrenMysteryRatio * 0.15 +
    wrenSceneRatio * 0.15 +
    journalRatio * 0.1
  );
}

/** Compute community dimension: town engagement + letter reading + diverse NPCs served */
function computeCommunity(input: NarrativeInput): number {
  const { letters, activity, relationships } = input;
  
  // Letters read ratio
  const lettersReadRatio = letters.lettersDelivered.length > 0
    ? letters.lettersRead.length / letters.lettersDelivered.length
    : 0;
  
  // Town letters delivered
  const townRatio = letters.townLettersDelivered / letters.maxLetters;
  
  // Unique NPCs served breadth
  const uniqueRatio = relationships.uniqueNPCsServed / 5;
  
  // Hearts breadth
  const breadthRatio = relationships.heartsBreadth / 5;
  
  // Town tab opens per day
  const townTabRatio = Math.min(activity.townTabOpensPerDay / 1, 1);
  
  return (
    lettersReadRatio * 0.3 +
    townRatio * 0.2 +
    uniqueRatio * 0.2 +
    breadthRatio * 0.15 +
    townTabRatio * 0.15
  );
}

/** Compute comfort dimension: café investment + consistency + relaxed pacing */
function computeComfort(input: NarrativeInput): number {
  const { upgrades, activity, story } = input;
  
  // Upgrades owned ratio
  const upgradeRatio = upgrades.upgradesOwned / upgrades.maxUpgrades;
  
  // Shelf capacity ratio
  const shelfRatio = upgrades.shelfCapacity / upgrades.maxShelfCapacity;
  
  // Inventory variety
  const inventoryRatio = upgrades.inventoryKinds / upgrades.maxInventoryKinds;
  
  // Stars ratio (consistency)
  const starsRatio = activity.starsRatio;
  
  // Shop visits per day (engagement with café)
  const shopRatio = Math.min(activity.shopVisitsPerDay / 3, 1);
  
  // Relaxed mode / no early closes
  const relaxedBonus = activity.relaxedMode ? 0.1 : 0;
  const noEarlyCloseBonus = activity.earlyCloseRatio === 0 ? 0.1 : 0;
  
  return (
    upgradeRatio * 0.25 +
    shelfRatio * 0.2 +
    inventoryRatio * 0.15 +
    starsRatio * 0.15 +
    shopRatio * 0.15 +
    relaxedBonus * 0.05 +
    noEarlyCloseBonus * 0.05
  );
}

/** Compute independence dimension: skipping days + early closes + self-directed play */
function computeIndependence(input: NarrativeInput): number {
  const { activity, story } = input;
  
  // Days skipped ratio
  const skipRatio = activity.daysSkippedRatio;
  
  // Early close ratio
  const earlyCloseRatio = activity.earlyCloseRatio;
  
  // Low chat engagement
  const lowChatRatio = 1 - activity.chatRatio;
  
  // Low favorite serve adherence
  const lowFavoriteRatio = 1 - activity.favoriteServeRatio;
  
  // High chapter (later chapters = more independence)
  const chapterRatio = Math.min(story.chapter / 5, 1);
  
  // Not relaxed mode
  const notRelaxed = activity.relaxedModeSetting ? 0 : 0.1;
  
  return (
    skipRatio * 0.3 +
    earlyCloseRatio * 0.2 +
    lowChatRatio * 0.2 +
    lowFavoriteRatio * 0.15 +
    chapterRatio * 0.1 +
    notRelaxed * 0.05
  );
}

/** Get dominant dimension (highest score) */
function getDominantDimension(dimensions: Record<NarrativeDimension, number>): NarrativeDimension | null {
  const entries = Object.entries(dimensions) as [NarrativeDimension, number][];
  const sorted = entries.sort((a, b) => b[1] - a[1]);
  
  if (sorted.length < 2) return sorted[0]?.[0] ?? null;
  
  // Check for tie (within 0.01)
  const first = sorted[0];
  const second = sorted[1];
  if (!first || !second) return null;
  if (Math.abs(first[1] - second[1]) < 0.01) return null;
  
  return first[0];
}

/** Get secondary dimension (second highest) */
function getSecondaryDimension(dimensions: Record<NarrativeDimension, number>): NarrativeDimension | null {
  const entries = Object.entries(dimensions) as [NarrativeDimension, number][];
  const sorted = entries.sort((a, b) => b[1] - a[1]);
  if (sorted.length < 2) return null;
  const second = sorted[1];
  return second ? second[0] : null;
}

/** Compute trajectory from dominant dimension */
function computeTrajectory(dominant: NarrativeDimension | null, chapter: number): 'relationship' | 'cafe' | 'curiosity' | null {
  if (!dominant) return null;
  
  switch (dominant) {
    case 'care':
    case 'community':
      return 'relationship';
    case 'comfort':
      return 'cafe';
    case 'curiosity':
    case 'independence':
      return 'curiosity';
  }
}

/** Main evaluator function */
export function evaluateNarrativeState(input: NarrativeInput): NarrativeState {
  const dimensions: Record<NarrativeDimension, number> = {
    care: computeCare(input),
    curiosity: computeCuriosity(input),
    community: computeCommunity(input),
    comfort: computeComfort(input),
    independence: computeIndependence(input),
  };

  const dominantDimension = getDominantDimension(dimensions);
  const secondaryDimension = getSecondaryDimension(dimensions);
  const trajectory = computeTrajectory(dominantDimension, input.story.chapter);
  const trajectoryLocked = input.story.chapter >= 3 && trajectory !== null;

  return {
    dimensions,
    dominantDimension,
    secondaryDimension,
    trajectory,
    chapter: input.story.chapter,
    marigoldMysteryLayer: input.story.marigoldMysteryLayer,
    wrenCluesGathered: input.story.wrenCluesGathered,
    wrenScenesSeen: input.recipes.wrenScenesSeen,
    trajectoryLocked,
    endingAchieved: input.story.endingAchieved,
    day: input.activity.day,
    playthroughCount: input.story.playthroughCount,
    previousEndings: input.story.previousEndings,
  };
}