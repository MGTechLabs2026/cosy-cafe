// HUD — DOM top bar per doc 05 §2
// Day counter, coins, stars, settings gear, journal button.
// All text comes from strings.json keys; no literals here.

import { STRINGS, format } from '../data/strings.js';
import type { Strings } from '../data/strings.d';

const MAX_STARS = 5;

export interface HudState {
  day: number;
  coins: number;
  stars: number; // 0–5
}

let hudEl: HTMLElement | null = null;
let dayEl: HTMLElement | null = null;
let coinsEl: HTMLElement | null = null;
let starsEl: HTMLElement | null = null;

function starString(filled: number): string {
  const full = Math.max(0, Math.min(MAX_STARS, Math.floor(filled)));
  return STRINGS.hud.starsFull.repeat(full) + STRINGS.hud.starsEmpty.repeat(MAX_STARS - full);
}

/** Grab HUD elements and bind stub buttons. Call once on entering the café. */
export function initHUD(onSettings?: () => void, onJournal?: () => void): void {
  hudEl = document.getElementById('hud');
  dayEl = document.getElementById('hud-day');
  coinsEl = document.getElementById('hud-coins');
  starsEl = document.getElementById('hud-stars');

  if (!hudEl || !dayEl || !coinsEl || !starsEl) {
    throw new Error('HUD elements not found in DOM');
  }

  const settingsBtn = document.getElementById('hud-settings') as HTMLButtonElement | null;
  const journalBtn = document.getElementById('hud-journal') as HTMLButtonElement | null;
  settingsBtn?.setAttribute('aria-label', STRINGS.hud.settingsLabel);
  journalBtn?.setAttribute('aria-label', STRINGS.hud.journalLabel);

  // M0 stubs — overlays arrive in later milestones.
  settingsBtn?.addEventListener('click', () => onSettings?.());
  journalBtn?.addEventListener('click', () => onJournal?.());
}

export function showHUD(): void {
  hudEl?.classList.add('visible');
}

export function hideHUD(): void {
  hudEl?.classList.remove('visible');
}

/** Push new values into the bar. Only provided fields update. */
export function updateHUD(state: Partial<HudState>): void {
  if (state.day !== undefined && dayEl) {
    dayEl.textContent = format(STRINGS.hud.dayTemplate, { day: state.day });
  }
  if (state.coins !== undefined && coinsEl) {
    coinsEl.textContent = format(STRINGS.hud.coinsTemplate, { amount: state.coins });
    coinsEl.setAttribute('aria-label', format(STRINGS.hud.coinsTemplate, { amount: state.coins }));
  }
  if (state.stars !== undefined && starsEl) {
    starsEl.textContent = starString(state.stars);
  }
}
