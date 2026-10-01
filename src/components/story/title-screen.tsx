"use client";

/**
 * The title screen (GDD Table 13): logo lockup, New Game, Continue
 * (save slots), the party roster, and the reduced-motion toggle.
 * The tableau is pure vector work — gradient dusk over the Triboar
 * Trail, hill silhouettes, and the ambush's black-fletched arrows
 * planted in the road.
 */

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useGameStore } from "@/state/store";
import { useUiStore } from "@/state/ui-store";
import { useSyncExternalStore } from "react";

/* Client-only seed snapshot helpers (hydration-safe read). */
const subscribeNoop = () => () => {};
const getSeedSnapshot = () => useGameStore.getState().rng.seed;

export function TitleScreen() {
  const newGame = useGameStore((s) => s.newGame);
  const setView = useUiStore((s) => s.setView);
  const setSaveOverlay = useUiStore((s) => s.setSaveOverlay);
  const reducedMotion = useUiStore((s) => s.reducedMotion);
  const setReducedMotion = useUiStore((s) => s.setReducedMotion);
  const { toast } = useToast();
  // The seed is client-only: freshWorld() draws different seeds on server and
  // client, so it is read through useSyncExternalStore with a null server
  // snapshot — the canonical hydration-safe pattern.
  const seed = useSyncExternalStore(subscribeNoop, getSeedSnapshot, () => null);

  const handleNewGame = () => {
    newGame();
    toast({
      title: "A new run begins",
      description: `The dice are cast from seed #${useGameStore
        .getState()
        .rng.seed.toString(10)} — identical seeds replay identical games.`,
    });
    setView("roster");
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-slate-deep">
      {/* ── Vector tableau: dusk over the Triboar Trail ── */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-[62vh]"
        style={{
          background:
            "linear-gradient(180deg, #202B3D 0%, #2B2740 38%, #503A46 66%, #6B4A45 84%, #7A554A 100%)",
        }}
      >
        <svg
          className="ga-drift absolute inset-0 h-full w-full"
          viewBox="0 0 900 420"
          preserveAspectRatio="xMidYMax slice"
        >
          <defs>
            <radialGradient id="ga-dusk-sun" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0%" stopColor="#E8A97C" stopOpacity="0.55" />
              <stop offset="55%" stopColor="#D4875A" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#D4875A" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* low sun glow on the horizon */}
          <circle cx="500" cy="298" r="120" fill="url(#ga-dusk-sun)" />

          {/* far ridge with pine silhouettes */}
          <path
            d="M0 300 L120 262 L260 294 L400 252 L560 290 L720 254 L900 298 V420 H0 Z"
            fill="#232E3F"
          />
          <g fill="#141C27">
            <path d="M84 268 l9 -27 l9 27 z" />
            <path d="M110 272 l7 -21 l7 21 z" />
            <path d="M392 258 l10 -30 l10 30 z" />
            <path d="M418 262 l7 -22 l7 22 z" />
            <path d="M704 260 l9 -26 l9 26 z" />
            <path d="M728 264 l7 -20 l7 20 z" />
            <path d="M596 294 l8 -23 l8 23 z" />
            <path d="M214 298 l8 -23 l8 23 z" />
          </g>

          {/* near ridge, darker */}
          <path
            d="M0 420 V336 L150 356 L310 336 L520 362 L710 338 L900 358 V420 Z"
            fill="#161F2B"
          />
          <g fill="#101823">
            <path d="M60 352 l11 -34 l11 34 z" />
            <path d="M92 358 l8 -24 l8 24 z" />
            <path d="M322 342 l11 -32 l11 32 z" />
            <path d="M352 348 l8 -23 l8 23 z" />
            <path d="M676 346 l11 -33 l11 33 z" />
            <path d="M708 352 l8 -24 l8 24 z" />
          </g>

          {/* the road east, worn by wagon wheels */}
          <path d="M438 420 L566 420 L522 322 L494 322 Z" fill="#37322C" />
          <path d="M462 420 L478 420 L500 330 L492 330 Z" fill="#2C2823" />
          <path d="M530 420 L548 420 L518 330 L510 330 Z" fill="#2C2823" />

          {/* the ambush's black-fletched arrows, planted in the road */}
          <g transform="translate(600 396) rotate(-64)">
            <rect x="0" y="-2.2" width="96" height="4.4" rx="1.6" fill="#7A5C40" />
            <path d="M96 -6 L112 -1 L96 6 L100 0 Z" fill="#B9C2CC" />
            <path d="M2 -2 L20 -13 L27 -13 L11 -2 Z" fill="#0D1219" />
            <path d="M2 2 L20 13 L27 13 L11 2 Z" fill="#0D1219" />
          </g>
          <g transform="translate(560 412) rotate(-48)">
            <rect x="0" y="-2.2" width="96" height="4.4" rx="1.6" fill="#7A5C40" />
            <path d="M96 -6 L112 -1 L96 6 L100 0 Z" fill="#B9C2CC" />
            <path d="M2 -2 L20 -13 L27 -13 L11 -2 Z" fill="#0D1219" />
            <path d="M2 2 L20 13 L27 13 L11 2 Z" fill="#0D1219" />
          </g>
        </svg>
      </div>

      {/* fade the tableau into the chrome */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-[34vh] h-[30vh]"
        style={{
          background: "linear-gradient(180deg, rgba(26,35,48,0) 0%, #1A2330 82%)",
        }}
      />
      {/* vignette */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 50% 32%, rgba(26,35,48,0) 55%, rgba(15,21,30,0.55) 100%)",
        }}
      />

      {/* ── Lockup & menu ── */}
      <main className="relative z-10 flex flex-1 flex-col items-center px-4 pt-[16vh] pb-8 text-center sm:pt-[18vh]">
        <p className="mb-3 text-[11px] font-semibold tracking-[0.34em] text-mist-dim uppercase">
          An adaptation of the D&amp;D Starter Set adventure
        </p>
        <h1
          className="font-display text-4xl font-extrabold tracking-[0.22em] text-parchment sm:text-6xl"
          style={{ textShadow: "0 2px 24px rgba(212,135,90,0.35), 0 2px 3px rgba(10,14,20,0.8)" }}
        >
          GOBLIN
          <span className="text-ember"> ARROWS</span>
        </h1>
        <p className="mt-3 font-prose text-sm text-mist italic sm:text-base">
          Lost Mine of Phandelver · The road from Neverwinter to Cragmaw Hideout
        </p>

        <nav aria-label="Main menu" className="mt-10 flex w-full max-w-xs flex-col gap-3 sm:mt-12">
          <Button
            onClick={handleNewGame}
            className="h-12 w-full bg-ember font-display text-sm font-bold tracking-[0.22em] text-slate-deep uppercase hover:bg-ember-bright"
          >
            New Game
          </Button>
          <Button
            onClick={() => setSaveOverlay(true)}
            variant="secondary"
            className="h-12 w-full border border-slate-line bg-slate-panel font-display text-sm font-bold tracking-[0.22em] text-mist uppercase hover:bg-slate-raised"
          >
            Continue
          </Button>
          <Button
            onClick={() => setView("roster")}
            variant="secondary"
            className="h-12 w-full border border-slate-line bg-slate-panel font-display text-sm font-bold tracking-[0.22em] text-mist uppercase hover:bg-slate-raised"
          >
            The Party
          </Button>
          <Button
            onClick={() => setView("arena")}
            variant="secondary"
            className="h-12 w-full border border-dashed border-ember/50 bg-slate-panel font-display text-sm font-bold tracking-[0.22em] text-ember-bright uppercase hover:bg-slate-raised"
          >
            Debug Arena
          </Button>
        </nav>

        <p className="mt-8 max-w-md font-prose text-xs leading-relaxed text-mist-dim/80">
          “Sixty to ninety minutes from title screen to epilogue — a beginning,
          a middle and an end.”
        </p>
      </main>

      {/* ── Footer: preferences & build stamp ── */}
      <footer className="relative z-10 mt-auto border-t border-slate-line/50 bg-slate-deep/60 px-4 py-3">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <label className="flex cursor-pointer items-center gap-2.5 text-xs font-semibold tracking-wide text-mist-dim select-none">
            <Switch
              checked={reducedMotion === true}
              onCheckedChange={setReducedMotion}
              aria-label="Toggle reduced motion"
            />
            Reduced motion
          </label>
          <p className="text-[11px] tracking-[0.18em] text-mist-dim/70 uppercase">
            Session 2 · Combat engine
            {seed !== null && <> · rng seed #{seed}</>}
          </p>
        </div>
      </footer>
    </div>
  );
}
