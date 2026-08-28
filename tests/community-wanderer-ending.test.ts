// tests/community-wanderer-ending.test.ts
// Phase 12/13 — Community + Wanderer path test matrix and runtime integration.
//
// These tests exercise the REAL narrative pipeline (no mocking of the key
// components):
//     ActivityLedger (record events)
//       -> narrative-input (SaveData -> ActivityCounters)
//       -> narrative-state (signals -> dimensions)
//       -> ending-evaluator (configs -> ending)
// plus the runtime's evaluateEndingForRun() glue.
//
// They prove both new endings are (a) reachable by genuine behavior,
// (b) NOT inflated by pacing (skipped days / early close / low chat), and
// (c) deterministic.

import { describe, it, expect } from 'vitest';
import { freshSave } from '../src/save/store.js';
import type { SaveData } from '../src/save/validate.js';
import { ActivityLedger } from '../src/narrative/activity-ledger.js';
import {
  recordServe,
  recordChat,
  recordSelfDirectedChoice,
  recordCommunityBeat,
} from '../src/narrative/activity-ledger.js';
import { evaluateEndingForRun } from '../src/narrative/runtime.js';
import type { EndingId } from '../src/narrative/story-definitions.js';

// Mirrors ProgressionController.snapshotIntoSave() — persists the ledger
// counters into the save flags the narrative layer actually reads.
function snapshotLedger(save: SaveData, ledger: ActivityLedger): void {
  const c = ledger.getCounters();
  save.flags.activity_total_serves = c.totalServes;
  save.flags.activity_favorite_serves = c.favoriteServeCount;
  save.flags.activity_serves_by_npc = { ...c.servesByNpc };
  save.flags.activity_total_chats = c.totalChats;
  save.flags.activity_chats_by_npc = { ...c.chatsByNpc };
  save.flags.activity_journal_opens_by_tab = { ...c.journalOpensByTab };
  save.flags.activity_letters_read = c.lettersReadCount;
  save.flags.activity_wren_visits = c.wrenVisits;
  save.flags.activity_wren_mystery_clues = c.wrenMysteryClues;
  save.flags.activity_independent_choices = c.independentChoiceCount;
  save.flags.activity_community_beats = c.communityBeatCount;
  save.flags.activity_version = c.version;
}

// A freshly-opened café at the last day of the run.
function endSave(mutate?: (s: SaveData, ledger: ActivityLedger) => void): SaveData {
  const save = freshSave();
  save.day = 14;
  save.flags.current_chapter = 5;
  const ledger = new ActivityLedger();
  mutate?.(save, ledger);
  snapshotLedger(save, ledger);
  return save;
}

// Helper: record a normal correct serve for an NPC on a given day.
function serve(ledger: ActivityLedger, npcId: string, day: number): void {
  recordServe(ledger, { npcId, recipeId: 'R001', favorite: false, correct: true, chatted: true, day });
}

describe('WANDERER — independence comes from intentional behavior', () => {
  it('no independence choices => independence stays low', () => {
    const save = endSave((s, ledger) => {
      // A calm, quiet player: a few serves, one Wren visit, no self-directed beat.
      serve(ledger, 'wren', 3);
      s.flags.wren_arc_complete = true;
    });
    const result = evaluateEndingForRun(save);
    // independence dimension is 0 (no self_directed_choice recorded)
    expect(result).not.toBe('wanderer');
  });

  it('one legitimate independent choice WITH old-road flag => Wanderer qualifies (non-grindy)', () => {
    const save = endSave((s, ledger) => {
      recordSelfDirectedChoice(ledger, { beatId: 'wren_scene3_old_road', day: 8 });
      s.flags.chose_old_road = true;
      // Note: wren_arc_complete is intentionally NOT required (non-grindy).
    });
    const result = evaluateEndingForRun(save);
    // One deliberate beat = 0.5 independence, clears the 0.25 threshold.
    expect(result).toBe('wanderer');
  });

  it('one legitimate independent choice WITHOUT the old-road flag => not Wanderer (flag gate)', () => {
    const save = endSave((s, ledger) => {
      recordSelfDirectedChoice(ledger, { beatId: 'wren_scene3_old_road', day: 8 });
      // chose_old_road flag not set -> the beat alone is not enough
    });
    const result = evaluateEndingForRun(save);
    expect(result).not.toBe('wanderer');
  });

  it('several independent choices => Wanderer becomes eligible', () => {
    const save = endSave((s, ledger) => {
      recordSelfDirectedChoice(ledger, { beatId: 'wren_scene3_old_road', day: 8 });
      recordSelfDirectedChoice(ledger, { beatId: 'wren_scene4_path', day: 10 });
      s.flags.chose_old_road = true;
    });
    const result = evaluateEndingForRun(save);
    expect(result).toBe('wanderer');
  });

  it('skipped days => independence unchanged (pacing is neutral)', () => {
    const save = endSave((s, ledger) => {
      // Skip several days but take NO self-directed beat.
      for (let i = 0; i < 5; i++) ledger.record({ type: 'day_skipped', day: i, timestamp: i });
      s.flags.wren_arc_complete = true;
      s.flags.chose_old_road = true; // flag alone without the dimension must not qualify
    });
    // chose_old_road flag set but the independence dimension is still 0
    const result = evaluateEndingForRun(save);
    expect(result).not.toBe('wanderer');
  });

  it('early close => independence unchanged', () => {
    const save = endSave((s, ledger) => {
      ledger.record({ type: 'early_close', day: 2, arrivalsRemaining: 1, timestamp: 2 });
      s.flags.chose_old_road = true;
      s.flags.wren_arc_complete = true;
    });
    const result = evaluateEndingForRun(save);
    expect(result).not.toBe('wanderer');
  });

  it('low chat => independence unchanged', () => {
    const save = endSave((s, ledger) => {
      serve(ledger, 'wren', 3);
      s.flags.wren_arc_complete = true;
    });
    const result = evaluateEndingForRun(save);
    expect(result).not.toBe('wanderer');
  });

  it('Wren arc + independence behavior => Wanderer qualifies', () => {
    const save = endSave((s, ledger) => {
      recordSelfDirectedChoice(ledger, { beatId: 'wren_scene3_old_road', day: 8 });
      recordSelfDirectedChoice(ledger, { beatId: 'wren_scene4_path', day: 10 });
      s.flags.chose_old_road = true;
      s.flags.wren_arc_complete = true;
    });
    expect(evaluateEndingForRun(save)).toBe('wanderer');
  });

  it('same state => same ending (deterministic)', () => {
    const build = (): SaveData => endSave((s, ledger) => {
      recordSelfDirectedChoice(ledger, { beatId: 'wren_scene3_old_road', day: 8 });
      recordSelfDirectedChoice(ledger, { beatId: 'wren_scene4_path', day: 10 });
      s.flags.chose_old_road = true;
      s.flags.wren_arc_complete = true;
    });
    expect(evaluateEndingForRun(build())).toBe(evaluateEndingForRun(build()));
  });
});

describe('COMMUNITY — breadth + a gathering beat', () => {
  it('broad NPC interaction => Community rises', () => {
    const save = endSave((s, ledger) => {
      for (const npc of ['fenwick', 'sela', 'bram', 'nia', 'wren']) {
        serve(ledger, npc, 3);
        recordChat(ledger, { npcId: npc, day: 3 });
        s.hearts[npc] = 1;
      }
      s.flags.sela_ch1_intro_delivered = true;
      s.flags.bram_ch1_intro_delivered = true;
      s.flags.nia_ch1_intro_delivered = true;
      recordCommunityBeat(ledger, { beatId: 'wren_scene2_bonding', day: 6 });
      s.flags.chose_community_night = true;
    });
    const result = evaluateEndingForRun(save);
    expect(result).toBe('community');
  });

  it('multiple relationships => Community rises', () => {
    const save = endSave((s, ledger) => {
      for (let i = 0; i < 3; i++) {
        for (const npc of ['fenwick', 'sela', 'bram', 'nia', 'wren']) {
          serve(ledger, npc, 3);
          s.hearts[npc] = 1;
        }
      }
      s.flags.sela_ch1_intro_delivered = true;
      s.flags.bram_ch1_intro_delivered = true;
      s.flags.nia_ch1_intro_delivered = true;
      recordCommunityBeat(ledger, { beatId: 'wren_scene2_bonding', day: 6 });
      s.flags.chose_community_night = true;
    });
    expect(evaluateEndingForRun(save)).toBe('community');
  });

  it('community-specific beat => Community rises meaningfully', () => {
    const save = endSave((s, ledger) => {
      for (const npc of ['fenwick', 'sela', 'bram', 'nia', 'wren']) {
        serve(ledger, npc, 3);
        s.hearts[npc] = 1;
      }
      recordCommunityBeat(ledger, { beatId: 'wren_scene2_bonding', day: 6 });
      s.flags.chose_community_night = true;
      s.flags.sela_ch1_intro_delivered = true;
      s.flags.bram_ch1_intro_delivered = true;
      s.flags.nia_ch1_intro_delivered = true;
    });
    expect(evaluateEndingForRun(save)).toBe('community');
  });

  it('high Care but low Community => Keeper, not Community', () => {
    const save = endSave((s, ledger) => {
      // Deep care for ONE person (Fenwick), low breadth.
      for (let i = 0; i < 6; i++) {
        serve(ledger, 'fenwick', 3);
      }
      s.hearts.fenwick = 1;
      s.flags.fenwick_arc_complete = true;
      // No community beat, no breadth across the town.
      s.flags.sela_ch1_intro_delivered = true;
      s.flags.bram_ch1_intro_delivered = true;
      s.flags.nia_ch1_intro_delivered = true;
    });
    const result = evaluateEndingForRun(save);
    expect(result).toBe('keeper');
  });

  it('community requires the deliberate gathering beat (no checklist shortcut)', () => {
    const save = endSave((s, ledger) => {
      for (const npc of ['fenwick', 'sela', 'bram', 'nia', 'wren']) {
        serve(ledger, npc, 3);
        s.hearts[npc] = 1;
      }
      // breadth present, intro flags present, but NO community beat / flag
      s.flags.sela_ch1_intro_delivered = true;
      s.flags.bram_ch1_intro_delivered = true;
      s.flags.nia_ch1_intro_delivered = true;
    });
    const result = evaluateEndingForRun(save);
    expect(result).not.toBe('community');
  });

  it('same state => same ending (deterministic)', () => {
    const build = (): SaveData => endSave((s, ledger) => {
      for (const npc of ['fenwick', 'sela', 'bram', 'nia', 'wren']) {
        serve(ledger, npc, 3);
        s.hearts[npc] = 1;
      }
      s.flags.sela_ch1_intro_delivered = true;
      s.flags.bram_ch1_intro_delivered = true;
      s.flags.nia_ch1_intro_delivered = true;
      recordCommunityBeat(ledger, { beatId: 'wren_scene2_bonding', day: 6 });
      s.flags.chose_community_night = true;
    });
    expect(evaluateEndingForRun(build())).toBe(evaluateEndingForRun(build()));
  });
});

describe('ENDING COMPETITION — specific identity beats generic fallback', () => {
  it('Keeper qualifies AND Community strongly qualifies => Community wins', () => {
    const save = endSave((s, ledger) => {
      for (const npc of ['fenwick', 'sela', 'bram', 'nia', 'wren']) {
        serve(ledger, npc, 3);
        recordChat(ledger, { npcId: npc, day: 3 });
        s.hearts[npc] = 1;
      }
      s.flags.fenwick_arc_complete = true; // Keeper qualifies
      s.flags.sela_ch1_intro_delivered = true;
      s.flags.bram_ch1_intro_delivered = true;
      s.flags.nia_ch1_intro_delivered = true;
      recordCommunityBeat(ledger, { beatId: 'wren_scene2_bonding', day: 6 });
      s.flags.chose_community_night = true; // Community strongly qualifies
    });
    expect(evaluateEndingForRun(save)).toBe('community');
  });

  it('Keeper qualifies AND Wanderer strongly qualifies => Wanderer wins', () => {
    const save = endSave((s, ledger) => {
      serve(ledger, 'fenwick', 3);
      s.hearts.fenwick = 1;
      s.flags.fenwick_arc_complete = true; // Keeper qualifies
      recordSelfDirectedChoice(ledger, { beatId: 'wren_scene3_old_road', day: 8 });
      recordSelfDirectedChoice(ledger, { beatId: 'wren_scene4_path', day: 10 });
      s.flags.chose_old_road = true;
      s.flags.wren_arc_complete = true; // Wanderer strongly qualifies
    });
    expect(evaluateEndingForRun(save)).toBe('wanderer');
  });

  it('Builder strongly qualifies => Builder wins', () => {
    const save = endSave((s, ledger) => {
      // Comfort + stars + upgrades handled by evaluateEndingForRun via save flags.
      s.stars = 5;
      s.upgrades = ['bigger_shelf', 'second_kettle', 'recipe_hints', 'comfort_furniture'];
      // high comfort signal
      serve(ledger, 'fenwick', 3);
      s.hearts.fenwick = 1;
    });
    const result = evaluateEndingForRun(save);
    expect(result).toBe('builder');
  });

  it('no specific strong identity => Keeper fallback', () => {
    const save = endSave((s) => {
      // A quiet, calm run: no arcs, no beats, no strong dimensions.
    });
    expect(evaluateEndingForRun(save)).toBe('keeper');
  });
});
