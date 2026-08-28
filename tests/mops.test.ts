import { describe, it, expect } from 'vitest';
import { createInitialMopsState, tickMops, petMops, mopsHitRect } from '../src/sim/mops';

describe('mops state machine', () => {
  it('starts idle at hearth', () => {
    const state = createInitialMopsState();
    expect(state.name).toBe('idle');
    expect(state.walking).toBe(false);
  });

  it('transitions from idle to sleep after timer expires', () => {
    let state = createInitialMopsState();
    state.timerSec = 0.01;
    state = tickMops(state, 0.1, {
      reducedMotion: false,
      hasWindowBench: false,
      serviceOpen: false,
      doorChimeMs: -1,
      activeMurkyMs: -1,
      chooseCustomerMs: -1,
      nowMs: 1000,
    });
    expect(state.name).toBe('sleep');
  });

  it('door chime makes Mops look toward door', () => {
    const state = createInitialMopsState();
    const next = tickMops(state, 0.1, {
      reducedMotion: false,
      hasWindowBench: false,
      serviceOpen: true,
      doorChimeMs: 1000,
      activeMurkyMs: -1,
      chooseCustomerMs: -1,
      nowMs: 1000,
    });
    expect(next.name).toBe('look');
  });

  it('murky brew makes Mops sniff', () => {
    const state = createInitialMopsState();
    const next = tickMops(state, 0.1, {
      reducedMotion: false,
      hasWindowBench: false,
      serviceOpen: true,
      doorChimeMs: -1,
      activeMurkyMs: 1000,
      chooseCustomerMs: -1,
      nowMs: 1000,
    });
    expect(next.name).toBe('sniff');
  });

  it('pet changes state to pet', () => {
    const state = createInitialMopsState();
    const next = petMops(state);
    expect(next.name).toBe('pet');
    expect(next.timerSec).toBeGreaterThan(0);
  });

  it('reduced motion instantly resolves walk', () => {
    let state = createInitialMopsState();
    state = { ...state, walking: true, walkT: 0.5, walkFromX: 0, walkToX: 100 };
    const next = tickMops(state, 0.1, {
      reducedMotion: true,
      hasWindowBench: false,
      serviceOpen: false,
      doorChimeMs: -1,
      activeMurkyMs: -1,
      chooseCustomerMs: -1,
      nowMs: 1000,
    });
    expect(next.walking).toBe(false);
    expect(next.x).toBe(100);
  });
});
