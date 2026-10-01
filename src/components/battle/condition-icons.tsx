"use client";

/**
 * Status icons (GDD §8.3): shape-and-color pairs so color is never the only
 * signal — an eye with a slash for Hidden, a star for Blessed, a spiral for
 * sleep, a boot-slip for Prone, a spark for Surprised.
 */

interface IconProps {
  size?: number;
  className?: string;
}

export function HiddenIcon({ size = 14, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" className={className} aria-hidden="true">
      <path
        d="M1.5 8 C3.5 4.5, 12.5 4.5, 14.5 8 C12.5 11.5, 3.5 11.5, 1.5 8 Z"
        fill="none"
        stroke="#9FB0C6"
        strokeWidth="1.4"
      />
      <circle cx="8" cy="8" r="1.8" fill="#9FB0C6" />
      <line x1="2.5" y1="13.5" x2="13.5" y2="2.5" stroke="#C4573F" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function ProneIcon({ size = 14, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" className={className} aria-hidden="true">
      <path
        d="M3 5 L9 5 M13 5 L13.01 5"
        stroke="#D4875A"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M3 5 C3 8, 6 8, 8 9.5 C9.5 10.6, 12 10.8, 13.5 9.5"
        fill="none"
        stroke="#D4875A"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path d="M10.5 12.8 L12.8 10.8 L13.6 12.2 Z" fill="#D4875A" />
    </svg>
  );
}

export function SleepIcon({ size = 14, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" className={className} aria-hidden="true">
      <path
        d="M8 8 m-4.5 0 a4.5 4.5 0 1 0 4.5 -4.5 a3.6 3.6 0 1 0 3.6 3.6 a2.7 2.7 0 1 0 -2.7 -2.7"
        fill="none"
        stroke="#9079B8"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function BlessIcon({ size = 14, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" className={className} aria-hidden="true">
      <path
        d="M8 1.5 L9.4 6 L14 7.4 L9.4 8.8 L8 13.4 L6.6 8.8 L2 7.4 L6.6 6 Z"
        fill="#D9A93F"
      />
    </svg>
  );
}

export function SurprisedIcon({ size = 14, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" className={className} aria-hidden="true">
      <path
        d="M8 1.5 L9.6 6 L14.5 6.2 L10.7 9 L12 14 L8 11.2 L4 14 L5.3 9 L1.5 6.2 L6.4 6 Z"
        fill="#E8A97C"
      />
    </svg>
  );
}

import type { Combatant } from "@/game/types";

/** The conditions and spell states that render on a token. */
export function TokenConditions({ c }: { c: Combatant }) {
  return (
    <span className="pointer-events-none absolute -top-1 -right-1 flex flex-col gap-0.5">
      {c.conditions.map((cond) =>
        cond === "Hidden" ? (
          <HiddenIcon key={cond} size={13} className="drop-shadow" />
        ) : cond === "Prone" ? (
          <ProneIcon key={cond} size={13} className="drop-shadow" />
        ) : cond === "Surprised" ? (
          <SurprisedIcon key={cond} size={13} className="drop-shadow" />
        ) : null
      )}
      {c.sleeping && <SleepIcon key="sleep" size={13} className="drop-shadow" />}
      {c.blessRounds > 0 && <BlessIcon key="bless" size={13} className="drop-shadow" />}
    </span>
  );
}

/** Chips for the target card. */
export function ConditionChips({ c }: { c: Combatant }) {
  const chips: { label: string; color: string }[] = [];
  if (c.conditions.includes("Hidden"))
    chips.push({ label: "Hidden", color: "text-mist-dim" });
  if (c.conditions.includes("Prone")) chips.push({ label: "Prone", color: "text-ember" });
  if (c.conditions.includes("Surprised"))
    chips.push({ label: "Surprised", color: "text-ember-bright" });
  if (c.conditions.includes("Down"))
    chips.push({ label: "Down", color: "text-mist-dim" });
  if (c.sleeping) chips.push({ label: "Asleep", color: "text-arcane" });
  if (c.blessRounds > 0)
    chips.push({ label: `Bless ${c.blessRounds}r`, color: "text-radiant" });
  if (c.dodging) chips.push({ label: "Dodging", color: "text-mist-dim" });
  if (c.fleeing) chips.push({ label: "Fleeing", color: "text-ember-bright" });
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((chip) => (
        <span
          key={chip.label}
          className={`rounded-sm border border-slate-line bg-slate-deep/70 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${chip.color}`}
        >
          {chip.label}
        </span>
      ))}
    </div>
  );
}
