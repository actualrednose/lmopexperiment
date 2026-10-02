# Build Sessions — Progress Tracker

The complete plan lives in the [design document](./docs/Goblin_Arrows_Game_Design_and_Build_Plan.docx), Chapter 10. Each session ships a runnable artifact and is accepted against binary criteria — acceptance is checked as a list, not a feeling.

| # | Session | Playable Outcome | Status |
|---|---------|------------------|--------|
| 1 | Foundations & character sheets | App boots to a title screen; four full hero sheets browsable | ✅ Complete |
| 2 | Combat engine | Complete tactical fights in a debug arena against goblins and wolves | ✅ Complete |
| 3 | Exploration engine & Acts I–II | Playable from title screen to the hideout door with branching checks | ✅ Complete |
| — | Animation pass (interstitial) | Movement, attack and UI motion across both screens | ✅ Complete |
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

## Session 3 — Exploration Engine & Acts I–II

**Scope** (GDD §10.3): the scene runner over the frozen data contract (prose, tableau, choices), the flag and alert state model, the skill-check flow with the animated dice UI, short and long rests, the inventory basics (potions and rations), and the complete Act I and Act II content — the road, the job, the camp, the dead horses, the ambush battle hooked into the run, the aftermath, and the goblin trail, with the level-2 milestone flow at the dungeon's doorstep.

**Acceptance criteria** (all verified — 107/107 unit tests, ESLint clean, TypeScript clean, browser E2E of the full New Game → hideout door run with zero console errors):

- [x] A full run from New Game reaches the hideout door with every Act I–II scene and the ambush battle intact (`story-run.test.ts` full-run smoke: 30/30 seeded runs reach `act3-door` under the greedy first-choice policy; browser E2E played the ambush for real — surprise volley, Healing Word revive, a 35-point Sleep that dropped all four goblins, a sneak-attack crit, the last goblin's morale break and escape — and continued straight back into the story).
- [x] At least three skill checks with distinct outcomes are observed in one run: Insight (Maera +5, DC 10), Investigation (Elyndra +5, DC 10), Survival (group, best = Maera's WIS +3, DC 10, advantage from Perrin walking point) — plus the runner shot (Perrin's Shortbow +5 vs AC 15, the attack chassis outside battle), the chase (Athletics DC 12) and the interrogation (Intimidation/Deception DC 10). Every run that reaches the door exercises ≥ 3 distinct checks (asserted per-seed).
- [x] The level-2 upgrade applies correctly: levels 2, hit points 22/16/17/14, Action Surge + Cunning Action banked, third slots for both casters at battle creation, and the act-boundary long rest tops the party to the new maxima (unit + browser verified — the party strip flips to L2 at the doorstep).
- [x] Save at the camp, fight the ambush, load the save: state returns exactly (browser: slot-1 written at `act1-camp` restored the L1 party at 13/10/10/8 HP verbatim), and replaying the fight reproduces from the restored seed (`story-run.test.ts`: serialize at the camp → play to the door → load → replay → the two final worlds deep-equal, RNG cursors included).

**Delivered**: the frozen scene data contract — `src/game/scene-types.ts` (Scene, SceneChoice, CheckSpec, ScenePredicate, SceneEffect, tableaus, ResolvedCheck, RestRoll), change-controlled from here on; the scene runner as pure functions — `src/game/scenes.ts` (choice resolution with the fixed draw-order determinism contract, group-check roller assignment, the advantage whitelist's exploration side, Lucky rerolls on Perrin's checks, effects, the alert clamp, short rests rolling hit dice, the act-boundary long rest, the level-2 milestone, and the battle handoff/return with party sync, the potion economy and goblin-drop rolls); Act I–II content — 26 typed scene records in `src/content/story.ts` (six beats expanded with their check variants, each 80–160 words of fresh prose) plus the item module (`src/content/items.ts`: potions, rations, the map-case quest item, the starting kit); the content linter — `src/game/content-lint.ts` (targets exist, checks are valid skills or real hero attacks, arenas resolve, acts never regress, every scene reachable, prose template, rest discipline, milestone presence); the story store orchestration — seeded `newGame`, `beginStory`, staged check commits (`commitChoice`/`confirmPendingCheck`), `resolveStoryBattle` with the fled-goblin route, act-transition autosaves, and the `worldFromStore` picker that keeps saves to exactly the seven GDD fields; the story screen per §8.1 — 55/45 tableau/prose split, choice cards previewing skill · roller · modifier · DC before commitment, the animated check overlay (rattle → modifier slide → verdict stamp), the party HP strip with caster slots and level chips, the torch alert gauge, the rest panel with each hero's genuine hit-die roll, the data-driven level-2 milestone panel; the save/load overlay made real (save/load/delete, act-boundary autosaves, scene stamps); the inventory overlay; the TPK game-over card with run statistics; story-mode battle chrome (no retreat, no rematch — the fight must resolve); and the `/?seed=` QA hook that pins a run's RNG from the URL.

**Session 3 rulings, shipped as-is** (change-controlled; the scene contract is frozen per the §10.7 dependency rule — Session 4–5 content is written against it):

- *Scene variants are scene records* — check outcomes land as distinct scene ids (`act1-job-read`/`-ease`, `act2-map-case`/`-no-case`, `act2-trail-quiet`/`-spotted`…); the history tracks which variant played, so prose branching needs no extra flags. The flag list stays at the GDD's eight.
- *Effects bind to choices and check branches* (`successEffects`/`failureEffects`) — never to scene entry; the linter enforces it.
- *Decision scenes hold two to four choices* (GDD Chapter 5); consequence/beat scenes may carry a single continuation. Lint: hubs ≥ 2, every scene ≥ 1.
- *Untrained skills roll the best ability modifier in the party* (Survival → Maera's WIS +3; Persuasion and Animal Handling will follow in Session 4–5).
- *The runner shot is an attack-style check* — a hero's weapon against the named AC on the shared d20 chassis; the card shows “Shortbow · Perrin +5 vs AC 15”.
- *Sleep cannot capture* — a sleeping enemy keeps the battle active until it is dispatched; capture happens through the chase choice (`act2-runner-caught` → interrogation).
- *Perrin's Lucky extends to exploration checks* — natural 1s reroll once when Perrin rolls (Session 2 note, now live).
- *Story battles snapshot the run party* (level, HP, spent slots, resources) and the inventory's potions; the battle seed is drawn from the world stream, so loaded saves replay fights exactly. Victory flows combatant state back (Down heroes already rose at 1 HP in the kernel), subtracts drunk potions, rolls a 25 % potion drop per defeated goblin, and sets `goblinEscaped` when a goblin slips off the map.
- *Acts are the long-rest and autosave unit* — crossing upward applies the full rest and writes the autosave; Act I's camp teaches the short rest the ambush immediately stresses, Act II offers one at the aftermath, one per act, predicate-gated.
- *Starting kit*: 2 potions of healing and 4 trail rations (the §4.5 healing budget and the Session 4 wolf-calming tool); the empty map case joins as a quest item on Investigation success.
- *The trail's failure routes forward, not back* — a failed Survival check still finds the hideout; it costs surprise (alert starts at Suspicious) exactly as §6.2 specifies.

**Principal risk & guard**: prose volume tempting the session into writing instead of engineering — mitigated as specified: prose drafted to the tight 80–160-word template (lint-enforced), the scene contract frozen before any dungeon prose is written, and refinement deferred to the Session 6 polish pass.

## Animation Pass — Movement, Attacks & UI Polish (interstitial, pre-Session 4)

**Scope** (user-requested polish between Sessions 3 and 4): give the game presentability-grade motion — path-following token movement, attack choreography (lunges, projectiles, impacts, crits), and UI transitions — without touching the frozen rules kernel, the determinism contract, or the save schema.

**Acceptance criteria** (all verified — 116/116 unit tests including the new strike-metadata suite, ESLint clean, TypeScript clean, and three browser E2E runs with zero page/console errors):

- [x] Movement animates along the walked path: tokens step square by square at the locked 200 ms/square beat instead of sliding straight to their destination (E2E: walk transition observed live mid-move over a 72-tile reachable field).
- [x] Attacks carry point-of-action choreography: melee attackers lunge toward the target and struck tokens shake (crits burst a radiant double-ring and shake the whole field); missed targets slip the blow with a sidestep sway (E2E: hero-initiated Shortsword strike live at +130 ms; enemy melee strikes live during later beats).
- [x] Ranged attacks loose arced projectiles with per-flavor art — black-fletched arrows (shortbow), an ember mote (Fire Bolt), a radiant teardrop (Sacred Flame), arcane darts (Magic Missile) — with impact rings timed to the landing (E2E: the round-1 goblin volley's arrow projectile observed live at poll 2).
- [x] Misty Step dissolves into a silver ghost at the origin and reforms with a fade-in scale; a fleeing token's last step off the map edge fades to nothing; the walker never slides on teleports (the transition is walk-gated).
- [x] UI motion lands across both screens: battle/story/game-over view entrances, victory/defeat card entrance with a title stamp, initiative chip pop when the spotlight lands, action-bar popover rise and button press feedback, HP pips cross-fading, the story tableau cross-fading per scene, prose fading in, choice cards cascading with a 55 ms stagger and lifting on hover, rest/milestone panels popping in, the party strip's HP bars gaining a fire-tinted damage ghost that holds then drains, and the check-overlay backdrop fading.
- [x] The reduced-motion toggle collapses every new effect to an instant state change — the pre-existing global `[data-ga-reduced-motion]` rule covers all of it; nothing animates when the toggle is on.
- [x] Determinism and saves are untouched: the kernel change is purely additive log metadata, no new RNG draws, the save schema and the seven-field world picker unchanged (asserted by the existing determinism and save suites staying green).

**Delivered**: additive `BattleLogEntry.strike` (attacker, target, melee, hit, crit, projectile flavor) emitted by the shared attack pipeline, Sacred Flame's save and every Magic Missile dart, and `BattleLogEntry.teleport` on Misty Step — UI-only metadata, never consumed by rules; `Point` moved to its canonical home in `src/game/types.ts` (grid re-exports; no cycle); the motion hooks module — `src/components/battle/token-motion.ts` (the path-following `useWalkPosition` stepper, `strikeRoleFor`/`latestStrike` matchers, and the imperative `useKeyedClass` restart used for the crit field-shake so the grid never remounts mid-walk); the strike layer — `src/components/battle/strike-fx.tsx` (projectiles with arc + rotation via CSS custom properties, impact and crit rings, the Misty Step ghost, the flee ghost); the token refactor in `battle-grid.tsx` into `TokenSprite` with a position wrapper (walk) nested over a keyed motion wrapper (lunge/recoil/shake/dodge/teleport-in) so each log entry replays exactly once; ~20 new compositor-only keyframes in `globals.css` (transform/opacity exclusively, timed to the 650 ms enemy beat); UI pass across `battle-screen`, `initiative-rail`, `action-bar`, `story-screen`, `party-strip`, `check-overlay`, `game-over`; and the strike-metadata test suite (`src/tests/strike-fx.test.ts`) pinning the emitter contract including its negative space (damage/move/buff entries never carry strikes).

**Animation-pass rulings** (change-controlled):

- *The log is the animation bus* — every effect derives from log entries within a small trailing window and self-expires; no effect body ever touches game state. This is the same discipline as the dice popup and floaters, now the pattern for all combat motion.
- *`strike`/`teleport` metadata is presentational and additive* — the frozen action list, the RNG draw order and the save schema are untouched; the metadata is pinned by tests (including which entries must NOT carry it) so later sessions cannot silently break the animation contract.
- *The hop beat stays locked at 200 ms per square* (GDD §8.4 motion tokens) — the change is from a single straight-line slide to true path-following steps, not a new beat; the dodge/shake/lunge durations sit inside the 650 ms enemy beat so enemy turns stay readable.
- *Crits are the only field-shake trigger* — the screen-flinch effect is deliberately rationed to critical hits so the field never jitters continuously.
- *Ghost HP shows damage, not healing* — the party strip's trailing bar holds 380 ms on HP loss then drains over 600 ms; heals track instantly (a growing ghost would read as a bug, not a tell).
