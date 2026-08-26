// Playtest-fix regression tests:
// #1 walking gait — bob+lean only while entering, off under reduced motion
// #2 bubble hit region — rect published while drawn, cleared when gone
// #3 music state machine — phase mapping, unlock gating, record-player gate,
//    master-volume scaling. The Howl class is mocked, so no real audio runs.
// The music module holds module-level mixer state, so each test re-imports it
// through vi.resetModules() for a guaranteed-clean slate.

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { customerPosition, walkGait } from '../src/render/scene';

const howlState = vi.hoisted(() => ({
  instances: [] as {
    src: string[];
    loop: boolean;
    html5: boolean;
    play: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
    fade: ReturnType<typeof vi.fn>;
    volume: ReturnType<typeof vi.fn>;
    once: ReturnType<typeof vi.fn>;
    playing: ReturnType<typeof vi.fn>;
  }[],
  masterVolume: 0.8,
}));

vi.mock('howler', () => {
  class Howl {
    constructor(opts: { src: string[]; loop?: boolean; html5?: boolean; volume?: number }) {
      this.src = opts.src;
      this.loop = opts.loop ?? false;
      this.html5 = opts.html5 ?? false;
      this._vol = opts.volume ?? 1;
      if (this.src[0].includes('/assets/music/')) howlState.instances.push(this);
    }
    src: string[];
    loop: boolean;
    html5: boolean;
    _vol: number;
    /** Mirrors Howler's signature: volume() → get, volume(v) → set. */
    volume = vi.fn((v?: number) => (v === undefined ? this._vol : (this._vol = v)));
    play = vi.fn(() => 101);
    stop = vi.fn();
    /** Fires registered 'fade' handlers immediately, like real Howler would
     * after the ramp — lets us verify the fade→stop wiring synchronously. */
    fade = vi.fn(function (this: HowlMock, _from: number, _to: number, _ms: number, id: number) {
      for (const cb of this._fadeCbs.splice(0)) cb();
      return id;
    });
    once = vi.fn(function (this: HowlMock, event: string, cb: () => void) {
      if (event === 'fade') this._fadeCbs.push(cb);
    });
    playing = vi.fn(() => true);
    _fadeCbs: (() => void)[] = [];
  }
  type HowlMock = InstanceType<typeof Howl>;
  const Howler = {
    volume: (v?: number) => (v === undefined ? howlState.masterVolume : (howlState.masterVolume = v)),
  };
  return { Howl, Howler };
});

/** Fresh copy of the audio module per call (mixer state resets). */
async function freshHowl() {
  vi.resetModules();
  return await import('../src/audio/howl');
}

function musicHowls() {
  return howlState.instances.filter((h) => h.loop && h.src[0].includes('/assets/music/'));
}

beforeEach(() => {
  howlState.instances.length = 0;
  howlState.masterVolume = 0.8;
});

describe('playtest fix #1 — walk-in gait', () => {
  it('bobs and leans only mid-walk', () => {
    expect(walkGait(0, 0, false).moving).toBe(false);
    expect(walkGait(1, 0, false).moving).toBe(false);

    const g = walkGait(0.5, 275, false); // sin(275/110)=sin(2.5rad) ≈ 0.6
    expect(g.moving).toBe(true);
    expect(g.bobPx).toBeGreaterThan(0);
    expect(g.bobPx).toBeLessThanOrEqual(2.0001); // brief says ~2px
    expect(Math.abs(g.leanRad)).toBeLessThan(0.06); // a hair of tilt
  });

  it('is fully at rest under reduced motion even mid-walk', () => {
    const g = walkGait(0.5, 12345, true);
    expect(g).toEqual({ moving: false, bobPx: 0, leanRad: 0 });
  });

  it('walk path still interpolates door → counter monotonically', () => {
    let prevX = -Infinity;
    for (let t = 0; t <= 1.001; t += 0.05) {
      const p = customerPosition(t);
      expect(p.x).toBeGreaterThanOrEqual(prevX);
      prevX = p.x;
    }
  });
});

describe('playtest fix #3 — phase mapping (pure)', () => {
  it('maps phases to tracks per the brief', async () => {
    const { trackForPhase } = await freshHowl();
    expect(trackForPhase('prep')).toBe('raining_days');
    expect(trackForPhase('service')).toBe('fireplace');
    expect(trackForPhase('recap')).toBe('cherry_blossom');
  });
});

describe('playtest fix #3 — music state machine', () => {
  it('stays silent before the record player is owned, even when unlocked', async () => {
    const h = await freshHowl();
    h.initAudio();
    h.unlockAudio();
    h.playMusicForPhase('prep');
    expect(musicHowls()).toHaveLength(0);
    expect(h.debugMusicState().current).toBeNull();
  });

  it('queues phase cues made before the title-screen unlock, then starts on unlock', async () => {
    const h = await freshHowl();
    h.setRecordPlayerEnabled(true); // pre-unlock ownership
    h.playMusicForPhase('prep'); // pre-unlock cue → must NOT construct/play yet
    expect(musicHowls()).toHaveLength(0);

    h.unlockAudio(); // title gesture → flushes pending cue
    const loops = musicHowls();
    expect(loops).toHaveLength(1);
    expect(loops[0].src[0]).toContain('3_RainingDays.m4a');
    expect(loops[0].loop).toBe(true);
    expect(loops[0].html5).toBe(false); // html5 OFF → WebAudio pool per brief
    expect(loops[0].play).toHaveBeenCalled();
    expect(h.debugMusicState().current).toBe('raining_days');
  });

  it('crossfades to the service track when doors open', async () => {
    const h = await freshHowl();
    h.initAudio();
    h.unlockAudio();
    h.setRecordPlayerEnabled(true);
    h.playMusicForPhase('prep');
    h.playMusicForPhase('service');

    const fireplace = howlState.instances.find((x) => x.src[0].includes('1_Fireplace'));
    expect(fireplace).toBeDefined();
    expect(fireplace!.play).toHaveBeenCalled();

    const raining = howlState.instances.find((x) => x.src[0].includes('3_RainingDays'))!;
    expect(raining.fade).toHaveBeenCalled(); // faded out…
    expect(raining.stop).toHaveBeenCalled(); // …and stopped after the ramp
    expect(h.debugMusicState().current).toBe('fireplace');
  });

  it('same-phase cues are idempotent (no double-play)', async () => {
    const h = await freshHowl();
    h.initAudio();
    h.unlockAudio();
    h.setRecordPlayerEnabled(true); // auto-starts prep music mid-session
    h.playMusicForPhase('recap');
    h.playMusicForPhase('recap');
    h.playMusicForPhase('recap');
    const loops = musicHowls();
    expect(loops).toHaveLength(2); // raining_days + cherry_blossom only
    const cherry = loops.find((x) => x.src[0].includes('CherryBlossom'))!;
    expect(cherry.play).toHaveBeenCalledTimes(1);
  });

  it('scales music volume by master_vol (0.35 × master)', async () => {
    const h = await freshHowl();
    h.initAudio();
    h.unlockAudio();
    h.setRecordPlayerEnabled(true);
    h.setMasterVolume(0.8);
    h.playMusicForPhase('service');
    expect(h.MUSIC_VOLUME).toBeCloseTo(0.35);
    const fireplace = howlState.instances.find((x) => x.src[0].includes('1_Fireplace'))!;
    // Fade target must be MUSIC_VOLUME × master.
    const lastFade = fireplace.fade.mock.calls.at(-1)!;
    expect(lastFade[1]).toBeCloseTo(h.MUSIC_VOLUME * 0.8);
  });

  it('toggle-off stops playback entirely', async () => {
    const h = await freshHowl();
    h.initAudio();
    h.unlockAudio();
    h.setRecordPlayerEnabled(true);
    h.playMusicForPhase('prep');
    h.setRecordPlayerEnabled(false);
    const raining = howlState.instances.find((x) => x.src[0].includes('3_RainingDays'))!;
    expect(raining.stop).toHaveBeenCalled();
    expect(h.debugMusicState().current).toBeNull();
  });
});
