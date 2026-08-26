// ui/scene.ts — dialogue/scene overlay (M3 content pass)
// Portrait + name + dialogue box overlay (DOM), advance-by-click,
// instant-complete on click mid-line, respects text-speed setting.
// Scene player: plays a keyed sequence of lines; supports ONE two-choice beat
// where scripted (both choices kind, flavor-only per P1); sets completion flags.

import { STRINGS } from '../data/strings.js';
import { portraitSprite } from '../render/images.js';
import type { SaveData } from '../save/validate.js';
import type { HeartLedger } from '../sim/hearts.js';
import type { RegularId } from '../sim/customers.js';

export interface SceneLine {
  /** Character speaking (for portrait + name) */
  character: RegularId | 'narrator';
  /** strings.json key for this line */
  key: string;
  /** Optional: pause before next line (ms) */
  delayMs?: number;
}

export interface SceneChoice {
  /** Text shown to player (strings.json key) */
  labelKey: string;
  /** Flavor text shown after choice (strings.json key) */
  flavorKey: string;
  /** Optional: heart points granted (both choices kind — flavor only per P1) */
  heartPoints?: number;
}

export interface SceneBeat {
  lines: SceneLine[];
  /** Optional: exactly ONE two-choice beat per scene (doc 03 §5) */
  choice?: {
    promptKey: string;
    options: [SceneChoice, SceneChoice];
  } | undefined;
}

export interface SceneDef {
  /** Unique scene ID (matches save.flags.seen_scenes entries) */
  id: string;
  /** Beats in sequence */
  beats: SceneBeat[];
  /** Called when scene completes (sets flags, grants rewards, etc.) */
  onComplete?: (save: SaveData, hearts: HeartLedger) => void;
}

interface SceneHooks {
  onClose: () => void;
}

let hooksRef: SceneHooks | null = null;
let escHandler: ((e: KeyboardEvent) => void) | null = null;

// Typing animation state
let currentScene: SceneDef | null = null;
let currentBeatIndex = 0;
let currentLineIndex = 0;
let isTyping = false;
let typingTimeout: number | null = null;
let textSpeedMultiplier = 1; // 0.5 (fast) to 2 (slow), from settings

// Typing speeds in ms per character
const BASE_TYPING_SPEED_MS = 30;

/** Get string from STRINGS by key, with fallback */
function getString(key: string): string {
  const stringsRecord = STRINGS as unknown as Record<string, string>;
  return stringsRecord[key] ?? key;
}

/** Get character name from STRINGS.cast */
function getCharacterName(character: RegularId): string {
  const cast = (STRINGS as unknown as Record<string, Record<string, { name: string }>>)['cast'];
  return cast?.[character]?.name ?? character;
}

/** Get a beat safely by index */
function getBeat(scene: SceneDef, index: number): SceneBeat | undefined {
  return scene.beats[index];
}

/** Get a line safely by indices */
function getLine(scene: SceneDef, beatIndex: number, lineIndex: number): SceneLine | undefined {
  const beat = getBeat(scene, beatIndex);
  return beat?.lines[lineIndex];
}

/** Initialize the scene overlay in the DOM */
function ensureOverlay(): HTMLDivElement {
  const existing = document.getElementById('scene-overlay');
  if (existing) return existing as HTMLDivElement;

  const app = document.getElementById('app');
  if (!app) throw new Error('#app element not found');

  const overlay = document.createElement('div');
  overlay.id = 'scene-overlay';
  overlay.className = 'overlay hidden';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Story scene');

  const panel = document.createElement('div');
  panel.className = 'panel scene-panel';

  const closeX = document.createElement('button');
  closeX.type = 'button';
  closeX.className = 'panel-close';
  closeX.setAttribute('aria-label', getString('settings.close'));
  closeX.textContent = '×';
  closeX.addEventListener('click', () => hooksRef?.onClose());

  const portraitWrap = document.createElement('div');
  portraitWrap.className = 'scene-portrait-wrap';
  portraitWrap.id = 'scene-portrait';

  const nameEl = document.createElement('p');
  nameEl.className = 'scene-name';
  nameEl.id = 'scene-name';

  const dialogueEl = document.createElement('p');
  dialogueEl.className = 'scene-dialogue';
  dialogueEl.id = 'scene-dialogue';

  const continueHint = document.createElement('p');
  continueHint.className = 'scene-continue-hint';
  continueHint.id = 'scene-continue-hint';
  continueHint.textContent = 'Click to continue…';
  continueHint.setAttribute('aria-hidden', 'true');

  // Choice container (hidden by default)
  const choiceContainer = document.createElement('div');
  choiceContainer.className = 'scene-choice-container hidden';
  choiceContainer.id = 'scene-choice-container';

  const choicePrompt = document.createElement('p');
  choicePrompt.className = 'scene-choice-prompt';
  choicePrompt.id = 'scene-choice-prompt';

  const choiceButtons = document.createElement('div');
  choiceButtons.className = 'scene-choice-buttons';
  choiceButtons.id = 'scene-choice-buttons';

  choiceContainer.appendChild(choicePrompt);
  choiceContainer.appendChild(choiceButtons);

  panel.appendChild(closeX);
  panel.appendChild(portraitWrap);
  panel.appendChild(nameEl);
  panel.appendChild(dialogueEl);
  panel.appendChild(continueHint);
  panel.appendChild(choiceContainer);

  overlay.appendChild(panel);
  app.appendChild(overlay);

  // Click handler for advancing dialogue
  overlay.addEventListener('click', handleOverlayClick);

  escHandler = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && !overlay.classList.contains('hidden')) {
      hooksRef?.onClose();
    }
  };
  window.addEventListener('keydown', escHandler);

  return overlay;
}

/** Handle click on scene overlay - advances dialogue or makes choice */
function handleOverlayClick(e: MouseEvent): void {
  // Ignore clicks on choice buttons (they have their own handlers)
  if ((e.target as HTMLElement).closest('.scene-choice-buttons')) return;
  // Ignore clicks on close button
  if ((e.target as HTMLElement).closest('.panel-close')) return;

  if (isTyping) {
    // Instant-complete current line
    completeCurrentLine();
  } else if (currentScene && currentBeatIndex < currentScene.beats.length) {
    const beat = getBeat(currentScene, currentBeatIndex);
    if (beat?.choice && currentLineIndex >= beat.lines.length) {
      // Waiting for choice - ignore body clicks
      return;
    }
    advanceDialogue();
  }
}

/** Complete the current line instantly (on click mid-type) */
function completeCurrentLine(): void {
  if (typingTimeout !== null) {
    window.clearTimeout(typingTimeout);
    typingTimeout = null;
  }
  const dialogueEl = document.getElementById('scene-dialogue');
  if (dialogueEl && currentScene) {
    const line = getLine(currentScene, currentBeatIndex, currentLineIndex);
    if (line) {
      dialogueEl.textContent = getString(line.key);
    }
  }
  isTyping = false;
  showContinueHint();
}

/** Show the "click to continue" hint */
function showContinueHint(): void {
  const hint = document.getElementById('scene-continue-hint');
  if (hint) hint.classList.remove('hidden');
}

/** Hide the continue hint */
function hideContinueHint(): void {
  const hint = document.getElementById('scene-continue-hint');
  if (hint) hint.classList.add('hidden');
}

/** Type out a line character by character */
function typeLine(lineKey: string, onComplete: () => void): void {
  const fullText = getString(lineKey);
  const dialogueEl = document.getElementById('scene-dialogue');
  if (!dialogueEl) {
    onComplete();
    return;
  }

  dialogueEl.textContent = '';
  hideContinueHint();
  isTyping = true;

  let charIndex = 0;
  const speed = BASE_TYPING_SPEED_MS * textSpeedMultiplier;

  function typeChar(): void {
    const el = document.getElementById('scene-dialogue');
    if (!el) {
      isTyping = false;
      typingTimeout = null;
      showContinueHint();
      onComplete();
      return;
    }
    if (charIndex < fullText.length) {
      el.textContent += fullText[charIndex];
      charIndex++;
      typingTimeout = window.setTimeout(typeChar, speed);
    } else {
      isTyping = false;
      typingTimeout = null;
      showContinueHint();
      onComplete();
    }
  }

  typeChar();
}

/** Advance to next line or beat */
function advanceDialogue(): void {
  if (!currentScene) return;

  const beat = getBeat(currentScene, currentBeatIndex);
  if (!beat) return;

  if (currentLineIndex < beat.lines.length - 1) {
    // Next line in same beat
    currentLineIndex++;
    const line = getLine(currentScene, currentBeatIndex, currentLineIndex);
    if (line) showLine(line);
  } else {
    // End of beat
    if (beat.choice) {
      // Show choice
      showChoice(beat.choice);
    } else {
      // Next beat
      currentBeatIndex++;
      currentLineIndex = 0;
      if (currentBeatIndex < currentScene.beats.length) {
        const nextLine = getLine(currentScene, currentBeatIndex, 0);
        if (nextLine) showLine(nextLine);
      } else {
        // Scene complete
        completeScene();
      }
    }
  }
}

/** Show a dialogue line with portrait and name */
function showLine(line: SceneLine): void {
  const portraitWrap = document.getElementById('scene-portrait');
  const nameEl = document.getElementById('scene-name');
  const dialogueEl = document.getElementById('scene-dialogue');

  // Portrait
  if (portraitWrap && line.character !== 'narrator') {
    portraitWrap.replaceChildren();
    const portrait = portraitSprite(line.character);
    if (portrait && portrait.complete && portrait.naturalWidth > 0) {
      portraitWrap.appendChild(portrait);
    }
    portraitWrap.classList.remove('hidden');
  } else if (portraitWrap) {
    portraitWrap.classList.add('hidden');
  }

  // Name
  if (nameEl && line.character !== 'narrator') {
    nameEl.textContent = getCharacterName(line.character);
    nameEl.classList.remove('hidden');
  } else if (nameEl) {
    nameEl.classList.add('hidden');
  }

  // Dialogue text (start typing)
  if (dialogueEl) {
    typeLine(line.key, () => {
      // Line complete - wait for click
    });
  }
}

/** Show a two-choice prompt */
function showChoice(choice: { promptKey: string; options: [SceneChoice, SceneChoice] }): void {
  const container = document.getElementById('scene-choice-container');
  const promptEl = document.getElementById('scene-choice-prompt');
  const buttonsEl = document.getElementById('scene-choice-buttons');

  if (!container || !promptEl || !buttonsEl) return;

  promptEl.textContent = getString(choice.promptKey);
  buttonsEl.replaceChildren();

  choice.options.forEach((option, index) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-primary scene-choice-btn';
    btn.textContent = getString(option.labelKey);
    btn.addEventListener('click', () => handleChoice(index, option));
    buttonsEl.appendChild(btn);
  });

  container.classList.remove('hidden');
  hideContinueHint();
}

/** Handle choice selection */
function handleChoice(_choiceIndex: number, option: SceneChoice): void {
  const container = document.getElementById('scene-choice-container');
  if (container) container.classList.add('hidden');

  // Show flavor text
  const dialogueEl = document.getElementById('scene-dialogue');
  if (dialogueEl) {
    // Type out the flavor text
    typeLine(option.flavorKey, () => {
      // Grant heart points if any (both choices kind - flavor only per P1)
      // Note: actual heart awarding happens in onComplete callback
      advanceAfterChoice();
    });
  } else {
    advanceAfterChoice();
  }
}

/** Advance after choice flavor text is shown */
function advanceAfterChoice(): void {
  if (!currentScene) return;
  currentBeatIndex++;
  currentLineIndex = 0;
  if (currentBeatIndex < currentScene.beats.length) {
    const nextLine = getLine(currentScene, currentBeatIndex, 0);
    if (nextLine) showLine(nextLine);
  } else {
    completeScene();
  }
}

/** Complete the scene and trigger callbacks */
function completeScene(): void {
  if (currentScene && hooksRef) {
    // The onComplete callback will be passed save/hearts from the caller
    hooksRef.onClose();
  }
  currentScene = null;
  currentBeatIndex = 0;
  currentLineIndex = 0;
  isTyping = false;
  if (typingTimeout !== null) {
    window.clearTimeout(typingTimeout);
    typingTimeout = null;
  }
}

/** Set text speed multiplier (from settings: 0.5 = fast, 1 = normal, 2 = slow) */
export function setSceneTextSpeed(multiplier: number): void {
  textSpeedMultiplier = Math.max(0.5, Math.min(2, multiplier));
}

/** Play a scene by definition */
export function playScene(
  scene: SceneDef,
  save: SaveData,
  hearts: HeartLedger,
  hooks: SceneHooks,
): void {
  // Check if already seen
  if (save.flags.seen_scenes.includes(scene.id)) {
    hooks.onClose?.();
    return;
  }

  hooksRef = hooks;
  currentScene = scene;
  currentBeatIndex = 0;
  currentLineIndex = 0;

  const overlay = ensureOverlay();

  // Mark as seen immediately (fire-once)
  save.flags.seen_scenes.push(scene.id);

  // Wrap onClose to call scene's onComplete. `closed` guarantees the
  // completion runs EXACTLY ONCE even if both Esc and natural completion fire
  // in the same visit (M4 bugfix: double-grant risk on arc rewards).
  let closed = false;
  const originalOnClose = hooks.onClose;
  hooksRef.onClose = () => {
    if (closed) return;
    closed = true;
    if (scene.onComplete) {
      scene.onComplete(save, hearts);
    }
    originalOnClose?.();
    // Cleanup — INCLUDING hiding the overlay: Esc/close must dismiss the
    // scene visually, not just run callbacks (M4 bugfix: the overlay used to
    // stay visible after Esc).
    overlay.classList.add('hidden');
    if (escHandler) {
      window.removeEventListener('keydown', escHandler);
      escHandler = null;
    }
    overlay.removeEventListener('click', handleOverlayClick);
  };

  overlay.classList.remove('hidden');
  const firstLine = getLine(scene, 0, 0);
  if (firstLine) showLine(firstLine);
}

/** Close the scene overlay */
export function closeScene(): void {
  const overlay = document.getElementById('scene-overlay');
  if (overlay) overlay.classList.add('hidden');
  if (hooksRef) {
    hooksRef.onClose?.();
    hooksRef = null;
  }
  if (escHandler) {
    window.removeEventListener('keydown', escHandler);
    escHandler = null;
  }
  currentScene = null;
  currentBeatIndex = 0;
  currentLineIndex = 0;
  isTyping = false;
  if (typingTimeout !== null) {
    window.clearTimeout(typingTimeout);
    typingTimeout = null;
  }
}

export function isSceneOpen(): boolean {
  const overlay = document.getElementById('scene-overlay');
  return !!overlay && !overlay.classList.contains('hidden');
}