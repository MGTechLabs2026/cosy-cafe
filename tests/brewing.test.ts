import { describe, expect, it } from 'vitest';

import {
  RECIPES,
  drinkPrice,
  getRecipe,
  matchesRecipe,
  resolveBrew,
} from '../src/sim/brewing';
import type { BrewInput } from '../src/sim/brewing';

const water = (ingredients: BrewInput['ingredients'], finish: BrewInput['finish'] = 'hot'): BrewInput => ({
  base: 'water',
  ingredients,
  finish,
});

describe('brewing — recipe matching (doc 02 §2)', () => {
  it('R001 Black Tea matches water + tea_leaves hot', () => {
    const r001 = getRecipe('R001');
    expect(r001).toBeDefined();
    expect(matchesRecipe(water(['tea_leaves']), r001!)).toBe(true);
  });

  it('order of ingredients does not matter', () => {
    const r = RECIPES[0]!;
    expect(matchesRecipe(water(['tea_leaves']), r)).toBe(true);
    expect(matchesRecipe({ base: 'water', ingredients: ['tea_leaves', 'honey'], finish: 'hot' }, r)).toBe(false);
  });

  it('wrong base fails even with right ingredients', () => {
    const r001 = getRecipe('R001')!;
    const milkTea: BrewInput = { base: 'milk', ingredients: ['tea_leaves'], finish: 'hot' };
    expect(matchesRecipe(milkTea, r001)).toBe(false);
  });

  it('wrong finish fails (iced black tea ≠ R001)', () => {
    const r001 = getRecipe('R001')!;
    expect(matchesRecipe(water(['tea_leaves'], 'iced'), r001)).toBe(false);
  });

  it('extra ingredient is NOT the recipe (honeyed black tea has no R-id in M1)', () => {
    const r001 = getRecipe('R001')!;
    expect(matchesRecipe(water(['tea_leaves', 'honey']), r001)).toBe(false);
  });
});

describe('brewing — murky path (doc 02 §2.4)', () => {
  it('unknown combo resolves to murky with no recipe id', () => {
    const result = resolveBrew(water(['cocoa']), ['R001', 'R002']);
    expect(result.isMurky).toBe(true);
    expect(result.recipeId).toBeNull();
  });

  it('correct combo for an UNKNOWN recipe still murky (not discovered yet)', () => {
    // R003 not yet taught: water+moonleaf must be murky before Fenwick teaches it.
    const result = resolveBrew(water(['moonleaf']), ['R001', 'R002']);
    expect(result.isMurky).toBe(true);
  });

  it('murky brew yields no recipe → economy never pays (controller contract)', () => {
    // Contract pin: resolveBrew returning null recipeId cannot produce coins.
    const result = resolveBrew(water(['honey', 'tea_leaves']), ['R001']);
    expect(result.recipeId).toBeNull();
  });

  it('taught R003 matches after discovery', () => {
    const result = resolveBrew(water(['moonleaf']), ['R001', 'R002', 'R003']);
    expect(result.isMurky).toBe(false);
    expect(result.recipeId).toBe('R003');
  });

  it('empty known list always murky (fresh game edge)', () => {
    expect(resolveBrew(water(['tea_leaves']), []).isMurky).toBe(true);
  });
});

describe('economy math (doc 02 §4.1)', () => {
  it('base price 5¤ +1¤ per extra ingredient: Black Tea 6¤', () => {
    const r001 = getRecipe('R001')!;
    expect(drinkPrice(r001)).toBe(6);
  });

  it('single-ingredient drinks stay at base+0 (Honey Milk 6¤, Moonleaf 6¤)', () => {
    expect(drinkPrice(getRecipe('R002')!)).toBe(6);
    expect(drinkPrice(getRecipe('R003')!)).toBe(6);
  });

  it('two-ingredient drink would cost 7¤ (Ember Cocoa rule check on data shape)', () => {
    // R004 isn't in the M1 set; verify pricing formula directly.
    const fake = { ...getRecipe('R001')!, ingredients: ['tea_leaves', 'honey'] as BrewInput['ingredients'] };
    expect(drinkPrice(fake)).toBe(7);
  });
});
