// controllers/service-controller.ts — customer/service flow orchestration
// (doc 08 §3.5). Owns the active session: arrivals from the day schedule,
// patience ticking, chat, brew submission (Wren resolution gate), the serve →
// payout/hearts pipeline, visit retirement, teach beats and arc-scene triggers.
// All rules live in sim/customers.ts, sim/economy.ts, sim/hearts.ts and
// data/scenes.ts; this module coordinates them. Extracted verbatim-in-behavior
// from ui/game.ts.

import { playDoorChime } from '../audio/howl.js';
import { STRINGS, format } from '../data/strings.js';
import { recipeToView } from '../data/recipes.js';
import {
  getTriggeredScene,
  canAttemptWrenResolution,
  validateWrenUsualBrew,
} from '../data/scenes.js';
import { WREN_SCENES } from '../data/scenes.js';
import { loadDrinkIcon } from '../render/images.js';
import { startTween, tickTween } from '../render/tween.js';
import type { Tween } from '../render/tween.js';
import { spawnHeartPuff, startCupSlide } from '../render/fx.js';
import { customerPosition } from '../render/scene.js';
import type { CustomerVisual, SceneFx } from '../render/scene.js';
import type { BrewInput } from '../sim/brewing.js';
import { resolveBrew } from '../sim/brewing.js';
import {
  FAVORITES,
  RELAXED_PATIENCE_MULTIPLIER,
  createCustomer,
  isRegular,
  tickPatience,
} from '../sim/customers.js';
import type { CharacterId, Customer, RegularId, ScheduledArrival } from '../sim/customers.js';
import { applyPayout, payoutForServe, starsForServes } from '../sim/economy.js';
import { awardChat, awardCorrectServe, awardFavoriteServe } from '../sim/hearts.js';
import { patienceMax } from '../sim/upgrades.js';
import { writeSave } from '../save/store.js';
import { playScene } from '../ui/scene.js';
// Narrative activity events
import { recordServe, recordChat, recordBrew, recordRecipeDiscovered, recordWrenMysteryBrew, recordWrenVisit } from '../narrative/activity-ledger.js';

const WALK_IN_SEC = 2.2;
const LINGER_SEC = 3.0;
/** Graceful walk-out after serving / a kind goodbye (doc 11: cozy departure). */
const WALK_OUT_SEC = 0.8;

const FENWICK_CHILI_GIFT_COUNT = 4;

/** Recipes surfaced as riddle cards once "hinted" (doc 02 §2.2 hint economy). */
export const HINTED_RECIPES: readonly string[] = ['R004', 'R005', 'R006', 'R007'];

interface ActiveCustomer extends Customer {
  walkTweeen: Tween;
  lingerSec: number;
  servedThisVisit: boolean;
  declinedMurky: boolean;
  orderIcon: HTMLImageElement | null;
  mysteryOrder: boolean;
  /** True once the visit has ended and the figure is walking back to the door. */
  leaving: boolean;
  /** Reverse progress 0→1 while leaving (eased into walkT). */
  leaveTween: Tween;
}

export interface ServiceContext {
  dayState: { day: number; phase: 'prep' | 'service' | 'recap' };
  save: import('../save/validate.js').SaveData;
  heartLedger: import('../sim/hearts.js').HeartLedger;
  economy: import('../sim/economy.js').EconomyState;
  inventory: Record<string, number>;
  reducedMotion: boolean;
  /** Activity ledger for narrative system */
  activityLedger: import('../narrative/activity-ledger.js').ActivityLedger;
}

export interface ServiceControllerDeps {
  getContext: () => ServiceContext;
  toast: (message: string, ms?: number) => void;
  /** HUD sync after coins/stars changed (serve, purchase). */
  syncHud: () => void;
  /** Scene-fx store for coin/sparkle bursts (owned by GameController). */
  fx: SceneFx;
  /** Called when a serve discovered a recipe (journal self-open beat). */
  onRecipeDiscovered: (recipeId: string) => void;
  /** Practice-pour copy when a brew landed with nobody waiting. */
  practicePour: (isMurky: boolean) => void;
  /** Murky-decline copy when a waiting customer politely passes. */
  murkyDecline: () => void;
}

/**
 * Coordinates one customer at a time: spawn → walk-in → (chat | serve | walk
 * out) → linger → retire (+teach beat / scene trigger / arc rewards).
 */
export class ServiceController {
  private deps: ServiceControllerDeps;
  private schedule: readonly ScheduledArrival[] = [];
  private nextArrivalIdx = 0;
  private arrivalCooldownSec = 1.5;
  private active: ActiveCustomer | null = null;
  private servedCharacterIds: CharacterId[] = [];
  /** Set when a serve discovered a recipe; consumed at retireActive(). */
  private pendingJournalOpenRecipeId: string | null = null;
  /** Per-day tallies surfaced to the recap through GameController. */
  servesToday = 0;
  coinsEarnedToday = 0;
  discoveriesToday: string[] = [];
  heartsGainedNamesToday: string[] = [];

  constructor(deps: ServiceControllerDeps) {
    this.deps = deps;
  }

  /** Morning reset (called by DayController before the banner shows). */
  beginDay(schedule: readonly ScheduledArrival[]): void {
    this.schedule = schedule;
    this.nextArrivalIdx = 0;
    this.arrivalCooldownSec = 1.5;
    this.active = null;
    this.servesToday = 0;
    this.coinsEarnedToday = 0;
    this.discoveriesToday = [];
    this.heartsGainedNamesToday = [];
    this.pendingJournalOpenRecipeId = null;
    this.servedCharacterIds.length = 0; // per-day roll for debugState identity hook
  }
  openService(schedule: readonly ScheduledArrival[], firstDelaySec: number): void {
    this.schedule = schedule;
    this.nextArrivalIdx = 0;
    this.arrivalCooldownSec = firstDelaySec;
  }

  get hasActive(): boolean {
    return this.active !== null;
  }

  get activeUnservedPending(): boolean {
    return this.active !== null && !this.active.servedThisVisit;
  }

  get arrivalsRemaining(): boolean {
    return this.nextArrivalIdx < this.schedule.length;
  }

  get servedCharacterIdsToday(): CharacterId[] {
    return this.servedCharacterIds;
  }

  /** Per-tick service progression; returns true when patience retired someone. */
  tick(dtSec: number): void {
    const ctx = this.deps.getContext();
    if (ctx.dayState.phase !== 'service') return;

    this.arrivalCooldownSec -= dtSec;
    if (!this.active && this.nextArrivalIdx < this.schedule.length && this.arrivalCooldownSec <= 0) {
      this.spawnNextCustomer();
    }

    if (this.active) {
      if (this.active.leaving) {
        // Cozy departure: ease back toward the door, then retire (no pop-out).
        tickTween(this.active.leaveTween, dtSec);
        if (this.active.leaveTween.done) this.retireActive(this.active.patience <= 0 && !this.active.servedThisVisit);
        return;
      }
      if (!this.active.entering) tickTween(this.active.walkTweeen, dtSec);
      if (this.active.walkTweeen.done && !this.active.servedThisVisit) {
        tickPatience(this.active, dtSec, ctx.save.settings.relaxed_mode ? RELAXED_PATIENCE_MULTIPLIER : 1);
        if (this.active.patience <= 0) {
          this.beginLeave();
        }
      }
      if (this.active && this.active.servedThisVisit) {
        this.active.lingerSec -= dtSec;
        if (this.active.lingerSec <= 0) this.beginLeave();
      }
    }
  }

  /** Start the graceful walk-out (idempotent). Cheap, calm, never blocking. */
  private beginLeave(): void {
    const a = this.active;
    if (!a || a.leaving) return;
    a.leaving = true;
    a.served = a.servedThisVisit; // hold the warm expression while leaving
    a.leaveTween = startTween(0, 1, this.deps.getContext().reducedMotion ? 0.01 : WALK_OUT_SEC);
    // Kind goodbye line the moment they turn to leave (cozy, never punitive).
    if (!a.servedThisVisit && a.patience <= 0) {
      const who = isRegular(a.characterId) ? displayName(a.characterId) : '';
      this.deps.toast(who ? `${who}: ${STRINGS.service.patienceOut}` : STRINGS.service.patienceOut);
    }
  }

  // ---- Spawning / announcements ------------------------------------------------

  spawnNextCustomer(): void {
    if (this.active) return;
    const arrival = this.schedule[this.nextArrivalIdx];
    if (arrival === undefined) return;
    const ctx = this.deps.getContext();

    const characterId = arrival.characterId;
    const base = createCustomer(characterId, arrival.orderRecipeId, patienceMaxFor(ctx));
    const mystery = arrival.mysteryOrder && characterId === 'wren';

    // Bubble icon: drink picture normally; "?" handled by scene for Wren's
    // unrevealed usual (picture-first rule, doc 05 §2).
    const view = arrival.orderRecipeId ? recipeToView(arrival.orderRecipeId) : null;
    const img = view ? loadDrinkIcon(view.icon) : null;

    const isFirstVisitOfDay = this.nextArrivalIdx === 0;
    this.active = {
      ...base,
      walkTweeen: startTween(0, 1, ctx.reducedMotion ? 0.01 : WALK_IN_SEC),
      lingerSec: 0,
      servedThisVisit: false,
      declinedMurky: false,
      orderIcon: img,
      mysteryOrder: mystery,
      leaving: false,
      leaveTween: startTween(0, 1, ctx.reducedMotion ? 0.01 : WALK_OUT_SEC),
    };

    playDoorChime(); // arrival cue (audio) + door animation handled visually
    this.nextArrivalIdx += 1;

    // Playtest fix #2: the doc 05 §3.1 "kettle opens automatically on first
    // arrival" behavior was REMOVED by owner decision — the panel must only
    // ever appear on an explicit click (kettle button or the order bubble).

    this.announceArrival(characterId, arrival.orderRecipeId, mystery, isFirstVisitOfDay);
  }

  /** Test hook: force-spawn now (clears the arrival cooldown). */
  debugSpawnNow(): void {
    this.arrivalCooldownSec = 0;
    if (!this.active) this.spawnNextCustomer();
  }

  private announceArrival(
    characterId: CharacterId,
    orderId: string | null,
    mystery: boolean,
    isFirstVisitOfDay: boolean,
  ): void {
    // Day-1 accepted script keeps its dedicated copy verbatim.
    const ctx = this.deps.getContext();
    if (ctx.dayState.day === 1 && isFirstVisitOfDay && characterId === 'fenwick') {
      this.deps.toast(`${STRINGS.service.fenwickArrives} ${STRINGS.service.fenwickFirstLine}`, 5000);
      return;
    }
    if (mystery) {
      this.deps.toast(STRINGS.service.wrenMysteryLine, 4000);
      return;
    }
    if (isRegular(characterId)) {
      const line = STRINGS.cast[characterId as RegularId].firstLine;
      this.deps.toast(
        format(STRINGS.service.arrivalTemplate, { name: displayName(characterId) }) +
          (isFirstVisitOfDay ? ` ${line}` : ''),
        isFirstVisitOfDay ? 4500 : 3200,
      );
    } else {
      this.deps.toast(STRINGS.service.travelerArrives);
    }
  }

  // ---- Chat ---------------------------------------------------------------------

  chatWithActive(): void {
    const ctx = this.deps.getContext();
    const active = this.active;
    if (!active || active.chatted || active.servedThisVisit) return;
    active.chatted = true;
    // The +1¤ tip is applied inside payoutForServe() at serve time (§4.1);
    // chat also earns +0.25 heart points for regulars (REPORTED VALUE).
    if (isRegular(active.characterId)) {
      const granted = awardChat(ctx.heartLedger, active.characterId as RegularId);
      if (granted > 0 && !this.heartsGainedNamesToday.includes(displayName(active.characterId as RegularId))) {
        this.heartsGainedNamesToday.push(displayName(active.characterId as RegularId));
      }
      this.deps.toast(format(STRINGS.service.heartPuff, { name: displayName(active.characterId as RegularId) }));
    } else {
      this.deps.toast(STRINGS.service.chatted);
    }
    // Record chat activity for narrative system
    recordChat(ctx.activityLedger, {
      npcId: active.characterId,
      day: ctx.dayState.day,
    });
  }

  // ---- Brew submission -------------------------------------------------------------

  /**
   * Resolve a completed kettle load against the waiting customer. The stock
   * gate + consumption already happened in KettleController.
   */
  submitBrew(input: BrewInput): void {
    const ctx = this.deps.getContext();
    const active = this.active;

    if (!active || active.servedThisVisit) {
      // Brewed with nobody waiting — practice pour.
      const result = resolveBrew(input, ctx.save.flags.discovered_recipes);
      recordBrew(ctx.activityLedger, {
        recipeId: result.recipeId ?? null,
        experimental: result.isMurky,
        wrenMystery: false,
        day: ctx.dayState.day,
      });
      this.deps.practicePour(result.isMurky);
      return;
    }

    // Wren arc resolution (M3/M4 gate D3): with all clues gathered, brewing his
    // exact usual (milk + honey + moonleaf, hot) plays the resolution scene —
    // the "Ah. There she is." beat — exactly once (seen_scenes guards re-entry).
    if (
      isRegular(active.characterId) &&
      active.characterId === 'wren' &&
      !active.servedThisVisit &&
      canAttemptWrenResolution(ctx.save) &&
      validateWrenUsualBrew(input)
    ) {
      const scene5 = WREN_SCENES.find((s) => s.id === 'wren_scene5') ?? null;
      if (scene5 && !ctx.save.flags.seen_scenes.includes(scene5.id)) {
        // Record Wren mystery brew completion
        recordWrenMysteryBrew(ctx.activityLedger, {
          clueNumber: 3, // Final clue - resolution brew
          day: ctx.dayState.day,
        });
        this.serveCustomer('R008'); // the drink itself lands: coins/hearts/discovery
        playScene(scene5, ctx.save, ctx.heartLedger, { onClose: () => {} }, ctx.activityLedger);
        return;
      }
    }

    const result = resolveBrew(input, ctx.save.flags.discovered_recipes);
    if (result.isMurky) {
      // Murky path (§2.4): polite decline, ingredients gone, no coins, no penalty.
      active.declinedMurky = true;
      recordBrew(ctx.activityLedger, {
        recipeId: null,
        experimental: true,
        wrenMystery: false,
        day: ctx.dayState.day,
      });
      this.deps.murkyDecline();
      return;
    }

    // Record brew before serving
    recordBrew(ctx.activityLedger, {
      recipeId: result.recipeId ?? null,
      experimental: false,
      wrenMystery: active.characterId === 'wren' && ctx.save.flags.wren_usual_revealed,
      day: ctx.dayState.day,
    });

    // Record Wren visit if serving Wren
    if (active.characterId === 'wren') {
      recordWrenVisit(ctx.activityLedger, {
        recipeId: result.recipeId as string,
        day: ctx.dayState.day,
      });
    }

    this.serveCustomer(result.recipeId as string);
  }

  private serveCustomer(recipeId: string): void {
    const ctx = this.deps.getContext();
    const active = this.active;
    if (!active) return;
    const favorite =
      isRegular(active.characterId) &&
      FAVORITES[active.characterId as RegularId] === recipeId;
    const payout = payoutForServe(recipeId, active.chatted, favorite);
    applyPayout(ctx.economy, payout);
    this.coinsEarnedToday += payout.total;
    this.servesToday += 1;

    // Hearts (doc 02 §5): travelers never earn; daily cap enforced in sim/hearts.
    if (isRegular(active.characterId) && !active.servedThisVisit) {
      const charId = active.characterId as RegularId;
      const granted = favorite
        ? awardFavoriteServe(ctx.heartLedger, charId)
        : awardCorrectServe(ctx.heartLedger, charId);
      if (granted > 0 && !this.heartsGainedNamesToday.includes(displayName(charId))) {
        this.heartsGainedNamesToday.push(displayName(charId));
      }
      // Heart puff floats from the customer on favorite serves (doc 04 §3 item 5).
      if (favorite && granted > 0) {
        const pos = customerPosition(active.walkTweeen.value);
        spawnHeartPuff(pos.x + 12, pos.y - 4);
      }
    }

    // Star-up moment (doc 02 §5 thresholds): toast + sparkle FX + HUD update.
    const starsBefore = ctx.economy.stars;
    const starsAfter = starsForServes(ctx.economy.totalServes);
    const starUp = starsAfter > starsBefore;

    // Discovery bookkeeping — remember it so the journal can open itself to the
    // new page after this visit (juice item 5).
    let justDiscovered = false;
    if (!ctx.save.flags.discovered_recipes.includes(recipeId)) {
      ctx.save.flags.discovered_recipes.push(recipeId);
      this.discoveriesToday.push(recipeId);
      justDiscovered = true;
    }

    // Learned preferences (journal Regulars tab shows favorites once learned).
    if (
      isRegular(active.characterId) &&
      favorite &&
      !ctx.save.flags.learned_prefs.includes(active.characterId as RegularId)
    ) {
      ctx.save.flags.learned_prefs.push(active.characterId as RegularId);
    }

    // Cup slides from the player's side of the counter to the customer with
    // ease-out on every successful delivery (doc 04 §3 item 2).
    const pos = customerPosition(active.walkTweeen.value);
    startCupSlide(Math.max(0, pos.x - 60), pos.y + 22, pos.x + 14, pos.y + 22, ctx.reducedMotion ? 0 : 0.55);

    active.servedThisVisit = true;
    active.served = true;
    this.servedCharacterIds.push(active.characterId); // debugState.servedCharacterIdsToday
    this.pendingJournalOpenRecipeId = justDiscovered && isRegular(active.characterId) ? recipeId : null;
    active.lingerSec = ctx.reducedMotion ? 0.6 : LINGER_SEC;

    // Record serve activity for narrative system
    recordServe(ctx.activityLedger, {
      npcId: active.characterId,
      recipeId,
      favorite,
      correct: true,
      chatted: active.chatted,
      day: ctx.dayState.day,
    });

    // Record recipe discovery if applicable
    if (justDiscovered) {
      recordRecipeDiscovered(ctx.activityLedger, {
        recipeId,
        source: 'brew',
        day: ctx.dayState.day,
      });
    }

    // Coin arc FX + happy line (+favorite variant), star-up sparkles.
    this.deps.fx.coins.push({ x: 340, y: 150, t: 0 });
    if (starUp) {
      this.deps.fx.sparkles.push({ x: 240, y: 120, t: 0 });
      this.deps.fx.sparkles.push({ x: 300, y: 140, t: 0.15 });
      this.deps.toast(format(STRINGS.service.starUpToast, { stars: starsAfter }), 4200);
    } else {
      this.deps.fx.sparkles.push({ x: 340, y: 140, t: 0 });
      this.deps.toast(payout.perfectBonus > 0 ? STRINGS.service.servedFavorite : STRINGS.service.servedHappy);
    }

    this.deps.syncHud();
  }

  // ---- Visit end ---------------------------------------------------------------

  private retireActive(leavingKindPatience: boolean): void {
    const finished = this.active;
    if (!finished) return;
    const ctx = this.deps.getContext();

    // NOTE: the kind-goodbye toast is shown at beginLeave() (the moment the
    // figure turns to go), not here — retiring is purely cleanup now.
    this.applyTeachBeatIfDue();

    // Check for scene triggers after the customer visit ends (served or left)
    if (isRegular(finished.characterId)) {
      const characterId = finished.characterId as 'fenwick' | 'wren' | 'sela' | 'bram' | 'nia';
      const scene = getTriggeredScene(characterId, ctx.save, ctx.heartLedger, ctx.dayState.day);
      if (scene) {
        playScene(scene, ctx.save, ctx.heartLedger, {
          onClose: () => {
            // Scene completed, continue with next arrival
          },
        }, ctx.activityLedger);
      }
    }

    this.active = null;

    // Fenwick arc epilogue reward (doc 03 §5 / M3 brief): the chili crate lands
    // in inventory AND therefore on the shelf when the visit that DELIVERED the
    // epilogue scene ends — keyed on the seen flag so it fires exactly once.
    grantFenwickChiliIfDue(ctx);

    // Juice item 5 (doc 04 §3): the journal opens ITSELF to the new entry after
    // a discovery serve — once the visit beat has fully ended.
    if (this.pendingJournalOpenRecipeId) {
      const recipeId = this.pendingJournalOpenRecipeId;
      this.pendingJournalOpenRecipeId = null;
      this.deps.onRecipeDiscovered(recipeId);
    }
  }

  /**
   * Teach beats (doc 03 §4 rewards, M2 scope = intro beats only). The scheduled
   * arrival carries teachesRecipeId; when that visit ends — served or not — the
   * recipe joins the known list, mirroring Fenwick's established R003 moment.
   */
  private applyTeachBeatIfDue(): void {
    const ctx = this.deps.getContext();
    const finishedIdx = this.nextArrivalIdx - 1;
    const arrival: ScheduledArrival | undefined = this.schedule[finishedIdx];
    const recipeId = arrival?.teachesRecipeId;
    if (!recipeId) return;
    if (ctx.save.flags.discovered_recipes.includes(recipeId)) return;

    ctx.save.flags.discovered_recipes.push(recipeId);
    this.discoveriesToday.push(recipeId);

    if (recipeId === 'R007' && arrival?.characterId === 'wren') {
      // Wren's reveal: flag saved so his future orders are concrete (brief §A).
      ctx.save.flags.wren_usual_revealed = true;
      this.deps.toast(STRINGS.service.wrenRevealToast, 6000);
      return;
    }

    const body = TEACH_BODY_BY_RECIPE[recipeId] ?? '';
    this.deps.toast(
      body
        ? `${format(STRINGS.service.taughtTemplate, { drink: recipeName(recipeId) })} ${body}`
        : format(STRINGS.service.taughtTemplate, { drink: recipeName(recipeId) }),
      6500,
    );
  }

  // ---- Render view --------------------------------------------------------------

  /** Snapshot for render/scene.ts; presentation-only projection of state. */
  visual(mysteryStillHidden: boolean): CustomerVisual | null {
    const ctx = this.deps.getContext();
    const active = this.active;
    if (!active) return null;
    // Effective walk progress: rises 0→1 on arrival, then eases back 1→0 while
    // leaving so the figure walks calmly toward the door (no pop-out).
    const effectiveWalkT = active.leaving
      ? 1 - active.leaveTween.value
      : active.walkTweeen.value;
    return {
      walkT: effectiveWalkT,
      served: active.servedThisVisit,
      leaving: active.leaving,
      patience: active.patience,
      showChatIcon: !active.chatted && active.walkTweeen.done && !active.leaving,
      bubbleVisible: active.walkTweeen.done && !active.leaving,
      bubbleImage: active.orderIcon,
      characterId: active.characterId,
      mysteryOrder: active.mysteryOrder && !mysteryStillHidden,
      bubbleRecipeId: active.orderRecipeId,
    };
  }

  // ---- Debug/test surface ---------------------------------------------------------

  debugState() {
    const ctx = this.deps.getContext();
    return {
      schedule: this.schedule.map((a) => ({
        characterId: a.characterId,
        orderRecipeId: a.orderRecipeId,
        mysteryOrder: a.mysteryOrder,
        teachesRecipeId: a.teachesRecipeId,
      })),
      servedCharacterIdsToday: this.servedCharacterIds,
      hasActive: !!this.active,
      activeCharacterId: this.active?.characterId ?? null,
      activeOrder: this.active?.orderRecipeId ?? null,
      activeMystery: this.active?.mysteryOrder ?? false,
      chatted: this.active?.chatted ?? false,
    };
  }
}

function displayName(characterId: CharacterId): string {
  if (characterId === 'traveler') return '';
  return STRINGS.cast[characterId as RegularId].name;
}

function recipeName(recipeId: string): string {
  return recipeToView(recipeId)?.name ?? recipeId;
}

function patienceMaxFor(ctx: ServiceContext): number {
  return patienceMax(ctx.save.upgrades);
}

const TEACH_BODY_BY_RECIPE: Readonly<Record<string, string>> = {
  R004: STRINGS.service.taughtR004Body,
  R005: STRINGS.service.taughtR005Body,
  R006: STRINGS.service.taughtR006Body,
};

/**
 * Grants Fenwick's gift exactly once (flag-guarded). Per the M4 brief sequence
 * "resolution → ember chili → epilogue", the crate lands when the RESOLUTION
 * scene (fenwick_scene5) has been completed. Called at every regular visit
 * end; the flag makes all but the first call no-ops.
 */
function grantFenwickChiliIfDue(ctx: ServiceContext): void {
  if (!ctx.save.flags.fenwick_arc_complete) return;
  if (ctx.save.flags.fenwick_chili_granted) return;
  ctx.save.flags.fenwick_chili_granted = true;
  // Mutate both the progression inventory (runtime) and save.inventory (persistence).
  ctx.inventory['ember_chili'] = (ctx.inventory['ember_chili'] ?? 0) + FENWICK_CHILI_GIFT_COUNT;
  ctx.save.inventory['ember_chili'] = (ctx.save.inventory['ember_chili'] ?? 0) + FENWICK_CHILI_GIFT_COUNT;
  writeSave(ctx.save);
  showToastRef(format(STRINGS.fenwick.chiliGiftToast, { count: FENWICK_CHILI_GIFT_COUNT }), 5000);
}

/** Injected late by GameController (toast host lives in the café DOM layer). */
let showToastRef: (message: string, ms?: number) => void = () => {};

export function setServiceToastFn(fn: (message: string, ms?: number) => void): void {
  showToastRef = fn;
}