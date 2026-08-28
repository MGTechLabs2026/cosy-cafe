// src/narrative/activity-ledger.ts — records and queries player activity events
// Pure TypeScript, zero platform imports. No narrative rules — only data recording.

import type { ActivityEvent, ServeEvent, ChatEvent, BrewEvent, RecipeDiscoveredEvent, JournalOpenedEvent, UpgradePurchasedEvent, DaySkippedEvent, EarlyCloseEvent, IngredientsPurchasedEvent, LetterReadEvent, LetterDismissedEvent, WrenMysteryBrewEvent, WrenVisitEvent, SelfDirectedChoiceEvent, CommunityBeatEvent } from './activity-events';

/** Compact counter state for persistence (replaces full event history in save) */
export interface ActivityCounters {
  // Serve counts
  totalServes: number;
  favoriteServeCount: number;
  correctServeCount: number;
  servesByNpc: Record<string, number>;
  servesByRecipe: Record<string, number>;
  
  // Chat counts
  totalChats: number;
  chatsByNpc: Record<string, number>;
  
  // Brew counts
  totalBrews: number;
  experimentalBrewCount: number;
  wrenMysteryBrewCount: number;
  
  // Recipe discovery
  recipeDiscoveryCount: number;
  discoveredRecipes: string[];
  
  // Journal
  journalOpensTotal: number;
  journalOpensByTab: Record<string, number>;
  
  // Upgrades
  upgradePurchaseCount: number;
  
  // Pacing
  daysSkipped: number;
  earlyCloses: number;
  
  // Letters
  lettersReadCount: number;
  lettersDismissedCount: number;
  readLetterIds: string[];
  dismissedLetterIds: string[];
  
  // Wren specific
  wrenVisits: number;
  wrenMysteryClues: number;

  // Legitimate wanderer signal: distinct self-directed-choice beats the player
  // explicitly took (e.g. Wren's "old road" beat). NOT pacing/engagement.
  independentChoiceCount: number;
  // De-duplicated beat ids so re-watching a scene doesn't re-credit.
  independentChoiceBeats: string[];

  // Legitimate community signal: distinct community-building beats the player
  // performed (e.g. bringing two NPCs together). Distinct from mere breadth.
  communityBeatCount: number;
  communityBeatIds: string[];

  // Shop
  ingredientsPurchasedTotal: number;

  // Version for migration
  version: number;
}

/** Default empty counters */
export function createEmptyCounters(): ActivityCounters {
  return {
    totalServes: 0,
    favoriteServeCount: 0,
    correctServeCount: 0,
    servesByNpc: {},
    servesByRecipe: {},
    totalChats: 0,
    chatsByNpc: {},
    totalBrews: 0,
    experimentalBrewCount: 0,
    wrenMysteryBrewCount: 0,
    recipeDiscoveryCount: 0,
    discoveredRecipes: [],
    journalOpensTotal: 0,
    journalOpensByTab: {},
    upgradePurchaseCount: 0,
    daysSkipped: 0,
    earlyCloses: 0,
    lettersReadCount: 0,
    lettersDismissedCount: 0,
    readLetterIds: [],
    dismissedLetterIds: [],
    wrenVisits: 0,
    wrenMysteryClues: 0,
    independentChoiceCount: 0,
    independentChoiceBeats: [],
    communityBeatCount: 0,
    communityBeatIds: [],
    ingredientsPurchasedTotal: 0,
    version: 1,
  };
}

/** ActivityLedger — records events and derives counts.
 *  Does NOT contain narrative interpretation logic. */
export class ActivityLedger {
  private events: ActivityEvent[] = [];
  private counters: ActivityCounters = createEmptyCounters();
  
  constructor(existingCounters?: Partial<ActivityCounters>) {
    if (existingCounters) {
      this.counters = { ...createEmptyCounters(), ...existingCounters };
    }
  }
  
  /** Record a new activity event */
  record(event: ActivityEvent): void {
    this.events.push(event);
    this.updateCounters(event);
  }
  
  /** Update internal counters from an event */
  private updateCounters(event: ActivityEvent): void {
    switch (event.type) {
      case 'serve': {
        this.counters.totalServes += 1;
        this.counters.servesByNpc[event.npcId] = (this.counters.servesByNpc[event.npcId] ?? 0) + 1;
        this.counters.servesByRecipe[event.recipeId] = (this.counters.servesByRecipe[event.recipeId] ?? 0) + 1;
        if (event.favorite) this.counters.favoriteServeCount += 1;
        if (event.correct) this.counters.correctServeCount += 1;
        break;
      }
      case 'chat': {
        this.counters.totalChats += 1;
        this.counters.chatsByNpc[event.npcId] = (this.counters.chatsByNpc[event.npcId] ?? 0) + 1;
        break;
      }
      case 'brew': {
        this.counters.totalBrews += 1;
        if (event.experimental) this.counters.experimentalBrewCount += 1;
        if (event.wrenMystery) this.counters.wrenMysteryBrewCount += 1;
        break;
      }
      case 'recipe_discovered': {
        this.counters.recipeDiscoveryCount += 1;
        if (!this.counters.discoveredRecipes.includes(event.recipeId)) {
          this.counters.discoveredRecipes.push(event.recipeId);
        }
        break;
      }
      case 'journal_opened': {
        this.counters.journalOpensTotal += 1;
        this.counters.journalOpensByTab[event.tab] = (this.counters.journalOpensByTab[event.tab] ?? 0) + 1;
        break;
      }
      case 'upgrade_purchased': {
        this.counters.upgradePurchaseCount += 1;
        break;
      }
      case 'day_skipped': {
        this.counters.daysSkipped += 1;
        break;
      }
      case 'early_close': {
        this.counters.earlyCloses += 1;
        break;
      }
      case 'ingredients_purchased': {
        this.counters.ingredientsPurchasedTotal += 1;
        break;
      }
      case 'letter_read': {
        this.counters.lettersReadCount += 1;
        if (!this.counters.readLetterIds.includes(event.letterId)) {
          this.counters.readLetterIds.push(event.letterId);
        }
        break;
      }
      case 'letter_dismissed': {
        this.counters.lettersDismissedCount += 1;
        if (!this.counters.dismissedLetterIds.includes(event.letterId)) {
          this.counters.dismissedLetterIds.push(event.letterId);
        }
        break;
      }
      case 'wren_mystery_brew': {
        this.counters.wrenMysteryClues += 1;
        break;
      }
      case 'wren_visit': {
        this.counters.wrenVisits += 1;
        break;
      }
      case 'self_directed_choice': {
        // De-duplicate per beat so a scene's choice can't be farmed by
        // re-triggering it. Only novel beats raise the count.
        if (!this.counters.independentChoiceBeats.includes(event.beatId)) {
          this.counters.independentChoiceBeats.push(event.beatId);
          this.counters.independentChoiceCount += 1;
        }
        break;
      }
      case 'community_beat': {
        if (!this.counters.communityBeatIds.includes(event.beatId)) {
          this.counters.communityBeatIds.push(event.beatId);
          this.counters.communityBeatCount += 1;
        }
        break;
      }
    }
  }
  
  /** Get all recorded events (for debugging/export) */
  getAllEvents(): ReadonlyArray<ActivityEvent> {
    return this.events;
  }
  
  /** Get events of a specific type */
  getEventsByType<T extends ActivityEvent['type']>(type: T): ActivityEvent[] {
    return this.events.filter(e => e.type === type);
  }
  
  /** Get current counters snapshot */
  getCounters(): Readonly<ActivityCounters> {
    return this.counters;
  }
  
  /** Get counter for a specific event type (simple count) */
  count(type: ActivityEvent['type']): number {
    return this.events.filter(e => e.type === type).length;
  }
  
  /** Get serve count for a specific NPC */
  getServeCount(npcId: string): number {
    return this.counters.servesByNpc[npcId] ?? 0;
  }
  
  /** Get chat count for a specific NPC */
  getChatCount(npcId: string): number {
    return this.counters.chatsByNpc[npcId] ?? 0;
  }
  
  /** Get serve count for a specific recipe */
  getRecipeServeCount(recipeId: string): number {
    return this.counters.servesByRecipe[recipeId] ?? 0;
  }
  
  /** Get favorite serve ratio (0-1) */
  getFavoriteServeRatio(): number {
    if (this.counters.totalServes === 0) return 0;
    return this.counters.favoriteServeCount / this.counters.totalServes;
  }
  
  /** Get correct serve ratio (0-1) */
  getCorrectServeRatio(): number {
    if (this.counters.totalServes === 0) return 0;
    return this.counters.correctServeCount / this.counters.totalServes;
  }
  
  /** Get chat ratio (chats per serve) */
  getChatRatio(): number {
    if (this.counters.totalServes === 0) return 0;
    return this.counters.totalChats / this.counters.totalServes;
  }
  
  /** Get experimental brew ratio */
  getExperimentalBrewRatio(): number {
    if (this.counters.totalBrews === 0) return 0;
    return this.counters.experimentalBrewCount / this.counters.totalBrews;
  }
  
  /** Get Wren mystery brew ratio */
  getWrenMysteryBrewRatio(): number {
    if (this.counters.totalBrews === 0) return 0;
    return this.counters.wrenMysteryBrewCount / this.counters.totalBrews;
  }
  
  /** Get journal opens per day */
  getJournalOpensPerDay(day: number): number {
    if (day <= 0) return 0;
    return this.counters.journalOpensTotal / day;
  }
  
  /** Get days skipped ratio */
  getDaysSkippedRatio(totalDays: number = 14): number {
    return this.counters.daysSkipped / totalDays;
  }
  
  /** Get early close ratio */
  getEarlyCloseRatio(serviceDays: number): number {
    if (serviceDays <= 0) return 0;
    return this.counters.earlyCloses / serviceDays;
  }
  
  /** Get letters read ratio */
  getLettersReadRatio(lettersDelivered: number): number {
    if (lettersDelivered <= 0) return 0;
    return this.counters.lettersReadCount / lettersDelivered;
  }
  
  /** Get town tab opens per day */
  getTownTabOpensPerDay(day: number): number {
    if (day <= 0) return 0;
    return (this.counters.journalOpensByTab['town'] ?? 0) / day;
  }
  
  /** Get shop visits per day */
  getShopVisitsPerDay(day: number): number {
    if (day <= 0) return 0;
    return (this.counters.upgradePurchaseCount + this.counters.ingredientsPurchasedTotal) / day;
  }
  
  /** Get unique NPCs served count */
  getUniqueNpcsServed(): number {
    return Object.keys(this.counters.servesByNpc).length;
  }
  
  /** Get NPCs with at least 1 heart equivalent (served at least once) */
  getHeartsBreadth(): number {
    return Object.keys(this.counters.servesByNpc).filter(
      npc => (this.counters.servesByNpc[npc] ?? 0) > 0
    ).length;
  }
  
  /** Get total unique recipes discovered */
  getDiscoveredRecipeCount(): number {
    return this.counters.discoveredRecipes.length;
  }
  
  /** Check if a recipe was discovered */
  hasDiscoveredRecipe(recipeId: string): boolean {
    return this.counters.discoveredRecipes.includes(recipeId);
  }
  
  /** Reset daily-specific counters (called each morning) */
  resetDaily(): void {
    // Daily counters reset - but we keep lifetime totals
    // This is called by the day controller at morning
  }
  
  /** Serialize for save */
  toSave(): ActivityCounters {
    return {
      ...this.counters,
      independentChoiceBeats: [...this.counters.independentChoiceBeats],
      communityBeatIds: [...this.counters.communityBeatIds],
    };
  }

  /** Load from save */
  static fromSave(data: Partial<ActivityCounters>): ActivityLedger {
    return new ActivityLedger(data);
  }
}

/** Factory function for creating ledger from save data */
export function createActivityLedger(data?: Partial<ActivityCounters>): ActivityLedger {
  return new ActivityLedger(data);
}

/** Record a serve event */
export function recordServe(ledger: ActivityLedger, event: Omit<ServeEvent, 'type' | 'timestamp'>): void {
  ledger.record({ ...event, type: 'serve', timestamp: Date.now() });
}

/** Record a chat event */
export function recordChat(ledger: ActivityLedger, event: Omit<ChatEvent, 'type' | 'timestamp'>): void {
  ledger.record({ ...event, type: 'chat', timestamp: Date.now() });
}

/** Record a brew event */
export function recordBrew(ledger: ActivityLedger, event: Omit<BrewEvent, 'type' | 'timestamp'>): void {
  ledger.record({ ...event, type: 'brew', timestamp: Date.now() });
}

/** Record a recipe discovery event */
export function recordRecipeDiscovered(ledger: ActivityLedger, event: Omit<RecipeDiscoveredEvent, 'type' | 'timestamp'>): void {
  ledger.record({ ...event, type: 'recipe_discovered', timestamp: Date.now() });
}

/** Record a Wren mystery brew event */
export function recordWrenMysteryBrew(ledger: ActivityLedger, event: Omit<WrenMysteryBrewEvent, 'type' | 'timestamp'>): void {
  ledger.record({ ...event, type: 'wren_mystery_brew', timestamp: Date.now() });
}

/** Record a Wren visit event */
export function recordWrenVisit(ledger: ActivityLedger, event: Omit<WrenVisitEvent, 'type' | 'timestamp'>): void {
  ledger.record({ ...event, type: 'wren_visit', timestamp: Date.now() });
}

/** Record a journal opened event */
export function recordJournalOpened(ledger: ActivityLedger, event: Omit<JournalOpenedEvent, 'type' | 'timestamp'>): void {
  ledger.record({ ...event, type: 'journal_opened', timestamp: Date.now() });
}

/** Record an upgrade purchased event */
export function recordUpgradePurchased(ledger: ActivityLedger, event: Omit<UpgradePurchasedEvent, 'type' | 'timestamp'>): void {
  ledger.record({ ...event, type: 'upgrade_purchased', timestamp: Date.now() });
}

/** Record a day skipped event */
export function recordDaySkipped(ledger: ActivityLedger, event: Omit<DaySkippedEvent, 'type' | 'timestamp'>): void {
  ledger.record({ ...event, type: 'day_skipped', timestamp: Date.now() });
}

/** Record an early close event */
export function recordEarlyClose(ledger: ActivityLedger, event: Omit<EarlyCloseEvent, 'type' | 'timestamp'>): void {
  ledger.record({ ...event, type: 'early_close', timestamp: Date.now() });
}

/** Record an ingredients purchased event */
export function recordIngredientsPurchased(ledger: ActivityLedger, event: Omit<IngredientsPurchasedEvent, 'type' | 'timestamp'>): void {
  ledger.record({ ...event, type: 'ingredients_purchased', timestamp: Date.now() });
}

/** Record a letter read event */
export function recordLetterRead(ledger: ActivityLedger, event: Omit<LetterReadEvent, 'type' | 'timestamp'>): void {
  ledger.record({ ...event, type: 'letter_read', timestamp: Date.now() });
}

/** Record a letter dismissed event */
export function recordLetterDismissed(ledger: ActivityLedger, event: Omit<LetterDismissedEvent, 'type' | 'timestamp'>): void {
  ledger.record({ ...event, type: 'letter_dismissed', timestamp: Date.now() });
}

/** Record a deliberate self-directed choice (the legitimate wanderer signal). */
export function recordSelfDirectedChoice(ledger: ActivityLedger, event: Omit<SelfDirectedChoiceEvent, 'type' | 'timestamp'>): void {
  ledger.record({ ...event, type: 'self_directed_choice', timestamp: Date.now() });
}

/** Record a deliberate community-building action (strong community signal). */
export function recordCommunityBeat(ledger: ActivityLedger, event: Omit<CommunityBeatEvent, 'type' | 'timestamp'>): void {
  ledger.record({ ...event, type: 'community_beat', timestamp: Date.now() });
}