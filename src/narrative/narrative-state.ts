// src/narrative/narrative-state.ts — thin facade: NarrativeInput → NarrativeSignals → NarrativeState
// Pure TypeScript, zero platform imports. Combines signals + evaluator.

import type { NarrativeInput, NarrativeDimension } from './narrative-input';
import { calculateAllSignals } from './narrative-signals';
import { evaluateNarrativeState, type NarrativeState } from './narrative-evaluator';

export type { NarrativeState } from './narrative-evaluator';

/** Main entry point: evaluate narrative state from raw input */
export function evaluateNarrativeStateFromInput(input: NarrativeInput): NarrativeState {
  const signals = calculateAllSignals(input);
  return evaluateNarrativeState(
    signals,
    input.story.chapter,
    input.story.marigoldMysteryLayer,
    input.story.wrenCluesGathered,
    input.recipes.wrenScenesSeen,
    input.story.endingAchieved,
    input.activity.day,
    input.story.playthroughCount,
    input.story.previousEndings
  );
}