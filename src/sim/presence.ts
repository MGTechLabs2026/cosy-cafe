// sim/presence.ts — lightweight deterministic presence selection.
// Owns ONLY candidate selection; it never mutates sim state.
// The controller applies the returned change.

import type { MopsStateName } from './mops.js';

export interface PresenceOptions {
  reducedMotion: boolean;
  mopsStateName: MopsStateName;
  serviceOpen: boolean;
  hasActiveCustomer: boolean;
  hasWindowBench: boolean;
  day: number;
  elapsedMs: number;
}

export interface PresenceChange {
  target: 'mops';
  from: MopsStateName;
  to: MopsStateName;
}

interface Candidate {
  from: MopsStateName;
  to: MopsStateName;
  weight: number;
}

/** Tiny deterministic PRNG — identical inputs → identical output. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Mops ambient candidates: small pool, no immediate repeat. */
function buildMopsCandidates(current: MopsStateName): Candidate[] {
  const all: Candidate[] = [
    { from: 'sleep', to: 'sit', weight: 60 },
    { from: 'sit',   to: 'look', weight: 40 },
    { from: 'look',  to: 'stretch', weight: 30 },
    { from: 'sit',   to: 'sleep', weight: 50 },
    { from: 'idle',  to: 'sit', weight: 20 },
    { from: 'idle',  to: 'look', weight: 15 },
  ];

  // Window bench adds a small chance to move toward bench.
  // Defer actual walk to tickMops; presence only nudges the state.
  return all.filter((c) => c.from === current);
}

/** Pick one deterministic presence change, or null when none is eligible. */
export function pickAmbientPresence(opts: PresenceOptions): PresenceChange | null {
  // The presence system must not fire during the first minute of active café
  // time. This keeps the café from changing immediately on open and protects
  // against post-tab-stall bursts: callers should only evaluate after real
  // active time has passed.
  if (opts.elapsedMs < 60000) return null;

  // During active service, prefer stillness.
  if (opts.serviceOpen && opts.hasActiveCustomer) return null;

  const candidates = buildMopsCandidates(opts.mopsStateName);
  if (candidates.length === 0) return null;

  const tick = Math.floor(opts.elapsedMs / 60000);
  const rng = mulberry32(opts.day * 1013904223 + tick);
  const totalWeight = candidates.reduce((s, c) => s + c.weight, 0);
  let roll = rng() * totalWeight;

  for (const c of candidates) {
    roll -= c.weight;
    if (roll <= 0) {
      if (c.to === opts.mopsStateName) return null;
      return { target: 'mops', from: opts.mopsStateName, to: c.to };
    }
  }

  return null;
}
