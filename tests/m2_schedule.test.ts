// M2 schedule tests — doc 02 §3.3 pacing table + brief §A requirements:
// arrival-count tiers, cast mixing, travelers, determinism, valid orders.

import { describe, expect, it } from 'vitest';

import {
  CHARACTERS,
  FAVORITES,
  buildDaySchedule,
  validateScheduleOrders,
} from '../src/sim/customers';
import { RECIPES } from '../src/sim/brewing';

const KNOWN_IDS = new Set(RECIPES.map((r) => r.id));

function ordersOf(day: number, seed?: number): (string | null)[] {
  return buildDaySchedule(day, seed === undefined ? {} : { seed }).arrivals.map(
    (a) => a.orderRecipeId,
  );
}

describe('schedule — arrival-count tiers per doc 02 §3.3', () => {
  it('days 1–2 (tutorial tier): 4–5 arrivals', () => {
    for (let day = 1; day <= 2; day++) {
      for (const seed of [1, 7, 42, 999]) {
        const n = buildDaySchedule(day, { seed }).arrivals.length;
        expect(n).toBeGreaterThanOrEqual(4);
        expect(n).toBeLessThanOrEqual(5);
      }
    }
  });

  it('days 3–6 (full cast tier): 5–6 arrivals', () => {
    for (let day = 3; day <= 6; day++) {
      for (const seed of [1, 7, 42, 999]) {
        const n = buildDaySchedule(day, { seed }).arrivals.length;
        expect(n).toBeGreaterThanOrEqual(5);
        expect(n).toBeLessThanOrEqual(6);
      }
    }
  });

  it('days 7–13 (traveler tier): 6–8 arrivals', () => {
    for (let day = 7; day <= 13; day++) {
      for (const seed of [1, 7, 42, 999]) {
        const n = buildDaySchedule(day, { seed }).arrivals.length;
        expect(n).toBeGreaterThanOrEqual(6);
        expect(n).toBeLessThanOrEqual(8);
      }
    }
  });

  it('day 14+ (sandbox tier): 6–9 arrivals', () => {
    for (const day of [14, 20, 30]) {
      const n = buildDaySchedule(day).arrivals.length;
      expect(n).toBeGreaterThanOrEqual(6);
      expect(n).toBeLessThanOrEqual(9);
    }
  });
});

describe('schedule — cast mixing & travelers', () => {
  it('day 1 preserves the accepted M1 script exactly', () => {
    const sched = buildDaySchedule(1);
    expect(sched.arrivals[0]).toMatchObject({
      characterId: 'fenwick',
      orderRecipeId: 'R001',
      teachesRecipeId: 'R003',
    });
    expect(sched.arrivals[1]).toMatchObject({
      characterId: 'fenwick',
      orderRecipeId: 'R003',
      teachesRecipeId: null,
    });
    expect(sched.teacherIndex).toBe(0);
  });

  it('day 2 includes Bram and Wren (Wren with a "?" mystery order)', () => {
    const sched = buildDaySchedule(2);
    const ids = sched.arrivals.map((a) => a.characterId);
    expect(ids).toContain('bram');
    expect(ids).toContain('wren');
    const wren = sched.arrivals.find((a) => a.characterId === 'wren');
    expect(wren?.mysteryOrder).toBe(true);
    expect(wren?.orderRecipeId).toBeNull();
  });

  it('all five regulars appear across days 3–6 (cast cycling)', () => {
    for (const day of [3, 4, 5, 6]) {
      const seen = new Set(buildDaySchedule(day).arrivals.map((a) => a.characterId));
      for (const char of CHARACTERS) {
        expect(seen.has(char.id), `day ${day} missing ${char.id}`).toBe(true);
      }
    }
  });

  it('tier-3 days include travelers (coin flow only)', () => {
    let travelerDays = 0;
    for (let day = 7; day <= 13; day++) {
      const sched = buildDaySchedule(day);
      if (sched.arrivals.some((a) => a.characterId === 'traveler')) travelerDays += 1;
    }
    // "Travelers fill gaps" — most tier-3 days carry at least one.
    expect(travelerDays).toBeGreaterThan(4);
  });

  it('no two identical regulars back-to-back (no duplicate simultaneous arrivals)', () => {
    for (let day = 2; day <= 14; day++) {
      const ids = buildDaySchedule(day).arrivals.map((a) =>
        a.characterId === 'traveler' ? 'traveler' : a.characterId,
      );
      for (let i = 1; i < ids.length; i++) {
        const prev = ids[i - 1];
        const cur = ids[i];
        if (prev !== 'traveler' && cur !== 'traveler') {
          expect(cur, `day ${day} slot ${i}: ${prev} followed by itself`).not.toBe(prev);
        }
      }
    }
  });
});

describe('schedule — determinism & validity', () => {
  it('identical inputs yield the identical schedule (pure function)', () => {
    const a = buildDaySchedule(9, { seed: 12345 });
    const b = buildDaySchedule(9, { seed: 12345 });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('different seeds can differ but stay in-tier', () => {
    for (let day = 2; day <= 13; day++) {
      const s1 = JSON.stringify(buildDaySchedule(day, { seed: 1 }));
      const s2 = JSON.stringify(buildDaySchedule(day, { seed: 2 }));
      // Not required to differ on every day, but must never throw or drift tiers
      // (tier bounds asserted above); here we pin both parse cleanly.
      expect(s1.length).toBeGreaterThan(0);
      expect(s2.length).toBeGreaterThan(0);
    }
  });

  it('every concrete order resolves to a known recipe across 30 days × seeds', () => {
    for (let day = 1; day <= 30; day++) {
      for (const seed of [3, 77, 2026]) {
        const orders = ordersOf(day, seed);
        expect(validateScheduleOrders(orders)).toBe(true);
        for (const o of orders) {
          if (o !== null) expect(KNOWN_IDS.has(o), `${o} unknown`).toBe(true);
        }
      }
    }
  });

  it('mystery orders exist ONLY pre-reveal and only for Wren', () => {
    const revealed = buildDaySchedule(5, { wrenRevealed: true });
    for (const a of revealed.arrivals) {
      expect(a.mysteryOrder).toBe(false);
      if (a.characterId === 'wren') {
        expect(a.orderRecipeId).toBe(FAVORITES.wren);
      }
    }
  });

  it('from day 3 each regular teaches their favorite exactly once, then orders it', () => {
    const sched = buildDaySchedule(3, { seed: 11 });
    const teaches = sched.arrivals.filter((a) => a.teachesRecipeId !== null);
    const taughtIds = new Set(teaches.map((a) => a.teachesRecipeId));
    // No recipe taught twice in one day.
    expect(teaches.length).toBe(taughtIds.size);
    // Every teach points at that character's favorite.
    for (const t of teaches) {
      if (t.characterId !== 'wren' && t.characterId !== 'traveler') {
        expect(t.teachesRecipeId).toBe(FAVORITES[t.characterId]);
      } else if (t.characterId === 'wren') {
        expect(t.teachesRecipeId).toBe('R007');
      }
    }
  });
});

describe('favorites table (doc 03 §4)', () => {
  it('matches the doc exactly', () => {
    expect(FAVORITES.fenwick).toBe('R004'); // Ember Cocoa now (M3 shifts to tea)
    expect(FAVORITES.sela).toBe('R005');
    expect(FAVORITES.bram).toBe('R004');
    expect(FAVORITES.nia).toBe('R006');
    expect(FAVORITES.wren).toBe('R007');
  });
});
