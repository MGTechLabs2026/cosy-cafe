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

  constructor(init: ProgressionInit) {
    this.save = init.save;
    this.economy = {
      coins: this.save.coins,
      stars: this.save.stars,
      totalServes: this.save.total_serves,
    };
    this.inventory = { ...createInitialInventory(), ...this.save.inventory };
    this.heartLedger = heartsFromSave(this.save.hearts ?? {}, this.save.heart_points_today ?? {});
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
