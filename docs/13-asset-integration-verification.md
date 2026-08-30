# Asset Integration Verification

Repository: MGTechLabs2026/cosy-cafe
Commit: d0edbc3
Date: 2026-08-30
Build command: npm run build

## Summary

Total assets audited: 37 source assets under `assets/`

| Status | Count | Notes |
|--------|-------|-------|
| Integrated | 31 | referenced by runtime, present in `dist/`, verified by subpath script |
| Generated / not yet integrated | 3 | `menu_board.png`, `steam_wisp.png`, `recipe_notebook.png` |
| Missing from build | 0 | none |
| Broken reference | 0 | none |
| Placeholder-backed | 0 | none for current runtime set |

## Recently Generated Assets

| Asset | Runtime reference | Build | Chrome | Status |
|-------|------------------|-------|--------|--------|
| `items/drink_cloud_foam.png` | `brewing.ts` R005 icon + `loadDrinkIcon` | ✅ present | ✅ served | PASS |
| `items/drink_honey_milk_wren.png` | `brewing.ts` R008 icon + `loadDrinkIcon` | ✅ present | ✅ served | PASS |
| `fx/steam_wisp.png` | not referenced by runtime | ✅ present | ✅ served | GENERATED / NOT YET INTEGRATED |
| `furniture/menu_board.png` | not referenced by runtime | ✅ present | ✅ served | GENERATED / NOT YET INTEGRATED |
| `props/recipe_notebook.png` | not referenced by runtime | ✅ present | ✅ served | GENERATED / NOT YET INTEGRATED |

## Mops

All six states are wired and mapped:

- `idle` → `assets/pets/mops_idle.png`
- `sit` → `assets/pets/mops_sit.png`
- `sleep` → `assets/pets/mops_sleep.png`
- `stretch` → `assets/pets/mops_stretch.png`
- `walk` → `assets/pets/mops_walk.png`
- `look` → `assets/pets/mops_look.png`

State selection uses `mopsSpriteFor(stateName)` in `render/scene.ts`. Default branch falls back to `idle` for unknown states; no silent fallback to the old static sprite was found.

## Drink Assets

### R005 — Cloud Foam

- Defined in `src/sim/brewing.ts` with `icon: 'drink_cloud_foam.png'`
- Icon loader path: `assets/items/drink_cloud_foam.png`
- Present in `dist/assets/items/drink_cloud_foam.png`
- Subpath verification: no missing asset warnings

### R008 — Wren's Usual

- Defined in `src/sim/brewing.ts` with `icon: 'drink_honey_milk_wren.png'`
- Icon loader path: `assets/items/drink_honey_milk_wren.png`
- Present in `dist/assets/items/drink_honey_milk_wren.png`
- Subpath verification: no missing asset warnings

## Ambient Assets

### steam_wisp.png

- File exists in `assets/fx/`, `public/assets/fx/`, and `dist/assets/fx/`.
- Not referenced by runtime code.
- Existing steam FX in `render/fx.ts` is procedural soft circles, not sprite-based.
- Classification: GENERATED / NOT YET INTEGRATED

### menu_board.png

- File exists in `assets/furniture/`, `public/assets/furniture/`, and `dist/assets/furniture/`.
- Not referenced by runtime code.
- Classification: GENERATED / NOT YET INTEGRATED

### recipe_notebook.png

- File exists in `assets/props/`, `public/assets/props/`, and `dist/assets/props/`.
- Not referenced by runtime code.
- Classification: GENERATED / NOT YET INTEGRATED

## Path Audit

- Runtime paths are constructed via `assetUrl()` with `import.meta.env.BASE_URL`.
- Vite config uses `base: './'`.
- `scripts/verify_dist_paths.mjs` passed with 0 missing non-optional assets and 0 absolute-path violations.
- No root-relative `/assets/...` paths found in bundle.

## Case Sensitivity Audit

- All referenced filenames match filesystem names exactly.
- No capitalisation, hyphen/underscore, or directory-case mismatches found for current runtime assets.

## Placeholder Audit

- `drink_cloud_foam.png` and `drink_honey_milk_wren.png` were previously placeholder-backed; both now have real assets and real runtime references.
- No remaining placeholder fallback is required for the current runtime asset set.

## Production Build

- Typecheck: PASS
- Tests: PASS (459 tests)
- Build: PASS
- Dist asset count: 35 PNG/audio files plus `index.html`, `styles/main.css`, and bundle JS

## Chrome

- Fresh load from `dist/`: title screen loads as `🐴 Moonleaf Café`
- No asset 404s observed in verification script output
- Subpath simulation: PASS

## Remaining Issues

- `menu_board.png`, `steam_wisp.png`, and `recipe_notebook.png` are authored and included in build, but not yet wired into gameplay/render code.

## Recommendation

Current runtime asset set is READY WITH MINOR FIXES.

All currently referenced MVP assets are integrated and build-verified. The three new ambient/prop assets are present but unused; they do not block the current build.
