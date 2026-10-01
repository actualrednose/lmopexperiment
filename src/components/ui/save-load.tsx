"use client";

/**
 * The save/load overlay (GDD Table 13) — three manual slots plus the
 * autosave. The slot UI is live from Session 1 on the versioned schema;
 * slots fill once the story engine starts writing saves (Session 3).
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { SAVE_SCHEMA_VERSION, listSlots } from "@/state/save";
import type { SaveSlotInfo } from "@/game/types";
import { useUiStore } from "@/state/ui-store";
import { cn } from "@/lib/utils";

export function SaveLoadOverlay() {
  const open = useUiStore((s) => s.saveOverlayOpen);
  const setOpen = useUiStore((s) => s.setSaveOverlay);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* Body mounts fresh each open, so slot data is always current. */}
      {open && <SaveLoadBody />}
    </Dialog>
  );
}

function SaveLoadBody() {
  const [slots] = useState<SaveSlotInfo[]>(() => listSlots());

  return (
    <DialogContent className="w-full max-w-md border-slate-line bg-slate-panel p-0 text-mist sm:max-w-md">
      <div className="border-b border-slate-line px-5 py-4">
        <DialogTitle className="font-display text-lg font-bold tracking-wide text-parchment">
          Save Slots
        </DialogTitle>
        <DialogDescription className="mt-1 text-sm text-mist-dim">
          Three manual slots plus the autosave, written at scene boundaries.
        </DialogDescription>
      </div>

      <div className="ga-scroll max-h-[60vh] space-y-2.5 overflow-y-auto px-5 py-4">
        {slots.map((info) => (
          <SlotCard key={info.slot} info={info} />
        ))}
      </div>

      <div className="border-t border-slate-line px-5 py-3">
        <p className="text-center text-[11px] tracking-wider text-mist-dim uppercase">
          Save schema v{SAVE_SCHEMA_VERSION} · browser local storage
        </p>
      </div>
    </DialogContent>
  );
}

function SlotCard({ info }: { info: SaveSlotInfo }) {
  const { save, label } = info;
  const isAutosave = info.slot === "autosave";
  const stamp = save?.world.meta.sceneStamp;

  return (
    <div
      className={cn(
        "rounded-md border p-3.5",
        save
          ? "border-slate-line bg-slate-raised"
          : "border-dashed border-slate-line/70 bg-slate-panel/60"
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-display text-sm font-bold text-parchment">{label}</span>
            {isAutosave && (
              <span className="rounded bg-slate-raised px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-mist-dim uppercase">
                Auto
              </span>
            )}
          </div>
          {save ? (
            <p className="ga-tnum mt-1 truncate text-xs text-mist-dim">
              {stamp ?? "in progress"} · {formatPlaytime(save.world.meta.playtimeSeconds)}
            </p>
          ) : (
            <p className="mt-1 text-xs text-mist-dim/80">
              {isAutosave
                ? "Written at act transitions."
                : "Empty — saves activate with the story engine (Session 3)."}
            </p>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          {save ? (
            <>
              <Button size="sm" variant="secondary" className="h-9" disabled>
                Load
              </Button>
              <Button size="sm" variant="ghost" className="h-9 text-mist-dim" disabled>
                Delete
              </Button>
            </>
          ) : (
            <span className="ga-tnum self-center text-xs text-mist-dim/60">—</span>
          )}
        </div>
      </div>
    </div>
  );
}

function formatPlaytime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}
