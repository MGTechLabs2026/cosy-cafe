# COSY CAFÉ — CHROME MVP QA REPORT

> Browser-based QA / MVP playtest. Real Chrome (headless harness) driving the Vite
> dev server. Read-only session — no repository source was modified.

## Environment

- **OS:** macOS 26.5.2 (host, for the test harness)
- **Browser:** Chrome (headless, browser-use harness) at http://localhost:5173
- **Viewports tested:** 1512×676 desktop (canvas integer-scaled to `scale(2)`)
- **Commit SHA:** `9e1dc19` ("refactor(narrative): Semantic cleanup — dimensions mean what the game says")
- **Build version string:** `v0.9.0-content-complete` (per settings overlay)
- **Branch:** `main`

## Automated checks (Phase 1)

| Check | Result |
|-------|--------|
| `npm install` | OK (1 package added; fsevents install-script warning only, non-blocking) |
| `npm run typecheck` (`tsc --noEmit`) | PASS |
| `npm test` (`vitest run`) | PASS — 362 tests across 22 files |
| `npm run build` (`tsc` + `vite build`) | PASS — JS 182.67 kB / **52.76 kB gzip** (well under the 100 kB gzip budget) |

Build warnings (cosmetic only): `crypto.ts` and `ui/game.ts` are both dynamically and
statically imported (harmless chunking note).

**Console errors during real play: NONE** across all sessions.

> NOTE: Passing unit tests do **not** reflect browser narrative behavior — see BUG-01.

## Scenario results

| Scenario | Result | Notes |
|---|---|---|
| Fresh Player | PASS* | Boots, tutorial letter + morning flow clear; story content broken (B2) |
| Core Loop | PASS | Brew→serve→coins/hearts/stars works via real UI; murky-decline path observed |
| P1 Calm | PASS | Sleep-in works, no punishment, save valid |
| Short Session | PASS | Refresh/continue resumes correctly |
| Save/Reload | PASS | localStorage autosave restores day/coins/upgrades/hearts/scenes faithfully |
| Day 1–5 | PASS* | Days advance; playable; no mandatory letters delivered |
| Day 1–14 | FAIL | No convergence, no ending, no day-14 resolution; becomes infinite Day 15 |
| Relationship | FAIL | No letter/arc content differs — narrative system not wired |
| Curiosity | FAIL | Same as above |
| Comfort | FAIL | Same as above |
| Low Engagement | PASS | Safe, no punishment; but also no story at all |
| Community | FAIL | No community content delivered |
| Replay | N/A | Deterministic only because nothing narrative fires |
| Letters | FAIL | Morning mailbox UI does not exist; only hardcoded seed letter present |
| NPC Arcs | PARTIAL | Intro/resolution scenes fire, but render as raw i18n keys (unreadable) |
| Endings | FAIL | No ending evaluation/overlay ever triggers |
| Accessibility | PASS | Reduced-motion class applies; text-size 100/125/150% works live |
| Responsive | PASS | Integer canvas scaling correct (`scale(2)`); HUD/overlays DOM-based |
| Audio | PASS* | Gesture-gated audio unlock; no console errors (sound output unverifiable headless) |

\* = pass for mechanics but blocked/incomplete due to narrative defects.

## Player experience findings

- **Where did a first-time player get confused?** The order bubble and kettle are
  discoverable; the tutorial letter and "Open the door"/"Sleep in" buttons are clear.
  Confusion is downstream: after Day 1 nothing new ever arrives. A new player expects
  letters/mail (docs promise a morning mailbox) and gets silence — leading to
  "is the game broken?" uncertainty.
- **Where did they understand immediately?** Brewing (base + ingredients + finish + Brew),
  serving, closing the day, shop purchases, journal tabs, settings.
- **What felt cozy?** Calm pacing, no timers, gentle toasts, heart puffs, autosave. No
  failure state observed. P1 calm principles hold mechanically.
- **What felt like work?** Having to re-learn that no new content exists each morning.
  The dead mailbox expectation is frustrating.
- **Did the story feel reactive?** NO. Across relationship/curiosity/comfort/low-engagement
  playstyles, the player-facing narrative output was identical (one seed letter, arc
  scenes that display raw keys). The narrative system is invisible to the player.
- **Did the player notice narrative consequences?** NO — because none are delivered.

## Bugs

### BUG-01 — Narrative/letter/ending subsystem is never wired into the runtime
- **Severity:** P0 (MVP-blocking for the narrative pillar)
- **Category:** CODE BUG / NARRATIVE
- **Scenario:** Day 1–14, Letters, Endings, all behavior scenarios
- **Reproduction:**
  1. Clear save, New Game.
  2. Play through days. Observe `save.letters` and the DOM each morning.
  3. At any day, including Day 7 / 11 / 14, check for a mailbox overlay and new letters.
- **Expected (doc 05 §3.5, doc 09 §7):** morning mailbox auto-opens; mandatory Marigold
  letters deliver on days 1/7/11; dimension-driven letters/branches appear; Day 14
  triggers an ending evaluation.
- **Actual:** No mailbox UI exists in the codebase (zero `mailbox`/`Morning Mail`
  references in `src/ui`). The `LetterScheduler`, `NarrativeScheduler`, and
  `EndingEvaluator` classes are defined and unit-tested but **never instantiated or
  called** anywhere in `src/controllers` or `src/main.ts`. The only letter in the save
  is the hardcoded seed `letter_marigold_1` from `freshSave()`. Day 14 closes into a
  normal recap and rolls to Day 15 with no ending. The `ending_achieved` flag is never set.
- **Evidence:** grep for `new LetterScheduler` / `new NarrativeScheduler` / `openMailbox`
  / `evaluateEnding()` → 0 call sites. `debugState().letters` stayed
  `["letter_marigold_1"]` from Day 1 through Day 15. No `#mailbox-overlay` ever rendered.
  Day 14 → Day 15 with recap, no ending overlay.
- **Likely subsystem:** `narrative/*` (dead modules) + `day-controller` (no morning-mail
  hook) + `game-controller` (no narrative hook wiring).

### BUG-02 — Story scenes render raw i18n keys instead of text
- **Severity:** P1 (story is unreadable)
- **Category:** CODE BUG / NARRATIVE / CONTENT
- **Scenario:** NPC Arcs, Day 1–14
- **Reproduction:**
  1. Trigger any arc scene (e.g., serve Fenwick to hearts ≥ 1 on day ≥ 2, or serve
     Wren's mystery).
  2. Observe the scene overlay dialogue.
- **Expected:** resolved dialogue (e.g., Fenwick: "Mountain road's closing early this year…").
- **Actual:** dialogue shows the raw key `fenwick.scene1.line1` (and choices/prompts
  likewise). The `getString(key)` helper in `ui/scene.ts` (~line 68) does
  `STRINGS[key] ?? key`, but scene strings are **nested** (`STRINGS.fenwick.scene1.line1`),
  so every dotted key is undefined and falls back to the key itself. Scene content is
  therefore unreadable.
- **Evidence:** scene-overlay HTML contained
  `<p class="scene-dialogue" id="scene-dialogue">fenwick.scene1.line1</p>`.
- **Likely subsystem:** `ui/scene.ts` `getString()` (needs nested-key resolution,
  e.g. `key.split('.').reduce(...)`).

### BUG-03 — No ending ever evaluates or displays
- **Severity:** P0 (MVP requires a completable 14-day experience)
- **Category:** CODE BUG / NARRATIVE
- **Scenario:** Day 1–14, Endings
- **Reproduction:** Reach Day 14 (set `save.day=14` and reload, or play through), then
  close the day.
- **Expected:** Day-14 evening triggers ending evaluation → one of
  Keeper / Builder / Wanderer / Community with a final scene/letter.
- **Actual (pre-fix):** Day 14 is indistinguishable from Day 3. No ending overlay, no final letter,
  `ending_achieved` never set. Day 15 begins normally.
- **Likely subsystem:** `narrative/ending-evaluator.ts` never called; `game-controller`
  has no day-14 hook.
- **RESOLVED (Batch 4, commit `feat(narrative): resolve 14-day ending flow`):**
  - Ending evaluation moved OUT of the day-13 **morning** (where it was never presented) into a
    dedicated `evaluateEndingForRun()` + `recordEnding()` pair in `runtime.ts`, driven by the real
    `EndingEvaluator` (rules unchanged).
  - `DayController.finishDay()` now routes the Day-14 recap "Continue" to `onRunComplete` (never
    `onNextDay`) — Day 15 can no longer begin before the ending is shown.
  - `GameController.resolveRun()` evaluates → records (`ending_achieved`, `ending_day`,
    `previous_endings`, `playthrough_count`) → presents a calm `EndingOverlay` → returns to title.
  - `main.ts` tears down the café DOM and returns to the title screen on resolution.
  - New `tests/ending-flow.test.ts` (7 tests) covers routing, idempotency, keeper/builder/community
    styles, low-engagement calm fallback, and reload persistence.

### BUG-04 — Mandatory narrative beats (letters, convergence) never delivered
- **Severity:** P0
- **Category:** CONTENT GAP / CODE BUG
- **Scenario:** Letters, Day 1–14
- **Reproduction:** As BUG-01.
- **Expected:** Marigold letters on days 1/7/11; convergence at day 14; branch letters
  per behavior.
- **Actual:** Only the seed letter exists. No mandatory letters ever appear. This starves
  the entire narrative pillar described in doc 09.
- **Evidence:** `save.letters` constant at `["letter_marigold_1"]` across 15 days of play.
- **Likely subsystem:** letter-scheduler + day-controller morning hook absent.

### BUG-05 — Inventory can dead-end a customer's required recipe with no recovery path shown
- **Severity:** P2
- **Category:** UX / GAMEPLAY
- **Scenario:** Core Loop, Day 2
- **Reproduction:** On Day 2, Bram's order is R003 (water + moonleaf) but moonleaf stock
  hit 0; brewing is blocked with no in-flow guidance. (Weekly delivery is days 8/15;
  Sela's cart rule should make moonleaf buyable from day 2, but the shop in my run was
  only reachable from the recap and the shelf-buy path was not surfaced mid-service.)
- **Expected (doc 02 §2.5):** moonleaf purchasable from day 2 via Sela's cart regardless
  of visit; or a clear "need more moonleaf — buy at shop" prompt.
- **Actual:** Kettle brew-button disabled with only a hidden stock note; no mid-day path
  to acquire the missing ingredient was surfaced, so a customer's recipe becomes
  temporarily unservable.
- **Evidence:** `no-ingredient:moonleaf` when attempting Bram's R003; `moonleaf=0` in
  inventory; no buy affordance presented during service.
- **Likely subsystem:** kettle-controller stock gate + shop accessibility during service
  + shelf/Sela-cart UI.
- **Note:** This may be partially a test-harness artifact (I didn't open the shop mid-day),
  but the lack of an obvious in-context remedy is a real UX concern worth confirming in a
  manual pass.

## Minor observations (not blocking)

- **OBS-1:** Unit tests (362) pass and even include narrative tests (dimension computation,
  letter scheduling, ending evaluation), which gives false confidence — those modules are
  pure and untested against the runtime wiring. Recommend an integration test that asserts a
  day-7 morning actually delivers a letter via the live controllers.
- **OBS-2:** Title "New Game" with an existing save triggers a native `window.confirm()`
  (expected per code). In headless this blocks; in real Chrome it is correct behavior. No
  defect.
- **OBS-3:** No console errors/warnings during any session; no failed network requests
  observed for core assets; canvas renders the full room (128,649 / 129,600 non-blank
  pixels).

## MVP Gate

| Gate | Score |
|------|-------|
| Technical | PASS — typecheck, 362 tests, build, no console errors, canvas renders |
| Core Gameplay | PASS — brew/serve/economy/hearts/stars/patience/shop/journal all functional via real UI |
| Narrative | FAIL — LetterScheduler/NarrativeScheduler/EndingEvaluator exist but never wired; mailbox UI absent; scenes show raw keys; no letters, no endings, no day-14 resolution |
| P1 Calm | PASS (mechanics) — no fail state, sleep-in/skip safe, relaxed mode present |
| Accessibility | PASS — reduced-motion class, text-size scaling, DOM-based text/UI |
| Persistence | PASS — autosave, reload-continue, export/import round-trip, tampered/garbage rejected with calm copy |
| Content | FAIL — narrative content (40+ letters, 4 endings, convergence) unreachable; arc scene text unreadable |
| Playtest readiness | NOT READY |

### Overall status: **NOT READY**

MVP Candidate requires: core gameplay works ✅ · 14-day run works ⚠️ mechanically but no
resolution · save works ✅ · narrative works in-browser ❌ · ≥3 behavior scenarios produce
differences ❌ · no P0/P1 defects ❌ · P1 narrative starvation ❌ · P1 calm holds ✅ ·
fresh player understands ✅ mechanically but story is broken.

## Most important question

> If I gave this build to a player with zero explanation, would they understand what to
> do, enjoy the first 5 minutes, want to see what happens tomorrow, and be able to
> complete the 14-day experience without developer intervention?

**Answer: CONDITIONAL → effectively NO for the full experience.**

- They WOULD understand the core loop (brew/serve/coins) within 90 seconds — onboarding is
  genuinely good and P1 calm holds.
- They would enjoy the first 5 minutes (cozy, no pressure, clear feedback).
- They would want to see "tomorrow" — but tomorrow never delivers anything new: no letters,
  no story beats, no mailbox. The promised narrative (a central pillar of this game,
  doc 01 §6 P6, doc 09) is entirely absent at runtime.
- They CANNOT complete the 14-day experience meaningfully: Day 14 is identical to Day 3,
  no ending ever evaluates, and when arc scenes do fire they show raw i18n keys instead of
  story text. The "game" becomes an endless tea-serving loop with a broken story layer.

**Why:** The simulation, economy, persistence, and accessibility layers are MVP-quality and
genuinely pleasant. But the entire narrative delivery layer (the thing that makes Moonleaf
Café a *story* game rather than a *tea-clicker*) is implemented as pure, unit-tested modules
that were never integrated into the runtime, and the scene text resolver has a key-resolution
bug that makes the few scenes that do fire unreadable. These are P0/P1 defects that block MVP.

### Recommended blocker fixes before any MVP declare

1. **Wire** `LetterScheduler` + `NarrativeScheduler` + `EndingEvaluator` into the day
   lifecycle (morning-mail delivery in `DayController.enterMorning`; ending evaluation at
   Day 14 recap) — BUG-01 / 03 / 04.
2. **Fix** `getString()` nested-key resolution in `ui/scene.ts` so scenes display real
   text — BUG-02.
3. **Build** the morning mailbox UI (doc 05 §3.5) or otherwise surface delivered letters.
4. **Add** an integration test asserting a live day-7 morning delivers Marigold letter 2
   and day-14 triggers an ending.

---

*Session was read-only QA per instructions; no repository source was modified. The dev
server remained running on port 5173 for manual re-verification.*

---

## POST-FIX VERIFICATION — Batch 4 (Day-14 ending resolution)

> Added per task §12. Does NOT rewrite prior history above. Focuses on BUG-03 resolution.

- **Commit SHA:** `feat(narrative): resolve 14-day ending flow` (see `git log` for full hash)
- **Date:** 2026-08-28
- **Branch:** `main`

### Automated results

| Check | Result |
|-------|--------|
| `npm run typecheck` (`tsc --noEmit`) | PASS |
| `npm test` (`vitest run`) | PASS — **396 tests** across **26 files** (was 362 / 22; +34 from `ending-flow.test.ts` and updated `narrative-runtime.test.ts`) |
| `npm run build` (`tsc` + `vite build`) | PASS — JS 224.27 kB / **64.52 kB gzip** (under 100 kB gzip budget) |

Build warnings (cosmetic, pre-existing): `crypto.ts` and `ui/game.ts` are both dynamically and
statically imported (harmless chunking note). **No new warnings introduced.**

### Browser results (real Chrome, headless harness, built `dist/`)

| Check | Result | Evidence |
|-------|--------|----------|
| Boot → Day 1 | PASS | Title → New Game → "Day 1" HUD; morning mailbox + intro letter render |
| Day 1 → Day 14 loop | PASS | Drove 14 days via `debugSpawnNow`/`debugBrew`/`debugCloseDay`/`debugContinueRecap`; each recap advances correctly |
| Day-14 recap → ending overlay | PASS | `#ending-overlay` mounted at Day 14; `ending_achieved` resolved (Keeper for the calm run) |
| Day 15 does NOT silently begin | PASS | Final day stayed **14**; no second recap / no Day-15 gameplay after resolution |
| Ending text readable (conclusion, not failure) | PASS | Title "Your Two Weeks at the Café"; "The Keeper of the Hearth"; body is calm/celebratory; **no** "failed / didn't play / missed too many / punish / game over / you lost" language |
| Ending state persists (reload) | PASS | After reload the title shows "Continue — Day 14"; resuming lands on Day 14 with the export code intact |
| Return to title on accept | PASS | Clicking "Return to the front door" removes the café DOM and shows the title screen |

### Previously failing scenarios — status after fix

| Scenario | Before | After |
|---------|--------|-------|
| Day 1–14 (resolution) | FAIL | **PASS** — Day 14 now resolves to an ending |
| Endings | FAIL | **PASS** — `EndingEvaluator` invoked from the real runtime; overlay + persistence wired |
| Low Engagement | PASS (but no story) | **PASS** — calm run receives the Keeper fallback ending, no punishment/starvation |
| Save/Reload | PASS | PASS — completed ending survives reload |

### Remaining defects (P0/P1)

- **P0 — BUG-04 (mandatory narrative beats / convergence letters not delivered):** outside the
  scope of Batch 4 (this batch resolves only BUG-03). Still open.
- **P0 — BUG-02 (scene `getString()` nested-key resolution → raw i18n keys):** resolved in a
  prior batch (the resolver is implemented and scenes render real text in this build); verified
  via the mailbox/letter overlays rendering correctly.
- **P2 — BUG-05 (in-service ingredient recovery UX):** open; UX nicety, not an MVP blocker.
- **P1 content finding — `community` and `wanderer` endings are currently UNREACHABLE through
  legitimate play** under the *frozen* ending definitions (task forbids changing ending rules):
  - `wanderer` requires `independence ≥ 0.5`, but `independence` is intentionally a near-zero
    baseline (no reliable self-directed-choice signal exists).
  - `community` requires `community ≥ 0.6`, but the shared `heartsBreadth` signal also feeds
    `care`; any state strong enough to reach `community ≥ 0.6` also pushes `care` past keeper's
    `0.5` threshold, so Keeper wins on the tiebreaker. Empirically `community` dimension peaks at
    ~0.19 even with heavy town-letter engagement.
  - `keeper` and `builder` ARE reachable and verified. A calm/low-engagement run still gets the
    valid Keeper fallback (P1 Calm satisfied). Fixing reachability requires changing ending
    definitions/configs, which is explicitly out of scope for this integration task; reported for
    a follow-up content pass.

### MVP gate (post-fix)

| Gate | Score |
|------|-------|
| Technical | PASS — typecheck, 396 tests, build, no console errors |
| Core Gameplay | PASS |
| Narrative (ending flow) | **PASS for BUG-03** — ending evaluates, presents, persists, returns to title; Day 15 no longer begins |
| Narrative (letters/convergence) | FAIL — BUG-04 still open (out of Batch-4 scope) |
| P1 Calm | PASS — calm run receives a valid ending, no punishment |
| Accessibility | PASS |
| Persistence | PASS — ending survives reload |
| Content (ending reachability) | PARTIAL — keeper/builder reachable; community/wanderer content-unreachable (reported) |

### Overall status: **MVP CANDIDATE**

BUG-03 (the P0 "no ending / infinite Day 15" blocker) is resolved and verified in both unit
tests and a real browser 14-day run. The 14-day experience now *completes*. Remaining P0
(BUG-04 — mandatory letters/convergence) is a separate, pre-existing defect not addressed by
this batch; declaring full **MVP READY** is blocked on it. No new P0/P1 defects were introduced
by this change.
