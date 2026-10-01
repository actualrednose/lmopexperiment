# Goblin Arrows

A turn-based tactical RPG adapting the opening act of the Dungeons & Dragons Starter Set adventure *Lost Mine of Phandelver* — from the wagon escort out of Neverwinter, through the goblin ambush on the Triboar Trail, to the rescue of Sildar Hallwinter deep inside Cragmaw Hideout.

- **Genre** — Hybrid JRPG: a story panel drives exploration and dialogue; combat switches to a tactical battle grid with tokens on 5-foot squares.
- **Party** — Four pregenerated heroes: Torvald Ironfell (fighter), Perrin Underbough (rogue), Sister Maera (cleric), Elyndra Moonwhisper (wizard).
- **Rules** — Streamlined d20: attack rolls vs AC, damage dice, spell slots and advantage are kept; condition bookkeeping, concentration and death saves are cut.
- **Art** — 100% vector and CSS. Tokens, tiles, icons and effects are built in code; there is no raster asset pipeline.
- **Platform** — Browser game, fully client-side. Next.js 16 (App Router) + TypeScript + Tailwind CSS 4 + Zustand.
- **Determinism** — Every die in the game is drawn from one seeded mulberry32 generator whose cursor lives in the save state; a seed plus the same inputs replays the same fight.

## Status

Session 1 of 6 (Foundations & Character Sheets) is in progress. See [SESSIONS.md](./SESSIONS.md) for the roadmap and per-session acceptance criteria, and [docs/Goblin_Arrows_Game_Design_and_Build_Plan.docx](./docs/Goblin_Arrows_Game_Design_and_Build_Plan.docx) for the complete specification the build follows.

## Run it

```bash
bun install
bun run dev        # http://localhost:3000
bun test           # engine unit tests (src/tests)
```

## Repository layout

```
docs/             the game design document (GDD) — the authoritative spec
src/game/         rules kernel: core types, seeded RNG, dice helpers
src/content/      typed data: the four hero sheets (scenes & bestiary land in later sessions)
src/state/        Zustand game store + versioned save schema (3 slots + autosave)
src/components/   story screens, overlays and shared vector UI (hero tokens, dice icons, character sheet)
src/tests/        unit tests for the RNG kernel and content sanity
```

Per the GDD's architecture: pure engine, dumb components, typed content. Battle logic lands as pure reducers in `src/game/` in Session 2; scene content lands in `src/content/` in Session 3.

## Credits & note

A fan adaptation built as a private learning experiment, following the published adventure's structure with original prose. *Lost Mine of Phandelver* and D&D are trademarks of Wizards of the Coast; this project is not affiliated with or endorsed by them.
