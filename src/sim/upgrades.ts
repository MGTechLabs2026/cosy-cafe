// sim/upgrades.ts — doc 02 §4.2 (curated upgrade track) + §2.5 capacity note.
// Pure logic, no DOM/Canvas imports. Costs are EXACT per §4.2; effects apply
// through small pure accessors so the controller can react immediately.

export type UpgradeId =
  | 'second_kettle'
  | 'bigger_shelf'
  | 'window_bench'
  | 'coffee_machine'
  | 'record_player'
  | 'hearth_expansion';

export interface UpgradeDef {
  id: UpgradeId;
  /** strings.json key under upgrades.items.<id>. */
  nameKey: string;
  descKey: string;
  cost: number; // ¤, exact per doc 02 §4.2
  /** Bigger shelf only: repeatable ×2 per §2.5 ("upgradeable to 12"). */
  repeatable: boolean;
}

// ---- Tuned constants (values reported as deviations where the doc was vague) --

/** Shelf capacity: starts 6 slots → 9 → 12 (doc 02 §2.5 + §4.2 "+3 slots"). */
export const SHELF_SLOTS_BASE = 6;
export const SHELF_SLOTS_PER_UPGRADE = 3;
export const BIGGER_SHELF_MAX_PURCHASES = 2;

/**
 * Window bench patience bonus — REPORTED VALUE. Doc's literal "+1 patience" is
 * imperceptible against a 0.8/sec drain; we grant +15 starting patience
 * (115/100 scale) so the upgrade is felt.
 */
export const WINDOW_BENCH_PATIENCE_BONUS = 15;

/**
 * Brew animation timing — hearth expansion speeds it up. Values REPORTED:
 * base brew animation 1.6 s → 1.0 s after the hearth upgrade.
 */
export const BREW_ANIM_SEC_BASE = 1.6;
export const BREW_ANIM_SEC_HEARTH = 1.0;

export const UPGRADES: readonly UpgradeDef[] = [
  { id: 'second_kettle', nameKey: 'upgrades.items.second_kettle.name', descKey: 'upgrades.items.second_kettle.desc', cost: 60, repeatable: false },
  { id: 'bigger_shelf', nameKey: 'upgrades.items.bigger_shelf.name', descKey: 'upgrades.items.bigger_shelf.desc', cost: 40, repeatable: true },
  { id: 'window_bench', nameKey: 'upgrades.items.window_bench.name', descKey: 'upgrades.items.window_bench.desc', cost: 45, repeatable: false },
  { id: 'coffee_machine', nameKey: 'upgrades.items.coffee_machine.name', descKey: 'upgrades.items.coffee_machine.desc', cost: 80, repeatable: false },
  { id: 'record_player', nameKey: 'upgrades.items.record_player.name', descKey: 'upgrades.items.record_player.desc', cost: 70, repeatable: false },
  { id: 'hearth_expansion', nameKey: 'upgrades.items.hearth_expansion.name', descKey: 'upgrades.items.hearth_expansion.desc', cost: 90, repeatable: false },
] as const;

const UPGRADES_BY_ID = new Map(UPGRADES.map((u) => [u.id, u]));

export function getUpgrade(id: string): UpgradeDef | undefined {
  return UPGRADES_BY_ID.get(id as UpgradeId);
}

/** How many times `id` already sits in the owned list. */
export function ownedCount(owned: readonly string[], id: UpgradeId): number {
  return owned.filter((entry) => entry === id).length;
}

/** Can this upgrade be bought right now (not already held / not exhausted)? */
export function isUpgradeAvailable(owned: readonly string[], id: UpgradeId): boolean {
  const def = UPGRADES_BY_ID.get(id);
  if (!def) return false;
  if (!def.repeatable) return ownedCount(owned, id) === 0;
  return ownedCount(owned, id) < BIGGER_SHELF_MAX_PURCHASES;
}

export type PurchaseResult =
  | { ok: true; coins: number; owned: string[] }
  | { ok: false; reason: 'insufficient_funds' | 'unavailable'; deficit: number };

/**
 * Attempt a purchase. Insufficient funds NEVER mutate state (doc 05 §5) and
 * report the exact "earn ¤N more" deficit for the inline note.
 */
export function purchaseUpgrade(
  coins: number,
  owned: readonly string[],
  id: UpgradeId,
): PurchaseResult {
  const def = UPGRADES_BY_ID.get(id);
  if (!def || !isUpgradeAvailable(owned, id)) {
    return { ok: false, reason: 'unavailable', deficit: def ? Math.max(0, def.cost - coins) : 0 };
  }
  if (coins < def.cost) {
    return { ok: false, reason: 'insufficient_funds', deficit: def.cost - coins };
  }
  return { ok: true, coins: coins - def.cost, owned: [...owned, id] };
}

/** Current distinct-ingredient-kind shelf capacity (§2.5 semantics). */
export function shelfCapacity(owned: readonly string[]): number {
  return SHELF_SLOTS_BASE + ownedCount(owned, 'bigger_shelf') * SHELF_SLOTS_PER_UPGRADE;
}

/** Patience start including window-bench bonus (115 when owned — see above). */
export function patienceMax(owned: readonly string[]): number {
  return owned.includes('window_bench')
    ? 100 + WINDOW_BENCH_PATIENCE_BONUS
    : 100;
}

/** Brew animation length with hearth expansion applied. */
export function brewAnimSec(owned: readonly string[]): number {
  return owned.includes('hearth_expansion') ? BREW_ANIM_SEC_HEARTH : BREW_ANIM_SEC_BASE;
}

/** Coffee becomes an available kettle BASE after the coffee machine. */
export function hasCoffeeBase(owned: readonly string[]): boolean {
  return owned.includes('coffee_machine');
}
