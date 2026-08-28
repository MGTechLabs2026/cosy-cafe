# 09 · Moonleaf Café — Narrative System Design

> Doc 09 of 09 · Status: Draft v0.1 · 2026-08-27 · Phase 1: Design & Documentation Only
> **This document is the authoritative narrative specification.**

---

## 1. Narrative Thesis

**THE PLAYER DOES NOT SELECT A STORY.**
**THE PLAYER LIVES A STYLE OF PLAY.**
**THE STORY RESPONDS TO THAT STYLE.**

Narrative divergence in Moonleaf Café comes primarily from:

- customer relationships (hearts, chats, favorite serves)
- service behavior (pacing, attentiveness, generosity)
- exploration/curiosity (recipe discovery, journal engagement, experimentation)
- café investment (upgrades, stars, coins, inventory)
- social/community behavior (broad vs. deep NPC engagement)
- pacing choices (skipped days, sleep-ins, door timing)
- recipe discovery (taught vs. hinted vs. experimental)
- story engagement (scene triggers, letter reading, Wren interactions)

**Dialogue choices may exist, but must NOT become the primary branching mechanism.**

### P1 Requirement: Calm Over Challenge

Choices should never produce "wrong" or "bad" outcomes.

| Category A — Flavor Choices | Category B — Life-Path Branches |
|----------------------------|--------------------------------|
| Change dialogue flavor | Derived from accumulated behavior |
| Small heart gain (±0.1–0.25) | Change letter sequence |
| Immediate reaction only | Change scene ordering |
| No persistent outcome | Change NPC emphasis |
| Always available | Change optional scene availability |
| | Change revelation ordering |
| | Determine natural ending path |

All endings are emotionally valid. No "game over," no failure states.

---

## 2. Player Backstory

### Canonical Backstory

**The Player** is Marigold's grand-niece/nephew.

**Relationship with Marigold:**
- Visited summers as a child; learned to brew at her knee
- Marigold was the adult who *listened* — not the one who directed
- Last visit was 7 years ago; life pulled them away (city, career, expectations)
- Correspondence dwindled to annual postcards, then silence

**Why They Left Hollowbrook:**
- Parents wanted "something stable, something measurable"
- The café felt like a sweet memory, not a future
- They promised to return. They didn't.

**Why Marigold Chose Them:**
- Marigold watched them brew Moonleaf Tea at age 8 and said: *"You listen to what the water wants."*
- She knew they'd forgotten. She left the café not to burden them, but to *invite them back to themselves*.
- The will doesn't transfer ownership. It transfers **stewardship**.

**The Inheritance Structure:**

```
Marigold's Will
    ↓
Player receives TEMPORARY STEWARDSHIP (one season = 14 in-game days)
    ↓
During stewardship: full operational control, all profits, all decisions
    ↓
At season's end: player CHOOSES
    ├── Keep the café → permanent ownership
    ├── Pass to a regular (Fenwick/Sela/Bram/Nia/Wren) → they become keeper
    ├── Transform into community trust → town manages it
    ├── Close gently → Marigold's legacy honored, player moves on
    └── (Any choice is valid; the game celebrates the decision)
```

**What Marigold Was Trying to Teach:**
- The café was never about coffee. It was about *witnessing* people.
- "Home" isn't a place you inherit. It's a place you *choose* to tend.
- The real inheritance: the network of relationships Marigold tended for 40 years.

**Wren's Role:** Wren knew the player as a child. Wren knows what Marigold wrote in the letters she never sent. Wren is the bridge between the player's past and the café's future.

---

## 3. Marigold's Hidden Story (The Mystery Layers)

The player thinks they inherited a café. They eventually discover they inherited a **relationship network**.

| Layer | Question | Revelation Vehicle |
|-------|----------|-------------------|
| 1 | Why did Marigold leave this to me? | Marigold's letters (mandatory, weekly) |
| 2 | Why was the café unfinished? | Town records, Sela's stories, upgrade descriptions |
| 3 | What was Marigold preparing for? | Wren's clues, hidden recipes, basement discovery |
| 4 | What did Marigold know about my life? | Wren's scenes, Marigold's unsent letters, NPC memories |
| 5 | What does she actually want me to choose? | Final choice letter + ending evaluation |

**Final Revelation (Layer 5):**
> "You are allowed to become something different."

Not "continue my legacy." Not "become me." The café is a *permission structure* for the player to choose their own relationship with care, community, and home.

---

## 4. Narrative State Model (Hidden Dimensions)

Five hidden narrative dimensions. **NOT visible stats.** Computed from existing gameplay data.

| Dimension | Meaning | Primary Signals (Available Now) | Derivable? |
|-----------|---------|--------------------------------|------------|
| **CARE** | Depth of attention to individuals | Hearts (per NPC), favorite serves, chats, learned preferences, relationship arcs | YES |
| **CURIOSITY** | Drive to explore & discover | Recipe discoveries, experimental brews, hint-card reads, journal (recipes/lore) opens, Wren mystery interactions | YES |
| **COMMUNITY** | Breadth of social participation | Unique NPCs served, hearts breadth, letter reading, town-tab engagement, multiple arcs | YES |
| **COMFORT** | Investment in the café as home | Upgrades owned, shelf capacity, inventory kinds, staying open (no early close) | YES |
| **INDEPENDENCE** | Intentional self-directed agency | `self_directed_choice` events (Wren "old road" beat) recorded in the ActivityLedger; each deliberate choice adds 0.5 | YES (behavior-only) |

> **INDEPENDENCE is now instrumented from genuine self-directed choices, NOT pacing.**
> The game records a `self_directed_choice` activity event whenever the player takes
> a deliberate, optional, non-punitive self-direction beat (the canonical one being
> Wren's "old road" choice in `wren_scene3`). Each such beat adds 0.5 to the
> dimension, so a SINGLE deliberate choice clears the Wanderer threshold of 0.25 —
> the path is non-grindy and behavior-driven. Skipped days, early closes, low chat,
> short sessions, relaxed mode, and low engagement are explicitly NOT counted (P1
> Calm: pacing must never become a hidden personality judgment).

### Computation Rules

- **Values are derived, not accumulated.** Recomputed each morning from save data.
- **Normalized 0–1.** Each dimension = weighted combination of signals.
- **Thresholds at 0.33 / 0.66** (low / medium / high) for branch eligibility.
- **Deterministic.** Same save state → same narrative state.
- **Persisted only as flags.** The dimensions themselves are not saved; only the chapter/letter/scene flags they unlock.
- **Pacing is neutral.** Skipped days, early closes, low activity, and not using relaxed mode are **NOT** personality signals. They never raise or lower a dimension.

### Signal Weights (Post–Semantic Cleanup)

```
CARE      = 0.25 * heartsBreadth/5  + 0.25 * avgHearts/5
          + 0.20 * chatRatio        + 0.15 * favoriteServeRatio
          + 0.15 * learnedPrefs/5
          (depth of attention to individuals — direct behavioral signals only)

CURIOSITY = 0.25 * recipeDiscoveryRatio + 0.20 * experimentalBrewRatio
          + 0.15 * wrenMysteryBrewRatio + 0.15 * wrenSceneRatio
          + 0.15 * hintCardRatio       + 0.10 * journalOpensPerDay
          (exploration & discovery — never "more gameplay = more curiosity")

COMMUNITY = 0.30 * uniqueNPCsServed/5 + 0.30 * heartsBreadth/5
          + 0.15 * townTabOpensPerDay  + 0.125 * townLetterRatio
          + 0.125 * lettersReadRatio
          (breadth of social participation — DISTINCT FROM CARE:
           CARE rewards depth to ONE person (avgHearts/favoriteServe);
           COMMUNITY rewards breadth across MANY people + a gathering action.
           It deliberately excludes avgHearts/favoriteServeRatio so a
           high-Care/low-breadth player correctly falls to Keeper, not Community.)

COMFORT   = 0.35 * upgradesOwnedRatio + 0.25 * shelfCapacityRatio
          + 0.20 * inventoryKindsRatio + 0.10 * starsRatio
          + 0.10 * (staysOpen ? 1 : 0)
          (café as home — built ONLY from deliberate café-investment signals.
           Stars are a minor coziness hint; shop visits / progression timers excluded.)

INDEPENDENCE = 0.5 * independentChoiceCount   (capped at 1.0)
          One deliberate self_directed_choice adds 0.5 → a SINGLE genuine
          beat clears the Wanderer threshold of 0.25. Skipped days, early
          closes, low chat, low favorite-serving, short sessions, and
          non-relaxed play are NOT evidence. Pacing is neutral.
```

> **Wanderer ending** requires `independence ≥ 0.25` AND the `chose_old_road` flag
> (set when the player takes Wren's "old road" self-directed beat in `wren_scene3`).
> The grindy `wren_arc_complete` requirement (set only at Wren scene 5, ~4 hearts) was
> intentionally removed so the path is non-grindy; `chose_old_road` already requires
> genuine engagement (reaching Wren scene 3). When no ending meets its minimum
> dimension thresholds, the deterministic neutral fallback is **keeper** (belonging /
> continuity — the calm, P1-aligned default).

**Ending competition (Phase 10):** an ending only qualifies if it meets ALL of its
`min_dimensions` AND `required_flags` AND `required_arcs` (flags/arcs are HARD gates,
not just score modifiers). Among qualifying endings, the selection prefers a
*qualifying non-Keeper* ending whose defining dimension is its dominant dimension —
a small identity-confidence bonus (+0.05) breaks near-ties in favor of the player's
actual verified behavior, so a strongly-expressed Community/Wanderer/B(uilder) beats
the generic Keeper fallback. Keeper remains the safe neutral default when no specific
identity is strongly expressed.

---

## 5. Existing System → Narrative Signals Mapping

| Existing Mechanic | Narrative Meaning | Classification |
|-------------------|-------------------|----------------|
| High hearts (per NPC) | CARE for that person | AVAILABLE NOW |
| Frequent chat | CARE / RELATEDNESS | AVAILABLE NOW |
| Favorite serves | ATTENTIVENESS / CARE | AVAILABLE NOW |
| High stars | COMPETENCE / COMFORT | AVAILABLE NOW |
| High coins | COMMERCIAL SUCCESS / COMFORT | AVAILABLE NOW |
| Many upgrades | COMFORT / INVESTMENT | AVAILABLE NOW |
| Many recipe discoveries | CURIOSITY | AVAILABLE NOW |
| Journal usage (recipes tab) | CURIOSITY / REFLECTION | AVAILABLE NOW |
| Journal usage (regulars tab) | CARE / COMMUNITY | AVAILABLE NOW |
| Journal usage (letters tab) | CURIOSITY / MEMORY | AVAILABLE NOW |
| Journal usage (town tab) | COMMUNITY | AVAILABLE NOW |
| Skipped days (sleep-in) | NEUTRAL — pacing only, NOT a personality signal | REMOVED FROM DIMENSIONS |
| Early door close | NEUTRAL — pacing only, NOT a personality signal | REMOVED FROM DIMENSIONS |
| Multiple NPC arcs active | COMMUNITY / BREADTH | AVAILABLE NOW |
| Focusing on one NPC | DEEP ATTACHMENT / CARE | AVAILABLE NOW |
| Many NPCs served | COMMUNITY / BREADTH | AVAILABLE NOW |
| Wren mystery brews | CURIOSITY / MYSTERY | AVAILABLE NOW |
| Wren scenes triggered | MYSTERY PROGRESSION | AVAILABLE NOW |
| Fenwick arc progress | RESPONSIBILITY / CARE | AVAILABLE NOW |
| Sela intro done | BELONGING / COMMUNITY | AVAILABLE NOW |
| Bram intro done | MEMORY / HISTORY | AVAILABLE NOW |
| Nia intro done | CONTROL / OPTIMIZATION | AVAILABLE NOW |
| Recipe hints read | CURIOSITY / GUIDED DISCOVERY | AVAILABLE NOW |
| Experimental brews (murky) | CURIOSITY / PLAYFULNESS | AVAILABLE NOW |
| Marigold letters read | MEMORY / LEGACY | AVAILABLE NOW |
| Recap screen engagement | REFLECTION | AVAILABLE NOW |
| Shop purchases (ingredients) | PREPARATION / CARE | AVAILABLE NOW |

**No new telemetry required for Phase 1.** All signals exist in current save state.

---

## 6. Story Chapter Model (14-Day MVP)

### Chapter Structure

| Chapter | Days | Focus | Mandatory Beats | Branch Points |
|---------|------|-------|-----------------|---------------|
| **CH0: ARRIVAL** | 1–2 | Inheritance, first day, Marigold's Letter 1 | Tutorial letter, first service, Fenwick teaches R003 | — |
| **CH1: SETTLING** | 3–4 | Regulars reveal themselves, Wren's mystery | Sela/Bram/Nia intro scenes, Wren Scene 1 | Letter emphasis begins |
| **CH2: FIRST BRANCH** | 5–7 | Chapter 1 narrative direction | Marigold Letter 2, Fenwick Scene 2, first major NPC arc beat | **3 trajectories diverge** |
| **CH3: DEEPENING** | 8–10 | Consequences, Marigold mystery deepens | Weekly delivery letters, Wren Scene 2/3, mid-season revelation | Letter order branches |
| **CH4: REVELATION** | 11–12 | Major revelation | Wren Scene 4/5, Marigold Letter 3, Fenwick Scene 5 | Optional scenes unlock |
| **CH5: CHOICE** | 13–14 | Ending direction | Final letter, ending evaluation, choice presentation | Ending determined |

### Convergence Points (All Branches Meet)

1. **Day 1:** Tutorial letter + first service (mandatory)
2. **Day 3:** Sela intro (if hearts ≥1) — guaranteed by day 5
3. **Day 7:** First major Marigold revelation (mandatory)
4. **Day 10:** Wren's usual revealed (mechanical + narrative)
5. **Day 14:** Final choice (all branches converge)

---

## 7. Letter System

### Letter Categories

| Category | Purpose | Delivery Logic |
|----------|---------|----------------|
| **Marigold Letters** (3 mandatory) | Core mystery, emotional arc | Fixed schedule: Day 1, 7, 11 |
| **NPC Letters** (6 per NPC) | Relationship deepening | Behavior-driven (hearts, scenes, days) |
| **Town Letters** (4) | World-building, community | Community dimension + days |
| **Mystery Letters** (5) | Wren/Marigold clues | Curiosity dimension + Wren progress |
| **Branch Letters** (varies) | Trajectory-specific content | Dimension thresholds |
| **Optional/Reactive** | Flavor, reactivity | Low priority, fill gaps |

### Letter Definition Schema

```typescript
interface NarrativeLetter {
  id: string;                    // e.g., "marigold_ch1_legacy"
  source: "marigold" | "fenwick" | "sela" | "bram" | "nia" | "wren" | "town" | "mystery";
  chapter: 0 | 1 | 2 | 3 | 4 | 5;
  category: "mandatory" | "npc" | "town" | "mystery" | "branch" | "reactive";
  
  // Eligibility (ALL must be true)
  requires: {
    day_min?: number;
    day_max?: number;
    chapter_min?: number;
    chapter_max?: number;
    hearts_min?: Record<string, number>;    // per NPC
    dimension_min?: Partial<Record<NarrativeDimension, number>>;
    flags_required?: string[];              // save flags
    flags_forbidden?: string[];
    scenes_seen?: string[];
    recipes_discovered?: string[];
    upgrades_owned?: string[];
  };
  
  // Scheduling
  priority: number;              // Higher = delivered first
  cooldown_days?: number;        // Min days since last letter from same source
  max_per_chapter?: number;      // Cap per chapter
  
  // Behavior
  mandatory: boolean;            // Must deliver if eligible
  skippable: boolean;            // Player can dismiss without reading
  consumed: boolean;             // Single-use vs repeatable
  sets_flags?: string[];         // Flags set on delivery
  unlocks_letters?: string[];    // Enables other letters
  
  // Content
  content_id: string;            // strings.json key
}
```

### Letter Scheduler Algorithm

```typescript
// ctx: LetterContext — pure read-model derived from NarrativeInput (never raw SaveData)
function scheduleLetters(ctx: LetterContext, narrativeState: NarrativeState): LetterDelivery[] {
  // 1. Collect all eligible letters (pure checkEligibility on ctx + state)
  const eligible = ALL_LETTERS.filter(l =>
    letterScheduler.checkEligibility(l, narrativeState, ctx)
  );

  // 2. Score by priority (mandatory +1000, chapter-match +50, dimension alignment, trajectory emphasis)
  const scored = eligible.map(l => ({
    l,
    score: letterScheduler.calculatePriorityScore(l, narrativeState),
    reason: letterScheduler.getReason(l),
  }));

  // 3. Sort descending by score (deterministic)
  scored.sort((a, b) => b.score - a.score);

  // 4. Apply caps (max 1 letter/day, max 3/chapter from same source) and return
  return letterScheduler.selectNextLetters(narrativeState, ctx, 1);
}
```

---

## 8. Letter Order Branching (3 Trajectories)

### Trajectory A — RELATIONSHIP-FIRST (High CARE, High COMMUNITY)

**Signals:** High hearts across NPCs, frequent chat, multiple favorite serves, broad NPC engagement

**Letter Emphasis Order:**
1. NPC relationship letters (Fenwick → Sela → Wren → Bram → Nia)
2. Marigold letters (memory-focused)
3. Town letters (community stories)
4. Mystery letters (late, as relationship deepens)

**Key Branch Letters:**
- `fenwick_memory_promise` (Day 5–7, CARE > 0.6)
- `sela_belonging_offer` (Day 6–8, COMMUNITY > 0.5)
- `wren_childhood_photo` (Day 8–10, CARE > 0.5 + Wren Scene 2)

---

### Trajectory B — CAFÉ-FIRST (High COMFORT, High STARS)

**Signals:** High stars, many upgrades, high coins, shop engagement, inventory breadth

**Letter Emphasis Order:**
1. Marigold business/legacy letters
2. Town development letters (renovation, community hub)
3. NPC letters (practical, café-focused)
4. Mystery letters (as café history)

**Key Branch Letters:**
- `marigold_ledger_found` (Day 5–7, COMFORT > 0.6)
- `town_council_proposal` (Day 8–10, STARS ≥ 3 + upgrades ≥ 3)
- `bram_renovation_offer` (Day 9–11, Bram hearts ≥ 2 + Hearth Expansion)

---

### Trajectory C — CURIOSITY-FIRST (High CURIOSITY, High INDEPENDENCE)

**Signals:** Many recipe discoveries, journal engagement, experimental brews, Wren interactions, skipped days

**Letter Emphasis Order:**
1. Mystery letters (Wren clues, Marigold secrets)
2. Hidden recipe letters (R008, seasonal specials)
3. Marigold letters (mystery-focused)
4. NPC letters (only when tied to secrets)

**Key Branch Letters:**
- `wren_first_clue_letter` (Day 4–5, CURIOSITY > 0.4)
- `marigold_hidden_recipe_note` (Day 6–8, recipe discoveries ≥ 5)
- `basement_key_hint` (Day 10–11, Wren Scene 3 + CURIOSITY > 0.6)

---

### Cross-Trajectory Guarantees

- All mandatory letters deliver on schedule regardless of trajectory
- Convergence letters (Day 1, 7, 10, 14) are identical
- No trajectory permanently locks out content from another
- Ending eligibility computed from final dimension state, not trajectory label

---

## 9. NPC Arc Integration

### Thematic Roles

| NPC | Thematic Role | What They Teach | Mirrors Player's Problem |
|-----|---------------|-----------------|-------------------------|
| **Fenwick** | Responsibility | You can't carry everything; you can choose what to deliver | Player's burden of expectation |
| **Sela** | Belonging | Home isn't where you're from; it's where you're known | Player's displacement |
| **Bram** | Memory | The past lives in objects; you decide what to keep | Player's unprocessed grief |
| **Nia** | Control | Not everything can be optimized; some things must breathe | Player's need for certainty |
| **Wren** | Legacy/Truth | The story you were told isn't the whole story | Player's incomplete self-knowledge |
| **Mops** | Comfort/Continuity | Presence matters more than productivity | Player's worthiness anxiety |

### Arc → Player Connection

Each NPC arc resolves by reflecting the player's own journey:

- **Fenwick** chooses to stay as letter-carrier → Player chooses what to carry forward
- **Sela** stays "until the road clears" → Player decides what "staying" means
- **Bram** rings the chime → Player hears the past and chooses the future
- **Nia** builds a beautiful kettle, not a machine → Player chooses craft over efficiency
- **Wren** reveals the usual → Player tastes their own childhood memory

### Arc Scene Structure (Per NPC)

| Scene | Purpose | Trigger | Branch Sensitivity |
|-------|---------|---------|-------------------|
| Intro (1) | Establish character, hook | Hearts ≥ 1, day ≥ 2 | None |
| Middle 1 (2) | Deepen, reveal vulnerability | Hearts ≥ 2, day ≥ 3 | Dialogue flavor |
| Middle 2 (3) | Thematic conflict | Hearts ≥ 3, day ≥ 4 | Optional in low-CARE |
| Middle 3 (4) | Choice moment | Hearts ≥ 4, day ≥ 6 | Life-path branch |
| Resolution (5) | Thematic payoff | Hearts ≥ 5, day ≥ 8 | Mandatory |
| Epilogue (6) | Post-arc gift/closure | Scene 5 complete | Gift varies by dimension |

---

## 10. Wren as Narrative Spine

### Wren's Knowledge Hierarchy

| Scene | Reveals | Mechanical Gate | Narrative Function |
|-------|---------|-----------------|-------------------|
| Scene 1 | Wren knew Marigold; knows player as child | Hearts ≥ 0, Day ≥ 2 | Hook: "Your usual?" |
| Scene 2 | Marigold's unsent letters exist | Hearts ≥ 1, Day ≥ 3 | Clue 1: Milk + Honey |
| Scene 3 | The recipe book burned; memory remains | Hearts ≥ 2, Day ≥ 5 | Clue 2: Moonleaf |
| Scene 4 | Marigold chose player deliberately | Hearts ≥ 3, Day ≥ 7 | Clue 3: Hot + 5 min simmer |
| Scene 5 (Resolution) | Brew it correctly → "Ah. There she is." | Hearts ≥ 4, Day ≥ 9, correct brew | Unlocks R008, Marigold Letter 3 |
| Scene 6 (Epilogue) | Music box on title screen; final truth | Scene 5 complete | Ending context |

### The "Usual" as Story Object

| Phase | Mechanical State | Narrative Meaning |
|-------|------------------|-------------------|
| Pre-reveal | Bubble shows "?" | Player doesn't know their own history |
| Clues gathered | Journal hint card updates | Marigold's memory fragmented but recoverable |
| Resolution brew | R008 unlocked | Player *makes* the memory whole |
| Post-reveal | Bubble shows R008 icon | Player now *knows* their inheritance |

---

## 11. Real Branching vs. Flavor Choices

### Category A — Flavor Choices (Scene Dialogue)

```typescript
// Example: Fenwick Scene 2 choice
choice: {
  prompt: "What do you say?",
  options: [
    { label: "That sounds heavy.", flavor: "Fenwick nods slowly. 'It is.'", hearts: +0.1 },
    { label: "You don't have to carry it alone.", flavor: "Fenwick smiles. 'Don't I?'", hearts: +0.25 },
    { label: "Tell me more about the route.", flavor: "Fenwick's eyes brighten. 'Well...'", hearts: +0.1 }
  ]
}
// ALL lead to same Scene 3. Only hearts + dialogue differ.
```

### Category B — Life-Path Branches (Behavior-Derived)

| Branch | Derived From | Changes |
|--------|--------------|---------|
| Letter sequence priority | Dimension thresholds | Which optional letters appear first |
| Scene availability | Hearts + dimension combos | Optional middle scenes (3–4) per NPC |
| Revelation ordering | Curiosity + Wren progress | Marigold Letter 3 vs. Basement discovery |
| NPC emphasis | Hearts distribution | Which NPC gets epilogue gift focus |
| Ending naturalness | Final dimension state | Which ending requires least "stretch" |

**Implementation Rule:** Category B branches are **never** presented as explicit choices. They emerge from the scheduler evaluating narrative state.

---

## 12. Ending Design

### Four Valid Endings

| Ending | Archetype | Core Theme | Eligibility (Minimum) |
|--------|-----------|------------|----------------------|
| **THE KEEPER** | Preserve | Belonging / Continuity | CARE ≥ 0.5, COMMUNITY ≥ 0.4, Fenwick arc complete |
| **THE BUILDER** | Expand | Competence / Creation | COMFORT ≥ 0.6, STARS ≥ 4, Upgrades ≥ 4 |
| **THE WANDERER** | Release | Autonomy / Independence | INDEPENDENCE ≥ 0.25, chose_old_road flag, (Wren engagement implied by the flag) |
| **THE COMMUNITY KEEPER** | Transform | Community / Legacy | COMMUNITY ≥ 0.5, chose_community_night flag + Sela/Bram/Nia intro letters delivered |

> Note: `days skipped` / `early close` / low activity are NOT Wanderer signals — they
> are pacing-neutral and never feed any dimension (P1 Calm). The Wanderer gate is a
> genuine self-directed choice (`chose_old_road`), not a measure of how little you played.

### Ending Evaluation (Day 14 Evening)

```typescript
// Pure evaluation — no SaveData mutation, no UI, no economy/relationship changes.
const evaluator = new EndingEvaluator(ENDING_CONFIGS);
const result = evaluator.evaluate(narrativeState, {
  chapter, stars, daysSkipped, completedArcs, flags, upgradesOwned,
});
// result.ending: EndingId  ("keeper" | "builder" | "wanderer" | "community")
// result.scores: Record<EndingId, number>
// result.primaryDimension: NarrativeDimension | null

// Deterministic tie-break: the ending whose tiebreaker_dimension === dominant
// dimension receives +0.1. No Math.random() for critical selection.
const ending = result.ending;  // always one of the 4 valid endings
```

### Ending Content

| Ending | Final Scene | Final Letter | Café State | Replay Implication |
|--------|-------------|--------------|------------|-------------------|
| KEEPER | Marigold's chair at window | Marigold: "You kept it warm." | Unchanged, cozy | New Game+ preserves relationships |
| BUILDER | New shelf/window/hearth visible | Marigold: "You made it yours." | Upgraded, expanded | New Game+ starts with 1 upgrade |
| WANDERER | Door sign flipped to CLOSED | Marigold: "Go. We'll be here." | Preserved, quiet | New Game+ unlocks Traveler+ mode |
| COMMUNITY | Townsfolk gathered inside | Marigold: "It was never just yours." | Community board active | New Game+ unlocks Multiplayer hooks |

**No ending is "better."** All are celebrated. The final letter from Marigold frames the choice as *her final gift*: the freedom to choose.

---

## 13. Replayability Design

### Content Classification

| Content Type | Behavior | Replay Variance |
|--------------|----------|-----------------|
| Tutorial (Day 1–2) | Deterministic | Identical |
| Mandatory letters | Deterministic schedule | Identical |
| NPC intro scenes | Deterministic (hearts/day) | Identical |
| Mandatory arc scenes | Deterministic (hearts/day) | Identical |
| Optional letters | Behavior-driven | Different order/selection |
| Optional arc scenes | Behavior-driven | Different availability |
| Mystery clue order | Curiosity-driven | Different revelation sequence |
| Ending | Behavior-driven | Different natural ending |
| Marigold mystery layers | Fixed but gated | Different discovery timing |

### Replay Guarantees

- **Identical inputs → identical narrative** (deterministic scheduler)
- **Core gameplay loop unchanged** (same 14 days, same mechanics)
- **New Game+** preserves: recipe discoveries, upgrades, stars, one cosmetic per ending
- **No true randomness** for critical beats (pseudo-random only for traveler variety)

---

## 14. Save Model Implications

### Additional Narrative Save State (Future)

```typescript
// Minimal additions to SaveFlags
interface NarrativeFlags {
  // Chapter tracking
  current_chapter: 0 | 1 | 2 | 3 | 4 | 5;
  chapter_entered_day: Record<number, number>;
  
  // Letter tracking
  letters_delivered: string[];           // IDs of delivered letters
  letters_read: string[];                // IDs player actually opened
  letters_dismissed: string[];           // IDs player skipped
  
  // Branch tracking
  dominant_dimension_history: NarrativeDimension[]; // Per-chapter peak
  trajectory_hint: "care" | "comfort" | "curiosity" | "community" | "independence" | null;
  
  // Ending
  ending_achieved?: "keeper" | "builder" | "wanderer" | "community";
  ending_day?: number;
  
  // Mystery progress
  marigold_mystery_layer: 1 | 2 | 3 | 4 | 5;
  wren_clues_gathered: number;           // 0–3
  
  // Replay
  playthrough_count: number;
  previous_endings: string[];
}
```

### Separation of Concerns

| Category | Examples | Persistence |
|----------|----------|-------------|
| **Source Game State** | hearts, stars, coins, inventory, upgrades, recipes, scenes, day | Persisted |
| **Derived Narrative State** | CARE, CURIOSITY, COMMUNITY, COMFORT, INDEPENDENCE | **Computed each morning from NarrativeInput** |
| **Persistent Story Flags** | chapter, letters_delivered, ending_achieved, mystery_layer | Persisted |

**Do not save the computed dimensions.** Recalculate from source state on load.

**The adapter (`createNarrativeInput`) isolates the narrative system from SaveData structure.** Narrative modules depend only on `NarrativeInput` interface.

---

### Implementation Architecture (Final — post Batches 1-6)

### Module Structure

```
src/narrative/
  narrative-input.ts        # Adapter: SaveData -> NarrativeInput (read model) + LetterContext
  narrative-signals.ts      # Pure: NarrativeInput -> measurable signals
  narrative-evaluator.ts    # Pure: signals -> 5 dimensions + trajectory (NarrativeState)
  narrative-state.ts        # Thin facade combining signals + evaluator
  story-definitions.ts      # PURE CONTENT: letters, chapters, endings, trajectories (no logic)
  narrative-scheduler.ts    # Chapter advancement, beat triggering, convergence (pure)
  letter-scheduler.ts       # Letter selection, priority, caps (pure; consumes LetterContext)
  story-progress.ts         # Typed StoryProgress model (beats, arcs, flags) + save adapter
  ending-evaluator.ts       # Pure: NarrativeState + StoryProgress -> EndingId
  activity-ledger.ts        # ActivityLedger: records real gameplay events (no narrative rules)
  activity-events.ts        # Typed activity event definitions
```

### Dependency Direction (enforced)

```
GAMEPLAY (Hearts / Economy / Recipes / Service / Upgrades)
    |   (controllers record real events)
    v
ActivityLedger (counters only)
    |
    v
createNarrativeInput(save) -> NarrativeInput   <- ONLY SaveData boundary
    |                                      \
    |                                       v
    |                              createLetterContext(input) -> LetterContext
    v
NarrativeSignals (pure)
    v
NarrativeEvaluator (pure) -> NarrativeState
    |
    +----------------------------+
    v                            v
LetterScheduler              NarrativeScheduler
 (consumes LetterContext)    (consumes NarrativeState + StoryProgress)
    |                            |
    +------------+---------------+
                 v
        Existing Scene/UI (delivers letter/scene)
                 v
        StoryProgress (typed, updated on delivery)
                 v
        EndingEvaluator (pure) -> EndingId
```

### Key Architecture Decisions

1. **Single SaveData boundary.** Only `createNarrativeInput` (and `createLetterContext` derived from it, and `createStoryProgressFromSave`) may read `SaveData`. No other narrative module imports `SaveData` or touches `save.*` fields.
2. **Pure functions.** Signal calculation, dimension evaluation, letter eligibility, letter priority, chapter scheduling, and ending evaluation are all pure: identical input -> identical output, no hidden mutation.
3. **Story content is data.** All prose/definitions live in `story-definitions.ts`. Engine code contains no story text and no `if (...) return "Fenwick says..."` blocks.
4. **No forbidden dependencies.** Narrative modules contain zero DOM/`document`/`window` access, zero UI rendering, zero controller mutation, and zero economy/heart/recipe/upgrade mutation.
5. **Read-only dimensions.** NarrativeState is an immutable result; the evaluator never mutates input.

### Letter Scheduler (actual signature)

```typescript
class LetterScheduler {
  // ctx is a pure read-model derived from NarrativeInput (LetterContext) — never raw SaveData
  checkEligibility(letter: NarrativeLetter, state: NarrativeState, ctx: LetterContext): boolean
  getEligibleLetters(state: NarrativeState, ctx: LetterContext): NarrativeLetter[]
  selectNextLetters(state: NarrativeState, ctx: LetterContext, max: number): LetterDelivery[]
  // priority = base + mandatory(+1000) + chapter-match(+50) + dimensionAlignment + trajectoryEmphasis
  // caps: max 1/day, max 3/chapter per source
}
```

### Ending Evaluator (actual signature)

```typescript
class EndingEvaluator {
  // Pure: from narrative state + story progress -> ending id
  evaluate(state: NarrativeState, progress: {
    chapter: number; stars: number; daysSkipped: number;
    completedArcs: string[]; flags: Record<string, boolean>;
    upgradesOwned: Record<string, boolean>;
  }): EndingResult   // { ending: EndingId, scores, primaryDimension }

  // Deterministic tie-break: dominant dimension ending gets +0.1.
  // No Math.random() for critical selection.
}
```

### Integration Points

| Existing Controller | Narrative Hook |
|---------------------|----------------|
| `GameController` | `onDayBegin` -> advance chapter, schedule letters |
| `DayController` | `onMorning` -> compute narrative state, deliver mail; records day-skipped |
| `ServiceController` | `onServe` / `onChat` / `onArcBeat` -> ActivityLedger (real events) |
| `ProgressionController` | `onUpgrade` / `onRecipeDiscovery` -> ActivityLedger; owns ActivityLedger |
| `KettleController` | `onExperimentalBrew` -> ActivityLedger (curiosity/independence) |

---

## 16. Documentation Changes

| Document | Changes |
|----------|---------|
| `docs/09-narrative-system.md` | **Created** — this document |
| `docs/01-gdd-core.md` | Add narrative thesis + backstory to Pillars section |
| `docs/02-systems-design.md` | Add §9: Narrative System hooks, letter scheduler, dimension model |
| `docs/03-world-characters.md` | Add NPC arc integration table, Wren spine, thematic roles |
| `docs/05-ui-ux.md` | Add §3.5: Letter UI, mailbox, reactive delivery |
| `docs/06-mvp-scope-roadmap.md` | Add narrative milestones (M3 content pass → M5 narrative polish) |
| `docs/08-tech-stack.md` | Add `src/narrative/` to module map, dependency direction |

---

## 17. Testable Design Requirements

| Test Case | Given | Expect |
|-----------|-------|--------|
| High-CARE player gets relationship letters early | hearts.fenwick=4, hearts.sela=3, day=5 | `fenwick_memory_promise` eligible before `marigold_ledger_found` |
| High-COMFORT player gets café letters early | stars=4, upgrades=4, day=5 | `marigold_ledger_found` eligible before `fenwick_memory_promise` |
| High-CURIOSITY player gets mystery clues early | recipes=6, journal_opens=12, day=5 | `wren_first_clue_letter` eligible |
| Mandatory letters never starved | Any state, day=7 | `marigold_ch2_revelation` delivered |
| No branch blocks main story | Low all dimensions, day=10 | Convergence letters (Wren Scene 4, Marigold Letter 3) still deliver |
| Ending always valid | Any valid save state, day=14 | `evaluateEnding()` returns one of 4 endings |
| Replay deterministic | Same save loaded twice | Same letter schedule, same ending |

---

## 18. Quality Check Verification

- [x] Player backstory clearly explained
- [x] Marigold's reason for choosing player defined
- [x] Inheritance emotionally meaningful (stewardship + choice)
- [x] Core mystery defined (5 layers)
- [x] Five hidden narrative dimensions defined
- [x] Existing mechanics feed narrative state (27 signals mapped)
- [x] 5-chapter structure over 14 days defined
- [x] Letter ordering behavior-driven (3 trajectories)
- [x] NPC arcs connect to player's story (thematic mirroring)
- [x] Wren is narrative spine (6 scenes mapped)
- [x] Flavor vs. life-path choices distinguished
- [x] 4 valid endings, no failure state
- [x] Replayability defined (deterministic + variance)
- [x] Save implications documented (flags only, dimensions derived)
- [x] Implementation architecture documented (6 modules)
- [x] **No code changed** (design/documentation only)

---

## 19. Final Report

### 1. Narrative System Designed

Complete specification for a behavior-driven narrative layer that:
- Computes 5 hidden dimensions from existing gameplay data
- Schedules reactive letters based on dimension thresholds
- Branches letter order and optional scenes across 3 trajectories
- Integrates 6 NPC arcs as thematic mirrors of player journey
- Uses Wren as connective spine for Marigold mystery
- Evaluates 4 emotionally valid endings from final dimension state

### 2. Documents Created

- `docs/09-narrative-system.md` (this document — authoritative spec)

### 3. Documents To Be Modified (Next Steps)

- `docs/01-gdd-core.md` — add narrative thesis to Pillars
- `docs/02-systems-design.md` — add §9 Narrative System
- `docs/03-world-characters.md` — add arc integration + Wren spine
- `docs/05-ui-ux.md` — add letter mailbox UI
- `docs/06-mvp-scope-roadmap.md` — add M5 Narrative Polish milestone
- `docs/08-tech-stack.md` — add narrative module architecture

### 4. Current Code Capabilities Supporting Design

| Capability | Location | Supports |
|------------|----------|----------|
| Save flags (discovered_recipes, learned_prefs, seen_scenes, arc flags) | `save/validate.ts` | Eligibility conditions |
| Hearts (float points, daily cap, per-NPC) | `sim/hearts.ts` | CARE dimension |
| Recipe discovery + hints | `sim/brewing.ts`, `ui/journal.ts` | CURIOSITY dimension |
| Upgrades, stars, inventory, shop | `sim/upgrades.ts`, `sim/economy.ts` | COMFORT dimension |
| Daily schedule, skipped days, door timing | `sim/day.ts`, `sim/customers.ts` | INDEPENDENCE dimension |
| NPC hearts distribution, unique NPCs served | `sim/hearts.ts`, `sim/customers.ts` | COMMUNITY dimension |
| Scene triggers (hearts/day/flags) | `data/scenes.ts` | Arc progression gates |
| Letter archive (`save.letters`) | `save/validate.ts` | Letter delivery tracking |
| Deterministic schedule (`buildDaySchedule`) | `sim/customers.ts` | Replayability |

### 5. New Data/State Required for Implementation

| Addition | Location | Purpose |
|----------|----------|---------|
| `narrative` flags object | `save/validate.ts` SaveFlags | Chapter, letters, ending, mystery layer |
| `NarrativeDimension` type | `src/narrative/narrative-state.ts` | Computed dimensions |
| Letter definitions | `src/narrative/story-definitions.ts` | 40+ letter configs |
| Chapter config | `src/narrative/story-definitions.ts` | 5 chapters, beats, convergence |
| Ending definitions | `src/narrative/ending-evaluator.ts` | 4 endings, scoring |

### 6. Major Narrative Rules

1. **No explicit story choices** — branching from behavior
2. **No failure endings** — all 4 valid, celebrated
3. **Dimensions derived, not saved** — recomputed daily
4. **Mandatory beats converge** — Day 1, 7, 10, 14 identical
5. **Wren spine is mandatory** — unlocks R008 + final revelation
6. **Letters reactive** — priority by dimension alignment
7. **Deterministic** — same save = same narrative

### 7. Planned Implementation Modules (Final — all shipped)

| Module | Responsibility | Status |
|--------|----------------|--------|
| `narrative-input.ts` | Adapter: SaveData → NarrativeInput + LetterContext | ✅ Done (Batch 1) |
| `narrative-signals.ts` | Pure signal derivation from NarrativeInput | ✅ Done (Batch 2) |
| `narrative-evaluator.ts` | Pure 5-dimension + trajectory evaluation | ✅ Done (Batch 3) |
| `narrative-state.ts` | Thin facade combining signals + evaluator | ✅ Done (Batch 3) |
| `story-definitions.ts` | PURE CONTENT: letters, chapters, endings, trajectories | ✅ Done (Batch 3) |
| `activity-ledger.ts` + `activity-events.ts` | Real gameplay event recording (no heuristics) | ✅ Done (Batch 2) |
| `narrative-scheduler.ts` | Chapter advancement, beat triggering, convergence | ✅ Done (Batch 4) |
| `letter-scheduler.ts` | Letter selection, priority, caps (pure, LetterContext) | ✅ Done (Batch 4) |
| `story-progress.ts` | Typed StoryProgress model + save adapter | ✅ Done (Batch 5) |
| `ending-evaluator.ts` | Final ending determination (pure, deterministic) | ✅ Done (Batch 5) |
| Save schema v6 | Activity ledger flags + migration | ✅ Done (Batch 2) |

### 8. Risks / Unresolved Decisions

| Risk | Mitigation |
|------|------------|
| Dimension weights feel arbitrary | Expose as tunable constants; validate with playtest telemetry |
| Letter volume overwhelming | Cap: max 1/day, max 3/chapter per source; skippable |
| Players confused by hidden state | Journal "Story" tab shows dimension trends (post-MVP) |
| Trajectory labels leak | Never show trajectory name; only natural content variation |
| Save migration complexity | Add narrative flags in v5 migration with safe defaults |
| Content scope (40+ letters) | Phase implementation: mandatory first, optional second |

---

## 14. Narrative Dimension Semantics (Semantic Cleanup)

Dimensions are **contextual interpretations of player behavior**, not RPG stats, morality scores,
progression currencies, or punishment meters. The system answers: *"What kind of experience does this
player's behavior suggest?"* — not *"Which stat did the player accidentally maximize?"*

| Dimension | Meaning | Primary behavior | Neutral / excluded |
|-----------|---------|------------------|--------------------|
| **CARE** | Attention to individuals | Serving preferences, chats, learned preferences, relationship arcs, returning to people | Generic progression, coins |
| **CURIOSITY** | Exploration & discovery | Experimental brews, recipe discovery, mystery investigation, lore reading | "More gameplay" ≠ curiosity; coins/upgrades |
| **COMMUNITY** | Breadth of social participation | Chatting multiple NPCs, maintaining many relationships, town engagement | NOT a duplicate of CARE (depth vs. breadth) |
| **COMFORT** | Investment in home / café & cozy stability | Café upgrades, decoration, staying open, routine | Stars (minor hint only); shop visits; raw progression |
| **INDEPENDENCE** | Intentional, self-directed agency | Genuine self-directed / opt-out choices (currently **unrecorded**) | **Under-instrumented → baseline 0** |

### CARE vs COMMUNITY (the key distinction)
- **CARE** = *depth of attention to individuals* (one NPC's favorite drink, their arc, remembering them).
- **COMMUNITY** = *breadth / investment in the social world* (many NPCs, town events, broad engagement).
- Each action has a **primary** interpretation; secondary effects are rare and intentional. Favorite serving → CARE (not COMMUNITY + COMFORT + CURIOSITY).

### Pacing is NOT a personality judgment
Respecting the player's pacing is a core pillar (NO fail states, NO timers, calm over challenge,
player-controlled pacing). Therefore the following are **strictly neutral** for narrative dimensions:

- **Skipped days** → neutral (affects progression timing only, never personality)
- **Early closes** → neutral
- **Low activity / short sessions** → neutral
- **Not using relaxed mode** → neutral
- **Low chat / low favorite-serving frequency** → neutral (not a social penalty)

A player who closes early, skips a day, plays briefly, or does not chat is **never** silently pushed
toward an "independent" or any other narrative. They retain the complete story: chapter advancement is
day-based and dimension-independent, and the ending evaluator falls back to **keeper** (belonging /
continuity) when no ending's dimension thresholds are met.

### INDEPENDENCE status
Independence is intentionally a near-zero baseline because the current game does not record any reliable
self-directed-choice signal (all ending branches are equally valid; there is no "decline obligation"
event). Fabricating evidence from pacing was explicitly rejected. The `wanderer` ending remains in the
model and is reachable *only* if a future build supplies genuine independence signals; until then it is
intentionally hard to hit. This is documented as preferable to false inference.

### Double-counting guard
Each action maps to one primary dimension. Cross-dimension leakage (e.g. favorite serve → CARE +
COMMUNITY + COMFORT + CURIOSITY) is avoided; secondary effects require a deliberate design reason.

---

**END OF PHASE 1 DESIGN DOCUMENT**

*Next: Phase 2 — Implementation of `src/narrative/` modules and save schema migration.*