import { describe, expect, it } from 'vitest';

import { paletteToCss, paletteToRgba, Palette } from '../src/render/palette';

describe('Palette', () => {
  it('warm room fills are present for the M0 placeholder', () => {
    for (const key of ['wallTop', 'wallMid', 'wallLow', 'floor', 'counter', 'kettleSpot', 'doorSign'] as const) {
      expect(Palette[key], `missing room color: ${key}`).toBeTypeOf('number');
    }
  });

  it('every entry is a 24-bit color', () => {
    for (const [key, value] of Object.entries(Palette)) {
      expect(value, key).toBeGreaterThanOrEqual(0);
      expect(value, key).toBeLessThanOrEqual(0xffffff);
      expect(Number.isInteger(value), key).toBe(true);
    }
  });
});

describe('paletteToCss / paletteToRgba', () => {
  it('formats hex with zero padding', () => {
    expect(paletteToCss(0x000000)).toBe('#000000');
    expect(paletteToCss(0x1a1620)).toBe('#1a1620');
    expect(paletteToCss(0xffd43b)).toBe('#ffd43b');
  });

  it('formats rgba channels from packed ints', () => {
    expect(paletteToRgba(0xffd43b, 0.5)).toBe('rgba(255, 212, 59, 0.5)');
    expect(paletteToRgba(0x000000, 1)).toBe('rgba(0, 0, 0, 1)');
  });
});
