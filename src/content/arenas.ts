/**
 * Debug arena definitions (GDD §10.2): two preset fights for exercising the
 * combat engine in isolation, seeded and resettable.
 *
 * - Road Ambush: the Act II encounter composition (GDD §6.2 / Table 12) —
 *   a 14-by-8 road map, the wagon and both dead horses as cover objects,
 *   four goblins in two flanking pairs, and the ambush Stealth contest that
 *   can catch the party Surprised.
 * - Wolf Pack: three wolves in a forest clearing — pack tactics punish
 *   clumping and isolation (Table 12's "Kennel Wolves" lesson, standalone).
 */

import type { ArenaDef } from "@/game/grid";

export const ROAD_AMBUSH: ArenaDef = {
  id: "road-ambush",
  title: "The Goblin Ambush",
  subtitle:
    "The Triboar Trail bends around a meadow. Two dead horses block the road, and the thickets are full of eyes.",
  // 14 × 8 — G grass, R road, T thicket (light cover)
  map: [
    "GTTGGGGGGGGGGG",
    "GTTTGGGGGGGGTG",
    "GGGGGGGGGGGGGG",
    "GGRRRRRRRRRRGG",
    "GGRRRRRRRRRRGG",
    "GGGGGGGGGGGGGG",
    "GGGGGTGGGGTTTG",
    "TGGGGGGGGGTTTT",
  ],
  objects: [
    {
      kind: "wagon",
      label: "The provision wagon",
      tiles: [
        { x: 4, y: 3 },
        { x: 4, y: 4 },
      ],
      blocksLos: false,
    },
    {
      kind: "horse",
      label: "Dead horse",
      tiles: [{ x: 9, y: 3 }],
      blocksLos: false,
    },
    {
      kind: "horse",
      label: "Dead horse",
      tiles: [{ x: 9, y: 4 }],
      blocksLos: false,
    },
  ],
  partySpawns: [
    { x: 5, y: 3 }, // Torvald — beside the wagon
    { x: 4, y: 5 }, // Perrin — crouched at the wagon's tail
    { x: 5, y: 4 }, // Maera — beside the wagon
    { x: 5, y: 5 }, // Elyndra — behind the wagon's shadow
  ],
  enemySpawns: [
    { ref: "goblin", x: 1, y: 1, label: "Goblin A" },
    { ref: "goblin", x: 2, y: 0, label: "Goblin B" },
    { ref: "goblin", x: 10, y: 6, label: "Goblin C" },
    { ref: "goblin", x: 11, y: 7, label: "Goblin D" },
  ],
  ambush: { stealthBonus: 6 },
  potions: 2,
};

export const WOLF_PACK: ArenaDef = {
  id: "wolf-pack",
  title: "The Wolf Pack",
  subtitle:
    "A forest clearing. Three lean shapes circle wide, hunting the flank that strays from the line.",
  // 12 × 8
  map: [
    "GTGGGGGGGGTG",
    "TGGGGGGGGGGT",
    "GGGGTGGGGGGG",
    "GGGGCCCCCGGG",
    "GGGGCCCCCGGG",
    "GGGGGGTGGGGG",
    "TGGGGGGGGGGT",
    "GTGGGGGGGTGG",
  ],
  objects: [
    {
      kind: "rock",
      label: "Standing stone",
      tiles: [{ x: 6, y: 5 }],
      blocksLos: false,
    },
  ],
  partySpawns: [
    { x: 2, y: 3 }, // Torvald
    { x: 1, y: 4 }, // Perrin
    { x: 2, y: 4 }, // Maera
    { x: 1, y: 3 }, // Elyndra
  ],
  enemySpawns: [
    { ref: "wolf", x: 8, y: 2, label: "Wolf A" },
    { ref: "wolf", x: 9, y: 4, label: "Wolf B" },
    { ref: "wolf", x: 8, y: 5, label: "Wolf C" },
  ],
  potions: 2,
};

export const ARENAS: Record<string, ArenaDef> = {
  "road-ambush": ROAD_AMBUSH,
  "wolf-pack": WOLF_PACK,
};

export function getArena(id: string): ArenaDef {
  const arena = ARENAS[id];
  if (!arena) throw new Error(`Unknown arena: ${id}`);
  return arena;
}
