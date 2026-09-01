// sim/customers.ts — doc 02 §3 (customer model, patience, §3.3 pacing) +
// doc 03 §4 (cast: personalities, first lines, favorites).
// Pure logic, no DOM/Canvas imports.
//
// M2 scope (doc 06 §3): intro beats + hearts ONLY — arcs are M3. Favorites per
// doc 03 §4: fenwick R004 (M1's R003 stand-in superseded), sela R005,
// bram R004, nia R006, wren R007. Wren's usual shows "?" until day 3+
// (debut sequencing deviation vs doc 05 §3.1 — see report; M1's accepted
// day-1 script is preserved verbatim).

import { RECIPES } from './brewing.js';

export type RegularId = 'fenwick' | 'sela' | 'bram' | 'nia' | 'wren';
/** Travelers ride the same Customer shape: coin flow only, no bonds. */
export type CharacterId = RegularId | 'traveler';

export function isRegular(id: CharacterId): id is RegularId {
  return id !== 'traveler';
}

export interface CharacterDef {
  id: RegularId;
  /** strings.json keys live under cast.<id>.{name,firstLine,desc}. */
  nameKey: string;
  firstLineKey: string;
  descKey: string;
  /** Doc 03 §4 favorite — drives perfect-serve bonus + heart points. */
  favoriteRecipeId: string;
}

export const CHARACTERS: readonly CharacterDef[] = [
  {
    id: 'fenwick',
    nameKey: 'cast.fenwick.name',
    firstLineKey: 'cast.fenwick.firstLine',
    descKey: 'cast.fenwick.desc',
    favoriteRecipeId: 'R004',
  },
  {
    id: 'sela',
    nameKey: 'cast.sela.name',
    firstLineKey: 'cast.sela.firstLine',
    descKey: 'cast.sela.desc',
    favoriteRecipeId: 'R005',
  },
  {
    id: 'bram',
    nameKey: 'cast.bram.name',
    firstLineKey: 'cast.bram.firstLine',
    descKey: 'cast.bram.desc',
    favoriteRecipeId: 'R004',
  },
  {
    id: 'nia',
    nameKey: 'cast.nia.name',
    firstLineKey: 'cast.nia.firstLine',
    descKey: 'cast.nia.desc',
    favoriteRecipeId: 'R006',
  },
  {
    id: 'wren',
    nameKey: 'cast.wren.name',
    firstLineKey: 'cast.wren.firstLine',
    descKey: 'cast.wren.desc',
    favoriteRecipeId: 'R007',
  },
] as const;

const CAST_BY_ID = new Map(CHARACTERS.map((c) => [c.id, c]));

export function getCharacter(id: RegularId): CharacterDef {
  const def = CAST_BY_ID.get(id);
  if (!def) throw new Error(`unknown regular: ${id}`);
  return def;
}

/** Per-character favorites table (doc 03 §4). */
export const FAVORITES: Readonly<Record<RegularId, string>> = {
  fenwick: 'R004',
  sela: 'R005',
  bram: 'R004',
  nia: 'R006',
  wren: 'R007',
};

/** One arrival — doc 02 §3.1. */
export interface Customer {
  characterId: CharacterId;
  /** Recipe id they want; null = undecided (Wren's pre-reveal mystery). */
  orderRecipeId: string | null;
  /** 0..100 (115 with window bench), drains while waiting (§3.2). */
  patience: number;
  /** True once the player has chatted with this arrival (tip gate, §4.1). */
  chatted: boolean;
  /** true while walking in from the door to the counter. */
  entering: boolean;
  /** true after being served (lingering briefly) or after a kind goodbye. */
  served: boolean;
}

export const PATIENCE_MAX = 100;
/**
 * Drain per second at full speed — doc 02 §3.2 "~0.8/sec". Relaxed Mode
 * (default ON) halves it; the controller applies that multiplier.
 */
export const PATIENCE_DRAIN_PER_SEC = 0.8;

export const RELAXED_PATIENCE_MULTIPLIER = 0.5;

/** Advance patience by dtSec. Clamped at zero; never negative. */
export function tickPatience(customer: Customer, dtSec: number, relaxedMultiplier: number): void {
  if (customer.served || customer.entering) return;
  customer.patience = Math.max(0, customer.patience - PATIENCE_DRAIN_PER_SEC * relaxedMultiplier * Math.max(0, dtSec));
}

function makeCustomer(
  characterId: CharacterId,
  orderRecipeId: string | null,
  maxPatience: number,
): Customer {
  return {
    characterId,
    orderRecipeId,
    patience: maxPatience,
    chatted: false,
    entering: false,
    served: false,
  };
}

/** Spawn any cast member or traveler. `maxPatience` carries upgrade bonuses. */
export function createCustomer(
  characterId: CharacterId,
  orderRecipeId: string | null,
  maxPatience: number = PATIENCE_MAX,
): Customer {
  return makeCustomer(characterId, orderRecipeId, maxPatience);
}

// ---- Daily schedule (doc 02 §3.3) --------------------------------------------

/** One scheduled arrival for a day. */
export interface ScheduledArrival {
  characterId: CharacterId;
  /** What they want; null ONLY for Wren's pre-reveal mystery order. */
  orderRecipeId: string | null;
  /** Bubble draws the "?" placeholder instead of a drink icon. */
  mysteryOrder: boolean;
  /** Set on teach visits (Fenwick R003 day 1; favorites from day 3; Wren reveal). */
  teachesRecipeId: string | null;
}

export interface ScheduleOptions {
  /** Deterministic seed; defaults to a day-derived constant. */
  seed?: number;
  /** Save flag: has Wren's "usual" been revealed? (post-reveal he orders R007). */
  wrenRevealed?: boolean;
}

export interface DaySchedule {
  /** Arrival sequence for the day. */
  arrivals: readonly ScheduledArrival[];
  /**
   * Index of the day-1 Fenwick visit that teaches R003 (legacy M1 contract),
   * or -1. Superseded per-arrival by ScheduledArrival.teachesRecipeId.
   */
  teacherIndex: number;
}

// Pacing tiers — doc 02 §3.3 (arrival counts inclusive).
const TIER_TUTORIAL_LAST_DAY = 2; // days 1–2: 4–5 arrivals
const TIER_FULL_CAST_LAST_DAY = 6; // days 3–6: 5–6 arrivals
const TIER_TRAVELERS_LAST_DAY = 13; // days 7–13: 6–8, travelers fill gaps

const ARRIVALS_MIN_TUTORIAL = 4;
const ARRIVALS_MIN_FULL_CAST = 5;
const ARRIVALS_MIN_TRAVELERS = 6;
const ARRIVALS_RANGE_TUTORIAL = 2; // 4..5
const ARRIVALS_RANGE_FULL_CAST = 2; // 5..6
const ARRIVALS_RANGE_TRAVELERS = 3; // 6..8
const ARRIVALS_MIN_SANDBOX = 6; // day 14+: 6..9
const ARRIVALS_RANGE_SANDBOX = 4;

/** Share of tier-3 arrivals that are travelers ("fill gaps"). */
const TRAVELER_SHARE_TIER3 = 0.25;

/** First day a visit can carry a favorite-teach beat (doc 02 §3.3 tier 2). */
const TEACH_FROM_DAY = 3;

/** Base trio every player knows immediately (or by day 2 via ensureR003). */
const BASE_TRIO: readonly string[] = ['R001', 'R002', 'R003'];

/** Day-1 accepted script — PRESERVED VERBATIM from M1 (see report). */
function tutorialDaySchedule(): DaySchedule {
  return {
    arrivals: [
      { characterId: 'fenwick', orderRecipeId: 'R001', mysteryOrder: false, teachesRecipeId: 'R003' },
      { characterId: 'fenwick', orderRecipeId: 'R003', mysteryOrder: false, teachesRecipeId: null },
      { characterId: 'bram', orderRecipeId: 'R002', mysteryOrder: false, teachesRecipeId: null },
      { characterId: 'sela', orderRecipeId: 'R002', mysteryOrder: false, teachesRecipeId: null },
    ],
    teacherIndex: 0,
  };
}

/** mulberry32 — tiny deterministic PRNG (seed → same sequence forever). */
function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function arrivalCountFor(day: number, rng: () => number): number {
  if (day <= TIER_TUTORIAL_LAST_DAY) {
    return ARRIVALS_MIN_TUTORIAL + Math.floor(rng() * ARRIVALS_RANGE_TUTORIAL);
  }
  if (day <= TIER_FULL_CAST_LAST_DAY) {
    return ARRIVALS_MIN_FULL_CAST + Math.floor(rng() * ARRIVALS_RANGE_FULL_CAST);
  }
  if (day <= TIER_TRAVELERS_LAST_DAY) {
    return ARRIVALS_MIN_TRAVELERS + Math.floor(rng() * ARRIVALS_RANGE_TRAVELERS);
  }
  return ARRIVALS_MIN_SANDBOX + Math.floor(rng() * ARRIVALS_RANGE_SANDBOX);
}

/** Seeded Fisher-Yates over the regular cast — varies who clusters per day. */
function shuffledCast(rng: () => number): RegularId[] {
  const cast = CHARACTERS.map((c) => c.id);
  for (let i = cast.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = cast[i] as RegularId;
    cast[i] = cast[j] as RegularId;
    cast[j] = tmp;
  }
  return cast;
}

/**
 * Per-day arrival schedule — full cast + travelers (doc 02 §3.3).
 *
 * Deterministic given (day, seed, wrenRevealed): identical inputs yield the
 * identical schedule. Teach beats mirror Fenwick's R003 moment: each regular's
 * FIRST visit on/after day 3 teaches their favorite; afterwards they order it.
 * Wren debuts day 2 with a "?" mystery; his first day-3+ visit reveals the
 * usual (teaches R007) unless already revealed via the save flag.
 */
export function buildDaySchedule(day: number, options: ScheduleOptions = {}): DaySchedule {
  if (day <= 1) return tutorialDaySchedule();

  const seed = options.seed ?? day * 1013904223; // day-derived default keeps purity
  const rng = makeRng(seed);
  const wrenRevealed = options.wrenRevealed ?? false;

  const count = arrivalCountFor(day, rng);
  const travelerSlots =
    day > TIER_FULL_CAST_LAST_DAY && day <= TIER_TRAVELERS_LAST_DAY
      ? Math.max(1, Math.round(count * TRAVELER_SHARE_TIER3))
      : 0;
  const sandboxTravelerSlots =
    day > TIER_TRAVELERS_LAST_DAY ? Math.max(1, Math.round(count * TRAVELER_SHARE_TIER3)) : 0;
  const totalTravelers = travelerSlots + sandboxTravelerSlots;

  // Interleave travelers evenly through the sequence.
  const travelerAt = new Set<number>();
  if (totalTravelers > 0) {
    for (let t = 0; t < totalTravelers; t++) {
      const pos = Math.min(count - 1, Math.round(((t + 1) * count) / (totalTravelers + 1)) - 1 + (t % 2));
      travelerAt.add(Math.max(0, pos));
    }
  }

  const order = shuffledCast(rng);
  const arrivals: ScheduledArrival[] = [];
  const taughtToday = new Set<string>();
  let wrenRevealDone = wrenRevealed;
  let lastChar: CharacterId | null = null;
  let regularIdx = 0;

  for (let slot = 0; slot < count; slot++) {
    if (travelerAt.has(slot)) {
      // Coin flow only: trio order, no bonds, no favorites.
      arrivals.push({
        characterId: 'traveler',
        orderRecipeId: BASE_TRIO[slot % BASE_TRIO.length] as string,
        mysteryOrder: false,
        teachesRecipeId: null,
      });
      lastChar = 'traveler';
      continue;
    }

    const id = order[regularIdx % order.length] as RegularId;
    regularIdx += 1;
    if (id === lastChar) {
      // Never two of the same regular back-to-back (reads as a double entry).
      const swap = order[(regularIdx + 1) % order.length] as RegularId;
      arrivals.push(makeRegularArrival(swap, slot, day, taughtToday, wrenRevealDone));
      if (swap === 'wren') wrenRevealDone = true;
      lastChar = swap;
      continue;
    }
    arrivals.push(makeRegularArrival(id, slot, day, taughtToday, wrenRevealDone));
    if (id === 'wren') wrenRevealDone = true;
    lastChar = id;
  }

  return { arrivals, teacherIndex: -1 };
}

function makeRegularArrival(
  id: RegularId,
  slot: number,
  day: number,
  taughtToday: Set<string>,
  wrenRevealed: boolean,
): ScheduledArrival {
  // Wren mystery: pre-reveal his order is unknowable ("?");
  if (id === 'wren' && !wrenRevealed) {
    if (day >= TEACH_FROM_DAY) {
      // Reveal visit: teaches R007 (same mechanic as Fenwick's R003 teach).
      taughtToday.add('wren');
      return { characterId: 'wren', orderRecipeId: null, mysteryOrder: true, teachesRecipeId: 'R007' };
    }
    return { characterId: 'wren', orderRecipeId: null, mysteryOrder: true, teachesRecipeId: null };
  }

  const favorite = FAVORITES[id];
  const teachReady = day >= TEACH_FROM_DAY && !taughtToday.has(favorite);
  if (teachReady) {
    // First eligible visit teaches the favorite; later slots order it.
    taughtToday.add(favorite);
    return { characterId: id, orderRecipeId: favorite, mysteryOrder: false, teachesRecipeId: favorite };
  }
  // Favorite already taught (earlier slot today, or a previous day) → the
  // regular knows what they like; otherwise rotate the base trio.
  const favoriteAssumedKnown = taughtToday.has(favorite) || day > TEACH_FROM_DAY;
  const order = favoriteAssumedKnown
    ? favorite
    : (BASE_TRIO[(day + slot) % BASE_TRIO.length] as string);
  return { characterId: id, orderRecipeId: order, mysteryOrder: false, teachesRecipeId: null };
}

/** Sanity helper used by tests/controller: every concrete order is a real recipe. */
export function validateScheduleOrders(orders: readonly (string | null)[]): boolean {
  const knownIds = new Set(RECIPES.map((r) => r.id));
  return orders.every((id) => id === null || knownIds.has(id));
}
