// src/narrative/narrative-signals.ts — transform raw input into measurable signals
// Pure TypeScript, zero platform imports. No narrative interpretation.

import type { NarrativeInput, ActivityCounters } from './narrative-input';

/** Relationship signals derived from input */
export interface RelationshipSignals {
  /** 0..1 — how many NPCs have ≥1 heart */
  heartsBreadth: number;
  /** 0..1 — average displayed hearts across all 5 NPCs */
  avgHearts: number;
  /** 0..1 — chats per serve */
  chatRatio: number;
  /** 0..1 — favorite serves per total serves */
  favoriteServeRatio: number;
  /** 0..1 — learned preferences per NPC */
  prefRatio: number;
  /** 0..1 — unique NPCs served per total NPCs */
  uniqueNpcsServed: number;
}

/** Activity signals derived from input */
export interface ActivitySignals {
  /** 0..1 — experimental brews per total brews */
  experimentalBrewRatio: number;
  /** 0..1 — Wren mystery brews per total brews */
  wrenMysteryBrewRatio: number;
  /** 0..1 — journal opens per day */
  journalOpensPerDay: number;
  /** 0..1 — letters read per letters delivered */
  lettersReadRatio: number;
  /** 0..1 — town letters per max letters */
  townLetterRatio: number;
  /** 0..1 — shop visits per day */
  shopVisitsPerDay: number;
  /** 0..1 — days skipped per 14 days */
  daysSkippedRatio: number;
  /** 0..1 — early closes per service day */
  earlyCloseRatio: number;
  /** 0..1 — town tab opens per day */
  townTabOpensPerDay: number;
  /** 0..1 — upgrades owned ratio */
  upgradesOwnedRatio: number;
  /** 0..1 — stars ratio */
  starsRatio: number;
  /** 0..1 — shelf capacity ratio */
  shelfCapacityRatio: number;
  /** 0..1 — inventory kinds ratio */
  inventoryKindsRatio: number;
  /** chat ratio (chats per serve) */
  chatRatio: number;
  /** favorite serve ratio */
  favoriteServeRatio: number;
}

/** Progression signals derived from input */
export interface ProgressionSignals {
  /** 0..1 — chapter progress */
  chapterProgress: number;
  /** 0..1 — not relaxed mode */
  notRelaxed: number;
}

/** All narrative signals combined */
export interface NarrativeSignals {
  relationships: RelationshipSignals;
  activity: ActivitySignals;
  progression: ProgressionSignals;
  /** Recipe discovery ratio 0..1 */
  recipeDiscoveryRatio: number;
  /** Hint cards read ratio 0..1 */
  hintCardRatio: number;
  /** Wren scenes seen ratio 0..1 */
  wrenSceneRatio: number;
  /** Wren visits */
  wrenVisits: number;
}

export type NarrativeDimension =
  | 'care'
  | 'curiosity'
  | 'community'
  | 'comfort'
  | 'independence';

/** Calculate relationship signals from input */
export function calculateRelationshipSignals(input: NarrativeInput): RelationshipSignals {
  const { relationships, activity } = input;
  const act = activity.activity;
  
  const heartsBreadth = relationships.heartsBreadth / 5;
  
  const avgHearts = Object.values(relationships.displayedHearts).reduce((a, b) => a + b, 0) / 5;
  const avgHeartsNorm = Math.min(avgHearts / 5, 1);
  
  const chatRatio = act.totalServes > 0 ? act.totalChats / act.totalServes : 0;
  
  const favoriteServeRatio = act.totalServes > 0 ? act.favoriteServeCount / act.totalServes : 0;
  
  const prefRatio = Math.min(relationships.learnedPrefs.length / 5, 1);
  
  const uniqueNpcsServed = Object.keys(act.servesByNpc).length / 5;
  
  return {
    heartsBreadth,
    avgHearts: avgHeartsNorm,
    chatRatio,
    favoriteServeRatio,
    prefRatio,
    uniqueNpcsServed,
  };
}

/** Calculate activity signals from input */
export function calculateActivitySignals(input: NarrativeInput): ActivitySignals {
  const { letters, activity, upgrades } = input;
  const act = activity.activity;
  
  const experimentalBrewRatio = act.totalBrews > 0 ? act.experimentalBrewCount / act.totalBrews : 0;
  const wrenMysteryBrewRatio = act.totalBrews > 0 ? act.wrenMysteryBrewCount / act.totalBrews : 0;
  
  const journalOpensPerDay = Math.min(activity.journalOpensPerDay / 2, 1);
  
  const lettersReadRatio = letters.lettersDelivered.length > 0
    ? act.lettersReadCount / letters.lettersDelivered.length
    : 0;
  
  const townLetterRatio = letters.townLettersDelivered / letters.maxLetters;
  
  const shopVisits = act.upgradePurchaseCount + act.ingredientsPurchasedTotal;
  const shopVisitsPerDay = Math.min(activity.day > 0 ? shopVisits / activity.day : 0, 1);
  
  const daysSkippedRatio = act.daysSkipped / 14;
  
  const earlyCloseRatio = act.earlyCloses > 0 && activity.serviceDays > 0
    ? act.earlyCloses / activity.serviceDays
    : 0;
  
  const townTabOpens = act.journalOpensByTab['town'] ?? 0;
  const townTabOpensPerDay = Math.min(activity.day > 0 ? townTabOpens / activity.day : 0, 1);
  
  const upgradesOwnedRatio = upgrades.upgradesOwned / upgrades.maxUpgrades;
  const starsRatio = activity.starsRatio;
  const shelfCapacityRatio = upgrades.shelfCapacity / upgrades.maxShelfCapacity;
  const inventoryKindsRatio = upgrades.inventoryKinds / upgrades.maxInventoryKinds;
  
  const chatRatio = act.totalServes > 0 ? act.totalChats / act.totalServes : 0;
  const favoriteServeRatio = act.totalServes > 0 ? act.favoriteServeCount / act.totalServes : 0;
  
  return {
    experimentalBrewRatio,
    wrenMysteryBrewRatio,
    journalOpensPerDay,
    lettersReadRatio,
    townLetterRatio,
    shopVisitsPerDay,
    daysSkippedRatio,
    earlyCloseRatio,
    townTabOpensPerDay,
    upgradesOwnedRatio,
    starsRatio,
    shelfCapacityRatio,
    inventoryKindsRatio,
    chatRatio,
    favoriteServeRatio,
  };
}

/** Calculate progression signals from input */
export function calculateProgressionSignals(input: NarrativeInput): ProgressionSignals {
  const { story, activity } = input;
  
  const chapterProgress = Math.min(story.chapter / 5, 1);
  const notRelaxed = activity.relaxedModeSetting ? 0 : 0.1;
  
  return {
    chapterProgress,
    notRelaxed,
  };
}

/** Calculate all narrative signals from input */
export function calculateAllSignals(input: NarrativeInput): NarrativeSignals {
  const { recipes, activity } = input;
  
  return {
    relationships: calculateRelationshipSignals(input),
    activity: calculateActivitySignals(input),
    progression: calculateProgressionSignals(input),
    recipeDiscoveryRatio: recipes.discoveredRecipes.length / recipes.totalRecipes,
    hintCardRatio: recipes.hintCardsRead / 4,
    wrenSceneRatio: Math.min(recipes.wrenScenesSeen / 6, 1),
    wrenVisits: activity.activity.wrenVisits,
  };
}