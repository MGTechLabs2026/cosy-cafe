# Moonleaf Café — Design Docs

**Working title:** *Moonleaf Café* — "Serve warm cups to cold travelers."
A simple, cozy café-management game set in a gentle fantasy world. Built for itch.io, played in the browser.

There is no way to lose. There is only tomorrow's opening.

---

## Document Map

| # | Document | What it covers | Status |
|---|----------|----------------|--------|
| 01 | [Core GDD](01-gdd-core.md) | High concept, audience, design pillars, core loop, MVP success criteria | Draft v0.1 |
| 02 | [Systems Design](02-systems-design.md) | Day cycle, brewing, customers, economy, progression, save model | Draft v0.1 |
| 03 | [World & Characters](03-world-characters.md) | Setting, tone guide, full cast with arcs and rewards | Draft v0.1 |
| 04 | [Art & Audio Direction](04-art-audio-direction.md) | Pixel-art spec, palette, animation budget, music/SFX plan | Draft v0.1 |
| 05 | [UI & UX](05-ui-ux.md) | Screens, HUD, flows, tutorial, accessibility, error states | Draft v0.1 |
| 06 | [MVP Scope & Roadmap](06-mvp-scope-roadmap.md) | MVP feature freeze, milestones, risks, playtest checkpoints | Draft v0.1 |
| 07 | [itch.io Release Plan](07-itchio-release-plan.md) | Page copy, asset checklist, tags, devlog strategy, launch checklist | Draft v0.1 |
| 08 | [Tech Stack & Architecture](08-tech-stack.md) | Engine-less TS/Vite/Canvas2D stack, budgets, CI guardrails, escape hatch | Draft v0.1 |

Read 01 first; everything else hangs off its pillars. 06 defines the hard boundary of what ships first; 08 defines what it's built with.

## Decision Log

| Date | Decision | Status |
|------|----------|--------|
| 2026-08-25 | Target platform: browser-first (HTML5) on itch.io; downloadable builds later | Decided |
| 2026-08-25 | Free / donationware for the MVP; revisit pricing at 1.0 | Decided |
| 2026-08-25 | English only for MVP; all strings kept in one data file for later translation | Decided |
| 2026-08-25 | **Stack:** engine-less TypeScript + Vite + Canvas2D (own renderer) + DOM text/UI + Howler. Priorities: size + performance; PixiJS kept as sanctioned escape hatch. Resolves the open engine question; supersedes the Godot-default recommendation. See doc 08. | Decided |
| 2026-08-25 | Save export/import uses AES-GCM encrypted codes (`MLC1` wire format, key id for rotation). Local localStorage saves stay plaintext by design. Tamper-resistance yes, DRM no. | Decided |
| 2026-08-25 | Art made in-house, single cast of 6 for MVP to control scope | Decided |
| — | Working-title trademark/name availability check before public devlogs | TODO |

## Ground Rules for Anyone Editing These Docs

1. Pillars (doc 01 §5) win arguments. If a feature fights a pillar, the feature changes or dies.
2. Every number in doc 02 is a starting value, not gospel — but change it in the doc, not just in code.
3. Nothing gets added to scope without removing something of equal size (see doc 06 cut list).
