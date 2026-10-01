# Build Sessions — Progress Tracker

The complete plan lives in the [design document](./docs/Goblin_Arrows_Game_Design_and_Build_Plan.docx), Chapter 10. Each session ships a runnable artifact and is accepted against binary criteria — acceptance is checked as a list, not a feeling.

| # | Session | Playable Outcome | Status |
|---|---------|------------------|--------|
| 1 | Foundations & character sheets | App boots to a title screen; four full hero sheets browsable | ✅ Complete |
| 2 | Combat engine | Complete tactical fights in a debug arena against goblins and wolves | ⬜ Planned |
| 3 | Exploration engine & Acts I–II | Playable from title screen to the hideout door with branching checks | ⬜ Planned |
| 4 | Hideout part A | Areas H1–H4 and H8 playable: stealth, wolves, the flood, alert states | ⬜ Planned |
| 5 | Hideout part B & endings | The full game is completable, all endings reachable | ⬜ Planned |
| 6 | Polish, balance & ship | Release candidate deployed on the preview link | ⬜ Planned |

## Session 1 — Foundations & Character Sheets

**Scope** (GDD §10.1): Next.js scaffold with theme tokens; type definitions for Actor, Party, WorldState, Flags, BattleState and the versioned save schema; seeded RNG (mulberry32) with a draw-log API; the four hero sheets from GDD Chapter 3 as typed data; title screen and character-sheet overlay; hero vector tokens and the dice icon set.

**Acceptance criteria** (all verified — browser E2E, 28/28 unit tests, zero console warnings/errors):

- [x] The app builds and boots to the title screen with no console errors.
- [x] All four character sheets open from the title screen and display every field from Chapter 3 without truncation or overflow.
- [x] RNG unit tests pass: identical seeds replay identical draw sequences.
- [x] The UI palette and token set are reviewed and locked, with change-control notes for later tweaks.

**Delivered**: graphite-orange theme lock in `globals.css` (Barlow display / Lora prose / tabular numerals); core types (`src/game/types.ts`) covering Actor, Party, WorldState, Flags, BattleState and the versioned save schema; mulberry32 seeded RNG with draw-log ring buffer and cursor save/restore (`src/game/rng.ts`); dice math helpers (`src/game/dice.ts`); the four Chapter-3 hero sheets as typed data (`src/content/party.ts`); Zustand game store capped at the seven GDD §9.1 fields plus an ephemeral UI store (`src/state/`); save module with schema v1, four slot keys, migration scaffolding and corrupt-slot quarantine; title screen with the vector dusk tableau and black-fletched arrows; party roster; full character-sheet overlay; save-slot overlay skeleton; hero vector tokens and the d4–d20 dice icon set; reduced-motion toggle with system-preference fallback.

**Palette & token lock (change-controlled)**: deep slate `#1A2330` for chrome, parchment `#F5EFE2` for prose panels, burnt orange `#D4875A` for interactive accents; element accents — fire `#C4573F`, radiant `#D9A93F`, healing `#7C9A5C`, arcane `#9079B8`. Typography: Barlow for display and headings, Lora for scene prose, tabular numerals for every stat and die result. Motion beats: dice rattle and settle in 400 ms, tokens hop 200 ms per square, damage numbers rise and fade over 600 ms — all CSS transforms, with a first-class reduced-motion toggle. Any later tweak to these tokens requires a dated note in this file.

**Principal risk & guard**: over-engineering the state layer before content exists — the store shape is capped at the seven GDD §9.1 fields; anything speculative goes to the parking lot.
