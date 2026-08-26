// data/recipes.ts — kettle-facing recipe metadata (names resolve via strings.json)
// Content lives here so writers can tune without touching sim logic.

import type { BaseType, FinishType, IngredientType } from '../sim/brewing.js';
import { RECIPES, getRecipe } from '../sim/brewing.js';
import { STRINGS } from './strings.js';

export interface RecipeView {
  id: string;
  name: string; // resolved display name
  icon: string; // /assets/items/*.png
  combo: string; // human-readable combo summary
}

export { RECIPES as ALL_RECIPES };

/** Every recipe id r001–r008 now has a strings entry + icon path. */
type KnownRecipeKey =
  | 'r001'
  | 'r002'
  | 'r003'
  | 'r004'
  | 'r005'
  | 'r006'
  | 'r007'
  | 'r008';

const KNOWN_RECIPE_KEYS: readonly KnownRecipeKey[] = [
  'r001',
  'r002',
  'r003',
  'r004',
  'r005',
  'r006',
  'r007',
  'r008',
];

/** Resolve a recipe row into display form using current strings. */
export function recipeToView(id: string): RecipeView | null {
  const recipe = getRecipe(id);
  if (!recipe) return null;
  const key = recipe.id.toLowerCase() as KnownRecipeKey;
  if (!KNOWN_RECIPE_KEYS.includes(key)) return null;
  return {
    id: recipe.id,
    name: STRINGS.recipes[key].name,
    icon: `/assets/items/${recipe.icon}`,
    combo: comboLabel(recipe.base, recipe.ingredients, recipe.finish),
  };
}

export function comboLabel(
  base: BaseType,
  ingredients: readonly IngredientType[],
  finish: FinishType,
): string {
  const parts = [ingredientLabel(base), ...ingredients.map(ingredientLabel)];
  let label = parts.join(' + ');
  if (finish !== 'hot') label += `, ${finish}`;
  return label;
}

export function ingredientLabel(id: IngredientType | BaseType): string {
  const key = id as keyof typeof STRINGS.ingredients;
  const label = STRINGS.ingredients[key];
  return typeof label === 'string' ? label : id;
}
