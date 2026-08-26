// M2 recipes R004–R007 tests — doc 02 §2.3 exact combos, multiset matching,
// murky for unknown combos. Also shelf economy (§2.5) + upgrade track (§4.2).

import { describe, expect, it } from 'vitest';

import {
  RECIPES,
  drinkPrice,
  getRecipe,
  matchesRecipe,
  resolveBrew,
} from '../src/sim/brewing';
import type { BrewInput } from '../src/sim/brewing';
import {
  SHELF_ENTRIES,
  checkRestockAllowed,
  isDeliveryDay,
  selaCartOpen,
  shelfIdsFor,
  shelfPrice,
} from '../src/sim/shelf';
import { createInitialInventory } from '../src/sim/day';
import type { Inventory } from '../src/sim/day';
import {
  BREW_ANIM_SEC_BASE,
  BREW_ANIM_SEC_HEARTH,
  BIGGER_SHELF_MAX_PURCHASES,
  SHELF_SLOTS_BASE,
  SHELF_SLOTS_PER_UPGRADE,
  UPGRADES,
  WINDOW_BENCH_PATIENCE_BONUS,
  brewAnimSec,
  getUpgrade,
  hasCoffeeBase,
  isUpgradeAvailable,
  ownedCount,
  patienceMax,
  purchaseUpgrade,
  shelfCapacity,
} from '../src/sim/upgrades';

const brew = (
  base: BrewInput['base'],
  ingredients: BrewInput['ingredients'],
  finish: BrewInput['finish'] = 'hot',
): BrewInput => ({ base, ingredients, finish });

const ALL_KNOWN = RECIPES.map((r) => r.id);

describe('recipe table R001–R008 — exact doc 02 §2.3 combos + M3 R008', () => {
  it('has exactly eight recipes', () => {
    expect(RECIPES.map((r) => r.id)).toEqual(['R001', 'R002', 'R003', 'R004', 'R005', 'R006', 'R007', 'R008']);
  });

  it('R004 Ember Cocoa = milk + cocoa + ember_chili, hot', () => {
    const r = getRecipe('R004')!;
    expect(r.base).toBe('milk');
    expect(r.finish).toBe('hot');
    expect([...r.ingredients].sort()).toEqual(['cocoa', 'ember_chili']);
    expect(matchesRecipe(brew('milk', ['ember_chili', 'cocoa']), r)).toBe(true);
  });

  it('R005 Cloud Foam = milk + cloud_sugar, foamed', () => {
    const r = getRecipe('R005')!;
    expect(r.base).toBe('milk');
    expect(r.finish).toBe('foamed');
    expect(r.ingredients).toEqual(['cloud_sugar']);
  });

  it('R006 Iced Berry Tisane = water + frostberries, iced', () => {
    const r = getRecipe('R006')!;
    expect(r.base).toBe('water');
    expect(r.finish).toBe('iced');
    expect(r.ingredients).toEqual(['frostberries']);
  });

  it('R007 Root & Remedy Broth = water + ginger_root + sage, hot', () => {
    const r = getRecipe('R007')!;
    expect(r.base).toBe('water');
    expect(r.finish).toBe('hot');
    expect([...r.ingredients].sort()).toEqual(['ginger_root', 'sage']);
  });
});

describe('resolution R004–R007 — multiset semantics + known-gating', () => {
  it('order of ingredients does not matter (multiset)', () => {
    const known = ['R004'];
    expect(resolveBrew(brew('milk', ['ember_chili', 'cocoa']), known).recipeId).toBe('R004');
    expect(resolveBrew(brew('milk', ['cocoa', 'ember_chili']), known).recipeId).toBe('R004');
  });

  it('wrong finish fails even with right base+ingredients', () => {
    const known = ['R006'];
    const hotBerry = resolveBrew(brew('water', ['frostberries'], 'hot'), known);
    expect(hotBerry.isMurky).toBe(true);
    expect(known.includes('R006')).toBe(true);
  });

  it('wrong base fails even with right ingredients+finish', () => {
    const known = ['R007'];
    const milkyBroth = resolveBrew(brew('milk', ['ginger_root', 'sage'], 'hot'), known);
    expect(milkyBroth.isMurky).toBe(true);
  });

  it('unknown combos stay murky even when every recipe is known', () => {
    // cocoa alone: not a recipe.
    expect(resolveBrew(brew('milk', ['cocoa']), ALL_KNOWN).isMurky).toBe(true);
    // cloud sugar hot: not Cloud Foam (finish differs).
    expect(resolveBrew(brew('milk', ['cloud_sugar'], 'hot'), ALL_KNOWN).isMurky).toBe(true);
    // three-ingredient soup of everything: not a recipe.
    expect(
      resolveBrew(brew('water', ['ginger_root', 'sage', 'honey'], 'hot'), ALL_KNOWN).isMurky,
    ).toBe(true);
  });

  it('correct combo of an UNLEARNED recipe is still murky (known-gating intact)', () => {
    expect(resolveBrew(brew('milk', ['cocoa', 'ember_chili']), ['R001']).isMurky).toBe(true);
    expect(resolveBrew(brew('milk', ['cloud_sugar'], 'foamed'), ['R001', 'R002']).isMurky).toBe(
      true,
    );
  });

  it('each new favorite resolves once taught (per-character teach path)', () => {
    expect(resolveBrew(brew('milk', ['cocoa', 'ember_chili']), ['R004']).recipeId).toBe('R004');
    expect(
      resolveBrew(brew('milk', ['cloud_sugar'], 'foamed'), ['R004', 'R005']).recipeId,
    ).toBe('R005');
    expect(resolveBrew(brew('water', ['frostberries'], 'iced'), ['R006']).recipeId).toBe('R006');
    expect(resolveBrew(brew('water', ['sage', 'ginger_root']), ['R007']).recipeId).toBe('R007');
  });

  it('drink prices follow 5¤ + ingredients (Ember Cocoa 7¤ per §4.1)', () => {
    expect(drinkPrice(getRecipe('R004')!)).toBe(7); // two ingredients
    expect(drinkPrice(getRecipe('R005')!)).toBe(6); // one ingredient
    expect(drinkPrice(getRecipe('R006')!)).toBe(6); // one ingredient
    expect(drinkPrice(getRecipe('R007')!)).toBe(7); // two ingredients
  });
});

describe('shelf — prices, sources, delivery (doc 02 §2.5 + deviations)', () => {
  it('exact §2.5 prices (sage at 3¤ per overseer decision)', () => {
    expect(shelfPrice('tea_leaves')).toBe(2);
    expect(shelfPrice('honey')).toBe(3);
    expect(shelfPrice('moonleaf')).toBe(6);
    expect(shelfPrice('cocoa')).toBe(4);
    expect(shelfPrice('ember_chili')).toBe(5);
    expect(shelfPrice('cloud_sugar')).toBe(7);
    expect(shelfPrice('frostberries')).toBe(5);
    expect(shelfPrice('ginger_root')).toBe(3);
    expect(shelfPrice('sage')).toBe(3); // DEVIATION (spec gap)
  });

  it('moonleaf/cloud_sugar come from Sela; the rest from weekly delivery', () => {
    expect(shelfIdsFor('sela')).toEqual(['moonleaf', 'cloud_sugar']);
    expect(shelfIdsFor('delivery').sort()).toEqual(
      [
        'tea_leaves',
        'honey',
        'cocoa',
        'ember_chili',
        'frostberries',
        'ginger_root',
        'sage',
      ].sort(),
    );
  });

  it('Sela cart rule (option ii): closed day 1, open day 2 onward', () => {
    expect(selaCartOpen(1)).toBe(false);
    expect(selaCartOpen(2)).toBe(true);
    expect(selaCartOpen(8)).toBe(true);
  });

  it('delivery lands mornings of days 8 and 15 only', () => {
    expect(isDeliveryDay(1)).toBe(false);
    expect(isDeliveryDay(7)).toBe(false);
    expect(isDeliveryDay(8)).toBe(true);
    expect(isDeliveryDay(15)).toBe(true);
    expect(isDeliveryDay(9)).toBe(false);
    expect(isDeliveryDay(22)).toBe(true); // (22-1)%7===0 — cadence holds past MVP
  });

  it('delivery applies the full bundle to inventory', async () => {
    const { applyDelivery } = await import('../src/sim/shelf');
    const inv = createInitialInventory();
    applyDelivery(inv);
    expect(inv['tea_leaves']).toBe(10 + 8); // starting stock + bundle
    expect(inv['ember_chili']).toBe(4);
    expect(inv['sage']).toBe(4);
  });
});

describe('shelf capacity — distinct kinds semantics (overseer interpretation)', () => {
  function invWith(kinds: Record<string, number>): Inventory {
    return { ...createInitialInventory(), ...kinds } as Inventory;
  }

  it('starting capacity is 6 kinds; topping up a stocked kind always allowed', () => {
    const inv = invWith({ cocoa: 1 });
    expect(shelfCapacity([])).toBe(SHELF_SLOTS_BASE);
    expect(checkRestockAllowed(inv, 'cocoa', 6).ok).toBe(true); // already stocked
  });

  it('a NEW kind beyond capacity is blocked with the reason + capacity', () => {
    const inv = invWith({
      honey: 2, // tea_leaves already stocked → these make 6 kinds total:
      moonleaf: 1,
      cocoa: 1,
      ember_chili: 1,
      frostberries: 1,
    });
    // stocked: tea_leaves, honey, moonleaf, cocoa, ember_chili, frostberries = 6
    expect(checkRestockAllowed(inv, 'ginger_root', 6)).toEqual({
      ok: false,
      reason: 'shelf_full',
      capacity: 6,
    });
  });

  it('capacity upgrades raise the ceiling 6→9→12 and repeat caps at ×2', () => {
    expect(shelfCapacity(['bigger_shelf'])).toBe(SHELF_SLOTS_BASE + SHELF_SLOTS_PER_UPGRADE);
    expect(shelfCapacity(['bigger_shelf', 'bigger_shelf'])).toBe(12);
    expect(BIGGER_SHELF_MAX_PURCHASES).toBe(2);
    expect(isUpgradeAvailable(['bigger_shelf', 'bigger_shelf'], 'bigger_shelf')).toBe(false);
  });

  it('item COUNT can exceed capacity — only distinct KINDS are capped', () => {
    const inv = invWith({ tea_leaves: 50, honey: 30 }); // 80 items, 2 kinds
    expect(checkRestockAllowed(inv, 'honey', 6).ok).toBe(true);
  });
});

describe('upgrades — costs, purchases, immediate effects (doc 02 §4.2)', () => {
  it('exact §4.2 costs', () => {
    const expected: Record<string, number> = {
      second_kettle: 60,
      bigger_shelf: 40,
      window_bench: 45,
      coffee_machine: 80,
      record_player: 70,
      hearth_expansion: 90,
    };
    expect(UPGRADES).toHaveLength(6);
    for (const [id, cost] of Object.entries(expected)) {
      expect(getUpgrade(id)?.cost, id).toBe(cost);
    }
  });

  it('purchase deducts cost and appends to owned list', () => {
    const result = purchaseUpgrade(100, [], 'second_kettle');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.coins).toBe(40);
      expect(result.owned).toEqual(['second_kettle']);
    }
  });

  it('insufficient funds rejected WITHOUT any state change, deficit reported', () => {
    const result = purchaseUpgrade(59, [], 'second_kettle');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('insufficient_funds');
      expect(result.deficit).toBe(1); // "Earn ¤1 more"
    }
    expect(purchaseUpgrade(44, [], 'window_bench')).toMatchObject({ ok: false });
  });

  it('non-repeatable upgrades cannot be bought twice', () => {
    const result = purchaseUpgrade(500, ['hearth_expansion'], 'hearth_expansion');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('unavailable');
    expect(ownedCount(['hearth_expansion'], 'hearth_expansion')).toBe(1);
  });

  it('effects live: second kettle slot flag, coffee base, patience bonus, brew speed', () => {
    expect(hasCoffeeBase(['coffee_machine'])).toBe(true);
    expect(hasCoffeeBase([])).toBe(false);

    expect(patienceMax([])).toBe(100);
    expect(patienceMax(['window_bench'])).toBe(100 + WINDOW_BENCH_PATIENCE_BONUS);
    expect(WINDOW_BENCH_PATIENCE_BONUS).toBe(15);

    expect(brewAnimSec([])).toBe(BREW_ANIM_SEC_BASE);
    expect(brewAnimSec(['hearth_expansion'])).toBe(BREW_ANIM_SEC_HEARTH);
    expect(BREW_ANIM_SEC_BASE).toBeGreaterThan(BREW_ANIM_SEC_HEARTH);
  });
});
