"use client";

/**
 * The target card (GDD §8.2): name, AC, HP bar and traits in plain language
 * for the selected combatant — hero or enemy.
 */

import { ConditionChips } from "@/components/battle/condition-icons";
import { EnemyToken } from "@/components/battle/enemy-token";
import { HeroToken } from "@/components/ui/hero-token";
import { attacksOf, heroSheetOf, statBlockOf } from "@/game/combat/core";
import { formatDice } from "@/game/dice";
import { hasCoverVsRanged } from "@/game/grid";
import { getArena } from "@/content/arenas";
import type { BattleState, Combatant } from "@/game/types";

export function TargetCard({ battle, combatant }: { battle: BattleState; combatant: Combatant | null }) {
  if (!combatant) {
    return (
      <section
        aria-label="Target card"
        className="ga-panel hidden rounded-lg border border-slate-line p-4 lg:block"
      >
        <p className="text-xs text-mist-dim italic">
          Select a token on the field to read its card.
        </p>
      </section>
    );
  }

  const arena = getArena(battle.arenaId);
  const isParty = combatant.side === "party";
  const sheet = isParty ? heroSheetOf(combatant) : null;
  const block = !isParty ? statBlockOf(combatant) : null;
  const cover =
    combatant.position !== null && hasCoverVsRanged(arena, combatant.position);
  const hpPct = Math.max(0, Math.round((combatant.hp / combatant.maxHp) * 100));

  return (
    <section
      aria-label={`Target card: ${combatant.name}`}
      className="ga-panel rounded-lg border border-slate-line p-3.5"
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0">
          {isParty ? (
            <HeroToken heroId={combatant.ref as "torvald"} size={52} />
          ) : (
            <EnemyToken ref_={combatant.ref as "goblin"} size={52} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-sm font-bold text-parchment">
            {combatant.name}
          </h3>
          <p className="text-[11px] text-mist-dim">
            {sheet ? `${sheet.race} ${sheet.className}` : block?.role}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span className="ga-tnum rounded-sm border border-slate-line bg-slate-deep/70 px-1.5 py-0.5 text-[11px] font-bold text-mist">
              AC {combatant.ac}
            </span>
            {cover && (
              <span className="rounded-sm border border-healing/50 bg-healing/10 px-1.5 py-0.5 text-[10px] font-semibold text-healing">
                +2 cover vs ranged
              </span>
            )}
            <span className="ga-tnum text-[11px] text-mist-dim">
              {combatant.speed} ft
            </span>
          </div>
        </div>
      </div>

      {/* HP bar */}
      <div className="mt-3">
        <div className="mb-1 flex items-baseline justify-between">
          <span className="text-[10px] font-bold tracking-[0.18em] text-mist-dim uppercase">
            Hit points
          </span>
          <span className={`ga-tnum text-xs font-bold ${combatant.hp === 0 ? "text-mist-dim" : "text-mist"}`}>
            {combatant.hp} / {combatant.maxHp}
          </span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full border border-slate-line bg-slate-deep">
          <div
            className="h-full rounded-full transition-[width] duration-500"
            style={{
              width: `${hpPct}%`,
              background:
                hpPct > 50
                  ? "linear-gradient(90deg, #7C9A5C, #9DB878)"
                  : hpPct > 25
                    ? "linear-gradient(90deg, #D9A93F, #E8C46A)"
                    : "linear-gradient(90deg, #C4573F, #D47A5F)",
            }}
          />
        </div>
      </div>

      <div className="mt-3">
        <ConditionChips c={combatant} />
      </div>

      {/* Attacks */}
      <div className="mt-3 space-y-1">
        <p className="text-[10px] font-bold tracking-[0.18em] text-mist-dim uppercase">
          Attacks
        </p>
        {attacksOf(combatant).map((atk) => (
          <p key={atk.name} className="ga-tnum text-[11px] leading-snug text-mist">
            <span className="font-semibold text-parchment">{atk.name}</span>{" "}
            {atk.attackBonus >= 0 ? "+" : ""}
            {atk.attackBonus} · {formatDice(atk.damage)}{" "}
            <span className="text-mist-dim">
              {atk.reach ? "melee" : `${atk.range?.[0]}/${atk.range?.[1]} ft`}
            </span>
          </p>
        ))}
      </div>

      {/* Traits in plain language */}
      <div className="mt-3 space-y-1.5">
        <p className="text-[10px] font-bold tracking-[0.18em] text-mist-dim uppercase">
          Traits
        </p>
        {(sheet?.traits ?? block?.traits)?.map((trait) => (
          <p key={trait.name} className="text-[11px] leading-snug text-mist-dim">
            <span className="font-semibold text-mist">{trait.name}.</span> {trait.text}
          </p>
        ))}
      </div>
    </section>
  );
}
