// ui/debug.ts — debug/test hook exports.
// These delegate to the live GameController when available.
// In production builds, main.ts does not expose window.__moonleaf, but these
// exports remain so internal callers/test harnesses can still opt in.

import type { BrewInput } from '../sim/brewing.js';
import type { GameController } from '../controllers/game-controller.js';
import type { UpgradeId } from '../sim/upgrades.js';
import type { SaveData } from '../save/validate.js';

export function debugState(game?: GameController | null): object {
  return game?.debugState() ?? {};
}

export function debugSpawnNow(game?: GameController | null): void {
  game?.debugSpawnNow();
}

export function debugChat(game?: GameController | null): void {
  game?.debugChat();
}

export function debugBrew(game?: GameController | null, input?: BrewInput): void {
  if (game && input) game.debugBrew(input);
}

export function debugCloseDay(game?: GameController | null): void {
  game?.debugCloseDay();
}

export function debugContinueRecap(game?: GameController | null): void {
  game?.debugContinueRecap();
}

export function debugOpenJournal(game?: GameController | null): void {
  game?.debugOpenJournal();
}

export function debugCloseJournal(game?: GameController | null): void {
  game?.debugCloseJournal();
}

export function debugPetMops(game?: GameController | null): void {
  game?.petMops();
}

export function debugResolveEnding(game?: GameController | null): void {
  game?.debugResolveEnding();
}

export function debugBuyUpgrade(game?: GameController | null, id?: UpgradeId): void {
  if (game && id) game.debugBuyUpgrade(id);
}

export function debugPatienceMax(game?: GameController | null): number {
  return game?.debugPatienceMax() ?? 0;
}

export function debugShelfCapacity(game?: GameController | null): number {
  return game?.debugShelfCapacity() ?? 0;
}

export function debugBrewAnimSec(game?: GameController | null): number {
  return game?.debugBrewAnimSec() ?? 0;
}

export function debugSelaCartOpen(game?: GameController | null): boolean {
  return game?.debugSelaCartOpen() ?? false;
}

export function debugSaveSnapshot(game?: GameController | null): SaveData {
  return game?.debugSaveSnapshot() ?? ({} as SaveData);
}
