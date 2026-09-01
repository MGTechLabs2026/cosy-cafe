import { describe, expect, it } from 'vitest';

import { addCoins, addStars, createInitialEconomy } from '../src/sim/economy';
import { createInitialDayState, roomVariantFor, WINTER_FROM_DAY } from '../src/sim/day';

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

describe('roomVariantFor — backdrop by time of day + season', () => {
  it('cycles morning → day → evening across the phases before winter', () => {
    expect(roomVariantFor(1, 'prep')).toBe('morning');
    expect(roomVariantFor(1, 'service')).toBe('day');
    expect(roomVariantFor(1, 'recap')).toBe('evening');
    expect(roomVariantFor(WINTER_FROM_DAY - 1, 'service')).toBe('day');
  });

  it('locks to snow from WINTER_FROM_DAY onward, whatever the phase', () => {
    for (const phase of ['prep', 'service', 'recap'] as const) {
      expect(roomVariantFor(WINTER_FROM_DAY, phase)).toBe('snow');
      expect(roomVariantFor(14, phase)).toBe('snow');
    }
  });
});
