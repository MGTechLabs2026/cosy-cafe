// Integer scaling utilities — doc 08 §3.2
// Backbuffer is 480×270; composited via CSS transform: scale(k), k = largest
// integer ≤ available scale, DPR-aware. Keeps pixels crisp and avoids shimmer.

export const GAME_WIDTH = 480;
export const GAME_HEIGHT = 270;

function safeScale(scale: number): number {
  return Number.isFinite(scale) && scale >= 1 ? Math.floor(scale) : 1;
}

/**
 * Largest integer scale factor k such that GAME_WIDTH*k ≤ availW and
 * GAME_HEIGHT*k ≤ availH. Never below 1.
 */
export function computeIntegerScale(availW: number, availH: number): number {
  if (!Number.isFinite(availW) || !Number.isFinite(availH)) return 1;
  if (availW <= 0 || availH <= 0) return 1;
  return Math.max(1, Math.floor(Math.min(availW / GAME_WIDTH, availH / GAME_HEIGHT)));
}

/**
 * CSS transform string for the backbuffer at scale k.
 * transform-origin top-left so layout math stays trivial.
 */
export function transformForScale(scale: number): string {
  return `scale(${safeScale(scale)})`;
}

/** Display size of the scaled canvas — wrapper sizing / centering math. */
export function displaySize(scale: number): { width: number; height: number } {
  const k = safeScale(scale);
  return { width: GAME_WIDTH * k, height: GAME_HEIGHT * k };
}
