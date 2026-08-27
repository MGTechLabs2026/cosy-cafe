// src/narrative/activity-events.ts — real player behavior events for narrative system
// Replaces heuristics with recorded events. Pure TypeScript, zero platform imports.

/** Player served a drink to an NPC */
export interface ServeEvent {
  type: 'serve';
  npcId: string;
  recipeId: string;
  favorite: boolean;
  correct: boolean;
  chatted: boolean;
  day: number;
  timestamp: number;
}

/** Player chatted with an NPC */
export interface ChatEvent {
  type: 'chat';
  npcId: string;
  day: number;
  timestamp: number;
}

/** Player brewed a recipe (including experimental/murky) */
export interface BrewEvent {
  type: 'brew';
  recipeId: string | null; // null if murky/experimental
  experimental: boolean;
  wrenMystery: boolean;
  day: number;
  timestamp: number;
}

/** Player discovered a new recipe */
export interface RecipeDiscoveredEvent {
  type: 'recipe_discovered';
  recipeId: string;
  source: 'brew' | 'teach' | 'hint' | 'wren';
  day: number;
  timestamp: number;
}

/** Player opened a journal tab */
export interface JournalOpenedEvent {
  type: 'journal_opened';
  tab: 'recipes' | 'regulars' | 'letters' | 'town';
  day: number;
  timestamp: number;
}

/** Player purchased an upgrade */
export interface UpgradePurchasedEvent {
  type: 'upgrade_purchased';
  upgradeId: string;
  day: number;
  timestamp: number;
}

/** Player skipped a day (sleep-in) */
export interface DaySkippedEvent {
  type: 'day_skipped';
  day: number;
  timestamp: number;
}

/** Player closed doors early while arrivals remained */
export interface EarlyCloseEvent {
  type: 'early_close';
  day: number;
  arrivalsRemaining: number;
  timestamp: number;
}

/** Player bought ingredients from shop */
export interface IngredientsPurchasedEvent {
  type: 'ingredients_purchased';
  ingredients: Record<string, number>;
  day: number;
  timestamp: number;
}

/** Player read a letter */
export interface LetterReadEvent {
  type: 'letter_read';
  letterId: string;
  day: number;
  timestamp: number;
}

/** Player dismissed a letter without reading */
export interface LetterDismissedEvent {
  type: 'letter_dismissed';
  letterId: string;
  day: number;
  timestamp: number;
}

/** Player completed a Wren mystery brew step */
export interface WrenMysteryBrewEvent {
  type: 'wren_mystery_brew';
  clueNumber: 1 | 2 | 3;
  day: number;
  timestamp: number;
}

/** Player visited Wren (served Wren's order) */
export interface WrenVisitEvent {
  type: 'wren_visit';
  recipeId: string;
  day: number;
  timestamp: number;
}

/** Union of all activity events */
export type ActivityEvent =
  | ServeEvent
  | ChatEvent
  | BrewEvent
  | RecipeDiscoveredEvent
  | JournalOpenedEvent
  | UpgradePurchasedEvent
  | DaySkippedEvent
  | EarlyCloseEvent
  | IngredientsPurchasedEvent
  | LetterReadEvent
  | LetterDismissedEvent
  | WrenMysteryBrewEvent
  | WrenVisitEvent;

/** Type guard helpers */
export function isServeEvent(e: ActivityEvent): e is ServeEvent { return e.type === 'serve'; }
export function isChatEvent(e: ActivityEvent): e is ChatEvent { return e.type === 'chat'; }
export function isBrewEvent(e: ActivityEvent): e is BrewEvent { return e.type === 'brew'; }
export function isRecipeDiscoveredEvent(e: ActivityEvent): e is RecipeDiscoveredEvent { return e.type === 'recipe_discovered'; }
export function isJournalOpenedEvent(e: ActivityEvent): e is JournalOpenedEvent { return e.type === 'journal_opened'; }
export function isUpgradePurchasedEvent(e: ActivityEvent): e is UpgradePurchasedEvent { return e.type === 'upgrade_purchased'; }
export function isDaySkippedEvent(e: ActivityEvent): e is DaySkippedEvent { return e.type === 'day_skipped'; }
export function isEarlyCloseEvent(e: ActivityEvent): e is EarlyCloseEvent { return e.type === 'early_close'; }
export function isIngredientsPurchasedEvent(e: ActivityEvent): e is IngredientsPurchasedEvent { return e.type === 'ingredients_purchased'; }
export function isLetterReadEvent(e: ActivityEvent): e is LetterReadEvent { return e.type === 'letter_read'; }
export function isLetterDismissedEvent(e: ActivityEvent): e is LetterDismissedEvent { return e.type === 'letter_dismissed'; }
export function isWrenMysteryBrewEvent(e: ActivityEvent): e is WrenMysteryBrewEvent { return e.type === 'wren_mystery_brew'; }
export function isWrenVisitEvent(e: ActivityEvent): e is WrenVisitEvent { return e.type === 'wren_visit'; }