// controllers/day-controller.ts — day lifecycle orchestration (doc 08 §3.5).
// Owns start-of-day, doors open, evening close, recap → next-day transition,
// and the daily schedule initialization. Day RULES stay in sim/day.ts
// (phase machine), sim/customers.ts (schedule build) and sim/shelf.ts
// (delivery); this module sequences them. Extracted verbatim-in-behavior
// from ui/game.ts.

import { playClick, playMusicForPhase } from '../audio/howl.js';
import type { DayPhase } from '../audio/howl.js';
import { STRINGS, format } from '../data/strings.js';
import { ingredientLabel } from '../data/recipes.js';
import type { DayState, Inventory } from '../sim/day.js';
import { beginNextDay, closeDay, openService, FINAL_DAY } from '../sim/day.js';
import { buildDaySchedule } from '../sim/customers.js';
import type { ScheduledArrival } from '../sim/customers.js';
import { applyDelivery, isDeliveryDay, shelfIdsFor } from '../sim/shelf.js';
import {
  ensureCloseDoorButton,
  hideBanner,
  showMorningBanner,
  showToast,
} from '../ui/cafe-dom.js';
import { showRecap } from '../ui/recap.js';
import { openShop, closeShop } from '../ui/shop.js';
import { showMailbox, markLetterRead } from '../ui/mailbox.js';
// Narrative activity events
import { recordDaySkipped } from '../narrative/activity-ledger.js';
// Narrative runtime integration (Batch 2 — wires schedulers into the lifecycle)
import { advanceNarrative } from '../narrative/runtime.js';

export interface DayContext {
  dayState: DayState;
  save: import('../save/validate.js').SaveData;
  inventory: Inventory;
  reducedMotion: boolean;
  /** Activity ledger for narrative system */
  activityLedger: import('../narrative/activity-ledger.js').ActivityLedger;
}

export interface DayControllerDeps {
  getContext: () => DayContext;
  toast: (message: string, ms?: number) => void;
  /** Refresh HUD after morning reset (day number may change). */
  syncHud: () => void;
  /** Morning reset hook owned by the service layer (per-day tallies). */
  onDayBegin: (schedule: readonly ScheduledArrival[]) => void;
  onServiceOpen: (schedule: readonly ScheduledArrival[], firstDelaySec: number) => void;
  /** Recap "Continue" pressed → roll to next morning (GameController owns flow). */
  onNextDay: () => void;
  /** Recap "Shop" pressed → open the shop overlay. */
  onOpenShop: () => void;
  /** Autosave at recap boundaries (doc 02 §7.1). */
  onAutosave: () => void;
  /**
   * Day-14 recap "Continue" pressed → resolve the run (ending evaluation +
   * presentation + return to title). The GameController owns this flow; it
   * must NEVER roll to Day 15 before the ending is shown (Batch 4 / BUG-03).
   */
  onRunComplete: () => void;
}

/**
 * Sequences the day phases: prep (banner) → service (doors) → recap
 * (modal/autosave) → next prep. No phase rules live here — sim/day.ts owns the
 * state machine; this module only calls it in order and drives presentation.
 */
export class DayController {
  private deps: DayControllerDeps;

  constructor(deps: DayControllerDeps) {
    this.deps = deps;
  }

  /** Start a day: per-day resets, delivery check, banner (was enterMorning). */
  enterMorning(): void {
    const ctx = this.deps.getContext();
    ctx.dayState.phase = 'prep';

    // Scene-end cleanup (M4 memory gate): no particles/tweens survive a day.
    // Performed by the GameController through onDayBegin's caller; hearts cap
    // reset likewise happens at the autosave boundary (behavior preserved).
    this.deps.onDayBegin([]);

    // Narrative runtime hook (Batch 2): advance chapter, evaluate state, and
    // deliver any eligible letter for this morning. Mutates the save in place;
    // the autosave at recap persists it. Idempotent per day.
    advanceNarrative(ctx.save, ctx.activityLedger);

    // Post-advance morning sequence: calm music, weekly delivery, banner.
    // Runs immediately when there is no pending mail; deferred until the
    // player closes the mailbox otherwise (Batch 3 — non-blocking mailbox).
    const proceed = (): void => {
      // Playtest fix #3: morning/prep carries the calm track.
      playMusicForPhase('prep');

      if (isDeliveryDay(ctx.dayState.day)) {
        // Weekly auto-delivery (doc 02 §2.5): arrives mornings of days 8 and 15.
        applyDelivery(ctx.inventory);
        showToast(this.toastEl(), STRINGS.morning.deliveryArrived);
      }

      showMorningBanner(this.bannerEl(), {
        day: ctx.dayState.day,
        shelfLine: stockedShelfLine(ctx.inventory),
        onOpenDoors: () => this.openDoors(),
        onSleepIn: () => {
          playClick();
          // Record day skipped activity for narrative system
          recordDaySkipped(ctx.activityLedger, {
            day: ctx.dayState.day,
          });
          this.finishDay(0, false);
        },
      });

      this.deps.syncHud();
    };

    // Morning mailbox (Batch 3): only when the scheduler queued unread letters.
    const pending = ctx.save.flags.pending_narrative_letters;
    if (pending && pending.length > 0) {
      showMailbox(ctx.save, pending, {
        // Persist read state now so a browser refresh can't resurrect it.
        onRead: (letterId: string) => {
          markLetterRead(ctx.save, letterId);
          this.deps.onAutosave();
        },
        onDone: proceed,
      });
    } else {
      proceed();
    }
  }

  openDoors(): void {
    playClick();
    const ctx = this.deps.getContext();
    openService(ctx.dayState);
    hideBanner(this.bannerEl());
    const schedule = buildDaySchedule(ctx.dayState.day, {
      wrenRevealed: ctx.save.flags.wren_usual_revealed,
    }).arrivals;

    // Playtest fix #3: service switches to the fireplace track.
    playMusicForPhase('service');

    this.deps.onServiceOpen(schedule, ctx.reducedMotion ? 0.4 : 1.5);
  }

  /** Gentle early-close guard: nudge when arrivals are still pending. */
  tryCloseDay(coinsEarnedToday: number, arrivalsRemaining: boolean): void {
    const ctx = this.deps.getContext();
    if (ctx.dayState.phase !== 'service') return;
    if (arrivalsRemaining) {
      // Still arrivals pending — gently nudge instead of closing early.
      showToast(this.toastEl(), STRINGS.service.closeHint);
      return;
    }
    this.finishDay(coinsEarnedToday, true);
  }

  /**
   * Evening: recap modal (+ shop button) → autosave → next morning
   * (doc 02 §1, §7.1). The save is written AFTER rolling forward where
   * possible; reload always resumes at a clean morning.
   */
  finishDay(coinsEarned: number, showRecapModal: boolean): void {
    const ctx = this.deps.getContext();
    const finishedDay = ctx.dayState.day;
    closeDay(ctx.dayState); // phase = 'recap' for the modal

    if (!showRecapModal) {
      // Sleep-in: roll forward + autosave at once (behavior preserved).
      this.autosaveAt(() => this.deps.onNextDay());
      return;
    }

    // Autosave fires AT the recap (doc 02 §7.1): persist immediately so quitting
    // during the modal never loses progress. Rollover re-saves after Continue.
    this.autosaveAt(() => {
      // Playtest fix #3: the evening recap gets its own track (crossfades over).
      playMusicForPhase('recap');

      showRecap(
        {
          day: finishedDay,
          coinsEarned,
          drinksServed: this.servesTodayProvider(),
          newRecipeIds: [...this.discoveriesTodayProvider()],
          heartsGainedBy: [...this.heartsGainedNamesProvider()],
        },
        ctx.reducedMotion,
        () => {
          // Batch 4 / BUG-03: closing Day 14 resolves the run (ending). Day 15
          // must never silently begin as normal gameplay — route to the
          // GameController's run-resolution flow instead of onNextDay().
          if (finishedDay >= FINAL_DAY) {
            this.autosaveAt(this.deps.onRunComplete);
            return;
          }
          this.autosaveAt(this.deps.onNextDay);
        },
        () => {
          this.deps.onOpenShop();
        },
      );

      // Fill discovery names after mount (display names come from strings).
      for (const li of document.querySelectorAll('#recap-overlay li[data-recipe-id]')) {
        const id = li.getAttribute('data-recipe-id');
        const view = id ? this.recipeViewFor(id) : null;
        if (view) li.textContent = `${view.name} — ${view.combo}`;
      }
    });
  }

  /** Close-door suggestion button once the queue is empty. */
  ensureCloseButton(): void {
    ensureCloseDoorButton(this.actionBarEl(), () =>
      this.tryCloseDay(
        this.coinsEarnedTodayProvider(),
        this.arrivalsRemainingProvider(),
      ),
    );
  }

  // ---- Providers injected after construction (breaks the init cycle) ----------

  private servesTodayProvider: () => number = () => 0;
  private discoveriesTodayProvider: () => readonly string[] = () => [];
  private heartsGainedNamesProvider: () => readonly string[] = () => [];
  private coinsEarnedTodayProvider: () => number = () => 0;
  private arrivalsRemainingProvider: () => boolean = () => false;
  private bannerEl: () => HTMLElement = () => {
    throw new Error('DayController elements not wired');
  };
  private actionBarEl: () => HTMLElement = this.bannerEl;
  private toastEl: () => HTMLElement = this.bannerEl;
  private recipeViewFor: (id: string) => { name: string; combo: string } | null = () => null;

  /** Wire element accessors + per-day tallies (called once by GameController). */
  wire(
    els: {
      bannerEl: () => HTMLElement;
      actionBarEl: () => HTMLElement;
      toastEl: () => HTMLElement;
    },
    providers: {
      servesToday: () => number;
      discoveriesToday: () => readonly string[];
      heartsGainedNames: () => readonly string[];
      coinsEarnedToday: () => number;
      arrivalsRemaining: () => boolean;
      recipeViewFor: (id: string) => { name: string; combo: string } | null;
    },
  ): void {
    this.bannerEl = els.bannerEl;
    this.actionBarEl = els.actionBarEl;
    this.toastEl = els.toastEl;
    this.servesTodayProvider = providers.servesToday;
    this.discoveriesTodayProvider = providers.discoveriesToday;
    this.heartsGainedNamesProvider = providers.heartsGainedNames;
    this.coinsEarnedTodayProvider = providers.coinsEarnedToday;
    this.arrivalsRemainingProvider = providers.arrivalsRemaining;
    this.recipeViewFor = providers.recipeViewFor;
  }

  /** Autosave fires AT recap boundaries (doc 02 §7.1): persist immediately so
   * quitting during the modal never loses progress, then run `after`. */
  private autosaveAt(after: () => void): void {
    this.deps.onAutosave();
    after();
  }
}

/** Shelf line for the morning banner — every stocked kind, capped display. */
function stockedShelfLine(inventory: Inventory): string {
  const parts: string[] = [];
  for (const id of shelfIdsFor('delivery').concat(shelfIdsFor('sela'))) {
    const count = inventory[id] ?? 0;
    if (count > 0) {
      parts.push(format(STRINGS.shelf.stockTemplate, { name: ingredientLabel(id), count }));
    }
  }
  return parts.length > 0 ? parts.join(' · ') : STRINGS.kettle.restockNote;
}
