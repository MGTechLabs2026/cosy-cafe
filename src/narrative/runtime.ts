// src/narrative/runtime.ts — integration glue between the game lifecycle and
// the pure narrative modules (doc 10 BUG-01 / Batch 2).
//
// This module does NOT contain narrative rules. It:
//   1. advances the narrative chapter from the in-game day (deterministic,
//      day-driven — the chapter model in doc 09 §6),
//   2. builds the narrative read-model (NarrativeInput) from SaveData — the
//      single SaveData→narrative boundary lives in narrative-input.ts,
//   3. evaluates NarrativeState (pure),
//   4. runs the LetterScheduler to select the day's letter(s),
//   5. persists deliveries back into the save (mail archive + delivered set +
//      side-effect flags + a presentation queue for the future mailbox),
//   6. evaluates the ending once the run reaches chapter 5 (day ≥ 13).
//
// The DayController calls advanceNarrative() each morning. Idempotent per day:
// consumed letters are never re-selected.

import type { SaveData } from '../save/validate.js';
import type { ActivityLedger } from './activity-ledger.js';
import { createNarrativeInput, createLetterContext } from './narrative-input.js';
import { evaluateNarrativeStateFromInput, type NarrativeState } from './narrative-state.js';
import { LetterScheduler } from './letter-scheduler.js';
import { NarrativeScheduler } from './narrative-scheduler.js';
import {
  ALL_LETTERS,
  TRAJECTORY_RULES,
  CHAPTER_CONFIGS,
  ENDING_CONFIGS,
  type NarrativeChapter,
  type EndingId,
} from './story-definitions.js';

/** Deterministic day → chapter mapping from CHAPTER_CONFIGS (doc 09 §6). */
export function chapterForDay(day: number): NarrativeChapter {
  for (const c of CHAPTER_CONFIGS) {
    if (day >= c.days[0] && day <= c.days[1]) return c.id;
  }
  return 5;
}

export interface NarrativeDeliveryResult {
  /** Letter ids delivered this morning (empty unless a new one was selected). */
  deliveredLetters: string[];
  /** Active narrative chapter after advancement. */
  chapter: NarrativeChapter;
  /** Evaluated narrative state (dimensions, trajectory, etc.). */
  state: NarrativeState;
  /** Ending id if one was evaluated this morning, else null. */
  ending: EndingId | null;
}

/**
 * Advance the narrative for the current morning. Mutates `save` in place; the
 * caller persists it (autosave at recap). Safe to call once per morning.
 */
export function advanceNarrative(
  save: SaveData,
  _ledger?: ActivityLedger,
): NarrativeDeliveryResult {
  // --- 1. Chapter progression (forward-only, day-driven) -------------------
  const chapter = chapterForDay(save.day);
  if (chapter > (save.flags.current_chapter ?? 0)) {
    save.flags.current_chapter = chapter;
    if (save.flags.chapter_entered_day[chapter] === undefined) {
      save.flags.chapter_entered_day[chapter] = save.day;
    }
  }

  // --- 2. Build the narrative read-model (single SaveData boundary) ----------
  const input = createNarrativeInput(save as unknown as Parameters<typeof createNarrativeInput>[0]);

  // --- 3. Evaluate narrative state (pure) -----------------------------------
  const state = evaluateNarrativeStateFromInput(input);

  // --- 4 + 5. Letter scheduling + persistence -------------------------------
  const letterScheduler = new LetterScheduler(ALL_LETTERS, TRAJECTORY_RULES);
  const ctx = createLetterContext(input);
  const selections = letterScheduler.selectNextLetters(state, ctx, 1);

  const deliveredLetters: string[] = [];
  for (const sel of selections) {
    const def = ALL_LETTERS.find((l) => l.id === sel.letterId);
    if (!def) continue;
    // Guard: never re-deliver a consumed letter (idempotent per day).
    if (save.flags.letters_delivered.includes(def.id)) continue;

    // Persist into the mail archive + delivered set.
    if (!save.letters.includes(def.id)) save.letters.push(def.id);
    save.flags.letters_delivered.push(def.id);

    // Set the letter's side-effect flags (e.g. wren_clue_1).
    for (const f of def.sets_flags ?? []) {
      (save.flags as unknown as Record<string, unknown>)[f] = true;
    }

    // Queue for the future mailbox UI (Batch 3). Does NOT affect eligibility.
    if (!Array.isArray(save.flags.pending_narrative_letters)) {
      save.flags.pending_narrative_letters = [];
    }
    if (!save.flags.pending_narrative_letters.includes(def.id)) {
      save.flags.pending_narrative_letters.push(def.id);
    }

    deliveredLetters.push(def.id);
  }

  // --- 6. Ending evaluation (chapter 5 = days 13–14) ------------------------
  let ending: EndingId | null = null;
  if (save.day >= 13 && save.flags.current_chapter >= 5 && !save.flags.ending_achieved) {
    const scheduler = new NarrativeScheduler(CHAPTER_CONFIGS, ENDING_CONFIGS);
    const evaluated = scheduler.evaluateEnding(state, save.day);
    if (evaluated) {
      save.flags.ending_achieved = evaluated;
      save.flags.ending_day = save.day;
      ending = evaluated;
    }
  }

  return { deliveredLetters, chapter: save.flags.current_chapter as NarrativeChapter, state, ending };
}
