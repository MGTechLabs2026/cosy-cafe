import { describe, expect, it } from 'vitest';

import { CountUp, easeInOut, startTween, tickTween } from '../src/render/tween';
import { recipeToView, comboLabel } from '../src/data/recipes';
import { createInitialDayState, beginNextDay, closeDay, openService } from '../src/sim/day';

describe('tween utilities', () => {
  it('snaps to target when duration is 0 (reduced motion)', () => {
    const t = startTween(0, 10, 0);
    tickTween(t, 1);
    expect(t.value).toBe(10);
    expect(t.done).toBe(true);
  });

  it('eases between endpoints over duration', () => {
    const t = startTween(0, 100, 2);
    tickTween(t, 1);
    expect(t.value).toBeGreaterThan(0);
    expect(t.value).toBeLessThan(100);
    tickTween(t, 5); // overshoot dt clamps at end
    expect(t.value).toBe(100);
    expect(t.done).toBe(true);
  });

  it('count-up approaches the target and settles', () => {
    const c = new CountUp(0, 50);
    c.setTarget(25, false);
    for (let i = 0; i < 60; i++) c.tick(1 / 30);
    expect(c.value).toBe(25);
    expect(c.settled).toBe(true);
  });

  it('count-up with reduced motion snaps instantly', () => {
    const c = new CountUp(0, 50);
    c.setTarget(99, true);
    expect(c.value).toBe(99);
    expect(c.settled).toBe(true);
  });

  it('easeInOut clamps outside [0,1]', () => {
    expect(easeInOut(-2)).toBe(0);
    expect(easeInOut(5)).toBe(1);
  });
});

describe('day state transitions (doc 02 §1)', () => {
  it('morning → service → recap → next day increments counter', () => {
    const d = createInitialDayState();
    expect(d.day).toBe(1);
    expect(d.phase).toBe('prep');
    openService(d);
    expect(d.phase).toBe('service');
    closeDay(d);
    expect(d.phase).toBe('recap');
    beginNextDay(d);
    expect(d.day).toBe(2);
    expect(d.phase).toBe('prep');
  });
});

describe('recipe views resolve through strings.json', () => {
  it('R001 view has icon path and readable name', () => {
    const view = recipeToView('R001');
    expect(view).not.toBeNull();
    expect(view!.name.length).toBeGreaterThan(0);
    expect(view!.icon).toBe('drink_black_tea.png');
    expect(view!.combo).toContain('Water');
  });

  it('unknown id returns null safely', () => {
    expect(recipeToView('R999')).toBeNull();
  });

  it('combo label mentions finish only when not hot', () => {
    expect(comboLabel('water', ['tea_leaves'], 'hot')).not.toContain('hot');
    expect(comboLabel('milk', ['cloud_sugar'], 'foamed')).toContain('foamed');
  });
});
