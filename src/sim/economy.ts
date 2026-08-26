// sim/economy.ts — doc 02 §4 (coins, tips, perfect-serve bonus)
// Pure logic, no DOM/Canvas imports.

import { drinkPrice, getRecipe } from './brewing.js';

export interface EconomyState {
  coins: number;
  stars: number; // 0–5
  /** Lifetime correct serves — drives star thresholds (doc 02 §5). */
  totalServes: number;
}

export function createInitialEconomy(): EconomyState {
  return {
    coins: 0,
    stars: 0,
    totalServes: 0,
  };
}

/** Add coins (never negative amounts via this API; murky path simply never calls it). */
export function addCoins(state: EconomyState, amount: number): void {
  if (amount <= 0) return;
  state.coins += amount;
}

export function addStars(state: EconomyState, amount: number): void {
  state.stars = Math.min(5, Math.max(0, state.stars + amount));
}

/**
 * A completed serve, priced per doc 02 §4.1:
 * drink price + tip (+1¤ if chatted before serving) + perfect bonus
 * (+2¤ when the drink is the customer's favorite).
 */
export interface ServePayout {
  recipeId: string;
  base: number;
  tip: number; // 0 or 1
  perfectBonus: number; // 0 or 2
  total: number;
}

export function payoutForServe(
  recipeId: string,
  chattedBeforeServing: boolean,
  isFavoriteRecipe: boolean,
): ServePayout {
  const recipe = getRecipe(recipeId);
  const base = recipe ? drinkPrice(recipe) : 0;
  const tip = chattedBeforeServing ? 1 : 0;
  const perfectBonus = isFavoriteRecipe ? 2 : 0;
  return { recipeId, base, tip, perfectBonus, total: base + tip + perfectBonus };
}

/** Apply a payout to state and register the serve for star progress. */
export function applyPayout(state: EconomyState, payout: ServePayout): void {
  addCoins(state, payout.total);
  state.totalServes += 1;
  updateStars(state);
}

/** Star thresholds — doc 02 §5: ★1@15 · ★2@40 · ★3@75 · ★4@120 · ★5@180 serves. */
const STAR_THRESHOLDS: readonly number[] = [15, 40, 75, 120, 180];

export function starsForServes(totalServes: number): number {
  let stars = 0;
  for (const threshold of STAR_THRESHOLDS) {
    if (totalServes >= threshold) stars += 1;
  }
  return stars;
}

export function updateStars(state: EconomyState): void {
  state.stars = Math.max(state.stars, starsForServes(state.totalServes));
}
