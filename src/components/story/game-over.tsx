"use client";

/**
 * The game-over screen (GDD Table 3): total party kill — the run's
 * statistics, a route back to the last save slot, and the title screen.
 * The dead world is discarded when the player leaves.
 */

import { Button } from "@/components/ui/button";
import { useGameStore } from "@/state/store";
import { useUiStore } from "@/state/ui-store";
import { FolderOpen, Home, Skull } from "lucide-react";

export function GameOverScreen() {
  const stats = useGameStore((s) => s.gameOverStats);
  const newGame = useGameStore((s) => s.newGame);
  const setView = useUiStore((s) => s.setView);
  const setSaveOverlay = useUiStore((s) => s.setSaveOverlay);

  const s = stats?.stats;

  return (
    <div className="game-root flex min-h-screen items-center justify-center bg-slate-deep p-4">
      <div className="ga-parchment w-full max-w-md rounded-2xl border-4 border-fire/60 p-6 text-ink shadow-[0_24px_80px_rgba(10,14,20,0.8)]">
        <div className="flex flex-col items-center text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-fire/15">
            <Skull className="h-6 w-6 text-fire" aria-hidden="true" />
          </span>
          <p className="mt-3 font-display text-[11px] font-bold tracking-[0.3em] text-ink-soft uppercase">
            Total party kill
          </p>
          <h1 className="mt-1 font-display text-3xl font-extrabold tracking-wide">
            The Road Claims Another Company
          </h1>
          <p className="mt-2 font-prose text-sm leading-relaxed text-ink-soft italic">
            {stats
              ? `${stats.arenaTitle} — all four heroes are down. The wagon will drive itself no farther, and somewhere in the dark the Black Spider&apos;s errand grinds on without you.`
              : "All four heroes are down. The run returns to its last save slot."}
          </p>
        </div>

        {s && (
          <dl className="ga-tnum mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-ink/15 pt-4 text-sm">
            <dt className="text-ink-soft">Rounds fought</dt>
            <dd className="text-right font-bold">{s.roundsFought}</dd>
            <dt className="text-ink-soft">Party damage taken</dt>
            <dd className="text-right font-bold">{s.partyDamageTaken}</dd>
            <dt className="text-ink-soft">Party attacks</dt>
            <dd className="text-right font-bold">
              {s.partyHits}/{s.partyAttacks}
              {s.partyAttacks > 0 ? ` (${Math.round((s.partyHits / s.partyAttacks) * 100)}%)` : ""}
            </dd>
            <dt className="text-ink-soft">Enemy attacks</dt>
            <dd className="text-right font-bold">
              {s.enemyHits}/{s.enemyAttacks}
              {s.enemyAttacks > 0 ? ` (${Math.round((s.enemyHits / s.enemyAttacks) * 100)}%)` : ""}
            </dd>
          </dl>
        )}

        <div className="mt-5 flex flex-col gap-2">
          <Button
            onClick={() => setSaveOverlay(true, "load")}
            className="h-11 w-full bg-ember font-display text-sm font-bold tracking-[0.18em] text-slate-deep uppercase hover:bg-ember-bright"
          >
            <FolderOpen className="mr-2 h-4 w-4" aria-hidden="true" />
            Return to your last save
          </Button>
          <Button
            onClick={() => {
              newGame();
              setView("title");
            }}
            variant="secondary"
            className="h-11 w-full border-2 border-ink/25 font-display text-sm font-bold tracking-[0.18em] text-ink uppercase hover:bg-ink/5"
          >
            <Home className="mr-2 h-4 w-4" aria-hidden="true" />
            Back to the title screen
          </Button>
        </div>
      </div>
    </div>
  );
}
