// ui/cafe-dom.ts — café DOM plumbing extracted from the old monolithic
// ui/game.ts (orchestration refactor, doc 08 §3.5). Presentation ONLY:
// element construction, banner/toast/action-bar rendering, canvas hit-testing.
// Every gameplay decision stays in the controllers; this module just draws
// DOM and reports clicks back through the injected handlers.

import { STRINGS, format } from '../data/strings.js';
import { recipeToView } from '../data/recipes.js';
import { DOOR_SIGN_RECT, getBubbleRect, getMopsHitRect } from '../render/scene.js';

/** Handlers the café screen needs from the orchestration layer. */
export interface CafeDomHandlers {
  /** Kettle button / order-bubble clicks. */
  onOpenKettle: () => void;
  /** Quick journal button (action bar). */
  onOpenJournal: () => void;
  /** Quick settings button (action bar) — routed to the bootstrap overlay. */
  onOpenSettings: () => void;
  /** Door-sign click while phase = prep. */
  onOpenDoors: () => void;
  /** Door-sign click while phase = service (and nobody unserved waits). */
  onTryCloseDay: () => void;
  /** Mops click — pet the cat. */
  onMopsClick: () => void;
}

export interface CafeDomRefs {
  bannerEl: HTMLElement;
  actionBarEl: HTMLElement;
  toastEl: HTMLElement;
}

let toastTimer: number | null = null;

/**
 * Build the café DOM layer (morning banner, action bar, toast host) and bind
 * canvas click/hover routing. Verbatim behavior from the former game.ts
 * buildDomLayer() + canvas handlers.
 */
export function setupCafeDom(
  canvasEl: HTMLCanvasElement,
  handlers: CafeDomHandlers,
): CafeDomRefs {
  const app = document.getElementById('app');
  if (!app) throw new Error('#app element not found');

  const bannerEl = document.createElement('div');
  bannerEl.id = 'morning-banner';
  bannerEl.className = 'banner hidden';

  const actionBarEl = document.createElement('div');
  actionBarEl.id = 'action-bar';
  actionBarEl.className = 'action-bar hidden';
  actionBarEl.setAttribute('role', 'toolbar');
  actionBarEl.setAttribute('aria-label', 'Café actions');

  const toastEl = document.createElement('div');
  toastEl.id = 'toast';
  toastEl.className = 'toast hidden';
  toastEl.setAttribute('aria-live', 'polite');

  const kettleBtn = document.createElement('button');
  kettleBtn.type = 'button';
  kettleBtn.id = 'btn-kettle';
  kettleBtn.className = 'btn btn-primary action-kettle';
  kettleBtn.textContent = STRINGS.kettle.title;
  kettleBtn.addEventListener('click', () => {
    handlers.onOpenKettle();
  });

  const journalBtn = document.createElement('button');
  journalBtn.type = 'button';
  journalBtn.id = 'btn-journal-quick';
  journalBtn.className = 'btn btn-secondary';
  journalBtn.textContent = STRINGS.journal.title;
  journalBtn.addEventListener('click', () => {
    handlers.onOpenJournal();
  });

  const settingsBtn = document.createElement('button');
  settingsBtn.type = 'button';
  settingsBtn.id = 'btn-settings-quick';
  settingsBtn.className = 'btn btn-secondary';
  settingsBtn.textContent = STRINGS.settings.title;
  settingsBtn.addEventListener('click', handlers.onOpenSettings);

  actionBarEl.appendChild(kettleBtn);
  actionBarEl.appendChild(journalBtn);
  actionBarEl.appendChild(settingsBtn);

  // Click routing for the diegetic door sign drawn on the canvas.
  canvasEl.addEventListener('click', (e) => handleCanvasClick(e, canvasEl, handlers));
  canvasEl.addEventListener('mousemove', (e) => handleCanvasHover(e, canvasEl));

  app.appendChild(bannerEl);
  app.appendChild(actionBarEl);
  app.appendChild(toastEl);

  return { bannerEl, actionBarEl, toastEl };
}

function canvasPoint(e: MouseEvent, canvasEl: HTMLCanvasElement): { x: number; y: number } | null {
  const rect = canvasEl.getBoundingClientRect();
  const scaleX = canvasEl.width / rect.width;
  const scaleY = canvasEl.height / rect.height;
  return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
}

/** True when the point sits inside an interactive canvas region (door sign,
 * customer order bubble, Mops). */
function hitsInteractive(p: { x: number; y: number } | null): boolean {
  if (!p) return false;
  const hit = DOOR_SIGN_RECT;
  if (p.x >= hit.x && p.x <= hit.x + hit.w && p.y >= hit.y && p.y <= hit.y + hit.h) return true;
  const bubble = getBubbleRect();
  if (bubble) {
    return p.x >= bubble.x && p.x <= bubble.x + bubble.w && p.y >= bubble.y && p.y <= bubble.y + bubble.h;
  }
  const mops = getMopsHitRect();
  if (mops) {
    return p.x >= mops.x && p.x <= mops.x + mops.w && p.y >= mops.y && p.y <= mops.y + mops.h;
  }
  return false;
}

function handleCanvasClick(
  e: MouseEvent,
  canvasEl: HTMLCanvasElement,
  handlers: CafeDomHandlers,
): void {
  const p = canvasPoint(e, canvasEl);
  if (!hitsInteractive(p)) return;
  // Mops click → pet the cat.
  const mops = getMopsHitRect();
  if (mops && p && p.x >= mops.x && p.x <= mops.x + mops.w && p.y >= mops.y && p.y <= mops.y + mops.h) {
    handlers.onMopsClick();
    return;
  }
  // Bubble click → open the kettle to serve this order.
  const bubble = getBubbleRect();
  if (bubble && p && p.x >= bubble.x && p.x <= bubble.x + bubble.w && p.y >= bubble.y && p.y <= bubble.y + bubble.h) {
    handlers.onOpenKettle();
    return;
  }
  // Door sign: phase-aware. The controllers decide validity; here we only
  // forward the two door intents (same split as the old inline handler).
  if (currentPhaseProvider() === 'prep') handlers.onOpenDoors();
  else if (currentPhaseProvider() === 'service') handlers.onTryCloseDay();
}

/**
 * The old handler checked phase + active-customer state inline; the phase now
 * lives in the DayController. The bootstrap injects a phase reader before any
 * click can fire (setCafeDomPhaseProvider), keeping this module state-free.
 */
let phaseReader: () => 'prep' | 'service' | 'recap' = () => 'prep';

export function setCafeDomPhaseProvider(read: () => 'prep' | 'service' | 'recap'): void {
  phaseReader = read;
}

function currentPhaseProvider(): 'prep' | 'service' | 'recap' {
  return phaseReader();
}

// Pointer feedback (doc 05 §4): finger cursor over diegetic clickables.
function handleCanvasHover(e: MouseEvent, canvasEl: HTMLCanvasElement): void {
  canvasEl.style.cursor = hitsInteractive(canvasPoint(e, canvasEl)) ? 'pointer' : '';
}

export function showToast(ref: HTMLElement, message: string, ms = 3200): void {
  ref.textContent = message;
  ref.classList.remove('hidden');
  if (toastTimer !== null) window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    ref.classList.add('hidden');
    toastTimer = null;
  }, ms);
}

/** Morning banner (doc 05 §2): day title, shelf line, open/sleep buttons. */
export function showMorningBanner(
  ref: HTMLElement,
  opts: {
    day: number;
    shelfLine: string;
    onOpenDoors: () => void;
    onSleepIn: () => void;
  },
): void {
  ref.classList.remove('hidden');
  ref.replaceChildren();

  const title = document.createElement('p');
  title.className = 'banner-title';
  title.textContent = format(STRINGS.morning.prepTitle, { day: opts.day });

  const shelfLine = document.createElement('p');
  shelfLine.className = 'note shelf-line';
  shelfLine.textContent = `${STRINGS.shelf.title}: ${opts.shelfLine}`;

  const row = document.createElement('div');
  row.className = 'btn-row';

  const openBtn = document.createElement('button');
  openBtn.type = 'button';
  openBtn.id = 'btn-open-door';
  openBtn.className = 'btn btn-primary';
  openBtn.textContent = STRINGS.morning.openDoors;
  openBtn.addEventListener('click', opts.onOpenDoors);

  // "Sleep in" — skip the day entirely (doc 02 §1), one click from morning.
  const sleepBtn = document.createElement('button');
  sleepBtn.type = 'button';
  sleepBtn.className = 'btn btn-secondary';
  sleepBtn.textContent = STRINGS.morning.sleepIn;
  sleepBtn.addEventListener('click', opts.onSleepIn);

  const hint = document.createElement('p');
  hint.className = 'note';
  hint.textContent = STRINGS.tutorial.kettleGlint;

  row.appendChild(openBtn);
  row.appendChild(sleepBtn);
  ref.appendChild(title);
  ref.appendChild(shelfLine);
  ref.appendChild(row);
  ref.appendChild(hint);
}

export function hideBanner(ref: HTMLElement): void {
  ref.classList.add('hidden');
}

/** Gentle close suggestion once the queue is empty (was ensureCloseButton). */
export function ensureCloseDoorButton(actionBarEl: HTMLElement, onClick: () => void): void {
  if (document.getElementById('btn-close-door')) return;
  const b = document.createElement('button');
  b.type = 'button';
  b.id = 'btn-close-door';
  b.className = 'btn btn-secondary';
  b.textContent = `${STRINGS.service.closeDoor} (${STRINGS.service.closeHint})`;
  b.addEventListener('click', onClick);
  actionBarEl.appendChild(b);
}

/**
 * Fill recap discovery names after mount (display names come from strings).
 * Moved verbatim from the old finishDay() tail.
 */
export function fillRecapRecipeNames(): void {
  for (const li of document.querySelectorAll('#recap-overlay li[data-recipe-id]')) {
    const id = li.getAttribute('data-recipe-id');
    const view = id ? recipeToView(id) : null;
    if (view) li.textContent = `${view.name} — ${view.combo}`;
  }
}
