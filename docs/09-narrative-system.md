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
| **CARE** | Attentiveness to individuals | Hearts (total), favorite serves, chats, recipe discovery for specific NPCs | YES |
| **CURIOSITY** | Drive to understand systems & secrets | Recipe discoveries, journal tab usage, hint card reads, experimental brews, Wren interactions | YES |
| **COMMUNITY** | Breadth of social engagement | NPCs served (unique), hearts distribution breadth, letter archive size, town tab engagement | YES |
| **COMFORT** | Investment in the café as a place | Upgrades owned, stars, shelf capacity, inventory breadth, recap shop visits | YES |
| **INDEPENDENCE** | Automaous pacing & self-direction | Days skipped (sleep-in), door close timing, relaxed mode, experimental brews, solo play | YES |

### Computation Rules

- **Values are derived, not accumulated.** Recomputed each morning from save data.
- **Normalized 0–1.** Each dimension = weighted combination of signals.
- **Thresholds at 0.33 / 0.66** (low / medium / high) for branch eligibility.
- **Deterministic.** Same save state → same narrative state.
- **Persisted only as flags.** The dimensions themselves are not saved; only the chapter/letter/scene flags they unlock.

### Signal Weights (Initial)

```
CARE = 0.40 * (avg_hearts / 5) + 0.30 * (favorite_serves / total_serves) + 0.20 * (chats / opportunities) + 0.10 * (recipes_for_NPCs / total_recipes)

CURIOSITY = 0.35 * (discovered_recipes / 8) + 0.25 * (journal_opens / days) + 0.20 * (hint_cards_read / 4) + 0.10 * (experimental_brews / total_brews) + 0.10 * (wren_scenes_seen / 6)

COMMUNITY = 0.35 * (unique_NPCs_served / 6) + 0.25 * (hearts_breadth / 6) + 0.20 * (letters_archived / max_letters) + 0.20 * (town_tab_opens / days)

COMFORT = 0.30 * (upgrades_owned / 6) + 0.25 * (stars / 5) + 0.20 * (shelf_capacity / 12) + 0.15 * (inventory_kinds / 9) + 0.10 * (shop_visits / days)

INDEPENDENCE = 0.35 * (days_skipped / 14) + 0.25 * (early_closes / service_days) + 0.20 * (relaxed_mode) + 0.10 * (experimental_brews / total) + 0.10 * (wren_mystery_brews / wren_visits)
```

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
| Skipped days (sleep-in) | INDEPENDENCE / AUTONOMY | AVAILABLE NOW |
| Early door close | INDEPENDENCE / PACING | AVAILABLE NOW |
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
function scheduleLetters(save: SaveData, narrativeState: NarrativeState): LetterDelivery[] {
  // 1. Collect all eligible letters
  const eligible = ALL_LETTERS.filter(l => 
    checkEligibility(l, save, narrativeState)
  );
  
  // 2. Separate mandatory vs optional
  const mandatory = eligible.filter(l => l.mandatory);
  const optional = eligible.filter(l => !l.mandatory);
  
  // 3. Sort mandatory by chapter → priority
  mandatory.sort((a, b) => a.chapter - b.chapter || b.priority - a.priority);
  
  // 4. Sort optional by dimension alignment → priority
  optional.sort((a, b) => {
    const aScore = dimensionAlignment(a, narrativeState);
    const bScore = dimensionAlignment(b, narrativeState);
    return bScore - aScore || b.priority - a.priority;
  });
  
  // 5. Apply caps (max 1 letter/day, max 3/chapter from same source)
  return selectDelivery(mandatory, optional, save);
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
| **THE WANDERER** | Release | Autonomy / Independence | INDEPENDENCE ≥ 0.5, days skipped ≥ 3, Wren arc complete |
| **THE COMMUNITY KEEPER** | Transform | Community / Legacy | COMMUNITY ≥ 0.6, Town letters ≥ 3, All NPC intros done |

### Ending Evaluation (Day 14 Evening)

```typescript
function evaluateEnding(save: SaveData, narrativeState: NarrativeState): Ending {
  const scores = {
    keeper: scoreKeeper(narrativeState, save),
    builder: scoreBuilder(narrativeState, save),
    wanderer: scoreWanderer(narrativeState, save),
    community: scoreCommunity(narrativeState, save)
  };
  
  // Tie-breaking: prioritize ending matching highest dimension
  const primaryDim = highestDimension(narrativeState);
  const tiebreaker = endingForDimension(primaryDim);
  
  return maxBy(scores, (v, k) => v + (k === tiebreaker ? 0.1 : 0));
}
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
| **Derived Narrative State** | CARE, CURIOSITY, COMMUNITY, COMFORT, INDEPENDENCE | **Computed each morning** |
| **Persistent Story Flags** | chapter, letters_delivered, ending_achieved, mystery_layer | Persisted |

**Do not save the computed dimensions.** Recalculate from source state on load.

---

## 15. Implementation Architecture (Future)

### Module Structure

```
src/narrative/
  narrative-state.ts        # Compute dimensions from save state
  narrative-evaluator.ts    # Check eligibility, score endings
  narrative-scheduler.ts    # Advance chapter, trigger beats
  letter-scheduler.ts       # Select & deliver letters
  story-definitions.ts      # Letter definitions, chapter config, endings
  ending-evaluator.ts       # Final ending determination
  narrative-hooks.ts        # Integration points for controllers
```

### Integration Points

| Existing Controller | Narrative Hook |
|---------------------|----------------|
| `GameController` | `onDayBegin` → advance chapter, schedule letters |
| `DayController` | `onMorning` → compute narrative state, deliver mail |
| `ServiceController` | `onServe` / `onChat` / `onArcBeat` → update dimension signals |
| `ProgressionController` | `onUpgrade` / `onRecipeDiscovery` → curiosity/comfort signals |
| `KettleController` | `onExperimentalBrew` → independence/curiosity signal |

### Data Flow

```
Save State (source)
    ↓
NarrativeState.compute(save) → 5 dimensions (derived)
    ↓
LetterScheduler.select(narrativeState, save) → LetterDelivery[]
    ↓
DayController delivers via UI/letter.ts
    ↓
Player reads → sets flags.read
    ↓
Next day → recompute
```

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

### 7. Planned Implementation Modules

| Module | Responsibility |
|--------|----------------|
| `narrative-state.ts` | Compute 5 dimensions from save |
| `narrative-evaluator.ts` | Eligibility, scoring, thresholds |
| `narrative-scheduler.ts` | Chapter advancement, beat triggering |
| `letter-scheduler.ts` | Letter selection, delivery, caps |
| `story-definitions.ts` | All narrative content data |
| `ending-evaluator.ts` | Final ending determination |
| `narrative-hooks.ts` | Controller integration points |

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

**END OF PHASE 1 DESIGN DOCUMENT**

*Next: Phase 2 — Implementation of `src/narrative/` modules and save schema migration.*