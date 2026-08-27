// src/narrative/narrative-state.ts — thin facade: NarrativeInput → NarrativeSignals → NarrativeState
// Pure TypeScript, zero platform imports. Combines signals + evaluator.

import type { NarrativeInput } from './narrative-input';
import { calculateAllSignals } from './narrative-signals';
import { evaluateNarrativeState, type NarrativeState as EvaluatedNarrativeState, type NarrativeDimension } from './narrative-evaluator';

export type NarrativeState = EvaluatedNarrativeState & {
  /** Story progress tracking for scheduler */
  consumedBeats: string[];
  completedArcs: string[];
  flags: Record<string, boolean>;
  upgradesOwned: Record<string, boolean>;
  lettersDelivered: string[];
  lettersRead: string[];
  scenesSeen: string[];
  stars: number;
  daysSkipped: number;
  chapterEnteredDay: Record<number, number>;
};

export type { NarrativeDimension } from './narrative-evaluator';

/** Main entry point: evaluate narrative state from raw input */
export function evaluateNarrativeStateFromInput(input: NarrativeInput): NarrativeState {
  const signals = calculateAllSignals(input);
  const baseState = evaluateNarrativeState(
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
  
  // Add scheduler-required fields
  return {
    ...baseState,
    consumedBeats: [],
    completedArcs: [],
    flags: {},
    upgradesOwned: {},
    lettersDelivered: input.letters.lettersDelivered,
    lettersRead: input.letters.lettersRead,
    scenesSeen: input.story.seenScenes,
    stars: input.activity.stars,
    daysSkipped: input.activity.daysSkipped,
    chapterEnteredDay: input.story.chapterEnteredDay,
  };
}