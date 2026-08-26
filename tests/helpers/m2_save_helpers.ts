// Shared helpers for M2 save tests — re-exports the store API plus a direct
// exportSaveCode wrapper so tests don't each rebuild the crypto dance.

export { SAVE_STORAGE_KEY } from '../../src/save/store';
export {
  buildImportPreview,
  commitImportedSave,
  freshSave,
  loadSave,
  writeSave,
} from '../../src/save/store';

import { exportSaveCode } from '../../src/save/crypto';

/** Thin passthrough so tests read as data-flow, not crypto plumbing. */
export function exportSaveCodeForTests(saveJson: string): Promise<string> {
  return exportSaveCode(saveJson);
}
