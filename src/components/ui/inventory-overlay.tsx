"use client";

/**
 * The inventory overlay (GDD Table 13): potions, rations, quest items and
 * treasures with plain-language descriptions. The loot economy finishes in
 * Session 5; Session 3 carries the basics the acts actually use.
 */

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { ITEMS } from "@/content/items";
import { useGameStore } from "@/state/store";
import { useUiStore } from "@/state/ui-store";
import { Apple, Coins, FlaskConical, Gem, ScrollText } from "lucide-react";
import type { ItemKind } from "@/game/types";
import type { LucideIcon } from "lucide-react";

const KIND_ICONS: Record<ItemKind, LucideIcon> = {
  potion: FlaskConical,
  ration: Apple,
  treasure: Gem,
  quest: ScrollText,
};

const KIND_GROUPS: { title: string; kinds: ItemKind[] }[] = [
  { title: "Supplies", kinds: ["potion", "ration"] },
  { title: "Quest items", kinds: ["quest"] },
  { title: "Treasures", kinds: ["treasure"] },
];

export function InventoryOverlay() {
  const open = useUiStore((s) => s.inventoryOpen);
  const setOpen = useUiStore((s) => s.setInventoryOpen);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {open && <Body />}
    </Dialog>
  );
}

function Body() {
  const inventory = useGameStore((s) => s.inventory);

  return (
    <DialogContent className="w-full max-w-md border-slate-line bg-slate-panel p-0 text-mist sm:max-w-md">
      <div className="border-b border-slate-line px-5 py-4">
        <DialogTitle className="font-display text-lg font-bold tracking-wide text-parchment">
          The Party&apos;s Packs
        </DialogTitle>
        <DialogDescription className="mt-1 text-sm text-mist-dim">
          What the wagon carries, what the road pays out.
        </DialogDescription>
      </div>

      <div className="ga-scroll max-h-[55vh] space-y-4 overflow-y-auto px-5 py-4">
        {KIND_GROUPS.map((group) => {
          const items = inventory.items.filter((item) => group.kinds.includes(item.kind));
          if (items.length === 0) return null;
          return (
            <section key={group.title}>
              <h3 className="text-[10px] font-bold tracking-[0.22em] text-mist-dim uppercase">
                {group.title}
              </h3>
              <ul className="mt-2 space-y-2">
                {items.map((item) => {
                  const def = ITEMS[item.id as keyof typeof ITEMS];
                  const Icon = KIND_ICONS[item.kind];
                  return (
                    <li
                      key={item.id}
                      className="flex items-start gap-3 rounded-md border border-slate-line bg-slate-raised/60 p-3"
                    >
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-ember/40 bg-ember/10">
                        <Icon className="h-4 w-4 text-ember-bright" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-display text-sm font-bold text-parchment">
                          {item.name}
                          <span className="ga-tnum ml-2 rounded bg-slate-deep px-1.5 py-0.5 text-[11px] font-bold text-mist">
                            ×{item.count}
                          </span>
                        </p>
                        <p className="mt-0.5 text-xs leading-relaxed text-mist-dim">
                          {item.description ?? def?.description}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
        {inventory.items.length === 0 && (
          <p className="py-6 text-center text-sm text-mist-dim italic">
            The packs are empty. The road east will fix that.
          </p>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-slate-line px-5 py-3">
        <p className="ga-tnum flex items-center gap-1.5 text-sm font-semibold text-radiant">
          <Coins className="h-4 w-4" aria-hidden="true" />
          {inventory.gold} gp
        </p>
        <Button
          size="sm"
          variant="secondary"
          className="h-9 border border-slate-line"
          onClick={() => useUiStore.getState().setInventoryOpen(false)}
        >
          Close
        </Button>
      </div>
    </DialogContent>
  );
}
