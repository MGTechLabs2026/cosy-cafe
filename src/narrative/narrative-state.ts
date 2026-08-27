// src/narrative/narrative-state.ts — compute hidden narrative dimensions from save state
// Pure TypeScript, zero platform imports. Deterministic, derived from existing gameplay data.

import type { SaveData } from '../save/validate.js';
import type { HeartLedger } from '../sim/hearts.js';
import { displayedHearts } from '../sim/hearts.js';

export type NarrativeDimension =
  | 'care'
  | 'curiosity'
  | 'community'
  | 'comfort'
  | 'independence';

export interface NarrativeState {
  dimensions: Record<NarrativeDimension, number>; // 0–1 normalized
  highestDimension: NarrativeDimension;
  chapter: number;
  trajectoryHint: 'care' | 'comfort' | 'curiosity' | 'community' | 'independence' | null;
  // Computed signals for debugging
  signals: {
    avgHearts: number;
    favoriteServeRatio: number;
    chatRatio: number;
    recipeDiscoveryRatio: number;
    journalOpensPerDay: number;
    hintCardsRead: number;
    experimentalBrewRatio: number;
    wrenScenesSeen: number;
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
    wrenMysteryBrewRatio: number;
  };
}

// Safe division
function safeDiv(numerator: number, denominator: number): number {
  return denominator > 0 ? numerator / denominator : 0;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function getDisplayedHearts(save: SaveData, npc: string): number {
  const points = save.hearts[npc] ?? 0;
  return Math.floor(points + 1e-9);
}

function getUniqueNPCsServed(save: SaveData): number {
  // Derived from hearts distribution - NPCs with any hearts have been served
  const regularNPCs = ['fenwick', 'sela', 'bram', 'nia', 'wren'];
  return regularNPCs.filter(npc => (save.hearts[npc] ?? 0) > 0).length;
}

function getHeartsBreadth(save: SaveData): number {
  // How many NPCs have at least 1 displayed heart
  const regularNPCs = ['fenwick', 'sela', 'bram', 'nia', 'wren'];
  return regularNPCs.filter(npc => getDisplayedHearts(save, npc) >= 1).length;
}

function getTotalServes(save: SaveData): number {
  return save.total_serves ?? 0;
}

function getFavoriteServes(save: SaveData): number {
  // Approximate: we don't track favorite serves directly, but we can estimate
  // from hearts gained - favorite serves give +1.0, correct serves +0.1, chats +0.25
  // This is a rough heuristic
  const regularNPCs = ['fenwick', 'sela', 'bram', 'nia', 'wren'];
  let estimate = 0;
  for (const npc of regularNPCs) {
    const points = save.hearts[npc] ?? 0;
    // Each favorite serve = 1.0, so max favorites = floor(points)
    estimate += Math.floor(points + 1e-9);
  }
  return estimate;
}

function getChatCount(save: SaveData): number {
  // Approximate from hearts - each chat = 0.25
  // But we can't distinguish from correct serves (0.1)
  // Use the chatted_this_service flag as a proxy for current service
  // For lifetime, we'd need to track separately - approximate from heart_points_today
  let estimate = 0;
  for (const [, pointsToday] of Object.entries(save.heart_points_today)) {
    // Points today from chats: 0.25 each
    estimate += Math.floor(pointsToday / 0.25);
  }
  return estimate;
}

function getExperimentalBrews(save: SaveData): number {
  // Not directly tracked - approximate from murky brews which consume ingredients
  // but don't result in serves. We can estimate from ingredient consumption vs serves.
  // For now, use a flag-based approach if we add tracking later.
  // Return 0 for now - can be enhanced with telemetry.
  return 0;
}

function getWrenMysteryBrews(save: SaveData): number {
  // Wren mystery brews = brews when Wren is active with "?" order
  // Not tracked directly - return 0 for now
  return 0;
}

function getWrenVisits(save: SaveData): number {
  // Approximate from Wren hearts + scenes
  const hearts = getDisplayedHearts({ ...save, hearts: save.hearts }, 'wren');
  const scenes = save.flags.seen_scenes.filter(s => s.startsWith('wren_')).length;
  return hearts + scenes; // rough estimate
}

function getWrenScenesSeen(save: SaveData): number {
  return save.flags.seen_scenes.filter(s => s.startsWith('wren_')).length;
}

function getJournalOpens(save: SaveData): number {
  // Not tracked directly - could add to flags later
  // For now, estimate from letters read + recipes discovered
  return (save.flags['letters_read']?.length ?? 0) + save.flags.discovered_recipes.length;
}

function getHintCardsRead(save: SaveData): number {
  // Hint cards are the 4 hinted recipes: R004-R007
  const hintedRecipes = ['R004', 'R005', 'R006', 'R007'];
  return hintedRecipes.filter(r => save.flags.discovered_recipes.includes(r)).length;
}

function getLettersArchived(save: SaveData): number {
  return save.letters.length;
}

function getMaxLetters(): number {
  // Estimate max possible letters in MVP
  return 40; // rough estimate
}

function getTownTabOpens(save: SaveData): number {
  // Not tracked - estimate from town letters delivered
  return save.letters.filter(l => l.startsWith('town_')).length;
}

function getShopVisits(save: SaveData): number {
  // Not directly tracked - estimate from upgrades purchased + ingredients bought
  return save.upgrades.length + Object.values(save.inventory).reduce((a, b) => a + b, 0);
}

function getDaysSkipped(save: SaveData): number {
  // Not tracked directly - could add flag for sleep-in days
  // For now, estimate from day vs total_serves ratio
  // Low serves relative to days = likely skipped days
  const expectedServes = save.day * 5; // ~5 serves/day average
  const actualServes = save.total_serves;
  return Math.max(0, Math.floor((expectedServes - actualServes) / 5));
}

function getServiceDays(save: SaveData): number {
  return Math.max(1, save.day - getDaysSkipped(save));
}

function getEarlyCloses(save: SaveData): number {
  // Not tracked - return 0 for now
  return 0;
}

function getUpgradesOwned(save: SaveData): number {
  return save.upgrades.length;
}

function getMaxUpgrades(): number {
  // 6 upgrades, but bigger_shelf is repeatable x2 = 7 total
  return 7;
}

function getShelfCapacity(save: SaveData): number {
  const biggerShelfCount = save.upgrades.filter(u => u === 'bigger_shelf').length;
  return 6 + biggerShelfCount * 3;
}

function getInventoryKinds(save: SaveData): number {
  return Object.values(save.inventory).filter(v => v > 0).length;
}

function getMaxInventoryKinds(): number {
  return 9; // tea_leaves, honey, moonleaf, cocoa, ember_chili, cloud_sugar, frostberries, ginger_root, sage
}

function getDays(save: SaveData): number {
  return save.day;
}

function getRelaxedMode(save: SaveData): boolean {
  return save.settings.relaxed_mode ?? true;
}

/**
 * Compute the complete narrative state from save data.
 * Pure function - deterministic, no side effects.
 */
export function computeNarrativeState(save: SaveData): NarrativeState {
  const day = getDays(save);
  const totalServes = getTotalServes(save);
  const favoriteServes = getFavoriteServes(save);
  const chatCount = getChatCount(save);
  const recipesDiscovered = save.flags.discovered_recipes.length;
  const journalOpens = getJournalOpens(save);
  const hintCardsRead = getHintCardsRead(save);
  const experimentalBrews = getExperimentalBrews(save);
  const wrenScenesSeen = getWrenScenesSeen(save);
  const uniqueNPCsServed = getUniqueNPCsServed(save);
  const heartsBreadth = getHeartsBreadth(save);
  const lettersArchived = getLettersArchived(save);
  const townTabOpens = getTownTabOpens(save);
  const upgradesOwned = getUpgradesOwned(save);
  const stars = save.stars;
  const shelfCapacity = getShelfCapacity(save);
  const inventoryKinds = getInventoryKinds(save);
  const shopVisits = getShopVisits(save);
  const daysSkipped = getDaysSkipped(save);
  const serviceDays = getServiceDays(save);
  const earlyCloses = getEarlyCloses(save);
  const relaxedMode = getRelaxedMode(save);
  const wrenMysteryBrews = getWrenMysteryBrews(save);
  const wrenVisits = getWrenVisits(save);

  // Average hearts across all regular NPCs
  const regularNPCs = ['fenwick', 'sela', 'bram', 'nia', 'wren'];
  const avgHearts = regularNPCs.reduce((sum, npc) => sum + getDisplayedHearts(save, npc), 0) / regularNPCs.length;

  // Compute raw dimension values (before clamping)
  const careRaw = 
    0.40 * safeDiv(avgHearts, 5) +
    0.30 * safeDiv(favoriteServes, totalServes) +
    0.20 * safeDiv(chatCount, Math.max(1, totalServes)) +
    0.10 * safeDiv(recipesDiscovered, 8); // 8 total recipes

  const curiosityRaw =
    0.35 * safeDiv(recipesDiscovered, 8) +
    0.25 * safeDiv(journalOpens, Math.max(1, day)) +
    0.20 * safeDiv(hintCardsRead, 4) +
    0.10 * safeDiv(experimentalBrews, Math.max(1, totalServes)) +
    0.10 * safeDiv(wrenScenesSeen, 6);

  const communityRaw =
    0.35 * safeDiv(uniqueNPCsServed, 5) + // 5 regular NPCs (excluding travelers)
    0.25 * safeDiv(heartsBreadth, 5) +
    0.20 * safeDiv(lettersArchived, 40) +
    0.20 * safeDiv(townTabOpens, Math.max(1, day));

  const comfortRaw =
    0.30 * safeDiv(upgradesOwned, 7) +
    0.25 * safeDiv(stars, 5) +
    0.20 * safeDiv(shelfCapacity, 12) +
    0.15 * safeDiv(inventoryKinds, 9) +
    0.10 * safeDiv(shopVisits, Math.max(1, day));

  const independenceRaw =
    0.35 * safeDiv(daysSkipped, 14) +
    0.25 * safeDiv(earlyCloses, serviceDays) +
    0.20 * (relaxedMode ? 1 : 0) +
    0.10 * safeDiv(experimentalBrews, Math.max(1, totalServes)) +
    0.10 * safeDiv(wrenMysteryBrews, Math.max(1, wrenVisits));

  const dimensions: Record<NarrativeDimension, number> = {
    care: clamp01(careRaw),
    curiosity: clamp01(curiosityRaw),
    community: clamp01(communityRaw),
    comfort: clamp01(comfortRaw),
    independence: clamp01(independenceRaw),
  };

  // Find highest dimension for tiebreaking
  let highestDimension: NarrativeDimension = 'care';
  let highestValue = dimensions.care;
  for (const [dim, value] of Object.entries(dimensions)) {
    if (value > highestValue) {
      highestValue = value;
      highestDimension = dim as NarrativeDimension;
    }
  }

  // Trajectory hint based on highest dimension
  const trajectoryMap: Record<NarrativeDimension, 'care' | 'comfort' | 'curiosity' | 'community' | 'independence'> = {
    care: 'care',
    comfort: 'comfort',
    curiosity: 'curiosity',
    community: 'community',
    independence: 'independence',
  };
  const trajectoryHint = trajectoryMap[highestDimension];

  // Chapter from save flags
  const chapter = save.flags['current_chapter'] as number ?? 0;

  return {
    dimensions,
    highestDimension,
    chapter,
    trajectoryHint,
    signals: {
      avgHearts,
      favoriteServeRatio: safeDiv(favoriteServes, totalServes),
      chatRatio: safeDiv(chatCount, Math.max(1, totalServes)),
      recipeDiscoveryRatio: safeDiv(recipesDiscovered, 8),
      journalOpensPerDay: safeDiv(journalOpens, day),
      hintCardsRead: safeDiv(hintCardsRead, 4),
      experimentalBrewRatio: safeDiv(experimentalBrews, Math.max(1, totalServes)),
      wrenScenesSeen,
      uniqueNPCsServed,
      heartsBreadth,
      lettersArchivedRatio: safeDiv(lettersArchived, 40),
      townTabOpensPerDay: safeDiv(townTabOpens, day),
      upgradesOwnedRatio: safeDiv(upgradesOwned, 7),
      starsRatio: safeDiv(stars, 5),
      shelfCapacityRatio: safeDiv(shelfCapacity, 12),
      inventoryKindsRatio: safeDiv(inventoryKinds, 9),
      shopVisitsPerDay: safeDiv(shopVisits, Math.max(1, day)),
      daysSkippedRatio: safeDiv(daysSkipped, 14),
      earlyCloseRatio: safeDiv(earlyCloses, serviceDays),
      relaxedMode,
      wrenMysteryBrewRatio: safeDiv(wrenMysteryBrews, Math.max(1, wrenVisits)),
    },
  };
}