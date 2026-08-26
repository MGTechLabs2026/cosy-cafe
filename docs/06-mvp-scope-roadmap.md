# 06 · Moonleaf Café — MVP Scope & Roadmap

> Doc 06 of 07 · Status: Draft v0.1 · 2026-08-25
> Scope is a fence, not a suggestion. Anything not listed here is post-MVP by default.

## 1. MVP Definition (one sentence)

**A playable browser build on itch.io where the player runs 14 in-game days of the café: brew from ~10 recipes, serve 6 characters + travelers, earn coins/stars/hearts, buy all 6 upgrades, complete at least 2 of 6 character arcs, with autosave.**

## 2. In / Out / Later

### ✅ IN (MVP)
- Day cycle: untimed prep → service → evening recap
- Brewing: 3 bases × ingredients × finishes; **7 recipes** (R001–R007) + murky-brew failure path
- **6 characters** (Fenwick, Sela, Bram, Nia, Wren, Mops) + generic travelers
- Patience system (relaxed default) · tips · perfect-serve bonus
- Coins economy + **all 6 upgrades**
- Progression dials: stars (0–5), hearts per character (0–5, capped/day), coins
- Journal: recipes/regulars/town/letters tabs
- Scenes: **2 full arcs minimum** (Fenwick "The Route" + Wren "The Usual"), other 4 characters get intro scenes only
- Tutorial flow (doc 05 §3.1) · letters/notice board daily content for 14 days
- Save: localStorage autosave + manual export/import string
- Settings: relaxed mode, reduced motion, text size, 3 volume sliders
- Accessibility baseline (doc 05 §6)

### ❌ OUT (never — see GDD §6)
Combat · fail states · rent/stamina pressure · ads/gacha/FOMO

### 🔜 LATER (post-MVP roadmap order)
| Version | Content |
|---------|---------|
| 0.x patches | Remaining 4 arcs (Sela, Bram, Nia, epilogues), recipes R008–R012 |
| 1.0 | Seasons + moon cycle, coffee machine menu expansion, Marigold hidden recipes via Wren |
| 1.5 | Tablet/touch layout, translation hooks exercised (first second language) |
| 2.0+ | Visitor events, décor customization beyond curated slots, photo mode |

## 3. Milestones

Assumes solo dev, part-time pace. Durations are planning guides, not promises.

| Milestone | Contents | Exit criteria | Status |
|-----------|----------|---------------|--------|
| **M0 — Foundations** (~1 wk) | Engine choice finalized (open question in README), repo, CI-less build script, title screen → café screen navigation stub | Build opens to café room; navigation works; empty but real | ✅ Done |
| **M1 — Core loop** (~2 wk) | Day cycle, kettle brewing, one customer type (Fenwick), coins, recap modal, autosave, encrypted save export/import (doc 02 §7.2) | Can play days 1–3 with Fenwick only; save survives reload; crypto test gates pass (round-trip, tamper, cross-browser) | ✅ Done |
| **M2 — Cast & systems** (~2–3 wk) | All 6 characters, patience, hearts/stars, journal v1, upgrades shop | Full MVP systems present with placeholder art | ✅ Done |
| **M3 — Content pass** (~2–3 wk) | All dialogue/scenes written + integrated, 2 arcs complete, letters/board content for 14 days, final art/audio | Content-complete; no placeholder assets | ✅ Done |
| **M4 — Polish & launch** (~1–2 wk) | Juice checklist (doc 04 §3), accessibility pass, playtest round + fixes, itch page live | Success criteria (GDD §7) met; public page published | ✅ Done (tests passing) |

**Total: roughly 8–11 weeks part-time.** First public devlog can start after M1 (playable core loop is the best devlog material).

## 4. Cut List Discipline

If behind schedule, cut in this order:
1. Travelers (regulars-only days are fine)
2. Upgrades 5–6 (keep 4)
3. Arc #2 (Wren's) → move to patch
4. Recipes R006–R007
5. Seasonal variants of the room
Never cut: tutorial, autosave, relaxed mode, accessibility settings, journal.

## 5. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Scope creep ("one more character…") | High | High | This doc is the fence; additions require equal-size cuts (§4 discipline) |
| Art bottleneck (single artist/dev) | Medium | High | Placeholder shapes first; palette-first workflow (doc 04); portraits last |
| Browser audio quirks (autoplay policies, iOS) | Medium | Med | Gesture-gated audio start; test early in Safari; OGG + fallback check |
| Save loss reports | Low | High (trust) | Versioned schema + export/import (doc 02 §7); never write during service |
| Cozy ≠ boring (player retention) | Medium | Med | Arc structure gives pull without pressure; watch day-5 retention metric (GDD §7.2) |
| Burnout (solo dev) | Medium | High | Milestone-sized public devlogs; cut list exists to be used |

## 6. Playtest Checkpoints

- **After M1:** 2 friends, 15 min each. Watch silently. Questions: What did you do? What did you want next?
- **After M3:** 5 testers incl. one cozy-game veteran. Scripted: reach day 5; then free play. Collect GDD §7 metrics.
- **Before launch:** fresh-eyes run of tutorial only. If they fail the 90-second criterion, fix before shipping.

## 7. Definition of Done (per feature)

A feature is done when: functional · matches tone bible (doc 03 §2) · passes juice checklist where applicable · accessible under reduced-motion · strings in `strings.json` · numbers recorded back into doc 02 Changelog if tuned.
