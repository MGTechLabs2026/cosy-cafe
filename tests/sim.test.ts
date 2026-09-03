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

  it('shifts the service backdrop to evening once the day is winding down', () => {
    expect(roomVariantFor(3, 'service', false)).toBe('day');
    expect(roomVariantFor(3, 'service', true)).toBe('evening'); // last customer gone
    // prep/recap ignore the flag
    expect(roomVariantFor(3, 'prep', true)).toBe('morning');
    expect(roomVariantFor(3, 'recap', true)).toBe('evening');
  });

  it('uses snow backdrops from WINTER_FROM_DAY onward, with a day/night beat', () => {
    // Open service and prep stay on the daytime snow backdrop.
    expect(roomVariantFor(WINTER_FROM_DAY, 'prep')).toBe('snow');
    expect(roomVariantFor(WINTER_FROM_DAY, 'service')).toBe('snow');
    expect(roomVariantFor(14, 'prep', true)).toBe('snow');
    // Recap, and service once winding down, shift to night.
    expect(roomVariantFor(WINTER_FROM_DAY, 'recap')).toBe('snow_night');
    expect(roomVariantFor(WINTER_FROM_DAY, 'service', true)).toBe('snow_night');
    expect(roomVariantFor(14, 'recap', true)).toBe('snow_night');
  });
});
