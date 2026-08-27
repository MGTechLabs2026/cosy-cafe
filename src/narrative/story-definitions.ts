// src/narrative/story-definitions.ts — narrative content definitions
// All narrative content data: letters, chapters, endings, trajectories
// Pure content/data layer. No SaveData, no game state, no UI.

import type { NarrativeState } from './narrative-state.js';

export type NarrativeDimension =
  | 'care'
  | 'curiosity'
  | 'community'
  | 'comfort'
  | 'independence';

export type NarrativeChapter = 0 | 1 | 2 | 3 | 4 | 5;

export type LetterSource =
  | 'marigold'
  | 'fenwick'
  | 'sela'
  | 'bram'
  | 'nia'
  | 'wren'
  | 'town'
  | 'mystery';

export type LetterCategory =
  | 'mandatory'
  | 'npc'
  | 'town'
  | 'mystery'
  | 'branch'
  | 'reactive';

export type EndingId = 'keeper' | 'builder' | 'wanderer' | 'community';

export interface LetterRequirements {
  day_min?: number;
  day_max?: number;
  chapter_min?: number;
  chapter_max?: number;
  hearts_min?: Record<string, number>;
  dimension_min?: Partial<Record<NarrativeDimension, number>>;
  flags_required?: string[];
  flags_forbidden?: string[];
  scenes_seen?: string[];
  recipes_discovered?: number | string[]; // number = minimum count, string[] = specific recipes
  upgrades_owned?: string[];
  min_stars?: number;
  min_upgrades?: number;
  min_days_skipped?: number;
}

export interface NarrativeLetter {
  id: string;
  source: LetterSource;
  chapter: NarrativeChapter;
  category: LetterCategory;
  requires: LetterRequirements;
  priority: number;
  cooldown_days?: number;
  max_per_chapter?: number;
  mandatory: boolean;
  skippable: boolean;
  consumed: boolean;
  sets_flags?: string[];
  unlocks_letters?: string[];
  content_id: string;
}

export interface ChapterConfig {
  id: NarrativeChapter;
  days: [number, number];
  focus: string;
  mandatory_beats: string[];
  convergence_required: boolean;
}

export interface EndingConfig {
  id: EndingId;
  theme: string;
  min_dimensions: Partial<Record<NarrativeDimension, number>>;
  min_stars?: number;
  min_upgrades?: number;
  min_days_skipped?: number;
  required_flags?: string[];
  required_arcs?: string[];
  tiebreaker_dimension: NarrativeDimension;
  final_scene: string;
  final_letter: string;
  cafe_state: string;
  replay_implication: string;
}

// ============================================================
// LETTER DEFINITIONS
// ============================================================

export const ALL_LETTERS: readonly NarrativeLetter[] = [
  // ---- MANDATORY MARIGOLD LETTERS (3) ----
  {
    id: 'marigold_ch0_welcome',
    source: 'marigold',
    chapter: 0,
    category: 'mandatory',
    requires: { day_min: 1, day_max: 2, chapter_min: 0, chapter_max: 0 },
    priority: 100,
    mandatory: true,
    skippable: true,
    consumed: true,
    sets_flags: ['marigold_ch0_welcome_delivered'],
    content_id: 'letters.marigold.ch0.welcome',
  },
  {
    id: 'marigold_ch2_revelation',
    source: 'marigold',
    chapter: 2,
    category: 'mandatory',
    requires: { day_min: 7, day_max: 7, chapter_min: 2, chapter_max: 2 },
    priority: 100,
    mandatory: true,
    skippable: true,
    consumed: true,
    sets_flags: ['marigold_ch2_revelation_delivered'],
    content_id: 'letters.marigold.ch2.revelation',
  },
  {
    id: 'marigold_ch4_final',
    source: 'marigold',
    chapter: 4,
    category: 'mandatory',
    requires: { day_min: 11, day_max: 11, chapter_min: 4, chapter_max: 4 },
    priority: 100,
    mandatory: true,
    skippable: true,
    consumed: true,
    sets_flags: ['marigold_ch4_final_delivered'],
    content_id: 'letters.marigold.ch4.final',
  },

  // ---- NPC LETTERS (6 per NPC = 30 total, implementing subset) ----
  // FENWICK
  {
    id: 'fenwick_ch1_intro',
    source: 'fenwick',
    chapter: 1,
    category: 'npc',
    requires: { day_min: 3, day_max: 5, chapter_min: 1, hearts_min: { fenwick: 1 } },
    priority: 80,
    mandatory: false,
    skippable: true,
    consumed: true,
    sets_flags: ['fenwick_ch1_intro_delivered'],
    content_id: 'letters.fenwick.ch1.intro',
  },
  {
    id: 'fenwick_memory_promise',
    source: 'fenwick',
    chapter: 2,
    category: 'branch',
    requires: { day_min: 5, day_max: 7, chapter_min: 2, dimension_min: { care: 0.6 } },
    priority: 85,
    mandatory: false,
    skippable: true,
    consumed: true,
    sets_flags: ['fenwick_memory_promise_delivered'],
    content_id: 'letters.fenwick.ch2.memory_promise',
  },
  {
    id: 'fenwick_ch3_reflection',
    source: 'fenwick',
    chapter: 3,
    category: 'npc',
    requires: { day_min: 8, day_max: 10, chapter_min: 3, hearts_min: { fenwick: 3 } },
    priority: 75,
    mandatory: false,
    skippable: true,
    consumed: true,
    sets_flags: ['fenwick_ch3_reflection_delivered'],
    content_id: 'letters.fenwick.ch3.reflection',
  },

  // SELA
  {
    id: 'sela_ch1_intro',
    source: 'sela',
    chapter: 1,
    category: 'npc',
    requires: { day_min: 3, day_max: 5, chapter_min: 1, hearts_min: { sela: 1 } },
    priority: 80,
    mandatory: false,
    skippable: true,
    consumed: true,
    sets_flags: ['sela_ch1_intro_delivered'],
    content_id: 'letters.sela.ch1.intro',
  },
  {
    id: 'sela_belonging_offer',
    source: 'sela',
    chapter: 2,
    category: 'branch',
    requires: { day_min: 6, day_max: 8, chapter_min: 2, dimension_min: { community: 0.5 } },
    priority: 85,
    mandatory: false,
    skippable: true,
    consumed: true,
    sets_flags: ['sela_belonging_offer_delivered'],
    content_id: 'letters.sela.ch2.belonging_offer',
  },

  // WREN
  {
    id: 'wren_ch1_intro',
    source: 'wren',
    chapter: 1,
    category: 'npc',
    requires: { day_min: 2, day_max: 4, chapter_min: 1, hearts_min: { wren: 0 } },
    priority: 80,
    mandatory: false,
    skippable: true,
    consumed: true,
    sets_flags: ['wren_ch1_intro_delivered'],
    content_id: 'letters.wren.ch1.intro',
  },
  {
    id: 'wren_first_clue_letter',
    source: 'wren',
    chapter: 2,
    category: 'branch',
    requires: { day_min: 4, day_max: 5, chapter_min: 2, dimension_min: { curiosity: 0.4 } },
    priority: 90,
    mandatory: false,
    skippable: true,
    consumed: true,
    sets_flags: ['wren_first_clue_letter_delivered'],
    content_id: 'letters.wren.ch2.first_clue',
  },
  {
    id: 'wren_childhood_photo',
    source: 'wren',
    chapter: 3,
    category: 'branch',
    requires: { day_min: 8, day_max: 10, chapter_min: 3, dimension_min: { care: 0.5 }, scenes_seen: ['wren_scene2'] },
    priority: 85,
    mandatory: false,
    skippable: true,
    consumed: true,
    sets_flags: ['wren_childhood_photo_delivered'],
    content_id: 'letters.wren.ch3.childhood_photo',
  },

  // BRAM
  {
    id: 'bram_ch1_intro',
    source: 'bram',
    chapter: 1,
    category: 'npc',
    requires: { day_min: 3, day_max: 5, chapter_min: 1, hearts_min: { bram: 1 } },
    priority: 80,
    mandatory: false,
    skippable: true,
    consumed: true,
    sets_flags: ['bram_ch1_intro_delivered'],
    content_id: 'letters.bram.ch1.intro',
  },
  {
    id: 'bram_renovation_offer',
    source: 'bram',
    chapter: 3,
    category: 'branch',
    requires: { day_min: 9, day_max: 11, chapter_min: 3, hearts_min: { bram: 2 }, upgrades_owned: ['hearth_expansion'] },
    priority: 85,
    mandatory: false,
    skippable: true,
    consumed: true,
    sets_flags: ['bram_renovation_offer_delivered'],
    content_id: 'letters.bram.ch3.renovation_offer',
  },

  // NIA
  {
    id: 'nia_ch1_intro',
    source: 'nia',
    chapter: 1,
    category: 'npc',
    requires: { day_min: 3, day_max: 5, chapter_min: 1, hearts_min: { nia: 1 } },
    priority: 80,
    mandatory: false,
    skippable: true,
    consumed: true,
    sets_flags: ['nia_ch1_intro_delivered'],
    content_id: 'letters.nia.ch1.intro',
  },

  // ---- TOWN LETTERS (4) ----
  {
    id: 'town_ch1_welcome',
    source: 'town',
    chapter: 1,
    category: 'town',
    requires: { day_min: 3, day_max: 5, chapter_min: 1, dimension_min: { community: 0.3 } },
    priority: 60,
    mandatory: false,
    skippable: true,
    consumed: true,
    sets_flags: ['town_ch1_welcome_delivered'],
    content_id: 'letters.town.ch1.welcome',
  },
  {
    id: 'town_ch3_market_day',
    source: 'town',
    chapter: 3,
    category: 'town',
    requires: { day_min: 8, day_max: 10, chapter_min: 3, dimension_min: { community: 0.5 } },
    priority: 70,
    mandatory: false,
    skippable: true,
    consumed: true,
    sets_flags: ['town_ch3_market_day_delivered'],
    content_id: 'letters.town.ch3.market_day',
  },
  {
    id: 'town_ch3_council_proposal',
    source: 'town',
    chapter: 3,
    category: 'branch',
    requires: { day_min: 8, day_max: 10, chapter_min: 3, min_stars: 3, min_upgrades: 3 },
    priority: 75,
    mandatory: false,
    skippable: true,
    consumed: true,
    sets_flags: ['town_ch3_council_proposal_delivered'],
    content_id: 'letters.town.ch3.council_proposal',
  },

  // ---- MYSTERY LETTERS (5) ----
  {
    id: 'mystery_ch1_strange_note',
    source: 'mystery',
    chapter: 1,
    category: 'mystery',
    requires: { day_min: 2, day_max: 4, chapter_min: 1, flags_required: ['marigold_ch0_welcome_delivered'] },
    priority: 70,
    mandatory: false,
    skippable: true,
    consumed: true,
    sets_flags: ['mystery_ch1_strange_note_delivered', 'wren_clue_1'],
    content_id: 'letters.mystery.ch1.strange_note',
  },
  {
    id: 'mystery_ch2_ledger_hint',
    source: 'mystery',
    chapter: 2,
    category: 'mystery',
    requires: { day_min: 5, day_max: 7, chapter_min: 2, flags_required: ['marigold_ch2_revelation_delivered'] },
    priority: 75,
    mandatory: false,
    skippable: true,
    consumed: true,
    sets_flags: ['mystery_ch2_ledger_hint_delivered', 'wren_clue_2'],
    content_id: 'letters.mystery.ch2.ledger_hint',
  },
  {
    id: 'mystery_ch3_basement_key',
    source: 'mystery',
    chapter: 3,
    category: 'branch',
    requires: { day_min: 10, day_max: 11, chapter_min: 3, dimension_min: { curiosity: 0.6 }, scenes_seen: ['wren_scene3'] },
    priority: 80,
    mandatory: false,
    skippable: true,
    consumed: true,
    sets_flags: ['mystery_ch3_basement_key_delivered', 'wren_clue_3'],
    content_id: 'letters.mystery.ch3.basement_key',
  },

  // ---- BRANCH LETTERS (trajectory-specific) ----
  {
    id: 'marigold_hidden_recipe_note',
    source: 'marigold',
    chapter: 2,
    category: 'branch',
    requires: { day_min: 6, day_max: 8, chapter_min: 2, recipes_discovered: 5 },
    priority: 70,
    mandatory: false,
    skippable: true,
    consumed: true,
    sets_flags: ['marigold_hidden_recipe_note_delivered'],
    content_id: 'letters.marigold.ch2.hidden_recipe',
  },

  // ---- REACTIVE/FLAVOR LETTERS ----
  {
    id: 'reactive_murky_brew_tip',
    source: 'mystery',
    chapter: 0,
    category: 'reactive',
    requires: { flags_required: [], flags_forbidden: ['reactive_murky_brew_tip_delivered'] },
    priority: 10,
    cooldown_days: 3,
    mandatory: false,
    skippable: true,
    consumed: true,
    sets_flags: ['reactive_murky_brew_tip_delivered'],
    content_id: 'letters.reactive.murky_brew_tip',
  },
  {
    id: 'reactive_ingredient_low',
    source: 'town',
    chapter: 0,
    category: 'reactive',
    requires: { flags_forbidden: ['reactive_ingredient_low_delivered'] },
    priority: 15,
    cooldown_days: 2,
    mandatory: false,
    skippable: true,
    consumed: true,
    sets_flags: ['reactive_ingredient_low_delivered'],
    content_id: 'letters.reactive.ingredient_low',
  },
];

// ============================================================
// CHAPTER CONFIGURATIONS
// ============================================================

export const CHAPTER_CONFIGS: readonly ChapterConfig[] = [
  {
    id: 0,
    days: [1, 2],
    focus: 'Inheritance, first day, Marigold Letter 1',
    mandatory_beats: ['marigold_ch0_welcome', 'first_service', 'fenwick_teaches_r003'],
    convergence_required: true,
  },
  {
    id: 1,
    days: [3, 4],
    focus: 'Regulars reveal themselves, Wren mystery',
    mandatory_beats: ['sela_intro', 'bram_intro', 'nia_intro', 'wren_scene1'],
    convergence_required: false,
  },
  {
    id: 2,
    days: [5, 7],
    focus: 'First narrative branch, Marigold Letter 2',
    mandatory_beats: ['marigold_ch2_revelation', 'fenwick_scene2'],
    convergence_required: false,
  },
  {
    id: 3,
    days: [8, 10],
    focus: 'Mystery deepens, weekly delivery, Wren scenes 2-3',
    mandatory_beats: ['weekly_delivery', 'wren_scene2', 'wren_scene3'],
    convergence_required: false,
  },
  {
    id: 4,
    days: [11, 12],
    focus: 'Major revelation, Wren scenes 4-5, Marigold Letter 3',
    mandatory_beats: ['wren_scene4', 'wren_scene5', 'marigold_ch4_final'],
    convergence_required: true,
  },
  {
    id: 5,
    days: [13, 14],
    focus: 'Ending evaluation, final choice',
    mandatory_beats: ['ending_evaluation', 'final_choice'],
    convergence_required: true,
  },
];

// ============================================================
// ENDING CONFIGURATIONS
// ============================================================

export const ENDING_CONFIGS: readonly EndingConfig[] = [
  {
    id: 'keeper',
    theme: 'Belonging / Continuity',
    min_dimensions: { care: 0.5, community: 0.4 },
    required_arcs: ['fenwick_arc_complete'],
    tiebreaker_dimension: 'care',
    final_scene: 'marigold_chair_at_window',
    final_letter: 'letters.ending.keeper',
    cafe_state: 'Unchanged, cozy',
    replay_implication: 'New Game+ preserves relationships',
  },
  {
    id: 'builder',
    theme: 'Competence / Creation',
    min_dimensions: { comfort: 0.6 },
    min_stars: 4,
    min_upgrades: 4,
    tiebreaker_dimension: 'comfort',
    final_scene: 'new_shelf_window_hearth',
    final_letter: 'letters.ending.builder',
    cafe_state: 'Upgraded, expanded',
    replay_implication: 'New Game+ starts with 1 upgrade',
  },
  {
    id: 'wanderer',
    theme: 'Autonomy / Independence',
    min_dimensions: { independence: 0.5 },
    min_days_skipped: 3,
    required_arcs: ['wren_arc_complete'],
    tiebreaker_dimension: 'independence',
    final_scene: 'door_sign_closed',
    final_letter: 'letters.ending.wanderer',
    cafe_state: 'Preserved, quiet',
    replay_implication: 'New Game+ unlocks Traveler+ mode',
  },
  {
    id: 'community',
    theme: 'Community / Legacy',
    min_dimensions: { community: 0.6 },
    required_flags: ['town_ch3_market_day_delivered', 'sela_ch1_intro_delivered', 'bram_ch1_intro_delivered', 'nia_ch1_intro_delivered'],
    tiebreaker_dimension: 'community',
    final_scene: 'townsfolk_gathered',
    final_letter: 'letters.ending.community',
    cafe_state: 'Community board active',
    replay_implication: 'New Game+ unlocks Multiplayer hooks',
  },
];

// ============================================================
// TRAJECTORY RULES (for documentation/reference)
// ============================================================

export interface TrajectoryRule {
  id: 'care' | 'comfort' | 'curiosity' | 'community' | 'independence';
  name: string;
  primary_dimensions: NarrativeDimension[];
  letter_emphasis_order: LetterSource[];
  key_branch_letters: string[];
}

export const TRAJECTORY_RULES: readonly TrajectoryRule[] = [
  {
    id: 'care',
    name: 'Relationship-First',
    primary_dimensions: ['care', 'community'],
    letter_emphasis_order: ['fenwick', 'sela', 'wren', 'bram', 'nia', 'marigold', 'town', 'mystery'],
    key_branch_letters: ['fenwick_memory_promise', 'sela_belonging_offer', 'wren_childhood_photo'],
  },
  {
    id: 'comfort',
    name: 'Café-First',
    primary_dimensions: ['comfort'],
    letter_emphasis_order: ['marigold', 'town', 'fenwick', 'sela', 'bram', 'nia', 'wren', 'mystery'],
    key_branch_letters: ['marigold_ledger_found', 'town_ch3_council_proposal', 'bram_renovation_offer'],
  },
  {
    id: 'curiosity',
    name: 'Curiosity-First',
    primary_dimensions: ['curiosity', 'independence'],
    letter_emphasis_order: ['mystery', 'wren', 'marigold', 'town', 'fenwick', 'sela', 'bram', 'nia'],
    key_branch_letters: ['wren_first_clue_letter', 'marigold_hidden_recipe_note', 'mystery_ch3_basement_key'],
  },
];

// ============================================================
// HELPER FUNCTIONS
// ============================================================

export function getLetterById(id: string): NarrativeLetter | undefined {
  return ALL_LETTERS.find(l => l.id === id);
}

export function getLettersBySource(source: LetterSource): readonly NarrativeLetter[] {
  return ALL_LETTERS.filter(l => l.source === source);
}

export function getLettersByCategory(category: LetterCategory): readonly NarrativeLetter[] {
  return ALL_LETTERS.filter(l => l.category === category);
}

export function getLettersByChapter(chapter: NarrativeChapter): readonly NarrativeLetter[] {
  return ALL_LETTERS.filter(l => l.chapter === chapter);
}

export function getMandatoryLetters(): readonly NarrativeLetter[] {
  return ALL_LETTERS.filter(l => l.mandatory);
}

export function getChapterConfig(chapter: NarrativeChapter): ChapterConfig | undefined {
  return CHAPTER_CONFIGS.find(c => c.id === chapter);
}

export function getEndingConfig(ending: EndingId): EndingConfig | undefined {
  return ENDING_CONFIGS.find(e => e.id === ending);
}

export function getAllEndingIds(): EndingId[] {
  return ENDING_CONFIGS.map(e => e.id);
}