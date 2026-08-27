/**
 * BUG-04 regression suite — Mandatory narrative beats / convergence letters.
 *
 * These tests exercise the REAL runtime delivery path:
 *   ActivityLedger -> NarrativeInput -> NarrativeEvaluator -> NarrativeState
 *   -> NarrativeScheduler -> LetterScheduler -> pending_narrative_letters
 *   -> SaveData.letters / flags.letters_delivered
 *
 * No LetterScheduler / NarrativeScheduler mocks: the full integration path is used.
 *
 * Ground truth established during the BUG-04 investigation (Phase 11, real
 * GameController drive): in a fresh sequential 14-day run the mandatory letters
 * deliver exactly as:
 *   Day 1  -> marigold_ch0_welcome
 *   Day 7  -> marigold_ch2_revelation
 *   Day 11 -> marigold_ch4_final
 * and the run resolves at Day 14.
 */
import { describe, it, expect } from 'vitest';
import { freshSave } from '../src/save/store.js';
import type { SaveData } from '../src/save/validate.js';
import { advanceNarrative } from '../src/narrative/runtime.js';
import { ALL_LETTERS } from '../src/narrative/story-definitions.js';

const MANDATORY = ALL_LETTERS.filter((l) => l.mandatory).map((l) => l.id);

/** Build a save at a given day with optional activity flags. */
function saveAtDay(day: number, flags: Record<string, unknown> = {}): SaveData {
  const s = freshSave();
  s.day = day;
  s.flags = { ...s.flags, ...flags };
  return s;
}

describe('BUG-04 mandatory beats — sequential delivery', () => {
  it('TEST 1: Day 1 delivers the mandatory opening narrative', () => {
    const s = saveAtDay(1);
    advanceNarrative(s);
    expect(s.flags.pending_narrative_letters).toContain('marigold_ch0_welcome');
    expect(s.letters).toContain('marigold_ch0_welcome');
    expect(s.flags.letters_delivered).toContain('marigold_ch0_welcome');
    expect(s.flags.letters_read).not.toContain('marigold_ch0_welcome');
  });

  it('TEST 2: Day 7 delivers the mandatory Marigold/revelation beat', () => {
    const s = saveAtDay(7);
    advanceNarrative(s);
    expect(s.flags.pending_narrative_letters).toContain('marigold_ch2_revelation');
    expect(s.letters).toContain('marigold_ch2_revelation');
    expect(s.flags.letters_delivered).toContain('marigold_ch2_revelation');
  });

  it('TEST 3: Day 11 delivers the mandatory final/convergence beat', () => {
    const s = saveAtDay(11);
    advanceNarrative(s);
    expect(s.flags.pending_narrative_letters).toContain('marigold_ch4_final');
    expect(s.letters).toContain('marigold_ch4_final');
    expect(s.flags.letters_delivered).toContain('marigold_ch4_final');
  });

  it('TEST 9: a sequential 14-day run delivers all three mandatory beats (deterministic)', () => {
    const s = freshSave();
    const delivered: string[] = [];
    for (let d = 1; d <= 14; d++) {
      const next = { ...s, day: d };
      advanceNarrative(next);
      for (const id of MANDATORY) {
        if (next.flags.pending_narrative_letters.includes(id) && !delivered.includes(id)) {
          delivered.push(id);
        }
      }
      Object.assign(s, next);
    }
    expect(delivered).toEqual(['marigold_ch0_welcome', 'marigold_ch2_revelation', 'marigold_ch4_final']);
  });
});

describe('BUG-04 mandatory beats — must not starve', () => {
  it('TEST 4: an eligible optional letter cannot block the mandatory Day-7 beat', () => {
    // Make an optional Day-7 branch letter eligible by discovering 5 recipes.
    const s = saveAtDay(7, { activity_discovered_recipes: ['R001', 'R002', 'R003', 'R004', 'R005'] });
    advanceNarrative(s);
    // The mandatory beat must be present and must be the one delivered.
    expect(s.flags.pending_narrative_letters).toContain('marigold_ch2_revelation');
    // Mandatory letters always outrank optional (priority +1000 in LetterScheduler).
    const sched = s.flags.pending_narrative_letters;
    expect(sched[0]).toBe('marigold_ch2_revelation');
  });

  it('TEST 7: low engagement still schedules the mandatory narrative', () => {
    // Default freshSave has zero activity — the calmest possible player.
    const s = saveAtDay(7);
    advanceNarrative(s);
    expect(s.flags.pending_narrative_letters).toContain('marigold_ch2_revelation');
  });

  it('TEST 8: early closing keeps the mandatory narrative eligible', () => {
    const s = saveAtDay(7, { activity_early_closes: 4 });
    advanceNarrative(s);
    expect(s.flags.pending_narrative_letters).toContain('marigold_ch2_revelation');
  });
});

describe('BUG-04 mandatory beats — persistence (refresh)', () => {
  it('TEST 5: a scheduled mandatory letter survives a save/reload exactly once', () => {
    const s = saveAtDay(7);
    advanceNarrative(s);
    expect(s.flags.pending_narrative_letters).toContain('marigold_ch2_revelation');
    // Round-trip through serialize/deserialize (the save layer's persistence contract).
    const raw = JSON.stringify(s);
    const reloaded = JSON.parse(raw) as SaveData;
    expect(reloaded.flags.pending_narrative_letters).toContain('marigold_ch2_revelation');
    expect(reloaded.letters.filter((x) => x === 'marigold_ch2_revelation')).toHaveLength(1);
  });

  it('TEST 6: reading a mandatory letter then re-advancing does not duplicate it', () => {
    const s = saveAtDay(7);
    advanceNarrative(s);
    expect(s.flags.pending_narrative_letters).toContain('marigold_ch2_revelation');
    // Simulate the mailbox marking it read (the real mailbox calls markLetterRead).
    s.flags.letters_read.push('marigold_ch2_revelation');
    s.flags.pending_narrative_letters = s.flags.pending_narrative_letters.filter(
      (x) => x !== 'marigold_ch2_revelation',
    );
    // Re-enter the same day's morning.
    advanceNarrative(s);
    // Must not re-add a second copy.
    expect(s.letters.filter((x) => x === 'marigold_ch2_revelation')).toHaveLength(1);
  });
});

describe('BUG-04 mandatory beats — story definitions are correct', () => {
  it('all three mandatory beats are defined with the intended day/chapter gates', () => {
    const byId = Object.fromEntries(ALL_LETTERS.map((l) => [l.id, l]));
    expect(byId.marigold_ch0_welcome).toMatchObject({
      mandatory: true,
      chapter: 0,
      requires: { day_min: 1, day_max: 2, chapter_min: 0, chapter_max: 0 },
    });
    expect(byId.marigold_ch2_revelation).toMatchObject({
      mandatory: true,
      chapter: 2,
      requires: { day_min: 7, day_max: 7, chapter_min: 2, chapter_max: 2 },
    });
    expect(byId.marigold_ch4_final).toMatchObject({
      mandatory: true,
      chapter: 4,
      requires: { day_min: 11, day_max: 11, chapter_min: 4, chapter_max: 4 },
    });
  });
});
