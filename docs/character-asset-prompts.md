# Character Asset Prompts — Moonleaf Cozy Café

Verbatim PixelLab prompts for every character/creature asset in the shipped
build. Recovered 2026-09-01 from the Hermes `glm52a` profile message store
(`~/.hermes/profiles/glm52a/state.db`) — the original PixelLab jobs are expired
(8-hour retention) and `assets/ASSETS.md` only recorded job IDs.

**Model:** `create_image_pixen` (pixen) for all. **Transparent:** true for all.

**Batch params** (not re-logged per call; from the PixelLab skill session notes,
2026-08-25 batch):
- Portraits: `view=side, outline="selective outline", detail="medium detail", no_background=true`
- Walk sprites: `direction=east, view=side, outline="selective outline", detail="low detail", no_background=true`
- Mops: `view=side, outline="selective outline", detail="low detail", no_background=true`

Size deviation (walk sprites): doc 04 §1.4 specifies 24×36; PixelLab forces
square canvases below 32 px, so all walk sprites are **32×48**. All face **east**;
the engine flips them for westward travel and draws its own soft shadows — ignore
any baked shadow.

---

## Counter sprites — 32×48 · `assets/sprites/`

### fenwick_walk.png — `ab2352c5-cc35-4b76-8d62-2f5b3f4d0c1b`
> Side view of a stout dwarf courier walking, long braided grey beard, patched brown leather courier coat, tired posture, full body tiny game character sprite, cozy fantasy style, warm palette, clean silhouette, transparent background

### fenwick_walk_b.png — `cf2396f9-8fe2-40c8-bc3c-bc9087897f5e` (Batch 5, walk frame B / mid-stride)
> Side view of a stout dwarf courier mid-stride walking, long braided grey beard flowing behind him, patched brown leather courier coat, front leg extended far forward and back leg pushing off ground, arms swinging in stride, tired weary posture, full body tiny game character sprite, cozy fantasy style, warm earthy palette, clean silhouette

### sela_walk.png — `dcfb338e-2fb8-4e09-8633-3489a64c43bd`
> Side view of an elf woman trader walking, leaf-green traveling cloak, auburn braid, cheerful stride, carrying a small hand-cart handle, full body tiny game character sprite, cozy fantasy style, warm palette, clean silhouette

### bram_walk.png — `633da35b-6327-402f-913d-646975098b95`
> Side view of a burly middle-aged human blacksmith walking slowly, scorched leather apron over rolled sleeves, heavy shoulders, somber posture, full body tiny game character sprite, cozy fantasy style, warm palette, clean silhouette

### nia_walk.png — `93030bf2-ad34-4fb4-846c-0ecb0a5984c5`
> Side view of a small gnome woman inventor walking energetically, wild orange curly hair, brass goggles on forehead, brown tool vest, springy excited step, full body tiny game character sprite, cozy fantasy style, warm palette, clean silhouette

### wren_walk.png — `10641833-d5ac-4f8f-8ce6-ad4129171142`
> Side view of a frail elderly storyteller with a white braid and driftwood cane shuffling slowly, thick mustard-yellow knitted shawl, slightly hunched, full body tiny game character sprite, cozy fantasy style, warm palette, clean silhouette

---

## Portraits — 48×48 · `assets/portraits/`

### fenwick.png — `58702959-d59b-45e8-a432-611d28063928`
> Portrait of Fenwick Mossbeard, a stout dwarf courier in his 140s with a long braided grey beard fixed by a small crooked brass clip, bushy eyebrows, tired but kind brown eyes, weathered rosy cheeks, wearing a patched brown leather courier coat over a wool tunic, cozy fantasy tavern game character bust, warm candlelit earth-tone palette, soft rounded pixel shapes, gentle weary half-smile, storybook charm

### sela.png — `ecaa234d-ad70-4b8d-ab43-435b93f8c909`
> Portrait of Sela of Vessany, an ageless young elf woman trader with a cheerful mischievous smile, pointed ears, one silver earring shaped like a moth, wearing a leaf-green traveling cloak with hood down, auburn hair braided over one shoulder, freckles, cozy fantasy tavern game character bust, warm candlelit earth-tone palette with green accents, soft rounded pixel shapes, storybook charm

### bram.png — `d4f49cc2-9c0a-43eb-a35c-3cd98e0faef7`
> Portrait of Bram Holt, a burly middle-aged human blacksmith in his fifties with a somber gentle expression, short trimmed grey-streaked beard, heavy broad shoulders, thick neck, wearing a scorched leather smithing apron over a rolled-sleeve shirt, faint soot smudge on cheek, warm brown eyes, cozy fantasy tavern game character bust, warm candlelit earth-tone palette, soft rounded pixel shapes, storybook charm

### nia.png — `d6c70383-97c3-42ec-99a2-06f8d8fc3588`
> Portrait of Nia Quicksprocket, a young energetic gnome woman inventor with brass aviator goggles pushed up into wild orange curly hair, big excited grin, bright green eyes, pointy ears, wearing fingerless gloves and a brown vest with tiny tools and gears, a small oil smudge on her nose, cozy fantasy tavern game character bust, warm candlelit earth-tone palette with brass accents, soft rounded pixel shapes, storybook charm

### wren.png — `34d6e57f-f83b-4322-af5e-bfa13eb20714`
> Portrait of Old Wren, an elderly human storyteller in their eighties with a serene knowing smile, long white hair in a single braid over the shoulder, deep smile wrinkles, soft wise grey eyes, wrapped in a thick mustard-yellow knitted shawl, resting chin slightly forward, cozy fantasy tavern game character bust, warm candlelit earth-tone palette, soft rounded pixel shapes, storybook charm

> QA note carried from ASSETS.md: `wren.png` rendered with a full white beard +
> red nose ("jolly grandfather"). Doc 03 never fixes Wren's gender — regen or
> keep is a pending user call.

---

## Mops the cat — 24×24 · `assets/pets/`

The "long striped tail clearly VISIBLE" clause is load-bearing: v1 at 16×16
omitted the tail and read as an owl. All regenerated at 24×24.

### mops_sit.png — `0ea2d55a-e179-4e25-a251-d8bc9be2d326`
> Side view of an orange tabby cat sitting, with a long striped tail clearly VISIBLE curling around its front paws, half-closed sleepy judgmental eyes drawn as flat horizontal lid lines, chunky readable game sprite, warm orange and cream palette

### mops_idle.png — `21ce2420-01dd-4c1e-a39c-3a4caa4c04ac`
> Side view of an orange tabby cat sitting upright but relaxed, looking alertly at the viewer, tail wrapped loosely around its front paws, half-closed awake eyes drawn as flat horizontal lid lines, cozy tea-shop cat, warm orange and cream palette, pixel art sprite

### mops_sleep.png — `77ea72a8-c880-4fc2-8148-2d22627af4e6`
> Side view of an orange tabby cat curled into a tight ball, fast asleep, head tucked near its tail, long striped tail clearly visible curled around its body, tiny serene smile, warm orange and cream palette, pixel art sprite

### mops_stretch.png — `8fe93c7b-efd9-4b97-8448-85c2af776433`
> Side view of an orange tabby cat stretching, front legs extended forward and back legs pushed back, long striped tail clearly visible stretched behind with gentle curve, cozy stretched cat, warm orange and cream palette, pixel art sprite

### mops_walk.png — `e4769c27-08d3-4a6f-b852-fbad1a2d401d`
> Side view of an orange tabby cat walking slowly, one front paw lifted mid-step, long striped tail clearly visible raised slightly behind for balance, cozy tea-shop cat, warm orange and cream palette, pixel art sprite

### mops_look.png — `ff2892df-d80b-414f-af32-cc26a0a8cbb9`
> Side view of an orange tabby cat sitting upright, head turned to look away from viewer with curiosity, long striped tail clearly visible resting to one side, cozy observant cat, warm orange and cream palette, pixel art sprite

---

## Observations for regen / new frames

- The walk-sprite prompts are much thinner than the portraits — no palette lock,
  no earring/beard-clip specifics — which is the likely source of the mild style
  drift between portrait and sprite. When regenerating a sprite, port the
  identifying details from that character's portrait prompt.
- Fenwick is the only character with a second walk frame (B). To give the others
  a 2-frame gait, reuse each `*_walk.png` prompt with the frame-B stride clause
  from `fenwick_walk_b`: *"mid-stride walking, front leg extended far forward and
  back leg pushing off ground, arms swinging in stride"*.
- See `docs/pixellab-prompt-pack.md` for the browser-tier settings and the
  idle/sip/pose prompts that extend this cast.
