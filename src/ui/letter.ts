// ui/letter.ts — tutorial step 1: Aunt Marigold's letter (doc 05 §3.1)
// Skippable modal, ≤100 words, shown once on a new game before morning.

import { STRINGS } from '../data/strings.js';
import { playOverlayEnter } from './overlay-anim.js';

export function showLetterOverlay(onDone: () => void): void {
  const app = document.getElementById('app');
  if (!app) throw new Error('#app element not found');

  const existing = document.getElementById('letter-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'letter-overlay';
  overlay.className = 'overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', STRINGS.dialogue.auntLetterTitle);

  const panel = document.createElement('div');
  panel.className = 'panel letter-panel';

  const title = document.createElement('h2');
  title.textContent = STRINGS.dialogue.auntLetterTitle;

  const body = document.createElement('p');
  body.className = 'letter-body';
  body.textContent = STRINGS.dialogue.auntLetterBody;

  const skipBtn = document.createElement('button');
  skipBtn.type = 'button';
  skipBtn.className = 'btn btn-secondary';
  skipBtn.textContent = STRINGS.dialogue.letterSkip;

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'btn btn-primary';
  closeBtn.textContent = STRINGS.settings.close;

  const btnRow = document.createElement('div');
  btnRow.className = 'btn-row';
  btnRow.appendChild(skipBtn);
  btnRow.appendChild(closeBtn);

  panel.appendChild(title);
  panel.appendChild(body);
  panel.appendChild(btnRow);
  overlay.appendChild(panel);
  app.appendChild(overlay);
  playOverlayEnter(overlay);

  const finish = (): void => {
    overlay.remove();
    window.removeEventListener('keydown', onKey);
    onDone();
  };
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' || e.key === 'Enter') finish();
  };
  window.addEventListener('keydown', onKey);
  skipBtn.addEventListener('click', finish);
  closeBtn.addEventListener('click', finish);
  closeBtn.focus();
}
