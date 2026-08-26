# 01 · Moonleaf Café — Core Game Design Document

> Doc 01 of 07 · Status: Draft v0.1 · 2026-08-25

## 1. High Concept

**Working title:** Moonleaf Café
**Tagline:** *Serve warm cups to cold travelers.*
**Genre:** Cozy café management / light simulation
**Platform:** Browser (HTML5) on itch.io · downloadable builds later
**Players:** Single player · **Session:** one in-game day ≈ 3–5 minutes · full arc ≈ 2–3 hours
**Price:** Free / donationware (MVP) · **Audience:** All ages, cozy-genre players

### Elevator Pitch

You inherit your Aunt Marigold's tiny café in Hollowbrook Crossing — a misty valley town where three roads meet and everyone passing between the human town, the elven woods, and the mountain holds ends up at your counter sooner or later. Learn what each regular drinks, discover recipes with a whisper of magic in them (moonleaf tea, cocoa with ember-chili, milk whipped with cloud sugar), and slowly turn a dusty shop into a place worth lingering in.

No timers you can't pause. No fail state. No exhaustion meter. Just a kettle, a hearth, a cat, and tomorrow's opening.

## 2. Target Audience & Personas

- **The lunch-break coaster.** Plays browser games on itch during breaks. Wants a session that respects 5–15 minutes, saves automatically, and asks nothing of them afterwards.
- **The Coffee Talk graduate.** Loves café-and-conversation games, wants more of the *people*, will read every dialogue line, will chase every relationship to maximum.
- **The anxious-unwinder.** Uses gentle games to decompress. Bounces off anything with countdown pressure, loud failure feedback, or guilt mechanics. This persona drives the Relaxed Mode requirement.

Primary references: *Coffee Talk* (café + fantasy conversation), *Travellers Rest* (sim depth — we deliberately take much less), *Strange Horticulture* (journal-led discovery), *Unpacking* (calm tactility), *Wylde Flowers* (character warmth).

**Positioning sentence:** *Coffee Talk's soul, one-room scale, zero time pressure.*

## 3. Design Pillars

Each pillar includes what it means in practice, because pillars that don't constrain decisions are decoration.

**P1 — Calm over challenge.**
In practice: no fail states anywhere in the codebase. Wrong drinks are gently declined, not punished. Patience meters exist but drain slowly, never display alarm colors, and vanish entirely in Relaxed Mode. The player can pause or stop mid-service at any moment and lose nothing.

**P2 — A knowable world.**
In practice: recipes, preferences, and schedules are all discoverable and *recorded*. The journal remembers every recipe once found; regulars' likes get written down automatically after you learn them. Experimentation is hinted, never required. The player should never feel stupid — only curious.

**P3 — Care is the progress.**
In practice: the two things that advance the game are *serving people well* (reputation stars) and *getting to know them* (hearts). Money buys comfort; attention buys story. Nothing important is gated behind grinding coins alone.

**P4 — Small but alive.**
In practice: six characters with real arcs beat twenty with one line each. The single café room changes visibly with upgrades — new shelves appear, the cat naps in the new window bed, the hearth grows. The world is one screen, but it breathes: steam, candle flicker, weather light through windows.

**P5 — Respect the player's time.**
In practice: one in-game day fits a coffee break. Prep is untimed — the day starts when the player flips the door sign, not on a schedule. Skipping a day is one click. Autosave happens at every evening recap; closing the tab mid-service loses at most one day's service.

## 4. The Loops

### Core loop (every day, ~3–5 min)

```
 MORNING (untimed prep)
   read the notice board & mail → check stock → set today's menu
        │
        ▼  player flips the door sign when ready
 SERVICE (ends when player flips sign back, or everyone's served)
   customer arrives → order shown in bubble → brew at the kettle → serve → chat snippet
        │
        ▼
 EVENING RECAP (modal)
   count coins → letters/unlocks → autosave
        │
        ▼
 spend coins on upgrades/ingredients · hearts unlock story beats ──► tomorrow
```

### Meta loop (across ~14 in-game days)

```
 serve well ──► reputation stars ──► unlock ingredients, methods, capacity
 bond w/ regulars ──► hearts ──► personal scenes, gifts, small arcs resolve
 day 14+: sandbox continues, seasons rotate décor, all arcs complete
```

The intended emotional shape of a full run: *curiosity → competence → belonging.*

## 5. Fantasy Flavor Rules

Magic in this world is **ambient, domestic, and harmless** — never a combat system, never a resource to optimize.

1. Magic explains coziness: the hearth never goes out, the kettle hums when a recipe is *nearly* right, moonleaf glows faintly on the shelf.
2. Magic creates gentle variety: an 8-night moon cycle (post-MVP) nudges which drinks people crave.
3. Magic never punishes: a failed experiment makes "murky tea" that even the cat declines. You pour it out. That's all.
4. Wonder budget: roughly one small magical delight per in-game day. More than that and wonder stops being wonderful.

## 6. What This Game Is Not

Saying no early is cheaper than cutting later.

- ❌ No combat, danger, villains, or stakes beyond "will Fenwick get his coffee."
- ❌ No stamina, hunger, sleep, or energy meters for the player character.
- ❌ No real-time pressure: nothing bad happens if the player idles.
- ❌ No farming, fishing, mining, or crafting chains beyond the kettle.
- ❌ No free-form furniture dragging in MVP (curated upgrade slots instead).
- ❌ No ads, energy walls, gacha, FOMO events, or notification mechanics — ever, in any version.
- ❌ No mobile support in MVP (be honest on the store page; revisit post-1.0).

## 7. MVP Success Criteria

How we'll know the MVP is good enough to keep building publicly. Measured informally via itch analytics + comments + a 5-person playtest (script in doc 06).

1. **Onboarding:** a new player serves their first correct drink within 90 seconds, without reading any external instructions.
2. **Session:** median play session ≥ 12 minutes; ≥ 40% of players who start day 1 reach day 5.
3. **Bonding:** at least one playtester mentions a *named character* unprompted in feedback.
4. **Calm:** zero comments describing stress/rush (if any appear, P1 is broken — fix before adding content).
5. **Technical:** loads and runs in current Chrome/Firefox/Safari, initial download ≤ 20 MB, no crash reports of save loss.
