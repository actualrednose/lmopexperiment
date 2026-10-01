"use client";

/**
 * The battle grid (GDD §8.2/§8.3): a top-down field of 5-foot tiles with
 * circular vector tokens, HP pips under each frame, movement and targeting
 * highlights, terrain and cover objects — all positioned with pure CSS
 * transforms so motion stays cheap and the reduced-motion toggle works.
 */

import { TokenConditions } from "@/components/battle/condition-icons";
import { EnemyToken } from "@/components/battle/enemy-token";
import { HeroToken } from "@/components/ui/hero-token";
import { getArena } from "@/content/arenas";
import { chebyshev, type Point } from "@/game/grid";
import { isDown } from "@/game/combat/core";
import type { BattleState, Combatant } from "@/game/types";
import { useEffect, useMemo, useState } from "react";

/* (useRef intentionally absent: floater lifecycle is log-derived + self-expiring) */

export type TargetingMode =
  | { kind: "none" }
  | { kind: "move" }
  | { kind: "attack"; attackIndex: number; targetIds: string[] }
  | { kind: "spell"; spellName: string; targetIds: string[]; maxTargets: number }
  | { kind: "spell-dest"; spellName: string; dests: string[] }
  | { kind: "help"; targetIds: string[] }
  | { kind: "item"; targetIds: string[] };

export interface BattleGridProps {
  battle: BattleState;
  mode: TargetingMode;
  /** "x,y" → reachable square (move mode). */
  reachable: Set<string>;
  /** Pre-selected multi-target ids (Magic Missile, Bless). */
  pendingTargets: string[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onTileClick: (p: Point) => void;
  onTokenClick: (id: string) => void;
}

export function BattleGrid({
  battle,
  mode,
  reachable,
  pendingTargets,
  selectedId,
  onSelect,
  onTileClick,
  onTokenClick,
}: BattleGridProps) {
  const arena = getArena(battle.arenaId);

  // Damage/heal floaters (GDD §8.2: rising numbers, healing in green, 600 ms
  // rise and fade). Derived from the newest log entries; each floater hides
  // itself after its rise — no effect bodies touch state.
  const recentFx = useMemo(() => {
    const out: {
      key: number;
      targetId: string;
      amount: number;
      kind: "damage" | "heal";
    }[] = [];
    const from = Math.max(0, battle.log.length - 4);
    for (let i = from; i < battle.log.length; i++) {
      battle.log[i].fx?.forEach((fx, j) =>
        out.push({ key: i * 10 + j, targetId: fx.targetId, amount: fx.amount, kind: fx.kind })
      );
    }
    return out;
  }, [battle.log]);

  // Token hop timing (GDD §8.4: 200 ms per square), derived purely from
  // the log — the latest move entry for each actor names its path length.
  const lastMoves = useMemo(() => {
    const map = new Map<string, number>();
    for (let i = battle.log.length - 1; i >= Math.max(0, battle.log.length - 8); i--) {
      const e = battle.log[i];
      if (e.move && !map.has(e.actor)) map.set(e.actor, e.move.path.length);
    }
    return map;
  }, [battle.log]);

  const activeId = battle.order[battle.activeIndex];
  const targetingIds = new Set(
    mode.kind === "attack" || mode.kind === "spell" || mode.kind === "help" || mode.kind === "item"
      ? mode.targetIds
      : []
  );

  return (
    <div
      className="relative mx-auto"
      style={
        {
          "--ga-ts": "clamp(30px, 9vmin, 50px)",
          width: `calc(var(--ga-ts) * ${battle.width})`,
          height: `calc(var(--ga-ts) * ${battle.height})`,
        } as React.CSSProperties
      }
      onClick={() => onSelect(null)}
    >
      {/* ── Terrain layer ── */}
      {arena.map.map((row, y) =>
        row.split("").map((ch, x) => {
          const terrain = TERRAIN_OF[ch] ?? "grass";
          const color = TERRAIN_COLORS[terrain];
          const isReachable =
            mode.kind === "move" && reachable.has(`${x},${y}`);
          const isDest =
            mode.kind === "spell-dest" && mode.dests.includes(`${x},${y}`);
          return (
            <div
              key={`${x},${y}`}
              className={`absolute p-[1px] ${isReachable || isDest ? "cursor-pointer" : ""}`}
              style={{
                left: `calc(var(--ga-ts) * ${x})`,
                top: `calc(var(--ga-ts) * ${y})`,
                width: "var(--ga-ts)",
                height: "var(--ga-ts)",
              }}
              onClick={
                isReachable || isDest
                  ? (e) => {
                      e.stopPropagation();
                      onTileClick({ x, y });
                    }
                  : undefined
              }
            >
              <div
                className={`h-full w-full rounded-[3px] transition-colors ${
                  isReachable
                    ? "ring-2 ring-ember/70 ring-inset"
                    : isDest
                      ? "ring-2 ring-arcane/70 ring-inset"
                      : ""
                }`}
                style={{
                  backgroundColor: color.fill,
                  backgroundImage:
                    terrain === "thicket"
                      ? "repeating-linear-gradient(45deg, rgba(212,135,90,0.06) 0 3px, transparent 3px 7px)"
                      : terrain === "road"
                        ? "repeating-linear-gradient(90deg, rgba(245,239,226,0.045) 0 2px, transparent 2px 9px)"
                        : undefined,
                  boxShadow: "inset 0 0 0 1px rgba(58,74,102,0.28)",
                }}
              />
            </div>
          );
        })
      )}

      {/* ── Cover objects ── */}
      {arena.objects.map((obj, i) =>
        obj.tiles.map((t) => (
          <div
            key={`${i}-${t.x}-${t.y}`}
            className="pointer-events-none absolute flex items-center justify-center"
            style={{
              left: `calc(var(--ga-ts) * ${t.x})`,
              top: `calc(var(--ga-ts) * ${t.y})`,
              width: "var(--ga-ts)",
              height: "var(--ga-ts)",
            }}
            title={obj.label}
          >
            <ObjectArt kind={obj.kind} />
          </div>
        ))
      )}

      {/* ── Tokens ── */}
      {Object.values(battle.combatants).map((c) => {
        if (!c.position || c.fled) return null;
        const hopMs = Math.min(800, Math.max(0, (lastMoves.get(c.name) ?? 0) * 200));
        const isActive = c.id === activeId && battle.status === "active";
        const isTargetable = targetingIds.has(c.id);
        const isPending = pendingTargets.includes(c.id);
        const down = isDown(c);
        const dimOthers =
          (mode.kind === "attack" ||
            mode.kind === "spell" ||
            mode.kind === "help" ||
            mode.kind === "item") &&
          !isTargetable;
        return (
          <div
            key={c.id}
            className="absolute"
            style={{
              transform: `translate(calc(var(--ga-ts) * ${c.position.x}), calc(var(--ga-ts) * ${c.position.y}))`,
              width: "var(--ga-ts)",
              height: "var(--ga-ts)",
              transition: `transform ${hopMs}ms cubic-bezier(0.45, 0.05, 0.35, 1.4)`,
              zIndex: isActive ? 20 : 10,
            }}
          >
            <div
              role="button"
              tabIndex={0}
              aria-label={`${c.name}, ${c.hp} of ${c.maxHp} hit points`}
              className={`relative flex h-full w-full cursor-pointer items-center justify-center rounded-full outline-none transition-all ${
                isTargetable ? "hover:scale-110" : ""
              } ${dimOthers ? "opacity-45" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                onTokenClick(c.id);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onTokenClick(c.id);
                }
              }}
            >
              {/* active / target rings */}
              {isActive && (
                <span className="ga-glow pointer-events-none absolute inset-[6%] rounded-full border-2 border-ember" />
              )}
              {isTargetable && (
                <span className="pointer-events-none absolute inset-[2%] animate-pulse rounded-full border-2 border-ember-bright" />
              )}
              {selectedId === c.id && (
                <span className="pointer-events-none absolute inset-[4%] rounded-full border-2 border-parchment/70" />
              )}
              {isPending && (
                <span className="pointer-events-none absolute inset-0 rounded-full bg-ember/25" />
              )}

              <span
                className={`relative flex items-center justify-center transition-all ${
                  down ? "opacity-45 grayscale" : ""
                } ${c.fleeing ? "animate-pulse" : ""}`}
              >
                {c.side === "party" ? (
                  <HeroToken
                    heroId={c.ref as "torvald"}
                    size={undefined}
                    className="h-[86%] w-[86%]"
                  />
                ) : (
                  <EnemyToken
                    ref_={c.ref as "goblin"}
                    size={undefined}
                    className="h-[86%] w-[86%]"
                  />
                )}
                <TokenConditions c={c} />
              </span>

              {/* HP pips under the frame (numeric for big pools) */}
              {c.maxHp > 14 ? (
                <span className="ga-tnum pointer-events-none absolute -bottom-[5px] left-1/2 -translate-x-1/2 rounded-sm bg-slate-deep/85 px-1 text-[9px] font-bold text-mist">
                  {c.hp}/{c.maxHp}
                </span>
              ) : (
                <span className="pointer-events-none absolute -bottom-[3px] left-1/2 flex w-[92%] -translate-x-1/2 flex-wrap justify-center gap-[2px]">
                  {pips(c).map((filled, i) => (
                    <span
                      key={i}
                      className={`h-[4px] w-[4px] rounded-full ${
                        filled ? "bg-healing" : "bg-slate-line/70"
                      }`}
                    />
                  ))}
                </span>
              )}
            </div>
          </div>
        );
      })}

      {/* ── Damage / heal floaters ── */}
      {recentFx.map((f) => {
        const c = battle.combatants[f.targetId];
        const pos = c?.position ?? null;
        if (!pos) return null;
        return (
          <FloaterItem
            key={f.key}
            pos={pos}
            amount={f.amount}
            kind={f.kind}
          />
        );
      })}
    </div>
  );
}

function FloaterItem({
  pos,
  amount,
  kind,
}: {
  pos: Point;
  amount: number;
  kind: "damage" | "heal";
}) {
  const [alive, setAlive] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setAlive(false), 950);
    return () => clearTimeout(t);
  }, []);
  if (!alive) return null;
  return (
    <span
      className={`ga-floater ga-tnum pointer-events-none absolute z-30 font-display text-sm font-extrabold ${
        kind === "damage" ? "text-fire" : "text-healing"
      }`}
      style={{
        left: `calc(var(--ga-ts) * ${pos.x} + var(--ga-ts) / 2)`,
        top: `calc(var(--ga-ts) * ${pos.y})`,
      }}
    >
      {kind === "damage" ? `−${amount}` : `+${amount}`}
    </span>
  );
}

/* ── helpers ── */

const TERRAIN_OF: Record<string, string> = {
  G: "grass",
  R: "road",
  T: "thicket",
  C: "clearing",
};

import { TERRAIN_COLORS } from "@/game/grid";

/** HP pips: one dot per hit point for pools of 14 or fewer. */
function pips(c: Combatant): boolean[] {
  return Array.from({ length: c.maxHp }, (_, i) => i < c.hp);
}

/* ── Cover object silhouettes ── */

function ObjectArt({ kind }: { kind: string }) {
  if (kind === "wagon") {
    return (
      <svg viewBox="0 0 48 48" className="h-[92%] w-[92%]" aria-hidden="true">
        <rect x="6" y="14" width="36" height="18" rx="3" fill="#5A4634" stroke="#6B5540" strokeWidth="1.5" />
        <rect x="10" y="10" width="28" height="7" rx="2" fill="#4A3A2A" />
        <circle cx="14" cy="36" r="5.5" fill="none" stroke="#6B5540" strokeWidth="2.5" />
        <circle cx="34" cy="36" r="5.5" fill="none" stroke="#6B5540" strokeWidth="2.5" />
        <path d="M6 23 L0 26 M42 23 L48 26" stroke="#6B5540" strokeWidth="2" />
      </svg>
    );
  }
  if (kind === "horse") {
    return (
      <svg viewBox="0 0 48 48" className="h-[92%] w-[92%]" aria-hidden="true">
        <path
          d="M8 34 C8 27, 14 22, 22 21 L30 15 L34 18 L29 23 C36 25, 41 29, 40 35 L10 37 Z"
          fill="#4E4438"
          stroke="#5F5344"
          strokeWidth="1.4"
        />
        <path d="M40 35 L44 33 M8 34 L6 37" stroke="#5F5344" strokeWidth="2" strokeLinecap="round" />
        <path d="M18 30 L20 28 M25 27 L27 25" stroke="#2A251C" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 48 48" className="h-[92%] w-[92%]" aria-hidden="true">
      <path d="M10 34 C8 24, 16 15, 25 16 C34 17, 40 24, 38 33 C30 38, 18 38, 10 34 Z" fill="#4E4A44" stroke="#5C5850" strokeWidth="1.4" />
      <path d="M20 22 L24 27 M28 20 L30 26" stroke="#3B3833" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}
