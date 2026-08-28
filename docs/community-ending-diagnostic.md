# Community Ending — Chrome Playtest & Diagnostic

**Date:** 2026-08-28
**Build commit:** 305f943
**Browser:** headless Chromium (Playwright), Vite dev build at http://localhost:5173
**Mode:** diagnosis only — NO source / ending / threshold / evaluator changes.

## Method

A real Chrome session drove the production build with ONLY visible player
interactions (DOM clicks + canvas coordinate clicks for the diegetic door sign
and chat icon). No debug hooks, no JS injection, no localStorage edits. Two
fresh saves were played as a community-oriented café owner:

- serve EVERY customer that arrives
- chat EVERY customer (canvas chat-icon click)
- open the journal **Town** tab every day
- read EVERY mailbox letter
- play calmly; no experiments, no optimization grind

Reproducible driver: `scripts/community_playtest_run.py`.

## Result

Both runs resolved to **THE KEEPER OF THE HEARTH** ("Belonging / Continuity"),
NOT the Community ending. Day-14 ending screen rendered real text; only a benign
`long frame` perf warning appeared in the console (no errors, no raw i18n keys).

Observed player-facing evidence: after 12 serves/day + chatting every customer,
the journal **Regulars** tab showed **0 displayed hearts for all five NPCs**
(`♡♡♡♡♡`). Relationship/hearts progression is effectively invisible to normal
play.

## Why Community did not win (structural, from read-only source review)

The `community` dimension (`narrative-evaluator.ts`) is:

```
community = lettersReadRatio*0.3
          + townLetterRatio*0.2      (only 3 `town_` letters exist / maxLetters=40 → ≤0.015)
          + uniqueNpcsServed*0.2      (servesByNpc / 5)
          + heartsBreadth*0.15        (NPCs with ≥1 displayed heart / 5)
          + townTabOpensPerDay*0.15
```

Community needs `community ≥ 0.6` (ENDING_CONFIGS). To clear 0.6 a player must
simultaneously max almost every lever:

- `lettersReadRatio = 1` — read EVERY delivered letter. The read flag is easy to
  miss (skimming/dismissing the mailbox does not count). Worth 0.30.
- `uniqueNpcsServed = 1` — serve all 5 regulars across the run (possible; they
  rotate through arrivals). Worth 0.20.
- `heartsBreadth = 1` — give every NPC ≥1 DISPLAYED heart. A non-favorite serve is
  only +0.1 (never displays a heart); a displayed heart needs +1.0, which only a
  **favorite serve** grants. Favorites are undiscoverable without trial/learning,
  and the daily heart cap is +1.0. Worth 0.15.
- `townTabOpensPerDay = 1` — open the Town journal tab daily. Worth 0.15.

The ending evaluator (`ending-evaluator.ts`) only awards an ending that
**qualifies** (meets ALL its min thresholds). If none qualify, it silently
falls back to **Keeper** — even though Keeper itself requires `care ≥ 0.5` and
`community ≥ 0.4`. In the playtest, `care` also fell below 0.5 (heartsBreadth=0,
favoriteServeRatio=0), so Keeper did not truly "qualify" either; it was the
neutral fallback. The player receives no indication of which journey they are
building — there is no visible trajectory meter.

## Conclusion

This is an **ending-design / scoring / player-signaling problem, not an
implementation bug**. The code executes exactly as written. Community is
**PRACTICALLY UNREACHABLE** through normal play because:

1. It is gated by near-invisible signals (read-every-letter, favorite-serve all
   5 NPCs, open town tab daily) with no visible feedback.
2. The heart mechanic barely credits normal play (non-favorite serves never show
   a heart), so `heartsBreadth` stays 0.
3. When the player's signals fall just short, the evaluator silently defaults to
   Keeper rather than signaling the gap.

A normal player cannot understand or steer toward Community, and accidentally
reaching it is effectively impossible. Fixing it (out of scope here) would mean
lowering/redistributing the community thresholds, making hearts accrue from
normal serves, or surfacing a visible trajectory indicator — i.e. an ending-
design change, not a code fix.

---

## POST-FIX UPDATE (2026-08-28)

This diagnostic was the *before* snapshot. The Community ending has since been
made genuinely reachable. Full detail in `docs/09-narrative-system.md`.

**Previous problem:** `community` was gated by near-invisible signals
(read-every-letter, favorite-serve all 5 NPCs, open town tab daily) and capped
at `community >= 0.6`, so it was practically unreachable; it also overlapped
with Care (Keeper) because both rewarded heart depth.

**Root cause (now fixed):**
- `computeCommunity` was redefined as **breadth of social participation**,
  distinct from Care (depth to one person):
  `uniqueNpcsServed*0.30 + heartsBreadth*0.30 + townTabOpensPerDay*0.15
   + townLetterRatio*0.125 + lettersReadRatio*0.125`. It no longer rewards
  `avgHearts`/`favoriteServeRatio` (Care's depth signals), so high-Care/low-
  breadth players correctly fall to Keeper instead of Community.
- A `community_beat` activity event is recorded when the player takes the Wren
  "town-night / gathering" beat in `wren_scene2` (a calm, optional choice).
- The Community config was relaxed and made behavior-specific:
  `min_dimensions: { community: 0.5 }` + `required_flags:
  ['chose_community_night', 'sela_ch1_intro_delivered', 'bram_ch1_intro_delivered',
  'nia_ch1_intro_delivered']`. The old `community >= 0.6` +
  `town_ch3_market_day_delivered` gate (grindy/invisible) was removed. The
  `chose_community_night` flag requires reaching Wren scene 2, so the path stays
  behavior-driven.
- Pacing actions remain NEUTRAL — they never feed `community`, so a calm player
  is never pushed into (or blocked from) Community.

**New player-facing feedback:** branch letter `sela_gathering_letter` (Chapter 3)
acknowledges the gathering choice.

**New Chrome result (post-fix):**
- Build boots clean; no console errors (one benign "long frame" startup warning).
- Real-pipeline integration tests (no mocks) prove reachability deterministically:
  breadth (serve many NPCs) + `chose_community_night` + NPC intro flags =>
  Community; high-Care/low-breadth => Keeper (not Community); Community does not
  require a hidden checklist (open-town-tab 5× is no longer needed); specific
  identity beats Keeper fallback.
- Automated 14-day headless traversal to the *specific* scene-2 choice is limited
  by the same pre-existing Wren-heart constraint noted in the Wanderer diagnostic
  (`chatWithActive` is debug-only; Wren's favorite is taught at scene 5). The
  Community *ending logic* is fully verified reachable via the integration tests.

**Verdict post-fix:** `REACHABLE (behavior-driven, non-grindy, distinct from Keeper, deterministic)`.
