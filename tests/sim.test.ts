import { describe, expect, it } from 'vitest';

import { addCoins, addStars, createInitialEconomy } from '../src/sim/economy';
import { createInitialDayState } from '../src/sim/day';

describe('economy (sim stays pure)', () => {
  it('starts at ¤0 and ☆0', () => {
    const state = createInitialEconomy();
    expect(state.coins).toBe(0);
    expect(state.stars).toBe(0);
  });

  it('adds coins without mutating other fields', () => {
    const state = createInitialEconomy();
    addCoins(state, 42);
    expect(state.coins).toBe(42);
    expect(state.stars).toBe(0);
  });

  it('caps stars at 5', () => {
    const state = createInitialEconomy();
    addStars(state, 3);
    addStars(state, 9);
    expect(state.stars).toBe(5);
  });
});

describe('day state', () => {
  it('opens on Day 1 in prep phase', () => {
    const state = createInitialDayState();
    expect(state.day).toBe(1);
    expect(state.phase).toBe('prep');
  });
});
