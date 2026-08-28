// ui/mailbox.ts — Morning Mailbox (Batch 3, doc 05 §3.1 / doc 10 BUG-01).
//
// Presents scheduled narrative letters to the player at the start of a day.
// Calm, non-blocking, cozy. Reuses the existing overlay/panel visual language
// (.overlay/.panel/.letter-body/.btn from main.css) — no new modal framework.
//
// Responsibilities (UI only):
//   - render a letter (sender / day / title / body) or a deterministic list
//   - call onRead(id) when a letter is opened (controller persists read state)
//   - call onDone() when the player continues to the café
// It does NOT mutate the save, the scheduler, or narrative semantics.

import { STRINGS } from '../data/strings.js';
import { playOverlayEnter } from './overlay-anim.js';
import type { SaveData } from '../save/validate.js';

/** Display sender for each letter source (cozy, no new content systems). */
const SOURCE_SENDER: Record<string, string> = {
  marigold: 'Aunt Marigold',
  fenwick: 'Fenwick',
  sela: 'Sela',
  wren: 'Old Wren',
  bram: 'Bram',
  nia: 'Nia',
  town: 'The Town Council',
  mystery: 'A Stranger',
  reactive: 'The Café',
};

export interface MailboxHooks {
  /** Called when a letter is opened/read so the controller can persist it. */
  onRead: (letterId: string) => void;
  /** Called when the player continues to the café (all UI dismissed). */
  onDone: () => void;
}

/** Resolve a letter's display fields from the save + strings (no mutation). */
export function letterView(save: SaveData, letterId: string): {
  id: string;
  sender: string;
  title: string;
  body: string;
  day: number;
} | null {
  const entry = STRINGS.letters[letterId];
  if (!entry) return null;
  const source = letterId.split('_')[0] ?? 'marigold';
  return {
    id: letterId,
    sender: SOURCE_SENDER[source] ?? 'Aunt Marigold',
    title: entry.title,
    body: entry.body,
    day: save.day,
  };
}

/**
 * Show the morning mailbox for the given pending letter ids (in save order —
 * deterministic). If `letters` is empty this is a no-op (caller should not call
 * it then). Multiple letters are shown as a list; the player opens each and
 * continues at their own pace (optional content is never forced).
 */
export function showMailbox(
  save: SaveData,
  pendingLetterIds: readonly string[],
  hooks: MailboxHooks,
): void {
  const app = document.getElementById('app');
  if (!app) throw new Error('#app element not found');
  if (pendingLetterIds.length === 0) {
    hooks.onDone();
    return;
  }

  const views = pendingLetterIds
    .map((id) => letterView(save, id))
    .filter((v): v is NonNullable<typeof v> => v !== null);
  if (views.length === 0) {
    hooks.onDone();
    return;
  }

  const existing = document.getElementById('mailbox-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'mailbox-overlay';
  overlay.className = 'overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', STRINGS.mailbox.title);

  const panel = document.createElement('div');
  panel.className = 'panel mailbox-panel';

  const readIds = new Set<string>();

  const finish = (): void => {
    overlay.remove();
    window.removeEventListener('keydown', onKey);
    hooks.onDone();
  };

  const onKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') {
      e.preventDefault?.();
      finish();
    }
  };

  // --- Header ---
  const title = document.createElement('h2');
  title.textContent = STRINGS.mailbox.title;
  title.id = 'mailbox-title';

  const sub = document.createElement('p');
  sub.className = 'note';
  sub.textContent =
    views.length > 1
      ? STRINGS.mailbox.multipleHint.replace('{count}', String(views.length))
      : STRINGS.mailbox.singleHint;

  // --- Content area (list or single letter) ---
  const content = document.createElement('div');
  content.className = 'mailbox-content';

  const continueBtn = document.createElement('button');
  continueBtn.type = 'button';
  continueBtn.id = 'mailbox-continue';
  continueBtn.className = 'btn btn-primary';
  continueBtn.textContent = STRINGS.mailbox.continue;
  continueBtn.setAttribute('aria-label', STRINGS.mailbox.continue);

  const readOne = (v: NonNullable<ReturnType<typeof letterView>>): void => {
    if (readIds.has(v.id)) return;
    readIds.add(v.id);
    hooks.onRead(v.id);
  };

  const renderSingle = (v: NonNullable<ReturnType<typeof letterView>>): void => {
    content.replaceChildren();
    content.appendChild(renderLetterCard(v));
    readOne(v);
    continueBtn.focus();
  };

  const renderList = (): void => {
    content.replaceChildren();
    const list = document.createElement('ul');
    list.className = 'mailbox-list';
    list.setAttribute('aria-label', STRINGS.mailbox.listLabel);
    views.forEach((v, i) => {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn mailbox-list-item';
      btn.textContent = `${v.sender} — ${v.title}`;
      btn.setAttribute('aria-label', `${v.sender}: ${v.title}`);
      btn.addEventListener('click', () => {
        renderSingle(v);
        list.querySelectorAll('button').forEach((b) => (b.disabled = true));
      });
      li.appendChild(btn);
      list.appendChild(li);
      void i;
    });
    content.appendChild(list);
    continueBtn.focus();
  };

  const btnRow = document.createElement('div');
  btnRow.className = 'btn-row';
  btnRow.appendChild(continueBtn);

  panel.appendChild(title);
  panel.appendChild(sub);
  panel.appendChild(content);
  panel.appendChild(btnRow);
  overlay.appendChild(panel);
  app.appendChild(overlay);
  playOverlayEnter(overlay);

  // Single letter: show it directly. Multiple: show the list first.
  if (views.length === 1 && views[0]) {
    renderSingle(views[0]);
  } else {
    renderList();
  }

  continueBtn.addEventListener('click', finish);
  window.addEventListener('keydown', onKey);
}

/** Build a letter card element (sender / day / title / body). */
function renderLetterCard(v: {
  sender: string;
  title: string;
  body: string;
  day: number;
}): HTMLElement {
  const card = document.createElement('div');
  card.className = 'mailbox-letter';

  const sender = document.createElement('p');
  sender.className = 'mailbox-sender';
  sender.textContent = v.sender;

  const day = document.createElement('p');
  day.className = 'note mailbox-day';
  day.textContent = STRINGS.mailbox.dayLine.replace('{day}', String(v.day));

  const subject = document.createElement('h3');
  subject.className = 'mailbox-subject';
  subject.textContent = v.title;

  const body = document.createElement('p');
  body.className = 'letter-body';
  body.textContent = v.body;

  card.appendChild(sender);
  card.appendChild(day);
  card.appendChild(subject);
  card.appendChild(body);
  return card;
}

/** True if a mailbox overlay is currently mounted. */
export function isMailboxOpen(): boolean {
  const el = document.getElementById('mailbox-overlay');
  return !!el && !el.classList.contains('hidden');
}

/** Dismiss any mounted mailbox overlay (test/cleanup helper). */
export function closeMailbox(): void {
  document.getElementById('mailbox-overlay')?.remove();
}

/**
 * Pure mutation: record a letter as read and drop it from the pending queue.
 * Idempotent — safe to call more than once for the same id. Returns true if
 * the save actually changed. The caller is responsible for persisting (the
 * DayController wires this to its autosave so a refresh can't un-read it).
 */
export function markLetterRead(save: SaveData, letterId: string): boolean {
  let changed = false;
  if (!save.flags.letters_read.includes(letterId)) {
    save.flags.letters_read.push(letterId);
    changed = true;
  }
  const pending = save.flags.pending_narrative_letters;
  if (pending.includes(letterId)) {
    save.flags.pending_narrative_letters = pending.filter((id) => id !== letterId);
    changed = true;
  }
  return changed;
}
