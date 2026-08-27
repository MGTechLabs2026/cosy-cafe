// src/narrative/letter-scheduler.ts — selects and delivers letters based on priority
// Pure TypeScript, zero platform imports.

import type { NarrativeState, NarrativeDimension } from './narrative-state';
import type { NarrativeLetter, LetterRequirements, LetterSource, LetterCategory } from './story-definitions';

/** Letter delivery decision */
export interface LetterDelivery {
  letterId: string;
  reason: 'mandatory' | 'chapter-critical' | 'npc-critical' | 'behavioral' | 'flavor';
  priorityScore: number;
}

/** LetterScheduler - selects next letter to deliver */
export class LetterScheduler {
  private allLetters: readonly NarrativeLetter[];
  private trajectoryRules: ReadonlyArray<{
    id: NarrativeDimension;
    letter_emphasis_order: LetterSource[];
  }>;
  
  constructor(
    allLetters: readonly NarrativeLetter[],
    trajectoryRules: ReadonlyArray<{
      id: NarrativeDimension;
      letter_emphasis_order: LetterSource[];
    }>
  ) {
    this.allLetters = allLetters;
    this.trajectoryRules = trajectoryRules;
  }
  
  /** Check if a letter is eligible for delivery */
  checkEligibility(
    letter: NarrativeLetter,
    state: NarrativeState,
    saveData: {
      day: number;
      stars: number;
      upgrades: string[];
      flags: Record<string, unknown>;
      seen_scenes: string[];
      discovered_recipes: string[];
      hearts: Record<string, number>;
      total_serves: number;
    }
  ): boolean {
    const req = letter.requires;
    const flags = saveData.flags;
    const day = saveData.day;
    const chapter = (flags['current_chapter'] as number) ?? 0;
    
    // Day range
    if (req.day_min !== undefined && day < req.day_min) return false;
    if (req.day_max !== undefined && day > req.day_max) return false;
    
    // Chapter range
    if (req.chapter_min !== undefined && chapter < req.chapter_min) return false;
    if (req.chapter_max !== undefined && chapter > req.chapter_max) return false;
    
    // Hearts per NPC
    if (req.hearts_min) {
      for (const [npc, minHearts] of Object.entries(req.hearts_min)) {
        const displayedHearts = Math.floor((saveData.hearts[npc] ?? 0) + 1e-9);
        if (displayedHearts < minHearts) return false;
      }
    }
    
    // Dimension thresholds
    if (req.dimension_min) {
      for (const [dim, threshold] of Object.entries(req.dimension_min)) {
        if ((state.dimensions[dim as NarrativeDimension] ?? 0) < threshold) return false;
      }
    }
    
    // Required flags
    if (req.flags_required) {
      for (const flag of req.flags_required) {
        if (!flags[flag]) return false;
      }
    }
    
    // Forbidden flags
    if (req.flags_forbidden) {
      for (const flag of req.flags_forbidden) {
        if (flags[flag]) return false;
      }
    }
    
    // Required scenes
    if (req.scenes_seen) {
      for (const scene of req.scenes_seen) {
        if (!saveData.seen_scenes.includes(scene)) return false;
      }
    }
    
    // Required recipes
    if (req.recipes_discovered !== undefined) {
      if (typeof req.recipes_discovered === 'number') {
        if (saveData.discovered_recipes.length < req.recipes_discovered) return false;
      } else if (Array.isArray(req.recipes_discovered)) {
        for (const recipe of req.recipes_discovered) {
          if (!saveData.discovered_recipes.includes(recipe)) return false;
        }
      }
    }
    
    // Required upgrades
    if (req.upgrades_owned) {
      for (const upgrade of req.upgrades_owned) {
        if (!saveData.upgrades.includes(upgrade)) return false;
      }
    }
    
    // Min stars
    if (req.min_stars !== undefined && saveData.stars < req.min_stars) return false;
    
    // Min upgrades
    if (req.min_upgrades !== undefined && saveData.upgrades.length < req.min_upgrades) return false;
    
    // Min days skipped
    if (req.min_days_skipped !== undefined) {
      const expectedServes = saveData.day * 5;
      const actualServes = saveData.total_serves;
      const daysSkipped = Math.max(0, Math.floor((expectedServes - actualServes) / 5));
      if (daysSkipped < req.min_days_skipped) return false;
    }
    
    // Already delivered (for consumed letters)
    if (letter.consumed && (saveData.flags['letters_delivered'] as string[])?.includes(letter.id)) return false;
    
    return true;
  }
  
  /** Get all eligible letters for current state */
  getEligibleLetters(
    state: NarrativeState,
    saveData: {
      day: number;
      stars: number;
      upgrades: string[];
      flags: Record<string, unknown>;
      seen_scenes: string[];
      discovered_recipes: string[];
      hearts: Record<string, number>;
      total_serves: number;
    }
  ): NarrativeLetter[] {
    return this.allLetters.filter(letter => 
      letter.chapter <= state.chapter && // Only letters for current or past chapters
      this.checkEligibility(letter, state, saveData)
    );
  }
  
  /** Calculate dimension alignment score for a letter */
  getDimensionAlignmentScore(letter: NarrativeLetter, state: NarrativeState): number {
    if (!letter.requires.dimension_min) return 0;
    
    let score = 0;
    for (const [dim, threshold] of Object.entries(letter.requires.dimension_min)) {
      const value = state.dimensions[dim as NarrativeDimension] ?? 0;
      if (value >= threshold) {
        score += (value - threshold) * 10; // Bonus for exceeding threshold
      }
    }
    return score;
  }
  
  /** Get trajectory-based priority bonus */
  getTrajectoryPriority(letter: NarrativeLetter, state: NarrativeState): number {
    const dominant = state.dominantDimension;
    if (!dominant) return 0;
    
    const rule = this.trajectoryRules.find(r => r.id === dominant);
    if (!rule) return 0;
    
    const sourceIndex = rule.letter_emphasis_order.indexOf(letter.source);
    if (sourceIndex === -1) return 0;
    
    // Earlier in emphasis order = higher bonus
    return Math.max(0, 10 - sourceIndex);
  }
  
  /** Calculate total priority score for a letter */
  calculatePriorityScore(letter: NarrativeLetter, state: NarrativeState): number {
    let score = letter.priority;
    
    // Mandatory letters get huge bonus
    if (letter.mandatory) score += 1000;
    
    // Chapter-critical: matches current chapter exactly
    if (letter.chapter === state.chapter && !letter.mandatory) score += 50;
    
    // Dimension alignment
    score += this.getDimensionAlignmentScore(letter, state);
    
    // Trajectory priority
    score += this.getTrajectoryPriority(letter, state);
    
    return score;
  }
  
  /** Select next letter(s) to deliver */
  selectNextLetters(
    state: NarrativeState,
    saveData: {
      day: number;
      stars: number;
      upgrades: string[];
      flags: Record<string, unknown>;
      seen_scenes: string[];
      discovered_recipes: string[];
      hearts: Record<string, number>;
      total_serves: number;
    },
    maxLetters: number = 1
  ): LetterDelivery[] {
    const eligible = this.getEligibleLetters(state, saveData);
    
    // Score all eligible letters
    const scored = eligible.map(letter => ({
      letter,
      score: this.calculatePriorityScore(letter, state),
      reason: this.getReason(letter),
    }));
    
    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);
    
    // Apply caps: max per day, max per chapter per source
    const selected: LetterDelivery[] = [];
    const sourceCounts: Record<string, number> = {};
    const chapterSourceCounts: Record<string, Record<string, number>> = {};
    
    for (const { letter, score, reason } of scored) {
      if (selected.length >= maxLetters) break;
      
      // Check per-day limit
      if (selected.length >= maxLetters) break;
      
      // Check per-chapter per-source limit (max 3)
      const chapterKey = `${state.chapter}`;
      if (!chapterSourceCounts[chapterKey]) chapterSourceCounts[chapterKey] = {};
      if ((chapterSourceCounts[chapterKey][letter.source] ?? 0) >= 3) continue;
      
      // Check source cooldown
      if (letter.cooldown_days && letter.cooldown_days > 0) {
        // TODO: implement cooldown tracking
      }
      
      selected.push({
        letterId: letter.id,
        reason,
        priorityScore: score,
      });
      
      chapterSourceCounts[chapterKey][letter.source] = (chapterSourceCounts[chapterKey][letter.source] ?? 0) + 1;
    }
    
    return selected;
  }
  
  /** Get delivery reason category */
  private getReason(letter: NarrativeLetter): 'mandatory' | 'chapter-critical' | 'npc-critical' | 'behavioral' | 'flavor' {
    if (letter.mandatory) return 'mandatory';
    if (letter.category === 'branch') return 'chapter-critical';
    if (letter.category === 'npc') return 'npc-critical';
    if (letter.category === 'mystery' || letter.category === 'town') return 'behavioral';
    return 'flavor';
  }
  
  /** Get all letters for a specific source */
  getLettersBySource(source: LetterSource): readonly NarrativeLetter[] {
    return this.allLetters.filter(l => l.source === source);
  }
  
  /** Get all mandatory letters */
  getMandatoryLetters(): readonly NarrativeLetter[] {
    return this.allLetters.filter(l => l.mandatory);
  }
  
  /** Get all letters for current chapter */
  getLettersForChapter(chapter: number): readonly NarrativeLetter[] {
    return this.allLetters.filter(l => l.chapter === chapter);
  }
}