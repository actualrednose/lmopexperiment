"use client";

/**
 * Party intro / roster (GDD Table 13): hero cards with portrait tokens,
 * one-line intros, and signature ability callouts. Every card opens the
 * full character sheet overlay; the four cards together are the game's
 * opening beat once the story engine lands (Session 3).
 */

import { Button } from "@/components/ui/button";
import { HeroToken } from "@/components/ui/hero-token";
import { PARTY } from "@/content/party";
import { useGameStore } from "@/state/store";
import { useUiStore } from "@/state/ui-store";

export function PartyIntro() {
  const setView = useUiStore((s) => s.setView);
  const openSheet = useUiStore((s) => s.openSheet);
  const beginStory = useGameStore((s) => s.beginStory);

  return (
    <div className="flex min-h-screen flex-col bg-slate-deep">
      <header className="border-b border-slate-line/60 bg-slate-panel/40 px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <Button
            onClick={() => setView("title")}
            variant="ghost"
            className="h-10 px-3 text-mist-dim hover:bg-slate-raised hover:text-mist"
            aria-label="Back to title screen"
          >
            ← Title
          </Button>
          <div className="text-center">
            <h1 className="font-display text-lg font-bold tracking-[0.28em] text-parchment sm:text-xl">
              THE PARTY
            </h1>
            <p className="mt-0.5 hidden text-[11px] tracking-[0.2em] text-mist-dim uppercase sm:block">
              Four heroes for the road east
            </p>
          </div>
          <div className="w-[76px]" aria-hidden="true" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <p className="mx-auto mb-6 max-w-2xl text-center font-prose text-sm leading-relaxed text-mist-dim">
          Gundren Rockseeker is paying ten gold apiece to drive a wagon of
          mining provisions to Phandalin. A line-holder, a skirmisher, a healer
          and an artillery piece — between them, every kind of trouble the
          Triboar Trail can offer.
        </p>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {PARTY.map((sheet) => {
            const signature = sheet.traits.find((t) => t.kind === "signature");
            return (
              <article
                key={sheet.id}
                className="ga-panel flex flex-col rounded-lg border border-slate-line p-5 transition-colors hover:border-ember/50"
              >
                <div className="flex items-start gap-4">
                  <HeroToken heroId={sheet.id} size={64} className="shrink-0" />
                  <div className="min-w-0 flex-1">
                    <h2 className="font-display text-lg leading-tight font-bold text-parchment">
                      {sheet.name}
                    </h2>
                    <p className="mt-0.5 text-xs tracking-wide text-mist-dim">
                      {sheet.race} · {sheet.className}
                    </p>
                    <p className="mt-1 text-xs font-semibold tracking-wider text-ember uppercase">
                      {sheet.role}
                    </p>
                  </div>
                </div>

                <p className="mt-4 flex-1 font-prose text-sm leading-relaxed text-mist">
                  {sheet.bio}
                </p>

                {signature && (
                  <p className="mt-3 rounded-md border border-ember/40 bg-ember/10 px-3 py-2 text-xs leading-relaxed text-mist">
                    <span className="font-display font-bold tracking-wider text-ember uppercase">
                      {signature.name}
                    </span>
                    <span className="mx-1.5 text-mist-dim">—</span>
                    {signature.text}
                  </p>
                )}

                <div className="ga-tnum mt-4 flex flex-wrap gap-2">
                  <Chip label="AC" value={sheet.ac} />
                  <Chip label="HP" value={sheet.hp} />
                  <Chip label="Speed" value={`${sheet.speed} ft`} />
                </div>

                <Button
                  onClick={() => openSheet(sheet.id)}
                  variant="secondary"
                  className="mt-4 h-11 w-full border border-slate-line bg-slate-raised/70 font-display text-xs font-bold tracking-[0.2em] text-mist uppercase hover:bg-slate-raised"
                >
                  View Full Sheet
                </Button>
              </article>
            );
          })}
        </div>

        <div className="mx-auto mt-8 max-w-md text-center">
          <Button
            onClick={() => beginStory()}
            className="h-12 w-full bg-ember font-display text-sm font-bold tracking-[0.22em] text-slate-deep uppercase hover:bg-ember-bright"
          >
            Begin Act I
          </Button>
          <p className="mt-2 text-[11px] tracking-wider text-mist-dim/70 uppercase">
            The wagon rolls east — the story begins
          </p>
        </div>
      </main>

      <footer className="mt-auto border-t border-slate-line/50 px-4 py-3">
        <p className="mx-auto max-w-5xl text-center text-[11px] tracking-[0.18em] text-mist-dim/60 uppercase">
          Goblin Arrows · Session 3 · Exploration engine &amp; Acts I–II
        </p>
      </footer>
    </div>
  );
}

function Chip({ label, value }: { label: string; value: number | string }) {
  return (
    <span className="ga-tnum inline-flex items-baseline gap-1.5 rounded-md border border-slate-line bg-slate-deep/60 px-2.5 py-1">
      <span className="text-[10px] font-bold tracking-widest text-mist-dim uppercase">
        {label}
      </span>
      <span className="font-display text-sm font-bold text-parchment">{value}</span>
    </span>
  );
}
