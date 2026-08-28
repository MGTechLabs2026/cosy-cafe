# Wanderer Ending Diagnostic

> READ-ONLY browser playtest. No source, thresholds, evaluators, or save data
> were modified. The ending definitions and scoring rules are FROZEN for this
> test (per the task brief). The only committed artifacts are this document and
> the reproducible driver `scripts/wanderer_playtest_run.py`.

## Build

Commit:
  515b9ee760f02c4f3178ec9485f8bbe1d84c8e73
  (dominant commit for the run; `git log --oneline -1` =>
   "test(browser): community-ending Chrome playtest + diagnostic (no source changes)")
Browser:
  Headless Chromium (Playwright 1.x bundled Chromium) driving the real Vite
  dev build at http://localhost:5173/ — visible DOM/canvas clicks only.
Date:
  2026-08-28 (Asia/Manila, +08)

## Run A

Player identity:
  Moderate independent / exploratory cafe owner. Serves every arrival, varies
  the drink (R001/R003 rotation = experimentation flavor), opens the journal
  Recipes tab to "explore discoveries", chats with every customer (friendly but
  not relationship-farming — this matches the proven Community-driver flow that
  reliably advances all 14 days).
Days completed:
  14 (Day 1 -> Day 14; Day-14 recap resolved the run).
Exploration actions:
  Brewed a rotating drink across known recipes each serve; opened the journal
  Recipes tab every day to inspect discoveries; read every morning mailbox.
Discovery actions:
  Recipe rotation + journal inspection (no forced invalid combos).
Independent choices:
  Kept a calm, self-directed cadence; did not optimize coins or farm one NPC.
NPC interactions:
  Served all arrivals; chatted each customer (sparse-heart, non-favorite serves).
Important narrative choices:
  Accepted the tutorial letter; read Aunt Marigold's Day 1 / Day 7 / Day 11
  beats as they arrived (same mandatory beats verified in the BUG-04 + Community
  diagnostics — real text, no raw i18n keys).

Day 1:
  New Game -> tutorial letter dismissed -> opened doors -> served arrivals ->
  mailbox (Marigold welcome) read.
Day 7:
  Mandatory Marigold revelation letter present in mailbox, rendered real text.
Day 11:
  Mandatory Marigold final letter present in mailbox, rendered real text.
Day 14:
  Recap -> Continue -> Ending overlay resolved.

Ending:
  THE KEEPER OF THE HEARTH ("Belonging & Continuity").
  "You came to tend a café and stayed to tend a home. The regulars found their
   rhythm around your counter; the kettle kept its song; Marigold's chair by the
   window stayed warm... The café endures, exactly as it should."

## Run B

Player identity:
  Strongly independent / wandering player. Same serve + recipe-rotation loop,
  but chatted RARELY (every 5th serve -> detachment, not antisocial), and did
  NOT open the journal (no relationship/community signal seeking). Maximized
  "independent" behavior while remaining a believable cafe owner.
Days completed:
  14 (Day 1 -> Day 14; Day-14 recap resolved the run).
Exploration actions:
  Recipe rotation (R001/R003) each serve; no journal/town exploration needed.
Discovery actions:
  None beyond recipe variation.
Independent choices:
  Minimal chat; no journal opens; calm self-directed cadence.
NPC interactions:
  Served all arrivals; chatted only occasionally.
Important narrative choices:
  Same mandatory Day 1 / Day 7 / Day 11 Marigold beats read as they arrived.

Day 1:
  New Game -> tutorial letter -> served arrivals -> mailbox read.
Day 7:
  Marigold revelation letter present, real text.
Day 11:
  Marigold final letter present, real text.
Day 14:
  Recap -> Continue -> Ending overlay resolved.

Ending:
  THE KEEPER OF THE HEARTH (identical title + text to Run A).

## Wanderer Reachability

Verdict:

```
UNREACHABLE
```

Wanderer is not merely hard to discover — it is structurally impossible under
the current (frozen) scoring. `src/narrative/narrative-evaluator.ts`:

```ts
// Lines 116-137 (verbatim comment + code)
// Independence is CURRENTLY UNDER-INSTRUMENTED. The game records no reliable
// signal of a player making a self-directed / unconventional / opt-out choice ...
// Therefore independence is intentionally a near-zero baseline. ...
function computeIndependence(_signals: NarrativeSignals): number {
  return 0;
}
```

And the Wanderer config in `src/narrative/story-definitions.ts` (lines 502-504):

```ts
wanderer: {
  min_dimensions: { independence: 0.5 },
  required_arcs: ['wren_arc_complete'],
  tiebreaker_dimension: 'independence',
}
```

`independence` is ALWAYS 0, so the `min_dimensions` gate `independence >= 0.5`
can NEVER be satisfied by any legitimate browser playthrough. The
`wren_arc_complete` arc is therefore moot — even a player who completes Wren's
mystery still has `independence = 0 < 0.5` and Wanderer remains disqualified.

(Note: this is a harder block than Community. Community is "practically
unreachable" — its signals exist but are hidden/undiscoverable. Wanderer is
"unreachable" — its signal is literally hardcoded to 0, so no behavior, however
strongly independent, can raise it.)

## Evidence

- Source fact: `computeIndependence()` returns `0` unconditionally. Wanderer's
  only qualifying dimension (`independence`) can never reach its 0.5 threshold.
- Browser fact (Run A): a moderate independent player who serves/chats/explores
  and reads all mandatory beats ends at THE KEEPER OF THE HEARTH.
- Browser fact (Run B): a strongly independent player who chats rarely and
  opens no journal still ends at THE KEEPER OF THE HEARTH.
- Browser fact: neither run ever produced a Wanderer overlay, a Wanderer-trajectory
  letter, or any UI text implying the player was on a "wanderer" path.
- The game's other dimensions (care, community, comfort, curiosity) are all
  computed from real signals, but NONE of the four ending `min_dimensions`
  include `curiosity` or `independence` as a qualifying gate except Wanderer's
  (broken) independence gate. A curious/exploring player simply falls through to
  the Keeper fallback (calm, presence-aligned) — which is what both runs show.

## Player Experience

Can a normal player understand the Wanderer path?
  NO. There is no visible trajectory meter, no "wanderer" progress indicator,
  and no in-game text that tells the player what independent/exploratory behavior
  is being measured (because it isn't measured at all — `computeIndependence`
  ignores every signal).

Does the game visibly reinforce Wanderer behavior?
  NO. Curiosity rises from discoveries/experiments, but no ending rewards
  curiosity as a qualifying dimension, and nothing in the UI reflects a
  "wanderer" standing. The only visible "acknowledgement" of exploration is the
  recipe-discovery toast and journal entries — neither feeds Wanderer.

Can a player deliberately pursue Wanderer without knowing hidden scores?
  NO. Since the only Wanderer gate (`independence >= 0.5`) is fed by a constant
  0, no deliberate behavior can move it. The player cannot pursue what does not
  exist as a signal.

Does the ending reflect actual player behavior?
  PARTIALLY. The ending (Keeper) reflects the player's calm/presence behavior
  (serving + being present), which is legitimate. But it does NOT reflect the
  player's intended independent/exploratory identity — that identity has no
  scoring outlet, so it is invisible to the ending system. A player who believes
  they are "becoming a wanderer" receives Keeper instead.

## Competing Ending

Winning ending:
  THE KEEPER OF THE HEARTH (both runs).

Why it won:
  The EndingEvaluator only considers endings whose `min_dimensions` are ALL met.
  Wanderer is disqualified (independence 0 < 0.5). Community is disqualified
  (its gates — read-every-letter, heart-all-5, daily town-tab — were not fully
  met). Builder needs `comfort >= 0.6` (upgrades/shelf), also not met. Keeper
  requires `care >= 0.5` AND `community >= 0.4`, which a present, serving player
  satisfies as the neutral fallback, so it wins.

Was that result consistent with the player's behavior?
  PARTIALLY. The player behaved as a calm, present cafe owner (Keeper-consistent)
  while ALSO intending an independent/exploratory identity (Wanderer-intended).
  The Wanderer intent was simply dropped by the scoring system. So the player
  "genuinely behaved like a Wanderer but received Keeper" — the defining symptom
  of a SCORING/DESIGN problem: the Wanderer path has no instrumented signal.

## Narrative Quality

Day 1:
  PASS — tutorial + Marigold welcome letter render real text, no raw i18n keys.

Day 7:
  PASS — Marigold revelation letter present, real text, no raw i18n keys.

Day 11:
  PASS — Marigold final letter present, real text, no raw i18n keys.

Day 14:
  PASS — recap resolves to a coherent ending overlay (Keeper) with full prose.

Wanderer-reactive content:
  FAIL — there is NO narrative content anywhere that reacts to independence,
  exploration, or a wandering identity. The mandatory Marigold arc is
  relationship/presence-themed and is identical regardless of play style. No
  "wanderer" branch, letter, or scene exists.

## Calm Pillar

No timer:
  PASS — no countdown or time pressure forces play.

No fail state:
  PASS — skipping/relaxing never punishes; Keeper is a valid calm outcome.

No grinding:
  PASS — Wanderer requires no grind (it requires an impossible signal, not
  repetition).

No punishment:
  PASS — independence is explicitly NOT penalized for low chat/sleep-ins
  (per the code comment), so the calm pillar is respected in intent.

Caveat: the calm pillar is satisfied in spirit, but the Wanderer IDEA (freedom /
self-direction) has no implemented outlet, so a player seeking that fantasy gets
silently redirected to Keeper.

## Browser Health

Console errors:
  None.

Console warnings:
  1 benign "[Moonleaf] long frame >50ms" warning at game start (t=0.1s) per run —
  a one-time asset/compile frame, non-blocking, present in every run including
  the BUG-04 and Community diagnostics.

Broken UI:
  None observed. All overlays (mailbox, kettle, journal, recap, ending) rendered
  and dismissed correctly.

Raw i18n keys:
  None — mandatory letters and the ending overlay render localized prose.

Save/reload problems:
  None — fresh save via localStorage.clear() at start; 14-day progression stable;
  no corruption. (Autosave persistence was not the focus of this read-only run.)

## Diagnosis

```
SCORING/DESIGN ISSUE  (specifically: an intentionally stubbed dimension gate)
```

The root cause is in `computeIndependence()` returning a constant `0` (with an
explicit in-code comment stating independence is "intentionally a near-zero
baseline" and "currently under-instrumented"). Because Wanderer's sole qualifying
dimension is `independence >= 0.5`, and no player action can raise independence
above 0, Wanderer can never be selected. This is NOT a runtime bug in the
evaluator logic — the evaluator works correctly given its inputs. It is a
DESIGN/SCORING gap: the Wanderer ending was shipped with its defining signal
disabled.

This is the same family of issue as Community (both unreachable), but one notch
more severe: Community's signals exist (just hidden/undiscoverable), whereas
Wanderer's signal does not exist at all. Fixing Wanderer requires instrumenting a
genuine self-directed-choice signal (e.g., opt-out / decline-obligations events,
travel/leave-cafe choices, or an explicit "wanderer" branch) and feeding it into
`computeIndependence` — which is out of scope for this frozen diagnostic.

## MVP Impact

```
P1 CONTENT ISSUE
```

Wanderer is advertised as one of four endings but is impossible to reach. The
game still completes (Keeper fallback is calm-appropriate), so it does not block
MVP shipment the way a crash would. However, it is a P1 content/design defect
because a shipped, selectable ending that no player can ever obtain is a
credibility and completeness gap for the narrative experience — and it sits
alongside Community (also unreachable) and Keeper/Builder (reachable), meaning
half the ending matrix is currently dead.

Recommended next step (post-diagnostic, NOT performed here): decide whether to
(1) instrument a real independence signal + reopen Wanderer, or (2) temporarily
hide/relabel Wanderer in the UI until its signal is implemented, so players are
not promised a path that does not exist.

---

### Reproduce

```bash
npm run dev                      # serves http://localhost:5173/
python3 scripts/wanderer_playtest_run.py A   # moderate independent play
python3 scripts/wanderer_playtest_run.py B   # strongly independent play
# Result JSON: /tmp/wanderer_result_{A,B}.json
# Ending screenshots: /tmp/wanderer_shots/ending_{A,B}.png
```

Both runs drive ONLY visible interactions: title -> New Game -> tutorial dismiss
-> per-day open-doors / serve (R001/R003 rotation) / occasional chat / journal
explore -> close-day (door-sign canvas click) -> recap Continue -> Day-14
ending. No debug hooks, no JS injection, no localStorage edits.

---

## POST-FIX UPDATE (2026-08-28)

This diagnostic was the *before* snapshot. The Wanderer ending has since been
made genuinely reachable. Summary of the fix (full detail in
`docs/09-narrative-system.md` §Community/Wanderer semantics):

**Previous problem:** `computeIndependence()` returned a hardcoded `0`, so the
`independence >= 0.5` gate could never be met. Wanderer was structurally
impossible.

**Root cause (now fixed):**
- `computeIndependence` now reads a real, behavior-only signal:
  `independentChoiceCount * 0.5` (one deliberate self-directed choice = 0.5).
- A `self_directed_choice` activity event is recorded when the player takes the
  Wren "old road" beat in `wren_scene3` (a calm, optional, non-punitive choice).
- The Wanderer config was relaxed to be **non-grindy**: `min_dimensions:
  { independence: 0.25 }` + `required_flags: ['chose_old_road']`. The grindy
  `required_arcs: ['wren_arc_complete']` (set only at Wren scene 5, ~4 hearts)
  was removed — `chose_old_road` already requires reaching Wren scene 3, so the
  path stays behavior-driven without forcing a relationship grind.
- Pacing actions (skipped days, early close, low chat, short sessions, relaxed
  mode) remain NEUTRAL — they never feed `independence`, so a calm player never
  drifts into Wanderer.

**New player-facing feedback:** branch letters `wren_old_road_letter` (Chapter 3)
and `wren_path_letter` (Chapter 4) acknowledge the self-directed choice, so the
player can feel the story noticing their direction.

**New Chrome result (post-fix):**
- Build boots clean; no console errors (one benign "long frame" startup warning).
- Real-pipeline integration tests (no mocks) prove reachability deterministically:
  one deliberate `chose_old_road` beat + `independence >= 0.25` => Wanderer;
  skipped/early/low-chat do NOT qualify; specific identity beats Keeper fallback.
- Automated 14-day headless traversal to the *specific* scene-3 choice is limited
  by a **pre-existing** constraint (see `docs/09-narrative-system.md`):
  `chatWithActive()` — the only +0.25 chat-heart source — is reachable only via a
  debug hook, not normal UI, and Wren's favorite (R007) is taught only at scene 5,
  making his heart accrual slow. This is out of scope for the Community/Wanderer
  path tuning but is noted as a remaining issue. The Wanderer *ending logic* is
  fully verified reachable via the integration tests.

**Verdict post-fix:** `REACHABLE (behavior-driven, non-grindy, deterministic)`.
