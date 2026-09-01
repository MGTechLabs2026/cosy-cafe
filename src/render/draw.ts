// Canvas2D renderer — doc 08 §3.1/§3.2
// Canvas owns the 480×270 game world; DOM owns all text/UI.
// Escape-hatch interface (§7): blit, blitAtlasFrame, rect, particle, begin/endFrame.

import { Palette, paletteToCss, paletteToRgba } from './palette.js';
import { GAME_HEIGHT, GAME_WIDTH } from './scale.js';
import { cafeRoom } from './images.js';
import type { RoomVariant } from '../sim/day.js';

let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;

/**
 * Which backdrop drawCafeRoom() paints. The game loop (main.ts) draws the room
 * without a handle on day state, so the controller hands it a reader here —
 * same pattern as setCafeDomPhaseProvider. Defaults to 'day' until wired.
 */
let roomVariantProvider: () => RoomVariant = () => 'day';
export function setRoomVariantProvider(read: () => RoomVariant): void {
  roomVariantProvider = read;
}

// Crossfade between backdrops: when the provider returns a new variant (door
// opens → morning→day; last customer leaves → day→evening) the new art fades
// in over the old rather than cutting. Timed off performance.now() since
// drawCafeRoom() gets no dt. Reduced motion snaps.
const ROOM_FADE_MS = 1400;
let shownVariant: RoomVariant | null = null;
let fadeToVariant: RoomVariant | null = null;
let fadeStartMs = 0;

function reducedMotion(): boolean {
  return typeof document !== 'undefined'
    && document.documentElement.classList.contains('reduced-motion');
}

/**
 * Bind the renderer to a specific canvas element. Called by the bootstrap
 * AFTER appending the element to the DOM. Rebinding is cheap and idempotent;
 * it exists because module-level caching alone can outlive the DOM node
 * (HMR / re-bootstrap), leaving draws going to a detached ghost canvas.
 */
export function bindCanvas(el: HTMLCanvasElement): CanvasRenderingContext2D {
  el.width = GAME_WIDTH;
  el.height = GAME_HEIGHT;
  const context = el.getContext('2d', { alpha: false });
  if (!context) throw new Error('Canvas2D context unavailable');
  context.imageSmoothingEnabled = false;
  canvas = el;
  ctx = context;
  return context;
}

/** Create a fresh canvas and bind it. Prefer bindCanvas for re-bootstrap safety. */
export function initCanvas(): HTMLCanvasElement {
  const el = document.createElement('canvas');
  el.id = 'game-canvas';
  bindCanvas(el);
  return el;
}

/** Bind to an existing connected canvas if present; otherwise create + attach. */
export function ensureCanvas(parent: HTMLElement): HTMLCanvasElement {
  const existing = parent.querySelector<HTMLCanvasElement>('#game-canvas');
  if (existing && existing.isConnected) {
    bindCanvas(existing);
    return existing;
  }
  const el = initCanvas();
  parent.appendChild(el);
  return el;
}

export function getCanvas(): HTMLCanvasElement {
  if (!canvas) return initCanvas();
  return canvas;
}

export function getContext(): CanvasRenderingContext2D {
  if (!ctx) initCanvas();
  return ctx as CanvasRenderingContext2D;
}

/** Clear the backbuffer with the deep background color and return its context. */
export function beginFrame(): CanvasRenderingContext2D {
  const c = getContext();
  c.fillStyle = paletteToCss(Palette.bgDeep);
  c.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  return c;
}

/** Present a frame. Placeholder for future dirty-flag/idle logic. */
export function endFrame(): void {
  // Future: dirty-flag rendering — idle screens can drop to ~1 Hz repaints.
}

/** Filled rectangle in palette colors, pixel-aligned. */
export function rect(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: number,
): void {
  c.fillStyle = paletteToCss(color);
  c.fillRect(Math.floor(x), Math.floor(y), Math.ceil(w), Math.ceil(h));
}

/** Outlined rectangle in palette colors, pixel-aligned. */
export function rectOutline(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: number,
): void {
  c.strokeStyle = paletteToCss(color);
  c.strokeRect(
    Math.floor(x) + 0.5,
    Math.floor(y) + 0.5,
    Math.max(0, Math.floor(w) - 1),
    Math.max(0, Math.floor(h) - 1),
  );
}

/** Blit a full source image at pixel scale (art arrives post-M0). */
export function blit(
  c: CanvasRenderingContext2D,
  image: CanvasImageSource,
  x: number,
  y: number,
): void {
  c.drawImage(image, Math.round(x), Math.round(y));
}

/** Blit a named atlas frame (atlas pipeline arrives post-M0). */
export function blitAtlasFrame(
  c: CanvasRenderingContext2D,
  atlas: CanvasImageSource,
  frame: { x: number; y: number; w: number; h: number },
  x: number,
  y: number,
): void {
  c.drawImage(
    atlas,
    frame.x,
    frame.y,
    frame.w,
    frame.h,
    Math.round(x),
    Math.round(y),
    frame.w,
    frame.h,
  );
}

/** Single pooled-particle primitive (pool itself lives in render/fx.ts later). */
export function particle(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: number,
  alpha: number,
): void {
  c.globalAlpha = Math.max(0, Math.min(1, alpha));
  c.fillStyle = paletteToCss(color);
  c.beginPath();
  c.arc(x, y, radius, 0, Math.PI * 2);
  c.fill();
  c.globalAlpha = 1;
}

/**
 * Room base: the real generated café art (480×270) when loaded; otherwise the
 * M0 warm-band placeholder so the screen is never blank during load.
 */
export function drawCafeRoom(c: CanvasRenderingContext2D): void {
  const want = roomVariantProvider();
  const now = performance.now();
  if (shownVariant === null) shownVariant = want; // first frame: no fade

  // A new target starts (or re-aims) a crossfade from whatever's on screen.
  if (want !== shownVariant && want !== fadeToVariant) {
    if (reducedMotion()) {
      shownVariant = want;
      fadeToVariant = null;
    } else {
      fadeToVariant = want;
      fadeStartMs = now;
    }
  }

  const base = cafeRoom(shownVariant);
  if (base.complete && base.naturalWidth > 0) {
    c.drawImage(base, 0, 0);
    if (fadeToVariant) {
      const top = cafeRoom(fadeToVariant);
      if (top.complete && top.naturalWidth > 0) {
        const t = Math.min(1, (now - fadeStartMs) / ROOM_FADE_MS);
        const eased = t * t * (3 - 2 * t); // smoothstep
        c.save();
        c.globalAlpha = eased;
        c.drawImage(top, 0, 0);
        c.restore();
        if (t >= 1) {
          shownVariant = fadeToVariant;
          fadeToVariant = null;
        }
      }
      // target still loading → hold on base this frame, retry next
    }
    return;
  }
  // Walls: three horizontal bands, warm and dim toward the top.
  rect(c, 0, 0, GAME_WIDTH, 100, Palette.wallTop);
  rect(c, 0, 100, GAME_WIDTH, 70, Palette.wallMid);
  rect(c, 0, 170, GAME_WIDTH, 40, Palette.wallLow);

  // Floor plank bands.
  rect(c, 0, 210, GAME_WIDTH, 60, Palette.floor);
  for (let bandY = 218; bandY < 270; bandY += 16) {
    rect(c, 0, bandY, GAME_WIDTH, 1, Palette.wallMid);
  }

  // Counter along the bottom third.
  const counterX = 100;
  const counterY = 190;
  const counterW = 280;
  rect(c, counterX - 6, counterY + 40, counterW + 12, 10, Palette.hearth); // base shadow strip
  rect(c, counterX, counterY, counterW, 40, Palette.counter);
  rect(c, counterX, counterY, counterW, 5, Palette.counterTop);

  // Kettle spot on the left of the counter top.
  rect(c, counterX + 28, counterY - 22, 30, 22, Palette.kettleSpot);
  rectOutline(c, counterX + 28, counterY - 22, 30, 22, Palette.bgDeep);

  // Prep tray spot (center) — empty for now.
  rect(c, counterX + 120, counterY - 14, 44, 14, Palette.hearth);

  // Serve spot (right) — empty for now.
  rect(c, counterX + 216, counterY - 12, 36, 12, Palette.hearthGlow);

  // Door sign spot on the right wall.
  rect(c, GAME_WIDTH - 116, 118, 76, 32, Palette.doorSign);
  rectOutline(c, GAME_WIDTH - 116, 118, 76, 32, Palette.bgDeep);

  // Hearth glow block, bottom right.
  rect(c, GAME_WIDTH - 92, 176, 72, 34, Palette.hearth);
  rect(c, GAME_WIDTH - 84, 184, 56, 18, Palette.hearthGlow);
}

/** Debug grid overlay (dev builds only). */
export function drawDebugGrid(c: CanvasRenderingContext2D, size = 16): void {
  c.strokeStyle = paletteToRgba(Palette.textMuted, 0.15);
  c.lineWidth = 1;
  for (let x = 0; x <= GAME_WIDTH; x += size) {
    c.beginPath();
    c.moveTo(x + 0.5, 0);
    c.lineTo(x + 0.5, GAME_HEIGHT);
    c.stroke();
  }
  for (let y = 0; y <= GAME_HEIGHT; y += size) {
    c.beginPath();
    c.moveTo(0, y + 0.5);
    c.lineTo(GAME_WIDTH, y + 0.5);
    c.stroke();
  }
}
