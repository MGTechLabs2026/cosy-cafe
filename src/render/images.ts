// render/images.ts — tiny preloaded-image registry (doc 08: canvas owns art).
// All game art lives under <base>/assets/** (served from public/). Images start
// loading at bootstrap so the scene never waits on disk mid-frame; draw calls
// guard with `complete && naturalWidth > 0` and fall back to placeholders.
//
// M4 (doc 07 §3): every runtime path is prefixed with import.meta.env.BASE_URL
// so the itch.io HTML5 build works inside its iframe subpath (vite base './').

/** Resolve a public/ asset path against the deploy base (relative on itch). */
export function assetUrl(path: string): string {
  const base = import.meta.env.BASE_URL ?? '/';
  return `${base}${path}`.replace(/\/{2,}/g, '/');
}

const cache = new Map<string, HTMLImageElement>();

export function loadImage(src: string): HTMLImageElement {
  let img = cache.get(src);
  if (!img) {
    img = new Image();
    img.src = src;
    cache.set(src, img);
  }
  return img;
}

/** Convenience for drink icons: `<base>/assets/items/<file>`. */
export function loadDrinkIcon(file: string): HTMLImageElement {
  return loadImage(assetUrl(`assets/items/${file}`));
}

/** Character walk sprite by cast id (travelers draw procedurally instead). */
export function characterSprite(characterId: string): HTMLImageElement | null {
  switch (characterId) {
    case 'fenwick':
      return fenwickSprite();
    case 'sela':
      return loadImage(assetUrl('assets/sprites/sela_walk.png'));
    case 'bram':
      return loadImage(assetUrl('assets/sprites/bram_walk.png'));
    case 'nia':
      return loadImage(assetUrl('assets/sprites/nia_walk.png'));
    case 'wren':
      return loadImage(assetUrl('assets/sprites/wren_walk.png'));
    default:
      return null; // traveler: procedural silhouette (doc 06 §3 placeholder art)
  }
}

/** 48×48 journal/portrait art by cast id. */
export function portraitSprite(characterId: string): HTMLImageElement | null {
  switch (characterId) {
    case 'fenwick':
      return loadImage(assetUrl('assets/portraits/fenwick.png'));
    case 'sela':
      return loadImage(assetUrl('assets/portraits/sela.png'));
    case 'bram':
      return loadImage(assetUrl('assets/portraits/bram.png'));
    case 'nia':
      return loadImage(assetUrl('assets/portraits/nia.png'));
    case 'wren':
      return loadImage(assetUrl('assets/portraits/wren.png'));
    default:
      return null;
  }
}

/** Bubble glyph for Wren's unrevealed "usual" — drawn procedurally in scene.ts. */
export const MYSTERY_ORDER = '?';

export function fenwickSprite(): HTMLImageElement {
  return loadImage(assetUrl('assets/sprites/fenwick_walk.png'));
}

export function mopsSprite(): HTMLImageElement {
  return loadImage(assetUrl('assets/pets/mops_sit.png'));
}

export function cafeRoom(): HTMLImageElement {
  return loadImage(assetUrl('assets/backgrounds/cafe_room.png'));
}

/**
 * Kick off loads for every drink icon at bootstrap so bubbles never wait on
 * disk mid-service. Individual getters above remain lazy-safe regardless.
 */
export function preloadGameArt(recipeIcons?: string[]): void {
  for (const f of recipeIcons ?? []) loadDrinkIcon(f);
}

export interface SpriteBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

const boundsCache = new WeakMap<HTMLImageElement, SpriteBounds>();

/**
 * Opaque-pixel bounding box of a loaded sprite (alpha > 8), scanned once and
 * cached. Used to ground sprites by their VISIBLE feet rather than the canvas
 * edge — generated art often carries transparent padding rows at the bottom,
 * which made characters appear to float above the floor.
 */
export function opaqueBounds(img: HTMLImageElement): SpriteBounds | null {
  if (!img.complete || img.naturalWidth === 0) return null;
  const cached = boundsCache.get(img);
  if (cached) return cached;

  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const cx = cv.getContext('2d', { willReadFrequently: true });
  if (!cx) return null;
  cx.drawImage(img, 0, 0);
  const data = cx.getImageData(0, 0, w, h).data;

  let minX = w,
    minY = h,
    maxX = -1,
    maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const alpha = data[(y * w + x) * 4 + 3] ?? 0;
      if (alpha > 8) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0 || minY === h || minX === w) return null;
  const b: SpriteBounds = { minX, minY, maxX, maxY };
  boundsCache.set(img, b);
  return b;
}

/** Warm the ENTIRE art cache (call at bootstrap, during the title screen). */
export function preloadAllArt(recipeIcons?: string[]): void {
  cafeRoom();
  fenwickSprite();
  mopsSprite();
  preloadGameArt(recipeIcons);
  // M2 cast: every walk sprite + portrait warms at boot so no arrival or
  // journal open ever waits on disk mid-frame.
  for (const id of ['sela', 'bram', 'nia', 'wren']) characterSprite(id);
  for (const id of ['fenwick', 'sela', 'bram', 'nia', 'wren']) portraitSprite(id);
}
