// sim/hearts.ts — doc 02 §5 (hearts 0–5, capped +1/day) + doc 03 §5.
// Pure logic, no DOM/Canvas imports. Hearts are tracked as FLOAT heart POINTS;
// the displayed heart count is floor(points). Travelers never earn hearts.
//
// REPORTED VALUES (overseer asked to note them):
//   favorite serve +1.0 · chat +0.25 · correct non-favorite serve +0.1

import type { CharacterId } from './customers.js';

export const HEART_FAVORITE_SERVE = 1.0;
export const HEART_CHAT = 0.25;
export const HEART_CORRECT_SERVE = 0.1;

/** Daily accumulation cap per character (doc: capped at +1 heart/day). */
export const HEART_DAILY_CAP = 1.0;

/** Displayed hearts are floor(points), clamped to 0–5 (doc 03 §4). */
export const HEARTS_MAX_DISPLAY = 5;

/** Floating-point slack for cap comparisons (0.25 steps accumulate exactly in
 * binary? no — so compare against cap with a tiny epsilon). */
const EPSILON = 1e-9;

export interface HeartLedger {
  /** charId → lifetime float points (displayed hearts = floor). */
  points: Record<string, number>;
  /** charId → points gained TODAY (reset each morning by the controller). */
  gainedToday: Record<string, number>;
}

export function createHeartLedger(): HeartLedger {
  return { points: {}, gainedToday: {} };
}

function pointsFor(ledger: HeartLedger, charId: CharacterId): number {
  return ledger.points[charId] ?? 0;
}

function gainedTodayFor(ledger: HeartLedger, charId: CharacterId): number {
  return ledger.gainedToday[charId] ?? 0;
}

/** Displayed hearts (0–5) for a character. */
export function displayedHearts(ledger: HeartLedger, charId: CharacterId): number {
  return Math.min(HEARTS_MAX_DISPLAY, Math.floor(pointsFor(ledger, charId) + EPSILON));
}

/**
 * Award `gain` points to a character, respecting the daily cap. Returns the
 * points ACTUALLY granted (0 when the day's cap is already spent) so the
 * controller can show accurate feedback.
 */
export function awardHeartPoints(
  ledger: HeartLedger,
  charId: CharacterId,
  gain: number,
): number {
  if (gain <= 0) return 0;
  const room = Math.max(0, HEART_DAILY_CAP - gainedTodayFor(ledger, charId));
  const granted = Math.min(gain, room);
  if (granted <= EPSILON) return 0;
  ledger.points[charId] = pointsFor(ledger, charId) + granted;
  ledger.gainedToday[charId] = gainedTodayFor(ledger, charId) + granted;
  return granted;
}

/** Favorite serve (+1.0, capped). */
export function awardFavoriteServe(ledger: HeartLedger, charId: CharacterId): number {
  return awardHeartPoints(ledger, charId, HEART_FAVORITE_SERVE);
}

/** Correct non-favorite serve (+0.1, capped). */
export function awardCorrectServe(ledger: HeartLedger, charId: CharacterId): number {
  return awardHeartPoints(ledger, charId, HEART_CORRECT_SERVE);
}

/** Chat (+0.25, capped). */
export function awardChat(ledger: HeartLedger, charId: CharacterId): number {
  return awardHeartPoints(ledger, charId, HEART_CHAT);
}

/** Morning reset of the daily counters (doc 05: reset each morning). */
export function resetHeartDay(ledger: HeartLedger): void {
  ledger.gainedToday = {};
}

/** Persist/restore through the save blob (schema v2 fields). */
export function heartsToSave(ledger: HeartLedger): {
  hearts: Record<string, number>;
  heart_points_today: Record<string, number>;
} {
  return {
    hearts: { ...ledger.points },
    heart_points_today: { ...ledger.gainedToday },
  };
}

export function heartsFromSave(
  hearts: Record<string, number>,
  heartPointsToday: Record<string, number>,
): HeartLedger {
  return { points: { ...hearts }, gainedToday: { ...heartPointsToday } };
}
