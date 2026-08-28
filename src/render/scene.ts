// render/scene.ts — canvas-side world rendering: customer sprite, order bubble,
// patience candle, door sign, coin arc FX. Canvas owns the world (doc 08 §3.1);
// DOM owns all text — the bubble draws the drink ICON only, never text
// (picture-first, doc 05 §2).
//
// M4 juice pass (doc 04 §3): pooled steam wisps rise from served cups while
// they wait, a heart puff floats up on favorite serves, and the delivered cup
// slides across the counter with ease-out. All of it collapses to its readable
// static state under reduced motion.

import { Palette, paletteToCss, paletteToRgba } from './palette.js';
import { GAME_HEIGHT, GAME_WIDTH } from './scale.js';
import { easeInOut } from './tween.js';
import {
  cafeRoom,
  characterSprite,
  mopsSprite,
  mopsSpriteFor,
  opaqueBounds,
} from './images.js';
import {
  drawParticles,
  drawCupSlide,
  spawnSteamWisp,
  spawnHeartPuff,
  updateParticles,
  updateCupSlide,
} from './fx.js';

/** Steam wisp cadence while a served cup waits on the counter (seconds). */
const STEAM_SPAWN_INTERVAL_SEC = 0.45;

export interface CustomerVisual {
  /** 0..1 walk-in progress; 1 = standing at counter. */
  walkT: number;
  /** true once served — warm expression + lingering. */
  served: boolean;
  /** true when leaving (patience out or after linger). */
  leaving: boolean;
  /** Patience 0..100 for candle height/flicker. */
  patience: number;
  /** Show the chat speech icon above them? */
  showChatIcon: boolean;
  /** Drink icon Image to draw in the bubble (null = no bubble). */
  bubbleImage: HTMLImageElement | null;
  /** Bubble visible? */
  bubbleVisible: boolean;
  /** Recipe id for the color-independent shape badge (doc 05 §6). */
  bubbleRecipeId?: string | null;
  /**
   * M2: which cast member this is — picks the sprite; 'traveler' draws the
   * procedural hooded silhouette (doc 06 §3 allows placeholder art).
   */
  characterId: string;
  /** M2: Wren's unrevealed usual — bubble shows a "?" glyph instead of an icon. */
  mysteryOrder: boolean;
}

export interface SceneFx {
  /** Coin arcs: spawn point → HUD direction, life 0..1. */
  coins: { x: number; y: number; t: number }[];
  /** Sparkles for discoveries / happy serves / star-ups. */
  sparkles: { x: number; y: number; t: number }[];
}
export function createSceneFx(): SceneFx {
  return { coins: [], sparkles: [] };
}

const CUSTOMER_W = 24;
const CUSTOMER_H = 36;
/** Diegetic door-sign hitbox (canvas coords) — hangs on the PAINTED door,
 * far left of the room art. Exported for click routing. */
export const DOOR_SIGN_RECT = { x: 16, y: 100, w: 48, h: 26 };

/**
 * Playtest fix #1: gait suggestion for the walk-in. Only ONE sprite frame
 * exists per cast member, so a plain slide reads as teleporting. While
 * 0 < walkT < 1 we lift the sprite in small footstep bobs and lean it a hair
 * in the same rhythm — enough to read as walking. Reduced motion disables it.
 */
const WALK_BOB_AMPLITUDE_PX = 2;
const WALK_LEAN_RAD = 0.045;
/** Half-period of the step rhythm in ms (~4.5 steps/sec feels brisk, cozy). */
const WALK_STEP_HALF_PERIOD_MS = 110;

export interface WalkGait {
  moving: boolean;
  /** Upward lift in px (0..AMPLITUDE); subtract from the draw y. */
  bobPx: number;
  /** Tiny forward/back tilt around the ground pivot. */
  leanRad: number;
}

const GAIT_AT_REST: WalkGait = { moving: false, bobPx: 0, leanRad: 0 };

/** Gait offsets for the current walk-in frame. Pure → unit-tested. */
export function walkGait(walkT: number, timeMs: number, reducedMotion: boolean): WalkGait {
  const arriving = walkT > 0 && walkT < 1;
  if (reducedMotion || !arriving) return GAIT_AT_REST;
  const phase = Math.sin(timeMs / WALK_STEP_HALF_PERIOD_MS);
  return {
    moving: true,
    bobPx: Math.abs(phase) * WALK_BOB_AMPLITUDE_PX,
    leanRad: phase * WALK_LEAN_RAD,
  };
}
/** Walk path: the painted door (left wall) → standing spot on the OPEN FLOOR
 * in front of the counter — the art's readable ground plane (~y 250), well
 * below the counter's front face so characters don't hover at countertop height. */
const DOOR_X = 34;
const DOOR_Y = 208;
const COUNTER_X = 258;
const COUNTER_Y = 216;

function drawDoorSign(c: CanvasRenderingContext2D, open: boolean): void {
  const sx = DOOR_SIGN_RECT.x;
  const sy = DOOR_SIGN_RECT.y;
  // Solid plaque first so the painted door doesn't show through (was reading
  // as "transparent asset").
  rect(c, sx - 2, sy - 2, DOOR_SIGN_RECT.w + 4, DOOR_SIGN_RECT.h + 4, Palette.bgDeep);
  rect(c, sx, sy, DOOR_SIGN_RECT.w, DOOR_SIGN_RECT.h, open ? Palette.hearthGlow : Palette.doorSign);
  // "OPEN"/"CLOSED" pictogram: one wide bar when open, two bars when closed.
  if (open) {
    rect(c, sx + 8, sy + 11, 32, 5, Palette.bgDeep);
  } else {
    rect(c, sx + 8, sy + 7, 32, 3, Palette.bgDeep);
    rect(c, sx + 8, sy + 15, 32, 3, Palette.bgDeep);
  }
}

export function customerPosition(walkT: number): { x: number; y: number } {
  const t = easeInOut(Math.max(0, Math.min(1, walkT)));
  return {
    x: DOOR_X + (COUNTER_X - DOOR_X) * t,
    y: DOOR_Y + (COUNTER_Y - DOOR_Y) * t,
  };
}

// ---- Order-bubble hit region (playtest fix #2) -------------------------------
// Clicking the bubble above the customer opens the kettle. The bubble is pure
// canvas, so we expose its last-drawn rectangle for game.ts click routing.
// Geometry lives in ONE function shared by drawing and hit-testing so the two
// can never drift apart.

/** Rectangle in canvas coordinates for canvas-drawn click targets. */
export interface HitRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Bubble layout for a customer anchor point (x = sprite center, y = top).
 * Mirrors drawBubble()'s panel geometry; +6 covers the pointer tail. */
export function bubbleRectFor(anchorX: number, anchorY: number): HitRect {
  const w = 56;
  const h = 42;
  return {
    x: Math.round(anchorX - w / 2),
    y: Math.round(anchorY - CUSTOMER_H - h - 8),
    w,
    h: h + 6,
  };
}

/** Rect of the bubble drawn on the MOST RECENT frame; null when none drawn.
 * Cleared whenever no bubble renders — a stale rect must never stay clickable
 * after the customer leaves (playtest fix #2). */
let lastDrawnBubbleRect: HitRect | null = null;

/** Current clickable bubble region (canvas coords), or null if no bubble. */
export function getBubbleRect(): HitRect | null {
  return lastDrawnBubbleRect;
}

/** Forget the bubble hit region (no customer / bubble hidden this frame). */
export function clearBubbleRect(): void {
  lastDrawnBubbleRect = null;
}

/** Current clickable Mops region (canvas coords), or null if no Mops. */
let lastMopsHitRect: HitRect | null = null;

export function setMopsHitRect(rect: HitRect | null): void {
  lastMopsHitRect = rect;
}

export function getMopsHitRect(): HitRect | null {
  return lastMopsHitRect;
}

export function clearMopsHitRect(): void {
  lastMopsHitRect = null;
}

/** Generic cast sprite draw: 2× integer scale, grounded by OPAQUE bounds.
 * `gait` carries the walk-in bob+lean (playtest fix #1); zero at rest. */
function drawCharacterSprite(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  served: boolean,
  characterId: string,
  gait: WalkGait = { moving: false, bobPx: 0, leanRad: 0 },
): void {
  const img = characterSprite(characterId);
  // Shadow stays GLUED to the floor: it must not bob with the body, or the
  // figure looks like it's hovering instead of stepping.
  ellipseShadow(c, x + CUSTOMER_W / 2, y + CUSTOMER_H - 1, 17, 5);
  if (img && img.complete && img.naturalWidth > 0) {
    const b = opaqueBounds(img);
    if (b) {
      const SCALE = 2;
      const dw = (b.maxX - b.minX + 1) * SCALE;
      const dh = (b.maxY - b.minY + 1) * SCALE;
      const idleBob = served ? Math.round(Math.sin(Date.now() / 400)) : 0;
      const drawY = Math.round(y + CUSTOMER_H - dh - gait.bobPx) + idleBob;
      // Center horizontally on the walk point; bottom of VISIBLE pixels on the
      // ground line. The lean pivots around the FEET so the head swings while
      // the contact point holds — a tilt around the center would read as
      // floating instead of striding.
      if (gait.moving && gait.leanRad !== 0) {
        const pivotX = x + CUSTOMER_W / 2;
        const pivotY = y + CUSTOMER_H;
        c.save();
        c.translate(pivotX, pivotY);
        c.rotate(gait.leanRad);
        c.drawImage(
          img,
          b.minX,
          b.minY,
          b.maxX - b.minX + 1,
          b.maxY - b.minY + 1,
          Math.round(-dw / 2),
          Math.round(-dh),
          dw,
          dh,
        );
        c.restore();
        return;
      }
      c.drawImage(
        img,
        b.minX,
        b.minY,
        b.maxX - b.minX + 1,
        b.maxY - b.minY + 1,
        Math.round(x + CUSTOMER_W / 2 - dw / 2),
        drawY,
        dw,
        dh,
      );
      return;
    }
  }
  if (!img || characterId === 'traveler') {
    drawTravelerSilhouette(c, x, y, served);
    return;
  }
  // Sprite still loading: placeholder pixel-figure keeps the silhouette.
  const coat = served ? Palette.accentWarm : Palette.wallLow;
  rect(c, x, y, CUSTOMER_W, CUSTOMER_H - 14, coat);
  rect(c, x + 4, y - 10, 16, 12, Palette.hearthGlow);
}

/**
 * Procedural traveler — hooded figure placeholder (doc 06 §3 M2 exit criteria
 * explicitly allow placeholder art; travelers get generic sprites post-MVP).
 * Same 24×36 footprint and ground line as real sprites so they slot into the
 * walk path unchanged.
 */
function drawTravelerSilhouette(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  served: boolean,
): void {
  const cloak = Palette.bgPanelBorder;
  const hoodTrim = served ? Palette.hearthGlow : Palette.textMuted;
  // Cloak body (tapered).
  rect(c, x + 4, y + 8, 16, 20, cloak);
  rect(c, x + 6, y + 28, 12, 4, cloak); // hem
  // Hood: rounded top over a dark face gap.
  rect(c, x + 5, y + 0, 14, 10, cloak);
  rect(c, x + 7, y - 2, 10, 3, cloak);
  rect(c, x + 8, y + 4, 8, 5, Palette.bgDeep); // shadowed face gap
  rect(c, x + 9, y + 5, 2, 2, hoodTrim); // faint glint under the hood
}

/** Soft elliptical contact shadow under a standing character/prop. */
function ellipseShadow(c: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number): void {
  c.fillStyle = 'rgba(15, 10, 20, 0.35)';
  c.beginPath();
  c.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  c.fill();
}

/**
 * Color-independence (doc 05 §6): every drink family also differs by SILHOUETTE
 * — a small glyph badge in its own lane beside the icon art. Families:
 * tea → leaf · milk cup → round cup · cocoa mug → handled mug ·
 * tisane/foam → tumbler glass · broth → bowl.
 */
type BubbleShape = 'leaf' | 'cup' | 'mug' | 'glass' | 'bowl';

const SHAPE_BY_RECIPE_ID: Readonly<Record<string, BubbleShape>> = {
  R001: 'leaf', // Black Tea — leaf family
  R003: 'leaf', // Moonleaf Tea — leaf family
  R002: 'cup', // Honey Milk — round cup family
  R008: 'cup', // Wren's Usual — same family as R002 (same drink, revealed name)
  R004: 'mug', // Ember Cocoa — handled mug family
  R005: 'glass', // Cloud Foam — tall glass family
  R006: 'glass', // Iced Berry Tisane — tall glass family
  R007: 'bowl', // Root & Remedy Broth — bowl family
};

function shapeForRecipe(recipeId: string | null): BubbleShape {
  if (recipeId && SHAPE_BY_RECIPE_ID[recipeId]) return SHAPE_BY_RECIPE_ID[recipeId]!;
  return 'cup';
}

/** Draw the silhouette badge glyph inside a 12×12 chip origin. */
function drawShapeBadge(c: CanvasRenderingContext2D, x: number, y: number, shape: BubbleShape): void {
  c.fillStyle = paletteToCss(Palette.bgDeep);
  switch (shape) {
    case 'leaf':
      // Slanted leaf: stem line + pointed blade.
      c.fillRect(x + 1, y + 5, 1, 4); // stem
      c.fillRect(x + 2, y + 2, 3, 3); // blade
      c.fillRect(x + 3, y + 1, 2, 1);
      break;
    case 'cup':
      // Round cup: body + foot, no handle.
      c.fillRect(x, y + 2, 7, 4);
      c.fillRect(x + 1, y + 6, 5, 1);
      break;
    case 'mug':
      // Mug with a side handle.
      c.fillRect(x, y + 2, 6, 4);
      c.fillRect(x + 6, y + 3, 2, 2); // handle loop
      break;
    case 'glass':
      // Tall tumbler: narrow column.
      c.fillRect(x + 1, y, 4, 7);
      break;
    case 'bowl':
      // Wide bowl with a base.
      c.fillRect(x, y + 3, 8, 3);
      c.fillRect(x + 2, y + 6, 4, 1);
      break;
  }
}

function drawBubble(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  image: HTMLImageElement | null,
  timeMs: number,
  mysteryOrder: boolean = false,
  recipeId: string | null = null,
): void {
  // Layout: [shape lane 16px][icon at NATIVE 32×32] — downscaling pixel art to
  // 24px mangles it regardless of smoothing mode, so the bubble grows instead.
  const w = 56;
  const h = 42;
  const bx = Math.round(x - w / 2);
  const by = Math.round(y - CUSTOMER_H - h - 8);
  rect(c, bx, by, w, h, Palette.bgPanel);
  rectOutline(c, bx, by, w, h, Palette.bgPanelBorder);
  // Tail pointing down at the customer.
  c.fillStyle = paletteToCss(Palette.bgPanel);
  c.beginPath();
  c.moveTo(x - 3, by + h);
  c.lineTo(x + 3, by + h);
  c.lineTo(x, by + h + 5);
  c.closePath();
  c.fill();

  // Shape lane (color-independent identification, doc 05 §6): outlined chip on
  // the left, glyph inside. Reads even when the icon art fails to load.
  const chipX = bx + 2;
  const chipY = Math.round(by + h / 2) - 7;
  c.fillStyle = paletteToCss(Palette.bgPanelBorder);
  c.fillRect(chipX, chipY, 12, 14);
  drawShapeBadge(c, chipX + 2, chipY + 3, shapeForRecipe(recipeId));

  const iconX = bx + 20;
  if (mysteryOrder) {
    // Wren's unrevealed "usual" — a calm "?" glyph in the icon slot, never a
    // wrong drink hint (doc 05 §3.1: generic-cup icon with "?"). The cup badge
    // already says "drink" without guessing at the recipe.
    c.fillStyle = paletteToCss(Palette.accentGold);
    c.fillRect(iconX + 5, by + 12, 10, 3); // top bar
    c.fillRect(iconX + 12, by + 15, 3, 4); // upper hook
    c.fillRect(iconX + 8, by + 19, 5, 3); // middle nub
    c.fillRect(iconX + 8, by + 26, 3, 3); // dot
    return;
  }
  if (image && image.complete && image.naturalWidth > 0) {
    c.drawImage(image, iconX, by + 5);
  } else {
    // Icon still loading (or missing asset): gentle pulse square keeps the
    // promise of a picture without inventing one.
    const pulse = 0.5 + 0.5 * Math.sin(timeMs / 300);
    c.fillStyle = paletteToRgba(Palette.accentGold, 0.3 + 0.4 * pulse);
    c.fillRect(iconX + 8, by + 9, 16, 16);
  }
}

function drawCandle(c: CanvasRenderingContext2D, x: number, y: number, patience: number, timeMs: number): void {
  // Candle icon that shortens; flickers below 30 but stays calm in color.
  const frac = Math.max(0, Math.min(1, patience / 100));
  const maxH = 14;
  const h = Math.max(1, Math.round(maxH * frac));
  let wax: number = Palette.accentWarm;
  if (frac < 0.3) {
    // 0.5 Hz flicker via slow sine — seizure-safe (doc 05 §6).
    const flicker = Math.sin(timeMs / 1000) > 0.3;
    wax = flicker ? Palette.hearthGlow : Palette.accentWarm;
  }
  rect(c, x, y - h, 4, h, Palette.textPrimary); // wax column shrinks
  rect(c, x - 1, y - h - 2, 6, 2, wax); // flame
  rectOutline(c, x - 2, y - maxH - 3, 8, maxH + 4, Palette.bgPanelBorder); // frame
}

function drawChatIcon(c: CanvasRenderingContext2D, x: number, y: number, timeMs: number): void {
  // Small speech-bubble glyph inviting the optional chat (§3.2).
  const bob = Math.sin(timeMs / 400) * 1.5;
  const ix = Math.round(x + CUSTOMER_W + 2);
  const iy = Math.round(y - 26 + bob);
  rect(c, ix, iy, 12, 9, Palette.bgPanel);
  rectOutline(c, ix, iy, 12, 9, Palette.bgPanelBorder);
  rect(c, ix + 3, iy + 9, 3, 2, Palette.bgPanel);
}

function drawCoinAndSparkles(c: CanvasRenderingContext2D, fx: SceneFx, dtSec: number): void {
  for (const coin of fx.coins) {
    coin.t += dtSec;
    const t = Math.min(1, coin.t);
    const cx = coin.x - 40 * t;
    const cy = coin.y - 46 * Math.sin(t * Math.PI);
    c.globalAlpha = 1 - t * 0.6;
    rect(c, cx, cy, 6, 6, Palette.accentStar);
    c.globalAlpha = 1;
  }
  fx.coins = fx.coins.filter((coin) => coin.t < 1);

  for (const sp of fx.sparkles) {
    sp.t += dtSec;
    const t = Math.min(1, sp.t);
    c.globalAlpha = 1 - t;
    const r = 1 + 3 * t;
    rect(c, sp.x - r / 2, sp.y - r / 2, r, r, Palette.accentGold);
    c.globalAlpha = 1;
  }
  fx.sparkles = fx.sparkles.filter((sp) => sp.t < 1);
}

function rect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: number): void {
  c.fillStyle = paletteToCss(color);
  c.fillRect(Math.floor(x), Math.floor(y), Math.ceil(w), Math.ceil(h));
}

function rectOutline(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: number): void {
  c.strokeStyle = paletteToCss(color);
  c.strokeRect(Math.floor(x) + 0.5, Math.floor(y) + 0.5, Math.max(0, Math.floor(w) - 1), Math.max(0, Math.floor(h) - 1));
}

export interface SceneInput {
  serviceOpen: boolean;
  prepPhase: boolean;
  customer: CustomerVisual | null;
  mopsAsleep?: boolean;
  kettleGlint: boolean;
  journalPulse: boolean;
  reducedMotion: boolean;
  timeMs: number;
  /** M2 upgrades: window bench (Mops moves some days) + hearth glow. */
  hasWindowBench: boolean;
  hasHearthExpansion: boolean;
  /** Mops state from sim/mops.ts. */
  mopsState: import('../sim/mops.js').MopsState | null;
  /** Murky-brew event timestamp for sniff reaction. */
  murkyBrewMs: number;
  /** Customer-choose event timestamp. */
  chooseCustomerMs: number;
}

/** Module-level juice state for the served-cup steam cadence. */
let steamSpawnAccumSec = 0;

/**
 * World-layer overlay drawn ON TOP of the M0 room each frame while in café.
 * The room itself stays drawCafeRoom(); this adds the living parts.
 */
export function drawSceneLayer(c: CanvasRenderingContext2D, input: SceneInput, fx: SceneFx, dtSec: number): void {
  drawDoorSign(c, input.serviceOpen);

  // Hearth expansion glow — a soft warm halo over the hearth area (bottom
  // right), breathing slowly. Reduced motion: static tint, no pulse.
  if (input.hasHearthExpansion) {
    const glowAlpha = input.reducedMotion ? 0.22 : 0.18 + 0.1 * Math.sin(input.timeMs / 700);
    c.fillStyle = paletteToRgba(Palette.hearthGlow, glowAlpha);
    c.fillRect(GAME_WIDTH - 100, 168, 88, 48);
    c.fillStyle = paletteToRgba(Palette.accentGold, glowAlpha * 0.5);
    c.fillRect(GAME_WIDTH - 84, 184, 56, 22);
  }

  // Kettle glint during morning tutorial moments — sits over the PAINTED
  // copper kettle (center-left of the room art), not the old placeholder spot.
  if (input.kettleGlint && !input.reducedMotion) {
    const g = 0.35 + 0.35 * Math.sin(input.timeMs / 350);
    c.fillStyle = paletteToRgba(Palette.accentGold, g);
    c.fillRect(196, 154, 30, 3);
  }

  // Journal pulse hint (morning, day 1) — soft border breathing.
  if (input.journalPulse && !input.reducedMotion) {
    const p = 0.25 + 0.25 * Math.sin(input.timeMs / 500);
    c.strokeStyle = paletteToRgba(Palette.accentGold, p);
    c.strokeRect(GAME_WIDTH - 44.5, 96.5, 36, 30);
  }

  // Mops — state-driven sprite + ambient behaviors.
  const mopsState = input.mopsState ?? null;
  clearMopsHitRect();
  if (mopsState) {
    const img = mopsSpriteFor(mopsState.name);
    const b = img && img.complete && img.naturalWidth > 0 ? opaqueBounds(img) : null;
    const groundY = mopsState.groundY;
    const centerX = Math.round(mopsState.x);
    ellipseShadow(c, centerX, groundY + 1, 20, 5);
    if (img && b) {
      const SCALE = 2;
      const dw = (b.maxX - b.minX + 1) * SCALE;
      const dh = (b.maxY - b.minY + 1) * SCALE;
      const bob = mopsState.name === 'sleep' && !input.reducedMotion ? Math.round(Math.sin(input.timeMs / 900) * 1.2) : 0;
      const drawY = Math.round(groundY - dh) + bob;
      c.drawImage(img, b.minX, b.minY, b.maxX - b.minX + 1, b.maxY - b.minY + 1, Math.round(centerX - dw / 2), drawY, dw, dh);
      if (mopsState.name === 'sleep' && !input.reducedMotion && Math.sin(input.timeMs / 900) > 0.6) {
        rect(c, centerX + 16, drawY - 8, 3, 3, Palette.textMuted);
        rect(c, centerX + 22, drawY - 15, 3, 3, Palette.textMuted);
      }
      setMopsHitRect({
        x: Math.round(centerX - dw / 2),
        y: drawY,
        w: dw,
        h: dh,
      });
    } else {
      rect(c, centerX - 10, groundY - 12, 18, 11, Palette.accentWarm);
      rect(c, centerX + 6, groundY - 16, 6, 6, Palette.accentWarm);
      setMopsHitRect({
        x: centerX - 10,
        y: groundY - 16,
        w: 24,
        h: 18,
      });
    }
  }

  const cv = input.customer;
  let serveSpot: { x: number; y: number } | null = null;
  if (cv) {
    const pos = customerPosition(cv.walkT);
    // Walk-in gait (playtest fix #1): bob+lean only while entering; collapses
    // to rest for reduced motion.
    const gait = walkGait(cv.walkT, input.timeMs, input.reducedMotion);
    drawCharacterSprite(c, pos.x, pos.y, cv.served, cv.characterId, gait);

    if (cv.bubbleVisible) {
      drawBubble(c, pos.x + CUSTOMER_W / 2, pos.y, cv.bubbleImage, input.timeMs, cv.mysteryOrder, cv.bubbleRecipeId);
      // Publish the bubble's live rect from the SHARED geometry helper so the
      // clickable region always matches what was drawn this frame.
      lastDrawnBubbleRect = bubbleRectFor(pos.x + CUSTOMER_W / 2, pos.y);
    } else {
      lastDrawnBubbleRect = null;
    }

    if (!cv.served && !cv.leaving) {
      drawCandle(c, pos.x - 8, pos.y + 6, cv.patience, input.timeMs);
      if (cv.showChatIcon) drawChatIcon(c, pos.x, pos.y, input.timeMs);
    }
    // Served customers hold the cup at the counter — remember the spot so
    // steam keeps rising from it while they linger (doc 04 §3 item 1).
    if (cv.served) {
      serveSpot = { x: pos.x + CUSTOMER_W / 2 + 14, y: pos.y + CUSTOMER_H - 6 };
    }
  } else {
    // No customer at all — the bubble must not stay clickable as a ghost
    // after a visit ends (playtest fix #2).
    lastDrawnBubbleRect = null;
  }

  // Steam wisps from the waiting served cup (juice item 1). Reduced motion:
  // no particles spawn at all — the scene stays fully readable static.
  if (serveSpot && !input.reducedMotion) {
    steamSpawnAccumSec += dtSec;
    if (steamSpawnAccumSec >= STEAM_SPAWN_INTERVAL_SEC) {
      steamSpawnAccumSec = 0;
      spawnSteamWisp(serveSpot.x, serveSpot.y);
    }
  } else {
    steamSpawnAccumSec = 0;
  }

  // Pooled particle update + draw (steam / hearts / sparkles). The update call
  // itself clears everything instantly under reduced motion.
  updateParticles(dtSec, input.reducedMotion);
  drawParticles(c);

  // Cup slide ease-out on delivery (juice item 2).
  updateCupSlide(dtSec, input.reducedMotion);
  drawCupSlide(c);

  drawCoinAndSparkles(c, fx, dtSec);
}
