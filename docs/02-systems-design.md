# 02 · Moonleaf Café — Systems Design

> Doc 02 of 09 · Status: Draft v0.1 · 2026-08-27 · Updated with Narrative System hooks
> Every numeric value here is a **starting value**, not gospel — tune through playtests, and record changes in the Changelog at the bottom.

## 1. The Day Cycle

| Phase | Time pressure | Player actions |
|-------|--------------|----------------|
| Morning (prep) | None — untimed | Read notice board & mail · check stock · set today's menu · flip the door sign to open |
| Service | Soft only | Serve customers, chat, brew. Ends when the sign is flipped back or all arrivals are served |
| Evening recap | None (modal) | Coin count, letters, unlocks, autosave → next day |

**Design notes**
- The day starts when the player opens the door. Nothing begins without their consent.
- Service has no clock. Customers arrive from a per-day schedule; when the queue is empty, the game gently suggests closing ("The street is quiet now…").
- Skipping a day is one click from the morning screen ("Sleep in") — for players who just want story beats or upgrades.
- Autosave fires every evening recap. Manual save unnecessary.
- **Per-day tallies reset each morning.** Coins earned today, drinks served, recipes discovered and hearts gained are counted per day and zeroed at the morning reset (`ServiceController.beginDay`, invoked from `beginDayResets`) — the evening recap always reports *that day*, never a run-cumulative total. This sits alongside the heart-day reset (§5).
- **The backdrop tracks time of day and season.** Prep = morning light, service = daytime, the recap (and the tail of service once the last customer has gone) = dusk; from day 11 the window is snowbound for every phase. `sim/day.ts` `roomVariantFor(day, phase, serviceWindingDown)` is the single source of truth (`morning` / `day` / `evening` / `snow`), unit-tested and pure. The renderer crossfades between variants over ~1.4 s (`ROOM_FADE_MS`), so opening the door reads as the room brightening and closing time as the light going warm; reduced motion snaps instead.

## 2. Brewing & Recipes

The kettle is the one interaction verb. Depth comes from recipes, not mechanics.

### 2.1 The three-step brew
1. **Pick a base** (water / milk / oat milk; coffee base unlocked by Coffee Machine upgrade).
2. **Add up to 3 ingredients** from your shelf.
3. **Choose finish:** hot / iced / foamed.

→ Output is matched against the **known** recipe book only. Match = serve. No match = "Murky Brew" (see 2.4).

### 2.2 Recipe discovery — two paths
- **Taught:** customers, letters, and notice-board tips hand you recipes directly (sets `flags.discovered_recipes`).
- **Hinted:** every recipe also appears in the journal as a riddle card once *hinted* (e.g., *"Fenwick mutters about something bitter to survive mornings"*). Players who hate experimenting can simply wait until someone teaches them. Experimentation is never required to finish any arc.

**Important (M1 behavior):** the kettle lets you try any combo, but `resolveBrew` only matches against recipes already in `discovered_recipes`. Unknown recipes always produce Murky Brew even if the combo is "correct" on paper — discovery-by-experiment is a post-M1 nicety and M1 has no experiment hints.

### 2.3 Recipe table (R001–R008)

| ID | Name | Combo | Notes |
|----|------|-------|-------|
| R001 | Black Tea | water + tea_leaves | Starting recipe |
| R002 | Honey Milk | milk + honey | Starting recipe |
| R003 | Moonleaf Tea | water + moonleaf | First taught recipe — Fenwick's order (day 1) |
| R004 | Ember Cocoa | milk + cocoa + ember_chili | Bram's favorite |
| R005 | Cloud Foam | milk + cloud_sugar, foamed | Sela's favorite |
| R006 | Iced Berry Tisane | water + frostberries, iced | Summer unlock |
| R007 | Root & Remedy Broth | water + ginger_root + sage | Winter unlock |
| R008 | Wren's Usual | milk + honey + moonleaf, hot | Revealed after Wren's arc resolution scene (M3) |

R009–R012 reserved for post-MVP seasonal specials.

### 2.4 Failure states
There are none that punish. A non-recipe combination (or a correct combo for an undiscovered recipe) produces **Murky Brew**: the customer politely declines ("Oh… how inventive."), no coins, tiny reputation nudge downward only if repeated to the same customer twice in a day, cat sniffs it and walks away. **Ingredients are still consumed on a Murky Brew** (stock gate happens before brew resolution). Pour it out, try again.

### 2.5 Ingredient shelf

| Ingredient | Buy price | Restock source |
|-----------|-----------|----------------|
| Tea leaves | 2 ¤ | Weekly delivery (auto) |
| Honey | 3 ¤ | Weekly delivery (auto) |
| Moonleaf | 6 ¤ | Sela's cart (from day 2) |
| Cocoa | 4 ¤ | Weekly delivery (auto) |
| Ember chili | 5 ¤ | Weekly delivery (auto; M3: Bram's gift after his first scene) |
| Cloud sugar | 7 ¤ | Sela's cart |
| Frostberries | 5 ¤ | Weekly delivery (auto; seasonal label = lore in M2) |
| Ginger root | 3 ¤ | Weekly delivery (auto; seasonal label = lore in M2) |
| Sage | 3 ¤ | Weekly delivery (auto; spec-gap decision) |

Starting stock: 10× tea leaves, 6× honey, 4× moonleaf. Shelf capacity starts at **6 slots** (upgradeable to 12 via Bigger Shelf, repeatable ×2).

**Sela's cart rule (chosen option ii, deviation from doc):** moonleaf/cloud_sugar are purchasable from day 2 onward REGARDLESS of whether Sela visited that day. Simpler to explain ("the cart parks outside daily"), no dead-end mornings, and her visits stay purely social until arcs land.

**Weekly delivery:** arrives morning of days 8 and 15: `(day-1) % 7 === 0 && day > 1`. Bundle quantities tuned for ~2 days of relevant recipes across full cast plus experimentation slack.

**Capacity semantics:** counts DISTINCT ingredient KINDS currently stocked (>0 units); kinds already stocked can always be topped up.

## 3. Customers & Patience

### 3.1 Customer model
Each arrival carries: `character_id`, `order` (recipe id), `patience`, `chat_topic` (optional). Travelers ride the same shape: coin flow only, no bonds.

### 3.2 Patience — soft by design
- Starts 100 (115 with Window Bench upgrade), drains ~0.8/sec while waiting (≈ 2 minutes of patience).
- **Never displays as an alarm.** UI shows a candle icon that slowly shortens; at low patience it flickers, but stays calm in color.
- At zero: the customer says a kind goodbye ("I'll catch you tomorrow!") and leaves. **No penalty.** They may return later the same day.
- **Relaxed Mode (default ON):** patience drains at half rate (0.5×). Turning it OFF is optional and buried in settings, not promoted.

### 3.3 Daily flow (MVP pacing)

| Days | Arrivals/day | Mix |
|------|-------------|-----|
| 1–2 | 4–5 | Tutorial-weighted: Marigold's letter, Fenwick, Bram |
| 3–6 | 5–6 | All six regulars cycling, first repeat orders |
| 7–13 | 6–8 | Arc beats trigger, occasional travelers (generic sprites) fill gaps |
| 14+ | 6–9 | Sandbox; arcs complete; seasons rotate décor |

**Schedule determinism:** `buildDaySchedule(day, {wrenRevealed, seed})` is deterministic given (day, seed, wrenRevealed). Default seed = `day * 1013904223`. Teach beats mirror Fenwick's R003 moment: each regular's FIRST visit on/after day 3 teaches their favorite; afterwards they order it. Wren debuts day 2 with a "?" mystery; his first day-3+ visit reveals the usual (teaches R007) unless already revealed via the save flag.

### 3.4 Cast & favorites (doc 03 §4)

| Regular | Favorite |
|---------|----------|
| Fenwick | R004 (Ember Cocoa) |
| Sela | R005 (Cloud Foam) |
| Bram | R004 (Ember Cocoa) |
| Nia | R006 (Iced Berry Tisane) |
| Wren | R007 (Root & Remedy Broth) |

Day-1 accepted script (preserved verbatim from M1): Fenwick teaches R003, then orders R003; Bram orders R002; Sela orders R002.

## 4. Economy

Single currency: **coins (¤)**. Sources and sinks must stay roughly balanced so money never becomes the goal (P3).

### 4.1 Money flow (starting values)
- **Drink price:** base 5 ¤ + 1 ¤ per ingredient. (Black Tea 6 ¤ · Ember Cocoa 7 ¤.)
- **Daily costs:** none. Rent is paid off-screen by Aunt Marigold's legacy fund — this is a deliberate cozy choice; rent anxiety is not cozy.
- **Tips:** +1 ¤ if you chat with the customer before serving.
- **Perfect serve bonus:** +2 ¤ if it's the customer's favorite drink.

### 4.2 Upgrade track (curated slots, no free placement)

| Upgrade | Cost | Effect |
|---------|------|--------|
| Second kettle | 60 ¤ | Two drinks brewing at once (A/B slots in kettle panel) |
| Window bench | 45 ¤ | +15 starting patience (115 vs 100) — "they linger happily" |
| Bigger shelf | 40 ¤ | +3 ingredient slots (repeatable ×2, max 12) |
| Coffee machine | 80 ¤ | Unlocks `coffee` base in kettle (post-MVP menu expansion) |
| Record player | 70 ¤ | Enables phase music tracks (prep/service/recap crossfade) |
| Hearth expansion | 90 ¤ | Visual hearth glow + brew animation 1.6s → 1.0s |

Intended pace: one upgrade every ~2 days early on, slowing to one per week. Upgrades should always feel like treats, never chores.

## 5. Progression — Three Dials

Progress is deliberately split so different player motivations each have a dial (P3).

| Dial | Grows by | Unlocks |
|------|----------|---------|
| **Reputation stars** (0–5) | Serving correct drinks; consistent daily opening | Ingredients, methods (iced/foamed), second kettle, more arrivals/day |
| **Hearts** (per character, 0–5) | Correct favorite serves, chats, arc scene choices | Personal scenes, gifts (recipes, décor, ingredients), endings |
| **Coins** | Drink sales + tips + perfect bonuses | Comfort upgrades only |

**Star thresholds:** ★1 at 15 total serves · ★2 at 40 · ★3 at 75 · ★4 at 120 · ★5 at 180. Roughly one star per 3–4 days of active play.

**Heart system (doc 02 §5, sim/hearts.ts):**
- Tracked as FLOAT heart POINTS; displayed hearts = `floor(points)`, clamped 0–5.
- Reported values: favorite serve +1.0 · chat +0.25 · correct non-favorite serve +0.1.
- Daily cap: +1.0 heart points per character per day (enforced in `awardHeartPoints`).
- Travelers never earn hearts.
- Morning reset via `resetHeartDay` clears `gainedToday` but keeps lifetime `points`.

## 6. Journal

One key/tabbed screen, four tabs:

1. **Recipes** — found recipes (brewable cards), hinted ones (riddle cards with clue text from `service.taughtRXXXBody`), plus a "close guesses" log of near-miss experiments (post-MVP). The tab renders one card per recipe in `RECIPES` (R001–R008) order, showing it **only** once the recipe is either discovered (`flags.discovered_recipes`) *or* currently hinted (`HINTED_RECIPES` = R004–R007). A recipe that is neither — R001–R003 before their day-1 teaching visits, R008 before Wren's arc resolves — stays off the page so nothing is spoiled. So the tab grows from 4 riddle cards on a fresh save toward all 8 as the run progresses; it is never capped at the hinted four.
2. **Regulars** — portrait, likes/dislikes (written down automatically after you learn them via `flags.learned_prefs`), current hearts (0–5, floor of points), arc progress marker.
3. **Town** — map sketch of Hollowbrook Crossing, unlocked lore scraps, moon-phase widget (post-MVP).
4. **Letters** — archive of mail and notice-board notes (from `save.letters`).

The journal auto-fills; nothing needs manual note-taking. It exists so experimentation feels safe — you can't lose a discovered fact.

**Juice item 5 (doc 04 §3):** the journal "opens itself" to the new entry after a discovery serve — the visit beat ends, then the journal opens to the new card with a page-turn entrance (CSS; skipped under reduced motion).

## 7. Save Model

Browser-first means saves must be defensive.

### 7.1 Primary save
- Browser `localStorage` under a versioned key (`moonleaf_save_v1`).
- Stored as plaintext JSON by design: players own their local save, and dev-tools inspection must stay easy during development. Encryption applies **only to the export string** (7.2).
- **Autosave points:** evening recap only (single atomic write via `ProgressionController.snapshotIntoSave`). Mid-service quitting loses at most one service — acceptable, and stated on the title screen footer.
- **Schema (current version: v7).** The block below is the M4-era core shape kept for orientation; `src/save/validate.ts` is the source of truth. Since then: v5–v6 added the narrative dimensions and the activity-ledger flags (doc 09 §9.7), and **v7** added `flags.letters_delivered_day` (`letterId → day delivered`) so the letter scheduler's per-letter cooldown is enforceable. Migrations `migrateV1toV2 … migrateV6toV7` live in `src/save/store.ts`.

```typescript
interface SaveData {
  version: number;                    // 7 (see validate.ts for the full flags shape)
  day: number;                        // current day
  coins: number;                      // ¤
  stars: number;                      // 0–5
  total_serves: number;               // lifetime correct serves
  chatted_this_service: boolean;      // tip gate for current customer
  inventory: Record<string, number>;  // ingredient kind counts
  upgrades: string[];                 // owned upgrade ids (repeatable = multiple entries)
  hearts: Record<string, number>;     // charId → lifetime float points
  heart_points_today: Record<string, number>; // charId → points gained today
  letters: string[];                  // mail archive ids in arrival order
  flags: {
    discovered_recipes: string[];     // recipe ids the player knows
    learned_prefs: string[];          // regular ids whose favorite is known
    seen_scenes: string[];            // scene ids already played
    wren_usual_revealed: boolean;     // gates Wren's "?" mystery order
    fenwick_arc_complete: boolean;    // M3 arc progress
    fenwick_epilogue_done: boolean;
    wren_arc_complete: boolean;
    wren_epilogue_done: boolean;
    title_music_box_unlocked: boolean;
    sela_intro_done: boolean;
    bram_intro_done: boolean;
    nia_intro_done: boolean;
    fenwick_chili_granted: boolean;   // M4 one-shot inventory grant
    kettle_auto_opened: boolean;      // M4 tutorial step 4 fired
  };
  settings: {
    relaxed_mode: boolean;
    reduced_motion: boolean;
    master_vol: number;               // 0–1
    text_size: number;                // 100 | 125 | 150
  };
}
```

- **Migration rule:** on load, if `version < current`, run migration functions oldest-first (v1→v2→…→v7). Never hot-patch old keys silently. Each migration adds new fields with safe defaults; existing fields are never rewritten.

### 7.2 Export / import — encrypted transfer codes

Export produces an **encrypted, tamper-evident text code**, not readable JSON. Goals, stated honestly:

| Goal | Addressed? | How |
|------|-----------|-----|
| Casual save editing (set coins to 9999 in a text editor) | ✅ | AES-GCM ciphertext — nothing readable or editable without breaking auth |
| Silent corruption going unnoticed | ✅ | GCM auth tag — any altered byte fails decryption |
| Accidental import over an existing save | ✅ | Preview + confirm modal (doc 05 §3.4) |
| Secrecy from a determined attacker | ❌ explicit non-goal | Key ships in the JS bundle; this is tamper-resistance, not DRM. Player saves belong to players (P1). |

#### Algorithm
- **AES-GCM with a 256-bit key** via Web Crypto (`crypto.subtle`) — built into every target browser, no dependency, works offline. GCM gives confidentiality *and* integrity in one step.
- **Fresh random 12-byte IV per export** (`crypto.getRandomValues`). Never reuse an IV with the same key.
- **Key:** single app key compiled into the bundle (`SAVE_KEY_HEX` in `save/key.ts`). A 1-byte **key id** (0x01) is embedded in the code format so keys can rotate later without orphaning old exports.
- Requires a secure context (itch.io serves HTTPS — satisfied). If `crypto.subtle` is unavailable, disable Export/Import buttons with a tooltip instead of falling back to unencrypted output — never ship a downgrade path that trains players to accept plaintext codes.

#### Wire format
```
MLC1.<key_id>.<iv_b64url>.<ciphertext_b64url>
```

- `MLC1` — magic prefix + format version. Lets the parser reject garbage politely and lets the format evolve (MLC2…) without ambiguity.
- Plaintext payload inside the ciphertext = exactly the §7.1 schema JSON, `version` field included.
- Base64URL only (no `+/=`) so codes survive chat apps, email, and notes apps unmangled.

#### Import pipeline (strict order, fail closed)
1. Trim input; verify `MLC1` prefix → else "not a save code" error.
2. Parse segments; decode IV + ciphertext.
3. `key_id` known? Unknown → "made with a different version of the game."
4. Decrypt+authenticate. Any failure (tamper, truncation, wrong key) → single generic message; **never** reveal which check failed (avoids giving editors an oracle).
5. JSON parse → schema-validate required fields and value ranges (coins ≥ 0, stars 0–5, day ≥ 1).
6. Version migrate oldest-first (same rule as 7.1).
7. Show preview modal → player confirms → atomic replace of `moonleaf_save_v1`.

Every validation gate happens **in memory**; the live localStorage save is touched only after the confirm click.

#### Failure copy (P1 — calm, never blamey)

| Case | Message |
|------|---------|
| Garbage / wrong prefix | "Hmm, that doesn't look like a Moonleaf Café save code." |
| Auth/decrypt failure | "This code seems damaged — maybe a character got lost when copying it?" |
| Unknown key_id | "This save comes from a different version of the game." |
| Newer schema `version` | "This save is from a newer update. Please update the game first." |
| Schema invalid after decrypt | "This save is damaged inside. Starting fresh might be kindest." |

All failures leave the current save untouched and return the player to Settings. No red alerts, no console-style dumps.

#### Testing gates (add to M1 exit criteria)
- Round-trip: export → import → byte-identical state.
- Tamper: flip any character in the code → import must refuse (auth must catch it, not JSON parse).
- Cross-device: export in Chrome → import in Firefox/Safari.
- Old-format fixture: an `MLC1` code with `version: 1` migrates correctly after decryption.

## 8. Difficulty Philosophy
- There is no difficulty curve, only a *comfort curve*: systems appear one at a time (day 1: brew; day 2: menu setting; day 3: chatting; day 4+: upgrades).
- Relaxed Mode default ON. The alternative ("Standard") exists solely for players who want patience to mean something; it is never required for any content or ending.
- Numbers above were chosen so a distracted player still succeeds: ~2 min patience vs. a ~30 sec average serve loop gives huge margin.

## 9. Narrative System (Doc 09)

The narrative layer is a **behavior-driven system** that derives hidden state from existing gameplay data and uses it to schedule reactive content. It does not add new gameplay mechanics — it shapes the *presentation* of existing content.

### 9.1 Narrative Dimensions (Hidden, Derived)

Five dimensions computed each morning from save state (0–1 normalized):

| Dimension | Core Meaning | Primary Signals |
|-----------|-------------|-----------------|
| **CARE** | Attentiveness to individuals | Hearts, favorite serves, chats, NPC-specific recipes |
| **CURIOSITY** | Drive to understand secrets | Recipe discoveries, journal usage, experimental brews, Wren interactions |
| **COMMUNITY** | Breadth of social engagement | Unique NPCs served, hearts breadth, town letters, town tab |
| **COMFORT** | Investment in the café as a place | Upgrades, shelf capacity, inventory breadth, staying open (no early close) |
| **INDEPENDENCE** | Intentional self-directed agency | **Under-instrumented** — baseline 0; not derived from pacing |

- **Computed, not stored.** Recalculated daily from source state.
- **Thresholds:** 0.33 (low) / 0.66 (high) for branch eligibility.
- **Deterministic:** same save → same dimensions.
- **Pacing is neutral.** Skipped days, early closes, low activity, and non-relaxed play are NOT
  personality signals and are excluded from all dimensions (see docs/09 §14).

### 9.2 Dimension → Content Mapping

| High Dimension | Content Emphasis |
|----------------|------------------|
| CARE ≥ 0.66 | NPC relationship letters, Marigold memory letters, deep arc scenes |
| CURIOSITY ≥ 0.66 | Mystery letters, hidden recipe hints, Wren clue letters, basement hints |
| COMMUNITY ≥ 0.66 | Town letters, community development letters, broad NPC engagement |
| COMFORT ≥ 0.66 | Legacy letters, renovation letters, town council proposals, shop focus |
| INDEPENDENCE ≥ 0.66 | (Reserved — independence is under-instrumented; no content auto-unlocks from pacing) |

### 9.3 Letter Scheduler Integration

The narrative system hooks into the **morning mail delivery** (DayController → letter.ts):

```typescript
// Morning flow addition
function deliverMorningMail(save: SaveData): void {
  const narrativeState = NarrativeState.compute(save);
  const letters = LetterScheduler.select(narrativeState, save);
  // Deliver via existing letter.ts mailbox UI
}
```

**Letter categories:**
- **Mandatory** (3 Marigold, convergence beats) — fixed schedule
- **NPC** (6 per character) — hearts + dimension driven
- **Town** (4) — community dimension + days
- **Mystery** (5) — curiosity + Wren progress
- **Branch** (varies) — dimension thresholds
- **Reactive** — low priority, fill gaps

**Scheduler algorithm:** mandatory first (by chapter/priority), then optional sorted by dimension alignment score.

### 9.4 Trajectory Branches (Emergent)

Three trajectories emerge from dimension profiles — **never explicitly chosen**:

| Trajectory | Dominant Dimensions | Letter Emphasis |
|------------|---------------------|-----------------|
| Relationship-First | CARE + COMMUNITY | NPC letters → Marigold memories → Town |
| Café-First | COMFORT + STARS | Legacy → Renovation → Practical NPC |
| Curiosity-First | CURIOSITY + INDEPENDENCE | Mystery → Hidden recipes → Marigold secrets |

All trajectories converge on mandatory beats (Day 1, 7, 10, 14).

### 9.5 Chapter Structure (14 Days)

| Chapter | Days | Focus | Key Beats |
|---------|------|-------|-----------|
| CH0: ARRIVAL | 1–2 | Inheritance, tutorial | Marigold Letter 1, first service |
| CH1: SETTLING | 3–4 | Regulars reveal | Intro scenes, Wren Scene 1 |
| CH2: FIRST BRANCH | 5–7 | Trajectories diverge | Marigold Letter 2, Fenwick Scene 2 |
| CH3: DEEPENING | 8–10 | Mystery deepens | Weekly letters, Wren Scenes 2–3 |
| CH4: REVELATION | 11–12 | Major reveal | Wren Scenes 4–5, Marigold Letter 3 |
| CH5: CHOICE | 13–14 | Ending direction | Final letter, evaluation |

### 9.6 Ending Evaluation (Day 14)

Four valid endings scored from final dimension state:

| Ending | Theme | Primary Dimension | Minimum |
|--------|-------|-------------------|---------|
| KEEPER | Belonging | CARE | ≥ 0.5, Fenwick arc complete |
| BUILDER | Creation | COMFORT | ≥ 0.6, Stars ≥ 4, Upgrades ≥ 4 |
| WANDERER | Autonomy | INDEPENDENCE | ≥ 0.5, Wren arc complete (no skipped-day requirement; independence is under-instrumented so this ending is intentionally rare) |
| COMMUNITY KEEPER | Legacy | COMMUNITY | ≥ 0.6, Town letters ≥ 3, All intros |

Tiebreaker: highest dimension. All endings celebrated; no failure state.

### 9.7 Save Schema Additions (Future v5)

```typescript
// Add to SaveFlags
interface NarrativeFlags {
  current_chapter: 0 | 1 | 2 | 3 | 4 | 5;
  chapter_entered_day: Record<number, number>;
  letters_delivered: string[];
  letters_read: string[];
  letters_dismissed: string[];
  dominant_dimension_history: NarrativeDimension[];
  trajectory_hint: "care" | "comfort" | "curiosity" | "community" | "independence" | null;
  ending_achieved?: "keeper" | "builder" | "wanderer" | "community";
  marigold_mystery_layer: 1 | 2 | 3 | 4 | 5;
  wren_clues_gathered: number;
  playthrough_count: number;
  previous_endings: string[];
}
```

**Dimensions are NOT saved** — recomputed on load from source state.

## 10. Systems Changelog

| Date | Change | Reason |
|------|--------|--------|
| 2026-08-25 | Initial values set | Baseline for playtest build M1 |
| 2026-08-27 | Recipe R008 renamed from "Cozy Comfort" to "Wren's Usual"; favorite table corrected (Fenwick=R004); Sela's cart rule documented as chosen option ii; Murky Brew consumes ingredients; save schema updated to v4 with text_size; migration chain documented | Matches actual codebase |
| 2026-08-27 | Added §9 Narrative System: 5 hidden dimensions, letter scheduler, 3 trajectories, 5 chapters, 4 endings, save schema additions | Doc 09 specification |
| 2026-09-02 | Save schema v7: added `letters_delivered_day` (per-letter delivery-day map) so the letter scheduler's cooldown is a real gate, not a no-op; migration `migrateV6toV7` documented | Cooldown fix |
| 2026-09-02 | Documented backdrop time-of-day + season cycling (§1): `roomVariantFor` variants `morning`/`day`/`evening`/`snow`, `WINTER_FROM_DAY = 11`, ~1.4 s crossfade | Feature shipped |
| 2026-09-02 | **Bug fix:** per-day recap tallies (coins earned / drinks served / discoveries / hearts) were never reset — `ServiceController.beginDay()` was defined but never called, so the recap reported run-cumulative totals. `beginDayResets` now calls it (§1). | Matches intended design |
| 2026-09-02 | **Bug fix:** Journal Recipes tab only ever listed the 4 hinted recipes (R004–R007); discovered starters (R001–R003) and Wren's Usual (R008) never appeared. Now loops all of `RECIPES` with a discovered-or-hinted visibility rule (§6). | Matches §6 spec |