"use client";

/**
 * The debug arena launcher (GDD §10.2): the entry point for testing fights in
 * isolation — two preset encounters, a party-level toggle (level 2 unlocks
 * the full twelve-spell kit), and a seed field so any fight is exactly
 * reproducible and resettable.
 */

import { EnemyToken } from "@/components/battle/enemy-token";
import { HeroToken } from "@/components/ui/hero-token";
import { ROAD_AMBUSH, WOLF_PACK } from "@/content/arenas";
import type { ArenaDef } from "@/game/grid";
import { randomSeed } from "@/game/rng";
import { useGameStore } from "@/state/store";
import { useUiStore } from "@/state/ui-store";
import { ArrowLeft, Dices, Play } from "lucide-react";
import { useState } from "react";

const FIGHTS: { arena: ArenaDef; blurb: string; lesson: string; level: 1 | 2 }[] = [
  {
    arena: ROAD_AMBUSH,
    blurb: "Four goblins in two flanking pairs on the 14-by-8 road map.",
    lesson:
      "The game's mechanical thesis statement: cover behind the wagon and horses, focus fire over splitting damage, and the ambush Stealth contest that can catch the party Surprised.",
    level: 1,
  },
  {
    arena: WOLF_PACK,
    blurb: "Three wolves circling a forest clearing.",
    lesson:
      "Pack tactics punish isolation — the pack gains advantage while a packmate hugs the target, and every bite threatens to trip. The last goblin runs; wolves never do.",
    level: 1,
  },
];

export function ArenaLauncher() {
  const startArenaBattle = useGameStore((s) => s.startArenaBattle);
  const setView = useUiStore((s) => s.setView);
  const [fightIndex, setFightIndex] = useState(0);
  const [level, setLevel] = useState<1 | 2>(1);
  const [seedInput, setSeedInput] = useState<string>(() => String(randomSeed() % 100000));

  const fight = FIGHTS[fightIndex];

  const start = () => {
    const parsed = Number.parseInt(seedInput, 10);
    const seed = Number.isFinite(parsed) && parsed >= 0 ? parsed >>> 0 : randomSeed();
    startArenaBattle(fight.arena.id, level, seed);
  };

  return (
    <div className="game-root flex min-h-screen flex-col bg-slate-deep">
      <header className="flex items-center gap-3 border-b border-slate-line bg-slate-panel/60 px-4 py-3">
        <button
          type="button"
          onClick={() => setView("title")}
          className="flex items-center gap-1.5 rounded-md border border-slate-line bg-slate-panel px-2.5 py-1.5 text-[11px] font-semibold tracking-wide text-mist uppercase transition-colors hover:bg-slate-raised"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Title
        </button>
        <h1 className="font-display text-sm font-bold tracking-[0.2em] text-parchment uppercase">
          Debug Arena
        </h1>
        <p className="ml-auto hidden text-[11px] text-mist-dim sm:block">
          Session 2 · Combat engine · seeded &amp; resettable
        </p>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 py-6">
        {/* Fight cards */}
        <section aria-label="Preset fights" className="grid gap-3 sm:grid-cols-2">
          {FIGHTS.map((f, i) => (
            <button
              key={f.arena.id}
              type="button"
              onClick={() => setFightIndex(i)}
              aria-pressed={fightIndex === i}
              className={`rounded-xl border p-4 text-left transition-all ${
                fightIndex === i
                  ? "border-ember bg-ember/10 shadow-[0_0_20px_rgba(212,135,90,0.25)]"
                  : "border-slate-line bg-slate-panel hover:bg-slate-raised/60"
              }`}
            >
              <h2 className="font-display text-base font-bold text-parchment">
                {f.arena.title}
              </h2>
              <p className="mt-1 text-xs text-mist-dim">{f.blurb}</p>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {f.arena.enemySpawns.map((s) => (
                  <EnemyToken key={s.label} ref_={s.ref} size={30} />
                ))}
                <span className="ml-1 text-[11px] font-semibold text-ember-bright">
                  {f.arena.enemySpawns.map((s) => s.label).join(" · ")}
                </span>
              </div>
            </button>
          ))}
        </section>

        {/* Lesson note */}
        <p className="rounded-lg border border-slate-line bg-slate-panel/70 p-3 font-prose text-[13px] leading-relaxed text-mist-dim italic">
          {fight.lesson}
        </p>

        {/* Party + level */}
        <section
          aria-label="Party level"
          className="rounded-xl border border-slate-line bg-slate-panel p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center -space-x-1.5">
              {(["torvald", "perrin", "maera", "elyndra"] as const).map((id) => (
                <HeroToken key={id} heroId={id} size={38} />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold tracking-[0.18em] text-mist-dim uppercase">
                Party level
              </span>
              <div className="flex overflow-hidden rounded-md border border-slate-line">
                {[1, 2].map((lv) => (
                  <button
                    key={lv}
                    type="button"
                    onClick={() => setLevel(lv as 1 | 2)}
                    aria-pressed={level === lv}
                    className={`ga-tnum px-3 py-1.5 text-xs font-bold transition-colors ${
                      level === lv
                        ? "bg-ember text-slate-deep"
                        : "bg-slate-panel text-mist-dim hover:bg-slate-raised"
                    }`}
                  >
                    {lv}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <p className="mt-2.5 text-[11px] leading-relaxed text-mist-dim">
            {level === 1
              ? "Level 1 — two spell slots each; Torvald has Second Wind banked."
              : "Level 2 — the milestone kit: Action Surge, Cunning Action, three slots, Misty Step prepared, and the hit-point increase (22 / 16 / 17 / 14)."}
          </p>
        </section>

        {/* Seed + start */}
        <section className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="flex items-center gap-1.5 text-[11px] font-bold tracking-[0.18em] text-mist-dim uppercase">
              <Dices className="h-3.5 w-3.5" aria-hidden="true" />
              Seed
            </span>
            <input
              type="number"
              min={0}
              value={seedInput}
              onChange={(e) => setSeedInput(e.target.value)}
              className="ga-tnum h-10 w-40 rounded-md border border-slate-line bg-slate-deep px-3 font-mono text-sm text-mist outline-none focus:border-ember"
              aria-label="Battle seed"
            />
          </label>
          <button
            type="button"
            onClick={() => setSeedInput(String(randomSeed() % 100000))}
            className="h-10 rounded-md border border-slate-line bg-slate-panel px-3 text-[11px] font-semibold tracking-wide text-mist uppercase transition-colors hover:bg-slate-raised"
          >
            Random
          </button>
          <button
            type="button"
            onClick={start}
            className="ml-auto flex h-11 items-center gap-2 rounded-md bg-ember px-6 font-display text-sm font-bold tracking-[0.2em] text-slate-deep uppercase transition-colors hover:bg-ember-bright"
          >
            <Play className="h-4 w-4" aria-hidden="true" />
            Start battle
          </button>
        </section>

        <p className="mt-1 text-[11px] leading-relaxed text-mist-dim/80">
          Identical seeds replay identical fights, initiative to the last damage die —
          the same discipline that lets Session 6 simulate a thousand ambushes.
        </p>
      </main>
    </div>
  );
}
