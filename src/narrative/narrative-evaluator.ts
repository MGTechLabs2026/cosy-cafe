// src/narrative/narrative-evaluator.ts — evaluates narrative signals into narrative state
// Pure TypeScript, zero platform imports. Contains ONLY dimension evaluation logic.

import type { NarrativeSignals } from './narrative-signals';

export type NarrativeDimension =
  | 'care'
  | 'curiosity'
  | 'community'
  | 'comfort'
  | 'independence';

/** Complete narrative state — immutable result */
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

/** Compute CARE dimension: relationship depth + preferred serve + chat */
function computeCare(signals: NarrativeSignals): number {
  const { relationships } = signals;
  
  return (
    relationships.heartsBreadth * 0.25 +
    relationships.avgHearts * 0.25 +
    relationships.chatRatio * 0.2 +
    relationships.favoriteServeRatio * 0.15 +
    relationships.prefRatio * 0.15
  );
}

/** Compute CURIOSITY dimension: recipe discovery + experimental brews + Wren mystery */
function computeCuriosity(signals: NarrativeSignals): number {
  const { activity, recipeDiscoveryRatio, hintCardRatio, wrenSceneRatio } = signals;
  
  return (
    recipeDiscoveryRatio * 0.25 +
    hintCardRatio * 0.15 +
    activity.experimentalBrewRatio * 0.2 +
    activity.wrenMysteryBrewRatio * 0.15 +
    wrenSceneRatio * 0.15 +
    activity.journalOpensPerDay * 0.1
  );
}

/** Compute COMMUNITY dimension: town engagement + letter reading + diverse NPCs served */
function computeCommunity(signals: NarrativeSignals): number {
  const { relationships, activity } = signals;
  
  return (
    activity.lettersReadRatio * 0.3 +
    activity.townLetterRatio * 0.2 +
    relationships.uniqueNpcsServed * 0.2 +
    relationships.heartsBreadth * 0.15 +
    activity.townTabOpensPerDay * 0.15
  );
}

/** Compute COMFORT dimension: café investment + consistency + relaxed pacing */
function computeComfort(signals: NarrativeSignals): number {
  const { activity } = signals;
  
  const noEarlyCloseBonus = activity.earlyCloseRatio === 0 ? 0.1 : 0;
  
  return (
    activity.upgradesOwnedRatio * 0.25 +
    activity.shelfCapacityRatio * 0.2 +
    activity.inventoryKindsRatio * 0.15 +
    activity.starsRatio * 0.15 +
    activity.shopVisitsPerDay * 0.15 +
    noEarlyCloseBonus * 0.1
  );
}

/** Compute INDEPENDENCE dimension: skipping days + early closes + self-directed play */
function computeIndependence(signals: NarrativeSignals): number {
  const { activity, progression } = signals;
  
  return (
    activity.daysSkippedRatio * 0.3 +
    activity.earlyCloseRatio * 0.2 +
    (1 - activity.chatRatio) * 0.2 +
    (1 - activity.favoriteServeRatio) * 0.15 +
    progression.chapterProgress * 0.1 +
    progression.notRelaxed * 0.05
  );
}

/** Get dominant dimension (highest score) */
function getDominantDimension(dimensions: Record<NarrativeDimension, number>): NarrativeDimension | null {
  const entries = Object.entries(dimensions) as [NarrativeDimension, number][];
  const sorted = entries.sort((a, b) => b[1] - a[1]);
  
  if (sorted.length < 2) return sorted[0]?.[0] ?? null;
  
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
function computeTrajectory(dominant: NarrativeDimension | null): 'relationship' | 'cafe' | 'curiosity' | null {
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
    default:
      return null;
  }
}

/** Main evaluator function — pure function from signals to state */
export function evaluateNarrativeState(
  signals: NarrativeSignals,
  chapter: number,
  marigoldMysteryLayer: number,
  wrenCluesGathered: number,
  wrenScenesSeen: number,
  endingAchieved: 'keeper' | 'builder' | 'wanderer' | 'community' | null,
  day: number,
  playthroughCount: number,
  previousEndings: string[]
): NarrativeState {
  const dimensions: Record<NarrativeDimension, number> = {
    care: computeCare(signals),
    curiosity: computeCuriosity(signals),
    community: computeCommunity(signals),
    comfort: computeComfort(signals),
    independence: computeIndependence(signals),
  };

  const dominantDimension = getDominantDimension(dimensions);
  const secondaryDimension = getSecondaryDimension(dimensions);
  const trajectory = computeTrajectory(dominantDimension);
  const trajectoryLocked = chapter >= 3 && trajectory !== null;

  return {
    dimensions,
    dominantDimension,
    secondaryDimension,
    trajectory,
    chapter,
    marigoldMysteryLayer,
    wrenCluesGathered,
    wrenScenesSeen,
    trajectoryLocked,
    endingAchieved,
    day,
    playthroughCount,
    previousEndings,
  };
}