// controllers/kettle-controller.ts — kettle interaction orchestration
// (doc 08 §3.5). Owns kettle UI state assembly + brew submission flow; ALL
// recipe rules stay in sim/brewing.ts and stock semantics in sim/shelf.ts.
// Extracted verbatim-in-behavior from ui/game.ts.

import { STRINGS, format } from '../data/strings.js';
import { ingredientLabel } from '../data/recipes.js';
import type { BaseType, BrewInput } from '../sim/brewing.js';
import { resolveBrew } from '../sim/brewing.js';
import { shelfIdsFor } from '../sim/shelf.js';
import { hasCoffeeBase } from '../sim/upgrades.js';
import { openKettle, closeKettle } from '../ui/kettle.js';
import type { KettleState } from '../ui/kettle.js';
import { showToast } from '../ui/cafe-dom.js';

/** Kettle bases before the coffee machine (oat milk stays post-MVP). */
const BASE_BASES: readonly BaseType[] = ['water', 'milk'];

/** Context the kettle orchestrates against (owned by the other controllers). */
export interface KettleContext {
  /** Recipe ids the player already knows (save.flags.discovered_recipes). */
  discoveredRecipeIds: readonly string[];
  upgrades: readonly string[];
  inventory: Record<string, number>;
}

export interface KettleControllerDeps {
  getContext: () => KettleContext;
  /** Present a toast via the café DOM layer. */
  toast: (message: string, ms?: number) => void;
  /**
   * Resolve a completed, stock-cleared brew. Returns false when the load was
   * murky AND nobody was waiting (practice pour) — the caller decides.
   * Implemented by the service/game layer; keeps recipe matching out of here.
   */
  onSubmitBrew: (input: BrewInput) => void;
}

/**
 * Orchestrates the kettle panel: state snapshot for ui/kettle.ts, the stock
 * gate, ingredient consumption on submit, and the last-brew shortcut memory.
 */
export class KettleController {
  private deps: KettleControllerDeps;
  private lastBrewInput: BrewInput | null = null;
  /** Inline block message shown inside the kettle panel until the next open. */
  private blockMessage: string | null = null;
  /** True once the player has opened the kettle at all (drives the glint). */
  everOpened = false;

  constructor(deps: KettleControllerDeps) {
    this.deps = deps;
  }

  /** Open the kettle panel from any entry point (button, order-bubble click).
   * Deliberately NO click sound here — matches the legacy behavior where only
   * door actions and sleep-in clicked; the panel itself opens silently. */
  openForOrder(): void {
    this.everOpened = true;
    this.blockMessage = null;
    openKettle(this.state(), {
      onBrew: (input) => this.handleBrew(input),
      onClose: () => {
        closeKettle();
      },
    });
  }

  private state(): KettleState {
    const ctx = this.deps.getContext();
    const bases: BaseType[] = hasCoffeeBase(ctx.upgrades)
      ? [...BASE_BASES, 'coffee']
      : [...BASE_BASES];
    return {
      knownRecipeIds: ctx.discoveredRecipeIds,
      lastBrew: this.lastBrewInput,
      inventory: ctx.inventory,
      // Whole shelf listing — chips carry owned counts, disabled at zero (§E).
      ingredientChoices: shelfIdsFor('delivery').concat(shelfIdsFor('sela')),
      availableBases: bases,
      hasSecondKettle: ctx.upgrades.includes('second_kettle'),
      outOfStockNoteVisible:
        Object.values(ctx.inventory).reduce((sum: number, n) => sum + Math.max(0, n), 0 as number) === 0,
      brewBlockMessage: this.blockMessage,
    };
  }

  private handleBrew(input: BrewInput): void {
    this.lastBrewInput = input;
    const ctx = this.deps.getContext();

    // Stock gate first (doc 02 §2.5): missing ingredients block with an inline
    // message in the kettle panel — never a dialog, nothing consumed.
    const missing = input.ingredients.filter((id) => (ctx.inventory[id] ?? 0) <= 0);
    if (missing.length > 0) {
      this.blockMessage = format(STRINGS.kettle.outOfStock, {
        items: missing.map((m) => ingredientLabel(m)).join(', '),
      });
      this.deps.toast(this.blockMessage);
      // Re-open refreshes the panel with the inline note visible.
      openKettle(this.state(), {
        onBrew: (next) => this.handleBrew(next),
        onClose: () => {
          closeKettle();
        },
      });
      return;
    }

    // Consume ingredients regardless of outcome (murky path still uses them).
    for (const id of input.ingredients) ctx.inventory[id] = (ctx.inventory[id] ?? 0) - 1;
    closeKettle();
    this.blockMessage = null;

    this.deps.onSubmitBrew(input);
  }

  /** Murky practice-pour copy (nobody waiting at the counter). */
  showPracticePourToast(isMurky: boolean): void {
    if (isMurky) this.deps.toast(STRINGS.kettle.murkyNote);
    else this.deps.toast(STRINGS.kettle.brew);
  }

  /** Murky serve decline copy (someone waiting). */
  showMurkyDeclineToast(): void {
    this.deps.toast(`${STRINGS.kettle.murkyTitle} — ${STRINGS.kettle.murkyLine}`);
  }

  /** Test hook: brew directly without opening the panel. */
  debugBrew(input: BrewInput): void {
    this.handleBrew(input);
  }

  get lastBrew(): BrewInput | null {
    return this.lastBrewInput;
  }
}
