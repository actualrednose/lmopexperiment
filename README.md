# Goblin Arrows

A turn-based tactical RPG adapting the opening act of the Dungeons & Dragons Starter Set adventure *Lost Mine of Phandelver* — from the wagon escort out of Neverwinter, through the goblin ambush on the Triboar Trail, to the rescue of Sildar Hallwinter deep inside Cragmaw Hideout.

- **Genre** — Hybrid JRPG: a story panel drives exploration and dialogue; combat switches to a tactical battle grid with tokens on 5-foot squares.
- **Party** — Four pregenerated heroes: Torvald Ironfell (fighter), Perrin Underbough (rogue), Sister Maera (cleric), Elyndra Moonwhisper (wizard).
- **Rules** — Streamlined d20: attack rolls vs AC, damage dice, spell slots and advantage are kept; condition bookkeeping, concentration and death saves are cut.
- **Art** — 100% vector and CSS. Tokens, tiles, icons and effects are built in code; there is no raster asset pipeline.
- **Platform** — Browser game, fully client-side. Next.js 16 (App Router) + TypeScript + Tailwind CSS 4 + Zustand.
- **Determinism** — Every die in the game is drawn from one seeded mulberry32 generator whose cursor lives in the save state; a seed plus the same inputs replays the same fight.

## Status

Sessions 1–3 of 6 are complete — foundations & character sheets, the full combat engine (debug arena), and the exploration engine with Acts I–II playable end to end: from the title screen through Gundren's job offer, the camp, the dead horses, the four-goblin ambush battle hooked into the run, the aftermath branches, the goblin trail, and the level-2 milestone at the hideout door. An interstitial animation pass then added presentability-grade motion on top: path-following token walks, attack choreography (lunges, arced projectiles, crit bursts, field shake), and UI transitions across both screens — all log-derived, compositor-only, and collapsed by the reduced-motion toggle. See [SESSIONS.md](./SESSIONS.md) for the roadmap and per-session acceptance criteria, and [docs/Goblin_Arrows_Game_Design_and_Build_Plan.docx](./docs/Goblin_Arrows_Game_Design_and_Build_Plan.docx) for the complete specification the build follows. Next up: Session 4, Cragmaw Hideout part A.

## Run it

```bash
bun install
bun run dev        # http://localhost:3000
bun test           # engine unit tests (src/tests)
```

## Repository layout

```
docs/             the game design document (GDD) — the authoritative spec
src/game/         rules kernel: core types, seeded RNG, dice helpers, grid & combat, the scene runner, the content linter
src/content/      typed data: hero sheets, bestiary, arenas, items, the Act I–II scene graph
src/state/        Zustand game store + versioned save schema (3 slots + autosave)
src/components/   story & battle screens, overlays and shared vector UI (tokens, tableaus, dice, sheets)
src/tests/        unit, content-lint, balance-sim and story-run acceptance tests
```

Per the GDD's architecture: pure engine, dumb components, typed content. Battle logic is pure reducers in `src/game/combat`; the story runs on the scene runner over typed scene records in `src/content/story.ts`, validated by the content linter so the Session 4–5 dungeon drops stay boring.

## Credits & note

A fan adaptation built as a private learning experiment, following the published adventure's structure with original prose. *Lost Mine of Phandelver* and D&D are trademarks of Wizards of the Coast; this project is not affiliated with or endorsed by them.
