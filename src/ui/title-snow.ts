// ui/title-snow.ts — juice item 9 (doc 04 §3): snow drifting past the title
// screen window. Cheap reuse of render/fx.ts's snowfall pool on a small
// fixed-position canvas BEHIND the DOM title content. Respects reduced motion
// both from the OS media query and (after boot) the in-game setting; under
// reduced motion nothing is drawn at all.

import { drawSnowfall, initSnowfall, updateSnowfall } from '../render/fx.js';

const CANVAS_W = 480;
const CANVAS_H = 270;

let canvas: HTMLCanvasElement | null = null;
let rafId: number | null = null;
let last = 0;
let running = false;

/** OS-level preference at call time. */
function prefersReducedMotion(): boolean {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

function frame(now: number): void {
  rafId = requestAnimationFrame(frame);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (prefersReducedMotion()) return; // static scatter already drawn; no drift
  updateSnowfall(dt, CANVAS_W, CANVAS_H, false);
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  drawSnowfall(ctx);
}

/**
 * Attach a snowfall canvas to the title screen element. Idempotent.
 * `reducedMotion` true → skip entirely (static-but-readable title).
 */
export function attachTitleSnow(parent: HTMLElement, reducedMotion: boolean): void {
  detachTitleSnow();
  if (reducedMotion || prefersReducedMotion()) return;

  canvas = document.createElement('canvas');
  canvas.id = 'title-snow';
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  canvas.setAttribute('aria-hidden', 'true');
  parent.appendChild(canvas);

  initSnowfall(CANVAS_W, CANVAS_H);
  // Draw one static frame immediately so first paint already has snow.
  const ctx = canvas.getContext('2d');
  if (ctx) drawSnowfall(ctx);
  running = true;
  last = performance.now();
  rafId = requestAnimationFrame(frame);
}

export function detachTitleSnow(): void {
  running = false;
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  canvas?.remove();
  canvas = null;
}

/** Test/verification hook. */
export function isTitleSnowRunning(): boolean {
  return running && canvas !== null;
}
