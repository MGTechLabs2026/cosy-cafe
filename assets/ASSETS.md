# Moonleaf Café — Asset Manifest

Generated with PixelLab MCP (`create_image_pixen`, 1 generation each). All PNGs are RGBA with true transparent backgrounds. Native sizes as listed; scale with integer factors + `image-rendering: pixelated` only.

## Portraits — 48×48 (`assets/portraits/`)

| File | Character | Job ID (regen reference) | QA |
|------|-----------|--------------------------|-----|
| fenwick.png | Fenwick Mossbeard | 58702959-d59b-45e8-a432-611d28063928 | ✅ pass |
| sela.png | Sela of Vessany | ecaa234d-ad70-4b8d-ab43-435b93f8c909 | ✅ pass (moth earring reads as generic silver dangle at this size) |
| bram.png | Bram Holt | d4f49cc2-9c0a-43eb-a35c-3cd98e0faef7 | ✅ pass (no soot smudge / scorch detail; apron value close to bg — polish item) |
| nia.png | Nia Quicksprocket | d6c70383-97c3-42ec-99a2-06f8d8fc3588 | ✅ pass |
| wren.png | Old Wren | 34d6e57f-f83b-4322-af5e-bfa13eb20714 | ✅ pass — **NOTE: rendered with full white beard + red nose (jolly grandfather read). Doc 03 doesn't specify Wren's gender; user to confirm or regen** |

## Item Icons — 32×32 (`assets/items/`)

| File | Recipe ID | Drink | Job ID | QA |
|------|-----------|-------|--------|-----|
| drink_black_tea.png | R001 | Black Tea | 9a28c02f-4791-4c60-aaf1-a392c8db9c2a | ✅ pass (has kawaii face — see consistency note) |
| drink_honey_milk.png | R002 | Honey Milk | 3f3c6244-c100-4fac-b295-e23a63da45b5 | ✅ pass |
| drink_moonleaf_tea.png | R003 | Moonleaf Tea | 3735e5e4-f410-4c11-b96c-2d79d8515d5b | ✅ pass |
| drink_ember_cocoa.png | R004 | Ember Cocoa | 6a8f2722-21fe-4858-ba81-22d4260b6d60 | ✅ pass |
| drink_iced_berry_tisane.png | R006 | Iced Berry Tisane | a72eb8ff-e2e4-41f3-b221-f24d1bb64bee | ✅ pass |
| drink_root_remedy_broth.png | R007 | Root & Remedy Broth | c5f64b41-70cd-4f3a-bf9b-205e86a80ffb | ✅ pass |

## Pets — `assets/pets/`

| File | State | Job ID | QA |
|------|-------|--------|-----|
| mops_sit.png (24×24) | sit/sleep base | 0ea2d55a-e179-4e25-a251-d8bc9be2d326 | ✅ pass (v1 at 16×16 failed spec — no visible tail, owl-like; v2 regenerated at 24×24) |
| mops_idle.png (24×24) | idle, alert awake eyes | 21ce2420-01dd-4c1e-a39c-3a4caa4c04ac | ✅ pass |
| mops_sleep.png (24×24) | curled asleep, tail clearly visible | 77ea72a8-c880-4fc2-8148-2d22627af4e6 | ✅ pass |
| mops_stretch.png (24×24) | stretch, legs extended, tail behind | 8fe93c7b-efd9-4b97-8448-85c2af776433 | ✅ pass |
| mops_walk.png (24×24) | walk, one paw lifted, tail raised | e4769c27-08d3-4a6f-b852-fbad1a2d401d | ✅ pass |
| mops_look.png (24×24) | look away, head turned, tail to side | ff2892df-d80b-414f-af32-cc26a0a8cbb9 | ✅ pass |

## Counter Sprites — 32×48 (`assets/sprites/`)

Deviation from doc 04 §1.4 (24×36): PixelLab forces square canvases below 32px, so 24×36 is impossible natively; generated at the nearest legal size instead. All face east; flip horizontally in-engine for westward walking. Game code draws its own soft shadows — do not rely on baked ones.

| File | Job ID | QA |
|------|--------|-----|
| fenwick_walk.png | ab2352c5-cc35-4b76-8d62-2f5b3f4d0c1b | ✅ pass (torso busy w/ backpack+beard overlap — polish item) |
| sela_walk.png | dcfb338e-2fb8-4e09-8633-3489a64c43bd | ✅ pass (best of set) |
| bram_walk.png | 633da35b-6327-402f-913d-646975098b95 | ✅ pass (arm pose slightly ambiguous) |
| nia_walk.png | 93030bf2-ad34-4fb4-846c-0ecb0a5984c5 | ✅ pass — black bar under feet kept per user decision (a); game draws unified soft shadows over it |
| wren_walk.png | 10641833-d5ac-4f8f-8ce6-ad4129171142 | ✅ pass (facial shading reads slightly bearded, consistent with portrait) |

## Batch 5 — 2026-08-26 (walk frame B, furniture, FX)

| File | Size | Job ID | QA |
|------|------|--------|-----|
| sprites/fenwick_walk_b.png (32×48) | walk frame B — mid-stride | cf2396f9-8fe2-40c8-bc3c-bc9087897f5e | ✅ pass, clear stride pose distinct from frame A. **Enables 2-frame gait animation for the walk-animation fix** |
| furniture/window_bench.png (32×32) | window bench upgrade | e0e2e618-ae58-4cf5-ae09-471374640448 | ✅ pass (plaid faint / pillow merged — acceptable) |
| furniture/record_player.png (32×32) | record player upgrade | 9a83d9b5-c890-4cf0-bd57-83674d254d13 | ✅ pass (best object clarity of batch) |
| fx/heart_puff.png (16×16) | heart-gain feedback sprite | 03f23934-7cb3-4810-a84b-7630ab58723d | ✅ pass |
| furniture/coffee_machine_v2_unverified.png (32×32) | coffee machine upgrade, 2nd attempt | 3de2111a-8436-40ca-b36a-8a76d4886290 | ⚠️ v1 failed QA (dark plum body, no spouts); v2 regenerated with explicit copper+spouts prompt but **visual QA pending — vision model saturated at generation time** |

All: binary alpha (no soft edges), transparent corners verified programmatically.

## Consistency Notes

1. **Black Tea has a tiny face; other drinks don't.** Either embrace it (all drinks get faces — fits the cozy tone) or regenerate R001 faceless. Decide before adding more drink icons.
2. **Style drift risk:** all assets were generated with the same params (pixen, selective outline, low/medium detail, no background). For future assets, reuse these exact params and consider passing an existing asset via `style_image` once a "hero" style is chosen.
3. Palette is warm/cohesive but not audited against the 32-color master palette in doc 04 §1.3. Run `reduce_colors` (PixelLab) across all assets if strict palette lock is wanted.

## Still Missing for MVP (doc 04 §1.4)

- [ ] Café room background 480×270 (+ seasonal variants) — base room DONE: `backgrounds/cafe_room.png` 480×270, 77 KB · job b590bfaa-d218-475f-8322-3db69501bc26 (generated 480×272, cropped bottom 2 rows) · ✅ QA pass all 9 elements. Variants post-MVP
- [x] Character counter sprites ×5 (Fenwick/Sela/Bram/Nia/Wren) at 32×48 — `sprites/*_walk.png`; see size deviation note in Counter Sprites section. Travelers + walk ANIMATION frames still open
- [ ] Mops animation states (sleep, stretch, sniff, petted)
- [ ] Upgrade furniture sprites ×6
- [ ] Props (~15: cups, kettle, jars, notice board…)
- [ ] FX (steam loop, sparkle, coin puff, heart puff)
- [ ] UI skin (9-patch panels, buttons, ~20 icons)
- [ ] Fonts (doc 04 §1.6 recommends existing fonts, not generated)

## Budget Log

40-generation trial balance. Used: 13 (12 successful + 1 job that vanished server-side, id e73b6a52-7654-4b8f-8a72-d0d3d9b6c1f4, never registered). Remaining after this batch: **27**.
