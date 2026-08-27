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
