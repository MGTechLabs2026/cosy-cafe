# 04 · Moonleaf Café — Art & Audio Direction

> Doc 04 of 07 · Status: Draft v0.1 · 2026-08-25
> Purpose: let any artist/composer (or future-you) produce assets that fit, without asking questions.

## 1. Art Direction

### 1.1 One-line direction
**Pixel art that feels like a warm room on a cold day** — soft edges, candlelight, gentle animation, nothing twitchy.

### 1.2 Style spec
| Property | Decision | Why |
|----------|----------|-----|
| Resolution | Native pixel grid 480×270 (16:9), integer-scaled up | Crisp on any monitor; honest pixel look |
| Scaling | `image-rendering: pixelated`, integer scale factors only | No shimmer/blur |
| Palette | 32-color master palette (below), max ~24 per scene | Cohesion, small file size |
| Outlines | Selective dark outlines (only where form needs help); no full black outlines everywhere | Softer, cozier read |
| Shading | 2-tone shading + light-source tint (warm from hearth/lamps, cool from windows) | The whole game is about warm-inside/cold-outside |
| Dithering | Minimal; prefer solid tones | Cleaner at small sizes |

**Influence board (mood, not imitation):** *Coffee Talk*'s interior warmth · *Stardew Valley*'s character readability at small size · *Garden Story*'s rounded friendliness · Studio Ghibli's lamplight-and-steam interiors.

### 1.3 Master palette (32 colors)
```
#1a1423  #2d2438  #453952  #63577a   ← deep night / shadow
#8a7fa8  #b3a9cc  #ddd6ee            ← mist / moonlight (cool lights)
#f7f3e8  #efe0c3  #e3c99a            ← parchment / cream / wood-light
#c69a6d  #a97c50  #8a5f3e  #6b4630   ← wood mid/dark, leather
#e8865a  #d96a45  #b84a36            ← ember / terracotta accents
#f2c14e  #e0a63a                    ← lamplight / gold (use sparingly = value)
#7da87b  #5c8a62  #3f6b52            ← herbs / moonleaf greens
#86b6c6  #5f93ad                    ← frost / window glass
#e8a5b8  #c97b92                    ← berry / blush accents
#f5ede1  #d8cbb8  #a89a88  #71655a   ← neutrals (fur, stone, ceramic)
```
Rule of thumb: warm colors own the interior, cool colors own the exterior/windows. If a frame feels wrong, check which side of the window its color came from.

### 1.4 Asset list & budgets

| Category | Spec | Count (MVP) |
|----------|------|-------------|
| Café room background | 480×270 base, layered: walls, floor, counter, hearth, window(s) | 1 room + 3 seasonal variants (recolors) |
| Furniture/upgrade sprites | Second kettle, window bench, shelf tiers, coffee machine, record player, hearth expansion | 6 sets |
| Props | Cups (3), kettle, jars, bottles, cake dome, notice board, mail slot, cat bed | ~15 |
| Characters (portraits) | 48×48 portrait, 2 expressions min (neutral/warm) + talk mouth frames ×3 | 6 characters |
| Characters (sprites) | 24×36 side-view at counter, idle + walk-in + walk-out | 6 + 2 generic travelers |
| Mops the cat | 16×12, states: sleep, sit, stretch, sniff-murky-brew, petted | 5 |
| Steam/FX | Kettle steam (loop), sparkle (discovery), coin puff, heart puff | 4 |
| Weather/window FX | Rain streaks, snow drift, fog drift (behind-window layers only) | 3 |
| UI skin | 9-patch panels, buttons, icons (~20), fonts (see 1.6) | 1 set |

**Animation budget:** idle loops ≤ 6 frames at ≤ 8 fps; walk cycles ≤ 6 frames; steam 4 frames. Everything else is code-driven (bobbing, tweened). Cozy is slow; nothing animates above 12 fps.

**File discipline:** PNG sheets packed to one atlas; target total art payload ≤ 10 MB uncompressed, well under the 20 MB initial-download budget.

### 1.5 Lighting & atmosphere
- Global warm tint overlay from the hearth side; cool rim from windows. Time-of-day shifts: dawn (blue+warm mix) → day (neutral warm) → dusk (amber) → evening (deep amber + lamp pools).
- Candle/lamp flicker: opacity oscillation ±4% at ~0.5 Hz. Subtle or not at all.
- Reduced-motion setting must disable: flicker, steam particles, weather drift, screen transitions. Game remains fully readable static.

### 1.6 Typography
- Display/title: a rounded serif with storybook energy (candidates: **Grenze Gotisch Light**, **Alegreya**, **IM Fell English** — pick one, license-check for embedding).
- Body/UI: highly legible humanist sans (**Atkinson Hyperlegible** preferred — accessibility bonus) or pixel font **VT323** if full-pixel consistency wins in mockups.
- Minimum body size 16 px CSS-equivalent at 1× scale. No text below 14 px anywhere, ever.

## 2. Audio Direction

### 2.1 Music philosophy
Music is wallpaper made of wool — felt more than heard. Loops must survive being heard for 30+ minutes without grating: no sharp attacks, no busy percussion, sparse melody with lots of air.

### 2.2 Track plan (MVP)
| Track | Mood | Instruments | Loop len |
|-------|------|-------------|----------|
| `theme_morning.ogg` | Hopeful, sleepy | Felt piano, soft strings, light glockenspiel | 90–120 s |
| `theme_service.ogg` | Gentle momentum | Piano + brushed rhythm, upright-bass feel | 120–150 s |
| `theme_evening.ogg` | Reflective, warm | Solo piano, low strings pad | 90–120 s |
| `theme_winter.ogg` | Hush, wonder | Celesta, airy pads, near-silence gaps | 100–140 s |

- Keys favor major with borrowed warm chords (IV, bVII). Tempos 60–85 BPM. Never modulate abruptly.
- Record-player upgrade adds a lo-fi filter + vinyl crackle layer on service music (diegetic treat).
- Crossfade all track changes (2 s). No hard cuts, ever.
- **Licensing:** compose or commission original; if using CC sources, document license per file in `assets/audio/CREDITS.md` from day one.

### 2.3 SFX set (small, soft, meaningful)
| Sound | Character |
|-------|-----------|
| Kettle fill / brew bubble / pour | Watery, gentle; brew bubble rises in pitch as drink nears done |
| Serve success ("cup down") | Warm ceramic clink + tiny major chime |
| Murky brew | Dull plop + single low "hmm" note. Never harsh |
| Coin count | Soft tick-tock, capped volume |
| Heart gain | Two-note motif (same two notes every time — signature sound) |
| Discovery sparkle | Ascending 3-note arpeggio, quiet |
| Door chime | Actual little bell — plays on every entry; it will be heard hundreds of times, keep it lovable |
| Mops purr | Loopable low rumble on pet |
| UI clicks/toggles | Paper-soft taps, no beeps |
| Rain/snow ambience | Behind-window filtered; ties to weather FX |

Rules: no alarm sounds, no error buzzes, no stingers louder than music. Peak SFX level ≈ −6 dB relative to music bed.

### 2.4 Audio technical notes
- Format: OGG Vorbis (music −1 dB headroom), mono where possible for SFX (size).
- Settings: master / music / SFX sliders (0–100), all persisted in save.
- Browser autoplay policy: audio starts only after first user gesture — title screen "Press any key" satisfies this; design assumes silence until then.
- Total audio payload target ≤ 8 MB.

## 3. Juice & Feel Checklist (what makes it cozy)

Small things, in priority order:
1. Steam rises from served cups until picked up. ☑ highest value-per-effort in the entire project
2. Cup slides across the counter with slight ease-out; customer wraps hands around it (2-frame hand change).
3. Hearth glow pulses very slowly; embers drift up (2-particle system).
4. Coins fly to the counter in an arc, tick up in the ledger with soft ticks.
5. Heart puff floats from customer on favorite-order serves.
6. Window weather reflects the season; condensation fades in when it's cold.
7. Mops reacts: ears perk at door chime; relocates to new furniture; slow blink when petted.
8. Journal page-turn sound + slight paper curl animation on tab switch.
9. Title screen: snow falling past the window, kettle steaming, music box version of main theme.

Nothing on this list may introduce motion that ignores the reduced-motion setting.
