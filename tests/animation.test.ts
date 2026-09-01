// tests/animation.test.ts — cozy motion language (docs/11) deterministic checks.
//
// These tests pin the PRESENTATION behavior introduced by the animation/UX
// polish pass: the easing vocabulary, the overlay open/close animation state
// machine, and the tween's reduced-motion snap. They do NOT test pixels — only
// the deterministic logic a real browser drives from (opacity/scale curves,
// phase transitions, reduced-motion collapse). Per docs/08 §4 guardrails, the
// tween helper stays <200 LOC and fully unit-testable.

import { describe, it, expect } from 'vitest';
import {
  clamp01,
  easeOutQuad,
  easeOutCubic,
  easeInCubic,
  easeInOutCubic,
  easeOutBack,
  MOTION,
  startTween,
  tickTween,
  startOverlayAnim,
  overlayPlayOpen,
  overlayPlayClose,
  overlayTick,
  overlayFinished,
  type OverlayVisual,
} from '../src/render/tween.js';
import { walkGait, walkFrameIndex } from '../src/render/scene.js';

describe('easing vocabulary (cozy motion language)', () => {
  it('clamp01 bounds the input', () => {
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(0.5)).toBe(0.5);
    expect(clamp01(2)).toBe(1);
  });

  it('all easings start and end at the endpoints', () => {
    for (const fn of [easeOutQuad, easeOutCubic, easeInCubic, easeInOutCubic]) {
      expect(fn(0)).toBeCloseTo(0, 6);
      expect(fn(1)).toBeCloseTo(1, 6);
    }
  });

  it('in/out pairs mirror around the midpoint for cubic', () => {
    // easeOutCubic(t) + easeInCubic(1-t) === 1 (enter and exit feel symmetric).
    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      expect(easeOutCubic(t) + easeInCubic(1 - t)).toBeCloseTo(1, 6);
    }
  });

  it('easeInOutCubic is monotonic and symmetric about the center', () => {
    let prev = -1;
    for (let i = 0; i <= 10; i++) {
      const v = easeInOutCubic(i / 10);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5, 6);
  });

  it('easeOutBack overshoots just past 1 then settles (subtle, not a bounce)', () => {
    // With the cozy amount it must NOT overshoot dramatically.
    expect(easeOutBack(0)).toBeCloseTo(0, 6);
    let max = 0;
    for (let i = 0; i <= 100; i++) max = Math.max(max, easeOutBack(i / 100));
    expect(max).toBeGreaterThan(1); // it does overshoot a hair
    expect(max).toBeLessThan(1.2); // but stays gentle (no boing)
    expect(easeOutBack(1)).toBeCloseTo(1, 6);
  });

  it('easeOutBack with amount 0 is a plain ease-out (no spring)', () => {
    expect(easeOutBack(0.5, 0)).toBeCloseTo(1 - Math.pow(0.5, 3), 6);
  });

  it('exposes the named motion durations', () => {
    expect(MOTION.micro).toBeGreaterThan(0);
    expect(MOTION.micro).toBeLessThan(MOTION.short);
    expect(MOTION.short).toBeLessThan(MOTION.medium);
    expect(MOTION.medium).toBeLessThan(MOTION.long);
  });
});

describe('Tween — reduced motion + determinism', () => {
  it('duration 0 snaps straight to the target (reduced motion path)', () => {
    const t = startTween(0, 10, 0);
    tickTween(t, 1);
    expect(t.value).toBe(10);
    expect(t.done).toBe(true);
  });

  it('a normal tween settles at the target exactly once duration elapses', () => {
    const t = startTween(0, 1, 1);
    tickTween(t, 0.5);
    expect(t.value).toBeGreaterThan(0);
    expect(t.value).toBeLessThan(1);
    expect(t.done).toBe(false);
    tickTween(t, 0.5); // total 1.0s
    expect(t.value).toBe(1);
    expect(t.done).toBe(true);
  });

  it('does not overshoot past the target', () => {
    const t = startTween(0, 5, 0.5);
    for (let i = 0; i < 10; i++) tickTween(t, 0.1);
    expect(t.value).toBeLessThanOrEqual(5);
  });

  it('a done tween ignores further ticks (no jitter/state corruption)', () => {
    const t = startTween(2, 8, 0.2);
    tickTween(t, 0.2);
    const settled = t.value;
    tickTween(t, 5);
    expect(t.value).toBe(settled);
  });
});

describe('OverlayAnim — open/close state machine', () => {
  const sample = (a: ReturnType<typeof startOverlayAnim>, dt: number, rm = false): OverlayVisual => {
    const v = overlayTick(a, dt, rm);
    return v;
  };

  it('starts closed and invisible', () => {
    const a = startOverlayAnim();
    expect(a.phase).toBe('closed');
    expect(overlayFinished(a)).toBe(true);
    expect(sample(a, 0.016).visible).toBe(false);
  });

  it('opening fades opacity 0→1 and scales 0.96→1, then rests open', () => {
    const a = startOverlayAnim();
    overlayPlayOpen(a);
    expect(a.phase).toBe('opening');
    const first = sample(a, 0.05);
    expect(first.opacity).toBeGreaterThan(0);
    expect(first.opacity).toBeLessThan(1);
    expect(first.scale).toBeGreaterThan(0.96);
    // run to completion
    for (let i = 0; i < 20; i++) sample(a, 0.05);
    expect(a.phase).toBe('open');
    const rest = sample(a, 0.016);
    expect(rest.opacity).toBe(1);
    expect(rest.scale).toBe(1);
    expect(rest.visible).toBe(true);
  });

  it('closing fades back out and becomes removable (no blocking)', () => {
    const a = startOverlayAnim();
    overlayPlayOpen(a);
    for (let i = 0; i < 20; i++) sample(a, 0.05);
    overlayPlayClose(a);
    expect(a.phase).toBe('closing');
    for (let i = 0; i < 20; i++) sample(a, 0.05);
    expect(a.phase).toBe('closed');
    expect(overlayFinished(a)).toBe(true);
  });

  it('reduced motion collapses open+close to instant rest (no movement)', () => {
    const a = startOverlayAnim();
    overlayPlayOpen(a);
    const v = sample(a, 0.016, true);
    expect(v.opacity).toBe(1);
    expect(v.scale).toBe(1);
    expect(a.phase).toBe('open');
    overlayPlayClose(a);
    const v2 = sample(a, 0.016, true);
    expect(v2.visible).toBe(false);
    expect(a.phase).toBe('closed');
  });

  it('re-opening after close replays cleanly (no stuck state)', () => {
    const a = startOverlayAnim();
    overlayPlayOpen(a);
    for (let i = 0; i < 20; i++) sample(a, 0.05);
    overlayPlayClose(a);
    for (let i = 0; i < 20; i++) sample(a, 0.05);
    overlayPlayOpen(a);
    expect(a.phase).toBe('opening');
    const v = sample(a, 0.02);
    expect(v.opacity).toBeLessThan(1);
    for (let i = 0; i < 20; i++) sample(a, 0.05);
    expect(a.phase).toBe('open');
  });

  it('open/close are idempotent (re-triggering mid-transition is a no-op)', () => {
    const a = startOverlayAnim();
    overlayPlayOpen(a);
    overlayPlayOpen(a);
    expect(a.phase).toBe('opening');
    for (let i = 0; i < 20; i++) sample(a, 0.05);
    overlayPlayClose(a);
    overlayPlayClose(a);
    expect(a.phase).toBe('closing');
  });
});

describe('Canvas walk gait (arrival coziness)', () => {
  it('is at rest when not arriving', () => {
    const g = walkGait(0, 1234, false);
    expect(g.moving).toBe(false);
    expect(g.bobPx).toBe(0);
  });

  it('bobs only while 0 < walkT < 1 and collapses under reduced motion', () => {
    expect(walkGait(1, 1234, false).moving).toBe(false); // arrived
    const g = walkGait(0.5, 1234, false);
    expect(g.moving).toBe(true);
    expect(g.bobPx).toBeGreaterThan(0);
    expect(g.bobPx).toBeLessThanOrEqual(2); // gentle amplitude only
    const rm = walkGait(0.5, 1234, true);
    expect(rm.moving).toBe(false);
    expect(rm.bobPx).toBe(0);
  });
});

describe('walkFrameIndex (multi-frame walk cycle, e.g. Sela a/b/c)', () => {
  it('always returns 0 for a single-frame cast member', () => {
    for (const t of [0, 55, 110, 999, 100000]) {
      expect(walkFrameIndex(1, t)).toBe(0);
      expect(walkFrameIndex(0, t)).toBe(0);
    }
  });

  it('ping-pongs a→b→c→b→a→… for 3 frames, one step per WALK_STEP_HALF_PERIOD_MS (110ms)', () => {
    expect(walkFrameIndex(3, 0)).toBe(0); // a
    expect(walkFrameIndex(3, 110)).toBe(1); // b
    expect(walkFrameIndex(3, 220)).toBe(2); // c
    expect(walkFrameIndex(3, 330)).toBe(1); // b (bounced off the end)
    expect(walkFrameIndex(3, 440)).toBe(0); // a (full cycle back to start)
    expect(walkFrameIndex(3, 550)).toBe(1); // b (repeats)
  });

  it('ping-pongs 0,1,0,1,… for exactly 2 frames', () => {
    expect(walkFrameIndex(2, 0)).toBe(0);
    expect(walkFrameIndex(2, 110)).toBe(1);
    expect(walkFrameIndex(2, 220)).toBe(0);
    expect(walkFrameIndex(2, 330)).toBe(1);
  });

  it('loop mode runs a full cycle straight through (Nia 7, Fenwick 8, Bram 10)', () => {
    for (const n of [7, 8, 10]) {
      for (let step = 0; step < 24; step++) {
        expect(walkFrameIndex(n, step * 110, 'loop')).toBe(step % n);
      }
      // wraps cleanly: last frame → 0, never bounces back
      expect(walkFrameIndex(n, (n - 1) * 110, 'loop')).toBe(n - 1);
      expect(walkFrameIndex(n, n * 110, 'loop')).toBe(0);
    }
  });

  it('loop mode still pins a single-frame cast to 0', () => {
    expect(walkFrameIndex(1, 500, 'loop')).toBe(0);
  });
});
