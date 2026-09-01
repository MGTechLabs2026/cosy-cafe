// Bootstrap — doc 08 §3.2
// Owns the backbuffer canvas, integer CSS-transform scaling, the 30 Hz fixed
// timestep (sim tick + render), and screen navigation (title → café).
// M1: the café is alive — day cycle, brewing, Fenwick, coins, recap, autosave.

import { initAudio } from './audio/howl.js';
import { devWarn } from './ui/logger.js';
import {
  beginFrame,
  drawCafeRoom,
  endFrame,
  ensureCanvas,
  getCanvas,
} from './render/draw.js';
import {
  computeIntegerScale,
  GAME_HEIGHT,
  GAME_WIDTH,
  transformForScale,
} from './render/scale.js';
import {
  applySettings,
  debugBrew,
  debugChat,
  debugCloseDay,
  debugContinueRecap,
  debugOpenJournal,
  debugCloseJournal,
  debugPetMops,
  debugSpawnNow,
  debugState,
  initGame,
  reloadFromStorage,
  render,
  tickGame,
  openJournalToRecipe,
} from './ui/game.js';
import { openJournal, closeJournal, isJournalOpen } from './ui/journal.js';
import { initHUD, showHUD, updateHUD } from './ui/hud.js';
import { initTitleScreen, isTitleActive } from './ui/title.js';
import { openSettings, closeSettings } from './ui/settings.js';
import { loadSave, freshSave } from './save/store.js';
import { showLetterOverlay } from './ui/letter.js';

const SIM_HZ = 30;
const SIM_STEP_MS = 1000 / SIM_HZ;

let canvasEl: HTMLCanvasElement | null = null;
let wrapperEl: HTMLElement | null = null;
let scale = 1;
let cafeActive = false;
let rafId: number | null = null;
let gameStarted = false;
let letterShown = false;

/** Largest-integer scaling via CSS transform; re-derived on resize. */
function applyScale(): void {
  if (!canvasEl || !wrapperEl) return;

  // Viewport minus the HUD bar's height keeps the room fully visible.
  const hud = document.getElementById('hud');
  const reserved = hud ? hud.offsetHeight + 12 : 12;
  const availW = window.innerWidth - 24;
  const availH = window.innerHeight - reserved - 24;

  const next = computeIntegerScale(availW, availH);
  if (next === scale && canvasEl.style.transform !== '') return;
  scale = next;

  // Wrapper must equal the VISUAL size (GAME * scale CSS px). Never divide by
  // dpr here: transform scales in CSS px, so a dpr-divided layout box is
  // smaller than the rendered canvas on HiDPI screens and breaks centering.
  // Crispness is unaffected: each art pixel is scale*dpr device px (integer).
  const cssW = GAME_WIDTH * scale;
  const cssH = GAME_HEIGHT * scale;

  canvasEl.style.width = `${GAME_WIDTH}px`;
  canvasEl.style.height = `${GAME_HEIGHT}px`;
  canvasEl.style.transformOrigin = 'top left';
  canvasEl.style.transform = transformForScale(scale);

  wrapperEl.style.width = `${cssW}px`;
  wrapperEl.style.height = `${cssH}px`;

  showHUD();
}

function syncHud(s: { day: number; coins: number; stars: number }): void {
  updateHUD(s);
}

/**
 * Journal button (doc 05 §2 top bar). The controller owns save/heart state, so
 * main.ts asks it for debug hooks — but the HUD path needs the real open call,
 * so we route through the same exported hooks the smoke tests use.
 */
function openJournalOverlay(): void {
  if (isJournalOpen()) {
    closeJournal();
    return;
  }
  // Delegate to the game controller; keeps journal opening out of the main
  // bootstrap loop (avoids an extra dynamic import chunk and Vite warning).
  openJournalToRecipe();
}

function openSettingsOverlay(): void {
  const current = loadSave();
  const data = current.ok ? current.data : freshSave();
  openSettings({
    settings: data.settings,
    onImported: () => {
      reloadFromStorage();
    },
    onSettingsChanged: (next) => {
      applySettings(next);
    },
  });
}

/** Start (or resume) the actual game under the title screen. */
function startGame(newGame: boolean): void {
  const loaded = loadSave();
  const saveData = newGame ? freshSave() : loaded.ok ? loaded.data : freshSave();
  gameStarted = true;

  initGame({
    saveData,
    canvas: getCanvas(),
    onHudSync: syncHud,
    onOpenSettings: openSettingsOverlay,
    // Batch 4 / BUG-03: when a completed run resolves (Day-14 ending), return
    // to the title screen rather than silently starting Day 15.
    onReturnToTitle: () => returnToTitle(),
  });

  // Tutorial step 1: Marigold's letter on a brand-new game only (doc 05 §3.1).
  if (newGame && !letterShown) {
    letterShown = true;
    showLetterOverlay(() => {
      /* morning banner is already waiting underneath */
    });
  }
}

/** Run resolved → return to the title screen (authoritative navigation boundary). */
function returnToTitle(): void {
  cafeActive = false;
  gameStarted = false;
  // Tear down the café DOM so the title screen owns the stage; reload the
  // (now ending-bearing) save so Continue reflects the completed run.
  const wrapper = document.getElementById('game-wrapper');
  if (wrapper) wrapper.innerHTML = '';
  const hud = document.getElementById('hud');
  if (hud) hud.classList.add('hidden');

  const existingSave = loadSave();
  initTitleScreen({
    onContinue: () => enterCafe(false),
    onNewGame: () => enterCafe(true),
    hasSave: existingSave.ok,
    savedDay: existingSave.ok ? existingSave.data.day : null,
  });
}

/** Title → café navigation. Continue resumes the autosave; New Game resets. */
function enterCafe(newGame: boolean): void {
  cafeActive = true;
  applyScale();

  initHUD(
    () => {
      closeSettings(); // toggle behavior if already open
      openSettingsOverlay();
    },
    () => {
      openJournalOverlay(); // HUD journal button becomes real (doc 05 §2)
    },
  );
  updateHUD({ day: 1, coins: 0, stars: 0 });
  showHUD();

  startGame(newGame);
}

async function main(): Promise<void> {
  const app = document.getElementById('app');
  if (!app) throw new Error('#app element not found');

  app.innerHTML = `
    <div id="game-wrapper"></div>
    <div id="hud" role="region" aria-label="Café status">
      <div class="hud-left">
        <span id="hud-day"></span>
        <span id="hud-coins"></span>
        <span id="hud-stars" aria-label="Stars"></span>
      </div>
      <div class="hud-right">
        <button id="hud-settings" class="hud-btn" type="button">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"
            ><circle cx="12" cy="12" r="3"
            /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06-.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l-.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        </button>
        <button id="hud-journal" class="hud-btn" type="button">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"
            ><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"
            /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
        </button>
      </div>
    </div>
  `;

  wrapperEl = document.getElementById('game-wrapper');
  if (!wrapperEl) throw new Error('#game-wrapper element not found');

  // ensureCanvas REBINDS the renderer to a connected #game-canvas if one
  // exists (re-bootstrap safety), else creates and attaches one. Prevents the
  // detached-ghost-canvas bug where every frame painted an orphaned element.
  canvasEl = ensureCanvas(wrapperEl);
  wrapperEl.classList.add('hidden-until-scale');

  initAudio();

  const existingSave = loadSave();
  initTitleScreen({
    onContinue: () => enterCafe(false),
    onNewGame: () => enterCafe(true),
    hasSave: existingSave.ok,
    savedDay: existingSave.ok ? existingSave.data.day : null,
  });

  window.addEventListener('resize', applyScale);
  applyScale();
  startLoop();
}

/** Fixed-timestep accumulator loop; sim ticks + scene render at 30 Hz. */
function startLoop(): void {
  let last = performance.now();
  let acc = 0;
  // M4 perf gate C (doc 08 §4): flag any long frame during service in dev.
  const LONG_TASK_MS = import.meta.env.DEV ? 50 : Infinity;

  const frame = (now: number): void => {
    rafId = requestAnimationFrame(frame);

    const frameDelta = now - last;
    if (frameDelta > LONG_TASK_MS) {
      // Dev-mode long-task audit: visible, throttled by nature (only on the
      // offending frame), never thrown — a slow frame must not kill the loop.
      devWarn(
        `[Moonleaf] long frame ${frameDelta.toFixed(1)}ms (> ${LONG_TASK_MS}ms) at t=${(now / 1000).toFixed(1)}s`,
      );
    }
    acc += now - last;
    last = now;
    if (acc > 250) acc = 250; // clamp after tab-switch stalls

    // ONE composed frame per rAF: room base, then the living scene layer.
    // Sim advances on its own fixed cadence; rendering NEVER depends on
    // whether a sim step happened this frame (that split caused strobing).
    if (!cafeActive || isTitleActive()) return;

    const ctx = beginFrame();
    drawCafeRoom(ctx);

    if (gameStarted) {
      while (acc >= SIM_STEP_MS) {
        tickGame(SIM_STEP_MS / 1000, now);
        acc -= SIM_STEP_MS;
      }
      render(now, acc / 1000);
    }
    endFrame();
  };
  rafId = requestAnimationFrame(frame);
}

// Headless smoke-test hooks (no-ops in normal play; used by tests/smoke.mjs).
declare global {
  interface Window {
    __moonleaf?: {
      debugState: typeof debugState;
      debugSpawnNow: typeof debugSpawnNow;
      debugChat: typeof debugChat;
      debugBrew: typeof debugBrew;
      debugCloseDay: typeof debugCloseDay;
      debugContinueRecap: typeof debugContinueRecap;
      debugOpenJournal: typeof debugOpenJournal;
      debugCloseJournal: typeof debugCloseJournal;
      exportCode: () => Promise<string>;
      debugPetMops: () => void;
    };
  }
}

if (import.meta.env.DEV) {
  window.__moonleaf = {
    debugState: () => debugState(),
    debugSpawnNow: () => debugSpawnNow(),
    debugChat: () => debugChat(),
    debugBrew: (input) => debugBrew(input),
    debugCloseDay: () => debugCloseDay(),
    debugContinueRecap: () => debugContinueRecap(),
    debugOpenJournal: () => debugOpenJournal(),
    debugCloseJournal: () => debugCloseJournal(),
    debugPetMops: () => debugPetMops(),
    exportCode: async (): Promise<string> => {
      const raw = localStorage.getItem('moonleaf_save_v1');
      if (raw === null) throw new Error('no save to export');
      const { exportSaveCode: exp } = await import('./save/crypto.js');
      return exp(raw);
    },
  };
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => void main());
} else {
  void main();
}