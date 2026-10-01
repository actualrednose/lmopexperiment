/**
 * Item definitions (GDD §10.3: inventory basics — potions and rations;
 * the loot economy finishes in Session 5). Items are typed data: the
 * inventory overlay, the content linter and the scene effects all read
 * from this single list.
 */

import type { Inventory, InventoryItem, ItemKind } from "@/game/types";

export type ItemId = "potion" | "ration" | "mapCase";

export interface ItemDef {
  id: ItemId;
  name: string;
  kind: ItemKind;
  /** One-line effect or flavor for the inventory overlay. */
  description: string;
}

export const ITEMS: Record<ItemId, ItemDef> = {
  potion: {
    id: "potion",
    name: "Potion of Healing",
    kind: "potion",
    description: "2d4+2 hit points; a full action in battle (GDD §4.5).",
  },
  ration: {
    id: "ration",
    name: "Trail Rations",
    kind: "ration",
    description:
      "A day's hard bread and salt meat. Rations can calm the kennel wolves (Animal Handling DC 10, Session 4).",
  },
  mapCase: {
    id: "mapCase",
    name: "Gundren's Map Case",
    kind: "quest",
    description: "Torn open and emptied on the ambush site — the maps are gone.",
  },
};

/** The starting kit: the wagon carries two potions and a ration per hero. */
export function startingInventory(): Inventory {
  return {
    items: [
      { id: "potion", name: ITEMS.potion.name, kind: "potion", count: 2 },
      { id: "ration", name: ITEMS.ration.name, kind: "ration", count: 4 },
    ],
    gold: 0,
  };
}

/** Add (or remove, with negative count) an item; the linter validates ids. */
export function addItem(inventory: Inventory, id: ItemId, count: number): void {
  const def = ITEMS[id];
  const existing = inventory.items.find((item) => item.id === id);
  if (existing) {
    existing.count = Math.max(0, existing.count + count);
    if (existing.count === 0) {
      inventory.items = inventory.items.filter((item) => item.id !== id);
    }
    return;
  }
  if (count > 0) {
    const item: InventoryItem = {
      id,
      name: def.name,
      kind: def.kind,
      count,
      description: def.description,
    };
    inventory.items.push(item);
  }
}

export function itemCount(inventory: Inventory, id: ItemId): number {
  return inventory.items.find((item) => item.id === id)?.count ?? 0;
}
