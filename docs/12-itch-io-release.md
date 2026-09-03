# 12 · itch.io HTML5 Release — Cosy Café (Moonleaf Cozy Café)

> Packaging-only release. No gameplay, recipe, economy, hearts, stars, narrative,
> ending, progression, save-schema, or café-mechanic changes were made. The goal
> was to make the CURRENT MVP shippable as a clean itch.io HTML5 upload.

## Release

- **Name:** Cosy Café — Free Playable MVP
- **Version:** 0.0.1 (package.json) · 2026-08-29
- **Build:** `2006fd3d50d86c44346329dbd7f42f51bae68e64`

## Upload

- **File:** `cosy-cafe-mvp-itch.zip`
- **Game type:** HTML5
- **Structure:** `index.html` at zip root, with `assets/`, `audio/`, `styles/`
  beside it. Open the zip and the game is at the top level — no subfolder to move.

## How it was built

1. `npm run build` (runs `tsc --noEmit` then `vite build`) → `dist/`.
2. `node scripts/verify_dist_paths.mjs` — asserts every runtime path is relative
   and every referenced asset exists in `dist/`.
3. `releases/cosy-cafe-mvp-itch/` is populated from `dist/` (index.html at root).
4. `cosy-cafe-mvp-itch.zip` is zipped from inside that directory.

Vite `base` is `'./'` and every runtime asset/audio/font path is resolved via
`import.meta.env.BASE_URL`, so the build works when itch.io serves it from an
iframe under a project subpath.

## Packaging fixes applied (this task)

- `src/data/recipes.ts`: the recipe view emitted an absolute `/assets/items/<file>`
  path. `loadDrinkIcon()` already prefixes the deploy-base-aware `assets/items/`
  path, so the icon was double-prefixed and 404'd under any non-root base — breaking
  the order-bubble drink picture in the itch.io iframe. Now the view returns the bare
  filename and `loadDrinkIcon()` resolves it. This also unblocks `verify_dist_paths.mjs`
  (which fails on absolute `/assets/`/`/audio/` literals).
- `public/assets/portraits/fenwick.png` and the five `public/assets/pets/mops_*.png`
  states (idle/sleep/stretch/walk/look) were authored in `assets/` but not in the
  shipped `public/` tree. Copied them into `public/` so the release build ships the
  Fenwick portrait and all six Mops states the code references. (No new art was
  generated; these are the existing authored files.)
- `scripts/package_itch.sh`: corrected to zip `index.html` at the archive root
  (the previous version nested the build under a `moonleaf-cafe/` subfolder, which
  would have required the uploader to move files).
- `.gitignore`: added `releases/` and `cosy-cafe-mvp-itch.zip` so release artifacts
  are not committed.

## Tested (real Chrome, production build served as a static ZIP extraction)

| Check | Result |
|-------|--------|
| Chrome (headless Chromium, real game code) | PASS |
| Fresh load (title → New Game → tutorial letter) | PASS |
| Save / load (localStorage autosave) | PASS |
| Refresh / continue | PASS |
| Audio (gesture-gated SFX + loops load; no console errors) | PASS |
| Responsive (1280×720, 1512×676, 1440×900, 1920×1080, 800×900) | PASS — no horizontal/vertical page scroll |
| Reduced motion | PASS — media query honored |
| Narrative (mailbox opens; mandatory Marigold beats deliver on Days 1 / 7 / 11; arc letters deliver) | PASS |
| Day-14 ending (ending overlay "Your Two Weeks" presents; resolves; returns to title) | PASS |
| No release-caused console errors | PASS (at release: 2 expected drink-icon 404s — resolved 2026-09-03, see Known limitations) |
| No release-caused 404s other than pending art | PASS (pending art since authored — see Known limitations) |
| Fonts | PASS — system stack (`system-ui` / `Georgia`); no custom font files to load |
| Images | PASS — all referenced sprites/backgrounds ship |
| Security | PASS — no API keys / secrets / env vars in the build |

Typecheck: PASS. Tests: PASS (459 tests across 31 files). Production build: PASS
(JS ~234 kB / ~67.5 kB gzip; well under the 100 kB gzip budget).

## Known limitations

- **~~Two drink icons are not yet authored~~ — RESOLVED 2026-09-03.** At release,
  `drink_cloud_foam.png` (R005 "Cloud Foam") and `drink_honey_milk_wren.png` (R008
  "Wren's Usual") were missing and the order bubble fell back to a calm placeholder
  icon (the only two 404s in the network log). Both icons were authored and wired in
  commit `cc419c5` ("swap in redrawn R001-R008 drink icons"); the full R001-R008 icon
  set was redrawn in the same pass. No placeholder fallback is active for any current
  runtime drink icon — see `13-asset-integration-verification.md`.
- **`community` and `wanderer` endings are not reachable** through legitimate play
  under the frozen ending definitions (a content-design constraint, out of scope for
  packaging). `keeper` and `builder` endings are reachable; a calm/low-engagement run
  receives the valid `keeper` fallback (P1 Calm satisfied).
- **Ambient art is intentionally minimal** (single room background, one FX sprite,
  three furniture pieces). These are optional-ambience gaps, not defects; the
  procedural FX/particle system already covers steam, sparkle, heart puffs, snow, and
  candle flicker.
- **Audio palette is small** (3 SFX + 3 short music loops). The record-player upgrade
  gates music; without it the build is silent by design (pre-purchase behavior preserved).

## What was NOT changed

Recipes, economy, hearts, stars, narrative rules, ending evaluation, progression,
save schema, café mechanics, and all source under `src/` beyond the `recipes.ts` path
fix and the `mops`/`fenwick` asset copies into `public/`. No features were added or
redesigned.
