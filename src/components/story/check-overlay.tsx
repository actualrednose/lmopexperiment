"use client";

/**
 * The skill-check overlay (GDD §5.1): the d20 rattles and lands on the
 * genuine engine result, the modifier slides in, and the total stamps
 * against the DC with a success or failure flourish — nothing about the
 * roll is hidden. The world advances only when the player continues.
 * Reduced motion collapses the sequence instantly (globals.css).
 */

import { Button } from "@/components/ui/button";
import { useGameStore } from "@/state/store";
import type { ResolvedCheck } from "@/game/scene-types";
import { useEffect, useState } from "react";

export function CheckOverlay() {
  const staged = useGameStore((s) => s.stagedTransition);
  const confirm = useGameStore((s) => s.confirmPendingCheck);

  if (!staged?.check) return null;
  // Keyed per roll: the inner component mounts fresh for each check, so
  // its mount-only timer effect replays the dice beat every time.
  return (
    <CheckOverlayInner
      key={`${staged.check.roller.heroId}-${staged.check.label}-${staged.check.dice.join("-")}`}
      check={staged.check}
      onConfirm={confirm}
    />
  );
}

function CheckOverlayInner({
  check,
  onConfirm,
}: {
  check: ResolvedCheck;
  onConfirm: () => void;
}) {
  const [ready, setReady] = useState(false);

  // The Continue button waits out the dice beat (~1.05 s of animation).
  // Mount-only, like the battle screen's expiring dice popup.
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 1050);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className="ga-fade-in fixed inset-0 z-50 flex items-center justify-center bg-slate-deep/85 p-4 backdrop-blur-sm"
      role="alert"
      aria-live="assertive"
    >
      <div className="ga-overlay-in ga-parchment w-full max-w-md rounded-2xl border-4 p-6 text-ink shadow-[0_24px_80px_rgba(10,14,20,0.8)]"
        style={{ borderColor: check.success ? "rgba(124,154,92,0.6)" : "rgba(196,87,63,0.6)" }}
      >
        <p className="text-center font-display text-[11px] font-bold tracking-[0.3em] text-ink-soft uppercase">
          {check.roller.name} · {check.label}
        </p>

        <CheckDiceBody check={check} />

        {check.advantageFrom && (
          <p className="mt-2 text-center font-prose text-xs text-ink-soft italic">
            with help — {check.advantageFrom}
          </p>
        )}
        {check.luckyRerolled !== undefined && (
          <p className="mt-2 text-center font-prose text-xs text-ink-soft italic">
            Lucky — Perrin rerolls a natural 1 (halfling fortune).
          </p>
        )}

        <Button
          onClick={() => onConfirm()}
          disabled={!ready}
          className="mt-5 h-11 w-full bg-ember font-display text-sm font-bold tracking-[0.22em] text-slate-deep uppercase hover:bg-ember-bright"
        >
          {ready ? "Continue" : "…"}
        </Button>
      </div>
    </div>
  );
}

function CheckDiceBody({ check }: { check: ResolvedCheck }) {
  // Faces to show: the kept die large; extras (the lost advantage die, a
  // Lucky reroll's origin) small and dimmed to its left.
  const keptIndex = check.dice.lastIndexOf(check.kept);
  const extras = check.dice.filter((_, i) => i !== keptIndex);
  const keptFace = check.kept;

  return (
    <div className="mt-4 flex items-center justify-center gap-4">
      {/* the discarded faces */}
      <div className="flex flex-col gap-1">
        {extras.map((face, i) => (
          <span
            key={i}
            className="ga-tnum flex h-8 w-8 items-center justify-center rounded-md border border-ink/20 bg-ink/5 font-display text-sm font-bold text-ink-soft line-through"
          >
            {face}
          </span>
        ))}
      </div>

      {/* the d20 that counted */}
      <span
        className={`ga-dice-face ga-tnum flex h-16 w-16 items-center justify-center rounded-xl border-2 font-display text-3xl font-extrabold ${
          keptFace === 20
            ? "border-radiant bg-radiant/15 text-radiant"
            : keptFace === 1
              ? "border-fire bg-fire/10 text-fire"
              : "border-ink/40 bg-ink/5 text-ink"
        }`}
      >
        {keptFace}
      </span>

      {/* the math */}
      <div className="ga-dice-mod flex flex-col items-start">
        <span className="ga-tnum font-display text-lg font-bold text-ink">
          {check.bonus >= 0 ? `+${check.bonus}` : check.bonus} ={" "}
          <span className={check.success ? "text-healing" : "text-fire"}>{check.total}</span>
        </span>
        <span className="ga-tnum text-sm font-semibold text-ink-soft">vs DC {check.dc}</span>
      </div>

      {/* the verdict */}
      <span
        className={`ga-dice-verdict rounded-lg px-3 py-2 font-display text-sm font-extrabold tracking-[0.18em] uppercase ${
          check.success ? "bg-healing/20 text-healing" : "bg-fire/20 text-fire"
        }`}
      >
        {check.success ? "Success" : "Failure"}
      </span>
    </div>
  );
}
