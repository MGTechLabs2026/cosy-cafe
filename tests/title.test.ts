// Regression tests for the title gate lock-up (src/ui/title.ts).
//
// Bug: choosing New Game while a save exists reset `advanced = false` before
// the confirm dialog; accepting the dialog fell through to finish(go) with the
// gate still closed, so isTitleActive() stayed true forever and main.ts's frame
// loop early-returned every frame (blank café, frozen sim).
//
// These tests stub window/document minimally (vitest runs in a bare node
// environment here) and mock the audio module, which imports howler.
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

import { STRINGS } from '../src/data/strings';
import { initTitleScreen, isTitleActive } from '../src/ui/title';

vi.mock('../src/audio/howl', () => ({
  unlockAudio: vi.fn(),
  playClick: vi.fn(),
  playDoorChime: vi.fn(),
}));

interface FakeElement {
  id: string;
  className: string;
  textContent: string;
  type: string;
  children: FakeElement[];
  handlers: Map<string, Array<() => void>>;
  classes: Set<string>;
  classList: {
    add: (...names: string[]) => void;
    remove: (...names: string[]) => void;
    contains: (name: string) => boolean;
  };
  appendChild(child: FakeElement): FakeElement;
  replaceChildren(): void;
  setAttribute(name: string, value: string): void;
  addEventListener(type: string, fn: () => void): void;
  click(): void;
}

/** Minimal element double covering exactly what title.ts touches. */
function makeFake(): FakeElement {
  const el: FakeElement = {
    id: '',
    className: '',
    textContent: '',
    type: '',
    children: [],
    handlers: new Map(),
    classes: new Set(),
    classList: {
      add: (...names: string[]) => names.forEach((n) => el.classes.add(n)),
      remove: (...names: string[]) => names.forEach((n) => el.classes.delete(n)),
      contains: (name: string) => el.classes.has(name),
    },
    appendChild(child: FakeElement): FakeElement {
      el.children.push(child);
      return child;
    },
    replaceChildren(): void {
      el.children.length = 0;
    },
    setAttribute(): void {},
    addEventListener(type: string, fn: () => void): void {
      const list = el.handlers.get(type) ?? [];
      list.push(fn);
      el.handlers.set(type, list);
    },
    click(): void {
      for (const fn of el.handlers.get('click') ?? []) fn();
    },
  };
  return el;
}

let appEl: FakeElement;
let confirmMock: ReturnType<typeof vi.fn<() => boolean>>;

function stubGlobals(): void {
  // Reduced-motion match → finish() runs synchronously, no timer needed.
  const win = {
    confirm: confirmMock,
    matchMedia: () => ({ matches: true }),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
  const doc = {
    getElementById: (id: string) => (id === 'app' ? appEl : null),
    createElement: () => makeFake(),
  };
  vi.stubGlobal('window', win);
  vi.stubGlobal('document', doc);
}

/** Depth-first search for an element whose class list contains `cls`. */
function findByClass(root: FakeElement, cls: string): FakeElement | undefined {
  if (root.className.split(' ').includes(cls)) return root;
  for (const child of root.children) {
    const hit = findByClass(child, cls);
    if (hit) return hit;
  }
  return undefined;
}

function findRow(): FakeElement {
  const row = findByClass(appEl, 'title-buttons');
  expect(row).toBeDefined();
  return row!;
}

/** Locate the rendered New Game button and fire its click handler. */
function clickNewGame(): void {
  const btn = findRow().children.find(
    (child) => child.textContent === STRINGS.title.newGameLabel,
  );
  expect(btn).toBeDefined();
  btn!.click();
}

function makeHooks() {
  return { onContinue: vi.fn(), onNewGame: vi.fn() };
}

describe('title screen New Game gate (regression)', () => {
  beforeEach(() => {
    appEl = makeFake();
    confirmMock = vi.fn(() => true);
    stubGlobals();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('Case A: accept overwrite opens the gate (isTitleActive becomes false)', () => {
    confirmMock.mockReturnValue(true);
    const hooks = makeHooks();
    initTitleScreen({ hasSave: true, savedDay: 3, ...hooks });
    expect(isTitleActive()).toBe(true);

    clickNewGame();

    expect(confirmMock).toHaveBeenCalledOnce();
    expect(hooks.onNewGame).toHaveBeenCalledTimes(1);
    // Was the bug: gate stayed closed forever after accepting the confirm.
    expect(isTitleActive()).toBe(false);
  });

  it('Case B: declining overwrite keeps the title up so the player can re-choose', () => {
    confirmMock.mockReturnValue(false);
    const hooks = makeHooks();
    initTitleScreen({ hasSave: true, savedDay: 3, ...hooks });

    clickNewGame();

    expect(confirmMock).toHaveBeenCalledOnce();
    expect(hooks.onNewGame).not.toHaveBeenCalled();
    expect(isTitleActive()).toBe(true);

    // Re-choosing and accepting now proceeds normally.
    confirmMock.mockReturnValue(true);
    clickNewGame();
    expect(hooks.onNewGame).toHaveBeenCalledTimes(1);
    expect(isTitleActive()).toBe(false);
  });

  it('Case C: no existing save — New Game advances with no confirm dialog', () => {
    const hooks = makeHooks();
    initTitleScreen({ hasSave: false, savedDay: null, ...hooks });

    // Continue button is absent when there is no save.
    expect(findRow().children).toHaveLength(1);

    clickNewGame();

    expect(confirmMock).not.toHaveBeenCalled();
    expect(hooks.onNewGame).toHaveBeenCalledTimes(1);
    expect(isTitleActive()).toBe(false);
  });
});
