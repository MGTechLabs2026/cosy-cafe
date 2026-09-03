# 14 · Moonleaf Cozy Café — State-Driven Presence System

> Doc 14 of 09 · Status: Draft v0.1 · 2026-08-30
> Companion to doc 05 (UI/UX) and doc 11 (Animation/Motion).

## 1. Purpose

The presence system keeps the café feeling alive without relying on continuous
animation for every object. It does this through:

```
player action → immediate visual state change
AND
~60s of active café time → one subtle ambient state change
```

The 60-second cadence is NOT a gameplay timer. It never punishes, pressures,
or interrupts the player.

## 2. Core Model

### 2.1 Triggers

```
PLAYER_ACTION → immediate
AMBIENT_PRESENCE → after ~60s active café time
```

### 2.2 Active Café Time

Presence time advances only when:

- The café screen is active
- No blocking overlay owns attention (settings, journal, shop, scene, recap,
  ending, mailbox, kettle, title)

If the tab is hidden or an overlay is open, presence time does not advance.
This prevents bursts after tab stalls.

## 3. Implementation

### 3.1 Presence Clock

`GameController` tracks `presenceElapsedMs`. It increments by `dtSec * 1000`
only when an interactive café view is active.

### 3.2 Ambient Tick

At most once per minute of active time, `pickAmbientPresence()` evaluates
deterministic candidates. It returns a `PresenceChange` describing one allowed
transition, or `null`.

Current scope: **Mops only**.

### 3.3 Deterministic Selection

Selection uses a tiny `mulberry32` PRNG seeded from `(day, tick minute)`. The
same game state produces the same ambient possibility set.

No uncontrolled `Math.random()` is used for ambient selection.

## 4. Presence Targets

### 4.1 Mops

States:

```
sleep → sit
sit   → look
look  → stretch
sit   → sleep
idle  → sit
idle  → look
```

No immediate repeat. During active service with a waiting customer, Mops
prefers stillness.

### 4.2 Future Targets (not yet implemented)

- NPC alternate poses (drink/read/idle)
- Counter cup presence
- Table recently-used state
- Story object visibility from narrative state

## 5. Player Actions → State Changes

Wired immediately:

- **Pet Mops** → `pet` state + heart puff
- **Door chime** → Mops looks toward door
- **Murky brew** → Mops sniffs
- **Customer served** → customer served visual state
- **Brew complete** → kettle ready marker

These happen instantly, independent of the ambient clock.

## 6. Reduced Motion

State changes still occur under reduced motion. Motion enhancements are
minimized, but the underlying state is always readable.

## 7. Performance

- One evaluation per tick, only during active café time
- No per-object animation loops
- No DOM churn
- Candidate set is tiny (Mops: 6 entries)

## 8. Save / Persistence

Ambient presence decisions are ephemeral. Only permanent progression (upgrades,
narrative flags) persists.

## 9. Testing

`tests/presence.test.ts` covers:

- null when service open with active customer
- null for states with no candidates
- deterministic selection
- no immediate repeats
- 59s/60s/61s boundary behavior

## 10. Future Work

- Expand candidate pool to NPCs and café objects
- Add position alternates (Mops bench A vs B)
- Wire story object visibility into presence targets
- Add player-triggered journal/letter state changes
