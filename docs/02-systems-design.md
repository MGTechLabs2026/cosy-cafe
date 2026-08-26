# 02 · Moonleaf Café — Systems Design

> Doc 02 of 07 · Status: Draft v0.1 · 2026-08-25
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

## 2. Brewing & Recipes

The kettle is the one interaction verb. Depth comes from recipes, not mechanics.

### 2.1 The three-step brew
1. **Pick a base** (water / milk / oat milk).
2. **Add up to 3 ingredients** from your shelf.
3. **Choose finish:** hot / iced / foamed.

→ Output is matched against the recipe book. Match = serve. No match = "Murky Brew" (see 2.4).

### 2.2 Recipe discovery — two paths
- **Taught:** customers, letters, and notice-board tips hand you recipes directly.
- **Experimented:** the kettle lets you try any combo; correct combos get discovered with a small sparkle + journal entry. A faint hum from the kettle signals you're within one ingredient of something new.

**Hint economy:** every recipe also appears in the journal as a riddle card once *hinted* (e.g., *"Fenwick mutters about something bitter to survive mornings"*). Players who hate experimenting can simply wait until someone teaches them. Experimentation is never required to finish any arc.

### 2.3 Starting recipe set
| ID | Name | Combo | Notes |
|----|------|-------|-------|
| R001 | Black Tea | water + tea_leaves | Starting recipe |
| R002 | Honey Milk | milk + honey | Starting recipe |
| R003 | Moonleaf Tea | water + moonleaf | First taught recipe — Fenwick's order |
| R004 | Ember Cocoa | milk + cocoa + ember_chili | Bram's favorite |
| R005 | Cloud Foam | milk + cloud_sugar, foamed | Sela's favorite |
| R006 | Iced Berry Tisane | water + frostberries, iced | Summer unlock |
| R007 | Root & Remedy Broth | water + ginger_root + sage | Winter unlock |
| R008–R012 | *(reserved)* | — | Post-MVP seasonal specials |

### 2.4 Failure states
There are none that punish. A non-recipe combination produces **Murky Brew**: the customer politely declines ("Oh… how inventive."), no coins, tiny reputation nudge downward only if repeated to the same customer twice in a day, cat sniffs it and walks away. Pour it out, try again. No inventory is consumed on failure beyond the ingredients used.

### 2.5 Ingredient shelf
| Ingredient | Buy price | Restock source |
|-----------|-----------|----------------|
| Tea leaves | 2 ¤ | Weekly delivery (auto) |
| Honey | 3 ¤ | Weekly delivery (auto) |
| Moonleaf | 6 ¤ | Sela's cart (from day 2) |
| Cocoa | 4 ¤ | Weekly delivery (auto) |
| Ember chili | 5 ¤ | Bram's gift after his first scene |
| Cloud sugar | 7 ¤ | Sela's cart |
| Frostberries | 5 ¤ | Summer only |
| Ginger root | 3 ¤ | Winter only |

Starting stock: 10× tea leaves, 6× honey, 4× moonleaf. Shelf capacity starts at **6 slots** (upgradeable to 12).

## 3. Customers & Patience

### 3.1 Customer model
Each arrival carries: `character_id`, `order` (recipe id), `patience`, `chat_topic` (optional).

### 3.2 Patience — soft by design
- Starts 100, drains ~0.8/sec while waiting (≈ 2 minutes of patience).
- **Never displays as an alarm.** UI shows a candle icon that slowly shortens; at low patience it flickers, but stays calm in color.
- At zero: the customer says a kind goodbye ("I'll catch you tomorrow!") and leaves. **No penalty.** They may return later the same day.
- **Relaxed Mode (default ON):** patience drains at half rate. Turning it OFF is optional and buried in settings, not promoted.

### 3.3 Daily flow (MVP pacing)
| Days | Arrivals/day | Mix |
|------|-------------|-----|
| 1–2 | 4–5 | Tutorial-weighted: Marigold's letter, Fenwick, Bram |
| 3–6 | 5–6 | All six regulars cycling, first repeat orders |
| 7–13 | 6–8 | Arc beats trigger, occasional travelers (generic sprites) fill gaps |
| 14+ | 6–9 | Sandbox; arcs complete; seasons rotate décor |

## 4. Economy

Single currency: **coins (¤)**. Sources and sinks must stay roughly balanced so money never becomes the goal (P3).

### 4.1 Money flow (starting values)
- **Drink price:** base 5 ¤ + 1 ¤ per extra ingredient. (Black Tea 6 ¤ · Ember Cocoa 7 ¤.)
- **Daily costs:** none. Rent is paid off-screen by Aunt Marigold's legacy fund — this is a deliberate cozy choice; rent anxiety is not cozy.
- **Tips:** +1 ¤ if you chat with the customer before serving.
- **Perfect serve bonus:** +2 ¤ if it's the customer's favorite drink.

### 4.2 Upgrade track (curated slots, no free placement)
| Upgrade | Cost | Effect |
|---------|------|--------|
| Second kettle | 60 ¤ | Two drinks brewing at once |
| Window bench | 45 ¤ | Cat bed slot + +1 patience for everyone (they linger happily) |
| Bigger shelf | 40 ¤ | +3 ingredient slots |
| Coffee machine | 80 ¤ | Unlocks coffee bases (post-MVP menu expansion) |
| Record player | 70 ¤ | New music layer + ambient tracks toggle |
| Hearth expansion | 90 ¤ | Visual glow-up of the room + faster brew animation |

Intended pace: one upgrade every ~2 days early on, slowing to one per week. Upgrades should always feel like treats, never chores.

## 5. Progression — Three Dials

Progress is deliberately split so different player motivations each have a dial (P3).

| Dial | Grows by | Unlocks |
|------|----------|---------|
| **Reputation stars** (0–5) | Serving correct drinks; consistent daily opening | Ingredients, methods (iced/foamed), second kettle, more arrivals/day |
| **Hearts** (per character, 0–5) | Correct favorite serves, chats, arc scene choices | Personal scenes, gifts (recipes, décor, ingredients), endings |
| **Coins** | Drink sales + tips + perfect bonuses | Comfort upgrades only |

Star thresholds: ★1 at 15 total serves · ★2 at 40 · ★3 at 75 · ★4 at 120 · ★5 at 180. Roughly one star per 3–4 days of active play.

Heart gains are capped at +1 heart per character per day, so bonding can't be grinded in one sitting — arcs breathe across days by design.

## 6. Journal

One key/tabbed screen, four tabs:

1. **Recipes** — found recipes (brewable), hinted ones (riddle cards), plus a "close guesses" log of near-miss experiments.
2. **Regulars** — portrait, likes/dislikes (written down automatically after you learn them), current hearts, arc progress marker.
3. **Town** — map sketch of Hollowbrook Crossing, unlocked lore scraps, moon-phase widget (post-MVP).
4. **Letters** — archive of mail and notice-board notes.

The journal auto-fills; nothing needs manual note-taking. It exists so experimentation feels safe — you can't lose a discovered fact.

## 7. Save Model

Browser-first means saves must be defensive.

### 7.1 Primary save

- Browser `localStorage` under a versioned key (`moonleaf_save_v1`).
- Stored as plaintext JSON by design: players own their local save, and dev-tools inspection must stay easy during development. Encryption applies **only to the export string** (7.2).
- **Autosave points:** evening recap only (single atomic write). Mid-service quitting loses at most one service — acceptable, and stated on the title screen footer.
- **Schema:** `{version, day, coins, stars, inventory{}, upgrades[], flags{discovered_recipes[], learned_prefs[], seen_scenes[]}, settings{relaxed_mode, reduced_motion, master_vol}}`.
- **Migration rule:** on load, if `version < current`, run migration functions oldest-first. Never hot-patch old keys silently.

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
- **Key:** single app key compiled into the bundle (`SAVE_KEY` constant). A 1-byte **key id** is embedded in the code format so keys can rotate later without orphaning old exports.
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

## 9. Systems Changelog

| Date | Change | Reason |
|------|--------|--------|
| 2026-08-25 | Initial values set | Baseline for playtest build M1 |
