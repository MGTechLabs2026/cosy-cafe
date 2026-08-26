# 08 · Moonleaf Café — Tech Stack & Architecture

> Doc 08 of 08 · Status: Draft v0.1 · 2026-08-25 · Resolves the OPEN engine decision from README
> Stated priorities: **performance and size.** Everything else (dev speed, familiarity) is a tiebreaker, not a goal.

## 1. The Decision

**No game engine. TypeScript + Vite + a hand-rolled Canvas2D renderer, DOM for all text/UI, Howler for audio.**

```
Layer          Choice                          Runtime cost (approx, gzip)
─────────────────────────────────────────────  ───────────────────────────
Language       TypeScript (strict)             0 (compile-time)
Build          Vite + terser                   0 (dev-time)
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
| Performance | DOM text updates touch a handful of nodes; the canvas never re-renders glyphs. Modals are display:none until opened — zero cost when closed. |
| Accessibility | Real text nodes = screen readers, selection, zoom, IME work natively. Doc 05 §6 requirements get satisfied by construction instead of by heroics. |

### 3.2 Rendering loop

- Fixed-timestep simulation at **30 Hz** (patience drains, arrivals, brew timers) + render on every `requestAnimationFrame`. Deterministic sim makes tests and future replays trivial.
- Backbuffer canvas locked at 480×270, composited via CSS `transform: scale(k)` where k is the largest **integer** ≤ available scale (DPR-aware). `image-rendering: pixelated`. Integer-only scaling honors doc 04 §1.2 and avoids shimmer.
- Dirty-flag rendering: the room re-draws each frame only while anything animates (steam, characters, FX); during a fully idle morning screen the loop can idle at 1 Hz. Battery-friendly, and cozy games are mostly still.
- Particles: preallocated pool, hard cap 40 live. Steam = recycled sprites, not objects.

### 3.3 Modules (first cut)

```
src/
  main.ts            bootstrap, loop, scaling
  render/            draw.ts (room/sprite compositor), fx.ts (pooled particles), palette.ts
  sim/               day.ts, brewing.ts, customers.ts, economy.ts   ← pure logic, no DOM/canvas imports
  ui/                hud.ts, dialogue.ts, journal.ts, kettle.ts, shop.ts, recap.ts, saveio.ts
  data/              recipes.ts, cast.ts, strings.json              ← content lives here, writers edit JSON
  save/              store.ts (localStorage), crypto.ts (doc 02 §7.2), validate.ts
  audio/             howl.ts (thin wrapper, gesture-gated unlock)
```

Rule: `sim/` is pure TypeScript with zero platform imports — every gameplay rule from doc 02 is unit-testable without a browser.

### 3.4 Assets pipeline

- Atlas: pack PNGs with free-tex-packer into one sheet + JSON frames. Target ≤ 6 MB total art (manifest in `assets/ASSETS.md` tracks actuals).
- Audio: OGG Vorbis, music ~q4–5 (≈1–1.5 MB/track), SFX mono. Preload only the door-chime + click sounds; stream music after first user gesture (also satisfies autoplay policy).
- Critical path to interactive title screen: **≤ 500 KB compressed** (HTML+JS+CSS+title art+font subsets). Everything else lazy-loads behind it.
- Fonts: subsetting via `pyftsubset` (fonttools) — latin-basic WOFF2, ~15–25 KB per face. Two faces max (doc 04 §1.6).

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

- **Vitest:** all of `sim/` (brew matching, economy, patience) + save round-trip/tamper gates from doc 06 §M1 run as plain unit tests — the crypto module is pure WebCrypto, mockable with a tiny inline polyfill for Node 20+ (globalThis.crypto exists).
- **Playwright:** cross-browser import/export (Chromium/Firefox/WebKit), tutorial 90-second gate, reduced-motion audit.

## 6. Risks

| Risk | Mitigation |
|------|-----------|
| Hand-rolled tween/scaling bugs | Both utilities stay <200 LOC, 100% unit-tested; behavior pinned by screenshot tests |
| Canvas text temptation creep | Lint rule: no `ctx.fillText` outside debug builds — UI text belongs to DOM |
| Scope pull toward "engine features" (shaders, camera moves) | If genuinely needed, adopt PixiJS v8 behind the `render/draw.ts` interface (§7) — not before |
| Safari quirks (pixelated, WebAudio unlock) | Playwright WebKit in CI from M0; gesture-gated audio per doc 05 |

## 7. Escape Hatch

`draw.ts` exposes exactly six primitives (`blit`, `blitAtlasFrame`, `rect`, `particle`, `begin/endFrame`). If the visual scope ever outgrows Canvas2D (parallax layers, blend modes, thousands of sprites), PixiJS v8 slots in behind that interface in a day without touching game code. The architecture makes the engine decision reversible; the payload discipline keeps it unnecessary.

## 8. Changelog

| Date | Change |
|------|--------|
| 2026-08-25 | Initial stack decided: engine-less TS/Vite/Canvas2D + DOM UI + Howler; resolves README open question |
| 2026-08-25 | **Amendment (M0 review):** minifier is Vite's built-in esbuild, not terser — the dependency-free constraint in the M0 brief wins over the table above; at ~13–26 KB bundle size terser's few-percent edge is irrelevant. Table row "Vite + terser" should read "Vite + esbuild". |
