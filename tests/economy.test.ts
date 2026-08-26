import { describe, expect, it } from 'vitest';

import { addCoins, applyPayout, payoutForServe, starsForServes, updateStars } from '../src/sim/economy';
import { createInitialEconomy } from '../src/sim/economy';

describe('economy (sim stays pure)', () => {
  it('starts at ¤0 and ☆0', () => {
    const state = createInitialEconomy();
    expect(state.coins).toBe(0);
    expect(state.stars).toBe(0);
  });

  it('adds coins without mutating other fields', () => {
    const state = createInitialEconomy();
    state.coins += 42;
    expect(state.coins).toBe(42);
    expect(state.stars).toBe(0);
  });

  it('addCoins ignores non-positive amounts', () => {
    const state = createInitialEconomy();
    addCoins(state, -5);
    addCoins(state, 0);
    expect(state.coins).toBe(0);
    addCoins(state, 10);
    expect(state.coins).toBe(10);
  });
});

describe('serve payouts (doc 02 §4.1)', () => {
  it('Black Tea alone pays 6¤', () => {
    const payout = payoutForServe('R001', false, false);
    expect(payout.base).toBe(6);
    expect(payout.total).toBe(6);
  });

  it('chat before serving adds +1¤ tip', () => {
    const payout = payoutForServe('R001', true, false);
    expect(payout.tip).toBe(1);
    expect(payout.total).toBe(7);
  });

  it('favorite drink adds +2¤ perfect bonus', () => {
    const payout = payoutForServe('R001', false, true);
    expect(payout.perfectBonus).toBe(2);
    expect(payout.total).toBe(8);
  });

  it('chat + favorite stack: 6 + 1 + 2 = 9¤', () => {
    const payout = payoutForServe('R001', true, true);
    expect(payout.total).toBe(9);
  });

  it('applyPayout registers the serve toward stars', () => {
    const state = createInitialEconomy();
    for (let i = 0; i < 15; i++) {
      applyPayout(state, payoutForServe('R001', false, false));
    }
    expect(state.totalServes).toBe(15);
    expect(state.stars).toBe(1); // ★1 at 15 serves (doc 02 §5)
    expect(state.coins).toBe(15 * 6);
  });

  it('star thresholds: ★2@40 ★3@75 ★4@120 ★5@180', () => {
    expect(starsForServes(14)).toBe(0);
    expect(starsForServes(15)).toBe(1);
    expect(starsForServes(39)).toBe(1);
    expect(starsForServes(40)).toBe(2);
    expect(starsForServes(75)).toBe(3);
    expect(starsForServes(120)).toBe(4);
    expect(starsForServes(180)).toBe(5);
    expect(starsForServes(100000)).toBe(5);
  });

  it('murky brews never reach the payout path (contract: no coins, no serve count)', () => {
    const state = createInitialEconomy();
    // The controller only calls applyPayout after a non-murky resolveBrew;
    // this pins that a "murky" payout would be the bug.
    const murkyPayout = payoutForServe('', false, false);
    expect(murkyPayout.base).toBe(0);
    applyPayout(state, murkyPayout);
    expect(state.coins).toBe(0);
  });
});
