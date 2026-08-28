// sim/mops.ts — Mops the cat ambient state machine.
// Pure logic, no DOM/Canvas imports. The renderer consumes `MopsState` only.

import { GAME_WIDTH } from '../render/scale.js';

export type MopsStateName =
  | 'idle'
  | 'sleep'
  | 'stretch'
  | 'walk'
  | 'look'
  | 'sit'
  | 'pet'
  | 'sniff';

export interface MopsState {
  name: MopsStateName;
  /** Remaining seconds in this state; counts down each tick. */
  timerSec: number;
  /** World-space anchor x used by walk transitions. */
  x: number;
  /** Ground y for the current location. */
  groundY: number;
  /** True while moving between locations. */
  walking: boolean;
  /** Walk progress 0..1 when `walking` is true. */
  walkT: number;
  /** Walk start x. */
  walkFromX: number;
  /** Walk target x. */
  walkToX: number;
}

const DEFAULT_GROUND_Y = 246;
const BENCH_GROUND_Y = 128;
const BENCH_X = GAME_WIDTH - 150;
const HEARTH_X = GAME_WIDTH - 96;

function idleState(x = HEARTH_X, groundY = DEFAULT_GROUND_Y): MopsState {
  return { name: 'idle', timerSec: 4 + Math.random() * 6, x, groundY, walking: false, walkT: 0, walkFromX: x, walkToX: x };
}

function sleepState(x = HEARTH_X, groundY = DEFAULT_GROUND_Y): MopsState {
  return { name: 'sleep', timerSec: 8 + Math.random() * 10, x, groundY, walking: false, walkT: 0, walkFromX: x, walkToX: x };
}

export function createInitialMopsState(): MopsState {
  return idleState();
}

export function tickMops(
  state: MopsState,
  dtSec: number,
  opts: {
    reducedMotion: boolean;
    hasWindowBench: boolean;
    serviceOpen: boolean;
    doorChimeMs: number;
    activeMurkyMs: number;
    chooseCustomerMs: number;
    nowMs: number;
  },
): MopsState {
  if (opts.reducedMotion) {
    return instant(state);
  }

  // Walk animation tick.
  if (state.walking) {
    const speed = 120; // px/sec
    const dist = Math.max(1, Math.abs(state.walkToX - state.walkFromX));
    const nextT = Math.min(1, state.walkT + (speed * dtSec) / dist);
    const t = easeInOutCubic(nextT);
    const x = state.walkFromX + (state.walkToX - state.walkFromX) * t;
    if (nextT >= 1) {
      return { ...state, walking: false, walkT: 0, x: state.walkToX };
    }
    return { ...state, walkT: nextT, x };
  }

  // Timed transitions.
  let next = state;
  next.timerSec -= dtSec;
  if (next.timerSec <= 0) {
    switch (next.name) {
      case 'idle':
      case 'stretch':
      case 'look':
      case 'sniff':
      case 'pet':
      case 'sit':
        next = { ...idleState(next.x, next.groundY), x: next.x, groundY: next.groundY };
        break;
      case 'sleep':
        next = { ...idleState(next.x, next.groundY), x: next.x, groundY: next.groundY };
        break;
      default:
        next = { ...idleState(next.x, next.groundY), x: next.x, groundY: next.groundY };
    }
  }

  // Event overrides take priority.
  if (opts.serviceOpen) {
    const sinceChime = opts.nowMs - opts.doorChimeMs;
    if (sinceChime >= 0 && sinceChime < 1400) {
      return lookTowardDoor(next, opts.nowMs);
    }
    const sinceMurky = opts.nowMs - opts.activeMurkyMs;
    if (sinceMurky >= 0 && sinceMurky < 1800) {
      return { ...next, name: 'sniff', timerSec: Math.min(next.timerSec, 1.8) };
    }
  }

  const sinceChoose = opts.nowMs - opts.chooseCustomerMs;
  if (sinceChoose >= 0 && sinceChoose < 2200) {
    return chooseCustomer(next, opts.nowMs, sinceChoose);
  }

  // Window bench relocation.
  if (opts.hasWindowBench && !next.walking && next.groundY !== BENCH_GROUND_Y && Math.random() < dtSec * 0.05) {
    const targetX = BENCH_X;
    if (Math.abs(next.x - targetX) > 4) {
      return walkTo(next, targetX, BENCH_GROUND_Y, () => sleepState(targetX, BENCH_GROUND_Y));
    }
  }

  // Rare stretch from idle.
  if (next.name === 'idle' && Math.random() < dtSec * 0.04) {
    return { ...next, name: 'stretch', timerSec: 1.2 };
  }

  return next;
}

export function petMops(state: MopsState): MopsState {
  return { ...state, name: 'pet', timerSec: 1.4 };
}

export function mopsHitRect(state: MopsState): { x: number; y: number; w: number; h: number } | null {
  if (state.walking) return null;
  const w = 28;
  const h = 26;
  return { x: Math.round(state.x - w / 2), y: Math.round(state.groundY - h), w, h };
}

function instant(state: MopsState): MopsState {
  if (state.walking) return { ...state, walking: false, walkT: 0, x: state.walkToX };
  return { ...state, timerSec: 0 };
}

function lookTowardDoor(state: MopsState, nowMs: number): MopsState {
  const x = Math.min(state.x + 12, BENCH_X);
  return { ...state, name: 'look', timerSec: 1.4, x };
}

function chooseCustomer(state: MopsState, nowMs: number, sinceMs: number): MopsState {
  const t = sinceMs / 2200;
  const fromX = state.x;
  const toX = 258;
  const x = fromX + (toX - fromX) * easeInOutCubic(t);
  if (t >= 1) return { ...state, name: 'look', timerSec: 1.2, x: toX };
  return { ...state, walking: true, walkT: t, walkFromX: fromX, walkToX: toX, x };
}

function walkTo(
  state: MopsState,
  targetX: number,
  groundY: number,
  makeTarget: () => MopsState,
): MopsState {
  return {
    ...state,
    walking: true,
    walkT: 0,
    walkFromX: state.x,
    walkToX: targetX,
    groundY,
    name: 'walk',
    timerSec: 999,
  };
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
