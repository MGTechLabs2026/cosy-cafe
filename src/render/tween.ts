// render/tween.ts — tiny time-based helpers (doc 08: own ~120 LOC tween helper)
// All consumers pass dt; reduced-motion callers pass duration 0 → snap to end.

export interface Tween {
  elapsed: number;
  duration: number;
  from: number;
  to: number;
  done: boolean;
  /** Eased current value. */
  value: number;
}

/** Linear→smoothstep interpolation factory. */
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
