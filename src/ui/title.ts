// Title screen — doc 05 §1 (TITLE screen), doc 08 §3.4 audio gate
// "Moonleaf Cozy Café" + Continue/New Game. The advancing gesture doubles as the
// WebAudio unlock per autoplay policy.

import { playClick, unlockAudio } from '../audio/howl.js';
import { STRINGS, format } from '../data/strings.js';
import { attachTitleSnow, detachTitleSnow } from './title-snow.js';

export interface TitleOptions {
  hasSave: boolean;
  savedDay: number | null;
  onContinue: () => void;
  onNewGame: () => void;
}

let options: TitleOptions | null = null;
let titleEl: HTMLElement | null = null;
let advanced = false;

function unlockAndClick(): void {
  // First user gesture → unlock the audio pipeline, prove it with a click.
  unlockAudio();
  playClick();
}

function choose(cont: boolean): void {
  if (advanced || !options) return;
  advanced = true;
  unlockAndClick();
  detach();

  const go = (): void => {
    if (cont) options?.onContinue();
    else options?.onNewGame();
  };

  // New Game with an existing save asks once before wiping it.
  if (!cont && options.hasSave) {
    const day = options.savedDay ?? 1;
    if (!window.confirm(format(STRINGS.title.newGameConfirm, { day }))) {
      advanced = false; // declined — allow re-choosing
      return;
    }
  }

  finish(go);
}

function finish(go: () => void): void {
  const prefersReducedMotion =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!titleEl || prefersReducedMotion) {
    titleEl?.classList.add('hidden');
    go();
    return;
  }

  // Short fade; under reduced motion we cut straight over (doc 05 §6).
  titleEl.classList.add('title-fade');
  window.setTimeout(() => {
    titleEl?.classList.add('hidden');
    go();
  }, 350);
}

function detach(): void {
  window.removeEventListener('keydown', handleGesture);
  detachTitleSnow();
}

function handleGesture(e: KeyboardEvent): void {
  if (advanced) return;
  // Enter continues when a save exists, otherwise starts fresh.
  choose(!!options?.hasSave);
  if (e.key === 'Escape') return; // Escape never advances
}

/** Build and bind the title screen. Call once at bootstrap. */
export function initTitleScreen(opts: TitleOptions): void {
  options = opts;
  advanced = false;

  const app = document.getElementById('app');
  if (!app) throw new Error('#app element not found');

  titleEl = document.getElementById('title-screen');
  if (!titleEl) {
    titleEl = document.createElement('div');
    titleEl.id = 'title-screen';
    app.appendChild(titleEl);
  }
  titleEl.className = '';
  titleEl.replaceChildren();

  let logo = document.createElement('h1');
  logo.id = 'title-logo';
  logo.className = 'title-logo';
  logo.textContent = STRINGS.title.gameName;

  let prompt = document.createElement('p');
  prompt.id = 'title-prompt';
  prompt.className = 'title-prompt';
  prompt.textContent = STRINGS.title.pressAnyKey;
  prompt.setAttribute('aria-live', 'polite');

  const btnRow = document.createElement('div');
  btnRow.className = 'btn-row title-buttons';

  if (opts.hasSave) {
    const contBtn = document.createElement('button');
    contBtn.type = 'button';
    contBtn.className = 'btn btn-primary';
    contBtn.textContent = format(STRINGS.title.continueLabel, { day: opts.savedDay ?? 1 });
    contBtn.addEventListener('click', () => choose(true));
    btnRow.appendChild(contBtn);
  }

  const newBtn = document.createElement('button');
  newBtn.type = 'button';
  newBtn.className = 'btn btn-secondary';
  newBtn.textContent = STRINGS.title.newGameLabel;
  newBtn.addEventListener('click', () => choose(false));
  btnRow.appendChild(newBtn);

  titleEl.appendChild(logo);
  titleEl.appendChild(prompt);
  titleEl.appendChild(btnRow);

  // Juice item 9 (doc 04 §3): snow drifting past the title window. Cheap
  // pooled-particle reuse on a background canvas; skipped under reduced motion.
  const reducedMotion =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  attachTitleSnow(titleEl, reducedMotion);

  // Keyboard convenience: Enter picks the primary action.
  window.addEventListener('keydown', handleGesture);
}

/** True until the player advances past the title. */
export function isTitleActive(): boolean {
  return !advanced;
}
