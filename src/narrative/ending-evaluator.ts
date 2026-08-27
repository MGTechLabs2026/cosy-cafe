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
      daysSkipped: number;
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
    
    // Find max score with deterministic tiebreaker
    let bestEnding: EndingId = 'keeper';
    let bestScore = scores.keeper + (tiebreakerConfig?.id === 'keeper' ? tiebreakerBonus : 0);
    
    for (const [ending, score] of Object.entries(scores)) {
      const bonus = this.endingConfigs.find(e => e.id === ending)?.tiebreaker_dimension === primaryDimension ? tiebreakerBonus : 0;
      const finalScore = score + bonus;
      if (finalScore > bestScore) {
        bestScore = finalScore;
        bestEnding = ending as EndingId;
      }
    }
    
    return {
      ending: bestEnding,
      scores,
      primaryDimension,
    };
  }
  
  /** Score an ending based on its requirements */
  private scoreEnding(
    state: NarrativeState, 
    progress: { 
      stars: number;
      daysSkipped: number;
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
    
    // Days skipped requirement
    if (config.min_days_skipped !== undefined) {
      if (progress.daysSkipped >= config.min_days_skipped) score += 1;
      else score -= (config.min_days_skipped - progress.daysSkipped) * 0.3;
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
    daysSkipped: number;
    completedArcs: string[];
    flags: Record<string, boolean>;
    upgradesOwned: Record<string, boolean>;
  }
): EndingId {
  const evaluator = new EndingEvaluator();
  return evaluator.evaluate(state, progress).ending;
}