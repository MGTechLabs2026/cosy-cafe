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
import {
  debugState as debugStateDev,
  debugSpawnNow as debugSpawnNowDev,
  debugChat as debugChatDev,
  debugBrew as debugBrewDev,
  debugCloseDay as debugCloseDayDev,
  debugContinueRecap as debugContinueRecapDev,
  debugOpenJournal as debugOpenJournalDev,
  debugCloseJournal as debugCloseJournalDev,
  debugPetMops as debugPetMopsDev,
  debugBrewAnimSec as debugBrewAnimSecDev,
  debugResolveEnding as debugResolveEndingDev,
  debugBuyUpgrade as debugBuyUpgradeDev,
  debugPatienceMax as debugPatienceMaxDev,
  debugShelfCapacity as debugShelfCapacityDev,
  debugSelaCartOpen as debugSelaCartOpenDev,
  debugSaveSnapshot as debugSaveSnapshotDev,
} from './debug.js';

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

export function openJournalToRecipe(recipeId?: string): void {
  game?.openJournalToRecipe(recipeId);
}

export function debugState(): object {
  return debugStateDev(game);
}

export function debugSpawnNow(): void {
  debugSpawnNowDev(game);
}

export function debugChat(): void {
  debugChatDev(game);
}

export function debugBrew(input: BrewInput): void {
  debugBrewDev(game, input);
}

export function debugCloseDay(): void {
  debugCloseDayDev(game);
}

export function debugContinueRecap(): void {
  debugContinueRecapDev(game);
}

export function debugOpenJournal(): void {
  debugOpenJournalDev(game);
}

export function debugCloseJournal(): void {
  debugCloseJournalDev(game);
}

export function debugPetMops(): void {
  debugPetMopsDev(game);
}

export function debugResolveEnding(): void {
  debugResolveEndingDev(game);
}

export function debugBuyUpgrade(id: UpgradeId): void {
  debugBuyUpgradeDev(game, id);
}

export function debugPatienceMax(): number {
  return debugPatienceMaxDev(game);
}

export function debugShelfCapacity(): number {
  return debugShelfCapacityDev(game);
}

export function debugBrewAnimSec(): number {
  return debugBrewAnimSecDev(game);
}

export function debugSelaCartOpen(): boolean {
  return debugSelaCartOpenDev(game);
}

export function debugSaveSnapshot(): SaveData {
  return debugSaveSnapshotDev(game);
}
