// ui/game.ts — the M2 game controller. Owns the day cycle (doc 02 §1),
// service loop (§3.2), full-cast arrivals (§3.3), brewing flow, economy +
// hearts application, upgrades, journal/shop wiring, autosave on recap,
// and the DOM side-dishes (morning banner, toasts).
// Canvas visuals delegate to render/scene.ts; sim rules live in src/sim.

import { playClick, playDoorChime, setRecordPlayerEnabled, playMusicForPhase } from '../audio/howl.js';
import type { DayPhase } from '../audio/howl.js';
import { STRINGS, format } from '../data/strings.js';
import { ingredientLabel, recipeToView, ALL_RECIPES } from '../data/recipes.js';
import { drawSceneLayer, createSceneFx, customerPosition } from '../render/scene.js';
import type { CustomerVisual } from '../render/scene.js';
import type { SceneFx } from '../render/scene.js';
import { DOOR_SIGN_RECT, getBubbleRect } from '../render/scene.js';
import { loadDrinkIcon, preloadAllArt } from '../render/images.js';
import { CountUp, startTween, tickTween } from '../render/tween.js';
import type { Tween } from '../render/tween.js';
import { spawnHeartPuff, startCupSlide, clearAllParticles, resetCupSlide, initParticles } from '../render/fx.js';
import {
  exportSaveCode,
} from '../save/crypto.js';
import { freshSave, loadSave, writeSave } from '../save/store.js';
import type { SaveData } from '../save/validate.js';
import { createInitialInventory } from '../sim/day.js';
import { closeDay, beginNextDay, openService } from '../sim/day.js';
import type { DayState, IngredientId, Inventory } from '../sim/day.js';
import { resolveBrew } from '../sim/brewing.js';
import type { BrewInput, BaseType } from '../sim/brewing.js';
import {
  FAVORITES,
  PATIENCE_MAX,
  RELAXED_PATIENCE_MULTIPLIER,
  buildDaySchedule,
  createCustomer,
  getCharacter,
  isRegular,
  tickPatience,
} from '../sim/customers.js';
import type { CharacterId, Customer, RegularId, ScheduledArrival } from '../sim/customers.js';
import {
  applyDelivery,
  isDeliveryDay,
  shelfIdsFor,
  shelfPrice,
  selaCartOpen,
} from '../sim/shelf.js';
import { shelfCapacity, patienceMax, hasCoffeeBase, brewAnimSec } from '../sim/upgrades.js';
import { purchaseUpgrade } from '../sim/upgrades.js';
import type { UpgradeId } from '../sim/upgrades.js';
import { applyPayout, payoutForServe, starsForServes } from '../sim/economy.js';
import type { EconomyState } from '../sim/economy.js';
import {
  awardChat,
  awardCorrectServe,
  awardFavoriteServe,
  createHeartLedger,
  displayedHearts,
  heartsFromSave,
  heartsToSave,
  resetHeartDay,
} from '../sim/hearts.js';
import type { HeartLedger } from '../sim/hearts.js';
import { openKettle, closeKettle, isKettleOpen, setKettleDraft } from './kettle.js';
import { showRecap } from './recap.js';
import { openJournal, closeJournal, isJournalOpen, openJournalToRecipe } from './journal.js';
import { openShop, closeShop, isShopOpen, setShopDayProvider } from './shop.js';
import { playScene, closeScene, isSceneOpen } from './scene.js';
import { getTriggeredScene, canAttemptWrenResolution, validateWrenUsualBrew } from '../data/scenes.js';
import { WREN_SCENES } from '../data/scenes.js';
import { applyTextSize, textSizeFromSettings, applyReducedMotionClass } from './textsize.js';

const WALK_IN_SEC = 2.2;
const LINGER_SEC = 3.0;

/** Kettle bases before the coffee machine (oat milk stays post-MVP). */
const BASE_BASES: readonly BaseType[] = ['water', 'milk'];

interface ActiveCustomer extends Customer {
  walkTweeen: Tween;
  lingerSec: number;
  servedThisVisit: boolean;
  declinedMurky: boolean;
  orderIcon: HTMLImageElement | null;
  mysteryOrder: boolean;
}

let save: SaveData;
let dayState: DayState;
let economy: EconomyState;
/** Full Inventory record — spread over createInitialInventory() on load. */
let inventory: Inventory = createInitialInventory();
let heartLedger: HeartLedger;
type ScheduledArrivalList = readonly ScheduledArrival[];
let schedule: ScheduledArrivalList = [];
let nextArrivalIdx = 0;
let arrivalCooldownSec = 1.5;

let active: ActiveCustomer | null = null;
let fx: SceneFx = createSceneFx();
let coinCount: CountUp | null = null;
let reducedMotion = false;

// DOM refs (created by initGame)
let bannerEl: HTMLElement | null = null;
let actionBarEl: HTMLElement | null = null;
let toastEl: HTMLElement | null = null;
let canvasEl: HTMLCanvasElement | null = null;
let onHudSync: ((s: { day: number; coins: number; stars: number }) => void) | null = null;
let doorSignHit: { x: number; y: number; w: number; h: number } | null = DOOR_SIGN_RECT;
let brewCountToday = 0;
let coinsEarnedToday = 0;
let servesToday = 0;
let discoveriesToday: string[] = [];
let heartsGainedNamesToday: string[] = [];
let kettleEverOpened = false;
let lastBrewInput: BrewInput | null = null;
/** Inline block message shown inside the kettle panel until the next open. */
let kettleBlockMessage: string | null = null;

export interface GameInit {
  saveData: SaveData;
  canvas: HTMLCanvasElement;
  onHudSync: (s: { day: number; coins: number; stars: number }) => void;
  onOpenSettings: () => void;
}

export function initGame(init: GameInit): void {
  save = init.saveData;
  canvasEl = init.canvas;
  onHudSync = init.onHudSync;
  reducedMotion = save.settings.reduced_motion || prefersReducedMotion();

  // Warm the ENTIRE art cache (room, sprites, portraits, all icons) at boot —
  // during the title screen — so no in-game frame ever waits on disk.
  preloadAllArt(ALL_RECIPES.map((r) => r.icon));

  economy = { coins: save.coins, stars: save.stars, totalServes: save.total_serves };
  inventory = { ...createInitialInventory(), ...save.inventory };
  heartLedger = heartsFromSave(save.hearts ?? {}, save.heart_points_today ?? {});
  dayState = { day: save.day, phase: 'prep' };
  fx = createSceneFx();
  coinCount = new CountUp(economy.coins, 18);

  // Text size applies globally the moment a game boots (doc 05 §6); persisted
  // in the save so it survives reload.
  applyTextSize(textSizeFromSettings(save.settings));
  applyReducedMotionClass(reducedMotion);
  initParticles();

  // Playtest fix #3: a save that already owns the record player resumes with
  // music enabled (playback itself waits for the title-screen unlock).
  if (save.upgrades.includes('record_player')) {
    setRecordPlayerEnabled(true);
  }

  buildDomLayer(init.onOpenSettings);
  setShopDayProvider(() => dayState.day);
  enterMorning();
}

function prefersReducedMotion(): boolean {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/** Persist the whole game state back into the save blob (evening recap only). */
function snapshotIntoSave(): void {
  save.day = dayState.day;
  save.coins = economy.coins;
  save.stars = economy.stars;
  save.total_serves = economy.totalServes;
  save.inventory = { ...inventory };
  const heartSnapshot = heartsToSave(heartLedger);
  save.hearts = heartSnapshot.hearts;
  save.heart_points_today = heartSnapshot.heart_points_today;
  writeSave(save);
}

// ---- DOM layer --------------------------------------------------------------

function buildDomLayer(onOpenSettings: () => void): void {
  const app = document.getElementById('app');
  if (!app) throw new Error('#app element not found');

  bannerEl = document.createElement('div');
  bannerEl.id = 'morning-banner';
  bannerEl.className = 'banner hidden';

  actionBarEl = document.createElement('div');
  actionBarEl.id = 'action-bar';
  actionBarEl.className = 'action-bar hidden';
  actionBarEl.setAttribute('role', 'toolbar');
  actionBarEl.setAttribute('aria-label', 'Café actions');

  toastEl = document.createElement('div');
  toastEl.id = 'toast';
  toastEl.className = 'toast hidden';
  toastEl.setAttribute('aria-live', 'polite');

  const kettleBtn = document.createElement('button');
  kettleBtn.type = 'button';
  kettleBtn.id = 'btn-kettle';
  kettleBtn.className = 'btn btn-primary action-kettle';
  kettleBtn.textContent = STRINGS.kettle.title;
  kettleBtn.addEventListener('click', () => {
    openKettleForOrder();
  });

  const journalBtn = document.createElement('button');
  journalBtn.type = 'button';
  journalBtn.id = 'btn-journal-quick';
  journalBtn.className = 'btn btn-secondary';
  journalBtn.textContent = STRINGS.journal.title;
  journalBtn.addEventListener('click', () => {
    openJournal(
      save,
      heartLedger,
      { hintedRecipes: HINTED_RECIPES },
      { onClose: closeJournal },
    );
  });

  const settingsBtn2 = document.createElement('button');
  settingsBtn2.type = 'button';
  settingsBtn2.id = 'btn-settings-quick';
  settingsBtn2.className = 'btn btn-secondary';
  settingsBtn2.textContent = STRINGS.settings.title;
  settingsBtn2.addEventListener('click', onOpenSettings);

  actionBarEl.appendChild(kettleBtn);
  actionBarEl.appendChild(journalBtn);
  actionBarEl.appendChild(settingsBtn2);

  // Click routing for the diegetic door sign drawn on the canvas.
  canvasEl?.addEventListener('click', handleCanvasClick);
  canvasEl?.addEventListener('mousemove', handleCanvasHover);

  app.appendChild(bannerEl);
  app.appendChild(actionBarEl);
  app.appendChild(toastEl);
}

/**
 * Recipes surfaced as riddle cards once "hinted" (doc 02 §2.2 hint economy):
 * every R004–R007 gets its board/letter hint within days 1–7, so all of them
 * are obtainable through normal channels (overseer-approved interpretation —
 * season labels are lore in M2).
 */
const HINTED_RECIPES: readonly string[] = ['R004', 'R005', 'R006', 'R007'];

/** Open the kettle from any entry point (button, order-bubble click). */
function openKettleForOrder(): void {
  kettleEverOpened = true;
  kettleBlockMessage = null;
  openKettle(kettleState(), {
    onBrew: handleBrew,
    onClose: () => {
      closeKettle();
    },
  });
}

function canvasPoint(e: MouseEvent): { x: number; y: number } | null {
  if (!canvasEl) return null;
  const rect = canvasEl.getBoundingClientRect();
  const scaleX = canvasEl.width / rect.width;
  const scaleY = canvasEl.height / rect.height;
  return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
}

/** True when the point sits inside an interactive canvas region (door sign,
 * customer order bubble). */
function hitsInteractive(p: { x: number; y: number } | null): boolean {
  if (!p) return false;
  if (doorSignHit) {
    const hit = doorSignHit;
    if (p.x >= hit.x && p.x <= hit.x + hit.w && p.y >= hit.y && p.y <= hit.y + hit.h) return true;
  }
  const bubble = getBubbleRect();
  if (bubble) {
    return p.x >= bubble.x && p.x <= bubble.x + bubble.w && p.y >= bubble.y && p.y <= bubble.y + bubble.h;
  }
  return false;
}

function handleCanvasClick(e: MouseEvent): void {
  const p = canvasPoint(e);
  if (!hitsInteractive(p)) return;
  // Bubble click → open the kettle to serve this order.
  const bubble = getBubbleRect();
  if (bubble && p && p.x >= bubble.x && p.x <= bubble.x + bubble.w && p.y >= bubble.y && p.y <= bubble.y + bubble.h) {
    openKettleForOrder();
    return;
  }
  if (dayState.phase === 'prep') openDoors();
  else if (dayState.phase === 'service' && (!active || active.servedThisVisit)) tryCloseDay();
}

// Pointer feedback (doc 05 §4): finger cursor over diegetic clickables.
function handleCanvasHover(e: MouseEvent): void {
  if (!canvasEl) return;
  canvasEl.style.cursor = hitsInteractive(canvasPoint(e)) ? 'pointer' : '';
}

function showToast(message: string, ms = 3200): void {
  if (!toastEl) return;
  toastEl.textContent = message;
  toastEl.classList.remove('hidden');
  window.setTimeout(() => toastEl?.classList.add('hidden'), ms);
}

// ---- Morning ----------------------------------------------------------------

function enterMorning(): void {
  dayState.phase = 'prep';
  schedule = [] as unknown as ScheduledArrivalList;
  nextArrivalIdx = 0;
  arrivalCooldownSec = 1.5;
  active = null;
  brewCountToday = 0;
  coinsEarnedToday = 0;
  servesToday = 0;
  discoveriesToday = [];
  heartsGainedNamesToday = [];
  pendingJournalOpenRecipeId = null;
  servedCharacterIds.length = 0; // per-day roll for the debugState identity hook
  // Scene-end cleanup (M4 memory gate): no particles, tweens or cup ghosts
  // survive a day boundary.
  clearAllParticles();
  resetCupSlide();
  resetHeartDay(heartLedger); // daily +1.0 cap resets each morning (doc 02 §5)

  // Playtest fix #3: morning/prep carries the calm track.
  cueMusic('prep');

  syncHud();

  if (isDeliveryDay(dayState.day)) {
    // Weekly auto-delivery (doc 02 §2.5): arrives mornings of days 8 and 15.
    applyDelivery(inventory);
    showToast(STRINGS.morning.deliveryArrived);
  }

  if (!bannerEl) return;
  bannerEl.classList.remove('hidden');
  bannerEl.replaceChildren();

  const title = document.createElement('p');
  title.className = 'banner-title';
  title.textContent = format(STRINGS.morning.prepTitle, { day: dayState.day });

  const shelfLine = document.createElement('p');
  shelfLine.className = 'note shelf-line';
  const stockText = stockedShelfLine();
  shelfLine.textContent = `${STRINGS.shelf.title}: ${stockText}`;

  const row = document.createElement('div');
  row.className = 'btn-row';

  const openBtn = document.createElement('button');
  openBtn.type = 'button';
  openBtn.id = 'btn-open-door';
  openBtn.className = 'btn btn-primary';
  openBtn.textContent = STRINGS.morning.openDoors;
  openBtn.addEventListener('click', openDoors);

  // "Sleep in" — skip the day entirely (doc 02 §1), one click from morning.
  const sleepBtn = document.createElement('button');
  sleepBtn.type = 'button';
  sleepBtn.className = 'btn btn-secondary';
  sleepBtn.textContent = STRINGS.morning.sleepIn;
  sleepBtn.addEventListener('click', () => {
    playClick();
    finishDay(0, false);
  });

  const hint = document.createElement('p');
  hint.className = 'note';
  hint.textContent = STRINGS.tutorial.kettleGlint;

  row.appendChild(openBtn);
  row.appendChild(sleepBtn);
  bannerEl.appendChild(title);
  bannerEl.appendChild(shelfLine);
  bannerEl.appendChild(row);
  bannerEl.appendChild(hint);
}

/** Shelf line for the morning banner — every stocked kind, capped display. */
function stockedShelfLine(): string {
  const parts: string[] = [];
  for (const id of shelfIdsFor('delivery').concat(shelfIdsFor('sela'))) {
    const count = inventory[id] ?? 0;
    if (count > 0) {
      parts.push(format(STRINGS.shelf.stockTemplate, { name: ingredientLabel(id), count }));
    }
  }
  return parts.length > 0 ? parts.join(' · ') : STRINGS.kettle.restockNote;
}

function openDoors(): void {
  playClick();
  openService(dayState);
  bannerEl?.classList.add('hidden');
  schedule = buildDaySchedule(dayState.day, {
    wrenRevealed: save.flags.wren_usual_revealed,
  }).arrivals;
  nextArrivalIdx = 0;
  arrivalCooldownSec = reducedMotion ? 0.4 : 1.5;

  // Playtest fix #3: service switches to the fireplace track.
  cueMusic('service');
}

// ---- Music phase cues (playtest fix #3) --------------------------------------

/** Forward the current day phase to the audio mixer (no-op pre-unlock). */
function cueMusic(phase: DayPhase): void {
  playMusicForPhase(phase);
}

// ---- Service loop -----------------------------------------------------------

function spawnNextCustomer(): void {
  if (active) return;
  const arrival = schedule[nextArrivalIdx];
  if (arrival === undefined) return;

  const characterId = arrival.characterId;
  const maxPatience = patienceMax(save.upgrades);
  const base = createCustomer(characterId, arrival.orderRecipeId, maxPatience);
  const mystery = arrival.mysteryOrder && characterId === 'wren';

  // Bubble icon: drink picture normally; "?" handled by scene for Wren's
  // unrevealed usual (picture-first rule, doc 05 §2).
  const view = arrival.orderRecipeId ? recipeToView(arrival.orderRecipeId) : null;
  const img = view ? loadDrinkIconFor(view.icon) : null;

  const isFirstVisitOfDay = nextArrivalIdx === 0;
  active = {
    ...base,
    walkTweeen: startTween(0, 1, reducedMotion ? 0.01 : WALK_IN_SEC),
    lingerSec: 0,
    servedThisVisit: false,
    declinedMurky: false,
    orderIcon: img,
    mysteryOrder: mystery,
  };

  playDoorChime(); // arrival cue (audio) + door animation handled visually
  nextArrivalIdx += 1;

  // Playtest fix #2: the doc 05 §3.1 "kettle opens automatically on first
  // arrival" behavior was REMOVED by owner decision — the panel must only
  // ever appear on an explicit click (kettle button or the order bubble).
  // kettleEverOpened stays tied to manual opens inside openKettleForOrder().

  announceArrival(characterId, arrival.orderRecipeId, mystery, isFirstVisitOfDay);
}

function loadDrinkIconFor(iconPath: string): HTMLImageElement {
  return loadDrinkIcon(iconPath);
}

function displayName(characterId: CharacterId): string {
  if (characterId === 'traveler') return '';
  return STRINGS.cast[characterId as RegularId].name;
}

function announceArrival(
  characterId: CharacterId,
  orderId: string | null,
  mystery: boolean,
  isFirstVisitOfDay: boolean,
): void {
  // Day-1 accepted script keeps its dedicated copy verbatim.
  if (dayState.day === 1 && isFirstVisitOfDay && characterId === 'fenwick') {
    showToast(`${STRINGS.service.fenwickArrives} ${STRINGS.service.fenwickFirstLine}`, 5000);
    return;
  }
  if (mystery) {
    showToast(STRINGS.service.wrenMysteryLine, 4000);
    return;
  }
  const drinkName = orderId ? recipeToView(orderId)?.name ?? '' : '';
  if (isRegular(characterId)) {
    const firstLineKey = getCharacter(characterId).firstLineKey;
    const line = resolveCastFirstLine(characterId);
    showToast(
      format(STRINGS.service.arrivalTemplate, { name: displayName(characterId) }) +
        (isFirstVisitOfDay ? ` ${line}` : ''),
      isFirstVisitOfDay ? 4500 : 3200,
    );
    void firstLineKey;
    void drinkName;
  } else {
    showToast(STRINGS.service.travelerArrives);
  }
}

/** First lines resolve through strings.json cast table (doc 03 §4). */
function resolveCastFirstLine(id: RegularId): string {
  return STRINGS.cast[id].firstLine;
}

function retireActive(leavingKindPatience: boolean): void {
  const finished = active;
  if (!finished) return;

  if (leavingKindPatience) {
    const who = isRegular(finished.characterId) ? displayName(finished.characterId) : '';
    showToast(who ? `${who}: ${STRINGS.service.patienceOut}` : STRINGS.service.patienceOut);
  }
  applyTeachBeatIfDue();

  // Check for scene triggers after the customer visit ends (served or left)
  if (isRegular(finished.characterId)) {
    const characterId = finished.characterId as 'fenwick' | 'wren' | 'sela' | 'bram' | 'nia';
    const scene = getTriggeredScene(characterId, save, heartLedger, dayState.day);
    if (scene) {
      playScene(scene, save, heartLedger, {
        onClose: () => {
          // Scene completed, continue with next arrival
        },
      });
    }
  }

  active = null;

  // Fenwick arc epilogue reward (doc 03 §5 / M3 brief): the chili crate lands
  // in inventory AND therefore on the shelf when the visit that DELIVERED the
  // epilogue scene ends — keyed on the seen flag so it fires exactly once.
  // Runs AFTER the trigger block above: playScene marks the flag synchronously.
  grantFenwickChiliIfDue();

  // Juice item 5 (doc 04 §3): the journal opens ITSELF to the new entry after
  // a discovery serve — once the visit beat has fully ended.
  if (pendingJournalOpenRecipeId) {
    const recipeId = pendingJournalOpenRecipeId;
    pendingJournalOpenRecipeId = null;
    openJournalToRecipe(save, heartLedger, { hintedRecipes: HINTED_RECIPES }, { onClose: closeJournal }, recipeId);
    showToast(STRINGS.journal.newEntryToast);
  }
}

/**
 * Grants Fenwick's gift exactly once (flag-guarded). Per the M4 brief sequence
 * "resolution → ember chili → epilogue", the crate lands when the RESOLUTION
 * scene (fenwick_scene5) has been completed — its controller-comment assigned
 * the grant to the resolution, and the epilogue then narrates handing it over.
 * Called at every regular visit end; the flag makes all but the first call
 * no-ops, so the crate cannot duplicate across visits or reloads.
 */
function grantFenwickChiliIfDue(): void {
  if (!save.flags.fenwick_arc_complete) return;
  if (save.flags.fenwick_chili_granted) return;
  save.flags.fenwick_chili_granted = true;
  inventory['ember_chili'] = (inventory['ember_chili'] ?? 0) + FENWICK_CHILI_GIFT_COUNT;
  showToast(format(STRINGS.fenwick.chiliGiftToast, { count: FENWICK_CHILI_GIFT_COUNT }), 5000);
}

const FENWICK_CHILI_GIFT_COUNT = 4;

/**
 * Teach beats (doc 03 §4 rewards, M2 scope = intro beats only). The scheduled
 * arrival carries teachesRecipeId; when that visit ends — served or not — the
 * recipe joins the known list, mirroring Fenwick's established R003 moment.
 */
function applyTeachBeatIfDue(): void {
  const finishedIdx = nextArrivalIdx - 1;
  const arrival: ScheduledArrival | undefined = schedule[finishedIdx];
  const recipeId = arrival?.teachesRecipeId;
  if (!recipeId) return;
  if (save.flags.discovered_recipes.includes(recipeId)) return;

  save.flags.discovered_recipes.push(recipeId);
  discoveriesToday.push(recipeId);

  if (recipeId === 'R007' && arrival?.characterId === 'wren') {
    // Wren's reveal: flag saved so his future orders are concrete (brief §A).
    save.flags.wren_usual_revealed = true;
    showToast(STRINGS.service.wrenRevealToast, 6000);
    return;
  }

  const body = TEACH_BODY_BY_RECIPE[recipeId] ?? '';
  showToast(
    body
      ? `${format(STRINGS.service.taughtTemplate, { drink: recipeName(recipeId) })} ${body}`
      : format(STRINGS.service.taughtTemplate, { drink: recipeName(recipeId) }),
    6500,
  );
}

const TEACH_BODY_BY_RECIPE: Readonly<Record<string, string>> = {
  R004: STRINGS.service.taughtR004Body,
  R005: STRINGS.service.taughtR005Body,
  R006: STRINGS.service.taughtR006Body,
};

function recipeName(recipeId: string): string {
  return recipeToView(recipeId)?.name ?? recipeId;
}

function handleBrew(input: BrewInput): void {
  brewCountToday += 1;
  lastBrewInput = input;

  // Stock gate first (doc §2.5): missing ingredients block with an inline
  // message in the kettle panel — never a dialog, nothing consumed.
  const missing = input.ingredients.filter((id) => (inventory[id] ?? 0) <= 0);
  if (missing.length > 0) {
    kettleBlockMessage = format(STRINGS.kettle.outOfStock, {
      items: missing.map((m) => ingredientLabel(m)).join(', '),
    });
    showToast(kettleBlockMessage);
    // Re-open refreshes the panel with the inline note visible.
    openKettle(kettleState(), {
      onBrew: handleBrew,
      onClose: () => {
        closeKettle();
      },
    });
    return;
  }

  // Consume ingredients regardless of outcome (murky path still uses them).
  for (const id of input.ingredients) inventory[id] = (inventory[id] ?? 0) - 1;
  closeKettle();
  kettleBlockMessage = null;

  if (!active || active.servedThisVisit) {
    // Brewed with nobody waiting — practice pour.
    const result = resolveBrew(input, save.flags.discovered_recipes);
    if (result.isMurky) showToast(STRINGS.kettle.murkyNote);
    else showToast(STRINGS.kettle.brew);
    return;
  }

  // Wren arc resolution (M3/M4 gate D3): with all clues gathered, brewing his
  // exact usual (milk + honey + moonleaf, hot) plays the resolution scene —
  // the "Ah. There she is." beat — exactly once (seen_scenes guards re-entry).
  if (
    isRegular(active.characterId) &&
    active.characterId === 'wren' &&
    !active.servedThisVisit &&
    canAttemptWrenResolution(save) &&
    validateWrenUsualBrew(input)
  ) {
    const scene5 = WREN_SCENES.find((s) => s.id === 'wren_scene5') ?? null;
    if (scene5 && !save.flags.seen_scenes.includes(scene5.id)) {
      serveCustomer('R008'); // the drink itself lands: coins/hearts/discovery
      playScene(scene5, save, heartLedger, { onClose: () => {} });
      return;
    }
  }

  const result = resolveBrew(input, save.flags.discovered_recipes);
  if (result.isMurky) {
    // Murky path (§2.4): polite decline, ingredients gone, no coins, no penalty.
    active.declinedMurky = true;
    showToast(`${STRINGS.kettle.murkyTitle} — ${STRINGS.kettle.murkyLine}`);
    return;
  }

  serveCustomer(result.recipeId as string);
}

function serveCustomer(recipeId: string): void {
  if (!active) return;
  const favorite =
    isRegular(active.characterId) &&
    FAVORITES[active.characterId as RegularId] === recipeId;
  const payout = payoutForServe(recipeId, active.chatted, favorite);
  applyPayout(economy, payout);
  coinsEarnedToday += payout.total;
  servesToday += 1;

  // Hearts (doc 02 §5): travelers never earn; daily cap enforced in sim/hearts.
  if (isRegular(active.characterId) && !active.servedThisVisit) {
    const charId = active.characterId as RegularId;
    const granted = favorite
      ? awardFavoriteServe(heartLedger, charId)
      : awardCorrectServe(heartLedger, charId);
    if (granted > 0 && !heartsGainedNamesToday.includes(displayName(charId))) {
      heartsGainedNamesToday.push(displayName(charId));
    }
    // Heart puff floats from the customer on favorite serves (doc 04 §3 item 5).
    if (favorite && granted > 0) {
      const pos = customerPosition(active.walkTweeen.value);
      spawnHeartPuff(pos.x + 12, pos.y - 4);
    }
  }

  // Star-up moment (doc 02 §5 thresholds): toast + sparkle FX + HUD update.
  const starsBefore = economy.stars;
  const starsAfter = starsForServes(economy.totalServes);
  const starUp = starsAfter > starsBefore;

  // Discovery bookkeeping — remember it so the journal can open itself to the
  // new page after this visit (juice item 5).
  let justDiscovered = false;
  if (!save.flags.discovered_recipes.includes(recipeId)) {
    save.flags.discovered_recipes.push(recipeId);
    discoveriesToday.push(recipeId);
    justDiscovered = true;
  }

  // Learned preferences (journal Regulars tab shows favorites once learned).
  if (
    isRegular(active.characterId) &&
    favorite &&
    !save.flags.learned_prefs.includes(active.characterId as RegularId)
  ) {
    save.flags.learned_prefs.push(active.characterId as RegularId);
  }

  // Cup slides from the player's side of the counter to the customer with
  // ease-out on every successful delivery (doc 04 §3 item 2).
  const pos = customerPosition(active.walkTweeen.value);
  startCupSlide(Math.max(0, pos.x - 60), pos.y + 22, pos.x + 14, pos.y + 22, reducedMotion ? 0 : 0.55);

  active.servedThisVisit = true;
  active.served = true;
  servedCharacterIds.push(active.characterId); // debugState.servedCharacterIdsToday
  pendingJournalOpenRecipeId = justDiscovered && isRegular(active.characterId) ? recipeId : null;
  active.lingerSec = reducedMotion ? 0.6 : LINGER_SEC;

  // Coin arc FX + happy line (+favorite variant), star-up sparkles.
  fx.coins.push({ x: 340, y: 150, t: 0 });
  if (starUp) {
    fx.sparkles.push({ x: 240, y: 120, t: 0 });
    fx.sparkles.push({ x: 300, y: 140, t: 0.15 });
    showToast(format(STRINGS.service.starUpToast, { stars: starsAfter }), 4200);
  } else {
    fx.sparkles.push({ x: 340, y: 140, t: 0 });
    showToast(payout.perfectBonus > 0 ? STRINGS.service.servedFavorite : STRINGS.service.servedHappy);
  }

  syncHud();
}

/**
 * Set when a serve discovered a recipe during a regular's visit; consumed at
 * retireActive() to open the journal straight to the new entry (the visit-end
 * beat keeps the discovery moment calm instead of interrupting mid-linger).
 */
let pendingJournalOpenRecipeId: string | null = null;

/** Favorites table accessor (kept local so tests can spy via module boundary). */
function favoritesOf(id: RegularId): string {
  return FAVORITES[id];
}

function chatWithActive(): void {
  if (!active || active.chatted || active.servedThisVisit) return;
  active.chatted = true;
  // The +1¤ tip is applied inside payoutForServe() at serve time (§4.1);
  // chat also earns +0.25 heart points for regulars (REPORTED VALUE).
  if (isRegular(active.characterId)) {
    const granted = awardChat(heartLedger, active.characterId as RegularId);
    if (granted > 0 && !heartsGainedNamesToday.includes(displayName(active.characterId as RegularId))) {
      heartsGainedNamesToday.push(displayName(active.characterId as RegularId));
    }
    showToast(format(STRINGS.service.heartPuff, { name: displayName(active.characterId as RegularId) }));
  } else {
    showToast(STRINGS.service.chatted);
  }
}

function tryCloseDay(): void {
  if (dayState.phase !== 'service') return;
  if (schedule.length > 0 && nextArrivalIdx < schedule.length && !active) {
    // Still arrivals pending — gently nudge instead of closing early.
    showToast(STRINGS.service.closeHint);
    return;
  }
  finishDay(coinsEarnedToday, true);
}

// ---- Upgrades ----------------------------------------------------------------

function buyUpgrade(id: UpgradeId): void {
  const result = purchaseUpgrade(economy.coins, save.upgrades, id);
  if (!result.ok) return; // shop UI already showed the muted/wiggle/note path
  economy.coins = result.coins;
  save.upgrades.length = 0;
  save.upgrades.push(...result.owned);

  if (id === 'record_player') {
    setRecordPlayerEnabled(true);
  }
  syncHud();
}

function buyIngredient(id: IngredientId, price: number): void {
  if (economy.coins < price) return;
  economy.coins -= price;
  inventory[id] = (inventory[id] ?? 0) + 1;
  syncHud();
}

/**
 * Evening: recap modal (+ shop button) → autosave → next morning (doc 02 §1, §7.1).
 * The save is written AFTER rolling forward where possible; see snapshot points
 * below — reload always resumes at a clean morning.
 */
function finishDay(coinsEarned: number, showRecapModal: boolean): void {
  const finishedDay = dayState.day;
  closeDay(dayState); // phase = 'recap' for the modal

  if (!showRecapModal) {
    beginNextDay(dayState);
    ensureR003ByDay2();
    snapshotIntoSave(); // single atomic write at the autosave point
    enterMorning();
    return;
  }

  // Autosave fires AT the recap (doc 02 §7.1): persist immediately so quitting
  // during the modal never loses progress. Rollover re-saves after Continue.
  snapshotIntoSave();

  // Playtest fix #3: the evening recap gets its own track (crossfades over).
  cueMusic('recap');

  showRecap(
    {
      day: finishedDay,
      coinsEarned,
      drinksServed: servesToday,
      newRecipeIds: [...discoveriesToday],
      heartsGainedBy: [...heartsGainedNamesToday],
    },
    reducedMotion,
    () => {
      beginNextDay(dayState);
      ensureR003ByDay2();
      resetHeartDay(heartLedger);
      snapshotIntoSave(); // autosave point per doc 02 §7.1
      enterMorning();
    },
    () => {
      openShop({
        getCoins: () => economy.coins,
        getOwnedUpgrades: () => save.upgrades,
        getInventory: () => inventory,
        getShelfCapacity: () => shelfCapacity(save.upgrades),
        onBuyUpgrade: buyUpgrade,
        onBuyIngredient: (id) => buyIngredient(id, shelfPrice(id)),
        onClose: closeShop,
      });
    },
  );

  // Fill discovery names after mount (display names come from strings).
  for (const li of document.querySelectorAll('#recap-overlay li[data-recipe-id]')) {
    const id = li.getAttribute('data-recipe-id');
    const view = id ? recipeToView(id) : null;
    if (view) li.textContent = `${view.name} — ${view.combo}`;
  }
}

/** R003 must be known by day 2 even if the teaching visit was missed. */
function ensureR003ByDay2(): void {
  if (dayState.day >= 2 && !save.flags.discovered_recipes.includes('R003')) {
    save.flags.discovered_recipes.push('R003');
  }
}

// ---- Per-tick ---------------------------------------------------------------

export function tickGame(dtSec: number, timeMs: number): void {
  if (!canvasEl) return;

  if (dayState.phase === 'service') {
    arrivalCooldownSec -= dtSec;
    if (!active && nextArrivalIdx < schedule.length && arrivalCooldownSec <= 0) {
      spawnNextCustomer();
    }

    if (active) {
      if (!active.entering) tickTween(active.walkTweeen, dtSec);
      if (active.walkTweeen.done && !active.servedThisVisit) {
        tickPatience(active, dtSec, save.settings.relaxed_mode ? RELAXED_PATIENCE_MULTIPLIER : 1);
        if (active.patience <= 0) {
          retireActive(true);
        }
      }
      if (active && active.servedThisVisit) {
        active.lingerSec -= dtSec;
        if (active.lingerSec <= 0) retireActive(false);
      }
    }

    // Gentle close suggestion when queue empty and nobody at counter.
    if (
      !active &&
      nextArrivalIdx >= schedule.length
    ) {
      ensureCloseButton();
    }
  }
}

function ensureCloseButton(): void {
  if (!actionBarEl || document.getElementById('btn-close-door')) return;
  const b = document.createElement('button');
  b.type = 'button';
  b.id = 'btn-close-door';
  b.className = 'btn btn-secondary';
  b.textContent = `${STRINGS.service.closeDoor} (${STRINGS.service.closeHint})`;
  b.addEventListener('click', () => tryCloseDay());
  actionBarEl.appendChild(b);
}

/** Exported so the bootstrap loop can render EVERY rAF frame (fixes flicker:
 * rendering must run per-frame, not only when a sim step happens). */
export function render(timeMs: number, dtSec: number): void {
  if (!canvasEl) return;
  const ctx = canvasEl.getContext('2d');
  if (!ctx) return;
  // NOTE: no clearRect here — beginFrame() + drawCafeRoom() already painted
  // the full frame base; clearing here would black out the room each frame.

  let visual: CustomerVisual | null = null;
  if (active) {
    visual = {
      walkT: active.walkTweeen.value,
      served: active.servedThisVisit,
      leaving: !active.servedThisVisit && active.patience <= 0,
      patience: active.patience,
      showChatIcon: !active.chatted && active.walkTweeen.done,
      bubbleVisible: active.walkTweeen.done,
      bubbleImage: active.orderIcon,
      characterId: active.characterId,
      mysteryOrder: active.mysteryOrder && !save.flags.wren_usual_revealed,
      bubbleRecipeId: active.orderRecipeId,
    };
  }

  drawSceneLayer(
    ctx,
    {
      serviceOpen: dayState.phase === 'service',
      prepPhase: dayState.phase === 'prep',
      customer: visual,
      mopsAsleep: true,
      kettleGlint: dayState.phase === 'prep' && !kettleEverOpened,
      journalPulse: dayState.day === 1 && dayState.phase === 'prep',
      reducedMotion,
      timeMs,
      hasWindowBench: save.upgrades.includes('window_bench'),
      hasHearthExpansion: save.upgrades.includes('hearth_expansion'),
    },
    fx,
    dtSec,
  );

  coinCount?.setTarget(economy.coins, reducedMotion);
  coinCount?.tick(dtSec);
  syncHudCoins();
}

function syncHudCoins(): void {
  if (!coinCount) return;
  onHudSync?.({
    day: dayState.day,
    coins: coinCount.value,
    stars: economy.stars,
  });
}

function syncHud(): void {
  onHudSync?.({
    day: dayState.day,
    coins: coinCount?.value ?? economy.coins,
    stars: economy.stars,
  });
}

function kettleState() {
  const bases: BaseType[] = hasCoffeeBase(save.upgrades)
    ? [...BASE_BASES, 'coffee']
    : [...BASE_BASES];
  return {
    knownRecipeIds: save.flags.discovered_recipes,
    lastBrew: lastBrewInput,
    inventory,
    // Whole shelf listing — chips carry owned counts, disabled at zero (§E).
    ingredientChoices: shelfIdsFor('delivery').concat(shelfIdsFor('sela')),
    availableBases: bases,
    hasSecondKettle: save.upgrades.includes('second_kettle'),
    outOfStockNoteVisible:
      Object.values(inventory).reduce((sum: number, n) => sum + Math.max(0, n), 0 as number) === 0,
    brewBlockMessage: kettleBlockMessage,
  };
}

/** Called when settings changed (relaxed mode etc.) so they apply immediately. */
export function applySettings(next: SaveData['settings']): void {
  save.settings = { ...next };
  reducedMotion = next.reduced_motion || prefersReducedMotion();
  // Text size + reduced-motion class are live-applied (doc 05 §6), persisted.
  applyTextSize(textSizeFromSettings(next));
  applyReducedMotionClass(reducedMotion);
  writeSave(save);
}

/** Reload state after an import replaced the localStorage blob. */
export function reloadFromStorage(): void {
  const loaded = loadSave();
  if (loaded.ok) {
    save = loaded.data;
    economy = { coins: save.coins, stars: save.stars, totalServes: save.total_serves };
    inventory = { ...createInitialInventory(), ...save.inventory };
    heartLedger = heartsFromSave(save.hearts ?? {}, save.heart_points_today ?? {});
    dayState = { day: save.day, phase: 'prep' };
    coinCount = new CountUp(economy.coins, 18);
    active = null;
    reducedMotion = save.settings.reduced_motion || prefersReducedMotion();
    enterMorning();
  }
}

// ---- Debug/testing hooks — used by headless smoke tests (EXTEND-only) --------

export function debugState(): object {
  return {
    phase: dayState.phase,
    day: dayState.day,
    coins: economy.coins,
    stars: economy.stars,
    totalServes: economy.totalServes,
    inventory: { ...inventory },
    discovered: [...save.flags.discovered_recipes],
    learnedPrefs: [...save.flags.learned_prefs],
    seenScenes: [...save.flags.seen_scenes],
    wrenRevealed: save.flags.wren_usual_revealed,
    letters: [...save.letters],
    upgrades: [...save.upgrades],
    hearts: { ...heartLedger.points },
    heartsDisplayed: Object.fromEntries(
      (Object.keys(heartLedger.points) as RegularId[]).map((id) => [id, displayedHearts(heartLedger, id)]),
    ),
    schedule: schedule.map((a) => ({
      characterId: a.characterId,
      orderRecipeId: a.orderRecipeId,
      mysteryOrder: a.mysteryOrder,
      teachesRecipeId: a.teachesRecipeId,
    })),
    servedCharacterIdsToday: servedCharacterIds,
    hasActive: !!active,
    activeCharacterId: active?.characterId ?? null,
    activeOrder: active?.orderRecipeId ?? null,
    activeMystery: active?.mysteryOrder ?? false,
    chatted: active?.chatted ?? false,
    kettleBlockMessage,
    journalOpen: isJournalOpen(),
    shopOpen: isShopOpen(),
    sceneOpen: isSceneOpen(),
  };
}

const servedCharacterIds: CharacterId[] = [];

/** Test hook: force-spawn the next scheduled customer now. */
export function debugSpawnNow(): void {
  arrivalCooldownSec = 0;
  if (!active) spawnNextCustomer();
}

/** Test hook: chat with the active customer. */
export function debugChat(): void {
  chatWithActive();
}

/** Test hook: brew directly without opening the panel. */
export function debugBrew(input: BrewInput): void {
  handleBrew(input);
}

/** Test hook: close the day (service only). */
export function debugCloseDay(): void {
  tryCloseDay();
}

/** Test hook: continue past recap if present. */
export function debugContinueRecap(): void {
  (document.getElementById('recap-continue') as HTMLButtonElement | null)?.click();
}

/** Test hook: open the journal via the controller path. */
export function debugOpenJournal(): void {
  openJournal(save, heartLedger, { hintedRecipes: HINTED_RECIPES }, { onClose: closeJournal });
}

/** Test hook: close the journal via the controller path. */
export function debugCloseJournal(): void {
  closeJournal();
}

/** Test hook: attempt an upgrade purchase through the controller path. */
export function debugBuyUpgrade(id: UpgradeId): void {
  buyUpgrade(id);
}

/** Test hook: current patience ceiling incl. window-bench bonus. */
export function debugPatienceMax(): number {
  return patienceMax(save.upgrades);
}

/** Test hook: current distinct-kind shelf capacity. */
export function debugShelfCapacity(): number {
  return shelfCapacity(save.upgrades);
}

/** Test hook: brew animation constant (hearth expansion shortens it). */
export function debugBrewAnimSec(): number {
  return brewAnimSec(save.upgrades);
}

/** Test hook: Sela cart availability today (option ii rule). */
export function debugSelaCartOpen(): boolean {
  return selaCartOpen(dayState.day);
}

/** Test hook: raw save access for continuity assertions. */
export function debugSaveSnapshot(): SaveData {
  snapshotIntoSave();
  return JSON.parse(JSON.stringify(save)) as SaveData;
}

export { exportSaveCode };
