// render/fx.ts — pooled particle FX for juice items (doc 04 §3)
// Steam wisps from served cups, heart puffs on favorite serves, cup slide
// ease-out, title-screen snowfall. Hard pool cap 40 live particles (doc 08 §4).
// ALL motion collapses to its end state under the reduced-motion setting —
// static but readable, per doc 04 §1.5.

import { Palette, paletteToCss, paletteToRgba } from './palette.js';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number; // seconds alive
  maxLife: number;
  radius: number;
  color: number;
  alpha: number;
  kind: 'steam' | 'heart' | 'sparkle';
}

const MAX_PARTICLES = 40; // doc 04 §3 / doc 08 §4 cap

let particlePool: Particle[] = [];
let activeParticles: Particle[] = [];

/** Initialize the particle pool */
export function initParticles(): void {
  particlePool = [];
  activeParticles = [];
  for (let i = 0; i < MAX_PARTICLES; i++) {
    particlePool.push(createParticle());
  }
}

function createParticle(): Particle {
  return {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    life: 1,
    maxLife: 1,
    radius: 1,
    color: Palette.accentGold,
    alpha: 1,
    kind: 'steam',
  };
}

/** Acquire a particle from the pool (recycles oldest when exhausted). */
function acquireParticle(): Particle {
  if (particlePool.length > 0) {
    return particlePool.pop()!;
  }
  // Pool exhausted — reuse the oldest active so the live count NEVER exceeds
  // the cap (doc 08 guardrail).
  if (activeParticles.length > 0) {
    return activeParticles.shift()!;
  }
  return createParticle();
}

/** Release a particle back to the pool */
function releaseParticle(p: Particle): void {
  p.life = 1;
  particlePool.push(p);
}

/** Live particle count — dev long-task audit / tests. */
export function activeParticleCount(): number {
  return activeParticles.length;
}

/**
 * Spawn steam wisps rising from a served cup while it waits on the counter.
 * Call once per spawn tick; each call adds ONE wisp.
 */
export function spawnSteamWisp(x: number, y: number): void {
  const p = acquireParticle();
  p.x = x + (Math.random() - 0.5) * 8; // slight horizontal spread
  p.y = y;
  p.vx = (Math.random() - 0.5) * 6; // gentle drift
  p.vy = -8 - Math.random() * 12; // upward
  p.life = 0;
  p.maxLife = 1.5 + Math.random() * 1.0; // 1.5-2.5 seconds
  p.radius = 3 + Math.random() * 3;
  p.color = Palette.textMuted;
  p.alpha = 0.5 + Math.random() * 0.3;
  p.kind = 'steam';
  activeParticles.push(p);
}

/** Spawn heart puff from customer on favorite serve */
export function spawnHeartPuff(x: number, y: number): void {
  const p = acquireParticle();
  p.x = x;
  p.y = y - 10; // above customer head
  p.vx = (Math.random() - 0.5) * 10;
  p.vy = -20 - Math.random() * 10;
  p.life = 0;
  p.maxLife = 1.2;
  p.radius = 6;
  p.color = Palette.accentWarm;
  p.alpha = 0.9;
  p.kind = 'heart';
  activeParticles.push(p);
}

/** Spawn sparkle on discovery / happy serves */
export function spawnSparkle(x: number, y: number): void {
  const p = acquireParticle();
  p.x = x;
  p.y = y;
  p.vx = (Math.random() - 0.5) * 20;
  p.vy = (Math.random() - 0.5) * 20;
  p.life = 0;
  p.maxLife = 0.6;
  p.radius = 2 + Math.random() * 3;
  p.color = Palette.accentGold;
  p.alpha = 1;
  p.kind = 'sparkle';
  activeParticles.push(p);
}

/** Update all active particles */
export function updateParticles(dtSec: number, reducedMotion: boolean): void {
  if (reducedMotion) {
    // In reduced motion, clear all particles immediately (static-but-readable).
    for (const p of activeParticles) releaseParticle(p);
    activeParticles = [];
    return;
  }

  for (let i = activeParticles.length - 1; i >= 0; i--) {
    const p = activeParticles[i]!;
    p.life += dtSec;

    const t = Math.min(1, p.life / p.maxLife);

    // Physics
    p.x += p.vx * dtSec;
    p.y += p.vy * dtSec;

    // Kind-specific behavior
    if (p.kind === 'steam') {
      p.vy -= 5 * dtSec; // gentle acceleration upward (buoyancy)
      p.vx *= 0.98; // horizontal dampening
      p.alpha = (1 - t) * 0.5;
      p.radius = 3 + t * 6;
    } else if (p.kind === 'heart') {
      p.vy += 30 * dtSec; // gravity pulls down after the initial float
      p.alpha = 1 - t;
      p.radius = 6 * (1 - t * 0.5);
    } else if (p.kind === 'sparkle') {
      p.vy += 10 * dtSec;
      p.alpha = 1 - t;
      p.radius = (1 - t) * 5;
    }

    // Release expired particles
    if (p.life >= p.maxLife) {
      activeParticles.splice(i, 1);
      releaseParticle(p);
    }
  }
}

/** Draw all active particles */
export function drawParticles(c: CanvasRenderingContext2D): void {
  for (const p of activeParticles) {
    c.globalAlpha = Math.max(0, Math.min(1, p.alpha));

    if (p.kind === 'heart') {
      drawHeart(c, p.x, p.y, p.radius, paletteToCss(p.color));
    } else {
      // Steam and sparkles are soft circles
      c.fillStyle = paletteToRgba(p.color, 1);
      c.beginPath();
      c.arc(Math.round(p.x), Math.round(p.y), Math.max(1, Math.round(p.radius)), 0, Math.PI * 2);
      c.fill();
    }
  }
  c.globalAlpha = 1;
}

function drawHeart(c: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string): void {
  const r = Math.max(1, Math.round(radius));
  c.fillStyle = color;
  c.beginPath();
  const cx = Math.round(x);
  const cy = Math.round(y);
  // Simple heart using two arcs and a point
  c.arc(cx - r / 2, cy - r / 2, r / 2, Math.PI, 0);
  c.arc(cx + r / 2, cy - r / 2, r / 2, Math.PI, 0);
  c.lineTo(cx, cy + r / 2);
  c.closePath();
  c.fill();
}

// ---- Cup slide (juice item 2: ease-out delivery) -----------------------------

export interface CupSlide {
  active: boolean;
  /** Eased current position. */
  x: number;
  y: number;
  /** Fixed endpoints — position is always lerp(start, target, easedT). */
  fromX: number;
  fromY: number;
  targetX: number;
  targetY: number;
  progress: number; // eased 0..1
  duration: number;
  elapsed: number;
  onComplete?: (() => void) | undefined;
}

const CUP_SLIDE_EASE_OUT = (t: number): number => 1 - Math.pow(1 - t, 3);

function freshCupSlide(): CupSlide {
  return {
    active: false,
    x: 0,
    y: 0,
    fromX: 0,
    fromY: 0,
    targetX: 0,
    targetY: 0,
    progress: 0,
    duration: 0,
    elapsed: 0,
  };
}

let cupSlide: CupSlide = freshCupSlide();

/** Start a cup slide animation (ease-out cubic, doc 04 §3 item 2). */
export function startCupSlide(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  durationSec: number = 0.6,
  onComplete?: () => void,
): void {
  cupSlide = {
    active: true,
    x: startX,
    y: startY,
    fromX: startX,
    fromY: startY,
    targetX: endX,
    targetY: endY,
    progress: 0,
    duration: Math.max(0, durationSec),
    elapsed: 0,
    onComplete,
  };
}

/**
 * Advance the cup slide by dtSec. Reduced motion (or zero duration) snaps
 * straight to the target — static but readable (doc 04 §1.5).
 */
export function updateCupSlide(dtSec: number, reducedMotion: boolean): void {
  if (!cupSlide.active) return;

  if (reducedMotion || cupSlide.duration <= 0) {
    finishCupSlide();
    return;
  }

  cupSlide.elapsed += dtSec;
  const t = Math.min(1, cupSlide.elapsed / cupSlide.duration);
  cupSlide.progress = CUP_SLIDE_EASE_OUT(t);
  cupSlide.x = cupSlide.fromX + (cupSlide.targetX - cupSlide.fromX) * cupSlide.progress;
  cupSlide.y = cupSlide.fromY + (cupSlide.targetY - cupSlide.fromY) * cupSlide.progress;

  if (t >= 1) finishCupSlide();
}

function finishCupSlide(): void {
  cupSlide.progress = 1;
  cupSlide.x = cupSlide.targetX;
  cupSlide.y = cupSlide.targetY;
  cupSlide.active = false;
  const done = cupSlide.onComplete;
  cupSlide.onComplete = undefined;
  done?.();
}

/** Get current cup slide state (for rendering/tests). */
export function getCupSlide(): CupSlide {
  return cupSlide;
}

/** Draw the sliding cup at its current position (no-op when idle/settled). */
export function drawCupSlide(c: CanvasRenderingContext2D): void {
  if (!cupSlide.active && cupSlide.progress >= 1) return; // settled — nothing to draw

  const x = Math.round(cupSlide.x);
  const y = Math.round(cupSlide.y);

  // Cup body
  c.fillStyle = paletteToCss(Palette.bgPanel);
  c.fillRect(x - 8, y - 16, 16, 18);

  // Cup rim
  c.fillStyle = paletteToCss(Palette.counterTop);
  c.fillRect(x - 10, y - 16, 20, 3);

  // Handle
  c.strokeStyle = paletteToCss(Palette.counterTop);
  c.lineWidth = 2;
  c.beginPath();
  c.arc(x + 8, y - 8, 5, -Math.PI / 2, Math.PI / 2);
  c.stroke();

  // Steam wisp above the cup while it travels
  if (cupSlide.active) {
    c.fillStyle = paletteToRgba(Palette.textMuted, 0.3);
    c.beginPath();
    c.arc(x, y - 18, 3, 0, Math.PI * 2);
    c.fill();
  }
}

/** Hide the cup entirely (scene teardown / day rollover). */
export function resetCupSlide(): void {
  cupSlide = freshCupSlide();
}

// ---- Title-screen snowfall (juice item 9, doc 04 §3) --------------------------

export interface Snowflake {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  opacity: number;
}

const MAX_SNOWFLAKES = 50;

let snowflakes: Snowflake[] = [];

/** Initialize snowfall for the title screen. */
export function initSnowfall(canvasWidth: number, canvasHeight: number): void {
  snowflakes = [];
  for (let i = 0; i < MAX_SNOWFLAKES; i++) {
    snowflakes.push({
      x: Math.random() * canvasWidth,
      y: Math.random() * canvasHeight,
      vx: (Math.random() - 0.5) * 10,
      vy: 20 + Math.random() * 30,
      radius: 1 + Math.random() * 2,
      opacity: 0.3 + Math.random() * 0.5,
    });
  }
}

/** Update snowfall. Reduced motion freezes the field as a static scatter. */
export function updateSnowfall(
  dtSec: number,
  canvasWidth: number,
  canvasHeight: number,
  reducedMotion: boolean,
): void {
  if (reducedMotion) return;

  for (const flake of snowflakes) {
    flake.x += flake.vx * dtSec;
    flake.y += flake.vy * dtSec;

    // Wrap around
    if (flake.y > canvasHeight) {
      flake.y = -10;
      flake.x = Math.random() * canvasWidth;
    }
    if (flake.x < -10) flake.x = canvasWidth + 10;
    if (flake.x > canvasWidth + 10) flake.x = -10;
  }
}

/** Draw snowfall */
export function drawSnowfall(c: CanvasRenderingContext2D): void {
  c.fillStyle = '#f5eede';
  for (const flake of snowflakes) {
    c.globalAlpha = flake.opacity;
    c.beginPath();
    c.arc(Math.round(flake.x), Math.round(flake.y), Math.max(1, Math.round(flake.radius)), 0, Math.PI * 2);
    c.fill();
  }
  c.globalAlpha = 1;
}

/** True once initSnowfall has populated flakes (tests/title wiring). */
export function hasSnowfall(): boolean {
  return snowflakes.length > 0;
}

/** Clean up all particles (scene end / day rollover). */
export function clearAllParticles(): void {
  for (const p of activeParticles) releaseParticle(p);
  activeParticles = [];
}
