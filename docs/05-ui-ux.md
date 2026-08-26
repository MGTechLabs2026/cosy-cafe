# 05 · Moonleaf Café — UI & UX

> Doc 05 of 07 · Status: Draft v0.1 · 2026-08-25
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
- **Customer bubble:** appears above arrival showing desired drink as a *picture* (icon of the drink, colored) — reading names is never required to play correctly.
- **Kettle panel (opens on click):** base choice (3 buttons) → up to 3 ingredient slots (tap shelf items) → finish toggle (hot/iced/foamed) → BREW. One screen, no sub-screens. Shows last-made drink as "repeat" shortcut button.
- **Door sign:** the day-phase controller. Flip to open service; flip to close. Physically drawn on the door — diegetic UI.

## 3. Core Flows

### 3.1 First 90 seconds (tutorial-by-design, no wall of text)
1. Title → New Game → short letter from Aunt Marigold (skippable, ≤ 100 words).
2. Café, morning. Journal pulses once. Notice board shows one tip card. Kettle glints.
3. First arrival scripted: **Old Wren** — *"I'll have my usual."* Bubble shows a generic-cup icon with "?".
4. Kettle opens automatically first time. Only water+tea_leaves available initially → hard to fail. Brew → serve.
5. Wren smiles: *"Close enough, dear. You'll find it."* (Sets up the arc AND teaches that near-misses are fine.)
6. Fenwick arrives and explicitly teaches R003. Player brews it. Success chime. Coins tick. Done — the player now knows: brew → serve → earn → journal remembers.

No further tutorials. Systems 2–4 introduce themselves via morning mail cards, one per day max.

### 3.2 Service loop (target ≤ 30 s per customer)
arrival (door chime) → walk-in → bubble appears → player clicks kettle → builds drink → serve → reaction + optional chat prompt (one click) → coin fly → customer lingers or leaves.
Chat is opt-in per customer (a small speech icon above them); skipping it costs nothing but the tip bonus.

### 3.3 Closing
Flip sign → recap modal: coins earned (count-up animation), new discoveries, hearts gained, letters received → Continue → autosave → next morning. Recap is also where upgrades can be browsed (shop button inside recap).

### 3.4 Save export / import (Settings overlay)

**Export:** one button → generates encrypted code (doc 02 §7.2) → shown in a copyable text box with "Copy" + "How to use this" expandable (explains: paste into the game on any device to restore). Long codes wrap; never truncate visually.

**Import:** paste field → "Restore" button → validation runs silently (doc 02 §7.2 pipeline) → on success, a **preview modal**: "This save is Day 4 · ¤42 · ★★ — Replace your current save?" with Cancel prominent. On failure, calm inline message from the failure-copy table; input stays editable for immediate retry.

Rules:
- Import is always opt-in per action; nothing auto-imports from clipboard.
- The preview always shows day/coins/stars so players can recognize *their* save without trusting the code blindly.
- Both buttons disable (with tooltip) if `crypto.subtle` is unavailable rather than falling back to plaintext.

## 4. Interaction Rules

- Everything clickable has hover + pressed + focus states (art spec doc 04). Cursor changes to "hand" only over true interactables.
- One-click actions wherever possible; drag-and-drop exists as a *secondary* input for ingredients (click-to-add is primary — touch-friendly later).
- Any modal closes with Esc / right-click / X button. No dead ends, ever: every state has a visible way forward.
- Text speed slider; clicking dialogue instantly completes the current line.
- All number feedback uses count-up animations (coins, hearts) — cheap dopamine, cozy pacing.

## 5. Feedback & State Design

| Event | Feedback |
|-------|----------|
| Correct serve | Ceramic clink + customer expression swap to warm + coin arc + occasional heart puff if favorite |
| Wrong serve (Murky Brew) | Customer declines politely, cup returns, kettle reopens — no red anywhere, no buzzer |
| Discovery (new recipe) | Freeze-frame 0.5 s, sparkle FX, journal flips itself open to the new entry |
| Not enough coins (shop) | Button shows price in muted color + wiggle-on-click + inline note "Earn ¤18 more" — never a blocking dialog |
| Patience low | Candle icon flickers; customer shifts weight (animation), never a timer bar turning red |
| Save happened | Tiny quill icon in corner fades in/out during evening recap only |

Error-state rule: the player can always recover without losing progress or feeling blamed.

## 6. Accessibility

- **Reduced motion** toggle: disables flicker/particles/transitions (doc 04 §1.5). Respects `prefers-reduced-motion` by default.
- **Text size** setting: body scale 100% / 125% / 150%.
- Full keyboard support: Tab order follows visual order; Enter activates; Esc closes; arrow keys navigate kettle options. Focus ring always visible (never `outline: none` without replacement).
- Colorblind safety: drink identification never relies on color alone (icon shape differs per drink family: leaf/cup/mug/flask silhouettes).
- Audio cues always duplicated visually (chime → door animation; discovery sparkle → journal flip).
- Captions/subtitle option for future voice content (post-MVP); all dialogue already textual.
- Seizure safety: no flashing above 3 Hz anywhere (candle flicker is 0.5 Hz).

## 7. Copy & Localization Notes

- Voice: second person, warm, brief. Buttons are verbs ("Brew", "Serve", "Open"). Never exclamation marks in system UI.
- Numbers formatted plainly: ¤42, not 42.00 coins.
- All copy in `strings.json` (keys, not hardcoded) from commit one — same file the writers use (doc 03 §7).

## 8. Playtest UX Checklist (run on every build)

- [ ] New player served first correct drink < 90 s without help
- [ ] Player can name what to do next at any pause point, unprompted
- [ ] Zero "how do I close this?" moments (modals)
- [ ] Zero comments about stress/rush
- [ ] Journal found and used by session end without being told
- [ ] Settings reachable from title AND in-game
