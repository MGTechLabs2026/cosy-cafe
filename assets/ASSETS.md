# Moonleaf Cozy Café — Asset Manifest

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
| sela_walk.png | dcfb338e-2fb8-4e09-8633-3489a64c43bd | ⚠️ superseded — see Batch 7. Original PixelLab job/QA kept here for history. |
| bram_walk.png | 633da35b-6327-402f-913d-646975098b95 | ✅ pass (arm pose slightly ambiguous) |
| nia_walk.png | 93030bf2-ad34-4fb4-846c-0ecb0a5984c5 | ✅ pass — black bar under feet kept per user decision (a); game draws unified soft shadows over it |
| wren_walk.png | 10641833-d5ac-4f8f-8ce6-ad4129171142 | ✅ pass (facial shading reads slightly bearded, consistent with portrait) |

## Batch 5 — 2026-08-26 (walk frame B, furniture, FX)

| File | Size | Job ID | QA |
|------|------|--------|-----|
| sprites/fenwick_walk_b.png (32×48) | walk frame B — mid-stride | cf2396f9-8fe2-40c8-bc3c-bc9087897f5e | ⚠️ **deleted in Batch 8** — superseded by the 8-frame Fenwick walk cycle. |
| furniture/window_bench.png (32×32) | window bench upgrade | e0e2e618-ae58-4cf5-ae09-471374640448 | ✅ pass (plaid faint / pillow merged — acceptable) |
| furniture/record_player.png (32×32) | record player upgrade | 9a83d9b5-c890-4cf0-bd57-83674d254d13 | ✅ pass (best object clarity of batch) |
| fx/heart_puff.png (16×16) | heart-gain feedback sprite | 03f23934-7cb3-4810-a84b-7630ab58723d | ✅ pass |
| furniture/coffee_machine_v2_unverified.png (32×32) | coffee machine upgrade, 2nd attempt | 3de2111a-8436-40ca-b36a-8a76d4886290 | ⚠️ v1 failed QA (dark plum body, no spouts); v2 regenerated with explicit copper+spouts prompt but **visual QA pending — vision model saturated at generation time** |

All: binary alpha (no soft edges), transparent corners verified programmatically.

## Batch 6 — 2026-08-30 (R005/R008 icons + ambience props)

| File | Size | Job ID | QA |
|------|------|--------|-----|
| items/drink_cloud_foam.png (32×32) | Cloud Foam (R005) icon | b74696d3-cc16-4383-a447-80bd9696c582 | ✅ pass — tall glass, foamy crown, pale creamy palette |
| items/drink_honey_milk_wren.png (32×32) | Wren's Usual (R008) icon | 53f2a756-463f-43ec-85a3-21d8ea997806 | ✅ pass — same mug family as R002, moonleaf garnish visible |
| fx/steam_wisp.png (16×16) | steam FX sprite | f911e1cc-5b62-46d2-91b2-d29c6edda973 | ✅ pass — gentle rising curls, warm translucent shape |
| furniture/menu_board.png (32×32) | menu board prop | 31e052f0-ad8b-4944-afc6-ecccb3f9f745 | ✅ pass (corner frame pixel opaque, rest transparent) |
| props/recipe_notebook.png (32×32) | recipe notebook prop | 0ba58aa1-ee75-4715-8b84-d16d8d9e61a2 | ✅ pass — cloth bookmark peeking, worn look |

All: RGBA, transparent corners verified via PIL corner-alpha check.

## Batch 7 — 2026-09-01 (Sela re-art, user-supplied — not PixelLab)

Source: a 4-pose + cart character sheet supplied directly by the user
(`sela_mesh_1/2.png`, 1536×1024, identical duplicates — deleted after
cropping). Higher-detail illustration style than the rest of the cast, not
generated with the pixen params above — a deliberate one-off, not the new
house style.

Pipeline: alpha-keyed crop off the near-black sheet background (soft ramp,
then despeckled to remove the cart's pull-rope line) → mirrored horizontally
(source faced west; the sim walks customers door→counter, i.e. facing east,
and nothing in the render path flips sprites) → cropped to opaque bounds →
Lanczos-downscaled to fit 44×58 within a shared 48×64 canvas, bottom-aligned
+ centered (so any future frame-swap won't jitter).

| File | Size | Source pose | QA |
|------|------|--------------|-----|
| sprites/sela_walk.png | 48×64, opaque 34×58 | walking, arm forward / back leg lifted | ✅ pass — replaces the original sela_walk.png. Renders ~48% taller than the ~32×48 cast (opaque height 58 vs ~44) at the same 2× engine scale — no scene.ts change needed, the existing bounds-driven draw just picks up the bigger source. |
| sprites/sela_walk_b.png | 48×64, opaque 34×58 | walking, opposite arm/leg contact | ✅ pass — second walk-cycle frame. See Batch 7 follow-up below: unlike `fenwick_walk_b.png`, this one IS wired into a real frame-swap animation. |
| sprites/sela_stand.png | 48×64, opaque 29×58 | standing, hands at belt pouch | ✅ pass — staged only, not referenced by any code path yet (candidate idle/portrait-adjacent pose). |
| props/sela_cart.png | 140×137 | the market cart (plants, jars, sacks) | ✅ pass — wired into `ui/shop.ts`: shows above Sela's ingredient rows when `selaCartOpen(day)` is true (day ≥ `SELA_CART_FROM_DAY`). First art the shop overlay has ever shown; everything else in it is DOM text. |

Raw mesh sheets deleted after cropping (both copies, identical).

## Batch 7 follow-up — 2026-09-02 (walk-cycle animation + bubble-anchor fix)

> **Superseded 2026-09-02 (Batch 8):** Sela's 3-frame cloak-only walk
> (`sela_walk` + `_b` + `_c`, ping-pong) was replaced by a new user mesh — a
> 4-frame east-facing **cart-push** cycle. `sela_walk_b.png` / `sela_walk_c.png`
> are deleted; `sela_walk.png` is now cart-push frame 0. The `pingpong` mode
> stays in the code (unit-tested) but no character uses it. Details in Batch 8.

| File | Size | Source pose | QA |
|------|------|--------------|-----|
| sprites/sela_walk_c.png | 48×64, opaque 34×58 | mid-stride, trailing arm back | ⚠️ **deleted in Batch 8** — see the cart-push replacement. |

Sela is now the first cast member with **real per-frame walk animation**:
`render/images.ts` gained `characterWalkFrames(id)` (3 frames for Sela, the
existing single frame for everyone else), and `render/scene.ts` gained
`walkFrameIndex(frameCount, timeMs)` — a pure, unit-tested ping-pong
(a,b,c,b,a,b,c,b,… for 3 frames) stepped off the same clock as the existing
footstep bob, so the frame change and the bob land together.
`drawCharacterSprite` now picks `frames[walkFrameIndex(...)]` while
`gait.moving`, frame 0 at rest. Everyone else is unaffected — a 1-frame
array always resolves to index 0, i.e. today's behavior.

**Bug found and fixed while verifying this live:** the order bubble anchors
itself a fixed distance above `CUSTOMER_H`, which assumed every cast member
renders at the old ~88px-tall size. Sela's taller Batch 7 art (~116px)
poked up through that assumption and the bubble panel buried her head
entirely. Fixed by adding `spriteTopY(characterId, y)` — computes the
anchor from that character's *actual* rendered sprite height — and having
both `drawBubble()` and `bubbleRectFor()` (drawing and hit-testing) call it,
same shared-geometry pattern the bubble already used for its own size.
Verified live: bubble now floats correctly clear of Sela's hood.

## Batch 8 — 2026-09-02 (Fenwick + Bram + Nia + Wren re-art, full walk cycles, user-supplied)

Source: four user-supplied sheets, all 1536×1024 — `fenwick_meshes.png`
(8 walk frames + a stand), `bram_mesh.png` (4 stand poses in row 1, a 10-frame
walk cycle across rows 2–3), `nia_mesh.png` (a 7-frame run cycle across rows
1–2, plus a stand in the last cell), `wren_mesh.png` (labelled 1–8: two IDLE
bookends + a 6-frame cane shuffle). All deleted after cropping. Same
higher-detail illustration style as Sela's Batch 7 — the whole regular cast
now shares one look, and every regular has a real walk cycle.

Keying: Fenwick + Bram sit on a warm radial glow that hugs each figure, so a
colour-distance key left a brown halo behind the head. Method there was
**difference-from-background**: a ~61×61 median of each figure's region
estimates the smooth glow, then `|source − median| > ~24` isolates the
(non-smooth, pixel-art) figure. Nia's + Wren's sheets are flat (black /
charcoal) like Sela's — a plain alpha ramp is enough (Wren's row bands are
kept above the printed frame labels). Then (Fenwick/Bram only) mirror east —
**Nia and Wren already face east**, no flip — crop to opaque bounds,
Lanczos-fit into the shared 48×64 canvas.

| File | Size | QA |
|------|------|-----|
| sprites/fenwick_walk.png … fenwick_walk_7.png | 48×64, opaque ~32×50 each | ✅ pass — 8-frame walk cycle. `fenwick_walk.png` is frame 0 and doubles as the at-rest/served pose (`characterSprite('fenwick')` already points here). All 8 the same opaque height (50) so the cycle doesn't bob vertically. On-screen ~64×100 at 2× — a stout, not-tall dwarf. |
| sprites/fenwick_stand.png | 48×64, opaque 33×50 | ✅ pass — staged idle pose, not wired. |
| sprites/fenwick_walk_b.png | — | **deleted** — the old unused 2nd frame; the 8-frame cycle replaces the whole idea. |
| sprites/bram_walk.png … bram_walk_9.png | 48×64, opaque ~35×54 each | ✅ pass — 10-frame walk cycle (rows 2–3 of the sheet). `bram_walk.png` is frame 0 / at-rest pose. All 10 opaque height 54. On-screen ~70×108 at 2× — a broad, heavy human, tallest of the re-arted set. Replaces the old 32×48 `bram_walk.png`. |
| sprites/bram_stand.png | 48×64, opaque 30×54 | ✅ pass — staged idle pose (one of the 4 row-1 stands), not wired. |
| sprites/nia_walk.png … nia_walk_6.png | 48×64, opaque ~28×44 each | ✅ pass — 7-frame run cycle. `nia_walk.png` is frame 0 / at-rest pose. All 7 opaque height 44. On-screen ~56×88 at 2× — a small, bouncy gnome, smallest of the re-arted set. Replaces the old 32×48 `nia_walk.png`. |
| sprites/nia_stand.png | 48×64, opaque 25×44 | ✅ pass — staged idle pose (last cell of the sheet), not wired. |
| sprites/wren_walk.png … wren_walk_6.png | 48×64, opaque ~28×48 each | ✅ pass — `wren_walk.png` is the dedicated IDLE (sheet frame 1); `_1…_6` are the stride frames (L stride/mid/push, R stride/mid/push). Held-idle `loop-body` mode — the moving cycle is `_1…_6`, IDLE shows only at rest. On-screen ~56×96 at 2×. Replaces the old 32×48 `wren_walk.png`. |
| sprites/wren_stand.png | 48×64, opaque 27×48 | ✅ pass — staged idle pose (sheet frame 8, the 2nd IDLE), not wired. |
| sprites/sela_walk.png … sela_walk_3.png | **64×64** canvas, opaque ~54×58 each | ✅ pass — 4-frame east-facing cart-push cycle from a new `sela_mesh.png` (flat black, row 2 = east; row 1 was cart-*pull*, unused). Wider 64×64 canvas because the cart puts the sprite ~as wide as it is tall. `sela_walk.png` is frame 0 / at-rest pose (a mid-push stance). Replaces the Batch 7 `sela_walk` + `_b` + `_c`. On-screen ~108×116 at 2× — figure ≈ her old height, plus the cart sticking out ahead (east) of the walk point. |

**Design note:** Sela now wheels her produce cart into the café on every
visit. The shop rule says her "cart parks outside daily" — this is a mild
lore tension and the cart ends up near/at the counter when she arrives.
Easy to revert (drop the `sela` branch) if it reads wrong in play.

On-screen height order after this batch: Sela ~116 (tall elf, now + cart) >
Bram ~108 (big human) > Fenwick ~100 (stout dwarf) > Wren ~96 (hunched,
cane) > Nia ~88 (small gnome).

Wiring: `characterWalkAnim(id)` returns `{ frames, mode }`; the numbered-frame
loaders share `numberedWalkFrames(id, last)`.
`walkFrameIndex(n, timeMs, mode)` modes: **`loop`** (0,1,…,n-1,0,… — Sela 4,
Nia 7, Fenwick 8, Bram 10), **`loop-body`** (1,…,n-1,1,… — Wren, whose frame
0 is a held IDLE separate from the 6 stride frames), and **`pingpong`** (bounce
a hand-made set; currently unused, kept + tested). One frame per 110 ms
(~440–1100 ms/cycle — cozy pace, doc 04 "nothing above 12 fps"; Bram's slower
cycle suits his gruff heavy tread, Wren's the shuffle).

Not verified live in-scene: the debug spawn hook skips the walk-in tween and
won't advance past the active customer, so the cycles were only checked via
extracted-frame contact sheets + the unit-tested index math (same limitation
hit with Sela's walk-in).

## Batch 9 — 2026-09-02 (time-of-day + season backgrounds, user-supplied)

Source: two user-supplied sheets (`bg_mesh_1/2.png`, 1672×941), each two
full-scene café interiors stacked. Same room as `cafe_room.png`, relit:
`bg_mesh_1` top = **morning** (blue dawn), bottom = **snow** (snowbound
night); `bg_mesh_2` top = **day** (bright, blue sky, green), bottom =
**evening** (pink/red dusk). Both meshes deleted after cropping.

The mesh room is wider than the game's 16:9 frame. Cropped each half to
`x[330:1400]` (a landmark map: fireplace, both windows, counter and stools
land where `cafe_room.png` had them — verified live, Mops at `HEARTH_X`
still sits on the hearth), then Lanczos-resized to **exactly 480×270** —
non-uniform (horizontal squished ~20% more than vertical), unnoticeable at
game scale.

| File | Size | QA |
|------|------|-----|
| backgrounds/cafe_room_morning.png / _day.png / _evening.png / _snow.png | 480×270 | ✅ pass — replace the single `cafe_room.png` (deleted). `day` is much brighter/warmer than the old art — the café now reads as *open* during service. |

Wiring: `sim/day.ts` gained `roomVariantFor(day, phase)` (pure, unit-tested)
— `prep → morning`, `service → day`, `recap → evening`, and **day ≥ 11
(`WINTER_FROM_DAY`) → snow, all phases** (lore: "the mountain pass will
close with the first heavy snow"; chapter 4 opens day 11). `render/draw.ts`
gained `setRoomVariantProvider` (same pattern as `setCafeDomPhaseProvider`);
`game-controller` wires it to `roomVariantFor(this.dayState.…)`. `cafeRoom()`
now takes a variant and `preloadAllArt` warms all four.
`scripts/verify_dist_paths.mjs` checks the four variants explicitly (they
load via a template-literal path the static scan can't see).

**Follow-up 2026-09-02:** `cafe_room_evening.png` re-cropped from a fresh
dedicated dusk render (user-supplied single 1672×941 scene, window
`(240,40,1440,900)` → Lanczos 480×270) — warmer and cleaner than the
`bg_mesh_2` bottom half, framed to match the other three variants.

## Batch 10 — 2026-09-02 (walk-sheet facing flip — no new art)

No generation. Every Sela / Fenwick / Bram sprite PNG (`*_stand`, `*_walk`,
`*_walk_1..N` — 25 files) was horizontally mirrored in place so the source
now faces **screen-right = the counter = the walk-in direction**. Before
this, all three faced left and moonwalked toward the counter on entry.

Nia (near front-facing, reads fine either way) and Wren (kept facing the
door) were **not** touched.

Wiring: `render/scene.ts` `drawCharacterSprite` gained a `leaving` arg and a
`MIRRORED_SOURCE_IDS = {sela, fenwick, bram}` set. When a customer of that
set is walking out (`cv.leaving`), the sprite is drawn with a canvas
`scale(-1, 1)` about its centre — mirrored back to face the door on exit.
Both draw paths (plain + the lean/rotate path) apply it; the flip is placed
before the lean rotation so the head still swings the correct way. Nia/Wren
never flip. `assets/` and `public/assets/` kept in sync.

## Consistency Notes

1. **Black Tea has a tiny face; other drinks don't.** Either embrace it (all drinks get faces — fits the cozy tone) or regenerate R001 faceless. Decide before adding more drink icons.
2. **Style drift risk:** all assets were generated with the same params (pixen, selective outline, low/medium detail, no background). For future assets, reuse these exact params and consider passing an existing asset via `style_image` once a "hero" style is chosen.
3. Palette is warm/cohesive but not audited against the 32-color master palette in doc 04 §1.3. Run `reduce_colors` (PixelLab) across all assets if strict palette lock is wanted.
4. **Sela now visibly differs in style from Fenwick/Bram/Nia/Wren** (Batch 7: higher-detail illustration vs. the rest's flatter pixen output), and renders taller. Accepted as a deliberate one-off per user direction; flag before doing the same for another character, or before a broader "re-art the cast" pass.

## Asset status for the current itch.io MVP build

This section replaces the older "Still Missing for MVP" list. The art pass that
shipped the playable build added most of the items the manifest originally flagged
as missing, so the table below separates three buckets:

- **Required for current MVP** — referenced by runtime code; missing these breaks the build.
- **Optional ambience** — code already guards for absence; missing is a visual gap, not a defect.
- **Future content** — not part of the current MVP; planned polish.

### Required for current MVP (all shipped in this build)

| Asset | Status |
|-------|--------|
| Café background — `backgrounds/cafe_room_{morning,day,evening,snow}.png` (480×270) | ✅ shipped (Batch 9; single `cafe_room.png` removed) |
| Character walk sprites ×5 (`sprites/*_walk*.png`) — Sela/Fenwick/Bram/Nia/Wren all now full cycles | ✅ shipped (Batches 7–8) |
| Portraits ×5 (`portraits/{fenwick,sela,bram,nia,wren}.png`) | ✅ shipped (fenwick added to shipped set for this release) |
| Mops states ×6 (`pets/mops_{sit,idle,sleep,stretch,walk,look}.png`) | ✅ shipped (all six added to shipped set for this release) |
| Drink icons ×6 (`items/drink_{black_tea,honey_milk,moonleaf_tea,ember_cocoa,iced_berry_tisane,root_remedy_broth}.png`) | ✅ shipped |
| Furniture ×3 (`furniture/{window_bench,record_player,coffee_machine_v2_unverified}.png`) | ✅ shipped |
| FX (`fx/heart_puff.png`) | ✅ shipped |
| SFX ×3 (`audio/{click,door-chime}.{wav,mp3,ogg}`) | ✅ shipped |
| Music ×3 (`assets/music/{1_Fireplace,3_RainingDays,4_CherryBlossomTree}.m4a`) | ✅ shipped (real loops) |

### Optional ambience (code falls back gracefully; not build-blocking)

- `sprites/fenwick_walk_b.png` — second walk frame; gait is supplemented by
  bob/lean tween, so its absence is invisible in practice.
- `coffee_machine_v2_unverified.png` — upgrade sprite; visual QA pending, but
  harmless (it is decorative furniture).
- Seasonal / time-of-day background variants, extra NPC idle frames, richer
  environmental FX, ambient prop clutter — all future polish.

### Future content (post-MVP, not in this release)

- Mops animation beyond the six states above
- Additional upgrade furniture sprites
- Full UI skin art (currently CSS/DOM)
- Richer ambient sound palette (room tone, weather, micro SFX)
- World-state background variants

> Implementation note: every runtime asset path is resolved relative to
> `import.meta.env.BASE_URL` (vite base `./`), so the build works when served
> from an itch.io iframe subpath. The two pending drink icons above are the only
> genuinely missing referenced art; both have in-engine placeholder fallbacks, so
> the current MVP is fully shippable without them.

## Budget Log

40-generation trial balance. Used: 13 (12 successful + 1 job that vanished server-side, id e73b6a52-7654-4b8f-8a72-d0d3d9b6c1f4, never registered). Remaining after Batch 6: **22** (5 used this session).
