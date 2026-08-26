import { describe, expect, it } from 'vitest';

import { computeIntegerScale, displaySize, GAME_HEIGHT, GAME_WIDTH, transformForScale } from '../src/render/scale';

describe('computeIntegerScale', () => {
  it('backbuffer is 480×270', () => {
    expect(GAME_WIDTH).toBe(480);
    expect(GAME_HEIGHT).toBe(270);
  });

  it('picks the largest fitting integer scale', () => {
    expect(computeIntegerScale(480, 270)).toBe(1);
    expect(computeIntegerScale(960, 540)).toBe(2);
    expect(computeIntegerScale(1920, 1080)).toBe(4);
  });

  it('is limited by the tighter axis', () => {
    expect(computeIntegerScale(1440, 810)).toBe(3); // height-limited: 270*3=810
    expect(computeIntegerScale(1000, 2000)).toBe(2); // width-limited: 480*2=960
  });

  it('never returns less than 1', () => {
    expect(computeIntegerScale(100, 100)).toBe(1);
    expect(computeIntegerScale(0, 0)).toBe(1);
    expect(computeIntegerScale(-10, 500)).toBe(1);
  });

  it('tolerates NaN/Infinity input', () => {
    expect(computeIntegerScale(Number.NaN, 1000)).toBe(1);
    expect(computeIntegerScale(1000, Number.POSITIVE_INFINITY)).toBe(1);
  });
});

describe('transformForScale / displaySize', () => {
  it('emits an integer CSS scale', () => {
    expect(transformForScale(3)).toBe('scale(3)');
  });

  it('clamps non-integer and invalid scales to 1', () => {
    expect(transformForScale(2.7)).toBe('scale(2)');
    expect(transformForScale(0.5)).toBe('scale(1)');
    expect(transformForScale(Number.NaN)).toBe('scale(1)');
  });

  it('displaySize matches backbuffer × scale', () => {
    expect(displaySize(1)).toEqual({ width: 480, height: 270 });
    expect(displaySize(2)).toEqual({ width: 960, height: 540 });
  });
});
