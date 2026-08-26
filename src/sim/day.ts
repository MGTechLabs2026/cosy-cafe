// sim/day.ts — doc 02 §1 (day cycle) + §2.5 (ingredient shelf)
// Pure logic, no DOM/Canvas imports.

export type Phase = 'prep' | 'service' | 'recap';

export interface DayState {
  day: number;
  phase: Phase;
}

export function createInitialDayState(): DayState {
  return {
    day: 1,
    phase: 'prep',
  };
}

export function openService(state: DayState): void {
  state.phase = 'service';
}

/** Close for the evening. `allServed` = every scheduled arrival was served. */
export function closeDay(state: DayState): void {
  state.phase = 'recap';
}

/** Advance to the next morning after the recap modal is dismissed. */
export function beginNextDay(state: DayState): void {
  state.day += 1;
  state.phase = 'prep';
}

// ---- Ingredient shelf (doc 02 §2.5) ----------------------------------------

export type IngredientId =
  | 'tea_leaves'
  | 'honey'
  | 'moonleaf'
  | 'cocoa'
  | 'ember_chili'
  | 'cloud_sugar'
  | 'frostberries'
  | 'ginger_root'
  | 'sage';

export type Inventory = Record<IngredientId, number>;

/**
 * Starting stock — doc 02 §2.5: "10× tea leaves, 6× honey, 4× moonleaf".
 * Everything else starts at zero; restocking arrives in M2.
 */
export function createInitialInventory(): Inventory {
  return {
    tea_leaves: 10,
    honey: 6,
    moonleaf: 4,
    cocoa: 0,
    ember_chili: 0,
    cloud_sugar: 0,
    frostberries: 0,
    ginger_root: 0,
    sage: 0,
  };
}

/** Decrement one use of each ingredient kind. Caller checks stock first. */
export function consumeIngredients(inventory: Inventory, used: readonly IngredientId[]): void {
  for (const id of used) {
    const current = inventory[id] ?? 0;
    if (current <= 0) {
      // Controller must gate this via hasStock(); defensive no-op here keeps
      // the sim total (a negative shelf would be a lie about the world).
      continue;
    }
    inventory[id] = current - 1;
  }
}

export function hasStock(inventory: Inventory, needed: readonly IngredientId[]): boolean {
  return needed.every((id) => (inventory[id] ?? 0) > 0);
}
