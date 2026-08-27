// ui/game.ts — thin compatibility/boot layer.
//
// Orchestrated refactoring (doc 08 §3.5): the former monolith split into
// src/controllers/{game,day,service,kettle,progression}-controller.ts. This
// file keeps the SINGLE public entry point tests + main.ts import from, so the
// existing smoke tests and bootstrap wire up unchanged.
//
// Behavioral note: nothing game-logic lives here anymore. initGame() builds a
// GameController; every exported function delegates to it. The café DOM layer
// lives in ui/cafe-dom.ts. Kept as a module (not deleted) per the refactor's
// "thin compatibility layer" allowance so the documented import surface stays
// stable.

import { GameController } from '../controllers/game-controller.js';
import type { GameInit } from '../controllers/game-controller.js';
import type { BrewInput } from '../sim/brewing.js';
import type { UpgradeId } from '../sim/upgrades.js';
import type { SaveData } from '../save/validate.js';
import { exportSaveCode } from '../save/crypto.js';
import { isEndingOpen as isEndingOpenImpl } from '../ui/ending.js';

let game: GameController | null = null;

/** @internal — single owner; exposed so tests can introspect state. */
export function __getGame(): GameController | null {
  return game;
}

export type { GameInit };
export { exportSaveCode };
export type { BrewInput, UpgradeId };

export function initGame(init: GameInit): void {
  game = new GameController(init);
}

export function tickGame(dtSec: number, timeMs: number): void {
  game?.tick(dtSec, timeMs);
}

export function render(timeMs: number, dtSec: number): void {
  game?.render(timeMs, dtSec);
}

export function applySettings(next: GameInit['saveData']['settings']): void {
  game?.applySettings(next);
}

export function reloadFromStorage(): void {
  game?.reloadFromStorage();
}

// ---- Debug/testing hooks — used by headless smoke tests (EXTEND-only) --------

export function debugState(): object {
  return game?.debugState() ?? {};
}

export function debugSpawnNow(): void {
  game?.debugSpawnNow();
}

export function debugChat(): void {
  game?.debugChat();
}

export function debugBrew(input: BrewInput): void {
  game?.debugBrew(input);
}

export function debugCloseDay(): void {
  game?.debugCloseDay();
}

export function debugContinueRecap(): void {
  game?.debugContinueRecap();
}

export function debugOpenJournal(): void {
  game?.debugOpenJournal();
}

export function debugCloseJournal(): void {
  game?.debugCloseJournal();
}

/** Drive the Day-14 run resolution (evaluate → record → present ending). */
export function debugResolveEnding(): void {
  game?.debugResolveEnding();
}

export function debugBuyUpgrade(id: UpgradeId): void {
  game?.debugBuyUpgrade(id);
}

export function debugPatienceMax(): number {
  return game?.debugPatienceMax() ?? 0;
}

export function debugShelfCapacity(): number {
  return game?.debugShelfCapacity() ?? 0;
}

export function debugBrewAnimSec(): number {
  return game?.debugBrewAnimSec() ?? 0;
}

export function debugSelaCartOpen(): boolean {
  return game?.debugSelaCartOpen() ?? false;
}

export function debugSaveSnapshot(): SaveData {
  return game?.debugSaveSnapshot() ?? ({} as never);
}

/** True if the ending overlay is currently mounted (test/smoke introspection). */
export function isEndingOpen(): boolean {
  // Lazy import keeps the dependency graph identical to the runtime path.
  return isEndingOpenImpl();
}
