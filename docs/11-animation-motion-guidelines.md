# 11 · Moonleaf Cozy Café — Animation & Motion Guidelines

> Doc 11 of 09 · Status: Draft v0.1 · 2026-08-28 · Added by the animation/UX polish pass
> Companion to doc 05 (UI & UX). Where the two disagree, this doc wins for
> motion/tweening specifics; doc 05 wins for screen/layout intent.

## 0. Purpose

This document is the single source of truth for **how things move** in Moonleaf
Café. It exists so the café's motion stays calm, consistent, and cozy as the
game grows. It constrains animation decisions the way doc 01's pillars constrain
feature decisions.

Everything here serves P1 — *Calm over Challenge*. Motion is a tone instrument,
not a performance. If a motion does not help the player feel the café, it does
not ship.

## 1. Product pillar for motion

```
CALM OVER CHALLENGE  →  applied to animation
```

Every animation should reinforce:

```
warmth · softness · patience · presence · gentle anticipation ·
satisfying completion
```

Motion must **never** imply:

```
urgency · punishment · failure · rush · competition · "hurry up"
```

If a proposed animation would make a player think *"the UI is fighting me,"*
it is wrong regardless of how polished it looks.

## 2. The four duration bands

Durations are deliberately soft targets, not hard rules. Preserve an existing
timing when it already reads well — do not force everything onto these numbers.

| Band | Target | Used for | Feel |
|------|-------:|---------|------|
| **MICRO** | 80–160 ms | hover, button press, focus, tiny acknowledgements | responsive, subtle |
| **SHORT** | 160–280 ms | overlay/card enter, selection transitions, toast | gentle, confident |
| **MEDIUM** | 300–700 ms | character walk-in/out, doors, cup slide, scene transitions | physical, soft |
| **LONG** | 700–1400 ms | emotional/environmental transitions (ending, chapter tint) | cinematic, calm, never blocking |

Constants live in `src/render/tween.ts` as `MOTION` (`micro` 0.13 / `short` 0.22 /
`medium` 0.5 / `long` 1.0).

## 3. Easing vocabulary

A small, fixed set. No third-party animation library; the tween infrastructure in
`src/render/tween.ts` is the only motion engine.

| Easing | Shape | Intended use |
|--------|-------|--------------|
| `easeOutQuad` | soft settle | default for small UI settles |
| `easeOutCubic` | a touch more decisive | **overlay enter** (backdrop fade) |
| `easeInCubic` | the inverse | **overlay exit** (so dismissal doesn't snap) |
| `easeInOutCubic` | weighty-but-soft | physical movement: cup slide, character walk, doors |
| `easeOutBack` (amount ≈ 0.08) | *very* subtle spring | **only** small celebratory beats (a recipe card landing). Overshoot is capped < 1.2 — a gentle settle, never a boing |
| `smoothstep` | legacy | the original `startTween`/`tickTween` curve; kept for callers that want it |

Explicitly discouraged: `linear` for anything visible, `elastic`, aggressive
`bounce`, and repeated overshoot. The codebase has no spring physics and adds none.

## 4. Overlay open/close (the biggest cozy win)

Every modal — kettle, journal, shop, settings, mailbox, letter, scene, recap,
ending — now **settles in** instead of hard-cutting via `display:none`.

- Backdrop: `overlay-in` 0.22 s `ease-out` (opacity 0 → 1).
- Panel: `panel-in` 0.26 s `cubic-bezier(0.22, 1, 0.36, 1)` (opacity + scale 0.96 → 1).
- Replayed reliably via `playOverlayEnter(overlay)` in `ui/overlay-anim.ts`, which
  removes/re-adds the `.overlay-anim` class with a forced reflow so reused overlay
  nodes (kettle/journal/shop/settings) animate every open, not just the first.
- Dismissal is instant (`display:none`); the enter animation alone is enough to
  remove the "snap" feeling without making the player wait on close.

The pure open/close **state machine** (`startOverlayAnim` / `overlayPlayOpen` /
`overlayPlayClose` / `overlayTick`) is DOM-free and unit-tested in
`tests/animation.test.ts`, so the same curve serves every overlay and can be
reasoned about without a browser.

## 5. Cozy motion rules (non-negotiable)

1. **Important actions get visual acknowledgement.** A brew, a serve, a discovery
   each has a clear, calm signal.
2. **No important information depends entirely on animation.** If the motion
   fails, the state (text, counter, icon) is still readable.
3. **Animations never delay ordinary gameplay.** The walk-out and overlays are
   ambient; nothing blocks the next input beyond a SUB-300 ms settle.
4. **Emotionally important events may breathe longer.** The ending and chapter
   tints use the LONG band; a served cup uses MEDIUM.
5. **Nothing flashes aggressively.** No screen flash, no red flash, no strobe.
   Candle flicker stays at 0.5 Hz (seizure-safe).
6. **No animation implies urgency.** No countdown motion, no shaking, no
   "hurry" cues. The day opens when the player flips the sign — never on a timer.
7. **Reward motion is satisfying but restrained.** Coin arc + one sparkle + a
   heart puff on a favorite; star-ups add a second sparkle. No popup storms.
8. **Error / wrong-brew feedback is gentle, never punitive.** Murky brew = a
   polite decline + the cup returns; no buzzer, no red, no "FAIL".

## 6. Customer arrival & departure

The café's most important physical motion.

- **Arrival:** door chime (audio) + a 2.2 s `easeInOut` walk-in from the painted
  door to the counter spot, with a *subtle* footstep bob + lean (`walkGait`,
  amplitude 2 px) so a single sprite frame reads as walking, not teleporting.
  Reduced motion disables the bob — the figure simply slides.
- **Order bubble** appears once the figure stops; it shows the drink **picture**
  (color-independent silhouette badge), never requires reading to play.
- **Departure (new in this pass):** after serving (or a kind low-patience
  goodbye), the figure **walks calmly back toward the door** over ~0.8 s instead
  of vanishing. This replaced an instant pop-out and is the single biggest
  "someone entered a little café, not an arcade enemy" improvement. The walk-out
  is also `easeInOut` and reduced-motion-snapped.

## 7. Kettle / brewing feedback (tactile, not delayed)

Per P1, brewing is **instant** in the sim — adding a fake wait would violate Rule 3.
Tactility comes from acknowledgements, not delay:

- Selecting a base / ingredient / finish highlights the chip immediately.
- The BREW button has a clear pressed state.
- On submit: the panel closes, the cup **slides** to the customer (`CupSlide`,
  ease-out cubic, ~0.55 s), steam rises from the waiting cup, and the serve
  resolves with a coin arc + sparkle + (on a favorite) a heart puff.
- The whole chain is calm and readable; nothing bounces.

## 8. Reward feedback (staggered, restrained)

```
action → character response → heart puff (if favorite) → subtle coin change
```

Multiple rewards in one moment are **staggered**, not stacked:

- Coin arc: one per serve.
- Sparkle: one normally, two on a star-up.
- Heart puff: only on a favorite serve that granted points.
- Toast: one line per event (served / favorite / star-up / taught).

No five-popup bursts. No screen clutter.

## 9. Mailbox (a morning ritual, not a notification center)

- Auto-opens calmly on mornings with pending letters (the `overlay-in` settle).
- Mandatory beats sorted first; optional letters follow by dimension alignment.
- **No** red badges, **no** flashing, **no** "NEW!!" urgency language. The
  unread emphasis is a quiet accent, never an alert.
- Reading a letter opens the calm letter panel; closing returns to the café.

## 10. Scene / dialogue

- Typing is warm and readable (30 ms/char, adjustable 0.5×–2× via settings).
- Click-to-complete is instant (reduced-motion and impatient players skip freely).
- Choice buttons enter with the same overlay settle; they never animate
  "correct" vs "incorrect" — all choices are kind per P1.
- Portraits swap gently; no aggressive transitions.

## 11. Recap & ending

- **Recap:** coin count-up (snaps under reduced motion), discoveries listed with
  generous spacing, a quiet "saved" quill. It is a breathing space, not a
  spreadsheet.
- **Ending:** uses the LONG band — a slower fade, more breathing room, stronger
  typographic hierarchy, restrained ambient motion. It reads as a conclusion, not
  a victory fireworks / game-over screen. All four endings are equally calm.

## 12. Accessibility (mandatory)

- **Reduced motion** (in-game toggle *and* `prefers-reduced-motion`) collapses
  every CSS animation/transition to an instant rest via the global
  `html.reduced-motion` / media-query rules at the bottom of `main.css`. The
  `OverlayAnim` state machine and the canvas tween paths also snap to their end
  state. Same information, less movement — never *no* feedback.
- **Text size** 100 / 125 / 150 % scales `<html>` font-size; every rem-based
  panel scales with it. Canvas world untouched. No clipping at larger sizes
  (panels use `max-height: 86vh` + internal scroll).
- **Focus** is always visible (`outline` on `:focus` and `:focus-visible`; no
  `outline: none` anywhere).
- **Colorblind safety:** drink identification never relies on color alone — the
  bubble carries a per-family silhouette badge (leaf / cup / mug / glass / bowl).
- **Seizure safety:** no flashing above 3 Hz; candle flicker is 0.5 Hz.

## 13. Performance guardrails (doc 08 §4)

- Live particle pool capped at **40**; exhausted → recycles the oldest, never
  exceeds the cap.
- One-time startup long-frame warning is allowed if harmless.
- No per-frame DOM thrash: overlays are `display:none` until opened; the canvas
  repaints every rAF but at 480×270 it is trivially cheap.
- The tween helper stays < 200 LOC and is 100 % unit-tested.

## 14. Do-not-add list

- No screen shake.
- No red flash / error color anywhere.
- No giant "FAIL" / "BOUNCE" popups.
- No countdown / timer motion.
- No notification spam or badges.
- No third-party animation library.
- No spring physics beyond the capped `easeOutBack` emphasis.

## 15. Testing

- `tests/animation.test.ts` pins: easing endpoints/monotonicity, `easeOutBack`
  overshoot bounds, tween reduced-motion snap + no-overshoot + done-idempotency,
  the `OverlayAnim` open→rest→close→removable flow, reduced-motion instant
  collapse, replay idempotency, and `walkGait` rest/arrival/reduced-motion.
- Visual quality (opacity curves, z-order, clipping) is verified in a real Chrome
  at 1280×720 / 1512×676 / 1440×900 / 1920×1080 — see the QA report
  (`docs/11-animation-uiux-polish-report.md`). Snapshot tests of every pixel are
  intentionally avoided; behavior is what we test.
