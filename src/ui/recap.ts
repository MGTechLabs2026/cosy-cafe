// ui/recap.ts — evening recap modal (doc 05 §3.3): coin count-up, discoveries,
// hearts placeholder, Continue → autosave already fired by controller.

import { STRINGS, format } from '../data/strings.js';
import { CountUp } from '../render/tween.js';

export interface RecapData {
  day: number;
  coinsEarned: number;
  drinksServed: number;
  newRecipeIds: readonly string[];
  /** Names of characters who gained heart points today (recap line, doc 05 §3.3). */
  heartsGainedBy: readonly string[];
}

let countUp: CountUp | null = null;
let rafId: number | null = null;
let escHandler: ((e: KeyboardEvent) => void) | null = null;

/**
 * Show the evening recap. `onEsc` (optional) handles the accessibility
 * requirement that EVERY overlay closes with Escape (doc 05 §4/§6); the
 * controller passes a no-op-safe path that continues the evening.
 */
export function showRecap(
  data: RecapData,
  reducedMotion: boolean,
  onContinue: () => void,
  onShop?: () => void,
  onEsc?: () => void,
): void {
  const app = document.getElementById('app');
  if (!app) throw new Error('#app element not found');
  hideRecap();

  const overlay = document.createElement('div');
  overlay.id = 'recap-overlay';
  overlay.className = 'overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', format(STRINGS.recap.title, { day: data.day }));

  const panel = document.createElement('div');
  panel.className = 'panel recap-panel';

  const title = document.createElement('h2');
  title.textContent = format(STRINGS.recap.title, { day: data.day });

  const coinsLabel = document.createElement('p');
  coinsLabel.className = 'recap-coins-label';
  coinsLabel.textContent = STRINGS.recap.coinsEarned;

  const coinsValue = document.createElement('p');
  coinsValue.className = 'recap-coins';
  // Count-up animation (doc 05 §4); reduced motion snaps instantly.
  countUp = new CountUp(0, 30);
  countUp.setTarget(data.coinsEarned, reducedMotion);
  coinsValue.textContent = format(STRINGS.hud.coinsTemplate, { amount: countUp.value });

  const servedLine = document.createElement('p');
  servedLine.textContent = format(STRINGS.recap.drinksServed, { count: data.drinksServed });

  const discTitle = document.createElement('h3');
  discTitle.textContent = STRINGS.recap.discoveries;
  const discList = document.createElement('ul');
  discList.className = 'recap-discoveries';
  if (data.newRecipeIds.length === 0) {
    const li = document.createElement('li');
    li.textContent = STRINGS.recap.noDiscoveries;
    li.className = 'note';
    discList.appendChild(li);
  } else {
    for (const id of data.newRecipeIds) {
      const li = document.createElement('li');
      li.setAttribute('data-recipe-id', id);
      li.textContent = id; // replaced with display name by controller before show
      discList.appendChild(li);
    }
  }

  // Hearts gained today (doc 05 §3.3 recap: "hearts gained").
  let heartsLine: HTMLParagraphElement | null = null;
  if (data.heartsGainedBy.length > 0) {
    heartsLine = document.createElement('p');
    heartsLine.className = 'note recap-hearts';
    heartsLine.textContent = data.heartsGainedBy
      .map((name) => format(STRINGS.recap.heartsGained, { name }))
      .join(' ');
  }

  // Shop entry point (doc 05 §3.3): recap is where upgrades get browsed.
  const shopBtn = document.createElement('button');
  shopBtn.type = 'button';
  shopBtn.className = 'btn btn-secondary';
  shopBtn.id = 'recap-shop';
  shopBtn.textContent = STRINGS.recap.shopButton;
  shopBtn.addEventListener('click', () => onShop?.());

  const savedNote = document.createElement('p');
  savedNote.className = 'note recap-saved';
  savedNote.textContent = STRINGS.recap.savedNote;

  const continueBtn = document.createElement('button');
  continueBtn.type = 'button';
  continueBtn.className = 'btn btn-primary';
  continueBtn.id = 'recap-continue';
  continueBtn.textContent = STRINGS.recap.continueButton;
  continueBtn.addEventListener('click', () => {
    hideRecap();
    onContinue();
  });

  panel.appendChild(title);
  panel.appendChild(coinsLabel);
  panel.appendChild(coinsValue);
  panel.appendChild(servedLine);
  panel.appendChild(discTitle);
  panel.appendChild(discList);
  if (heartsLine) panel.appendChild(heartsLine);
  panel.appendChild(shopBtn);
  panel.appendChild(savedNote);
  panel.appendChild(continueBtn);
  overlay.appendChild(panel);
  app.appendChild(overlay);
  continueBtn.focus();

  const tick = (): void => {
    if (!countUp) return;
    countUp.tick(1 / 30);
    coinsValue.textContent = format(STRINGS.hud.coinsTemplate, { amount: countUp.value });
    if (!countUp.settled) rafId = window.setTimeout(tick, 33) as unknown as number;
  };
  if (!countUp.settled) tick();

  // Esc closes every overlay (doc 05 §4/§6). The recap is the autosave point,
  // so Esc routes through onEsc when provided, else plain Continue.
  escHandler = (e: KeyboardEvent): void => {
    if (e.key !== 'Escape') return;
    if (onEsc) onEsc();
    else continueBtn.click();
  };
  window.addEventListener('keydown', escHandler);
}

export function hideRecap(): void {
  if (rafId !== null) {
    window.clearTimeout(rafId);
    rafId = null;
  }
  countUp = null;
  if (escHandler) {
    window.removeEventListener('keydown', escHandler);
    escHandler = null;
  }
  document.getElementById('recap-overlay')?.remove();
}

export function isRecapVisible(): boolean {
  return !!document.getElementById('recap-overlay');
}
