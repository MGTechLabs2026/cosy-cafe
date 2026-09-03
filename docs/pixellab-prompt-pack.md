# PixelLab Prompt Pack — Moonleaf Cozy Café

Optimised for **pixellab.ai web app, free tier**. Reproduces the settings the
shipped assets were generated with (`create_image_pixen` via MCP = **Pixflux**
model in the browser) so new batches stay style-consistent.

Sources: doc 04 §1.2–1.5 (style + palette), `assets/ASSETS.md` (params, sizes,
QA rules), doc 03 §4 (character visuals).

---

## 1. Browser settings — set these once, keep them identical every batch

| Control | Value | Why |
|---|---|---|
| Model | **Pixflux** (text → pixel art). Switch to **Bitforge** only when using a style-reference image (§2). |
| Size | Per-asset, see each batch. **Never upscale in PixelLab** — the game scales with `image-rendering: pixelated`. |
| No background | **ON** (transparent RGBA) |
| Outline | **Selective outline** — NOT "black outline". Doc 04: "no full black outlines everywhere". |
| Shading | **Basic** (2-tone) for ≤32 px; **Medium** for 48 px portraits |
| Detail | **Low** for ≤16 px FX; **Medium** for 32 px props and characters |
| View / projection | **Side** (isometric OFF, top-down OFF). The café is a flat side-on elevation. |
| Dithering | Off / minimal — "prefer solid tones" |

Free-tier economy: base text→image is the cheap op. **Skip** 4-direction rotation,
skeleton animation, and large inpainting — they burn credits fast. Generate single
frames; the engine already does 2-frame gait + bob/lean tweens.

---

## 2. Style lock (palette + reference image)

### Master palette (doc 04 §1.3) — paste into the prompt as `restricted palette: ...` or apply PixelLab "Reduce colors" after generating

```
#1a1423 #2d2438 #453952 #63577a   deep night / shadow
#8a7fa8 #b3a9cc #ddd6ee           mist / moonlight (cool light)
#f7f3e8 #efe0c3 #e3c99a           parchment / cream / wood-light
#c69a6d #a97c50 #8a5f3e #6b4630   wood mid/dark, leather
#e8865a #d96a45 #b84a36           ember / terracotta
#f2c14e #e0a63a                   lamplight / gold (sparingly)
#7da87b #5c8a62 #3f6b52           herbs / moonleaf green
#86b6c6 #5f93ad                   frost / window glass
#e8a5b8 #c97b92                   berry / blush
#f5ede1 #d8cbb8 #a89a88 #71655a   neutrals (fur, ceramic, stone)
```

Rule: warm colours own the interior, cool colours own the window side.

### Style-reference image (Bitforge model)

Once you like a result, feed a shipped "hero" asset as the style image for the
rest of that batch:

- Characters/sprites → `assets/sprites/sela_walk.png` (ASSETS.md: "best of set")
- Furniture/props → `assets/furniture/record_player.png` ("best object clarity")
- Pets → any `assets/pets/mops_*.png`

---

## 3. Reusable prompt skeleton

```
cozy storybook pixel art, <SUBJECT>, side view,
warm hearth light from the left and cool window light from the right,
2-tone shading, selective dark outline only where the form needs it,
solid colours, minimal dithering, muted warm palette,
centered, transparent background, no ground shadow, no text
```

Add-ons:
- Drinks: `+ no face, no eyes, no expression`
- Characters: `+ facing east (to the right), full body, single standing frame`
- FX: `+ very subtle, faint, semi-transparent`

QA every output (ASSETS.md rules): transparent corners · hard alpha edges (no
soft anti-alias) · sprites face **east** (engine flips for west) · **no baked
shadow** · drink icons have **no face** · keep params identical for cohesion.

---

## 4. Batch A — Café props · 32×32 · Medium detail

1. a brass tea kettle with a single faint steam curl, warm copper body
2. three stacked ceramic teacups, cream glaze, tiny chips
3. a row of three painted tea tins, slightly dented lids
4. a small round honey jar with a wooden honey dipper resting across the rim
5. a cream ceramic milk pitcher, short and round
6. a wooden serving tray with a folded linen cloth on it
7. a squat potted plant, trailing green leaves, terracotta pot
8. a small brass table lamp with a warm glowing amber shade
9. a round wall clock in a simple wooden frame, plain face
10. a cork notice board with a few pinned paper scraps and a curled corner
11. a short wooden wall shelf holding two jars and a folded cloth
12. a small glass vase holding three dried moonleaf sprigs with a faint green glow

---

## 5. Batch B — NPC life kit · 32×48 · Medium detail · facing east

Highest emotional ROI (doc `assets-required.md`). Three per character: alt idle,
sip, one personality pose.

### Wren — elderly human, long white braid, thick knitted shawl, driftwood cane
- `Old Wren idle, leaning both hands on a driftwood cane, shawl draped, calm`
- `Old Wren sipping from a mug held in both hands, eyes half-closed, content`
- `Old Wren mid-story, one hand raised and open, mouth slightly open, cane leaning against leg`

### Fenwick — tired dwarf courier, braided grey beard with a crooked metal clip, patched courier coat
- `Fenwick idle, shoulders slumped, hands in coat pockets, empty thermos on belt`
- `Fenwick tilting a mug back to drink, eyes closed, beard clip catching light`
- `Fenwick holding an unfolded worn paper route map in both hands, studying it`

### Sela — young elf trader, leaf-green traveling cloak, single moth-shaped earring, satchel of faintly glowing jars
- `Sela idle, weight on one hip, one hand resting on her satchel of glowing jars`
- `Sela holding a tall foamy drink in both hands, small smile`
- `Sela adjusting a bundle of dried flowers tucked under one arm`

### Bram — broad human blacksmith 50s, heavy singed leather apron, thick forearms
- `Bram idle, arms crossed, looking down, heavy apron, quiet`
- `Bram both hands wrapped tightly around a small mug, holding it close`
- `Bram turning a small iron bracket over in his fingers, inspecting it`

### Nia — young gnome tinkerer, brass goggles pushed up into wild hair, fingerless gloves, satchel leaking faint steam
- `Nia idle, fidgeting with a small brass gear between her fingers`
- `Nia drinking a berry drink one-handed, other hand gesturing mid-sentence`
- `Nia peering closely through her goggles at a small brass device on her palm`

---

## 6. Batch C — Mops extra states · 24×24 · Low/Medium detail

Round orange cat. Doc 04 wants `sniff` + `petted`; add a door-chime perk.

- `round orange cat leaning forward to sniff a cup, nose down, ears flat, faintly disgusted, tail low` → `mops_sniff.png`
- `round orange cat sitting, eyes closed in a slow blink, tiny content smile, tail curled around front paws` → `mops_petted.png`
- `round orange cat sitting upright, both ears perked sharply forward, wide alert eyes, tail straight up` → `mops_perk.png`

---

## 7. Batch D — Story props · 32×32 · Medium detail

Where the café stops being generic. Story progression swaps these in over days 1–14.

- `a worn wooden rocking chair with a faded cushion, one armrest polished smooth` — Marigold's chair
- `a thick handwritten recipe book, cloth cover, swollen pages, a ribbon bookmark` — Marigold's recipe book
- `a small framed sepia photograph of an old woman standing outside a café` — Marigold photo
- `a bundle of unopened letters tied with twine, the top envelope slightly stained` — unsent letters
- `an old dented copper kettle, retired, lid sitting slightly crooked` — the old kettle
- `a small iron door-chime bell on a fresh bracket, a faint crack line across the metal` — Bram's repaired chime

---

## 8. Batch E — Ambient FX · 16×16 · Low detail · very subtle

Keep faint — particle budget is capped at 40 and reduced-motion must stay readable.

- `a single soft rising curl of steam, translucent warm white`
- `a small warm candle flame, teardrop shape, faint glow, mostly transparent`
- `three tiny drifting dust motes, pale specks on transparent`
- `a faint gold four-point sparkle, thin rays` — discovery
- `a small orange ember with a short faint upward trail` — hearth
- `a thin cool condensation streak running down glass, pale blue, mostly transparent` — cold window

---

## 9. Open item

`assets/portraits/wren.png` shipped with a "jolly grandfather" read (full white
beard, red nose) that doc 03 never specified. If regenerating: `48×48, Medium
shading` — `Old Wren portrait, elderly human, long white braid over one shoulder,
thick knitted shawl, weathered kind face, neutral warm expression, side-lit warm`.
