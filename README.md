# Moonleaf Café

*Serve warm cups to cold travelers.*

A cozy café-management game for the browser, built for itch.io. No engine, no fail state — just a kettle, a hearth, a cat, and tomorrow's opening.

## Tech Stack

Engine-less TypeScript with a hand-rolled Canvas2D renderer, DOM text/UI, and Howler for audio (see `docs/08-tech-stack.md`). Priorities: performance and bundle size — total JS well under 100 KB gzip.

| Layer      | Choice                    |
|------------|---------------------------|
| Language   | TypeScript (strict)       |
| Build      | Vite                      |
| Renderer   | Vanilla Canvas2D          |
| Text/UI    | DOM (HTML/CSS)            |
| Audio      | Howler                    |
| Tests      | Vitest                    |

## Getting Started

Requires Node.js (>= 18).

```bash
npm install
npm run dev        # dev server on http://localhost:5173
```

## Scripts

| Command             | What it does                                  |
|---------------------|-----------------------------------------------|
| `npm run dev`       | Vite dev server (port 5173, strict)           |
| `npm run build`     | Typecheck (`tsc --noEmit`) + production build to `dist/` |
| `npm run preview`   | Serve the production build locally            |
| `npm test`          | Run the Vitest suite (241 tests)              |
| `npm run typecheck` | TypeScript only                               |

## itch.io Release

```bash
bash scripts/package_itch.sh
```

Builds `dist/`, verifies all runtime paths are relative (`scripts/verify_dist_paths.mjs`), then assembles `dist-itch/moonleaf-cafe/` and zips it as `moonleaf-cafe-html5.zip` — ready to upload as the itch HTML5 build (zip root holds `index.html`; itch serves it from an iframe subpath, which is why Vite's `base` is `'./'`).

## Project Structure

```
src/
  audio/     Howler wrappers (SFX + streaming music with crossfade)
  controllers/  Orchestration layer (game, day, service, kettle, progression)
  data/      Game data (recipes, strings, scenes, economy tables)
  render/    Canvas2D renderer (draw, scale, scene, images, fx, palette, tween)
  save/      Save model + AES-GCM export/import (MLC1 wire format)
  sim/       Simulation: day cycle, brewing, customers, economy, hearts, upgrades, shelf
  ui/        DOM screens, HUD, flows (cafe-dom, game, hud, journal, kettle, shop, recap, scene, settings, title, letter, textsize)
docs/        Design docs 01–08 (read 01-gdd-core.md first)
scripts/     itch.io packaging + dist verification
tests/       Vitest suites per system + milestone gates
```

## Design Docs

Full game design lives in [`docs/`](docs/README.md):

- [01 · Core GDD](docs/01-gdd-core.md) — high concept, pillars, core loop
- [02 · Systems Design](docs/02-systems-design.md) — day cycle, brewing, economy, saves
- [03 · World & Characters](docs/03-world-characters.md) — setting, tone, cast with arcs
- [04 · Art & Audio Direction](docs/04-art-audio-direction.md) — pixel spec, palette, music/SFX
- [05 · UI & UX](docs/05-ui-ux.md) — screens, HUD, flows, tutorial, accessibility
- [06 · MVP Scope & Roadmap](docs/06-mvp-scope-roadmap.md) — what ships first
- [07 · itch.io Release Plan](docs/07-itchio-release-plan.md) — launch checklist
- [08 · Tech Stack & Architecture](docs/08-tech-stack.md) — why no engine, module map, guardrails

Pillars win arguments: if a feature fights a pillar, the feature changes or dies.

## Architecture Overview (from doc 08)

**Dependency direction (actual imports):**

```
sim/                      ← pure TypeScript, zero platform imports
  ↑
controllers/              ← orchestration ONLY: imports sim/ + data/ + presentation/infra
  ↑
ui/        render/        ← presentation layer (DOM + Canvas)
audio/      save/
  ↑
main.ts                   ← bootstrap, ties everything together
```

**Controller responsibilities:**

| Controller | Role |
|------------|------|
| `GameController` | Composition root, app lifecycle, shared state refs, render loop, debug hooks |
| `DayController` | Morning banner, door open, evening close/recap, next-day transition |
| `ServiceController` | Active customer session: spawn, patience, chat, serve, teach beats, arc scenes |
| `KettleController` | Kettle panel state, stock gate, ingredient consumption, brew submission |
| `ProgressionController` | Economy runtime, hearts ledger, inventory, upgrades, shelf capacity, save snapshots |

**Key architectural decisions:**
- Canvas owns the 480×270 game world; DOM owns ALL text/UI
- Fixed 30 Hz simulation + render every rAF (no dirty-flag rendering)
- Integer-only CSS transform scaling for crisp pixels
- `sim/` modules are pure — unit-testable without a browser
- Controllers orchestrate; gameplay rules live in `sim/`
- Save encryption (AES-GCM) only for export codes; localStorage is plaintext by design