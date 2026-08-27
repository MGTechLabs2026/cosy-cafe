// tests/ending-evaluator.test.ts — tests for ending evaluator
import { describe, it, expect } from 'vitest';
import { EndingEvaluator, evaluateEnding } from '../src/narrative/ending-evaluator';
import { ENDING_CONFIGS, ENDING_CONFIGS as ENDING_CONFIGS_ALIAS } from '../src/narrative/story-definitions';
import { createMockState, createMockSaveData } from './narrative-scheduler.test';

describe('EndingEvaluator', () => {
  const evaluator = new EndingEvaluator(ENDING_CONFIGS);
  
  function createProgress(overrides: Partial<{
    stars: number;
    daysSkipped: number;
    completedArcs: string[];
    flags: Record<string, boolean>;
    upgradesOwned: Record<string, boolean>;
  }> = {}) {
    return {
      stars: overrides.stars ?? 2,
      daysSkipped: overrides.daysSkipped ?? 0,
      completedArcs: overrides.completedArcs ?? [],
      flags: overrides.flags ?? {},
      upgradesOwned: overrides.upgradesOwned ?? {},
    };
  }
  
  function createState(overrides: Partial<{
    chapter: number;
    dimensions: Record<string, number>;
    dominantDimension: string | null;
    endingAchieved: string | null;
  }> = {}) {
    const base = {
      chapter: 5,
      dimensions: { care: 0.3, curiosity: 0.2, community: 0.2, comfort: 0.15, independence: 0.15 },
      dominantDimension: 'care',
      endingAchieved: null,
    };
    return { ...base, ...overrides };
  }
  
  it('evaluates keeper ending with high care and community', () => {
    const state = createState({
      chapter: 5,
      dimensions: { care: 0.7, curiosity: 0.1, community: 0.5, comfort: 0.2, independence: 0.1 },
      dominantDimension: 'care',
    });
    const progress = createProgress({ stars: 3 });
    
    const result = evaluator.evaluate(state, progress);
    
    expect(result.ending).toBe('keeper');
    expect(result.scores.keeper).toBeGreaterThan(result.scores.builder);
    expect(result.scores.keeper).toBeGreaterThan(result.scores.wanderer);
    expect(result.scores.keeper).toBeGreaterThan(result.scores.community);
  });
  
  it('evaluates builder ending with high comfort and stars', () => {
    const state = createState({
      chapter: 5,
      dimensions: { care: 0.2, curiosity: 0.1, community: 0.1, comfort: 0.8, independence: 0.1 },
      dominantDimension: 'comfort',
    });
    const progress = createProgress({ 
      stars: 4,
      upgradesOwned: { bigger_shelf: true, second_kettle: true, recipe_hints: true, comfort_furniture: true },
    });
    
    const result = evaluator.evaluate(state, progress);
    
    expect(result.ending).toBe('builder');
  });
  
  it('evaluates wanderer ending with high independence and days skipped', () => {
    const state = createState({
      chapter: 5,
      dimensions: { care: 0.1, curiosity: 0.2, community: 0.1, comfort: 0.1, independence: 0.8 },
      dominantDimension: 'independence',
    });
    const progress = createProgress({ 
      daysSkipped: 4,
      completedArcs: ['wren_arc'],
    });
    
    const result = evaluator.evaluate(state, progress);
    
    expect(result.ending).toBe('wanderer');
  });
  
  it('evaluates community ending with high community and required flags', () => {
    const state = createState({
      chapter: 5,
      dimensions: { care: 0.3, curiosity: 0.2, community: 0.7, comfort: 0.1, independence: 0.1 },
      dominantDimension: 'community',
    });
    const progress = createProgress({
      flags: { 
        town_ch3_market_day_delivered: true, 
        sela_ch1_intro_delivered: true, 
        bram_ch1_intro_delivered: true, 
        nia_ch1_intro_delivered: true 
      },
    });
    
    const result = evaluator.evaluate(state, progress);
    
    expect(result.ending).toBe('community');
  });
  
  it('uses tiebreaker when scores are close', () => {
    // State where multiple endings have similar scores
    const state = createState({
      chapter: 5,
      dimensions: { care: 0.4, curiosity: 0.4, community: 0.4, comfort: 0.4, independence: 0.4 },
      dominantDimension: 'care',
    });
    const progress = createProgress({ stars: 2 });
    
    const result = evaluator.evaluate(state, progress);
    
    // With care as dominant, keeper should win tiebreaker
    expect(result.ending).toBe('keeper');
    expect(result.primaryDimension).toBe('care');
  });
  
  it('returns early for chapter < 5', () => {
    const state = createState({ chapter: 4 });
    const progress = createProgress({});
    
    const result = evaluator.evaluate(state, progress);
    
    // Before chapter 5, returns fallback
    expect(result.ending).toBe('keeper');
    expect(result.primaryDimension).toBe(state.dominantDimension);
  });
  
  it('returns deterministic result for identical state', () => {
    const state = createState({ chapter: 5 });
    const progress = createProgress({ stars: 3 });
    
    const result1 = evaluator.evaluate(state, progress);
    const result2 = evaluator.evaluate(state, progress);
    
    expect(result1.ending).toBe(result2.ending);
    expect(result1.scores).toEqual(result2.scores);
  });
  
  it('convenience function works', () => {
    const state = createState({ chapter: 5 });
    const progress = createProgress({ stars: 3 });
    
    const ending = evaluateEnding(state, progress);
    
    expect(typeof ending).toBe('string');
    expect(['keeper', 'builder', 'wanderer', 'community']).toContain(ending);
  });
  
  it('penalizes missing required arcs', () => {
    // Keeper requires fenwick_arc_complete
    const state = createState({ chapter: 5 });
    const progress = createProgress({ 
      stars: 4,
      completedArcs: [], // missing fenwick_arc_complete
    });
    
    const result = evaluator.evaluate(state, progress);
    
    // Should be penalized for missing required arc
    expect(result.scores.keeper).toBeLessThan(2);
  });
  
  it('penalizes missing stars requirement', () => {
    const state = createState({ chapter: 5 });
    const progress = createProgress({ stars: 2 }); // Builder needs 4
    
    const result = evaluator.evaluate(state, progress);
    
    // Builder should be penalized for low stars
    expect(result.scores.builder).toBeLessThan(0);
  });
  
  it('all endings are valid - no failure states', () => {
    // Every possible state should produce a valid ending
    const testStates = [
      { dimensions: { care: 0.9, curiosity: 0.1, community: 0.1, comfort: 0.1, independence: 0.1 } },
      { dimensions: { care: 0.1, curiosity: 0.9, community: 0.1, comfort: 0.1, independence: 0.1 } },
      { dimensions: { care: 0.1, curiosity: 0.1, community: 0.9, comfort: 0.1, independence: 0.1 } },
      { dimensions: { care: 0.1, curiosity: 0.1, community: 0.1, comfort: 0.9, independence: 0.1 } },
      { dimensions: { care: 0.1, curiosity: 0.1, community: 0.1, comfort: 0.1, independence: 0.9 } },
    ];
    
    for (const dims of testStates) {
      const state = createState({ chapter: 5, dimensions: dims, dominantDimension: 'care' });
      const progress = createProgress({});
      const result = evaluator.evaluate(state, progress);
      
      expect(['keeper', 'builder', 'wanderer', 'community']).toContain(result.ending);
      expect(result.ending).not.toBeNull();
    }
  });
});