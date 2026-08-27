// src/narrative/narrative-scheduler.ts — schedules story beats and chapter progression
// Pure TypeScript, zero platform imports. No dimension calculation.

import type { NarrativeState, NarrativeDimension } from './narrative-state';
import type { ChapterConfig, EndingConfig, EndingId, NarrativeChapter } from './story-definitions';

/** Story beat that can be triggered */
export interface StoryBeat {
  id: string;
  type: 'letter' | 'scene' | 'ending' | 'convergence';
  chapter: NarrativeChapter;
  priority: number;
  prerequisites: BeatPrerequisites;
}

/** Prerequisites for a story beat */
export interface BeatPrerequisites {
  dayMin?: number;
  dayMax?: number;
  chapterMin?: number;
  chapterMax?: number;
  requiredFlags?: string[];
  forbiddenFlags?: string[];
  requiredScenes?: string[];
  requiredDimensions?: Partial<Record<NarrativeDimension, number>>;
  requiredHearts?: Record<string, number>;
  requiredStars?: number;
  requiredUpgrades?: string[];
  requiredRecipes?: number;
  requiredDaysSkipped?: number;
}

/** Scheduler result */
export interface SchedulerResult {
  nextBeats: StoryBeat[];
  chapterAdvanced: boolean;
  newChapter?: NarrativeChapter;
  endingEvaluated: boolean;
  ending?: EndingId;
}

/** Chapter progression state */
export interface ChapterProgress {
  currentChapter: NarrativeChapter;
  chapterEnteredDay: number;
  daysInChapter: number;
  mandatoryBeatsCompleted: string[];
  mandatoryBeatsRemaining: string[];
}

/** Story progress tracking (minimal state for scheduler) */
export interface StoryProgress {
  consumedBeats: string[];
  completedArcs: string[];
  flags: Record<string, boolean>;
  upgradesOwned: Record<string, boolean>;
  lettersDelivered: string[];
  lettersRead: string[];
  scenesSeen: string[];
}

/** NarrativeScheduler - orchestrates story beat delivery and chapter progression */
export class NarrativeScheduler {
  private chapterConfigs: ReadonlyArray<ChapterConfig>;
  private endingConfigs: ReadonlyArray<EndingConfig>;
  
  constructor(
    chapterConfigs: ReadonlyArray<ChapterConfig>,
    endingConfigs: ReadonlyArray<EndingConfig>
  ) {
    this.chapterConfigs = chapterConfigs;
    this.endingConfigs = endingConfigs;
  }
  
  /** Get current chapter progress */
  getChapterProgress(state: NarrativeState, currentDay: number): ChapterProgress {
    const config = this.chapterConfigs.find(c => c.id === state.chapter);
    const enteredDay = (state.chapterEnteredDay ?? {})[state.chapter] ?? currentDay;
    
    const mandatoryBeats = config?.mandatory_beats ?? [];
    const completed = state.consumedBeats ?? [];
    
    return {
      currentChapter: state.chapter as NarrativeChapter,
      chapterEnteredDay: enteredDay,
      daysInChapter: currentDay - enteredDay,
      mandatoryBeatsCompleted: mandatoryBeats.filter(b => completed.includes(b)),
      mandatoryBeatsRemaining: mandatoryBeats.filter(b => !completed.includes(b)),
    };
  }
  
  /** Check if chapter should advance */
  shouldAdvanceChapter(progress: ChapterProgress, currentDay: number): boolean {
    const config = this.chapterConfigs.find(c => c.id === progress.currentChapter);
    if (!config) return false;
    
    const [, maxDay] = config.days;
    const allMandatoryComplete = progress.mandatoryBeatsRemaining.length === 0;
    const dayThresholdMet = currentDay >= maxDay;
    
    // Chapter 0: advance after day 2 OR mandatory beats complete
    if (progress.currentChapter === 0) {
      return dayThresholdMet || allMandatoryComplete;
    }
    
    // Other chapters: advance when day threshold met AND mandatory beats complete
    // OR convergence required and day threshold met
    if (config.convergence_required) {
      return dayThresholdMet;
    }
    
    return dayThresholdMet && allMandatoryComplete;
  }
  
  /** Get next chapter */
  getNextChapter(current: NarrativeChapter): NarrativeChapter | null {
    if (current >= 5) return null;
    return (current + 1) as NarrativeChapter;
  }
  
  /** Evaluate if ending should be triggered */
  evaluateEnding(state: NarrativeState, currentDay: number): EndingId | null {
    if (state.chapter < 5) return null;
    if (currentDay < 13) return null; // Endings only in days 13-14
    if (state.endingAchieved) return null; // Already have ending
    
    const scores: Record<EndingId, number> = {
      keeper: this.scoreEnding(state, this.endingConfigs.find(e => e.id === 'keeper')!),
      builder: this.scoreEnding(state, this.endingConfigs.find(e => e.id === 'builder')!),
      wanderer: this.scoreEnding(state, this.endingConfigs.find(e => e.id === 'wanderer')!),
      community: this.scoreEnding(state, this.endingConfigs.find(e => e.id === 'community')!),
    };
    
    // Get primary dimension for tiebreaker
    const primaryDim = state.dominantDimension;
    const tiebreakerConfig = this.endingConfigs.find(e => e.tiebreaker_dimension === primaryDim);
    const tiebreakerBonus = tiebreakerConfig ? 0.1 : 0;

    // An ending only "qualifies" if it meets ALL its minimum dimension thresholds.
    // Pacing does not feed any dimension, so a calm/low-engagement player is not
    // pushed toward an ending. When NO ending qualifies, the deterministic neutral
    // fallback is 'keeper' (belonging / continuity — the calm, P1-aligned default).
    const qualifiers = this.endingConfigs.filter(e => this.endingQualifies(e, state));
    const candidatePool = qualifiers.length > 0
      ? qualifiers
      : [this.endingConfigs.find(e => e.id === 'keeper')!];

    // Find max score with tiebreaker
    let bestEnding: EndingId = 'keeper';
    let bestScore = -Infinity;

    for (const config of candidatePool) {
      const ending = config.id;
      const bonus = config.tiebreaker_dimension === primaryDim ? tiebreakerBonus : 0;
      const finalScore = scores[ending] + bonus;
      if (finalScore > bestScore) {
        bestScore = finalScore;
        bestEnding = ending;
      }
    }

    return bestEnding;
  }

  /** True if the state meets ALL of an ending's minimum dimension thresholds. */
  private endingQualifies(config: EndingConfig, state: NarrativeState): boolean {
    for (const [dim, threshold] of Object.entries(config.min_dimensions ?? {})) {
      const value = state.dimensions[dim as NarrativeDimension] ?? 0;
      if (value < (threshold as number)) return false;
    }
    return true;
  }
  
  /** Score an ending based on requirements */
  private scoreEnding(state: NarrativeState, config: EndingConfig): number {
    let score = 0;
    
    // Dimension scores
    for (const [dim, threshold] of Object.entries(config.min_dimensions ?? {})) {
      const value = state.dimensions[dim as NarrativeDimension] ?? 0;
      if (value >= threshold) {
        score += 1 + (value - threshold); // Base 1 + excess
      } else {
        score -= (threshold - value) * 2; // Penalty for missing
      }
    }
    
    // Star requirement
    if (config.min_stars !== undefined) {
      if (state.stars >= config.min_stars) score += 1;
      else score -= (config.min_stars - state.stars) * 0.5;
    }
    
    // Upgrade requirement
    if (config.min_upgrades !== undefined) {
      const upgradeCount = Object.keys(state.upgradesOwned ?? {}).length;
      if (upgradeCount >= config.min_upgrades) score += 1;
      else score -= (config.min_upgrades - upgradeCount) * 0.5;
    }
    
    // Required arcs
    if (config.required_arcs) {
      for (const arc of config.required_arcs) {
        if (state.completedArcs?.includes(arc)) score += 1;
        else score -= 1;
      }
    }
    
    // Required flags
    if (config.required_flags) {
      for (const flag of config.required_flags) {
        if (state.flags?.[flag]) score += 1;
        else score -= 1;
      }
    }
    
    return score;
  }
  
  /** Get eligible convergence beats for current chapter */
  getConvergenceBeats(state: NarrativeState): StoryBeat[] {
    const config = this.chapterConfigs.find(c => c.id === state.chapter);
    if (!config || !config.convergence_required) return [];
    
    // Convergence beats are mandatory and always available at chapter transition
    return config.mandatory_beats.map(beatId => ({
      id: beatId,
      type: 'convergence' as const,
      chapter: state.chapter as NarrativeChapter,
      priority: 100,
      prerequisites: {},
    }));
  }
  
  /** Get all available story beats for current state */
  getAvailableBeats(
    state: NarrativeState,
    storyProgress: StoryProgress,
    currentDay: number
  ): StoryBeat[] {
    const beats: StoryBeat[] = [];
    
    // Add mandatory beats for current chapter
    const config = this.chapterConfigs.find(c => c.id === state.chapter);
    if (config) {
      for (const beatId of config.mandatory_beats) {
        if (!storyProgress.consumedBeats.includes(beatId)) {
          beats.push({
            id: beatId,
            type: beatId.includes('scene') ? 'scene' : 'letter',
            chapter: state.chapter as NarrativeChapter,
            priority: 90,
            prerequisites: {},
          });
        }
      }
    }
    
    // Add convergence beats if chapter transitioning
    if (this.shouldAdvanceChapter(this.getChapterProgress(state, currentDay), currentDay)) {
      beats.push(...this.getConvergenceBeats(state));
    }
    
    // Add ending evaluation if at end
    if (state.chapter === 5 && currentDay >= 13) {
      beats.push({
        id: 'ending_evaluation',
        type: 'ending',
        chapter: 5 as NarrativeChapter,
        priority: 100,
        prerequisites: {},
      });
    }
    
    return beats.sort((a, b) => b.priority - a.priority);
  }
}

/**
 * Build the scheduler's lightweight progress view from already-extracted
 * narrative flags (NOT raw SaveData — the save boundary lives in
 * createNarrativeInput / createStoryProgressFromSave).
 */
export function createSchedulerStoryProgress(
  flags: Record<string, boolean>,
  upgradesOwned: string[],
  lettersDelivered: string[],
  lettersRead: string[],
  scenesSeen: string[],
): StoryProgress {
  return {
    consumedBeats: [],
    completedArcs: [],
    flags,
    upgradesOwned: Object.fromEntries(upgradesOwned.map(u => [u, true])),
    lettersDelivered,
    lettersRead,
    scenesSeen,
  };
}