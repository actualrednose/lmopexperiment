"use client";

/**
 * Enemy vector tokens (GDD §8.3): bestial silhouettes on colored rings —
 * goblins get a rust-red ring and a leering ear-silhouette, wolves a
 * slate-blue ring with a snout profile, Klarg a physically larger brute
 * frame with a crown notch, and Yeemik a gilded ring marking him as the
 * lair's politician. Pure SVG, no raster assets.
 */

import type { EnemyId } from "@/game/types";

interface EnemyArt {
  ring: string;
  label: string;
  /** Relative token scale (Klarg is physically larger). */
  scale: number;
}

const ENEMY_ART: Record<EnemyId, EnemyArt> = {
  goblin: { ring: "#C4573F", label: "Goblin token", scale: 1 },
  wolf: { ring: "#6C8BA4", label: "Wolf token", scale: 1 },
  klarg: { ring: "#A6543F", label: "Klarg token", scale: 1.3 },
  yeemik: { ring: "#D9A93F", label: "Yeemik token", scale: 1.05 },
};

export interface EnemyTokenProps {
  ref_: EnemyId;
  size?: number;
  className?: string;
}

export function EnemyToken({ ref_, size = 44, className }: EnemyTokenProps) {
  const art = ENEMY_ART[ref_];
  const s = size * art.scale;
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 64 64"
      role="img"
      aria-label={art.label}
      className={className}
    >
      <defs>
        <radialGradient id={`ga-et-${ref_}`} cx="0.5" cy="0.38" r="0.75">
          <stop offset="0%" stopColor="#33415A" />
          <stop offset="100%" stopColor="#1A2330" />
        </radialGradient>
      </defs>
      <circle cx="32" cy="32" r="29.5" fill="none" stroke={art.ring} strokeWidth="3" />
      <circle cx="32" cy="32" r="26" fill={`url(#ga-et-${ref_})`} />
      <circle cx="32" cy="32" r="26" fill={art.ring} fillOpacity="0.07" />
      <circle cx="32" cy="32" r="26" fill="none" stroke="#3A4A66" strokeWidth="1" />
      {ref_ === "goblin" && <GoblinSilhouette color={art.ring} />}
      {ref_ === "wolf" && <WolfSilhouette color={art.ring} />}
      {ref_ === "klarg" && <KlargSilhouette color={art.ring} />}
      {ref_ === "yeemik" && <YeemikSilhouette color={art.ring} />}
    </svg>
  );
}

type SigilProps = { color: string };

/* ── Goblin: leering ear-silhouette ── */
function GoblinSilhouette({ color }: SigilProps) {
  return (
    <g>
      <path
        d="M18 34 C18 24, 25 19, 32 19 C39 19, 46 24, 46 34 C46 42, 40 47, 32 47 C24 47, 18 42, 18 34 Z"
        fill={color}
        fillOpacity="0.2"
        stroke={color}
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      {/* long pointed ears */}
      <path d="M18 30 L8 20 L17 22 Z" fill={color} fillOpacity="0.85" />
      <path d="M46 30 L56 20 L47 22 Z" fill={color} fillOpacity="0.85" />
      {/* eyes */}
      <circle cx="26.5" cy="32" r="2" fill={color} />
      <circle cx="37.5" cy="32" r="2" fill={color} />
      {/* the leer */}
      <path
        d="M24.5 39 C27 42, 37 42, 39.5 39"
        fill="none"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path d="M27 39.5 L28.4 41.6 M31 40.4 L31 42.6 M35 39.5 L33.6 41.6" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
    </g>
  );
}

/* ── Wolf: snout profile ── */
function WolfSilhouette({ color }: SigilProps) {
  return (
    <g>
      <path
        d="M12 36 C14 26, 22 20, 32 20 C41 20, 48 25, 51 32 L58 38 L51 40 L50 45 L44 44 C41 47, 35 48, 30 47 L22 50 L21 44 C15 42, 11.5 40, 12 36 Z"
        fill={color}
        fillOpacity="0.22"
        stroke={color}
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      {/* ears */}
      <path d="M24 22 L22 12 L29 18 Z" fill={color} fillOpacity="0.85" />
      <path d="M36 20 L38 11 L42 19 Z" fill={color} fillOpacity="0.85" />
      {/* eye */}
      <circle cx="26" cy="30" r="1.9" fill={color} />
      {/* snout line */}
      <path d="M47 38 L52 37.5" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    </g>
  );
}

/* ── Klarg: hulking brute frame with a crown notch ── */
function KlargSilhouette({ color }: SigilProps) {
  return (
    <g>
      <path
        d="M15 46 C13 32, 21 21, 32 21 C43 21, 51 32, 49 46 C44 49, 20 49, 15 46 Z"
        fill={color}
        fillOpacity="0.22"
        stroke={color}
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      {/* crown notch */}
      <path d="M25 21 L27 13 L31 19 L35 12 L38 19 L42 14 L43 21 Z" fill={color} fillOpacity="0.85" />
      {/* heavy brow eyes */}
      <path d="M21 30 L29 28" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M43 30 L35 28" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="26" cy="33" r="2.1" fill={color} />
      <circle cx="38" cy="33" r="2.1" fill={color} />
      {/* tusks */}
      <path d="M27 43 L26 47.5 M37 43 L38 47.5" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M23 41 C27 44.5, 37 44.5, 41 41" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </g>
  );
}

/* ── Yeemik: goblin silhouette with the gilded grin ── */
function YeemikSilhouette({ color }: SigilProps) {
  return (
    <g>
      <path
        d="M19 34 C19 25, 25 20, 32 20 C39 20, 45 25, 45 34 C45 41.5, 39.5 46.5, 32 46.5 C24.5 46.5, 19 41.5, 19 34 Z"
        fill={color}
        fillOpacity="0.2"
        stroke={color}
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path d="M19 30 L10 21 L18 23 Z" fill={color} fillOpacity="0.85" />
      <path d="M45 30 L54 21 L46 23 Z" fill={color} fillOpacity="0.85" />
      <circle cx="26.5" cy="32.5" r="2" fill={color} />
      <circle cx="37.5" cy="32.5" r="2" fill={color} />
      {/* the politician's grin */}
      <path
        d="M24.5 39.5 C27.5 42.5, 36.5 42.5, 39.5 39.5"
        fill="none"
        stroke={color}
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <circle cx="49" cy="46" r="3.4" fill="none" stroke={color} strokeWidth="1.6" />
      <path d="M47.6 44.6 L50.4 47.4 M50.4 44.6 L47.6 47.4" stroke={color} strokeWidth="1.1" />
    </g>
  );
}
