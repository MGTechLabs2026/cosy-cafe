// ui/settings.ts — settings overlay incl. save export/import (doc 05 §3.4)
// Export: one button → encrypted code in a copyable box + "how to use".
// Import: paste field → Restore → silent validation → preview modal
// ("Day N · ¤X · ★★ — Replace?") → atomic replace. Failures are calm inline
// messages from the §7.2 table; input stays editable for immediate retry.
// Both buttons disable (with tooltip) when crypto.subtle is unavailable.

import { STRINGS, format } from '../data/strings.js';
import { exportSaveCode, isCryptoAvailable } from '../save/crypto.js';
import { buildImportPreview, commitImportedSave } from '../save/store.js';
import type { SaveData } from '../save/validate.js';
import { SAVE_STORAGE_KEY, loadSave, writeSave } from '../save/store.js';
import { TEXT_SIZES } from '../save/validate.js';
import { GAME_VERSION } from '../version.js';

export interface SettingsHooks {
  /** Fired after a successful import+replace so controllers can reload state. */
  onImported: () => void;
  /** Current settings values for the toggles. */
  settings: SaveData['settings'];
  onSettingsChanged: (next: SaveData['settings']) => void;
}

let hooksRef: SettingsHooks | null = null;

function starString(filled: number): string {
  const full = Math.max(0, Math.min(5, Math.floor(filled)));
  return STRINGS.hud.starsFull.repeat(full) + STRINGS.hud.starsEmpty.repeat(5 - full);
}

function failureCopyKey(reason: string): string {
  switch (reason) {
    case 'not_a_code':
      return STRINGS.saveio.failureNotACode;
    case 'damaged':
      return STRINGS.saveio.failureDamaged;
    case 'wrong_key_version':
      return STRINGS.saveio.failureWrongVersion;
    case 'newer_schema':
      return STRINGS.saveio.failureNewerVersion;
    default:
      return STRINGS.saveio.failureSchemaInvalid;
  }
}

export function openSettings(hooks: SettingsHooks): void {
  hooksRef = hooks;
  closeSettings();
  const app = document.getElementById('app');
  if (!app) throw new Error('#app element not found');

  const overlay = document.createElement('div');
  overlay.id = 'settings-overlay';
  overlay.className = 'overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', STRINGS.settings.title);

  const panel = document.createElement('div');
  panel.className = 'panel settings-panel';

  const title = document.createElement('h2');
  title.textContent = STRINGS.settings.title;

  // --- gameplay toggles ---
  const relaxedLabel = document.createElement('label');
  relaxedLabel.className = 'check-row';
  const relaxed = document.createElement('input');
  relaxed.type = 'checkbox';
  relaxed.checked = hooks.settings.relaxed_mode;
  relaxed.addEventListener('change', () => {
    hooks.onSettingsChanged({ ...hooks.settings, relaxed_mode: relaxed.checked });
  });
  relaxedLabel.appendChild(relaxed);
  relaxedLabel.appendChild(document.createTextNode(STRINGS.settings.relaxedMode));

  const motionLabel = document.createElement('label');
  motionLabel.className = 'check-row';
  const motion = document.createElement('input');
  motion.type = 'checkbox';
  motion.checked = hooks.settings.reduced_motion;
  motion.addEventListener('change', () => {
    hooks.onSettingsChanged({ ...hooks.settings, reduced_motion: motion.checked });
  });
  motionLabel.appendChild(motion);
  motionLabel.appendChild(document.createTextNode(STRINGS.settings.reducedMotion));

  // --- text size (doc 05 §6: 100% / 125% / 150%) ---
  const sizeRowLabel = document.createElement('p');
  sizeRowLabel.className = 'check-row';
  sizeRowLabel.textContent = STRINGS.settings.textSize;

  const sizeRow = document.createElement('div');
  sizeRow.className = 'option-row';
  const currentSize = typeof hooks.settings['text_size' as keyof typeof hooks.settings] === 'number'
    ? (hooks.settings as unknown as { text_size: number }).text_size
    : 100;
  for (const step of TEXT_SIZES) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = `chip${step === currentSize ? ' chip-selected' : ''}`;
    chip.textContent = `${step}%`;
    chip.setAttribute('aria-pressed', String(step === currentSize));
    chip.addEventListener('click', () => {
      hooks.onSettingsChanged({ ...hooks.settings, text_size: step });
      // Re-open so the selected chip re-renders (same pattern as kettle).
      closeSettings();
      openSettings(hooks);
    });
    sizeRow.appendChild(chip);
  }

  // --- credits + version (M4 launch packaging, doc 07 §6) ---
  const creditsTitle = document.createElement('h3');
  creditsTitle.textContent = STRINGS.settings.creditsTitle;
  const creditsMade = document.createElement('p');
  creditsMade.className = 'note';
  creditsMade.textContent = STRINGS.credits.madeWith;
  const creditsAssets = document.createElement('p');
  creditsAssets.className = 'note';
  creditsAssets.textContent = STRINGS.credits.assetsLine;
  const creditsLicense = document.createElement('p');
  creditsLicense.className = 'note';
  creditsLicense.textContent = STRINGS.credits.licenseNote;
  const creditsThanks = document.createElement('p');
  creditsThanks.className = 'note';
  creditsThanks.textContent = STRINGS.credits.thanks;
  const versionLine = document.createElement('p');
  versionLine.className = 'note settings-version';
  versionLine.id = 'settings-version-line';
  versionLine.textContent = `${STRINGS.settings.versionLabel} ${GAME_VERSION}`;

  // --- export section ---
  const exportTitle = document.createElement('h3');
  exportTitle.textContent = STRINGS.saveio.exportTitle;

  const cryptoOk = isCryptoAvailable();
  const exportBtn = document.createElement('button');
  exportBtn.type = 'button';
  exportBtn.className = 'btn btn-primary';
  exportBtn.textContent = STRINGS.saveio.exportButton;
  if (!cryptoOk) {
    exportBtn.disabled = true;
    exportBtn.title = STRINGS.saveio.cryptoUnavailable; // tooltip per doc 02 §7.2
  }

  const exportBox = document.createElement('textarea');
  exportBox.id = 'save-export-box';
  exportBox.className = 'code-box hidden';
  exportBox.readOnly = true;
  exportBox.rows = 4;
  exportBox.setAttribute('aria-label', STRINGS.saveio.exportTitle);

  const copyRow = document.createElement('div');
  copyRow.className = 'btn-row hidden';
  copyRow.id = 'save-copy-row';

  const copyBtn = document.createElement('button');
  copyBtn.type = 'button';
  copyBtn.className = 'btn btn-secondary';
  copyBtn.textContent = STRINGS.saveio.copyButton;
  copyBtn.disabled = !cryptoOk;
  if (!cryptoOk) copyBtn.title = STRINGS.saveio.cryptoUnavailable;
  copyBtn.addEventListener('click', () => {
    void navigator.clipboard?.writeText(exportBox.value).then(() => {
      copyBtn.textContent = STRINGS.saveio.copied;
      window.setTimeout(() => {
        copyBtn.textContent = STRINGS.saveio.copyButton;
      }, 1500);
    });
  });

  const howToDetails = document.createElement('details');
  howToDetails.className = 'hidden';
  const summary = document.createElement('summary');
  summary.textContent = STRINGS.saveio.howToUse;
  const bodyP = document.createElement('p');
  bodyP.textContent = STRINGS.saveio.howToUseBody;
  howToDetails.appendChild(summary);
  howToDetails.appendChild(bodyP);

  copyRow.appendChild(copyBtn);
  copyRow.appendChild(howToDetails);

  exportBtn.addEventListener('click', () => {
    if (!cryptoOk) return;
    const raw = localStorage.getItem(SAVE_STORAGE_KEY);
    if (raw === null) return;
    void exportSaveCode(raw).then((code) => {
      exportBox.value = code;
      exportBox.classList.remove('hidden');
      copyRow.classList.remove('hidden');
    });
  });

  // --- import section ---
  const importTitle = document.createElement('h3');
  importTitle.textContent = STRINGS.saveio.importTitle;

  const importArea = document.createElement('textarea');
  importArea.className = 'code-box';
  importArea.rows = 4;
  importArea.placeholder = STRINGS.saveio.importPlaceholder;
  importArea.setAttribute('aria-label', STRINGS.saveio.importTitle);

  const restoreBtn = document.createElement('button');
  restoreBtn.type = 'button';
  restoreBtn.className = 'btn btn-secondary';
  restoreBtn.textContent = STRINGS.saveio.restoreButton;
  if (!cryptoOk) {
    restoreBtn.disabled = true;
    restoreBtn.title = STRINGS.saveio.cryptoUnavailable;
  }

  const inlineMsg = document.createElement('p');
  inlineMsg.className = 'note note-inline';
  inlineMsg.setAttribute('aria-live', 'polite');

  restoreBtn.addEventListener('click', () => {
    inlineMsg.classList.add('note-warn');
    inlineMsg.textContent = '';
    const code = importArea.value;
    void buildImportPreview(code).then((stage) => {
      if (!stage.ok) {
        // Calm inline failure copy; input stays editable (doc 05 §3.4).
        inlineMsg.textContent = failureCopyKey(stage.reason);
        return;
      }
      showReplaceConfirm(overlay, stage.preview, () => {
        commitImportedSave(stage.preview);
        inlineMsg.classList.remove('note-warn');
        inlineMsg.textContent = STRINGS.saveio.importSuccess;
        hooks.onImported();
      });
    });
  });

  const closeX = document.createElement('button');
  closeX.type = 'button';
  closeX.className = 'panel-close';
  closeX.setAttribute('aria-label', STRINGS.settings.close);
  closeX.textContent = '×';
  closeX.addEventListener('click', closeSettings);

  panel.appendChild(closeX);
  panel.appendChild(title);
  panel.appendChild(relaxedLabel);
  panel.appendChild(motionLabel);
  panel.appendChild(sizeRowLabel);
  panel.appendChild(sizeRow);
  panel.appendChild(exportTitle);
  panel.appendChild(exportBtn);
  panel.appendChild(exportBox);
  panel.appendChild(copyRow);
  panel.appendChild(importTitle);
  panel.appendChild(importArea);
  panel.appendChild(restoreBtn);
  panel.appendChild(inlineMsg);
  panel.appendChild(creditsTitle);
  panel.appendChild(creditsMade);
  panel.appendChild(creditsAssets);
  panel.appendChild(creditsLicense);
  panel.appendChild(creditsThanks);
  panel.appendChild(versionLine);

  const escHandler = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') closeSettings();
  };
  window.addEventListener('keydown', escHandler);
  overlay.addEventListener('DOMNodeRemoved' as string, () => {
    window.removeEventListener('keydown', escHandler);
  });

  overlay.appendChild(panel);
  app.appendChild(overlay);
}

/** Preview-before-replace modal: "Day N · ¤X · ★★ — Replace?" with Cancel prominent. */
function showReplaceConfirm(parent: HTMLElement, preview: SaveData, onConfirm: () => void): void {
  parent.querySelector('#replace-confirm')?.remove();

  const confirmWrap = document.createElement('div');
  confirmWrap.id = 'replace-confirm';
  confirmWrap.className = 'confirm-wrap';

  const previewText = format(STRINGS.saveio.previewLine, {
    day: preview.day,
    coins: preview.coins,
    stars: starString(preview.stars),
  });
  const line = document.createElement('p');
  line.textContent = previewText;

  const replaceBtn = document.createElement('button');
  replaceBtn.type = 'button';
  replaceBtn.className = 'btn btn-danger';
  replaceBtn.textContent = STRINGS.saveio.confirmReplace;
  replaceBtn.addEventListener('click', () => {
    confirmWrap.remove();
    onConfirm();
  });

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.className = 'btn btn-secondary'; // Cancel prominent (doc 05 §3.4)
  cancelBtn.textContent = STRINGS.saveio.cancel;
  cancelBtn.addEventListener('click', () => confirmWrap.remove());

  const row = document.createElement('div');
  row.className = 'btn-row';
  row.appendChild(cancelBtn);
  row.appendChild(replaceBtn);

  confirmWrap.appendChild(line);
  confirmWrap.appendChild(row);
  parent.querySelector('.panel')?.appendChild(confirmWrap);
  cancelBtn.focus();
}

export function closeSettings(): void {
  document.getElementById('settings-overlay')?.remove();
}

export function isSettingsOpen(): boolean {
  return !!document.getElementById('settings-overlay');
}

/** Re-exported for controller convenience after import replaces the live save. */
export { writeSave, loadSave };
