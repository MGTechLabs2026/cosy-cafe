import { describe, it, expect } from 'vitest';
import { pickAmbientPresence } from '../src/sim/presence';

describe('presence selection', () => {
  const base = {
    reducedMotion: false,
    serviceOpen: false,
    hasActiveCustomer: false,
    hasWindowBench: false,
    day: 3,
    elapsedMs: 0,
  };

  it('returns null when service open with active customer', () => {
    const change = pickAmbientPresence({ ...base, serviceOpen: true, hasActiveCustomer: true, mopsStateName: 'idle' });
    expect(change).toBeNull();
  });

  it('returns null for no candidate', () => {
    const change = pickAmbientPresence({ ...base, mopsStateName: 'pet' });
    expect(change).toBeNull();
  });

  it('behaves across 59s/60s/61s boundary', () => {
    const at0 = pickAmbientPresence({ ...base, mopsStateName: 'sleep', elapsedMs: 0, day: 7 });
    const at59 = pickAmbientPresence({ ...base, mopsStateName: 'sleep', elapsedMs: 59_999, day: 7 });
    const at60 = pickAmbientPresence({ ...base, mopsStateName: 'sleep', elapsedMs: 60_000, day: 7 });
    const at61 = pickAmbientPresence({ ...base, mopsStateName: 'sleep', elapsedMs: 61_000, day: 7 });

    // Selector blocks before the 60s minimum; post-60s is deterministic.
    expect(at0).toBeNull();
    expect(at59).toBeNull();
    expect(at60?.from).toBe('sleep');
    expect(at61).toEqual(at60);
    if (at60) expect(at60.to).not.toBe('sleep');
  });

  it('deterministic for same seed/state', () => {
    const a = pickAmbientPresence({ ...base, mopsStateName: 'sleep', elapsedMs: 120_000, day: 5 });
    const b = pickAmbientPresence({ ...base, mopsStateName: 'sleep', elapsedMs: 120_000, day: 5 });
    expect(a).toEqual(b);
  });

  it('never repeats same state', () => {
    const change = pickAmbientPresence({ ...base, mopsStateName: 'sleep', elapsedMs: 60_000 });
    expect(change?.from).toBe('sleep');
    expect(change?.to).not.toBe('sleep');
  });
});
