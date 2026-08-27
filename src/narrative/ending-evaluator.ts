// src/narrative/ending-evaluator.ts — evaluates which ending the player achieved
// Pure TypeScript, zero platform imports. Pure function: state → ending.

import type { NarrativeState, NarrativeDimension } from './narrative-state';
import type { EndingId, EndingConfig } from './story-definitions';
import type { StoryProgress } from './story-progress';
import { ENDING_CONFIGS } from './story-definitions';

/** Result of ending evaluation */
export interface EndingResult {
  ending: EndingId;
  scores: Record<EndingId, number>;
  primaryDimension: NarrativeDimension | null;
}

/** EndingEvaluator — pure function: evaluates ending from narrative state */
export class EndingEvaluator {
  private endingConfigs: readonly EndingConfig[];
  
  constructor(endingConfigs: readonly EndingConfig[] = ENDING_CONFIGS) {
    this.endingConfigs = endingConfigs;
  }
  
  /** Evaluate ending from narrative state and story progress */
  evaluate(
    state: NarrativeState,
    progress: { 
      chapter: number;
      stars: number;
      completedArcs: string[];
      flags: Record<string, boolean>;
      upgradesOwned: Record<string, boolean>;
    }
  ): EndingResult {
    // Cannot evaluate before chapter 5
    if (state.chapter < 5) {
      return {
        ending: 'keeper', // fallback (won't be used)
        scores: { keeper: 0, builder: 0, wanderer: 0, community: 0 },
        primaryDimension: state.dominantDimension,
      };
    }
    
    // Calculate scores for each ending
    const scores: Record<EndingId, number> = {
      keeper: this.scoreEnding(state, progress, this.endingConfigs.find(e => e.id === 'keeper')!),
      builder: this.scoreEnding(state, progress, this.endingConfigs.find(e => e.id === 'builder')!),
      wanderer: this.scoreEnding(state, progress, this.endingConfigs.find(e => e.id === 'wanderer')!),
      community: this.scoreEnding(state, progress, this.endingConfigs.find(e => e.id === 'community')!),
    };

    // Get primary dimension for tiebreaker
    const primaryDimension = state.dominantDimension;
    const tiebreakerConfig = this.endingConfigs.find(e => e.tiebreaker_dimension === primaryDimension);
    const tiebreakerBonus = tiebreakerConfig ? 0.1 : 0;

    // An ending only "qualifies" if it meets ALL its minimum dimension thresholds.
    // Pacing (skipped days, early closes, low activity) does NOT feed any dimension,
    // so a calm/low-engagement player must not be silently pushed toward an ending.
    // When NO ending qualifies, the deterministic neutral fallback is 'keeper'
    // (belonging / continuity — the calm, P1-aligned default), not the ending with
    // the fewest requirements.
    const qualifiers = this.endingConfigs.filter(e => this.endingQualifies(e, state));
    const candidatePool = qualifiers.length > 0
      ? qualifiers
      : [this.endingConfigs.find(e => e.id === 'keeper')!];

    // Find max score with deterministic tiebreaker
    let bestEnding: EndingId = 'keeper';
    let bestScore = -Infinity;

    for (const config of candidatePool) {
      const ending = config.id;
      const bonus = config.tiebreaker_dimension === primaryDimension ? tiebreakerBonus : 0;
      const finalScore = scores[ending] + bonus;
      if (finalScore > bestScore) {
        bestScore = finalScore;
        bestEnding = ending;
      }
    }

    return {
      ending: bestEnding,
      scores,
      primaryDimension,
    };
  }

  /** True if the state meets ALL of an ending's minimum dimension thresholds. */
  private endingQualifies(config: EndingConfig, state: NarrativeState): boolean {
    for (const [dim, threshold] of Object.entries(config.min_dimensions ?? {})) {
      const value = state.dimensions[dim as 'care' | 'curiosity' | 'community' | 'comfort' | 'independence'] ?? 0;
      if (value < (threshold as number)) return false;
    }
    return true;
  }
  
  /** Score an ending based on its requirements */
  private scoreEnding(
    state: NarrativeState, 
    progress: { 
      stars: number;
      completedArcs: string[];
      flags: Record<string, boolean>;
      upgradesOwned: Record<string, boolean>;
    },
    config: EndingConfig
  ): number {
    let score = 0;
    
    // Dimension scores (primary factor)
    for (const [dim, threshold] of Object.entries(config.min_dimensions ?? {})) {
      const value = state.dimensions[dim as 'care' | 'curiosity' | 'community' | 'comfort' | 'independence'] ?? 0;
      if (value >= threshold) {
        score += 1 + (value - threshold); // Base 1 + excess
      } else {
        score -= (threshold - value) * 2; // Penalty for missing
      }
    }
    
    // Star requirement
    if (config.min_stars !== undefined) {
      if (progress.stars >= config.min_stars) score += 1;
      else score -= (config.min_stars - progress.stars) * 0.5;
    }
    
    // Upgrade requirement
    if (config.min_upgrades !== undefined) {
      const upgradeCount = Object.keys(progress.upgradesOwned ?? {}).length;
      if (upgradeCount >= config.min_upgrades) score += 1;
      else score -= (config.min_upgrades - upgradeCount) * 0.5;
    }
    
    // Required arcs
    if (config.required_arcs) {
      for (const arc of config.required_arcs) {
        if (progress.completedArcs?.includes(arc)) score += 1;
        else score -= 1;
      }
    }
    
    // Required flags
    if (config.required_flags) {
      for (const flag of config.required_flags) {
        if (progress.flags?.[flag]) score += 1;
        else score -= 1;
      }
    }
    
    return score;
  }
  
  /** Get all ending configs */
  getEndingConfigs(): readonly EndingConfig[] {
    return this.endingConfigs;
  }
}

/** Convenience function for simple evaluation */
export function evaluateEnding(
  state: NarrativeState,
  progress: { 
    chapter: number;
    stars: number;
    completedArcs: string[];
    flags: Record<string, boolean>;
    upgradesOwned: Record<string, boolean>;
  }
): EndingId {
  const evaluator = new EndingEvaluator();
  return evaluator.evaluate(state, progress).ending;
}