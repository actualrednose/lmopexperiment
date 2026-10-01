"use client";

/**
 * The combat log (GDD §8.2): a collapsible panel that echoes every die roll
 * with its math — the dice-you-can-see pillar applied to battle.
 */

import { ChevronDown, ChevronUp, ScrollText } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { BattleState } from "@/game/types";

export function CombatLog({ battle }: { battle: BattleState }) {
  const [open, setOpen] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [battle.log.length, open]);

  return (
    <section
      aria-label="Combat log"
      className="ga-panel flex min-h-0 flex-col rounded-lg border border-slate-line"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 rounded-t-lg border-b border-slate-line px-3 py-2 text-left transition-colors hover:bg-slate-raised/40"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 text-[11px] font-bold tracking-[0.18em] text-mist-dim uppercase">
          <ScrollText className="h-3.5 w-3.5" aria-hidden="true" />
          Combat log
        </span>
        {open ? (
          <ChevronUp className="h-4 w-4 text-mist-dim" aria-hidden="true" />
        ) : (
          <ChevronDown className="h-4 w-4 text-mist-dim" aria-hidden="true" />
        )}
      </button>
      {open && (
        <div
          ref={scrollRef}
          className="ga-scroll max-h-44 min-h-24 overflow-y-auto px-3 py-2 lg:max-h-56"
        >
          <ol className="space-y-1.5">
            {battle.log.map((entry, i) => {
              const success = entry.roll?.success;
              return (
                <li
                  key={i}
                  className={`text-[11px] leading-snug ${
                    entry.highlight ? "text-parchment" : "text-mist-dim"
                  }`}
                >
                  <span
                    className={`mr-1 inline-block h-1.5 w-1.5 rounded-full align-middle ${
                      success === true
                        ? "bg-healing"
                        : success === false
                          ? "bg-fire"
                          : entry.highlight
                            ? "bg-ember"
                            : "bg-slate-line"
                    }`}
                    aria-hidden="true"
                  />
                  <span className="font-semibold text-mist">{entry.actor}</span>{" "}
                  {entry.text}
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </section>
  );
}
