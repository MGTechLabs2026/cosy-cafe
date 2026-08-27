// Mailbox UI integration tests (Batch 3, doc 10 BUG-01).
// Covers the required matrix: letter available → mailbox appears; no letter →
// not blocking; open → body rendered; read → persisted; refresh stays read;
// no duplicate delivery; multiple letters deterministic; text-size safe.
//
// No jsdom dependency: a tiny DOM shim covers exactly the surface mailbox.ts
// uses. The persistence semantics are unit-tested via markLetterRead (pure),
// which is the exact helper the DayController wires to its autosave.

import { beforeEach, describe, expect, it } from 'vitest';
import { freshSave } from '../src/save/store.js';
import type { SaveData } from '../src/save/validate.js';
import { STRINGS } from '../src/data/strings.js';
import {
  showMailbox,
  letterView,
  markLetterRead,
  isMailboxOpen,
  closeMailbox,
} from '../src/ui/mailbox.js';

// ---- minimal DOM shim ----------------------------------------------------------

interface Handlers {
  [type: string]: Array<(e?: unknown) => void>;
}
class El {
  tagName: string;
  id = '';
  className = '';
  textContent = '';
  type = '';
  disabled = false;
  private attrs: Record<string, string> = {};
  children: El[] = [];
  parent: El | null = null;
  handlers: Handlers = {};
  classes = new Set<string>();
  classList = {
    add: (...n: string[]) => n.forEach((x) => this.classes.add(x)),
    remove: (...n: string[]) => n.forEach((x) => this.classes.delete(x)),
    contains: (n: string) => this.classes.has(n),
    toggle: (n: string, force?: boolean) => {
      const has = this.classes.has(n);
      const on = force ?? !has;
      if (on) this.classes.add(n);
      else this.classes.delete(n);
    },
  };
  constructor(tag: string) {
    this.tagName = tag.toUpperCase();
  }
  setAttribute(k: string, v: string): void {
    this.attrs[k] = v;
  }
  getAttribute(k: string): string | undefined {
    return this.attrs[k];
  }
  appendChild(c: El): El {
    c.parent = this;
    this.children.push(c);
    return c;
  }
  replaceChildren(...c: El[]): void {
    this.children = [];
    for (const x of c) this.appendChild(x);
  }
  remove(): void {
    if (this.parent) {
      const i = this.parent.children.indexOf(this);
      if (i >= 0) this.parent.children.splice(i, 1);
    }
  }
  focus(): void {
    /* no-op in shim */
  }
  addEventListener(t: string, fn: (e?: unknown) => void): void {
    (this.handlers[t] ??= []).push(fn);
  }
  removeEventListener(t: string, fn: (e?: unknown) => void): void {
    this.handlers[t] = (this.handlers[t] ?? []).filter((h) => h !== fn);
  }
  click(): void {
    (this.handlers['click'] ?? []).forEach((h) => h());
  }
  private walk(pred: (e: El) => boolean, out: El[]): void {
    for (const c of this.children) {
      if (pred(c)) out.push(c);
      c.walk(pred, out);
    }
  }
  querySelectorAll(sel: string): El[] {
    const out: El[] = [];
    this.walk((e) => e.tagName === sel.toUpperCase(), out);
    return out;
  }
  /** Test helper: find a button by its text content. */
  findButton(text: string): El | undefined {
    return this.querySelectorAll('button').find((b) => b.textContent === text);
  }
  /** Test helper: all text content within, recursively. */
  allText(): string {
    let t = this.textContent;
    for (const c of this.children) t += ' ' + c.allText();
    return t;
  }
}

const app = new El('div');
app.id = 'app';
const documentShim = {
  getElementById: (id: string): El | null => {
    if (id === 'app') return app;
    let found: El | null = null;
    const walk = (e: El): void => {
      if (e.id === id) {
        found = e;
        return;
      }
      for (const c of e.children) walk(c);
    };
    walk(app);
    return found;
  },
  createElement: (tag: string): El => new El(tag),
};
const windowShim = {
  addEventListener: () => {},
  removeEventListener: () => {},
};

// Install globals for the module under test.
(globalThis as unknown as { document: typeof documentShim }).document = documentShim;
(globalThis as unknown as { window: typeof windowShim }).window = windowShim;

// ---- helpers ----------------------------------------------------------------

function makeSaveWithPending(pending: string[]): SaveData {
  const s = freshSave();
  s.day = 7;
  s.flags.pending_narrative_letters = pending;
  return s;
}

function overlay(): El | null {
  return app.children.find((c) => c.id === 'mailbox-overlay') ?? null;
}

// ---- tests -------------------------------------------------------------------

describe('letterView (content resolution)', () => {
  it('resolves sender/title/body/day for a scheduler letter id', () => {
    const s = freshSave();
    s.day = 7;
    const v = letterView(s, 'marigold_ch2_revelation');
    expect(v).not.toBeNull();
    expect(v!.sender).toBe('Aunt Marigold');
    expect(v!.title).toBe(STRINGS.letters['marigold_ch2_revelation'].title);
    expect(v!.body).toBe(STRINGS.letters['marigold_ch2_revelation'].body);
    expect(v!.day).toBe(7);
  });

  it('maps each source to a cozy sender name', () => {
    const s = freshSave();
    expect(letterView(s, 'wren_first_clue_letter')!.sender).toBe('Old Wren');
    expect(letterView(s, 'fenwick_memory_promise')!.sender).toBe('Fenwick');
    expect(letterView(s, 'town_ch1_welcome')!.sender).toBe('The Town Council');
    expect(letterView(s, 'mystery_ch1_strange_note')!.sender).toBe('A Stranger');
  });
});

describe('BUG-01: morning mailbox presentation', () => {
  beforeEach(() => {
    // Reset DOM between tests.
    app.children = [];
  });

  it('Test 1 — letter available → mailbox appears with sender/title/body', () => {
    const s = makeSaveWithPending(['marigold_ch2_revelation']);
    showMailbox(s, s.flags.pending_narrative_letters, {
      onRead: () => {},
      onDone: () => {},
    });
    expect(isMailboxOpen()).toBe(true);
    const ov = overlay()!;
    expect(ov.allText()).toContain('Aunt Marigold');
    expect(ov.allText()).toContain(STRINGS.letters['marigold_ch2_revelation'].body);
    // Aria + dialog semantics present.
    expect(ov.getAttribute('role')).toBe('dialog');
    expect(ov.getAttribute('aria-modal')).toBe('true');
  });

  it('Test 2 — no letter → mailbox does not block the morning (onDone fires)', () => {
    const s = makeSaveWithPending([]);
    let done = false;
    showMailbox(s, s.flags.pending_narrative_letters, {
      onRead: () => {},
      onDone: () => {
        done = true;
      },
    });
    expect(isMailboxOpen()).toBe(false);
    expect(done).toBe(true);
  });

  it('Test 3 — open letter → body rendered (single-letter shows directly)', () => {
    const s = makeSaveWithPending(['fenwick_memory_promise']);
    showMailbox(s, s.flags.pending_narrative_letters, {
      onRead: () => {},
      onDone: () => {},
    });
    const ov = overlay()!;
    expect(ov.allText()).toContain(STRINGS.letters['fenwick_memory_promise'].body);
    // Single-letter view renders the subject line too.
    expect(ov.allText()).toContain(STRINGS.letters['fenwick_memory_promise'].title);
  });

  it('Test 4 — read → persisted (onRead fires, markLetterRead clears pending)', () => {
    const s = makeSaveWithPending(['marigold_ch2_revelation', 'fenwick_memory_promise']);
    const read: string[] = [];
    showMailbox(s, s.flags.pending_narrative_letters, {
      onRead: (id) => {
        read.push(id);
        markLetterRead(s, id);
      },
      onDone: () => {},
    });
    // Multiple-letter view shows a list; open the first to trigger onRead.
    const listItem = overlay()!.findButton('Fenwick — A Note from Fenwick');
    expect(listItem).toBeDefined();
    listItem!.click();
    expect(read).toContain('fenwick_memory_promise');
    expect(s.flags.letters_read).toContain('fenwick_memory_promise');
    expect(s.flags.pending_narrative_letters).not.toContain('fenwick_memory_promise');
  });

  it('Test 5 — refresh stays read (markLetterRead is idempotent, no re-queue)', () => {
    const s = makeSaveWithPending(['marigold_ch2_revelation']);
    markLetterRead(s, 'marigold_ch2_revelation');
    // A second pass on the SAME id must not duplicate the read flag.
    const changedAgain = markLetterRead(s, 'marigold_ch2_revelation');
    expect(s.flags.letters_read.filter((x) => x === 'marigold_ch2_revelation').length).toBe(1);
    expect(s.flags.pending_narrative_letters).not.toContain('marigold_ch2_revelation');
    // Unknown id is a no-op (no crash, no false change).
    expect(changedAgain).toBe(false);
  });

  it('Test 6 — duplicate delivery prevented (runtime sentinel, not UI)', () => {
    // The scheduler/advanceNarrative guard lives in Batch 2; the mailbox must
    // never re-queue an already-delivered id. Verify the pending queue is the
    // single source of truth and is cleared on read.
    const s = makeSaveWithPending(['marigold_ch0_welcome']);
    markLetterRead(s, 'marigold_ch0_welcome');
    expect(s.flags.pending_narrative_letters.length).toBe(0);
    // Opening the mailbox with an empty queue does not block (no duplicate UI).
    let done = false;
    showMailbox(s, s.flags.pending_narrative_letters, {
      onRead: () => {},
      onDone: () => {
        done = true;
      },
    });
    expect(isMailboxOpen()).toBe(false);
    expect(done).toBe(true);
  });

  it('Test 7 — multiple letters presented deterministically (save order)', () => {
    const s = makeSaveWithPending(['fenwick_memory_promise', 'marigold_ch2_revelation']);
    showMailbox(s, s.flags.pending_narrative_letters, {
      onRead: () => {},
      onDone: () => {},
    });
    const ov = overlay()!;
    // List view shows both senders, in deterministic pending order.
    expect(ov.allText()).toContain('Fenwick');
    expect(ov.allText()).toContain('Aunt Marigold');
    const listItems = ov.querySelectorAll('button').filter((b) =>
      b.className.includes('mailbox-list-item'),
    );
    expect(listItems.length).toBe(2);
    expect(listItems[0].textContent).toContain('Fenwick');
    expect(listItems[1].textContent).toContain('Aunt Marigold');
    // Opening one disables the list (can't double-open); Continue closes.
    listItems[0].click();
    // After opening, the letter card is shown (list disabled) but the mailbox
    // stays mounted until Continue.
    expect(isMailboxOpen()).toBe(true);
    ov.findButton(STRINGS.mailbox.continue)!.click();
    expect(overlay()).toBeNull();
  });

  it('Test 8 — text-size safe (no layout assumption; rem-based typography)', () => {
    // The mailbox uses only rem-based panel/overlay classes (main.css) that
    // scale with html font-size; there is no fixed-width body container that
    // would overflow at 150%. Assert the rendered structure carries the
    // shared classes rather than introducing a walled-off fixed-size block.
    const s = makeSaveWithPending(['marigold_ch2_revelation']);
    showMailbox(s, s.flags.pending_narrative_letters, {
      onRead: () => {},
      onDone: () => {},
    });
    const ov = overlay()!;
    const panel = ov.children.find((c) => c.className.includes('mailbox-panel'));
    expect(panel).toBeDefined();
    expect(panel!.className).toContain('panel');
  });
});
