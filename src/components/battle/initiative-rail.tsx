"use client";

/**
 * The initiative rail (GDD §8.2): a stack of portrait chips down the left
 * edge with the active combatant highlighted, plus the round badge.
 */

import { EnemyToken } from "@/components/battle/enemy-token";
import { HeroToken } from "@/components/ui/hero-token";
import { isDown } from "@/game/combat/core";
import type { BattleState } from "@/game/types";

export function InitiativeRail({ battle }: { battle: BattleState }) {
  const activeId = battle.order[battle.activeIndex];
  return (
    <aside
      aria-label="Initiative order"
      className="ga-panel hidden shrink-0 flex-col gap-1.5 rounded-lg border border-slate-line p-2 sm:flex"
    >
      <div className="rounded-md border border-ember/40 bg-ember/10 px-2 py-1 text-center">
        <p className="text-[9px] font-bold tracking-[0.2em] text-ember-bright uppercase">
          Round
        </p>
        <p className="ga-tnum font-display text-lg leading-none font-extrabold text-parchment">
          {battle.round}
        </p>
      </div>
      {battle.order.map((id) => {
        const c = battle.combatants[id];
        const active = id === activeId && battle.status === "active";
        const out = isDown(c) || c.fled;
        return (
          <div
            key={id}
            className={`flex items-center gap-2 rounded-md border px-1.5 py-1 transition-all ${
              active
                ? "border-ember bg-ember/15 shadow-[0_0_12px_rgba(212,135,90,0.35)]"
                : "border-transparent"
            } ${out ? "opacity-40 grayscale" : ""}`}
            title={c.name}
          >
            <div className="shrink-0">
              {c.side === "party" ? (
                <HeroToken heroId={c.ref as "torvald"} size={26} />
              ) : (
                <EnemyToken ref_={c.ref as "goblin"} size={26} />
              )}
            </div>
            <div className="min-w-0 leading-tight">
              <p
                className={`truncate text-[11px] font-semibold ${
                  c.side === "party" ? "text-mist" : "text-ember-bright/90"
                } ${c.fled ? "line-through" : ""}`}
              >
                {c.name.split(" ")[0]}
              </p>
              <p className="ga-tnum text-[10px] text-mist-dim">
                init {c.initiative >= 0 ? `+${c.initiative}` : c.initiative}
              </p>
            </div>
          </div>
        );
      })}
    </aside>
  );
}
