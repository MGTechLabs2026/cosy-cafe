// ui/textsize.ts — text-size setting (doc 05 §6): body scale 100% / 125% / 150%.
// Applied as a font-size percentage on <html>, so every rem-based DOM panel
// (dialogue, journal, recap, kettle, shop, settings) scales together. The
// canvas world is untouched. Pure module: safe to unit-test in node.
//
// This module also owns the `reduced-motion` class on <html>: the in-game
// toggle must kill every CSS animation/transition exactly like the OS
// `prefers-reduced-motion` media query does (doc 04 §1.5, doc 05 §6).

import type { SaveData } from '../save/validate.js';
import { TEXT_SIZES } from '../save/validate.js';

export function isValidTextSize(value: number): boolean {
  return TEXT_SIZES.includes(value);
}

/** Clamp arbitrary input to the nearest allowed step (defensive). */
export function coerceTextSize(value: unknown): number {
  if (typeof value === 'number' && isValidTextSize(value)) return value;
  return 100;
}

/** Read the text size from a settings blob (missing/invalid → 100). */
export function textSizeFromSettings(settings: SaveData['settings'] | undefined): number {
  if (!settings) return 100;
  return coerceTextSize((settings as { text_size?: number }).text_size);
}

/**
 * Apply the accessibility DOM effects: text-size scale on <html> font-size and
 * the reduced-motion class. Returns the applied size so tests can assert
 * without a DOM.
 */
export function applyTextSize(percent: number): number {
  const pct = coerceTextSize(percent);
  if (typeof document !== 'undefined' && document.documentElement) {
    document.documentElement.style.fontSize = `${pct}%`;
  }
  return pct;
}

/** Mirror the in-game reduced-motion toggle onto <html> (CSS hooks off it). */
export function applyReducedMotionClass(reducedMotion: boolean): void {
  if (typeof document !== 'undefined' && document.documentElement) {
    document.documentElement.classList.toggle('reduced-motion', reducedMotion);
  }
}
