// Thin Howler wrapper — doc 08 §3.4
// Gesture-gated: browsers suspend WebAudio until a user gesture; the title
// screen's first keypress/click calls unlockAudio(), which resumes the context.
// Per §3.4 we preload ONLY the tiny SFX; music streams after this gate.
//
// Post-M4 playtest fix #3: real looping tracks now exist under
// public/assets/music/ (75s AAC loops). They stream through Howler's WebAudio
// pool (html5:false) so loops stay gapless and volume ramps are sample-accurate.
// Playback starts only AFTER unlockAudio() and honors master_vol plus the
// record_player upgrade toggle. Phase mapping (prep/morning = RainingDays,
// service = Fireplace, evening recap = CherryBlossomTree) with a 2s crossfade.
//
// REPORTED DEVIATION RESOLVED: the M2 fallback (door-chime loop standing in
// for the record player) is replaced by these real tracks.

import { Howl, Howler } from 'howler';

// M4 (doc 07 §3): audio paths resolve against the deploy base so the itch.io
// iframe build finds them (vite base './').
const SFX_BASE = `${import.meta.env.BASE_URL ?? '/'}audio/`;
const MUSIC_BASE = `${import.meta.env.BASE_URL ?? '/'}assets/music/`;

const CHIME_VOLUME = 0.6;
const CLICK_VOLUME = 0.35;
/** Music sits low under the SFX; scaled again by master_vol at play time. */
export const MUSIC_VOLUME = 0.35;
/** Crossfade length for phase switches (seconds; Howl volume ramp). */
export const MUSIC_FADE_SEC = 2;

let unlocked = false;
let doorChime: Howl | null = null;
let clickSound: Howl | null = null;

/** Create the SFX pool. Safe to call once at bootstrap (before any gesture). */
export function initAudio(): void {
  doorChime = new Howl({
    src: [`${SFX_BASE}door-chime.ogg`, `${SFX_BASE}door-chime.mp3`],
    preload: true,
    volume: CHIME_VOLUME,
  });
  clickSound = new Howl({
    src: [`${SFX_BASE}click.ogg`, `${SFX_BASE}click.mp3`],
    preload: true,
    volume: CLICK_VOLUME,
  });
}

/** Resume the shared AudioContext from a user-gesture handler. Idempotent. */
export function unlockAudio(): void {
  const ctx: AudioContext | null = Howler.ctx ?? null;
  if (ctx !== null && ctx.state === 'suspended') {
    void ctx.resume().catch(() => {
      // Stays locked; next gesture retries.
    });
  }
  unlocked = true;
  // The title-advance gesture doubles as the music start gate (autoplay
  // policy): anything requested before this point begins playing here.
  flushPendingMusic();
}

export function isAudioUnlocked(): boolean {
  return unlocked;
}

/** Door chime — customer arrival stub (doc 05 §3.2). No-op while locked. */
export function playDoorChime(): void {
  if (!unlocked || !doorChime) return;
  doorChime.play();
}

/** UI click — title advance. No-op while locked. */
export function playClick(): void {
  if (!unlocked || !clickSound) return;
  clickSound.play();
}

/** Master volume, clamped to 0–1. Scales SFX AND the live music track. */
export function setMasterVolume(volume: number): void {
  const clamped = Math.max(0, Math.min(1, volume));
  Howler.volume(clamped);
  syncLiveMusicVolume();
}

// ---- Music (playtest fix #3) -------------------------------------------------

export type MusicTrackId = 'raining_days' | 'fireplace' | 'cherry_blossom';
/** Game day phases that carry a musical cue. */
export type DayPhase = 'prep' | 'service' | 'recap';

const MUSIC_FILES: Readonly<Record<MusicTrackId, string>> = {
  raining_days: '3_RainingDays.m4a',
  fireplace: '1_Fireplace.m4a',
  cherry_blossom: '4_CherryBlossomTree.m4a',
};

/** Phase → track mapping (calm prep, hearth service, recap bloom). */
export function trackForPhase(phase: DayPhase): MusicTrackId {
  switch (phase) {
    case 'service':
      return 'fireplace';
    case 'recap':
      return 'cherry_blossom';
    default:
      return 'raining_days';
  }
}

interface MusicState {
  /** Lazily built Howls, one per track (streams via WebAudio pool). */
  howls: Partial<Record<MusicTrackId, Howl>>;
  /** Track currently owned by the mixer (may be mid-fade-in or silent). */
  current: MusicTrackId | null;
  /** Live Howler play id of `current` (fade/stop targeting); null = none. */
  playId: number | null;
  /** Player wants music ON (record player owned and not toggled off). */
  wanted: boolean;
  /** Record-player upgrade owned (doc 02 §4.2) — gates all playback. */
  recordPlayerOwned: boolean;
  /** Phase cue that arrived before the audio unlock; flushed on unlock. */
  pendingPhase: DayPhase | null;
}

const music: MusicState = {
  howls: {},
  current: null,
  playId: null,
  wanted: false,
  recordPlayerOwned: false,
  pendingPhase: null,
};

function musicHowl(track: MusicTrackId): Howl {
  let h = music.howls[track];
  if (!h) {
    h = new Howl({
      src: [`${MUSIC_BASE}${MUSIC_FILES[track]}`],
      preload: true,
      loop: true,
      html5: false, // WebAudio pool: gapless looping + precise volume ramps
      volume: 0,
    });
    music.howls[track] = h;
  }
  return h;
}

function effectiveMusicVolume(): number {
  const master = typeof Howler.volume() === 'number' ? Howler.volume() : 0.8;
  return MUSIC_VOLUME * Math.max(0, Math.min(1, master));
}

/** Keep the active track pinned to the current target volume (no ramp). */
function syncLiveMusicVolume(): void {
  if (music.current === null || music.playId === null || !music.wanted) return;
  musicHowl(music.current).volume(effectiveMusicVolume(), music.playId);
}

/**
 * Begin (or switch to) `track`. Safe to call before unlock (queues) and
 * without the record player (no-op). Same-track requests are idempotent;
 * different tracks crossfade over MUSIC_FADE_SEC.
 */
function requestMusic(track: MusicTrackId): void {
  if (!music.recordPlayerOwned || !music.wanted) return;
  if (!unlocked) {
    music.pendingPhase = phaseOfTrack(track);
    return;
  }

  // Idempotent: already the live track (or ramping into it).
  if (music.current === track && music.playId !== null) {
    syncLiveMusicVolume();
    return;
  }

  // Crossfade out whatever currently holds the mixer slot.
  if (music.current !== null && music.playId !== null) {
    const old = music.howls[music.current];
    const oldId = music.playId;
    if (old) {
      const from = typeof old.volume(oldId) === 'number' ? (old.volume(oldId) as number) : 0;
      // Register the stop BEFORE starting the ramp so the handler can never
      // miss the fade event.
      old.once('fade', () => old.stop(oldId));
      old.fade(from, 0, MUSIC_FADE_SEC * 1000, oldId);
    }
  }

  // Take the slot with a gentle fade-in from silence.
  const h = musicHowl(track);
  music.current = track;
  music.playId = h.play(); // loop:true keeps this id alive across loops
  h.volume(0, music.playId);
  h.fade(0, effectiveMusicVolume(), MUSIC_FADE_SEC * 1000, music.playId);
  music.pendingPhase = null;
}

function phaseOfTrack(track: MusicTrackId): DayPhase {
  switch (track) {
    case 'fireplace':
      return 'service';
    case 'cherry_blossom':
      return 'recap';
    default:
      return 'prep';
  }
}

/** Flush a pre-unlock phase cue once the title gesture unlocks audio. */
function flushPendingMusic(): void {
  if (music.pendingPhase !== null) {
    const phase = music.pendingPhase;
    music.pendingPhase = null;
    requestMusic(trackForPhase(phase));
  }
}

/** Phase cue from the game controller (morning / service / evening recap). */
export function playMusicForPhase(phase: DayPhase): void {
  requestMusic(trackForPhase(phase));
}

/** Stop music entirely (toggle-off), fading out over the crossfade window. */
export function stopMusic(): void {
  music.wanted = false;
  if (music.current !== null && music.playId !== null) {
    const h = musicHowl(music.current);
    const id = music.playId;
    const from = typeof h.volume(id) === 'number' ? (h.volume(id) as number) : 0;
    // Register before the ramp so the handler can never miss the event.
    h.once('fade', () => h.stop(id));
    h.fade(from, 0, MUSIC_FADE_SEC * 1000, id);
  }
  music.current = null;
  music.playId = null;
  music.pendingPhase = null;
}

/**
 * Record-player upgrade toggle (doc 02 §4.2) — drives the REAL soundtrack.
 * Owning it enables phase music; the controller supplies cues per phase.
 * Without it, everything stays silent (pre-purchase behavior preserved).
 */
export function setRecordPlayerEnabled(on: boolean): void {
  music.recordPlayerOwned = on;
  if (!on) {
    stopMusic();
    return;
  }
  music.wanted = true;
  if (unlocked) {
    // Enabled mid-session: start the morning/prep cue immediately.
    requestMusic(trackForPhase(music.pendingPhase ?? 'prep'));
  } else if (music.pendingPhase === null) {
    music.pendingPhase = 'prep';
  }
}

/** Test seam: mixer state without touching real audio. */
export function debugMusicState(): {
  current: MusicTrackId | null;
  enabled: boolean;
  wanted: boolean;
} {
  return {
    current: music.current,
    enabled: music.recordPlayerOwned,
    wanted: music.wanted,
  };
}
