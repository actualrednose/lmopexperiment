"use client";

/**
 * The strike layer (animation pass): log-derived point-of-action effects
 * rendered above the grid — arced projectiles for ranged attacks, impact
 * rings at the point of contact, the radiant double-ring crit burst, the
 * Misty Step silver-mist ghost and the fading step of an escaping token.
 * Like the dice popup and floaters, everything is derived from the newest
 * matching log entries, self-expires, and never touches game state.
 */

import { EnemyToken } from "@/components/battle/enemy-token";
import { HeroToken } from "@/components/ui/hero-token";
import type { BattleState } from "@/game/types";
import { latestStrike } from "./token-motion";
import { useEffect, useState } from "react";

/* ════════════════════════ Shared bits ════════════════════════ */

/** Shows its children for a spell, then hides until the key changes. */
function Expiring({
  ms,
  children,
}: {
  ms: number;
  children: React.ReactNode;
}) {
  const [alive, setAlive] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setAlive(false), ms);
    return () => clearTimeout(t);
  }, []);
  return <>{alive ? children : null}</>;
}

const RING_COLORS: Record<string, string> = {
  arrow: "#e8a97c",
  fire: "#c4573f",
  radiant: "#d9a93f",
  dart: "#9079b8",
  melee: "#e8a97c",
};

function ringColor(flavor?: string): string {
  return RING_COLORS[flavor ?? "melee"] ?? RING_COLORS.melee;
}

/* ════════════════════════ Projectile art ════════════════════════ */

function ProjectileArt({ flavor }: { flavor?: string }) {
  if (flavor === "fire") {
    return (
      <span className="relative block h-3.5 w-3.5">
        <span className="absolute inset-0 rounded-full bg-fire/60 blur-[2px]" />
        <span className="absolute inset-[22%] rounded-full bg-fire" />
      </span>
    );
  }
  if (flavor === "radiant") {
    return (
      <svg viewBox="0 0 16 16" className="block h-4 w-4" aria-hidden="true">
        <path d="M8 0 C10 5, 12 6, 12 9 A4 4 0 1 1 4 9 C4 6, 6 5, 8 0 Z" fill="#d9a93f" />
        <circle cx="8" cy="10" r="1.6" fill="#f5efe2" />
      </svg>
    );
  }
  if (flavor === "dart") {
    return (
      <svg viewBox="0 0 18 12" className="block h-3 w-4.5" aria-hidden="true">
        <path d="M0 6 L12 1 L9 6 L12 11 Z" fill="#9079b8" />
        <path d="M13 3.5 L17 6 L13 8.5 Z" fill="#c9bce0" />
      </svg>
    );
  }
  // arrow — black-fletched, ember head (the title-screen motif)
  return (
    <svg viewBox="0 0 22 6" className="block h-1.5 w-5.5" aria-hidden="true">
      <line x1="1" y1="3" x2="17" y2="3" stroke="#8a7358" strokeWidth="1.4" />
      <path d="M17 3 L21.5 3 L18.4 1.2 Z M17 3 L21.5 3 L18.4 4.8 Z" fill="#c4573f" />
      <path d="M1 3 L4 1.1 L3 3 L4 4.9 Z M5 3 L8 1.3 L7 3 L8 4.7 Z" fill="#2a251c" />
    </svg>
  );
}

/* ════════════════════════ The strike layer ════════════════════════ */

export function StrikeFx({ battle }: { battle: BattleState }) {
  const strike = latestStrike(battle.log, 8);
  if (!strike) return null;
  const attacker = battle.combatants[strike.attackerId];
  const target = battle.combatants[strike.targetId];
  if (!attacker?.position || !target?.position) return null;

  return (
    <Expiring key={strike.index} ms={1050}>
      {/* ranged: the projectile arcs shooter → target */}
      {!strike.melee && (
        <span
          className="pointer-events-none absolute z-30"
          style={
            {
              left: `calc(var(--ga-ts) * ${attacker.position.x})`,
              top: `calc(var(--ga-ts) * ${attacker.position.y})`,
              width: "var(--ga-ts)",
              height: "var(--ga-ts)",
              "--ga-dx": target.position.x - attacker.position.x,
              "--ga-dy": target.position.y - attacker.position.y,
              "--ga-ang": `${
                (Math.atan2(
                  target.position.y - attacker.position.y,
                  target.position.x - attacker.position.x
                ) *
                  180) /
                Math.PI
              }deg`,
            } as React.CSSProperties
          }
        >
          <span
            className="ga-proj absolute"
            style={{ left: "50%", top: "50%", marginLeft: -8, marginTop: -8 }}
          >
            <ProjectileArt flavor={strike.flavor} />
          </span>
        </span>
      )}

      {/* impact ring at the target — timed to the blow landing */}
      {strike.hit && (
        <span
          className="ga-impact-ring pointer-events-none absolute z-30 rounded-full border-2"
          style={{
            left: `calc(var(--ga-ts) * ${target.position.x} + var(--ga-ts) / 2)`,
            top: `calc(var(--ga-ts) * ${target.position.y} + var(--ga-ts) / 2)`,
            width: "calc(var(--ga-ts) * 0.9)",
            height: "calc(var(--ga-ts) * 0.9)",
            borderColor: ringColor(strike.flavor),
            animationDelay: strike.melee ? "150ms" : "330ms",
          }}
        />
      )}

      {/* crit burst: radiant double ring + rays, then the field flinches */}
      {strike.crit && (
        <>
          <span
            className="ga-crit-ring pointer-events-none absolute z-30 rounded-full border-2 border-radiant"
            style={{
              left: `calc(var(--ga-ts) * ${target.position.x} + var(--ga-ts) / 2)`,
              top: `calc(var(--ga-ts) * ${target.position.y} + var(--ga-ts) / 2)`,
              width: "calc(var(--ga-ts) * 0.9)",
              height: "calc(var(--ga-ts) * 0.9)",
              animationDelay: strike.melee ? "150ms" : "330ms",
            }}
          />
          <span
            className="ga-crit-ring-2 pointer-events-none absolute z-30 rounded-full border border-radiant/70"
            style={{
              left: `calc(var(--ga-ts) * ${target.position.x} + var(--ga-ts) / 2)`,
              top: `calc(var(--ga-ts) * ${target.position.y} + var(--ga-ts) / 2)`,
              width: "calc(var(--ga-ts) * 0.7)",
              height: "calc(var(--ga-ts) * 0.7)",
              animationDelay: strike.melee ? "290ms" : "470ms",
            }}
          />
        </>
      )}
    </Expiring>
  );
}

/* ════════════════════════ Ghosts ════════════════════════ */

/** The Misty Step ghost: a silver silhouette dissolving at the origin. */
export function TeleportGhost({
  index,
  from,
  heroId,
  enemyRef,
}: {
  index: number;
  from: { x: number; y: number };
  heroId?: string;
  enemyRef?: string;
}) {
  return (
    <Expiring key={index} ms={600}>
      <div
        className="ga-tp-out pointer-events-none absolute z-20 opacity-80"
        style={{
          left: `calc(var(--ga-ts) * ${from.x})`,
          top: `calc(var(--ga-ts) * ${from.y})`,
          width: "var(--ga-ts)",
          height: "var(--ga-ts)",
        }}
      >
        <div className="flex h-full w-full items-center justify-center">
          {heroId ? (
            <HeroToken heroId={heroId as "torvald"} size={undefined} className="h-[86%] w-[86%] grayscale" />
          ) : (
            <EnemyToken ref_={(enemyRef ?? "goblin") as "goblin"} size={undefined} className="h-[86%] w-[86%] grayscale" />
          )}
        </div>
      </div>
    </Expiring>
  );
}

/** A fleeing token's last step off the map edge, fading to nothing. */
export function FleeGhost({
  index,
  from,
  to,
  heroId,
  enemyRef,
}: {
  index: number;
  from: { x: number; y: number };
  to: { x: number; y: number };
  heroId?: string;
  enemyRef?: string;
}) {
  const [stepped, setStepped] = useState(false);
  useEffect(() => {
    const r = requestAnimationFrame(() => setStepped(true));
    return () => cancelAnimationFrame(r);
  }, []);
  return (
    <Expiring key={index} ms={900}>
      <div
        className="ga-flee-ghost pointer-events-none absolute z-20"
        style={{
          left: `calc(var(--ga-ts) * ${stepped ? to.x : from.x})`,
          top: `calc(var(--ga-ts) * ${stepped ? to.y : from.y})`,
          width: "var(--ga-ts)",
          height: "var(--ga-ts)",
        }}
      >
        <div className="flex h-full w-full items-center justify-center">
          {heroId ? (
            <HeroToken heroId={heroId as "torvald"} size={undefined} className="h-[86%] w-[86%]" />
          ) : (
            <EnemyToken ref_={(enemyRef ?? "goblin") as "goblin"} size={undefined} className="h-[86%] w-[86%]" />
          )}
        </div>
      </div>
    </Expiring>
  );
}
