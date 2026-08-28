// controllers/progression-controller.ts — orchestration ONLY (doc 08 §3.5).
// Coordinates coins/stars (sim/economy), hearts (sim/hearts), upgrades
// (sim/upgrades) and inventory/shelf stock (sim/day + sim/shelf), and owns the
// save-snapshot boundary. Every rule lives in sim/; this module never invents
// numbers. Extracted verbatim-in-behavior from ui/game.ts.

import { setRecordPlayerEnabled } from '../audio/howl.js';
import { exportSaveCode } from '../save/crypto.js';
import { loadSave, writeSave } from '../save/store.js';
import type { SaveData } from '../save/validate.js';
import type { IngredientId, Inventory } from '../sim/day.js';
import { createInitialInventory } from '../sim/day.js';
import type { EconomyState } from '../sim/economy.js';
import {
  createHeartLedger,
  heartsFromSave,
  heartsToSave,
  resetHeartDay,
} from '../sim/hearts.js';
import type { HeartLedger } from '../sim/hearts.js';
import { purchaseUpgrade, shelfCapacity } from '../sim/upgrades.js';
import type { UpgradeId } from '../sim/upgrades.js';
// Activity ledger for narrative system
import { ActivityLedger, createActivityLedger } from '../narrative/activity-ledger.js';

export interface ProgressionInit {
  save: SaveData;
}

/**
 * Owns the economy/heart/inventory runtime records and mirrors them into the
 * save blob at snapshot points. The save object is injected by reference —
 * this controller is the single writer of its gameplay fields.
 */
export class ProgressionController {
  readonly save: SaveData;
  economy!: EconomyState;
  inventory: Inventory = createInitialInventory();
  heartLedger: HeartLedger;
  /** Activity ledger for narrative system */
  activityLedger: ActivityLedger;

  constructor(init: ProgressionInit) {
    this.save = init.save;
    this.economy = {
      coins: this.save.coins,
      stars: this.save.stars,
      totalServes: this.save.total_serves,
    };
    this.inventory = { ...createInitialInventory(), ...this.save.inventory };
    this.heartLedger = heartsFromSave(this.save.hearts ?? {}, this.save.heart_points_today ?? {});
    // Create activity ledger from save flags
    this.activityLedger = createActivityLedger({
      totalServes: this.save.flags.activity_total_serves,
      favoriteServeCount: this.save.flags.activity_favorite_serves,
      correctServeCount: this.save.flags.activity_correct_serves,
      servesByNpc: this.save.flags.activity_serves_by_npc,
      servesByRecipe: this.save.flags.activity_serves_by_recipe,
      totalChats: this.save.flags.activity_total_chats,
      chatsByNpc: this.save.flags.activity_chats_by_npc,
      totalBrews: this.save.flags.activity_total_brews,
      experimentalBrewCount: this.save.flags.activity_experimental_brews,
      wrenMysteryBrewCount: this.save.flags.activity_wren_mystery_brews,
      recipeDiscoveryCount: this.save.flags.activity_recipe_discoveries,
      discoveredRecipes: [...(this.save.flags.activity_discovered_recipes ?? this.save.flags.discovered_recipes ?? [])],
      journalOpensTotal: this.save.flags.activity_journal_opens_total,
      journalOpensByTab: this.save.flags.activity_journal_opens_by_tab,
      upgradePurchaseCount: this.save.flags.activity_upgrade_purchases ?? this.save.upgrades.length,
      daysSkipped: this.save.flags.activity_days_skipped,
      earlyCloses: this.save.flags.activity_early_closes,
      lettersReadCount: this.save.flags.activity_letters_read ?? this.save.flags.letters_read?.length ?? 0,
      lettersDismissedCount: this.save.flags.activity_letters_dismissed ?? this.save.flags.letters_dismissed?.length ?? 0,
      readLetterIds: [...(this.save.flags.activity_read_letter_ids ?? this.save.flags.letters_read ?? [])],
      dismissedLetterIds: [...(this.save.flags.activity_dismissed_letter_ids ?? this.save.flags.letters_dismissed ?? [])],
      wrenVisits: this.save.flags.activity_wren_visits,
      wrenMysteryClues: this.save.flags.activity_wren_mystery_clues,
      ingredientsPurchasedTotal: this.save.flags.activity_ingredients_purchased,
      version: this.save.flags.activity_version ?? 1,
    });
    // Playtest fix #3: a save that already owns the record player resumes with
    // music enabled (playback itself waits for the title-screen unlock).
    if (this.save.upgrades.includes('record_player')) {
      setRecordPlayerEnabled(true);
    }
    resetHeartDay(this.heartLedger);
  }

  /** Re-derive all runtime state after an import replaced the localStorage blob.
   * Mirrors the legacy behavior of re-reading loadSave() so an external writeSave
   * (tests inject coins via a re-snapshot) is picked up here.
   */
  reloadFromStorage(): void {
    const loaded = loadSave();
    if (!loaded.ok) return;
    // Mirror the legacy `save = loadSave().data` reassignment: copy every
    // field onto the live object so the GameController and every controller
    // that was injected `this.save` keep seeing refreshed state, then rebuild
    // the derived runtime records.
    const next = loaded.data;
    this.save.day = next.day;
    this.save.coins = next.coins;
    this.save.stars = next.stars;
    this.save.total_serves = next.total_serves;
    this.save.chatted_this_service = next.chatted_this_service;
    this.save.inventory = { ...next.inventory };
    this.save.upgrades = [...next.upgrades];
    this.save.hearts = { ...next.hearts };
    this.save.heart_points_today = { ...next.heart_points_today };
    this.save.letters = [...next.letters];
    this.save.flags = { ...next.flags };
    this.save.settings = { ...next.settings };
    this.economy = {
      coins: this.save.coins,
      stars: this.save.stars,
      totalServes: this.save.total_serves,
    };
    this.inventory = { ...createInitialInventory(), ...this.save.inventory };
    this.heartLedger = heartsFromSave(this.save.hearts ?? {}, this.save.heart_points_today ?? {});
    resetHeartDay(this.heartLedger);
  }

  /**
   * Persist the whole game state back into the save blob (autosave points).
   * Single atomic write per call; reload always resumes at a clean morning.
   */
  snapshotIntoSave(): void {
    this.save.coins = this.economy.coins;
    this.save.stars = this.economy.stars;
    this.save.total_serves = this.economy.totalServes;
    this.save.inventory = { ...this.inventory };
    const heartSnapshot = heartsToSave(this.heartLedger);
    this.save.hearts = heartSnapshot.hearts;
    this.save.heart_points_today = heartSnapshot.heart_points_today;
    // Persist activity ledger to save flags
    const counters = this.activityLedger.getCounters();
    this.save.flags.activity_total_serves = counters.totalServes;
    this.save.flags.activity_favorite_serves = counters.favoriteServeCount;
    this.save.flags.activity_correct_serves = counters.correctServeCount;
    this.save.flags.activity_serves_by_npc = { ...counters.servesByNpc };
    this.save.flags.activity_serves_by_recipe = { ...counters.servesByRecipe };
    this.save.flags.activity_total_chats = counters.totalChats;
    this.save.flags.activity_chats_by_npc = { ...counters.chatsByNpc };
    this.save.flags.activity_total_brews = counters.totalBrews;
    this.save.flags.activity_experimental_brews = counters.experimentalBrewCount;
    this.save.flags.activity_wren_mystery_brews = counters.wrenMysteryBrewCount;
    this.save.flags.activity_recipe_discoveries = counters.recipeDiscoveryCount;
    this.save.flags.activity_discovered_recipes = [...counters.discoveredRecipes];
    this.save.flags.activity_journal_opens_total = counters.journalOpensTotal;
    this.save.flags.activity_journal_opens_by_tab = { ...counters.journalOpensByTab };
    this.save.flags.activity_upgrade_purchases = counters.upgradePurchaseCount;
    this.save.flags.activity_days_skipped = counters.daysSkipped;
    this.save.flags.activity_early_closes = counters.earlyCloses;
    this.save.flags.activity_letters_read = counters.lettersReadCount;
    this.save.flags.activity_letters_dismissed = counters.lettersDismissedCount;
    this.save.flags.activity_read_letter_ids = [...counters.readLetterIds];
    this.save.flags.activity_dismissed_letter_ids = [...counters.dismissedLetterIds];
    this.save.flags.activity_wren_visits = counters.wrenVisits;
    this.save.flags.activity_wren_mystery_clues = counters.wrenMysteryClues;
    this.save.flags.activity_ingredients_purchased = counters.ingredientsPurchasedTotal;
    this.save.flags.activity_independent_choices = counters.independentChoiceCount;
    this.save.flags.activity_community_beats = counters.communityBeatCount;
    this.save.flags.activity_version = counters.version;
    writeSave(this.save);
  }

  resetHeartDay(): void {
    resetHeartDay(this.heartLedger);
  }

  // ---- Upgrades / shop -------------------------------------------------------

  /**
   * Attempt an upgrade purchase through sim rules; returns false when refused
   * (shop UI already showed the muted/wiggle/note path).
   */
  buyUpgrade(id: UpgradeId): boolean {
    const result = purchaseUpgrade(this.economy.coins, this.save.upgrades, id);
    if (!result.ok) return false;
    this.economy.coins = result.coins;
    this.save.upgrades.length = 0;
    this.save.upgrades.push(...result.owned);

    if (id === 'record_player') {
      setRecordPlayerEnabled(true);
    }
    return true;
  }

  buyIngredient(id: IngredientId, price: number): boolean {
    if (this.economy.coins < price) return false;
    this.economy.coins -= price;
    this.inventory[id] = (this.inventory[id] ?? 0) + 1;
    return true;
  }

  shelfCapacity(): number {
    return shelfCapacity(this.save.upgrades);
  }

  /** Raw save access for continuity assertions (test hook surface). */
  debugSaveSnapshot(): SaveData {
    this.snapshotIntoSave();
    return JSON.parse(JSON.stringify(this.save)) as SaveData;
  }

  exportCode(): Promise<string> {
    const raw = localStorage.getItem('moonleaf_save_v1');
    if (raw === null) return Promise.reject(new Error('no save to export'));
    return exportSaveCode(raw);
  }
}
