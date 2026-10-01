"use client";

/**
 * Hero vector tokens (GDD §8.3) — colored roundels with class sigils,
 * each ringed with a race accent. No raster assets: every token is SVG
 * drawn in code, so the whole set stays themeable and resolution-independent.
 *
 *   Torvald  shield & hammer   ember (fighter)
 *   Perrin   hooded dagger     steel (rogue)
 *   Maera    sunburst chalice  radiant gold (cleric)
 *   Elyndra  star & orb        arcane violet (wizard)
 */

import { useId } from "react";
import type { HeroId } from "@/game/types";

interface HeroTokenArt {
  /** Class color — the sigil and disc wash. */
  classColor: string;
  /** Race accent — the outer ring. */
  raceAccent: string;
  label: string;
}

const HERO_ART: Record<HeroId, HeroTokenArt> = {
  torvald: { classColor: "#D4875A", raceAccent: "#C08552", label: "Torvald Ironfell token" },
  perrin: { classColor: "#9FB0C6", raceAccent: "#7C9A5C", label: "Perrin Underbough token" },
  maera: { classColor: "#D9A93F", raceAccent: "#D9CBA8", label: "Sister Maera token" },
  elyndra: { classColor: "#9079B8", raceAccent: "#6FAE9B", label: "Elyndra Moonwhisper token" },
};

export interface HeroTokenProps {
  heroId: HeroId;
  /** Rendered size in px (default 64). */
  size?: number;
  className?: string;
}

export function HeroToken({ heroId, size = 64, className }: HeroTokenProps) {
  const art = HERO_ART[heroId];
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const gradId = `ga-token-grad-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label={art.label}
      className={className}
    >
      <defs>
        <radialGradient id={gradId} cx="0.5" cy="0.38" r="0.75">
          <stop offset="0%" stopColor="#33415A" />
          <stop offset="100%" stopColor="#1A2330" />
        </radialGradient>
      </defs>

      {/* race accent ring */}
      <circle cx="32" cy="32" r="29.5" fill="none" stroke={art.raceAccent} strokeWidth="3" />
      {/* class roundel */}
      <circle cx="32" cy="32" r="26" fill={`url(#${gradId})`} />
      <circle cx="32" cy="32" r="26" fill={art.classColor} fillOpacity="0.08" />
      <circle cx="32" cy="32" r="26" fill="none" stroke="#3A4A66" strokeWidth="1" />

      {heroId === "torvald" && <ShieldHammer color={art.classColor} />}
      {heroId === "perrin" && <HoodedDagger color={art.classColor} />}
      {heroId === "maera" && <SunburstChalice color={art.classColor} />}
      {heroId === "elyndra" && <StarOrb color={art.classColor} />}
    </svg>
  );
}

type SigilProps = { color: string };

/* ── Torvald: heater shield with a crossed hammer ── */
function ShieldHammer({ color }: SigilProps) {
  return (
    <g>
      <path
        d="M32 13.5 L47.5 18.5 V30 C47.5 41 41 47.5 32 51.5 C23 47.5 16.5 41 16.5 30 V18.5 Z"
        fill={color}
        fillOpacity="0.18"
        stroke={color}
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <g transform="rotate(-42 32 33)">
        <rect x="30.4" y="20" width="3.2" height="24" rx="1" fill={color} />
        <rect x="23.5" y="15.5" width="17" height="8.5" rx="1.6" fill={color} />
      </g>
    </g>
  );
}

/* ── Perrin: hood with a dagger beneath ── */
function HoodedDagger({ color }: SigilProps) {
  return (
    <g>
      <path
        d="M32 11.5 C23.5 11.5 19.5 18.5 19.5 26.5 V37.5 H44.5 V26.5 C44.5 18.5 40.5 11.5 32 11.5 Z"
        fill={color}
        fillOpacity="0.16"
        stroke={color}
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <ellipse cx="32" cy="27" rx="6" ry="7" fill="#1A2330" fillOpacity="0.65" />
      <rect x="27.2" y="35.2" width="9.6" height="2.6" rx="1.2" fill={color} />
      <path d="M32 52 L28.6 38 H35.4 Z" fill={color} />
      <circle cx="32" cy="32.6" r="1.9" fill={color} />
    </g>
  );
}

/* ── Maera: morning sunburst over a chalice ── */
function SunburstChalice({ color }: SigilProps) {
  const rays = Array.from({ length: 8 }, (_, i) => {
    const a = (Math.PI / 4) * i;
    const cx = 32 + Math.cos(a) * 21;
    const cy = 30 + Math.sin(a) * 21;
    const x2 = 32 + Math.cos(a) * 26;
    const y2 = 30 + Math.sin(a) * 26;
    return (
      <line
        key={i}
        x1={cx}
        y1={cy}
        x2={x2}
        y2={y2}
        stroke={color}
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    );
  });
  return (
    <g>
      {rays}
      <path
        d="M26.5 26 C26.5 35.5 29 39.5 32 41.5 C35 39.5 37.5 35.5 37.5 26 Z"
        fill={color}
        fillOpacity="0.9"
        stroke={color}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <rect x="30.7" y="41" width="2.6" height="6" rx="0.8" fill={color} />
      <ellipse cx="32" cy="48.6" rx="5.4" ry="1.9" fill={color} />
    </g>
  );
}

/* ── Elyndra: four-point star behind an orb ── */
function StarOrb({ color }: SigilProps) {
  return (
    <g>
      <path
        d="M32 9.5 L35.4 28.6 L54.5 32 L35.4 35.4 L32 54.5 L28.6 35.4 L9.5 32 L28.6 28.6 Z"
        fill={color}
        fillOpacity="0.18"
        stroke={color}
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <circle cx="32" cy="32" r="7.6" fill={color} />
      <circle cx="32" cy="32" r="7.6" fill="none" stroke="#F5EFE2" strokeOpacity="0.5" strokeWidth="1" />
      <path
        d="M28.6 29.4 A4.6 4.6 0 0 1 32.4 28.2"
        fill="none"
        stroke="#F5EFE2"
        strokeOpacity="0.85"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </g>
  );
}
