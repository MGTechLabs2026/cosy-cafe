// render/tween.ts — tiny time-based helpers (doc 08: own ~120 LOC tween helper)
// All consumers pass dt; reduced-motion callers pass duration 0 → snap to end.
//
// Motion language (cosy-cafe animation audit, docs/11):
//   easeOutQuad   — gentle UI settle (default for overlays/panels)
//   easeOutCubic  — UI enter / decisive settle
//   easeInCubic   — UI exit (matches the enter's inverse feel)
//   easeInOutCubic— physical movement (cup slide, character walk)
//   easeOutBack   — very subtle spring emphasis (only for small celebratory beats)

export interface Tween {
  elapsed: number;
  duration: number;
  from: number;
  to: number;
  done: boolean;
  /** Eased current value. */
  value: number;
}

/** Linear→smoothstep interpolation factory (kept for callers that want the old curve). */
export function startTween(from: number, to: number, durationSec: number): Tween {
  return { elapsed: 0, duration: Math.max(0, durationSec), from, to, done: false, value: from };
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

export function tickTween(tween: Tween, dtSec: number): void {
  if (tween.done) return;
  if (tween.duration <= 0) {
    tween.value = tween.to;
    tween.done = true;
    return;
  }
  tween.elapsed = Math.min(tween.duration, tween.elapsed + Math.max(0, dtSec));
  const t = tween.elapsed / tween.duration;
  tween.value = tween.from + (tween.to - tween.from) * smoothstep(t);
  if (t >= 1) {
    tween.value = tween.to;
    tween.done = true;
  }
}

// ---- Easing vocabulary (cozy motion language, docs/11) ----------------------

export function clamp01(t: number): number {
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

/** easeOutQuad — gentle, slightly soft settle. Good default for UI panels. */
export function easeOutQuad(t: number): number {
  const x = clamp01(t);
  return 1 - (1 - x) * (1 - x);
}

/** easeOutCubic — a touch more decisive than quad; used for overlay enter. */
export function easeOutCubic(t: number): number {
  const x = clamp01(t);
  return 1 - Math.pow(1 - x, 3);
}

/** easeInCubic — the inverse feel; used for overlay exit so it does not snap. */
export function easeInCubic(t: number): number {
  const x = clamp01(t);
  return x * x * x;
}

/** easeInOutCubic — physical, weighty-but-soft. Walk-ins, cup slide, doors. */
export function easeInOutCubic(t: number): number {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

/**
 * easeOutBack — a VERY subtle spring emphasis. Used only for small celebratory
 * beats (e.g. a recipe card landing). The overshoot is intentionally tiny and
 * falls short of "bounce" — it reads as a gentle settle, never a boing.
 * `amount` is the overshoot magnitude (0 = no spring; 0.08 ≈ cozy).
 */
export function easeOutBack(t: number, amount = 0.08): number {
  const x = clamp01(t);
  const c1 = amount * 10; // map the 0..~0.1 cozy range onto the classic curve's c1
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

/** Shared named durations for the motion language (seconds). */
export const MOTION = {
  micro: 0.13, // hover/button feedback
  short: 0.22, // overlay/card enter
  medium: 0.5, // characters, doors, cups
  long: 1.0, // emotional/environmental transitions
} as const;

/**
 * Count-up helper for coins/recap (doc 05 §4). Under reduced motion the
 * display snaps to `target` immediately.
 */
export class CountUp {
  private shown: number;
  private target: number;
  private readonly perSecond: number;

  constructor(initial: number, perSecond = 24) {
    this.shown = initial;
    this.target = initial;
    this.perSecond = perSecond > 0 ? perSecond : 1;
  }

  setTarget(target: number, reducedMotion: boolean): void {
    this.target = target;
    if (reducedMotion) this.shown = target;
  }

  tick(dtSec: number): void {
    if (this.shown === this.target) return;
    const step = this.perSecond * Math.max(0, dtSec);
    if (this.target > this.shown) {
      this.shown = Math.min(this.target, this.shown + step);
    } else {
      this.shown = Math.max(this.target, this.shown - step);
    }
  }

  get value(): number {
    return Math.round(this.shown);
  }

  get settled(): boolean {
    return this.shown === this.target;
  }
}

/** Generic numeric spring-less ease used for slide-in walk-ins. */
export function easeInOut(t: number): number {
  return smoothstep(Math.max(0, Math.min(1, t)));
}

// ---- Overlay open/close animation (cozy motion language, docs/11) -----------
//
// The DOM overlays (kettle, journal, shop, settings, mailbox, letter, scene,
// recap, ending) currently toggle via `display:none` — they appear/disappear
// with no transition, which reads as a hard cut. This module holds the PURE
// animation state; the UI layer drives opacity + a gentle scale from it and
// the CSS reduced-motion rules collapse it to an instant snap. Kept DOM-free
// so it is fully unit-testable (tests/animation.test.ts) and so the same curve
// serves every overlay.
//
//   enter: opacity 0→1, scale 0.96→1   (easeOutCubic, ~short)
//   exit:  opacity 1→0, scale 1→0.98   (easeInCubic, quicker, never blocking)

export type OverlayPhase = 'closed' | 'opening' | 'open' | 'closing';

export interface OverlayAnim {
  phase: OverlayPhase;
  /** Eased 0..1 progress of the current opening/closing transition. */
  progress: number;
  readonly durationSec: number;
  readonly closingSec: number;
  elapsed: number;
}

export function startOverlayAnim(
  durationSec: number = MOTION.short,
  closingSec: number = MOTION.micro,
): OverlayAnim {
  return {
    phase: 'closed',
    progress: 0,
    durationSec: Math.max(0, durationSec),
    closingSec: Math.max(0, closingSec),
    elapsed: 0,
  };
}

/** Begin an open transition (idempotent if already open/opening). */
export function overlayPlayOpen(a: OverlayAnim): void {
  if (a.phase === 'open' || a.phase === 'opening') return;
  a.phase = 'opening';
  a.elapsed = 0;
  a.progress = 0;
}

/** Begin a close transition (idempotent if already closed/closing). */
export function overlayPlayClose(a: OverlayAnim): void {
  if (a.phase === 'closed' || a.phase === 'closing') return;
  a.phase = 'closing';
  a.elapsed = 0;
  a.progress = 0;
}

/** True once the overlay should be removed from the DOM (close finished). */
export function overlayFinished(a: OverlayAnim): boolean {
  return a.phase === 'closed';
}

/** Snapshot of the visual state for the DOM layer (opacity + scale). */
export interface OverlayVisual {
  opacity: number;
  scale: number;
  visible: boolean;
}

/**
 * Advance the overlay animation by dtSec and return its current visual state.
 * Reduced motion (or duration 0) snaps to the resting state instantly.
 */
export function overlayTick(a: OverlayAnim, dtSec: number, reducedMotion = false): OverlayVisual {
  if (a.phase === 'closed') {
    return { opacity: 0, scale: 0.96, visible: false };
  }
  if (a.phase === 'open') {
    return { opacity: 1, scale: 1, visible: true };
  }

  if (reducedMotion || (a.phase === 'opening' && a.durationSec <= 0) || (a.phase === 'closing' && a.closingSec <= 0)) {
    if (a.phase === 'opening') {
      a.phase = 'open';
      a.progress = 1;
      return { opacity: 1, scale: 1, visible: true };
    }
    a.phase = 'closed';
    a.progress = 0;
    return { opacity: 0, scale: 0.96, visible: false };
  }

  const dur = a.phase === 'opening' ? a.durationSec : a.closingSec;
  a.elapsed = Math.min(dur, a.elapsed + Math.max(0, dtSec));
  a.progress = dur <= 0 ? 1 : a.elapsed / dur;

  if (a.phase === 'opening') {
    const e = easeOutCubic(a.progress);
    if (a.progress >= 1) {
      a.phase = 'open';
      a.progress = 1;
    }
    return { opacity: e, scale: 0.96 + 0.04 * e, visible: true };
  }
  // closing
  const e = easeInCubic(a.progress);
  if (a.progress >= 1) {
    a.phase = 'closed';
    a.progress = 0;
    return { opacity: 0, scale: 0.98, visible: false };
  }
  return { opacity: 1 - 0.04 * e - e * 0.96, scale: 1 - 0.02 * e, visible: true };
}
