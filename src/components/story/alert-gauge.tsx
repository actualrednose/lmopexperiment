"use client";

/**
 * The alert gauge (GDD §5.3): a torch-shaped ladder from Unaware to
 * Fortress, shown in the story header inside the hideout (or whenever the
 * party has been heard). Visible pressure reads as tactics — the meter
 * never decreases.
 */

import { getScene } from "@/content/story";
import { useGameStore } from "@/state/store";
import { cn } from "@/lib/utils";
import type { AlertLevel } from "@/game/types";

const ALERT_STATES: Record<AlertLevel, string> = {
  0: "Unaware",
  1: "Suspicious",
  2: "Hunting",
  3: "Fortress",
};

export function AlertGauge({ level }: { level: AlertLevel }) {
  return (
    <div
      className="flex shrink-0 items-center gap-1.5"
      title={`Hideout alert: ${ALERT_STATES[level]} — the ladder never decreases (GDD §5.3)`}
      aria-label={`Hideout alert level ${level} of 3: ${ALERT_STATES[level]}`}
    >
      {/* torch */}
      <svg width="16" height="20" viewBox="0 0 16 20" aria-hidden="true">
        <g className={level > 0 ? "ga-glow" : undefined}>
          <path
            d="M8 1 C10.5 4 12 6 12 8.5 C12 11 10.2 12.6 8 12.6 C5.8 12.6 4 11 4 8.5 C4 6 5.5 4 8 1 Z"
            fill={level > 0 ? "#E8A97C" : "#4A5C7D"}
          />
          <path
            d="M8 5 C9.2 6.6 9.8 7.6 9.8 8.8 C9.8 10.2 9 11 8 11 C7 11 6.2 10.2 6.2 8.8 C6.2 7.6 6.8 6.6 8 5 Z"
            fill={level > 0 ? "#F5EFE2" : "#3A4A66"}
          />
        </g>
        <rect x="6.6" y="12.6" width="2.8" height="6.4" rx="1" fill="#7A5C40" />
      </svg>
      {/* the four-step ladder */}
      <span className="flex items-end gap-0.5" aria-hidden="true">
        {[0, 1, 2, 3].map((step) => (
          <span
            key={step}
            className={cn(
              "w-1.5 rounded-sm transition-colors",
              step === 0 ? "h-2" : step === 1 ? "h-2.5" : step === 2 ? "h-3" : "h-3.5",
              step <= level ? (level >= 3 ? "bg-fire" : "bg-ember") : "bg-slate-line"
            )}
          />
        ))}
      </span>
      <span
        className={cn(
          "hidden text-[10px] font-bold tracking-[0.14em] uppercase md:inline",
          level >= 3 ? "text-fire" : level > 0 ? "text-ember-bright" : "text-mist-dim"
        )}
      >
        {ALERT_STATES[level]}
      </span>
    </div>
  );
}

/** Header convenience: reads the world and hides itself outside the hideout. */
export function AlertGaugeIfVisible() {
  const alertLevel = useGameStore((s) => s.alertLevel);
  const sceneId = useGameStore((s) => s.sceneId);
  if (alertLevel === 0 && !isHideoutScene(sceneId)) return null;
  return <AlertGauge level={alertLevel} />;
}

function isHideoutScene(sceneId: string | null): boolean {
  if (!sceneId) return false;
  // Act III+ scenes show the gauge even at Unaware (§5.3: "inside the
  // hideout"); the act lives on the scene record.
  try {
    return getScene(sceneId).act >= 3;
  } catch {
    return false;
  }
}
