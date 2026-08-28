// controllers/game-controller.ts — top-level coordinator (doc 08 §3.5).
// Owns application lifecycle, controller construction/wiring, the authoritative
// runtime state records (created ONCE here and injected by reference), global
// render coordination and the debug/test hook surface. Gameplay rules live in
// sim/; presentation lives in ui/; this class only sequences them.

import { CountUp } from '../render/tween.js';
import { createSceneFx, drawSceneLayer } from '../render/scene.js';
import type { SceneFx } from '../render/scene.js';
import { preloadAllArt } from '../render/images.js';
import { initParticles, clearAllParticles, resetCupSlide } from '../render/fx.js';
import { ALL_RECIPES, recipeToView } from '../data/recipes.js';
import type { BrewInput } from '../sim/brewing.js';
import type { DayState, IngredientId } from '../sim/day.js';
import { beginNextDay } from '../sim/day.js';
import { STRINGS } from '../data/strings.js';
import {
  displayedHearts,
} from '../sim/hearts.js';
import type { RegularId } from '../sim/customers.js';
import { patienceMax, brewAnimSec } from '../sim/upgrades.js';
import { selaCartOpen } from '../sim/shelf.js';
import { applyTextSize, textSizeFromSettings, applyReducedMotionClass } from '../ui/textsize.js';
import { setupCafeDom, showToast as cafeShowToast, setCafeDomPhaseProvider } from '../ui/cafe-dom.js';
import type { CafeDomRefs } from '../ui/cafe-dom.js';
import { openJournal, closeJournal, isJournalOpen, openJournalToRecipe } from '../ui/journal.js';
import { openShop, closeShop, isShopOpen, setShopDayProvider } from '../ui/shop.js';
import { isSceneOpen } from '../ui/scene.js';
import { showEnding, isEndingOpen, closeEnding } from '../ui/ending.js';
import { evaluateEndingForRun, recordEnding } from '../narrative/runtime.js';
import type { EndingId } from '../narrative/story-definitions.js';
import type { SaveData } from '../save/validate.js';
import { shelfPrice } from '../sim/shelf.js';
import { ProgressionController } from './progression-controller.js';
import { KettleController } from './kettle-controller.js';
import { ServiceController, HINTED_RECIPES, setServiceToastFn } from './service-controller.js';
import { DayController } from './day-controller.js';
import { createInitialMopsState, tickMops, petMops } from '../sim/mops.js';

export interface GameInit {
  saveData: SaveData;
  canvas: HTMLCanvasElement;
  onHudSync: (s: { day: number; coins: number; stars: number }) => void;
  onOpenSettings: () => void;
  /**
   * Called when a completed run resolves (Day-14 ending shown + accepted) so
   * main.ts can return to the title screen. The controller owns the resolution
   * flow; this is the single boundary back to navigation (Batch 4 / BUG-03).
   */
  onReturnToTitle: () => void;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * The one obvious entry point of the café game. Composes Day / Service /
 * Kettle / Progression controllers around shared state; nothing below it
 * re-orchestrates.
 */
export class GameController {
  private init: GameInit;
  private save: SaveData;
  private canvasEl: HTMLCanvasElement;
  private dom!: CafeDomRefs;

  // Authoritative runtime state — created once, injected by reference.
  progression: ProgressionController;
  private dayState: DayState;
  private fx: SceneFx;
  private coinCount: CountUp;
  private reducedMotion = false;

  private service: ServiceController;
  private kettle: KettleController;
  private day: DayController;
  private mopsState: import('../sim/mops.js').MopsState;
  private mopsDoorChimeMs = -1;
  private mopsMurkyBrewMs = -1;
  private mopsChooseCustomerMs = -1;

  constructor(init: GameInit) {
    this.init = init;
    this.save = init.saveData;
    this.canvasEl = init.canvas;
    this.reducedMotion = this.save.settings.reduced_motion || prefersReducedMotion();

    // Warm the ENTIRE art cache (room, sprites, portraits, all icons) at boot —
    // during the title screen — so no in-game frame ever waits on disk.
    preloadAllArt(ALL_RECIPES.map((r) => r.icon));

    this.progression = new ProgressionController({ save: this.save });
    this.dayState = { day: this.save.day, phase: 'prep' };
    this.fx = createSceneFx();
    this.coinCount = new CountUp(this.progression.economy.coins, 18);
    this.mopsState = createInitialMopsState();

    // Text size applies globally the moment a game boots (doc 05 §6); persisted
    // in the save so it survives reload.
    applyTextSize(textSizeFromSettings(this.save.settings));
    applyReducedMotionClass(this.reducedMotion);
    initParticles();

    this.service = new ServiceController({
      getContext: () => ({
        dayState: this.dayState,
        save: this.save,
        heartLedger: this.progression.heartLedger,
        economy: this.progression.economy,
        inventory: this.progression.inventory,
        // Dynamic so test stubs of window.matchMedia work (old monolith behavior).
        reducedMotion: this.save.settings.reduced_motion || prefersReducedMotion(),
        activityLedger: this.progression.activityLedger,
      }),
      toast: (msg, ms) => cafeShowToast(this.dom.toastEl, msg, ms),
      syncHud: () => this.syncHud(),
      fx: this.fx,
      onRecipeDiscovered: (recipeId) => this.openJournalToNewEntry(recipeId),
      practicePour: (isMurky) => this.kettle.showPracticePourToast(isMurky),
      murkyDecline: () => this.kettle.showMurkyDeclineToast(),
    });

    this.kettle = new KettleController({
      getContext: () => ({
        discoveredRecipeIds: this.save.flags.discovered_recipes,
        upgrades: this.save.upgrades,
        inventory: this.progression.inventory,
      }),
      toast: (msg, ms) => cafeShowToast(this.dom.toastEl, msg, ms),
      onSubmitBrew: (input) => this.service.submitBrew(input),
    });

    setServiceToastFn((msg, ms) => cafeShowToast(this.dom.toastEl, msg, ms));

    this.day = new DayController({
      getContext: () => ({
        dayState: this.dayState,
        save: this.save,
        inventory: this.progression.inventory,
        reducedMotion: this.reducedMotion,
        activityLedger: this.progression.activityLedger,
      }),
      toast: (msg, ms) => cafeShowToast(this.dom.toastEl, msg, ms),
      syncHud: () => this.syncHud(),
      onDayBegin: (schedule) => this.beginDayResets(schedule),
      onServiceOpen: (schedule, firstDelaySec) =>
        this.service.openService(schedule, firstDelaySec),
      onNextDay: () => this.rollToNextMorning(),
      onOpenShop: () => this.openShopOverlay(),
      onAutosave: () => this.progression.snapshotIntoSave(),
      // Day-14 recap Continue resolves the run (ending) — never rolls to Day 15.
      onRunComplete: () => this.resolveRun(),
    });

    this.dom = setupCafeDom(init.canvas, {
      onOpenKettle: () => this.kettle.openForOrder(),
      onOpenJournal: () => this.openJournalOverlay(),
      onOpenSettings: init.onOpenSettings,
      onOpenDoors: () => this.day.openDoors(),
      onTryCloseDay: () => this.tryCloseDay(),
    });
    setCafeDomPhaseProvider(() => this.dayState.phase);

    this.day.wire(
      {
        bannerEl: () => this.dom.bannerEl,
        actionBarEl: () => this.dom.actionBarEl,
        toastEl: () => this.dom.toastEl,
      },
      {
        servesToday: () => this.service.servesToday,
        discoveriesToday: () => this.service.discoveriesToday,
        heartsGainedNames: () => this.service.heartsGainedNamesToday,
        coinsEarnedToday: () => this.service.coinsEarnedToday,
        arrivalsRemaining: () => this.service.arrivalsRemaining && !this.service.hasActive,
        recipeViewFor: (id) => recipeToView(id),
      },
    );

    setShopDayProvider(() => this.dayState.day);
    this.day.enterMorning();
  }

  // ---- Morning resets (sequenced exactly like the old enterMorning) ----------

  private beginDayResets(_schedule: readonly unknown[]): void {
    clearAllParticles();
    resetCupSlide();
    this.progression.resetHeartDay(); // daily +1.0 cap resets each morning (doc 02 §5)
  }

  /** Recap Continue / sleep-in rollover → next prep + autosave (doc 02 §7.1). */
  private rollToNextMorning(): void {
    // The shop opens from the recap; closing it here guarantees no shop UI
    // lingers into the next day when the player continues (doc 05 §3.3).
    closeShop();
    beginNextDay(this.dayState);
    // Sync the save object so the persisted day increments (old monolith
    // used a shared reference; we keep them in sync explicitly).
    this.save.day = this.dayState.day;
    this.ensureR003ByDay2();
    this.progression.resetHeartDay();
    this.progression.snapshotIntoSave(); // autosave point per doc 02 §7.1
    this.day.enterMorning();
  }

  /** R003 must be known by day 2 even if the teaching visit was missed. */
  private ensureR003ByDay2(): void {
    if (this.dayState.day >= 2 && !this.save.flags.discovered_recipes.includes('R003')) {
      this.save.flags.discovered_recipes.push('R003');
    }
  }

  // ---- Run resolution (Batch 4 / BUG-03) ------------------------------------

  /**
   * Day-14 recap "Continue" lands here. The runtime evaluates the ending from
   * the REAL state (the existing, unit-tested EndingEvaluator — rules are not
   * re-implemented here), then presents it. Day 15 is NEVER reached.
   */
  private resolveRun(): void {
    // Ending also follows a recap Continue — close any open shop first so it
    // does not linger behind the ending overlay.
    closeShop();
    const ending = evaluateEndingForRun(this.save);
    if (ending) {
      // Persist the chosen ending into the StoryProgress flags (idempotent).
      recordEnding(this.save, ending, this.dayState.day);
      this.persistSave();
      this.presentEnding(ending);
    } else {
      // No qualifier at all (should not happen — keeper is the neutral
      // fallback) — still return to title rather than advancing to Day 15.
      this.returnToTitle();
    }
  }

  /** Present the calm ending overlay. The player accepts it → return to title. */
  private presentEnding(ending: EndingId): void {
    showEnding(ending, {
      onClose: () => this.returnToTitle(),
    });
  }

  /** Run is resolved: hand control back to navigation (title screen). */
  private returnToTitle(): void {
    this.init.onReturnToTitle();
  }

  private tryCloseDay(): void {
    if (this.dayState.phase === 'prep') {
      this.day.openDoors();
      return;
    }
    if (this.dayState.phase === 'service') {
      // Matches the legacy tryCloseDay(): nudge if (pending arrivals AND no active customer).
      // If there IS an active customer, or no pending arrivals, fall through to finishDay.
      this.day.tryCloseDay(
        this.service.coinsEarnedToday,
        this.service.arrivalsRemaining && !this.service.hasActive,
      );
    }
  }

  private openShopOverlay(): void {
    openShop({
      getCoins: () => this.progression.economy.coins,
      getOwnedUpgrades: () => this.save.upgrades,
      getInventory: () => this.progression.inventory,
      getShelfCapacity: () => this.progression.shelfCapacity(),
      onBuyUpgrade: (id) => {
        if (this.progression.buyUpgrade(id)) this.syncHud();
      },
      onBuyIngredient: (id) => {
        if (this.progression.buyIngredient(id as IngredientId, shelfPrice(id))) this.syncHud();
      },
      onClose: closeShop,
    });
  }

  private openJournalOverlay(): void {
    openJournal(this.save, this.progression.heartLedger, { hintedRecipes: HINTED_RECIPES }, {
      onClose: closeJournal,
    });
  }

  private openJournalToNewEntry(recipeId: string): void {
    openJournalToRecipe(
      this.save,
      this.progression.heartLedger,
      { hintedRecipes: HINTED_RECIPES },
      { onClose: closeJournal },
      recipeId,
    );
    cafeShowToast(this.dom.toastEl, STRINGS.journal.newEntryToast);
  }

  /** Called when settings changed (relaxed mode etc.) so they apply immediately. */
  applySettings(next: SaveData['settings']): void {
    this.save.settings = { ...next };
    this.reducedMotion = next.reduced_motion || prefersReducedMotion();
    // Text size + reduced-motion class are live-applied (doc 05 §6), persisted.
    applyTextSize(textSizeFromSettings(next));
    applyReducedMotionClass(this.reducedMotion);
    this.persistSave();
  }

  persistSave(): void {
    this.progression.snapshotIntoSave();
  }

  /** Reload state after an import replaced the localStorage blob. */
  reloadFromStorage(): void {
    this.progression.reloadFromStorage();
    this.dayState = { day: this.save.day, phase: 'prep' };
    this.coinCount = new CountUp(this.progression.economy.coins, 18);
    this.reducedMotion = this.save.settings.reduced_motion || prefersReducedMotion();
    applyReducedMotionClass(this.reducedMotion);
    this.day.enterMorning();
  }

  // ---- Per-tick / render ---------------------------------------------------------

  tick(dtSec: number, _timeMs: number): void {
    this.service.tick(dtSec);

    // Gentle close suggestion when queue empty and nobody at counter.
    if (
      this.dayState.phase === 'service' &&
      !this.service.hasActive &&
      !this.service.arrivalsRemaining
    ) {
      this.day.ensureCloseButton();
    }
  }

  /** Render EVERY rAF frame (fixes flicker: per-frame, not per-sim-step). */
  render(timeMs: number, dtSec: number): void {
    const ctx = this.canvasEl.getContext('2d');
    if (!ctx) return;
    // NOTE: no clearRect here — beginFrame() + drawCafeRoom() already painted
    // the full frame base; clearing here would black out the room each frame.

    const mysteryStillHidden = !this.save.flags.wren_usual_revealed;
    const visual = this.service.visual(mysteryStillHidden);

    drawSceneLayer(
      ctx,
      {
        serviceOpen: this.dayState.phase === 'service',
        prepPhase: this.dayState.phase === 'prep',
        customer: visual,
        kettleGlint: this.dayState.phase === 'prep' && !this.kettle.everOpened,
        journalPulse: this.dayState.day === 1 && this.dayState.phase === 'prep',
        reducedMotion: this.reducedMotion,
        timeMs,
        hasWindowBench: this.save.upgrades.includes('window_bench'),
        hasHearthExpansion: this.save.upgrades.includes('hearth_expansion'),
        mopsState: this.mopsState,
        murkyBrewMs: this.mopsMurkyBrewMs,
        chooseCustomerMs: this.mopsChooseCustomerMs,
      },
      this.fx,
      dtSec,
    );

    this.coinCount.setTarget(this.progression.economy.coins, this.reducedMotion);
    this.coinCount.tick(dtSec);
    this.syncHudCoins();
  }

  private syncHudCoins(): void {
    this.init.onHudSync?.({
      day: this.dayState.day,
      coins: this.coinCount.value,
      stars: this.progression.economy.stars,
    });
  }

  private syncHud(): void {
    this.init.onHudSync?.({
      day: this.dayState.day,
      coins: this.coinCount.value ?? this.progression.economy.coins,
      stars: this.progression.economy.stars,
    });
  }

  // ---- Debug/test surface — used by headless smoke tests (EXTEND-only) --------

  debugState(): object { 
    return {
      phase: this.dayState.phase,
      day: this.dayState.day,
      coins: this.progression.economy.coins,
      stars: this.progression.economy.stars,
      totalServes: this.progression.economy.totalServes,
      inventory: { ...this.progression.inventory },
      discovered: [...this.save.flags.discovered_recipes],
      learnedPrefs: [...this.save.flags.learned_prefs],
      seenScenes: [...this.save.flags.seen_scenes],
      wrenRevealed: this.save.flags.wren_usual_revealed,
      letters: [...this.save.letters],
      upgrades: [...this.save.upgrades],
      hearts: { ...this.progression.heartLedger.points },
      heartsDisplayed: Object.fromEntries(
        (Object.keys(this.progression.heartLedger.points) as RegularId[]).map((id) => [
          id,
          displayedHearts(this.progression.heartLedger, id),
        ]),
      ),
      ...this.service.debugState(),
      kettleBlockMessage: null as string | null,
      journalOpen: isJournalOpen(),
      shopOpen: isShopOpen(),
      sceneOpen: isSceneOpen(),
    };
  }

  debugSpawnNow(): void {
    this.service.debugSpawnNow();
  }

  debugChat(): void {
    this.service.chatWithActive();
  }

  debugBrew(input: BrewInput): void {
    this.kettle.debugBrew(input);
  }

  debugCloseDay(): void {
    this.tryCloseDay();
  }

  debugContinueRecap(): void {
    (document.getElementById('recap-continue') as HTMLButtonElement | null)?.click();
  }

  debugOpenJournal(): void {
    this.openJournalOverlay();
  }

  debugCloseJournal(): void {
    closeJournal();
  }

  /** Drive the Day-14 run resolution from a test (full real flow: evaluate → record → present). */
  debugResolveEnding(): void {
    this.resolveRun();
  }

  debugBuyUpgrade(id: Parameters<ProgressionController['buyUpgrade']>[0]): void {
    if (this.progression.buyUpgrade(id)) this.syncHud();
  }

  debugPatienceMax(): number {
    return patienceMax(this.save.upgrades);
  }

  debugShelfCapacity(): number {
    return this.progression.shelfCapacity();
  }

  debugBrewAnimSec(): number {
    return brewAnimSec(this.save.upgrades);
  }

  debugSelaCartOpen(): boolean {
    return selaCartOpen(this.dayState.day);
  }

  debugSaveSnapshot(): SaveData {
    return this.progression.debugSaveSnapshot();
  }
}
