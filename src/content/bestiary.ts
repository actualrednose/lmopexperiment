/**
 * The bestiary (GDD Chapter 7, Table 11) — exactly four enemy stat blocks:
 * goblin, wolf, and the two bosses (Klarg, Yeemik) whose arenas arrive in
 * Session 5. Numbers are faithful ports of the fifth-edition roster the
 * adventure uses, with morale behavior folded in from Chapter 4.
 *
 * Session 2 uses goblin and wolf in the debug arena; the boss blocks exist
 * now so the kernel's typing covers Session 5 without a schema change.
 * Every change to a number here is a balance change and gets a note in
 * SESSIONS.md's change-control log.
 */

import type { Attack, EnemyId, Trait } from "@/game/types";

export type MoraleRule = "lastOfGroupFlees" | "pack" | "never" | "halfHpFlees";
export type AiProfile = "goblin" | "wolf" | "klarg" | "yeemik";

export interface EnemyStatBlock {
  id: EnemyId;
  name: string;
  /** Role line from Table 11, shown on the target card. */
  role: string;
  ac: number;
  hp: number;
  /** Speed in feet. */
  speed: number;
  /** Dexterity modifier — initiative and DEX saves. */
  dexMod: number;
  attacks: Attack[];
  /** Plain-language traits for the target card (GDD §8.2). */
  traits: Trait[];
  /** Stealth bonus for ambush contests and the Hide action. */
  stealthBonus: number;
  /** Passive Perception contested by hero Hide attempts. */
  passivePerception: number;
  morale: MoraleRule;
  ai: AiProfile;
  xp: number;
}

const goblinAttacks: Attack[] = [
  {
    name: "Scimitar",
    attackBonus: 4,
    damage: { count: 1, sides: 6, plus: 2 },
    damageType: "slashing",
    reach: 5,
    notes: "Melee",
  },
  {
    name: "Shortbow",
    attackBonus: 4,
    damage: { count: 1, sides: 6, plus: 2 },
    damageType: "piercing",
    range: [80, 320],
    notes: "Ranged",
  },
];

export const GOBLIN: EnemyStatBlock = {
  id: "goblin",
  name: "Goblin",
  role: "Skirmisher",
  ac: 15,
  hp: 7,
  speed: 30,
  dexMod: 2,
  attacks: goblinAttacks,
  traits: [
    {
      kind: "feature",
      name: "Nimble Escape",
      text: "Bonus action: Disengage or Hide each turn.",
    },
  ],
  stealthBonus: 6,
  passivePerception: 9,
  morale: "lastOfGroupFlees",
  ai: "goblin",
  xp: 50,
};

export const WOLF: EnemyStatBlock = {
  id: "wolf",
  name: "Wolf",
  role: "Pack hunter",
  ac: 13,
  hp: 11,
  speed: 40,
  dexMod: 2,
  attacks: [
    {
      name: "Bite",
      attackBonus: 4,
      damage: { count: 2, sides: 4, plus: 2 },
      damageType: "piercing",
      reach: 5,
      notes: "DC 11 STR save or the target is knocked Prone.",
    },
  ],
  traits: [
    {
      kind: "feature",
      name: "Pack Tactics",
      text: "Attacks with advantage while an ally is beside the target.",
    },
    {
      kind: "feature",
      name: "Trip",
      text: "A bitten target that fails a DC 11 STR save is knocked Prone.",
    },
  ],
  stealthBonus: 4,
  passivePerception: 13,
  morale: "pack",
  ai: "wolf",
  xp: 50,
};

export const KLARG: EnemyStatBlock = {
  id: "klarg",
  name: "Klarg",
  role: "Boss: bruiser",
  ac: 16,
  hp: 27,
  speed: 30,
  dexMod: 1,
  attacks: [
    {
      name: "Morningstar",
      attackBonus: 4,
      damage: { count: 2, sides: 8, plus: 2 },
      damageType: "piercing",
      reach: 5,
      notes: "Brute — heavy single-target damage (2d8+2).",
    },
  ],
  traits: [
    {
      kind: "signature",
      name: "Surprise Attack",
      text: "Round-one hits against Surprised heroes deal +2d6 damage.",
    },
  ],
  stealthBonus: 2,
  passivePerception: 10,
  morale: "never",
  ai: "klarg",
  xp: 200,
};

export const YEEMIK: EnemyStatBlock = {
  id: "yeemik",
  name: "Yeemik",
  role: "Boss: negotiator",
  ac: 17,
  hp: 21,
  speed: 30,
  dexMod: 2,
  attacks: [
    {
      name: "Scimitar",
      attackBonus: 4,
      damage: { count: 1, sides: 6, plus: 2 },
      damageType: "slashing",
      reach: 5,
    },
  ],
  traits: [
    {
      kind: "signature",
      name: "Redirect",
      text: "When hit, swaps places with an adjacent goblin who takes the blow instead.",
    },
  ],
  stealthBonus: 6,
  passivePerception: 9,
  morale: "halfHpFlees",
  ai: "yeemik",
  xp: 200,
};

export const BESTIARY: Record<EnemyId, EnemyStatBlock> = {
  goblin: GOBLIN,
  wolf: WOLF,
  klarg: KLARG,
  yeemik: YEEMIK,
};

export function getStatBlock(id: EnemyId): EnemyStatBlock {
  return BESTIARY[id];
}
