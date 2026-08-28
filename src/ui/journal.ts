// ui/journal.ts — journal overlay (doc 02 §6): four tabs, auto-filling.
// Recipes (known cards + hinted riddle cards) · Regulars (portrait, learned
// favorite via flags.learned_prefs, hearts 0–5, one-liner) · Town (sketch +
// lore scraps) · Letters (archive from save.letters). Styling matches the
// settings/recap panels (.overlay/.panel, role=dialog, aria-modal); Esc/X close
// (doc 05 §4). Hearts live ONLY here — never on the HUD bar (doc 05 §2).

import { STRINGS, format } from '../data/strings.js';
import { recipeToView } from '../data/recipes.js';
import { portraitSprite } from '../render/images.js';
import { CHARACTERS, FAVORITES } from '../sim/customers.js';
import type { RegularId } from '../sim/customers.js';
import { displayedHearts } from '../sim/hearts.js';
import type { HeartLedger } from '../sim/hearts.js';
import type { SaveData } from '../save/validate.js';
import { playOverlayEnter } from './overlay-anim.js';

export interface JournalHints {
  /** recipeId → riddle copy key suffix under journal.riddles (strings.json). */
  hintedRecipes: readonly string[];
}

export interface JournalHooks {
  onClose: () => void;
}

const HEARTS_MAX = 5;

let hooksRef: JournalHooks | null = null;
let escHandler: ((e: KeyboardEvent) => void) | null = null;
function heartString(filled: number): string {
  return '♥'.repeat(Math.max(0, Math.min(HEARTS_MAX, filled))) + '♡'.repeat(HEARTS_MAX - filled);
}

function ensureOverlay(): HTMLDivElement {
  const existing = document.getElementById('journal-overlay');
  if (existing) return existing as HTMLDivElement;

  const app = document.getElementById('app');
  if (!app) throw new Error('#app element not found');

  const overlay = document.createElement('div');
  overlay.id = 'journal-overlay';
  overlay.className = 'overlay hidden';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', STRINGS.journal.title);

  const panel = document.createElement('div');
  panel.className = 'panel journal-panel';

  const closeX = document.createElement('button');
  closeX.type = 'button';
  closeX.className = 'panel-close';
  closeX.setAttribute('aria-label', STRINGS.settings.close);
  closeX.textContent = '×';
  closeX.addEventListener('click', () => hooksRef?.onClose());

  const title = document.createElement('h2');
  title.textContent = STRINGS.journal.title;

  const tabRow = document.createElement('div');
  tabRow.className = 'option-row';
  tabRow.id = 'journal-tabs';

  const content = document.createElement('div');
  content.id = 'journal-content';

  panel.appendChild(closeX);
  panel.appendChild(title);
  panel.appendChild(tabRow);
  panel.appendChild(content);
  overlay.appendChild(panel);
  app.appendChild(overlay);

  escHandler = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && !overlay.classList.contains('hidden')) hooksRef?.onClose();
  };
  window.addEventListener('keydown', escHandler);

  return overlay;
}

/** Open the journal on `tab`. Rebuilds content from current state each time. */
export function openJournal(
  save: SaveData,
  hearts: HeartLedger,
  hints: JournalHints,
  hooks: JournalHooks,
): void {
  openJournalInternal(save, hearts, hints, hooks, 'recipes', null);
}

/**
 * Juice item 5 (doc 04 §3): the journal "opens itself" to the new entry —
 * discovery moments call this with the recipe id; the Recipes tab renders with
 * the new card highlighted and given a page-turn entrance (CSS class; skipped
 * under reduced motion where the highlight alone remains).
 */
export function openJournalToRecipe(
  save: SaveData,
  hearts: HeartLedger,
  hints: JournalHints,
  hooks: JournalHooks,
  recipeId: string,
): void {
  openJournalInternal(save, hearts, hints, hooks, 'recipes', recipeId);
}

function openJournalInternal(
  save: SaveData,
  hearts: HeartLedger,
  hints: JournalHints,
  hooks: JournalHooks,
  tab: TabId,
  highlightRecipeId: string | null,
): void {
  hooksRef = hooks;
  const overlay = ensureOverlay();
  renderTabs(overlay, save, hearts, hints);
  renderTab(overlay, tab, save, hearts, hints, highlightRecipeId);
  overlay.classList.remove('hidden');
  playOverlayEnter(overlay);
}

export function closeJournal(): void {
  document.getElementById('journal-overlay')?.classList.add('hidden');
}

export function isJournalOpen(): boolean {
  const el = document.getElementById('journal-overlay');
  return !!el && !el.classList.contains('hidden');
}

type TabId = 'recipes' | 'regulars' | 'town' | 'letters';

const TAB_IDS: readonly { id: TabId; label: string }[] = [
  { id: 'recipes', label: STRINGS.journal.tabRecipes },
  { id: 'regulars', label: STRINGS.journal.tabRegulars },
  { id: 'town', label: STRINGS.journal.tabTown },
  { id: 'letters', label: STRINGS.journal.tabLetters },
];

function renderTabs(
  overlay: HTMLElement,
  save: SaveData,
  hearts: HeartLedger,
  hints: JournalHints,
): void {
  const tabRow = overlay.querySelector<HTMLDivElement>('#journal-tabs');
  if (!tabRow) return;
  tabRow.replaceChildren();
  for (const tab of TAB_IDS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.textContent = tab.label;
    b.addEventListener('click', () => {
      renderTabs(overlay, save, hearts, hints);
      renderTab(overlay, tab.id, save, hearts, hints);
    });
    tabRow.appendChild(b);
  }
}

function renderTab(
  overlay: HTMLElement,
  tab: TabId,
  save: SaveData,
  hearts: HeartLedger,
  hints: JournalHints,
  highlightRecipeId: string | null = null,
): void {
  const content = overlay.querySelector<HTMLDivElement>('#journal-content');
  if (!content) return;
  content.replaceChildren();

  // Mark the active chip by rebuilding the row with a selection highlight.
  const tabRow = overlay.querySelector<HTMLDivElement>('#journal-tabs');
  if (tabRow) {
    const chips = tabRow.querySelectorAll<HTMLButtonElement>('button.chip');
    TAB_IDS.forEach((t, i) => {
      chips[i]?.classList.toggle('chip-selected', t.id === tab);
    });
  }

  switch (tab) {
    case 'recipes':
      renderRecipes(content, save, hints, highlightRecipeId);
      break;
    case 'regulars':
      renderRegulars(content, save, hearts);
      break;
    case 'town':
      renderTown(content);
      break;
    case 'letters':
      renderLetters(content, save);
      break;
  }
}

// ---- Recipes tab -------------------------------------------------------------

/** Riddle copy per hinted-but-undiscovered recipe id (doc 02 §2.2 hint economy). */
const RIDDLE_BODIES: Readonly<Record<string, string>> = {
  R004: 'service.taughtR004Body',
  R005: 'service.taughtR005Body',
  R006: 'service.taughtR006Body',
  R007: 'service.taughtR007Body',
};

function riddleBodyFor(recipeId: string): string {
  const key = RIDDLE_BODIES[recipeId];
  if (!key) return '';
  // Riddles reuse the teach-beat copy minus its resolution sentence; writers
  // own the strings — code only maps ids to keys.
  return resolveServiceString(key);
}

function resolveServiceString(key: string): string {
  const table: Record<string, string> = {
    'service.taughtR004Body': STRINGS.service.taughtR004Body,
    'service.taughtR005Body': STRINGS.service.taughtR005Body,
    'service.taughtR006Body': STRINGS.service.taughtR006Body,
    'service.taughtR007Body': STRINGS.service.taughtR007Body,
  };
  return table[key] ?? '';
}

function renderRecipes(
  content: HTMLElement,
  save: SaveData,
  hints: JournalHints,
  highlightRecipeId: string | null = null,
): void {
  for (const recipeId of hints.hintedRecipes) {
    const known = save.flags.discovered_recipes.includes(recipeId);
    const view = recipeToView(recipeId);
    if (!view) continue;

    const card = document.createElement('div');
    card.className = 'journal-card';
    card.setAttribute('data-recipe-id', recipeId);

    // New-discovery entrance: page-turn animation + persistent highlight ring.
    // Reduced motion collapses the animation to the static highlight (CSS).
    if (recipeId === highlightRecipeId) {
      card.classList.add('journal-card-new');
      card.classList.add('page-turn');
    }

    const name = document.createElement('p');
    name.className = 'journal-card-title';
    const kindLabel = known ? STRINGS.journal.knownCard : STRINGS.journal.riddleCard;
    name.textContent = `${view.name} · ${kindLabel}`;

    const body = document.createElement('p');
    body.className = 'note';
    body.textContent = known ? view.combo : `??? — ${riddleBodyFor(recipeId)}`;

    card.appendChild(name);
    card.appendChild(body);
    content.appendChild(card);
  }

  if (content.children.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'note';
    empty.textContent = STRINGS.recap.noDiscoveries;
    content.appendChild(empty);
  }
}

// ---- Regulars tab ------------------------------------------------------------

function renderRegulars(content: HTMLElement, save: SaveData, hearts: HeartLedger): void {
  for (const char of CHARACTERS) {
    const learned = save.flags.learned_prefs.includes(char.favoriteRecipeId + ':' + char.id) ||
      save.flags.learned_prefs.includes(char.id);
    const favoriteName = STRINGS.recipes[(char.favoriteRecipeId.toLowerCase() as 'r001')].name;

    const card = document.createElement('div');
    card.className = 'journal-card journal-regular';
    card.setAttribute('data-character-id', char.id);

    const imgWrap = document.createElement('div');
    imgWrap.className = 'journal-portrait';
    const portrait = portraitSprite(char.id);
    if (portrait && portrait.complete && portrait.naturalWidth > 0) {
      imgWrap.appendChild(portrait);
    }

    const textCol = document.createElement('div');
    textCol.className = 'journal-regular-text';

    const name = document.createElement('p');
    name.className = 'journal-card-title';
    name.textContent = STRINGS.cast[char.id].name;

    const desc = document.createElement('p');
    desc.className = 'note';
    desc.textContent = STRINGS.cast[char.id].desc;

    const fav = document.createElement('p');
    fav.className = 'note';
    fav.textContent = learned
      ? format(STRINGS.journal.favoriteKnownTemplate, { drink: favoriteName })
      : STRINGS.journal.favoriteUnknown;

    const heartLine = document.createElement('p');
    heartLine.className = 'journal-hearts';
    heartLine.setAttribute('aria-label', `${STRINGS.journal.heartsLabel}: ${displayedHearts(hearts, char.id)}`);
    heartLine.textContent = `${STRINGS.journal.heartsLabel}: ${heartString(displayedHearts(hearts, char.id))}`;

    textCol.appendChild(name);
    textCol.appendChild(desc);
    textCol.appendChild(fav);
    textCol.appendChild(heartLine);

    card.appendChild(imgWrap);
    card.appendChild(textCol);
    content.appendChild(card);
  }
}

// ---- Town tab ----------------------------------------------------------------

function renderTown(content: HTMLElement): void {
  const sketch = document.createElement('p');
  sketch.className = 'letter-body';
  sketch.textContent = STRINGS.journal.townSketch;
  content.appendChild(sketch);

  for (const scrap of STRINGS.journal.loreScraps) {
    const p = document.createElement('p');
    p.className = 'note';
    p.textContent = scrap;
    content.appendChild(p);
  }
}

// ---- Letters tab -------------------------------------------------------------

function renderLetters(content: HTMLElement, save: SaveData): void {
  if (save.letters.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'note';
    empty.textContent = STRINGS.recap.noDiscoveries;
    content.appendChild(empty);
    return;
  }
  for (const letterId of save.letters) {
    const entry = STRINGS.letters[letterId as keyof typeof STRINGS.letters];
    if (!entry) continue;
    const card = document.createElement('div');
    card.className = 'journal-card';
    card.setAttribute('data-letter-id', letterId);

    const title = document.createElement('p');
    title.className = 'journal-card-title';
    title.textContent = entry.title;

    const body = document.createElement('p');
    body.className = 'note letter-body';
    body.textContent = entry.body;

    card.appendChild(title);
    card.appendChild(body);
    content.appendChild(card);
  }
}
