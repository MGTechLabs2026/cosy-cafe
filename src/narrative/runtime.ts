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
//   6. exposes the real EndingEvaluator (pure) for the Day-14 resolution and
//      records the chosen ending into the persisted StoryProgress flags.
//
// The DayController calls advanceNarrative() each morning. Idempotent per day:
// consumed letters are never re-selected. Ending evaluation is deliberately
// NOT performed here at the morning — it runs once, at the Day-14 recap, via
// evaluateEndingForRun() + recordEnding() (Batch 4 / BUG-03), so Day 15 never
// begins before the player sees their ending.

import type { SaveData } from '../save/validate.js';
import type { ActivityLedger } from './activity-ledger.js';
import { createNarrativeInput, createLetterContext } from './narrative-input.js';
import { evaluateNarrativeStateFromInput, type NarrativeState } from './narrative-state.js';
import { LetterScheduler } from './letter-scheduler.js';
import { NarrativeScheduler } from './narrative-scheduler.js';
import { EndingEvaluator } from './ending-evaluator.js';
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
    // Guard: consumed letters deliver exactly once, ever. Non-consumed letters
    // may re-deliver once their source cooldown has elapsed — the scheduler
    // enforces cooldown_days from letters_delivered_day before it gets here.
    const alreadyDelivered = save.flags.letters_delivered.includes(def.id);
    if (def.consumed && alreadyDelivered) continue;

    // Persist into the mail archive + delivered set (both deduped).
    if (!save.letters.includes(def.id)) save.letters.push(def.id);
    if (!alreadyDelivered) save.flags.letters_delivered.push(def.id);

    // Record delivery day for cooldown tracking (v7). Refreshed on every
    // (re-)delivery so the next cooldown window measures from the latest send.
    if (!save.flags.letters_delivered_day) save.flags.letters_delivered_day = {};
    save.flags.letters_delivered_day[def.id] = save.day;

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

  // --- 6. Ending evaluation is intentionally NOT done at the morning ------
  // It runs once at the Day-14 recap via evaluateEndingForRun() + recordEnding()
  // (Batch 4 / BUG-03). advanceNarrative() stays letter-only so the chapter-5
  // mornings (days 13–14) still deliver mail and never pre-empt the resolution.

  return {
    deliveredLetters,
    chapter: save.flags.current_chapter as NarrativeChapter,
    state,
    ending: save.flags.ending_achieved ?? null,
  };
}

/**
 * Evaluate the ending from the REAL runtime state at the Day-14 recap.
 *
 * Uses the existing, unit-tested `EndingEvaluator` (doc 09 §12) — the rules
 * live there, not in this controller glue. Determinism + the P1 neutral
 * fallback (keeper) are guaranteed by the evaluator, not re-implemented.
 *
 * Returns the persisted `ending_achieved` id if the run was already resolved
 * (idempotent — replaying the recap or a browser refresh must not re-roll).
 */
export function evaluateEndingForRun(save: SaveData): EndingId | null {
  // Already resolved (the resolution must survive a refresh — TEST 7).
  if (save.flags.ending_achieved) {
    return save.flags.ending_achieved;
  }

  // Build the narrative read-model (single SaveData boundary) and evaluate.
  const input = createNarrativeInput(save as unknown as Parameters<typeof createNarrativeInput>[0]);
  const state = evaluateNarrativeStateFromInput(input);

  const evaluator = new EndingEvaluator(ENDING_CONFIGS);
  const result = evaluator.evaluate(state, {
    chapter: save.flags.current_chapter ?? 0,
    stars: save.stars,
    completedArcs: buildCompletedArcs(save),
    flags: toBooleanFlags(save.flags),
    upgradesOwned: toBooleanMap(save.upgrades),
  });

  return result.ending;
}

/**
 * Persist the chosen ending into the StoryProgress flags (doc 10 §5).
 *
 * Writes exactly the existing persisted fields — no duplicates:
 *   - ending_achieved   (the selected EndingId)
 *   - ending_day        (the day of resolution)
 *   - previous_endings  (prior runs, for New Game+)
 *   - playthrough_count (incremented once per completed run)
 *
 * Idempotent: calling it again for the same run is a no-op (no duplicate
 * story progress, no duplicate ending — TEST 2).
 */
export function recordEnding(save: SaveData, ending: EndingId, day: number): void {
  if (save.flags.ending_achieved === ending && save.flags.ending_day === day) {
    return; // already recorded for this run
  }

  // First time this run reaches resolution → advance the playthrough counter
  // and append to the previous-endings list (before overwriting the current).
  if (!save.flags.ending_achieved) {
    save.flags.playthrough_count = (save.flags.playthrough_count ?? 0) + 1;
    if (typeof save.flags.ending_achieved === 'string') {
      save.flags.previous_endings.push(save.flags.ending_achieved);
    }
  }

  save.flags.ending_achieved = ending;
  save.flags.ending_day = day;
}

// ---- helpers: translate SaveData into the evaluator's progress shape -----

function toBooleanFlags(flags: SaveData['flags']): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(flags)) {
    if (typeof v === 'boolean') out[k] = v;
  }
  return out;
}

function toBooleanMap(upgrades: readonly string[]): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const u of upgrades) out[u] = true;
  return out;
}

/** Completed arcs, derived from the same source flags the save already stores. */
function buildCompletedArcs(save: SaveData): string[] {
  const arcs: string[] = [];
  if (save.flags.fenwick_arc_complete) arcs.push('fenwick_arc_complete');
  if (save.flags.wren_arc_complete) arcs.push('wren_arc_complete');
  return arcs;
}

