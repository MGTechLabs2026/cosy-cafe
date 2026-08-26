// sim/shelf.ts — doc 02 §2.5 (ingredient shelf: prices, restock, capacity).
// Pure logic, no DOM/Canvas imports.
//
// DEVIATIONS FLAGGED FOR THE OVERSEER (spec gaps decided here, see report):
// · sage has no §2.5 row — priced 3¤ from weekly delivery like ginger_root.
// · ember_chili §2.5 restock is "Bram's gift after his first scene" (an M3 arc
//   reward); in M2 it sells at its listed 5¤ price via weekly delivery.
// · R006/R007 "seasonal" restock sources are lore in M2; frostberries and
//   ginger_root arrive via the weekly auto-delivery.
// · Capacity counts DISTINCT ingredient KINDS stocked simultaneously, not item
//   count — the doc's own starting stock (10+6+4) rules an item-count reading.

import type { IngredientId, Inventory } from './day.js';

export interface ShelfEntry {
  id: IngredientId;
  /** strings.json key under ingredients.<id> for the display name. */
  buyPrice: number;
  source: 'delivery' | 'sela';
}

/** Buy prices EXACT per doc 02 §2.5 (+ overseer-decided sage at 3¤). */
export const SHELF_ENTRIES: readonly ShelfEntry[] = [
  { id: 'tea_leaves', buyPrice: 2, source: 'delivery' },
  { id: 'honey', buyPrice: 3, source: 'delivery' },
  { id: 'moonleaf', buyPrice: 6, source: 'sela' },
  { id: 'cocoa', buyPrice: 4, source: 'delivery' },
  { id: 'ember_chili', buyPrice: 5, source: 'delivery' }, // M2 deviation (M3: Bram's gift)
  { id: 'cloud_sugar', buyPrice: 7, source: 'sela' },
  { id: 'frostberries', buyPrice: 5, source: 'delivery' }, // seasonal label = lore in M2
  { id: 'ginger_root', buyPrice: 3, source: 'delivery' }, // seasonal label = lore in M2
  { id: 'sage', buyPrice: 3, source: 'delivery' }, // spec-gap decision
] as const;

const SHELF_BY_ID = new Map(SHELF_ENTRIES.map((e) => [e.id, e]));

export function shelfPrice(id: IngredientId): number {
  return SHELF_BY_ID.get(id)?.buyPrice ?? 0;
}

export function shelfSource(id: IngredientId): 'delivery' | 'sela' {
  return SHELF_BY_ID.get(id)?.source ?? 'delivery';
}

/** All ids a given source offers (kettle/shop listing order). */
export function shelfIdsFor(source: 'delivery' | 'sela'): IngredientId[] {
  return SHELF_ENTRIES.filter((e) => e.source === source).map((e) => e.id);
}

/**
 * SELA'S CART RULE — CHOSEN OPTION (ii), REPORTED AS A DEVIATION:
 * moonleaf/cloud_sugar are purchasable from day 2 onward REGARDLESS of whether
 * Sela visited that day. Simpler to explain ("the cart parks outside daily"),
 * no dead-end mornings, and her visits stay purely social until arcs land.
 */
export const SELA_CART_FROM_DAY = 2;

export function selaCartOpen(day: number): boolean {
  return day >= SELA_CART_FROM_DAY;
}

// ---- Weekly delivery (auto) --------------------------------------------------

/** Delivery arrives morning of days 8 and 15: (day-1) % 7 === 0 && day > 1. */
export function isDeliveryDay(day: number): boolean {
  return day > 1 && (day - 1) % 7 === 0;
}

/**
 * Delivery bundle quantities — TUNING VALUES, REPORTED. Sized to cover ~2 days
 * of the relevant recipes across the full cast plus experimentation slack
 * (R004 needs cocoa+chili, R007 ginger+sage, R006 frostberries; tea/honey stay
 * the workhorse drinks).
 */
const DELIVERY_BUNDLE: Readonly<Record<string, number>> = {
  tea_leaves: 8,
  honey: 6,
  cocoa: 6,
  ember_chili: 4,
  frostberries: 4,
  ginger_root: 4,
  sage: 4,
};

/** The exact bundle arriving on a delivery morning (for recap copy + tests). */
export function deliveryBundle(): Readonly<Record<string, number>> {
  return DELIVERY_BUNDLE;
}

/** Apply the weekly bundle to an inventory (mutates; caller snapshots save). */
export function applyDelivery(inventory: Inventory): void {
  for (const [id, count] of Object.entries(DELIVERY_BUNDLE)) {
    inventory[id as IngredientId] = (inventory[id as IngredientId] ?? 0) + count;
  }
}

// ---- Capacity (distinct kinds stocked) ---------------------------------------

export type RestockCheck =
  | { ok: true }
  | { ok: false; reason: 'shelf_full'; capacity: number };

/**
 * Can a NEW ingredient kind join the shelf? Capacity counts DISTINCT kinds
 * currently stocked (>0 units); kinds already stocked can always be topped up.
 */
export function checkRestockAllowed(
  inventory: Inventory,
  id: IngredientId,
  capacity: number,
): RestockCheck {
  if ((inventory[id] ?? 0) > 0) return { ok: true };
  const kindsStocked = Object.values(inventory).filter((n) => n > 0).length;
  if (kindsStocked >= capacity) {
    return { ok: false, reason: 'shelf_full', capacity };
  }
  return { ok: true };
}
