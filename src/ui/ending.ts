// ui/ending.ts — Day-14 run resolution overlay (Batch 4 / BUG-03).
//
// Presents the player's chosen ending as a calm CONCLUSION — never a "game
// over", never a failure or score screen, never a punishment (doc 10 §7 / P1
// Calm). A low-engagement player still receives a valid ending (the keeper
// fallback) with the same dignity as any other.
//
// Reuses the existing overlay/panel visual language (.overlay/.panel/.btn from
// main.css) — no new modal framework. UI only: it does NOT mutate the save;
// GameController wires the hooks to persist the ending + return to title.

import { STRINGS } from '../data/strings.js';
import type { EndingId } from '../narrative/story-definitions.js';
import { playOverlayEnter } from './overlay-anim.js';

export interface EndingView {
  id: EndingId;
  theme: string;
  title: string;
  body: string;
  cafeState: string;
}

export interface EndingHooks {
  /** Called when the player accepts the ending and continues (return to title). */
  onClose: () => void;
}

const ENDING_VIEWS: Record<EndingId, Omit<EndingView, 'id'>> = {
  keeper: {
    theme: STRINGS.endings.keeper.theme,
    title: STRINGS.endings.keeper.title,
    body: STRINGS.endings.keeper.body,
    cafeState: STRINGS.endings.keeper.cafeState,
  },
  builder: {
    theme: STRINGS.endings.builder.theme,
    title: STRINGS.endings.builder.title,
    body: STRINGS.endings.builder.body,
    cafeState: STRINGS.endings.builder.cafeState,
  },
  wanderer: {
    theme: STRINGS.endings.wanderer.theme,
    title: STRINGS.endings.wanderer.title,
    body: STRINGS.endings.wanderer.body,
    cafeState: STRINGS.endings.wanderer.cafeState,
  },
  community: {
    theme: STRINGS.endings.community.theme,
    title: STRINGS.endings.community.title,
    body: STRINGS.endings.community.body,
    cafeState: STRINGS.endings.community.cafeState,
  },
};

/** Resolve an ending into its player-facing view (no mutation). */
export function endingView(id: EndingId): EndingView {
  return { id, ...ENDING_VIEWS[id] };
}

/** Show the ending overlay for the resolved ending. */
export function showEnding(id: EndingId, hooks: EndingHooks): void {
  const app = document.getElementById('app');
  if (!app) throw new Error('#app element not found');

  const view = endingView(id);

  const existing = document.getElementById('ending-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'ending-overlay';
  overlay.className = 'overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', STRINGS.endings.title);

  const panel = document.createElement('div');
  panel.className = 'panel ending-panel';

  const title = document.createElement('h2');
  title.id = 'ending-title';
  title.textContent = STRINGS.endings.title;

  const theme = document.createElement('p');
  theme.className = 'note ending-theme';
  theme.textContent = view.theme;

  const heading = document.createElement('h3');
  heading.id = 'ending-heading';
  heading.className = 'ending-name';
  heading.textContent = view.title;

  const body = document.createElement('p');
  body.id = 'ending-body';
  body.className = 'letter-body';
  body.textContent = view.body;

  const sub = document.createElement('p');
  sub.className = 'note ending-cafe-state';
  sub.textContent = view.cafeState;

  const continueBtn = document.createElement('button');
  continueBtn.type = 'button';
  continueBtn.id = 'ending-continue';
  continueBtn.className = 'btn btn-primary';
  continueBtn.textContent = STRINGS.endings.continue;
  continueBtn.setAttribute('aria-label', STRINGS.endings.continue);

  const btnRow = document.createElement('div');
  btnRow.className = 'btn-row';
  btnRow.appendChild(continueBtn);

  panel.appendChild(title);
  panel.appendChild(theme);
  panel.appendChild(heading);
  panel.appendChild(body);
  panel.appendChild(sub);
  panel.appendChild(btnRow);
  overlay.appendChild(panel);
  app.appendChild(overlay);
  playOverlayEnter(overlay);

  const finish = (): void => {
    overlay.remove();
    window.removeEventListener('keydown', onKey);
    hooks.onClose();
  };

  const onKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' || e.key === 'Enter') {
      e.preventDefault?.();
      finish();
    }
  };

  continueBtn.addEventListener('click', finish);
  window.addEventListener('keydown', onKey);
}

/** True if an ending overlay is currently mounted. */
export function isEndingOpen(): boolean {
  const el = document.getElementById('ending-overlay');
  return !!el && !el.classList.contains('hidden');
}

/** Dismiss any mounted ending overlay (test/cleanup helper). */
export function closeEnding(): void {
  document.getElementById('ending-overlay')?.remove();
}
