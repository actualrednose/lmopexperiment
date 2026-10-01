"use client";

/**
 * The party strip (GDD §8.1): a slim strip across the story header showing
 * the four heroes' HP at all times — token, HP bar, numbers, caster slots
 * and the level chip that flips at the milestone. Chips open the character
 * sheet overlay.
 */

import { HeroToken } from "@/components/ui/hero-token";
import { getHeroSheet } from "@/content/party";
import { PARTY_ORDER } from "@/content/party";
import { useGameStore } from "@/state/store";
import { useUiStore } from "@/state/ui-store";
import { cn } from "@/lib/utils";
import type { HeroRuntime } from "@/game/types";

export function PartyStrip() {
  // Stable field subscription — a selector that builds a new array per call
  // breaks hydration (useSyncExternalStore snapshot identity).
  const party = useGameStore((s) => s.party);
  const openSheet = useUiStore((s) => s.openSheet);

  return (
    <div
      role="list"
      aria-label="Party status"
      className="ga-scroll flex min-w-0 items-center gap-1.5 overflow-x-auto"
    >
      {PARTY_ORDER.map((heroId) => {
        const rt = party[heroId];
        return (
          <button
            key={rt.heroId}
            type="button"
            role="listitem"
            onClick={() => openSheet(rt.heroId)}
            title={`${getHeroSheet(rt.heroId).name} — open character sheet`}
            className="flex shrink-0 items-center gap-1.5 rounded-md border border-slate-line bg-slate-panel/70 px-1.5 py-1 transition-colors hover:border-ember/50 hover:bg-slate-raised"
          >
            <HeroToken heroId={rt.heroId} size={26} />
            <div className="flex min-w-0 flex-col items-start gap-0.5">
              <div className="ga-tnum flex items-center gap-1 text-[10px] leading-none font-bold text-mist">
                <span className="hidden sm:inline">{firstName(rt.heroId)}</span>
                <span
                  className={cn(
                    "rounded px-1 py-px text-[9px] tracking-wide",
                    rt.level >= 2
                      ? "bg-ember/20 text-ember-bright"
                      : "bg-slate-raised text-mist-dim"
                  )}
                >
                  L{rt.level}
                </span>
                <span className={hpClass(rt)}>
                  {rt.hp}/{rt.maxHp}
                </span>
              </div>
              <div className="flex w-full items-center gap-1">
                <div className="h-1.5 w-14 overflow-hidden rounded-full bg-slate-deep" style={{ width: 56 }}>
                  <div
                    className={cn("h-full rounded-full transition-all", hpBarClass(rt))}
                    style={{ width: `${Math.max(0, (rt.hp / rt.maxHp) * 100)}%` }}
                  />
                </div>
                {casterSlots(rt)}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

const FIRST_NAMES: Record<HeroRuntime["heroId"], string> = {
  torvald: "Torvald",
  perrin: "Perrin",
  maera: "Maera",
  elyndra: "Elyndra",
};

function firstName(id: HeroRuntime["heroId"]): string {
  return FIRST_NAMES[id];
}

function hpFraction(rt: HeroRuntime): number {
  return rt.hp / rt.maxHp;
}

function hpClass(rt: HeroRuntime): string {
  const f = hpFraction(rt);
  if (rt.hp <= 0) return "text-fire";
  if (f <= 0.3) return "text-fire";
  if (f <= 0.6) return "text-radiant";
  return "text-healing";
}

function hpBarClass(rt: HeroRuntime): string {
  const f = hpFraction(rt);
  if (rt.hp <= 0 || f <= 0.3) return "bg-fire";
  if (f <= 0.6) return "bg-radiant";
  return "bg-healing";
}

/** Caster slot pips — filled circles per unused slot (level 2 banks three). */
function casterSlots(rt: HeroRuntime) {
  const sheet = getHeroSheet(rt.heroId);
  if (!sheet.spellSlots) return null;
  const max = Math.max(sheet.spellSlots, rt.level >= 2 ? sheet.level2.slots ?? 0 : 0);
  return (
    <span className="flex items-center gap-0.5" aria-label={`${max - rt.spellSlotsUsed} of ${max} slots left`}>
      {Array.from({ length: max }, (_, i) => (
        <span
          key={i}
          className={cn(
            "h-1.5 w-1.5 rounded-full border border-arcane/70",
            i < max - rt.spellSlotsUsed ? "bg-arcane" : "bg-transparent"
          )}
        />
      ))}
    </span>
  );
}
