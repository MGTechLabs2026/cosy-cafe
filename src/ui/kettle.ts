// ui/kettle.ts — kettle panel (doc 05 §2): base choice → up to 3 ingredient
// slots → finish toggle → BREW. One screen, no sub-screens. Shows the last-made
// drink as a repeat shortcut. All copy from strings.json.
//
// M2 additions (doc 02 §4.2): Second-kettle upgrade adds a Kettle A/B tab row —
// each slot keeps its OWN draft and BREW applies to the active slot. The
// Coffee-machine upgrade adds `coffee` to the base row. Ingredient chips list
// the whole shelf with owned counts, disabled at zero (doc 05 §2). Blocked
// brews (out of stock, shelf semantics) surface as the panel's inline note.

import { STRINGS } from '../data/strings.js';
import { recipeToView } from '../data/recipes.js';
import type { BaseType, BrewInput, FinishType, IngredientType } from '../sim/brewing.js';
import { getRecipe } from '../sim/brewing.js';

export interface KettleHooks {
  onBrew: (input: BrewInput) => void;
  onClose: () => void;
}

export interface KettleState {
  knownRecipeIds: readonly string[];
  lastBrew: BrewInput | null;
  inventory: Record<string, number>;
  /** Full shelf listing — chips show owned counts, disabled at 0. */
  ingredientChoices: readonly IngredientType[];
  /** Bases currently usable (coffee joins after the machine upgrade). */
  availableBases: readonly BaseType[];
  /** Second-kettle upgrade owned → show the A/B tab row. */
  hasSecondKettle: boolean;
  outOfStockNoteVisible: boolean;
  /** Inline block reason from the last attempted brew (cleared on success). */
  brewBlockMessage: string | null;
}

type KettleSlotId = 'A' | 'B';
const KETTLE_SLOTS: readonly KettleSlotId[] = ['A', 'B'];

interface Draft {
  base: BaseType;
  ingredients: IngredientType[];
  finish: FinishType;
}

function emptyDraft(): Draft {
  return { base: 'water', ingredients: [], finish: 'hot' };
}

const MAX_INGREDIENTS = 3;

let hooksRef: KettleHooks | null = null;
let stateRef: KettleState | null = null;
/** Per-slot drafts — "two drinks brewing at once" (§4.2 second kettle). */
let drafts: Record<KettleSlotId, Draft> = { A: emptyDraft(), B: emptyDraft() };
let activeSlot: KettleSlotId = 'A';

function ensurePanel(): HTMLElement {
  let overlay = document.getElementById('kettle-overlay');
  if (overlay) return overlay;

  const app = document.getElementById('app');
  if (!app) throw new Error('#app element not found');

  overlay = document.createElement('div');
  overlay.id = 'kettle-overlay';
  overlay.className = 'overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', STRINGS.kettle.title);

  const panel = document.createElement('div');
  panel.className = 'panel kettle-panel';

  const title = document.createElement('h2');
  title.textContent = STRINGS.kettle.title;

  // Second-kettle A/B tab row (hidden until the upgrade is owned).
  const slotRow = document.createElement('div');
  slotRow.className = 'option-row hidden';
  slotRow.id = 'kettle-slots';

  const baseLabel = document.createElement('h3');
  baseLabel.textContent = STRINGS.kettle.base;
  const baseRow = document.createElement('div');
  baseRow.className = 'option-row';
  baseRow.id = 'kettle-bases';

  const ingLabel = document.createElement('h3');
  ingLabel.textContent = STRINGS.kettle.ingredients;
  const ingRow = document.createElement('div');
  ingRow.className = 'option-row option-row-wrap';
  ingRow.id = 'kettle-ingredients';

  const finishLabel = document.createElement('h3');
  finishLabel.textContent = STRINGS.kettle.finish;
  const finishRow = document.createElement('div');
  finishRow.className = 'option-row';
  finishRow.id = 'kettle-finishes';

  const recipesLabel = document.createElement('h3');
  recipesLabel.textContent = STRINGS.kettle.knownRecipes;
  recipesLabel.id = 'kettle-recipes-label';
  recipesLabel.className = 'hidden';
  const recipesRow = document.createElement('div');
  recipesRow.className = 'option-row option-row-wrap';
  recipesRow.id = 'kettle-recipes';

  const stockNote = document.createElement('p');
  stockNote.className = 'note note-warn hidden';
  stockNote.id = 'kettle-stock-note';
  stockNote.setAttribute('aria-live', 'polite');

  const btnRow = document.createElement('div');
  btnRow.className = 'btn-row';
  const clearBtn = document.createElement('button');
  clearBtn.type = 'button';
  clearBtn.className = 'btn btn-secondary';
  clearBtn.id = 'kettle-clear';
  const brewBtn = document.createElement('button');
  brewBtn.type = 'button';
  brewBtn.className = 'btn btn-primary';
  brewBtn.id = 'kettle-brew';
  btnRow.appendChild(clearBtn);
  btnRow.appendChild(brewBtn);

  const closeX = document.createElement('button');
  closeX.type = 'button';
  closeX.className = 'panel-close';
  closeX.setAttribute('aria-label', STRINGS.settings.close);
  closeX.textContent = '×';
  closeX.addEventListener('click', () => hooksRef?.onClose());

  panel.appendChild(closeX);
  panel.appendChild(title);
  panel.appendChild(slotRow);
  panel.appendChild(baseLabel);
  panel.appendChild(baseRow);
  panel.appendChild(ingLabel);
  panel.appendChild(ingRow);
  panel.appendChild(finishLabel);
  panel.appendChild(finishRow);
  panel.appendChild(recipesLabel);
  panel.appendChild(recipesRow);
  panel.appendChild(stockNote);
  panel.appendChild(btnRow);
  overlay.appendChild(panel);
  app.appendChild(overlay);

  window.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape' && overlay && !overlay.classList.contains('hidden')) {
      hooksRef?.onClose();
    }
  });

  return overlay;
}

function chipButton(labelText: string, selected: boolean): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = `chip${selected ? ' chip-selected' : ''}`;
  b.setAttribute('aria-pressed', String(selected));
  b.textContent = labelText;
  return b;
}

function baseLabel(base: BaseType): string {
  switch (base) {
    case 'water':
      return STRINGS.ingredients.water;
    case 'milk':
      return STRINGS.ingredients.milk;
    case 'oat_milk':
      return STRINGS.ingredients.oat_milk;
    case 'coffee':
      return STRINGS.ingredients.coffee;
  }
}

function finishLabel(finish: FinishType): string {
  switch (finish) {
    case 'hot':
      return STRINGS.kettle.hot;
    case 'iced':
      return STRINGS.kettle.iced;
    case 'foamed':
      return STRINGS.kettle.foamed;
  }
}

function renderDraft(): void {
  if (!stateRef) return;
  const overlay = ensurePanel();
  const draft = drafts[activeSlot];

  // Kettle A/B tabs — second kettle upgrade (§4.2). Each slot owns its draft;
  // BREW applies to whichever slot is active.
  const slotRow = overlay.querySelector<HTMLDivElement>('#kettle-slots');
  if (slotRow) {
    slotRow.replaceChildren();
    slotRow.classList.toggle('hidden', !stateRef.hasSecondKettle);
    if (stateRef.hasSecondKettle) {
      for (const slot of KETTLE_SLOTS) {
        const b = chipButton(`${STRINGS.kettle.title} ${slot}`, activeSlot === slot);
        b.addEventListener('click', () => {
          activeSlot = slot;
          renderDraft();
        });
        slotRow.appendChild(b);
      }
    }
  }

  // Bases — controller supplies the unlocked list (coffee after the machine).
  const basesEl = overlay.querySelector<HTMLDivElement>('#kettle-bases');
  if (basesEl) {
    basesEl.replaceChildren();
    for (const base of stateRef.availableBases) {
      const b = chipButton(baseLabel(base), draft.base === base);
      b.addEventListener('click', () => {
        draft.base = base;
        renderDraft();
      });
      basesEl.appendChild(b);
    }
  }

  // Ingredients from shelf choices with stock counts, disabled at zero.
  const ingEl = overlay.querySelector<HTMLDivElement>('#kettle-ingredients');
  if (ingEl) {
    ingEl.replaceChildren();
    for (const ing of stateRef.ingredientChoices) {
      const count = stateRef.inventory[ing] ?? 0;
      const label = `${STRINGS.ingredients[ing]} × ${count}`;
      const selected = draft.ingredients.includes(ing);
      const b = chipButton(label, selected);
      b.disabled = count <= 0 || (!selected && draft.ingredients.length >= MAX_INGREDIENTS);
      b.addEventListener('click', () => {
        const idx = draft.ingredients.indexOf(ing);
        if (idx >= 0) draft.ingredients.splice(idx, 1);
        else if (draft.ingredients.length < MAX_INGREDIENTS) draft.ingredients.push(ing);
        renderDraft();
      });
      ingEl.appendChild(b);
    }
  }

  // Finish toggles — hot/iced/foamed (§2.1 step 3).
  const finEl = overlay.querySelector<HTMLDivElement>('#kettle-finishes');
  if (finEl) {
    finEl.replaceChildren();
    for (const finish of ['hot', 'iced', 'foamed'] as const) {
      const b = chipButton(finishLabel(finish), draft.finish === finish);
      b.addEventListener('click', () => {
        draft.finish = finish;
        renderDraft();
      });
      finEl.appendChild(b);
    }
  }

  // Known recipes — tap a recipe to load its combo into the active slot
  // (a cozy "I already know this one" shortcut). Hidden when none known yet.
  const recEl = overlay.querySelector<HTMLDivElement>('#kettle-recipes');
  const recLabel = overlay.querySelector<HTMLHeadingElement>('#kettle-recipes-label');
  if (recEl) {
    recEl.replaceChildren();
    const known = stateRef.knownRecipeIds;
    const show = known.length > 0;
    if (recLabel) recLabel.classList.toggle('hidden', !show);
    if (show) {
      for (const id of known) {
        const view = recipeToView(id);
        if (!view) continue;
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'chip chip-recipe';
        b.setAttribute('aria-label', `${STRINGS.kettle.knownRecipes}: ${view.name}`);
        b.textContent = view.name;
        // Title shows the combo so the player learns the build at a glance.
        b.title = view.combo;
        b.addEventListener('click', () => {
          const r = getRecipe(id);
          if (!r) return;
          drafts[activeSlot] = { base: r.base, ingredients: [...r.ingredients], finish: r.finish };
          renderDraft();
        });
        recEl.appendChild(b);
      }
    }
  }

  // Inline note priority: a concrete brew-block reason beats the generic
  // restock hint (doc 05 §5 — explain, recover, never blame).
  const stockNote = overlay.querySelector<HTMLParagraphElement>('#kettle-stock-note');
  if (stockNote) {
    const blockMessage = stateRef.brewBlockMessage;
    const showRestock = !blockMessage && stateRef.outOfStockNoteVisible;
    stockNote.classList.toggle('hidden', !blockMessage && !showRestock);
    if (blockMessage) stockNote.textContent = blockMessage;
    else if (showRestock) stockNote.textContent = STRINGS.kettle.restockNote;
  }

  const clearBtn = overlay.querySelector<HTMLButtonElement>('#kettle-clear');
  if (clearBtn) {
    clearBtn.textContent = STRINGS.kettle.clear;
    clearBtn.onclick = () => {
      drafts[activeSlot] = emptyDraft();
      renderDraft();
    };
  }

  const brewBtn = overlay.querySelector<HTMLButtonElement>('#kettle-brew');
  if (brewBtn) {
    brewBtn.textContent = STRINGS.kettle.brew;
    brewBtn.disabled = draft.ingredients.length === 0;
    brewBtn.onclick = () => {
      const current = drafts[activeSlot];
      hooksRef?.onBrew({ ...current, ingredients: [...current.ingredients] });
      // Slot is spent — poured into the kettle. Fresh draft next time.
      drafts[activeSlot] = emptyDraft();
    };
  }
}

/** Open (or refresh) the kettle. First-ever opening auto-focuses BREW flow. */
export function openKettle(state: KettleState, hooks: KettleHooks): void {
  hooksRef = hooks;
  stateRef = state;
  ensurePanel().classList.remove('hidden');
  renderDraft();
}

/** Preselect a known combo in the ACTIVE slot (repeat shortcut / assist). */
export function setKettleDraft(input: BrewInput): void {
  drafts[activeSlot] = { base: input.base, ingredients: [...input.ingredients], finish: input.finish };
  renderDraft();
}

/** Which slot a repeat-shortcut targets — exposed for the controller/tests. */
export function activeKettleSlot(): KettleSlotId {
  return activeSlot;
}

export function closeKettle(): void {
  document.getElementById('kettle-overlay')?.classList.add('hidden');
}

export function isKettleOpen(): boolean {
  const el = document.getElementById('kettle-overlay');
  return !!el && !el.classList.contains('hidden');
}
