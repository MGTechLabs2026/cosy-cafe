// Integration test: the runtime narrative wiring (src/narrative/runtime.ts)
// actually drives the existing schedulers from SaveData. Covers the Batch-2
// QA matrix from docs/10-chrome-mvp-qa-report.md (BUG-01).
//
// These tests do NOT mock the narrative modules — they exercise the real
// LetterScheduler / NarrativeScheduler through advanceNarrative(), proving the
// schedulers are instantiated and called from the runtime lifecycle.

import { describe, it, expect } from 'vitest';
import { freshSave } from '../src/save/store.js';
import type { SaveData } from '../src/save/validate.js';
import {
  advanceNarrative,
  chapterForDay,
  evaluateEndingForRun,
  recordEnding,
} from '../src/narrative/runtime.js';
import type { EndingId } from '../src/narrative/story-definitions.js';
import {
  createNarrativeInput,
  createLetterContext,
} from '../src/narrative/narrative-input.js';
import { evaluateNarrativeStateFromInput } from '../src/narrative/narrative-state.js';
import { LetterScheduler } from '../src/narrative/letter-scheduler.js';
import { ALL_LETTERS, TRAJECTORY_RULES } from '../src/narrative/story-definitions.js';

// Helper: build a fresh save at a given day with optional mutations.
function makeSave(day: number, mutate?: (s: SaveData) => void): SaveData {
  const s = freshSave();
  s.day = day;
  mutate?.(s);
  return s;
}

// Helper: letter ids eligible under the real scheduler for a save.
// Mirrors advanceNarrative step 1: the runtime advances the chapter from the
// day BEFORE it builds the input, so eligibility is evaluated at the real
// active chapter.
function eligibleIds(save: SaveData): string[] {
  save.flags.current_chapter = chapterForDay(save.day);
  const input = createNarrativeInput(save as never);
  const state = evaluateNarrativeStateFromInput(input);
  const ctx = createLetterContext(input);
  const scheduler = new LetterScheduler(ALL_LETTERS, TRAJECTORY_RULES);
  return scheduler.getEligibleLetters(state, ctx).map((l) => l.id);
}

describe('chapterForDay (deterministic day → chapter)', () => {
  it('maps CHAPTER_CONFIGS day-ranges', () => {
    expect(chapterForDay(1)).toBe(0);
    expect(chapterForDay(2)).toBe(0);
    expect(chapterForDay(3)).toBe(1);
    expect(chapterForDay(4)).toBe(1);
    expect(chapterForDay(5)).toBe(2);
    expect(chapterForDay(7)).toBe(2);
    expect(chapterForDay(11)).toBe(4);
    expect(chapterForDay(13)).toBe(5);
    expect(chapterForDay(14)).toBe(5);
  });
});

describe('BUG-01: runtime wires LetterScheduler into the morning lifecycle', () => {
  it('Test 1 — Day 1 delivers the mandatory Marigold welcome letter', () => {
    const save = makeSave(1);
    const result = advanceNarrative(save);
    expect(result.deliveredLetters).toContain('marigold_ch0_welcome');
    // Persisted into the mail archive + delivered set.
    expect(save.letters).toContain('marigold_ch0_welcome');
    expect(save.flags.letters_delivered).toContain('marigold_ch0_welcome');
    expect(save.flags.pending_narrative_letters).toContain('marigold_ch0_welcome');
  });

  it('Test 2 — Day 7 delivers the mandatory Marigold chapter-2 revelation', () => {
    const save = makeSave(7);
    const result = advanceNarrative(save);
    expect(result.deliveredLetters).toContain('marigold_ch2_revelation');
    expect(save.flags.current_chapter).toBe(2);
  });

  it('Test 3 — Day 11 delivers the mandatory Marigold chapter-4 final letter', () => {
    const save = makeSave(11);
    const result = advanceNarrative(save);
    expect(result.deliveredLetters).toContain('marigold_ch4_final');
    expect(save.flags.current_chapter).toBe(4);
  });

  it('Test 4 — repeating a morning never delivers the same letter twice', () => {
    const save = makeSave(1);
    const first = advanceNarrative(save);
    const second = advanceNarrative(save);
    // The mandatory welcome letter is never re-delivered.
    expect(first.deliveredLetters).toContain('marigold_ch0_welcome');
    expect(second.deliveredLetters).not.toContain('marigold_ch0_welcome');
    // No letter id appears more than once in the archive or delivered set.
    expect(new Set(save.letters).size).toBe(save.letters.length);
    expect(new Set(save.flags.letters_delivered).size).toBe(save.flags.letters_delivered.length);
  });
});

describe('BUG-01: narrative STATE affects eligible content (no personality from skipped days)', () => {
  it('Test 5 — relationship-heavy behavior unlocks a care-gated letter the low-engagement run never sees', () => {
    // High-relationship save: every regular has 2 displayed hearts, chats, prefs,
    // and real serve activity recorded in the activity ledger (the counters the
    // narrative layer actually reads — see createNarrativeInput).
    const relationship = makeSave(6, (s) => {
      s.hearts = { fenwick: 2, sela: 2, bram: 2, nia: 2, wren: 2 };
      s.heart_points_today = { fenwick: 0.25, sela: 0.25, bram: 0.25, nia: 0.25, wren: 0.25 };
      s.flags.learned_prefs = ['fp1', 'fp2', 'fp3', 'fp4', 'fp5'];
      s.flags.activity_total_serves = 5;
      s.flags.activity_total_chats = 5;
      s.flags.activity_favorite_serves = 5;
    });
    // Low-engagement save: fresh, no hearts / no activity.
    const low = makeSave(6);

    const relState = evaluateNarrativeStateFromInput(createNarrativeInput(relationship as never));
    const lowState = evaluateNarrativeStateFromInput(createNarrativeInput(low as never));
    expect(relState.dimensions.care).toBeGreaterThan(lowState.dimensions.care);

    // fenwick_memory_promise (care ≥ 0.6, ch2, day 5–7) is eligible only for the relationship run.
    expect(eligibleIds(relationship)).toContain('fenwick_memory_promise');
    expect(eligibleIds(low)).not.toContain('fenwick_memory_promise');

    const relResult = advanceNarrative(relationship);
    expect(relResult.deliveredLetters).toContain('fenwick_memory_promise');
    const lowResult = advanceNarrative(low);
    expect(lowResult.deliveredLetters).not.toContain('fenwick_memory_promise');
  });

  it('Test 6 — curiosity-heavy behavior unlocks a curiosity-gated letter the low-engagement run never sees', () => {
    // Curiosity maxed via the three instrumented ratios: hinted recipes,
    // Wren scenes seen, and journal opens (letters read).
    const curiosity = makeSave(5, (s) => {
      s.flags.discovered_recipes = ['R004', 'R005', 'R006', 'R007'];
      s.flags.seen_scenes = [
        'wren_scene1', 'wren_scene2', 'wren_scene3',
        'wren_scene4', 'wren_scene5', 'wren_scene6',
      ];
      s.flags.letters_read = ['a', 'b', 'c', 'd', 'e', 'f'];
    });
    const low = makeSave(5);

    const curState = evaluateNarrativeStateFromInput(createNarrativeInput(curiosity as never));
    const lowState = evaluateNarrativeStateFromInput(createNarrativeInput(low as never));
    expect(curState.dimensions.curiosity).toBeGreaterThan(lowState.dimensions.curiosity);

    // wren_first_clue_letter (curiosity ≥ 0.4, ch2, day 4–5) is eligible only for the curiosity run.
    expect(eligibleIds(curiosity)).toContain('wren_first_clue_letter');
    expect(eligibleIds(low)).not.toContain('wren_first_clue_letter');

    const curResult = advanceNarrative(curiosity);
    expect(curResult.deliveredLetters).toContain('wren_first_clue_letter');
    const lowResult = advanceNarrative(low);
    expect(lowResult.deliveredLetters).not.toContain('wren_first_clue_letter');
  });
});

describe('BUG-01/03: ending evaluation is NO LONGER done at the morning (Batch 4 / BUG-03)', () => {
  it('Test 7 — advanceNarrative no longer evaluates the ending at the morning', () => {
    const save = makeSave(13);
    const result = advanceNarrative(save);
    // Chapter 5 reached by the morning lifecycle.
    expect(save.flags.current_chapter).toBe(5);
    // Ending evaluation was deliberately moved out of the morning: the runtime
    // must NOT pre-empt the Day-14 resolution, so it stays null here.
    expect(result.ending).toBeNull();
    expect(save.flags.ending_achieved).toBeUndefined();
    // The real ending is evaluated at the Day-14 recap via evaluateEndingForRun().
    const ending = evaluateEndingForRun(save);
    expect(ending).toBe('keeper'); // P1 neutral fallback for a quiet run
    expect((save.flags as unknown as Record<string, unknown>)['punished']).toBeUndefined();
  });

  it('ending is evaluated exactly once (idempotent across repeated recap resolutions)', () => {
    const save = makeSave(13);
    const first = evaluateEndingForRun(save);
    recordEnding(save, first as EndingId, 13);
    const afterFirst = save.flags.ending_achieved;
    const again = evaluateEndingForRun(save); // re-eval must return the resolved ending
    expect(again).toBe(afterFirst);
    expect(save.flags.ending_achieved).toBe(afterFirst);
  });
});
