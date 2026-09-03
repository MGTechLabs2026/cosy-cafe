import { describe, expect, it } from 'vitest';

import strings from '../src/data/strings.json';
import { format } from '../src/data/strings';

describe('strings.json contract (doc 05 §7: keys, never literals)', () => {
  it('title copy is present', () => {
    expect(strings.title.gameName).toBe('Moonleaf Cozy Café');
    expect(strings.title.pressAnyKey.length).toBeGreaterThan(0);
  });

  it('HUD templates carry placeholders and the ¤ currency', () => {
    expect(strings.hud.dayTemplate).toContain('{day}');
    expect(strings.hud.coinsTemplate).toBe('¤{amount}');
    expect(strings.hud.starsFull).toBe('★');
    expect(strings.hud.starsEmpty).toBe('☆');
  });

  it('format fills templates', () => {
    expect(format(strings.hud.dayTemplate, { day: 4 })).toBe('Day 4');
    expect(format(strings.hud.coinsTemplate, { amount: 0 })).toBe('¤0');
    expect(format(strings.hud.coinsTemplate, { amount: 42 })).toBe('¤42');
  });

  it('format leaves unknown tokens intact', () => {
    expect(format('Hi {name} {missing}', { name: 'Wren' })).toBe('Hi Wren {missing}');
  });
});
