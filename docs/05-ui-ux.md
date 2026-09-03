# 05 · Moonleaf Cozy Café — UI & UX

> Doc 05 of 09 · Status: Draft v0.1 · 2026-08-27 · Updated with Narrative Letter System
> One room, one screen, no menus unless asked. If the player ever wonders what to do next, the UI failed.

## 1. Screen Map

```
TITLE ──► NEW GAME ──► CAFÉ (the entire game lives here) ──► EVENING RECAP ──► back to CAFÉ
  │                                                        │
  └──► CONTINUE (if save exists)                           └── autosave fires here
TITLE footer: SETTINGS · CREDITS
CAFÉ overlays (modal): JOURNAL · SHOP/UPGRADES · LETTERS · SETTINGS
Everything else = HUD elements on the single café screen.
```

Eight screens total, six of them are overlays. Navigation depth never exceeds one level.

## 2. The Café Screen (HUD layout)

Desktop reference 1280×720 (native art 480×270 integer-scaled). Mobile/tablet: revisit post-MVP.

```
┌────────────────────────────────────────────────────────────┐
│ Day 4 · Misty          [coins ¤42]  [stars ★★]   [⚙][📖]  │ ← top bar (persistent)
│                                                            │
│   window(rain)      [shelf: ingredients]    window         │
│                                                              │
│   [customer zone — arrivals stand here]        hearth      │
│                                                (glow)       │
│ ┌──counter──────────────────────────────────────────────┐  │
│ │ [kettle] [kettle2?]   [prep tray]      [serve spot]   │  │ ← interaction strip
│ └───────────────────────────────────────────────────────┘  │
│  [door sign OPEN/CLOSED]              Mops 💤     [journal]│ ← bottom corners
└────────────────────────────────────────────────────────────┘
```

- **Top bar:** day/weather, coins (tick up animated), stars, settings gear, journal button. Always visible, always calm.
- **Backdrop:** the room art itself carries the time of day — morning light in prep, daylight in service, dusk for the recap and the quiet tail of service, snow from day 11 on. Variants crossfade over ~1.4 s (`sim/day.ts` `roomVariantFor`), so opening the door reads as the light coming up and closing time as it going warm. Reduced motion cuts straight to the new variant.
- **Customer bubble:** appears above arrival showing desired drink as a *picture* (icon of the drink, colored) — reading names is never required to play correctly.
- **Customer sprites** walk in and out on a real multi-frame walk cycle (per-character frame sheets in `assets/sprites/<id>_walk_*.png`; `render/scene.ts` `walkFrameIndex` picks the frame, rest pose when stationary).
- **Kettle panel (opens on click):** base choice (3 buttons) → up to 3 ingredient slots (tap shelf items) → finish toggle (hot/iced/foamed) → BREW. One screen, no sub-screens. Shows last-made drink as "repeat" shortcut button.
- **Door sign:** the day-phase controller. Flip to open service; flip to close. Physically drawn on the door — diegetic UI.

## 3. Core Flows

### 3.1 First 90 seconds (tutorial-by-design, no wall of text)
1. Title → New Game → short letter from Aunt Marigold (skippable, ≤ 100 words).
2. Café, morning. Journal pulses once. Notice board shows one tip card.
3. First arrival scripted: **Fenwick** — *"Whatever's fastest. No— whatever's warmest. Actually… surprise me."* Bubble shows Black Tea icon.
4. Player opens kettle manually (no auto-open — playtest fix #2). Only water+tea_leaves available initially → hard to fail. Brew → serve.
5. Fenwick: *"Good pace. Keep it."* Coins tick.
6. Second arrival: **Old Wren** — *"I'll have my usual."* Bubble shows a generic-cup icon with "?" (near-miss tutorial).
7. Player brews any known recipe → Wren: *"Close enough, dear. You'll find it."* (Sets up the arc AND teaches that near-misses are fine.)
8. Fenwick returns and explicitly teaches R003 Moonleaf Tea. Player brews it. Success chime. Coins tick. Done — the player now knows: brew → serve → earn → journal remembers.

No further tutorials. Systems 2–4 introduce themselves via morning mail cards, one per day max.

### 3.2 Service loop (target ≤ 30 s per customer)
arrival (door chime) → walk-in → bubble appears → player clicks kettle → builds drink → serve → reaction + optional chat prompt (one click) → coin fly → customer lingers or leaves.

Chat is opt-in per customer (a small speech icon above them); skipping it costs nothing but the tip bonus.

### 3.3 Closing
Flip sign → recap modal: coins earned (count-up animation), new discoveries, hearts gained, letters received → Continue → autosave → next morning. Recap is also where upgrades can be browsed (shop button inside recap).

Every recap figure is **that day's total only** — coins earned, drinks served and discoveries reset each morning (doc 02 §1). "Coins earned today" is not the purse balance; the purse (see §3.3a) will differ by yesterday's leftover minus anything spent in the shop.

### 3.3a Shop (Evening Market)
Opened from the recap. The header carries a running **purse total** (`Purse: ¤N`) that reads the live coin balance and ticks down on every purchase — a brief highlight pulse marks the deduction (skipped under reduced motion). Insufficient funds show an inline "Earn ¤N more" on the item, never a blocking dialog.

### 3.4 Save export / import (Settings overlay)

**Export:** one button → generates encrypted code (doc 02 §7.2) → shown in a copyable text box with "Copy" + "How to use this" expandable (explains: paste into the game on any device to restore). Long codes wrap; never truncate visually.

**Import:** paste field → "Restore" button → validation runs silently (doc 02 §7.2 pipeline) → on success, a **preview modal**: "This save is Day 4 · ¤42 · ★★ — Replace your current save?" with Cancel prominent. On failure, calm inline message from the failure-copy table; input stays editable for immediate retry.

Rules:
- Import is always opt-in per action; nothing auto-imports from clipboard.
- The preview always shows day/coins/stars so players can recognize *their* save without trusting the code blindly.
- Both buttons disable (with tooltip) if `crypto.subtle` is unavailable rather than falling back to plaintext.

### 3.5 Morning Mail & Letter System (Doc 09 §7)

**New in Narrative System:** The morning mail delivery is now the primary narrative content delivery mechanism.

**Mailbox UI (replaces static notice board):**

```
┌─────────────────────────────────────┐
│ 📬  MORNING MAIL              Day 5 │
├─────────────────────────────────────┤
│ ✉  Marigold: "The Ledger"      NEW  │  ← mandatory, high priority
│ ✉  Fenwick: "A Promise"        NEW  │  ← NPC relationship (CARE-driven)
│ ✉  Town Council: "Market Day"       │  ← community (COMMUNITY-driven)
│ ✉  ???: "A Clue About Moonleaf"     │  ← mystery (CURIOSITY-driven)
│                                     │
│ [Read]  [Dismiss]  [Journal]        │
└─────────────────────────────────────┘
```

**Mailbox behaviors:**
- Opens automatically on morning entry (after Day 1)
- Letters sorted: mandatory first → dimension-aligned optional
- **"NEW"** badge on unread letters
- **Source icon** (📜 Marigold, 👤 NPC, 🏘 Town, 🔮 Mystery)
- **Read** → opens letter overlay (doc 05 §3.4 style)
- **Dismiss** → marks read without opening (for optional letters)
- **Journal** → jumps to Letters tab with this letter highlighted
- Max 1 letter auto-delivered per day; additional letters queue for subsequent mornings
- Mandatory letters (Marigold, convergence) always deliver on schedule

**Letter Overlay (extends existing pattern):**

```
┌─────────────────────────────────────┐
│ [×]                    Marigold     │
├─────────────────────────────────────┤
│                                     │
│   Dear one,                         │
│                                     │
│   The ledger in the drawer...       │
│   (letter content, ≤ 120 words)     │
│                                     │
├─────────────────────────────────────┤
│ [Archive]      [Reply Later]        │  ← Reply Later = marks for follow-up
└─────────────────────────────────────┘
```

- **Archive** → saves to journal Letters tab, sets `flags.letters_read`
- **Reply Later** → keeps in mailbox with 📌 pin, sets `flags.letters_dismissed`
- **Esc / click outside / ×** → closes, letter remains in mailbox
- **Reduced motion:** no animation, instant appear

**Journal Letters Tab Update:**
- Letters now show **source**, **day received**, **read status**
- Unread letters highlighted with accent color
- "Reply Later" letters show 📌 pin icon
- Clicking archived letter re-opens letter overlay

### 3.6 Narrative State Visibility (Post-MVP / Debug)

For playtesting only (hidden in release):

```
Settings → Advanced → Narrative Debug
┌─────────────────────────────────────┐
│ CARE        ████████░░  0.72        │
│ CURIOSITY   ██████░░░░  0.58        │
│ COMMUNITY   █████░░░░░  0.45        │
│ COMFORT     ████████░░  0.70        │
│ INDEPENDENCE███░░░░░░  0.30        │
│                                     │
│ Chapter: 2 (Day 6)                  │
│ Trajectory hint: CARE               │
│ Letters delivered: 12               │
└─────────────────────────────────────┘
```

## 4. Interaction Rules

- Everything clickable has hover + pressed + focus states (art spec doc 04). Cursor changes to "hand" only over true interactables.
- One-click actions wherever possible; drag-and-drop exists as a *secondary* input for ingredients (click-to-add is primary — touch-friendly later).
- Any modal closes with Esc / right-click / X button. No dead ends, ever: every state has a visible way forward.
- Text speed slider; clicking dialogue instantly completes the current line.
- All number feedback uses count-up animations (coins, hearts) — cheap dopamine, cozy pacing.
- **Mailbox:** one-click read, one-click dismiss. No confirmation for dismiss (undo via Journal).

## 5. Feedback & State Design

| Event | Feedback |
|-------|----------|
| Correct serve | Ceramic clink + customer expression swap to warm + coin arc + occasional heart puff if favorite |
| Wrong serve (Murky Brew) | Customer declines politely, cup returns, kettle reopens — no red anywhere, no buzzer |
| Discovery (new recipe) | Freeze-frame 0.5 s, sparkle FX, journal flips itself open to the new entry |
| Not enough coins (shop) | Button shows price in muted color + wiggle-on-click + inline note "Earn ¤18 more" — never a blocking dialog |
| Patience low | Candle icon flickers; customer shifts weight (animation), never a timer bar turning red |
| Save happened | Tiny quill icon in corner fades in/out during evening recap only |
| **New letter delivered** | Envelope icon pulses on HUD mail indicator (top bar) |
| **Letter read** | Envelope opens animation; journal tab badge updates |
| **Chapter transition** | Subtle screen tint shift + Marigold quote toast |

Error-state rule: the player can always recover without losing progress or feeling blamed.

## 6. Accessibility

- **Reduced motion** toggle: disables flicker/particles/transitions (doc 04 §1.5). Respects `prefers-reduced-motion` by default.
- **Text size** setting: body scale 100% / 125% / 150%.
- Full keyboard support: Tab order follows visual order; Enter activates; Esc closes; arrow keys navigate kettle options. Focus ring always visible (never `outline: none` without replacement).
- Colorblind safety: drink identification never relies on color alone (icon shape differs per drink family: leaf/cup/mug/flask silhouettes).
- Audio cues always duplicated visually (chime → door animation; discovery sparkle → journal flip).
- Captions/subtitle option for future voice content (post-MVP); all dialogue already textual.
- Seizure safety: no flashing above 3 Hz anywhere (candle flicker is 0.5 Hz).
- **Mailbox:** screen reader announces "X new letters" on morning entry; each letter has source + day + read status.

## 7. Copy & Localization Notes

- Voice: second person, warm, brief. Buttons are verbs ("Brew", "Serve", "Open", "Read", "Dismiss"). Never exclamation marks in system UI.
- Numbers formatted plainly: ¤42, not 42.00 coins.
- All copy in `strings.json` (keys, not hardcoded) from commit one — same file the writers use (doc 03 §7).
- **Letter keys:** `letters.marigold.ch1.ledger`, `letters.fenwick.ch2.promise`, `letters.town.ch3.market`, `letters.mystery.ch2.clue1`

## 8. Playtest UX Checklist (run on every build)

- [ ] New player served first correct drink < 90 s without help
- [ ] Player can name what to do next at any pause point, unprompted
- [ ] Zero "how do I close this?" moments (modals)
- [ ] Zero comments about stress/rush
- [ ] Journal found and used by session end without being told
- [ ] Settings reachable from title AND in-game
- [ ] **Morning mailbox understood without explanation**
- [ ] **Letter read/dismiss flow intuitive**
- [ ] **Journal Letters tab shows read status clearly**

## 9. Motion & Animation (see doc 11 for the full language)

The café's motion is governed by doc 11 (Animation & Motion Guidelines). Summary
of what changed in the animation/UX polish pass:

- **Overlays settle in, never hard-cut.** Kettle, journal, shop, settings,
  mailbox, letter, scene, recap, and ending now fade + gently scale in
  (`overlay-in` 0.22 s / `panel-in` 0.26 s) via `playOverlayEnter()` in
  `ui/overlay-anim.ts`. Reused overlay nodes re-animate every open.
- **Customers walk out gracefully.** After serving (or a kind low-patience
  goodbye) the figure eases back toward the door (~0.8 s) instead of vanishing.
  Walk-in and walk-out play a real per-character frame cycle; the sprite holds
  its rest frame when standing at the counter.
- **The backdrop crossfades, never cuts.** Time-of-day / season variants
  (`morning` / `day` / `evening` / `snow`) blend over ~1.4 s (`ROOM_FADE_MS`,
  smoothstep) so door-open and closing time land as light changes, not swaps.
- **Toasts ease up + in** (calm entrance) instead of popping.
- **Motion bands:** micro 80–160 ms · short 160–280 ms · medium 300–700 ms ·
  long 700–1400 ms. **Easing:** `easeOutQuad` / `easeOutCubic` (enter) /
  `easeInCubic` (exit) / `easeInOutCubic` (physical) / capped `easeOutBack`
  (tiny celebratory spring only). No `linear`, `elastic`, or aggressive bounce.
- **Reduced motion** collapses every animation to an instant rest (in-game toggle
  + `prefers-reduced-motion`); same information, less movement.

### 9.1 Liveness Without Continuous Animation

The café feels alive through **state-driven presence**, not constant motion.

Player actions create immediate visual state changes:

- pet Mops → pet state
- brew → kettle ready state
- serve → customer served state
- door chime → Mops looks toward door

Ambient presence produces occasional discrete state changes after ~60 seconds
of active café time. This is not a timer, not a penalty, and not an
obligation. It is simply: *the café quietly changes while you are here.*

Reduced motion still receives state changes; only the movement enhancement is
removed.

See `docs/14-presence-system.md` for the full model.

## 10. UI Changelog

| Date | Change | Reason |
|------|--------|--------|
| 2026-08-25 | Initial UI spec | Baseline for M1 |
| 2026-08-27 | Added §3.5 Morning Mail & Letter System, §3.6 Narrative Debug | Doc 09 narrative system integration |
| 2026-08-28 | Added §9 Motion & Animation; linked doc 11 (Animation & Motion Guidelines) | Animation/UX polish pass: overlays settle in, customers walk out, toast eases in, cozy motion language defined |
| 2026-09-02 | §2/§9: backdrop cycles by phase + season with a ~1.4 s crossfade; customer sprites use real per-character walk cycles. §3.3a: Evening Market shop header shows a live purse total that ticks down on each buy. §3.3 clarified recap figures are per-day, not the purse balance. | Session feature work + two bug fixes (recap tallies reset, journal Recipes tab lists all met recipes) |