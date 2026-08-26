// M2 hearts + stars boundary tests — doc 02 §5.
// Hearts: float points, displayed = floor, daily cap +1.0, morning reset,
// travelers never earn (enforced at controller level; sim only tracks regulars).
// Stars: exact thresholds 15/40/75/120/180 with boundaries 14→0★, 15→1★ etc.

import { describe, expect, it } from 'vitest';

import {
  HEART_CHAT,
  HEART_CORRECT_SERVE,
  HEART_DAILY_CAP,
  awardChat,
  awardCorrectServe,
  awardFavoriteServe,
  createHeartLedger,
  displayedHearts,
  resetHeartDay,
} from '../src/sim/hearts';
import { starsForServes } from '../src/sim/economy';

describe('star thresholds — exact boundaries (doc 02 §5)', () => {
  it('14→0★ · 15→1★ · 39→1★ · 40→2★ · 74→2★ · 75→3★ · 120→4★ · 180→5★', () => {
    expect(starsForServes(0)).toBe(0);
    expect(starsForServes(14)).toBe(0);
    expect(starsForServes(15)).toBe(1);
    expect(starsForServes(39)).toBe(1);
    expect(starsForServes(40)).toBe(2);
    expect(starsForServes(74)).toBe(2);
    expect(starsForServes(75)).toBe(3);
    expect(starsForServes(119)).toBe(3);
    expect(starsForServes(120)).toBe(4);
    expect(starsForServes(179)).toBe(4);
    expect(starsForServes(180)).toBe(5);
    expect(starsForServes(100000)).toBe(5);
  });
});

describe('hearts — float points with floor display (doc 03 §5)', () => {
  it('chat grants +0.25 points but displays as 0 hearts until floor crosses 1', () => {
    const ledger = createHeartLedger();
    expect(awardChat(ledger, 'fenwick')).toBeCloseTo(HEART_CHAT, 6);
    expect(displayedHearts(ledger, 'fenwick')).toBe(0); // floor(0.25) = 0
    // Four chats across four days → exactly 1 heart.
    for (let i = 0; i < 3; i++) {
      resetHeartDay(ledger);
      awardChat(ledger, 'fenwick');
    }
    expect(displayedHearts(ledger, 'fenwick')).toBe(1);
  });

  it('correct non-favorite serve is worth +0.1 (REPORTED VALUE)', () => {
    const ledger = createHeartLedger();
    expect(awardCorrectServe(ledger, 'sela')).toBeCloseTo(HEART_CORRECT_SERVE, 6);
  });

  it('favorite serve alone fills the whole day (+1.0 point)', () => {
    const ledger = createHeartLedger();
    expect(awardFavoriteServe(ledger, 'bram')).toBeCloseTo(1.0, 6);
    expect(displayedHearts(ledger, 'bram')).toBe(1);
  });
});

describe('hearts — the +1.0/day cap (doc 02 §5)', () => {
  it('favorite + chats + correct serves same day never exceed +1.0', () => {
    const ledger = createHeartLedger();
    awardFavoriteServe(ledger, 'nia');
    awardChat(ledger, 'nia');
    awardChat(ledger, 'nia');
    awardCorrectServe(ledger, 'nia');

    expect(ledger.gainedToday['nia'] ?? 0).toBeLessThanOrEqual(HEART_DAILY_CAP + 1e-9);
    expect(ledger.gainedToday['nia'] ?? 0).toBeCloseTo(1.0, 9);
  });

  it('cap stops accumulation mid-day: extra events grant exactly 0', () => {
    const ledger = createHeartLedger();
    expect(awardFavoriteServe(ledger, 'wren')).toBeCloseTo(1.0, 6); // cap spent
    expect(awardChat(ledger, 'wren')).toBe(0);
    expect(awardCorrectServe(ledger, 'wren')).toBe(0);
    expect(ledger.gainedToday['wren'] ?? 0).toBeCloseTo(1.0, 9);
  });

  it('resets next day: full +1.0 available again after morning reset', () => {
    const ledger = createHeartLedger();
    awardFavoriteServe(ledger, 'fenwick');
    expect(awardChat(ledger, 'fenwick')).toBe(0);

    resetHeartDay(ledger); // morning
    expect((ledger.gainedToday['fenwick'] ?? 0)).toBe(0);
    expect(awardChat(ledger, 'fenwick')).toBeCloseTo(HEART_CHAT, 6);
    // Lifetime points kept accumulating correctly.
    expect(ledger.points['fenwick'] ?? 0).toBeCloseTo(1.25, 6);
  });

  it('fractional days stack toward the next heart across many days', () => {
    const ledger = createHeartLedger();
    // Day pattern: one correct serve per day (+0.1). After 10 days: 1 heart.
    for (let day = 0; day < 10; day++) {
      resetHeartDay(ledger);
      awardCorrectServe(ledger, 'sela');
    }
    expect(displayedHearts(ledger, 'sela')).toBe(1);
    expect(ledger.points['sela'] ?? 0).toBeCloseTo(1.0, 6);
  });
});
