"use client";

/**
 * The dice popup (GDD §8.2): a d20 rattles, settles on its rolled face, then
 * slides its modifier in against the target number — 400 ms of motion, all
 * genuine engine rolls. The popup is derived from the log (the latest
 * highlighted roll) and expires via a self-hiding wrapper, so no effect
 * bodies set state. Reduced motion collapses everything instantly.
 */

import { useEffect, useState } from "react";
import type { BattleLogEntry, BattleState } from "@/game/types";

export function DicePopup({ battle }: { battle: BattleState }) {
  // The newest highlighted roll in the log — the popup's single source of
  // truth. A cheap backward scan; no manual memoization for the compiler
  // to preserve.
  let latest: { index: number; entry: BattleLogEntry } | null = null;
  for (let i = battle.log.length - 1; i >= 0; i--) {
    const entry = battle.log[i];
    if (entry.roll && entry.highlight) {
      latest = { index: i, entry };
      break;
    }
  }

  if (!latest || !latest.entry.roll) return null;
  return (
    <Expiring key={latest.index}>
      <PopupBody entry={latest.entry} />
    </Expiring>
  );
}

/** Shows its children for ~1.7 s, then hides until the key changes. */
function Expiring({ children }: { children: React.ReactNode }) {
  const [alive, setAlive] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setAlive(false), 1700);
    return () => clearTimeout(t);
  }, []);
  return <>{alive ? children : null}</>;
}

function PopupBody({ entry }: { entry: BattleLogEntry }) {
  const roll = entry.roll!;
  const dice = roll.dice ?? (roll.d20 !== undefined ? [roll.d20] : []);
  const mod = roll.modifier ?? 0;
  const success = roll.success === true;

  return (
    <div
      aria-live="polite"
      className="ga-dice-pop pointer-events-none absolute bottom-4 left-1/2 z-30 -translate-x-1/2"
    >
      <div
        className="ga-panel flex items-center gap-3 rounded-xl border px-4 py-2.5 shadow-[0_10px_36px_rgba(10,14,20,0.6)]"
        style={{ borderColor: success ? "rgba(124,154,92,0.55)" : "rgba(196,87,63,0.55)" }}
      >
        {/* the d20 faces — two when advantage/disadvantage */}
        <div className="flex items-center gap-1.5">
          {dice.map((face, i) => (
            <span
              key={i}
              className={`ga-dice-face ga-tnum flex h-10 w-10 items-center justify-center rounded-lg border font-display text-lg font-extrabold ${
                i === dice.length - 1 && dice.length > 1
                  ? "border-ember bg-ember/20 text-ember-bright"
                  : "border-slate-line bg-slate-deep text-mist"
              } ${face === 20 ? "!border-radiant !text-radiant" : ""} ${
                face === 1 ? "!border-fire !text-fire" : ""
              }`}
            >
              {face}
            </span>
          ))}
        </div>

        {/* modifier slide-in */}
        <div className="ga-dice-mod flex flex-col items-start leading-none">
          {dice.length > 1 && roll.mode && (
            <span className="mb-1 text-[9px] font-semibold tracking-wider text-ember-bright uppercase">
              {roll.mode}
            </span>
          )}
          <span className="ga-tnum text-sm font-bold text-mist">
            {mod >= 0 ? `+${mod}` : mod} ={" "}
            <span className={success ? "text-healing" : "text-fire"}>{roll.total}</span>
            {roll.target !== undefined && (
              <span className="text-mist-dim"> vs {roll.target}</span>
            )}
          </span>
          {roll.source && (
            <span className="mt-0.5 text-[10px] text-mist-dim italic">{roll.source}</span>
          )}
        </div>

        {/* verdict stamp */}
        {roll.target !== undefined && (
          <span
            className={`ga-dice-verdict rounded-md px-2 py-1 text-[11px] font-bold tracking-widest uppercase ${
              success ? "bg-healing/15 text-healing" : "bg-fire/15 text-fire"
            }`}
          >
            {roll.tag.includes("save")
              ? success
                ? "Saved"
                : "Failed"
              : roll.tag.includes("stealth")
                ? success
                  ? "Hidden"
                  : "Spotted"
                : success
                  ? "Hit"
                  : "Miss"}
          </span>
        )}
      </div>
    </div>
  );
}
