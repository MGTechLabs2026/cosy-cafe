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
| `npm test`          | Run the Vitest suite                          |
| `npm run typecheck` | TypeScript only                               |

## itch.io Release

```bash
bash scripts/package_itch.sh
```

Builds `dist/`, verifies all runtime paths are relative (`scripts/verify_dist_paths.mjs`), then assembles `dist-itch/moonleaf-cafe/` and zips it as `moonleaf-cafe-html5.zip` — ready to upload as the itch HTML5 build (zip root holds `index.html`; itch serves it from an iframe subpath, which is why Vite's `base` is `'./'`).

## Project Structure

```
src/
  audio/     Howler wrappers
  data/      Game data (recipes, strings, economy tables)
  render/    Canvas2D renderer
  save/      Save model + AES-GCM export/import (MLC1 wire format)
  sim/       Simulation: day cycle, brewing, customers, economy
  ui/        DOM screens, HUD, flows
docs/        Design docs 01–08 (read 01-gdd-core.md first)
scripts/     itch.io packaging + dist verification
tests/       Vitest suites per system + milestone gates
```

## Design Docs

Full game design lives in [`docs/`](docs/README.md):

- [01 · Core GDD](docs/01-gdd-core.md) — high concept, pillars, core loop
- [02 · Systems Design](docs/02-systems-design.md) — day cycle, brewing, economy, saves
- [06 · MVP Scope & Roadmap](docs/06-mvp-scope-roadmap.md) — what ships first
- [07 · itch.io Release Plan](docs/07-itchio-release-plan.md) — launch checklist
- [08 · Tech Stack & Architecture](docs/08-tech-stack.md) — why no engine

Pillars win arguments: if a feature fights a pillar, the feature changes or dies.
