// sim/brewing.ts — doc 02 §2 (three-step brew, recipes, murky path)
// Pure logic, no DOM/Canvas imports.

/**
 * Kettle bases — doc 02 §2.1 step 1 (water / milk / oat milk) plus `coffee`,
 * which exists as a base only after the Coffee Machine upgrade (doc 02 §4.2);
 * the controller gates it via sim/upgrades.ts. No R-recipe uses it in MVP —
 * base availability for freeform experimentation is the deliverable.
 */
export type BaseType = 'water' | 'milk' | 'oat_milk' | 'coffee';
export type IngredientType =
  | 'tea_leaves'
  | 'honey'
  | 'moonleaf'
  | 'cocoa'
  | 'ember_chili'
  | 'cloud_sugar'
  | 'frostberries'
  | 'ginger_root'
  | 'sage';
export type FinishType = 'hot' | 'iced' | 'foamed';

/** A kettle load as the player assembled it. */
export interface BrewInput {
  base: BaseType;
  ingredients: IngredientType[];
  finish: FinishType;
}

export interface Recipe {
  id: string; // "R001"
  nameKey: string; // strings.json key
  icon: string; // asset filename under /assets/items/, e.g. drink_black_tea.png
  base: BaseType;
  ingredients: IngredientType[]; // exact multiset required
  finish: FinishType;
}

/**
 * Full recipe table — doc 02 §2.3, R001–R008.
 * R008 is Wren's Usual (Honey Milk variant with moonleaf), unlocked after
 * Wren's arc resolution scene (M3 content pass).
 */
export const RECIPES: readonly Recipe[] = [
  {
    id: 'R001',
    nameKey: 'recipes.r001.name',
    icon: 'drink_black_tea.png',
    base: 'water',
    ingredients: ['tea_leaves'],
    finish: 'hot',
  },
  {
    id: 'R002',
    nameKey: 'recipes.r002.name',
    icon: 'drink_honey_milk.png',
    base: 'milk',
    ingredients: ['honey'],
    finish: 'hot',
  },
  {
    id: 'R003',
    nameKey: 'recipes.r003.name',
    icon: 'drink_moonleaf_tea.png',
    base: 'water',
    ingredients: ['moonleaf'],
    finish: 'hot',
  },
  {
    id: 'R004',
    nameKey: 'recipes.r004.name',
    icon: 'drink_ember_cocoa.png',
    base: 'milk',
    ingredients: ['cocoa', 'ember_chili'],
    finish: 'hot',
  },
  {
    id: 'R005',
    nameKey: 'recipes.r005.name',
    icon: 'drink_cloud_foam.png', // asset pending (see report); bubble falls back gracefully
    base: 'milk',
    ingredients: ['cloud_sugar'],
    finish: 'foamed',
  },
  {
    id: 'R006',
    nameKey: 'recipes.r006.name',
    icon: 'drink_iced_berry_tisane.png',
    base: 'water',
    ingredients: ['frostberries'],
    finish: 'iced',
  },
  {
    id: 'R007',
    nameKey: 'recipes.r007.name',
    icon: 'drink_root_remedy_broth.png',
    base: 'water',
    ingredients: ['ginger_root', 'sage'],
    finish: 'hot',
  },
  {
    id: 'R008',
    nameKey: 'recipes.r008.name',
    icon: 'drink_honey_milk_wren.png',
    base: 'milk',
    ingredients: ['honey', 'moonleaf'],
    finish: 'hot',
  },
] as const;

const RECIPES_BY_ID = new Map(RECIPES.map((r) => [r.id, r]));

export function getRecipe(id: string): Recipe | undefined {
  return RECIPES_BY_ID.get(id);
}

/** Order-insensitive ingredient comparison (doc 02 §2.1: "up to 3 ingredients"). */
function sameIngredients(a: readonly IngredientType[], b: readonly IngredientType[]): boolean {
  if (a.length !== b.length) return false;
  const counts = new Map<IngredientType, number>();
  for (const item of a) counts.set(item, (counts.get(item) ?? 0) + 1);
  for (const item of b) {
    const n = counts.get(item) ?? 0;
    if (n === 0) return false;
    counts.set(item, n - 1);
  }
  return true;
}

/** True when `input` exactly matches the known recipe (base + ingredients + finish). */
export function matchesRecipe(input: BrewInput, recipe: Recipe): boolean {
  return (
    input.base === recipe.base &&
    input.finish === recipe.finish &&
    sameIngredients(input.ingredients, recipe.ingredients)
  );
}

export interface BrewResult {
  /** Matched recipe id, or null for a Murky Brew (doc 02 §2.4). */
  recipeId: string | null;
  isMurky: boolean;
}

/**
 * Resolve a kettle load against the player's KNOWN recipes only. Unknown
 * recipes always produce Murky Brew even if the combo is "correct" on paper —
 * discovery-by-experiment is a post-M1 nicety and M1 has no experiment hints.
 */
export function resolveBrew(input: BrewInput, knownRecipeIds: readonly string[]): BrewResult {
  for (const id of knownRecipeIds) {
    const recipe = RECIPES_BY_ID.get(id);
    if (recipe && matchesRecipe(input, recipe)) {
      return { recipeId: recipe.id, isMurky: false };
    }
  }
  return { recipeId: null, isMurky: true };
}

/**
 * Price per doc 02 §4.1. The prose says "base 5 ¤ + 1 ¤ per extra ingredient"
 * and then gives concrete examples: Black Tea (water + 1 ingredient) = 6 ¤,
 * Ember Cocoa (2 ingredients) = 7 ¤ — so every ingredient counts as an extra
 * over the bare base; i.e. price = 5 + ingredient count.
 */
const DRINK_BASE_PRICE = 5;

export function drinkPrice(recipe: Recipe): number {
  return DRINK_BASE_PRICE + recipe.ingredients.length;
}
