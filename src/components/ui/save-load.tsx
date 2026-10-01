"use client";

/**
 * The save/load overlay (GDD §9.5, Table 13) — three manual slots plus the
 * autosave, live from Session 3 on the versioned schema. From the title
 * screen the overlay loads; from the story header it offers both tabs.
 * Saves are written at scene boundaries only — the story screen is the
 * only place with a Save button, and battles have none.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useGameStore, worldFromStore } from "@/state/store";
import {
  SAVE_SCHEMA_VERSION,
  deleteSlot,
  listSlots,
  writeSlot,
} from "@/state/save";
import { useUiStore, type SaveOverlayMode } from "@/state/ui-store";
import type { SaveSlotInfo } from "@/game/types";
import { cn } from "@/lib/utils";

export function SaveLoadOverlay() {
  const open = useUiStore((s) => s.saveOverlayOpen);
  const setOpen = useUiStore((s) => s.setSaveOverlay);
  const mode = useUiStore((s) => s.saveOverlayMode);
  const view = useUiStore((s) => s.view);

  // Save tabs exist only in story mode (title's Continue is load-only).
  const showTabs = view === "story";
  const effectiveMode: SaveOverlayMode = showTabs ? mode : "load";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* Body mounts fresh each open, so slot data is always current. */}
      {open && <SaveLoadBody mode={effectiveMode} showTabs={showTabs} />}
    </Dialog>
  );
}

function SaveLoadBody({ mode, showTabs }: { mode: SaveOverlayMode; showTabs: boolean }) {
  const [slots, setSlots] = useState<SaveSlotInfo[]>(() => listSlots());
  const [confirming, setConfirming] = useState<string | null>(null);
  const { toast } = useToast();
  const loadWorld = useGameStore((s) => s.loadWorld);
  const setSaveOverlay = useUiStore((s) => s.setSaveOverlay);
  const setView = useUiStore((s) => s.setView);

  const refresh = () => setSlots(listSlots());

  const doSave = (slot: SaveSlotInfo) => {
    const world = worldFromStore(useGameStore.getState());
    const ok = writeSlot(slot.slot, world);
    if (ok) {
      toast({
        title: "The run is saved",
        description: `${slot.label} — ${world.meta.sceneStamp ?? "in progress"}.`,
      });
    } else {
      toast({
        title: "The browser refused the save",
        description: "Local storage is full or disabled — try another slot or free some space.",
      });
    }
    refresh();
    setConfirming(null);
  };

  const doLoad = (info: SaveSlotInfo) => {
    if (!info.save) return;
    loadWorld(info.save.world);
    setSaveOverlay(false);
    if (info.save.world.sceneId) {
      setView("story");
      toast({
        title: "The run resumes",
        description: `${info.save.world.meta.sceneStamp ?? "The road"} — the dice remember exactly where they were.`,
      });
    } else {
      setView("roster");
    }
  };

  const doDelete = (info: SaveSlotInfo) => {
    deleteSlot(info.slot);
    refresh();
    setConfirming(null);
  };

  return (
    <DialogContent className="w-full max-w-md border-slate-line bg-slate-panel p-0 text-mist sm:max-w-md">
      <div className="border-b border-slate-line px-5 py-4">
        <DialogTitle className="font-display text-lg font-bold tracking-wide text-parchment">
          Save Slots
        </DialogTitle>
        <DialogDescription className="mt-1 text-sm text-mist-dim">
          Three manual slots plus the autosave, written at scene boundaries.
        </DialogDescription>

        {showTabs && (
          <div className="mt-3 grid grid-cols-2 gap-1 rounded-lg border border-slate-line bg-slate-deep p-1" role="tablist">
            {(["save", "load"] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                onClick={() => setSaveOverlay(true, m)}
                className={cn(
                  "rounded-md px-3 py-1.5 font-display text-[11px] font-bold tracking-[0.2em] uppercase transition-colors",
                  mode === m
                    ? "bg-ember text-slate-deep"
                    : "text-mist-dim hover:bg-slate-raised hover:text-mist"
                )}
              >
                {m === "save" ? "Save here" : "Load"}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="ga-scroll max-h-[60vh] space-y-2.5 overflow-y-auto px-5 py-4">
        {slots.map((info) => (
          <SlotCard
            key={info.slot}
            info={info}
            mode={mode}
            confirming={confirming}
            setConfirming={setConfirming}
            onSave={() => doSave(info)}
            onLoad={() => doLoad(info)}
            onDelete={() => doDelete(info)}
          />
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

function SlotCard({
  info,
  mode,
  confirming,
  setConfirming,
  onSave,
  onLoad,
  onDelete,
}: {
  info: SaveSlotInfo;
  mode: SaveOverlayMode;
  confirming: string | null;
  setConfirming: (key: string | null) => void;
  onSave: () => void;
  onLoad: () => void;
  onDelete: () => void;
}) {
  const { save, label } = info;
  const isAutosave = info.slot === "autosave";
  const stamp = save?.world.meta.sceneStamp;
  const confirmKey = `${info.slot}:delete`;

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
              {isAutosave ? "Written at act transitions." : "Empty — the road has not stopped here yet."}
            </p>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          {mode === "save" ? (
            isAutosave ? (
              <span className="ga-tnum self-center text-xs text-mist-dim/60">auto</span>
            ) : (
              <Button size="sm" className="h-9 bg-ember font-bold hover:bg-ember-bright" onClick={onSave}>
                {save ? "Overwrite" : "Save here"}
              </Button>
            )
          ) : save ? (
            <>
              <Button size="sm" variant="secondary" className="h-9" onClick={onLoad}>
                Load
              </Button>
              {confirming === confirmKey ? (
                <Button size="sm" variant="ghost" className="h-9 text-fire" onClick={onDelete}>
                  Sure?
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-9 text-mist-dim"
                  onClick={() => setConfirming(confirmKey)}
                >
                  Delete
                </Button>
              )}
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
