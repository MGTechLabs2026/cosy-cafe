# 08 · Moonleaf Cozy Café — Tech Stack & Architecture

> Doc 08 of 09 · Status: Draft v0.1 · 2026-08-27 · Updated with Narrative Module Architecture
> Stated priorities: **performance and size.** Everything else (dev speed, familiarity) is a tiebreaker, not a goal.

## 1. The Decision

**No game engine. TypeScript + Vite + a hand-rolled Canvas2D renderer, DOM for all text/UI, Howler for audio.**

```
Layer          Choice                          Runtime cost (approx, gzip)
─────────────────────────────────────────────  ───────────────────────────
Language       TypeScript (strict)             0 (compile-time)
Build          Vite + esbuild                  0 (dev-time)
Renderer       Vanilla Canvas2D, own ~300 LOC  0 KB engine
Game code      Own modules                     ~25–45 KB
Text/UI        DOM (HTML/CSS), not canvas      browser-native
Tween helper   Own ~120 LOC                    ~1 KB
Audio          Howler                          ~10 KB
Save validate  Hand-rolled validator           ~1 KB
Total JS       —                               well under 100 KB gzip
```

The whole runtime is smaller than one texture atlas. Load-to-interactive becomes effectively instant on any connection itch serves.

## 2. Why Not An Engine (given these priorities)

| Option | Approx added weight | Verdict |
|--------|--------------------|---------|
| Godot 4 HTML5 | Multi-MB wasm runtime (commonly ~7–10 MB compressed) before a single asset; wasm parse delay on low-end devices | ❌ Eats half the 20 MB budget paying for features (physics, 3D, shaders) this game will never call. Verify exact figure at M0 if ever reconsidered. |
| Unity Web | 20 MB+ runtime | ❌ Non-starter. |
| Phaser 3 | ~0.4 MB gzip engine + its scene/input/tween machinery | ⚠️ Good engine, wrong trade here: we'd ship a general-purpose framework to draw ~30 sprites in one room. Its strengths (camera, physics, tilemaps, arcade) are all unused. |
| PixiJS v8 | ~0.15 MB gzip | ⚠️ The sanctioned *upgrade path* (§7), not the starting point. WebGL buys nothing for <50 sprites; Canvas2D at 480×270 is trivially 60 fps. |
| KAPLAY/Kaboom | Small | ⚠️ Cute, but adds a dependency for things we can write in a weekend, with less control over payload. |

**Key insight:** this game's runtime performance ceiling is nowhere near any engine's floor. One static room, ≤ 40 sprites, ≤ 40 pooled particles, a 30 Hz simulation. Canvas2D renders that with orders of magnitude of headroom on hardware from the last decade. So *frame rate* isn't the real perf axis — **download size, parse time, and memory** are. Every engine choice above spends those axes to buy capabilities we don't use.

## 3. Architecture

### 3.1 The canvas/DOM split (biggest single win)

- **Canvas owns:** the 480×270 game world — room, characters, Mops, steam/FX, coin arcs.
- **DOM owns:** every piece of text and UI — dialogue box, journal, kettle panel, shop, settings, HUD counters, save import/export.

Why this wins on all three stated axes:

| Axis | Win |
|------|-----|
| Size | No bitmap-font pipeline, no text-layout code in JS. Browser does text better than any engine, for free. WOFF2 subsets are tens of KB. |
| Performance | DOM text updates touch a handful of nodes; the canvas never re-renders glyphs. Modals are `display:none` until opened — zero cost when closed. |
| Accessibility | Real text nodes = screen readers, selection, zoom, IME work natively. Doc 05 §6 requirements get satisfied by construction instead of by heroics. |

### 3.2 Rendering loop

- Fixed-timestep simulation at **30 Hz** (patience drains, arrivals, brew timers) + render on every `requestAnimationFrame`. Deterministic sim makes tests and future replays trivial.
- Backbuffer canvas locked at 480×270, composited via CSS `transform: scale(k)` where k is the largest **integer** ≤ available scale (DPR-aware). `image-rendering: pixelated`. Integer-only scaling honors doc 04 §1.2 and avoids shimmer.
- **Always-render-per-rAF:** the room repaints every frame (a flicker regression from an earlier dirty-flag attempt was fixed by reverting to per-frame rendering). Still battery-friendly at 480×270; the GPU does the heavy lifting.
- Particles: preallocated pool, hard cap 40 live. Steam = recycled sprites, not objects.

### 3.3 Modules (post-refactor + narrative)

```
src/
  main.ts                 bootstrap, loop, scaling
  render/
    draw.ts               backbuffer, palette rect/blit/particle primitives, room base + backdrop-variant crossfade (setRoomVariantProvider)
    scale.ts              integer scale computation + CSS transform string
    scene.ts              world-layer: customer sprites (multi-frame walk cycle via walkFrameIndex), order bubbles, patience candle, door sign, FX
    images.ts             preloaded-image registry (room variants, sprite walk sheets, portraits, drink icons)
    fx.ts                 pooled particles (steam, heart puff, sparkle, cup slide, title snow)
    palette.ts            32-color master palette + CSS converters
    tween.ts              smoothstep tween, CountUp (coin count-up)
  sim/
    day.ts                day phase machine, inventory, starting stock, roomVariantFor (backdrop by phase + season)
    brewing.ts            recipe table, matching, resolveBrew, drink pricing
    customers.ts          character defs, favorites, patience, daily schedule builder
    economy.ts            coins/stars, payouts, star thresholds
    hearts.ts             float heart points, daily cap, displayed hearts = floor(points)
    upgrades.ts           upgrade defs, purchase logic, effect accessors (capacity, patience, brew speed)
    shelf.ts              ingredient prices, weekly delivery, capacity check, Sela's cart rule
  controllers/
    game-controller.ts    composition root, app lifecycle, shared state refs, render loop, debug hooks
    day-controller.ts     morning banner, door open, evening close, recap modal, next-day transition
    service-controller.ts active customer session: arrivals, patience, chat, serve, teach beats, arc scenes
    kettle-controller.ts  kettle panel state, stock gate, ingredient consumption, brew submission
    progression-controller.ts economy runtime, hearts ledger, inventory, upgrades, save snapshots
  narrative/              ← NEW in M5
    narrative-state.ts    compute 5 dimensions from save state
    narrative-evaluator.ts eligibility, thresholds, scoring
    narrative-scheduler.ts chapter advancement, beat triggering
    letter-scheduler.ts   letter selection, delivery, caps
    story-definitions.ts  all narrative content data (letters, chapters, endings)
    ending-evaluator.ts   final ending determination
    narrative-hooks.ts    controller integration points
  ui/
    cafe-dom.ts           DOM plumbing: banner, action bar, toast, canvas click routing
    game.ts               thin compat layer — public entry point for tests + main.ts
    hud.ts                top bar: day, coins, stars, settings, journal, mail indicator
    journal.ts            4-tab overlay (recipes, regulars, town, letters)
    kettle.ts             kettle panel DOM (base/ingredients/finish/BREW, A/B slots)
    shop.ts               evening-market shop (upgrades + ingredients)
    recap.ts              evening recap modal (coin count-up, discoveries, hearts, shop button)
    scene.ts              dialogue/scene overlay (portrait + text, choices, typing animation)
    settings.ts           settings overlay (toggles, text-size, export/import)
    title.ts              title screen (Continue/New Game, gesture unlock)
    title-snow.ts         juice: snowfall canvas behind title
    textsize.ts           text-size + reduced-motion class on <html>
    letter.ts             tutorial letter overlay + morning mailbox
  data/
    recipes.ts            recipe view helpers (name, icon, combo from strings)
    strings.ts            STRINGS object (inlined strings.json)
    strings.json          single source of truth for all game text
                          (nested object; dotted keys like "fenwick.scene1.line1"
                           resolve through the nested structure, not flat lookup)
    scenes.ts             scene definitions + trigger logic
  save/
    store.ts              localStorage read/write, migration chain, import pipeline
    crypto.ts             AES-GCM export/import (MLC1 wire format)
    validate.ts           schema validation, SaveData/SaveFlags/SaveSettings types
    key.ts                static AES-256 key + key id
  audio/
    howl.ts               Howler wrapper: SFX pool, gesture-gated unlock, streaming music with crossfade
  version.ts              GAME_VERSION constant
```

**Dependency direction (actual, by import):**

```
sim/                      ← pure TypeScript, zero platform imports
  ↑
narrative/                ← pure TypeScript, imports sim/ + save/validate only
  ↑
controllers/              ← orchestration ONLY: imports sim/ + data/ + narrative/ + presentation/infra
  ↑
ui/        render/        ← presentation layer (DOM + Canvas)
audio/      save/
  ↑
main.ts                   ← bootstrap, ties everything together
```

**Rule:** `sim/` is pure TypeScript with zero platform imports — every gameplay rule from doc 02 is unit-testable without a browser. `narrative/` is also pure TypeScript, importing only `sim/` and `save/validate.ts` for types. `controllers/` orchestrates between pure sim, narrative, and presentation (ui/render/audio/save) — no business rules live here. **Controllers DO import presentation/infrastructure modules** (DOM, Canvas, audio, save) to coordinate them; they don't contain gameplay rules themselves.

### 3.4 Controller responsibility matrix (actual imports verified)

| Controller | Owns (orchestrates) | Delegates to (sim/data/narrative) | Imports (presentation/infra) |
|------------|---------------------|-----------------------------------|------------------------------|
| `GameController` | Composition root, app lifecycle, shared state refs, per-frame render coordination, debug hook surface | `DayController`, `ServiceController`, `KettleController`, `ProgressionController`, `NarrativeScheduler` | `render/tween`, `render/scene`, `render/images`, `render/fx`, `ui/cafe-dom`, `ui/journal`, `ui/shop`, `ui/scene`, `ui/textsize`, `save/crypto`, `audio/howl` |
| `DayController` | Morning banner, door open, evening close/recap, next-day transition, daily schedule init, weekly delivery, **morning mail delivery** | `sim/day` (phase machine), `sim/customers` (schedule), `sim/shelf` (delivery), `LetterScheduler` | `audio/howl`, `ui/cafe-dom`, `ui/recap`, `ui/shop`, `data/strings`, `data/recipes` |
| `ServiceController` | Active session: spawn/walk-in/patience/chat/serve/payout/hearts/teach beats/arc triggers/retire | `sim/customers`, `sim/economy`, `sim/hearts`, `data/scenes`, `NarrativeHooks.onServe/onChat/onArcBeat` | `audio/howl`, `render/images`, `render/tween`, `render/fx`, `render/scene`, `ui/scene`, `save/store` |
| `KettleController` | Kettle panel state, stock gate, ingredient consumption, last-brew memory, brew submission | `sim/brewing` (resolveBrew), `sim/shelf` (stock), `sim/upgrades` (brewAnimSec, coffee base), `NarrativeHooks.onExperimentalBrew` | `ui/kettle`, `ui/cafe-dom`, `data/strings`, `data/recipes` |
| `ProgressionController` | Economy runtime, hearts ledger, inventory, upgrades, shelf capacity, save snapshots, export | `sim/economy`, `sim/hearts`, `sim/upgrades`, `sim/day`, `sim/shelf`, `NarrativeHooks.onUpgrade/onRecipeDiscovery` | `audio/howl`, `save/store`, `save/crypto`, `save/validate` |

### 3.5 Narrative Module Responsibilities

| Module | Responsibility | Imports (narrative-internal) |
|--------|---------------|------------------------------|
| `narrative-input.ts` | **ONLY** SaveData → `NarrativeInput` adapter; also `createLetterContext` | `activity-ledger` (types only) |
| `narrative-signals.ts` | Pure: `NarrativeInput` → measurable signals | `narrative-input` (types) |
| `narrative-evaluator.ts` | Pure: signals → 5 dimensions + trajectory (`NarrativeState`) | `narrative-signals` (types) |
| `narrative-state.ts` | Thin facade combining signals + evaluator | `narrative-signals`, `narrative-evaluator` |
| `story-definitions.ts` | PURE CONTENT: letters, chapters, endings, trajectories | `narrative-state` (types only) |
| `narrative-scheduler.ts` | Chapter advancement, beat triggering, convergence (pure) | `narrative-state`, `story-definitions` (types) |
| `story-progress.ts` | Typed `StoryProgress` model + `createStoryProgressFromSave` adapter | (types only) |
| `letter-scheduler.ts` | Letter selection, priority, caps — **pure, consumes `LetterContext`** | `narrative-state`, `story-definitions` (types) |
| `ending-evaluator.ts` | Pure: `NarrativeState` + progress → `EndingId` (deterministic) | `narrative-state`, `story-definitions`, `story-progress` (types) |
| `activity-ledger.ts` + `activity-events.ts` | Records real gameplay events (counters only; no narrative rules) | — |

**Single SaveData boundary:** only `narrative-input.ts` (and `story-progress.ts`) may read `SaveData`. No other narrative module imports `save/validate` or `sim/*`. All evaluation functions are pure (identical input → identical output).

### 3.6 Assets pipeline

- Atlas: pack PNGs with free-tex-packer into one sheet + JSON frames. Target ≤ 6 MB total art (manifest in `assets/ASSETS.md` tracks actuals).
- Audio: OGG Vorbis, music ~q4–5 (≈1–1.5 MB/track), SFX mono. Preload only the door-chime + click sounds; stream music after first user gesture (also satisfies autoplay policy).
- Critical path to interactive title screen: **≤ 500 KB compressed** (HTML+JS+CSS+title art+font subsets). Everything else lazy-loads behind it.
- Fonts: subsetting via `pyftsubset` (fonttools) — latin-basic WOFF2, ~15–25 KB per face. Two faces max (doc 04 §1.6).
- All art loads at bootstrap (`preloadAllArt` in `render/images.ts`) so no in-game frame waits on disk.

## 4. Guardrails (enforced in CI, not aspirational)

| Budget | Limit | Enforced by |
|--------|-------|-------------|
| Initial JS+CSS (gzip) | ≤ 100 KB | `size-limit` fails the build |
| Critical path to title | ≤ 500 KB | same, per-asset globs |
| itch zip total | ≤ 15 MB (target; 20 MB hard per doc 01) | CI artifact size check |
| Sim tick | 30 Hz ± jitter logged in dev mode | dev overlay |
| Live particles | ≤ 40 | pooled allocator refuses more |
| Long tasks > 50 ms | 0 during service | Playwright trace assert |

Checks run in GitHub Actions: typecheck → vitest → biome → build → size-limit → Playwright smoke (boots the build, serves first correct drink < 90 s per doc 06) → butler push to itch on tagged releases.

## 5. Testing

- **Vitest:** all of `sim/` (brew matching, economy, patience, hearts, shelf, upgrades) + `narrative/` (dimension computation, eligibility, letter scheduling, ending evaluation) + save round-trip/tamper gates from doc 06 §M1 run as plain unit tests — the crypto module is pure WebCrypto, mockable with a tiny inline polyfill for Node 20+ (globalThis.crypto exists).
- **Integration/smoke:** `tests/m2_smoke.test.ts` exercises full day cycles via debug hooks on the `GameController`.
- **Content/migration:** `tests/m2_migration.test.ts` validates v1→v4 migration, export/import round-trips, tamper refusal.
- **Narrative tests:** `tests/narrative/` (new) — dimension computation, letter eligibility, trajectory branching, ending evaluation, replay determinism.
- **Playwright:** cross-browser import/export (Chromium/Firefox/WebKit), tutorial 90-second gate, reduced-motion audit.

## 6. Risks

| Risk | Mitigation |
|------|-----------|
| Hand-rolled tween/scaling bugs | Both utilities stay <200 LOC, 100% unit-tested; behavior pinned by screenshot tests |
| Canvas text temptation creep | Lint rule: no `ctx.fillText` outside debug builds — UI text belongs to DOM |
| Scope pull toward "engine features" (shaders, camera moves) | If genuinely needed, adopt PixiJS v8 behind the `render/draw.ts` interface (§7) — not before |
| Safari quirks (pixelated, WebAudio unlock) | Playwright WebKit in CI from M0; gesture-gated audio per doc 05 |
| **Narrative content volume** | Phase implementation (M5a mandatory, M5b optional); size-limit guards total JS |
| **Dimension weight tuning** | Expose as constants in `narrative-state.ts`; validate with playtest telemetry |

## 7. Escape Hatch

`draw.ts` exposes exactly six primitives (`blit`, `blitAtlasFrame`, `rect`, `particle`, `begin/endFrame`). If the visual scope ever outgrows Canvas2D (parallax layers, blend modes, thousands of sprites), PixiJS v8 slots in behind that interface in a day without touching game code. The architecture makes the engine decision reversible; the payload discipline keeps it unnecessary.

## 8. Changelog

| Date | Change |
|------|--------|
| 2026-08-25 | Initial stack decided: engine-less TS/Vite/Canvas2D + DOM UI + Howler; resolves README open question |
| 2026-08-25 | **Amendment (M0 review):** minifier is Vite's built-in esbuild, not terser — the dependency-free constraint in the M0 brief wins over the table above; at ~13–26 KB bundle size terser's few-percent edge is irrelevant. Table row "Vite + terser" should read "Vite + esbuild". |
| 2026-08-27 | **Orchestration refactor:** extracted `src/ui/game.ts` (~1100 LOC) into five controller modules under `src/controllers/` — `game-controller.ts` (composition root), `day-controller.ts`, `service-controller.ts`, `kettle-controller.ts`, `progression-controller.ts`. `ui/game.ts` retained as thin compatibility layer. Pure sim boundary enforced; zero behavior change; all 241 tests + typecheck + build pass. Updated stale doc statements (R008 status, Fenwick favorite, kettle auto-open, module map, dirty-flag claim, milestone table). |
| 2026-08-27 | **Architecture documentation audit:** docs/08-tech-stack.md rewritten to match actual codebase. Corrected controller dependency model (controllers DO import presentation/infra modules), removed stale dirty-flag rendering claim, completed module map, documented real dependency direction, documented save architecture accurately. |
| 2026-08-27 | **Narrative module architecture added:** `src/narrative/` (6 modules), updated dependency direction, controller responsibility matrix, module map. Pure narrative boundary enforced (imports sim/ + save/validate only). |
| 2026-09-02 | **Backdrop variant system:** `sim/day.ts` `roomVariantFor` (pure, unit-tested) → `render/draw.ts` crossfade via `setRoomVariantProvider` (module-closure provider set by `game-controller`, same pattern as `setCafeDomPhaseProvider`). `render/images.ts` `cafeRoom(variant)` loads `assets/backgrounds/cafe_room_${variant}.png`. **Walk-cycle animation:** `characterWalkAnim(id)` + `numberedWalkFrames` in `images.ts`, pure `walkFrameIndex(frameCount, timeMs, mode)` in `scene.ts`. Save schema **v7** (`letters_delivered_day`). Two bug fixes: recap per-day tallies now reset (`beginDayResets` → `ServiceController.beginDay`); Journal Recipes tab loops all of `RECIPES` (discovered-or-hinted rule) instead of only `HINTED_RECIPES`. 482 tests + typecheck + build pass. |