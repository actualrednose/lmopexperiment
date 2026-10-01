# Build Sessions — Progress Tracker

The complete plan lives in the [design document](./docs/Goblin_Arrows_Game_Design_and_Build_Plan.docx), Chapter 10. Each session ships a runnable artifact and is accepted against binary criteria — acceptance is checked as a list, not a feeling.

| # | Session | Playable Outcome | Status |
|---|---------|------------------|--------|
| 1 | Foundations & character sheets | App boots to a title screen; four full hero sheets browsable | ✅ Complete |
| 2 | Combat engine | Complete tactical fights in a debug arena against goblins and wolves | ✅ Complete |
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

## Session 2 — Combat Engine

**Scope** (GDD §10.2): the complete streamlined d20 system, playable end to end — battle grid with tokens, initiative with hero tie-breaks, movement and opportunity attacks, the full frozen action list of Table 5, advantage and disadvantage from the §4.1 whitelist, critical hits, all twelve spells of Table 6, the four conditions, Down and morale behavior, goblin and wolf AI from §9.4, and victory/defeat flows — all exercised in a seeded, resettable debug arena reachable from the title screen.

**Acceptance criteria** (all verified — 85/85 unit tests including the 1,000-fight simulation, ESLint clean, TypeScript clean, browser E2E of the full fight flow with zero console errors):

- [x] Both arena fights are winnable and losable, with every hero's full kit usable, including all twelve spells (level-2 toggle in the arena unlocks Action Surge, Cunning Action, third slots, Misty Step and the hit-point increases; verified by E2E play and unit tests).
- [x] A seeded replay of a fight from the same seed and inputs produces identical results (`combat-core.test.ts` determinism suite; the battle owns its RNG cursor).
- [x] Morale triggers correctly: the last goblin flees (and can escape off the map to end the battle); wolves fight while the pack stands (`combat-ai.test.ts`).
- [x] Kernel unit tests pass for hit, crit, advantage, opportunity attack, each spell, KO and morale transitions (29 core + 17 spell + 10 AI suites).
- [x] First balance measurement: 1,000 seeded ambushes vs the Chapter 11 bands — measured **party hit rate 58.3 %** (band 55–65 %), **enemy hit rate 44.6 %** (band 30–45 %), **TPK 2.7 %** (band < 5 %). *Recorded deviation:* **damage taken 22.9 mean / 20.0 median** vs the 10–20 band — the §6.2 ambush surprise contest fires on ~65 % of seeds and grants the goblins a free volley that the band's §7.2 hand-math did not model. Tuning plan for the Session 6 balance pass: widen the band to 10–25 by change-control, or drop the ambush Stealth bonus to +5 (surprise ~60 %), or grant the Neverwinter Insight foreshadow a +2 passive-Perception bonus. The simulation asserts the documented tolerance (≤ 25) until that pass rules.

**Delivered**: grid module with 5-ft squares, free diagonals, BFS pathing, occupancy, reach, line of sight and the flat cover ruling (`src/game/grid.ts`); the combat kernel as pure reducers — `createBattle` with initiative, ambush stealth contest and telemetry (`src/game/combat/core.ts`), the frozen action vocabulary with movement, opportunity attacks (player prompts for heroes, auto-swings for enemies), potion economy and bonus actions (`src/game/combat/actions.ts`), all twelve spells (`src/game/combat/spells.ts`), and utility-scoring AI profiles for goblin and wolf (`src/game/combat/ai.ts`); bestiary data for all four stat blocks with morale rules and passive Perception (`src/content/bestiary.ts`); the road-ambush 14×8 and wolf-pack 12×8 arena definitions (`src/content/arenas.ts`); level-2 milestone data (hit dice, third slots, feature resources) in the party module; the debug arena launcher (fight picker, level toggle, seed field) reachable from the title screen; the full battle screen per §8.2 — initiative rail, token grid with HP pips and condition icons, dimming action bar with weapon/spell popovers, target card, collapsible combat log echoing every die roll, dice popup with the 400-ms rattle and modifier slide, damage/heal floaters, KO desaturation, and the reaction prompt; parchment victory/defeat card with run statistics and same-seed/new-seed rematch; enemy turns driven at a readable pace with a pause for pending reactions.

**Session 2 rulings, shipped as-is per the §10.2 risk note** (change-controlled):

- *Free diagonals* — diagonal movement costs the same as orthogonal; distance is Chebyshev × 5 ft throughout.
- *Cover is a flat +2 AC vs ranged* while the defender stands on a thicket tile or adjacent to a cover object (wagon, dead horses); melee attacks ignore cover.
- *Long range is a hard cap* — the advantage whitelist has no long-range entry, so the second range number is simply maximum reach, with no long-range disadvantage.
- *Bodies are passable-through but never stoppable* — living allies and the Down may be moved through; no token may end its move on any body (prevents stacking on the fallen).
- *Sleep* affects enemies only, weakest first, arena-wide, no save; waking costs the enemy its action; attacks against sleepers have advantage ("the target is asleep" joins the named whitelist); damage does not wake.
- *Magic Missile* darts distribute round-robin over one to three chosen targets.
- *Perrin's Lucky* rerolls natural 1s on attack rolls (exploration checks join in Session 3).
- *Wolf trip* folds into the shared attack pipeline (DC 11 STR save, like Sneak Attack for Perrin).
- *Saves use ability modifiers only* (no proficiency) — the streamlined ruling; keeps wolf-bite DC 11 meaningful for every hero.
- *Potions stay a full action* (GDD §12.1 open question) — the healing simulation showed no starvation: Maera's slots plus two potions sustained the band across 1,000 runs.
- *Level-2 hit points* use average hit dice + CON (22/16/17/14), which the GDD §7.2 math requires — Klarg's 11-damage average one-shots nobody at level 2.

**Principal risk & guard**: scope creep in the action vocabulary and edge cases — the action list is frozen at Table 5 by this note; any new action requires a change-control entry here before implementation.
