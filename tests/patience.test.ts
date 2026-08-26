import { describe, expect, it } from 'vitest';

import {
  PATIENCE_DRAIN_PER_SEC,
  PATIENCE_MAX,
  RELAXED_PATIENCE_MULTIPLIER,
  buildDaySchedule,
  createCustomer,
  tickPatience,
  validateScheduleOrders,
} from '../src/sim/customers';
import type { Customer } from '../src/sim/customers';
import { consumeIngredients, createInitialInventory, hasStock } from '../src/sim/day';

function fresh(): Customer {
  return createCustomer('fenwick', 'R001');
}

describe('patience (doc 02 §3.2)', () => {
  it('starts at 100', () => {
    expect(fresh().patience).toBe(PATIENCE_MAX);
    expect(PATIENCE_MAX).toBe(100);
  });

  it('drains ~0.8/sec at standard rate', () => {
    const c = fresh();
    tickPatience(c, 1, 1);
    expect(c.patience).toBeCloseTo(100 - PATIENCE_DRAIN_PER_SEC, 5);
    expect(PATIENCE_DRAIN_PER_SEC).toBe(0.8);
  });

  it('relaxed mode drains at half rate (default ON)', () => {
    const c = fresh();
    tickPatience(c, 2, RELAXED_PATIENCE_MULTIPLIER);
    expect(c.patience).toBeCloseTo(100 - 0.8 * 0.5 * 2, 5);
    expect(RELAXED_PATIENCE_MULTIPLIER).toBe(0.5);
  });

  it('full patience ≈ 2 minutes of waiting at standard rate', () => {
    const c = fresh();
    let sec = 0;
    while (c.patience > 0 && sec < 1000) {
      tickPatience(c, 0.5, 1);
      sec += 0.5;
    }
    expect(sec).toBeCloseTo(125, 0); // 100 / 0.8
  });

  it('clamps at zero and never goes negative', () => {
    const c = fresh();
    tickPatience(c, 500, 1);
    expect(c.patience).toBe(0);
    tickPatience(c, 500, 1);
    expect(c.patience).toBe(0);
  });

  it('negative dt is harmless', () => {
    const c = fresh();
    tickPatience(c, -3, 1);
    expect(c.patience).toBe(100);
  });
});

// ---- M2 NOTE: buildDaySchedule/createCustomer contracts replaced per the M2
// brief ("Replace with full-cast schedules"). The day-1 tutorial script is
// preserved verbatim; these assertions now pin the M2 shapes.

describe('M2 schedule (full cast — doc 02 §3.3)', () => {
  it('day 1 preserves the accepted script: R001 visit teaching R003, then R003', () => {
    const sched = buildDaySchedule(1);
    expect(sched.arrivals[0]?.characterId).toBe('fenwick');
    expect(sched.arrivals[0]?.orderRecipeId).toBe('R001'); // achievable within 90s
    expect(sched.arrivals[0]?.teachesRecipeId).toBe('R003');
    expect(sched.teacherIndex).toBe(0); // legacy M1 contract kept
    expect(sched.arrivals[1]?.characterId).toBe('fenwick');
    expect(sched.arrivals[1]?.orderRecipeId).toBe('R003'); // his taught drink
  });

  it('later days build valid tiered schedules without a legacy teacher index', () => {
    for (const day of [2, 3, 4, 5]) {
      const sched = buildDaySchedule(day);
      expect(sched.arrivals.length).toBeGreaterThan(0);
      expect(sched.teacherIndex).toBe(-1);
      expect(validateScheduleOrders(sched.arrivals.map((a) => a.orderRecipeId))).toBe(true);
    }
  });

  it('every concrete order resolves to a defined recipe id (null only = Wren mystery)', () => {
    for (let day = 1; day <= 14; day++) {
      const sched = buildDaySchedule(day);
      expect(validateScheduleOrders(sched.arrivals.map((a) => a.orderRecipeId))).toBe(true);
    }
  });

  it('createCustomer spawns every cast member + travelers (M2 full cast)', () => {
    for (const id of ['fenwick', 'sela', 'bram', 'nia', 'wren', 'traveler'] as const) {
      const c = createCustomer(id, 'R001');
      expect(c.characterId).toBe(id);
      expect(c.patience).toBe(PATIENCE_MAX);
    }
  });

  it('new arrivals start unchatted and not served', () => {
    const c = fresh();
    expect(c.chatted).toBe(false);
    expect(c.served).toBe(false);
    expect(c.entering).toBe(false);
  });
});

describe('inventory (doc 02 §2.5)', () => {
  it('starting stock: 10 tea leaves, 6 honey, 4 moonleaf', () => {
    const inv = createInitialInventory();
    expect(inv['tea_leaves']).toBe(10);
    expect(inv['honey']).toBe(6);
    expect(inv['moonleaf']).toBe(4);
    expect(inv['cocoa']).toBe(0);
  });

  it('consume decrements exactly the used ingredients', () => {
    const inv = createInitialInventory();
    consumeIngredients(inv, ['tea_leaves', 'tea_leaves']);
    expect(inv['tea_leaves']).toBe(8);
  });

  it('never goes negative even if asked', () => {
    const inv = createInitialInventory();
    consumeIngredients(inv, ['cocoa']); // starts at 0
    expect(inv['cocoa']).toBe(0);
  });

  it('hasStock gates recipes whose shelf ran dry', () => {
    const inv = createInitialInventory();
    expect(hasStock(inv, ['tea_leaves'])).toBe(true);
    inv['moonleaf'] = 0;
    expect(hasStock(inv, ['moonleaf'])).toBe(false); // restock deferred to M2
  });
});
