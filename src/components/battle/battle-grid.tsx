"use client";

/**
 * The battle grid (GDD §8.2/§8.3): a top-down field of 5-foot tiles with
 * circular vector tokens, HP pips under each frame, movement and targeting
 * highlights, terrain and cover objects — all positioned with pure CSS
 * transforms so motion stays cheap and the reduced-motion toggle works.
 *
 * The animation pass (after Session 3) layers log-derived choreography on
 * top: tokens walk their BFS path square by square, melee attackers lunge
 * and struck tokens shake, ranged attacks loose arced projectiles, crits
 * burst and shake the field, Misty Step dissolves into a ghost, and a
 * fleeing token's last step fades to nothing. Everything derives from
 * battle-log entries (token-motion.ts, strike-fx.tsx) and self-expires —
 * no effect body ever touches game state.
 */

import { TokenConditions } from "@/components/battle/condition-icons";
import { EnemyToken } from "@/components/battle/enemy-token";
import { HeroToken } from "@/components/ui/hero-token";
import { FleeGhost, StrikeFx, TeleportGhost } from "@/components/battle/strike-fx";
import { getArena } from "@/content/arenas";
import { chebyshev, type Point } from "@/game/grid";
import { isDown } from "@/game/combat/core";
import type { BattleState, Combatant } from "@/game/types";
import { latestStrike, strikeRoleFor, useKeyedClass, useWalkPosition } from "./token-motion";
import { useEffect, useMemo, useRef, useState } from "react";

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

  // Crits shake the whole field — an imperative one-shot class on the
  // root (useKeyedClass), restarted per crit so the grid never remounts
  // mid-walk.
  const critStrike = useMemo(() => {
    const s = latestStrike(battle.log, 8);
    return s?.crit ? s : null;
  }, [battle.log]);
  const gridRef = useRef<HTMLDivElement>(null);
  useKeyedClass(
    gridRef,
    critStrike ? critStrike.index : null,
    "ga-grid-shake",
    700,
    critStrike?.melee ? 150 : 330
  );

  // The Misty Step ghost: silver silhouette dissolving at the origin.
  const tpGhost = useMemo(() => {
    for (let i = battle.log.length - 1; i >= Math.max(0, battle.log.length - 8); i--) {
      const e = battle.log[i];
      if (e.teleport) {
        const c = Object.values(battle.combatants).find((x) => x.name === e.actor);
        return { index: i, tp: e.teleport, heroId: c?.side === "party" ? c.ref : undefined, enemyRef: c?.side === "enemy" ? c.ref : undefined };
      }
    }
    return null;
  }, [battle.log, battle.combatants]);

  // A fleeing token's last step off the map edge, fading to nothing.
  const fleeGhost = useMemo(() => {
    for (let i = battle.log.length - 1; i >= Math.max(0, battle.log.length - 8); i--) {
      const e = battle.log[i];
      const m = e.move;
      if (!m || m.path.length === 0) continue;
      const last = m.path[m.path.length - 1];
      const off = last.x < 0 || last.y < 0 || last.x >= battle.width || last.y >= battle.height;
      if (!off) continue;
      const c = Object.values(battle.combatants).find((x) => x.name === e.actor);
      return { index: i, from: m.from, to: last, heroId: c?.side === "party" ? c.ref : undefined, enemyRef: c?.side === "enemy" ? c.ref : undefined };
    }
    return null;
  }, [battle.log, battle.combatants, battle.width, battle.height]);

  const activeId = battle.order[battle.activeIndex];
  const targetingIds = new Set(
    mode.kind === "attack" || mode.kind === "spell" || mode.kind === "help" || mode.kind === "item"
      ? mode.targetIds
      : []
  );

  return (
    <div
      ref={gridRef}
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
        const isActive = c.id === activeId && battle.status === "active";
        const isTargetable = targetingIds.has(c.id);
        return (
          <TokenSprite
            key={c.id}
            battle={battle}
            c={c}
            isActive={isActive}
            isTargetable={isTargetable}
            isPending={pendingTargets.includes(c.id)}
            isSelected={selectedId === c.id}
            dimOthers={
              (mode.kind === "attack" ||
                mode.kind === "spell" ||
                mode.kind === "help" ||
                mode.kind === "item") &&
              !isTargetable
            }
            onTokenClick={onTokenClick}
          />
        );
      })}

      {/* ── Attack choreography: projectiles, impacts, crit bursts ── */}
      <StrikeFx battle={battle} />

      {/* ── Ghosts: teleport origin & fleeing last step ── */}
      {tpGhost && (
        <TeleportGhost index={tpGhost.index} from={tpGhost.tp.from} heroId={tpGhost.heroId} enemyRef={tpGhost.enemyRef} />
      )}
      {fleeGhost && (
        <FleeGhost index={fleeGhost.index} from={fleeGhost.from} to={fleeGhost.to} heroId={fleeGhost.heroId} enemyRef={fleeGhost.enemyRef} />
      )}

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

/**
 * One token with its full motion stack (animation pass): the position
 * wrapper walks the latest move path at the locked 200 ms beat, the
 * keyed motion wrapper inside it carries the strike choreography
 * (lunge / recoil / shake / dodge / teleport-in) — each new log entry
 * remounts the wrapper so its CSS animation plays exactly once.
 */
function TokenSprite({
  battle,
  c,
  isActive,
  isTargetable,
  isPending,
  isSelected,
  dimOthers,
  onTokenClick,
}: {
  battle: BattleState;
  c: Combatant;
  isActive: boolean;
  isTargetable: boolean;
  isPending: boolean;
  isSelected: boolean;
  dimOthers: boolean;
  onTokenClick: (id: string) => void;
}) {
  const { pos, walking } = useWalkPosition(battle.log, c.name, c.position);

  // Strike choreography: the newest strike this token takes part in.
  const strikeInfo = strikeRoleFor(battle.log, c.id);
  // Teleport reform: the newest Misty Step by this actor.
  let tpIndex: number | null = null;
  for (let i = battle.log.length - 1; i >= Math.max(0, battle.log.length - 8); i--) {
    if (battle.log[i].teleport && battle.log[i].actor === c.name) {
      tpIndex = i;
      break;
    }
  }

  // The newest event wins (a Misty Step followed by Fire Bolt telegraphs both,
  // in order — the later strike re-keys the wrapper).
  const useTp = tpIndex != null && (strikeInfo == null || tpIndex > strikeInfo.index);

  let motionClass = "";
  let motionDelay: string | undefined;
  let motionVars: React.CSSProperties = {};
  let motionKey: string | number = "idle";

  if (useTp) {
    motionClass = "ga-tp-in";
    motionKey = `tp${tpIndex}`;
  } else if (strikeInfo) {
    const s = strikeInfo;
    const other =
      battle.combatants[s.role === "attacker" ? s.targetId : s.attackerId];
    const dx = other?.position && pos ? other.position.x - pos.x : 0;
    const dy = other?.position && pos ? other.position.y - pos.y : 0;
    motionVars = { "--ga-ldx": dx, "--ga-ldy": dy } as React.CSSProperties;
    motionKey = `st${s.index}`;
    if (s.role === "attacker") {
      motionClass = s.melee ? "ga-lunge" : "ga-recoil";
    } else if (s.hit) {
      motionClass = s.crit ? "ga-crit-shake" : "ga-hit-shake";
      motionDelay = s.melee ? "150ms" : "330ms";
    } else {
      motionClass = "ga-dodge";
      motionDelay = s.melee ? "200ms" : "380ms";
    }
  }

  const down = isDown(c);

  return (
    <div
      className="absolute"
      style={{
        transform: `translate(calc(var(--ga-ts) * ${pos?.x ?? 0}), calc(var(--ga-ts) * ${pos?.y ?? 0}))`,
        width: "var(--ga-ts)",
        height: "var(--ga-ts)",
        transition: walking ? "transform 200ms cubic-bezier(0.35, 0, 0.65, 1)" : undefined,
        zIndex: isActive ? 20 : 10,
      }}
    >
      <div
        key={motionKey}
        className={`h-full w-full ${motionClass}`}
        style={{ ...motionVars, animationDelay: motionDelay }}
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
          {isSelected && (
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
                  className={`h-[4px] w-[4px] rounded-full transition-colors duration-300 ${
                    filled ? "bg-healing" : "bg-slate-line/70"
                  }`}
                />
              ))}
            </span>
          )}
        </div>
      </div>
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
