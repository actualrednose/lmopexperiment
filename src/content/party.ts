/**
 * The party — four pregenerated heroes (GDD Chapter 3, the authoritative sheets).
 *
 * Data fidelity notes:
 * - Every value matches GDD Tables 4–7 (Chapter 3 hero sheets) exactly.
 * - Perrin's Deception is listed at +5 in the GDD; with CHA 13 (+1) and
 *   proficiency (+2) that implies expertise, so it is flagged `expertise`
 *   alongside Stealth for internal consistency. The displayed bonus is +5
 *   either way, as written.
 */

import type { HeroId, HeroRuntime, HeroSheet } from "@/game/types";

export const PARTY_ORDER: readonly HeroId[] = [
  "torvald",
  "perrin",
  "maera",
  "elyndra",
] as const;

const torvald: HeroSheet = {
  id: "torvald",
  name: "Torvald Ironfell",
  race: "Mountain dwarf",
  className: "Fighter",
  role: "Front line, damage sponge",
  fantasy: "standing in a doorway with a wolf on each boot.",
  bio: "A grey-bearded mercenary who has outlived three mining companies and intends to outlive this wagon trip too. Torvald is the party's wall: highest AC, deepest health pool, and the only hero who wants to be hit.",
  level: 1,
  ac: 18,
  acNote: "chain mail and shield",
  hp: 13,
  speed: 25,
  abilities: { STR: 16, DEX: 10, CON: 16, INT: 10, WIS: 12, CHA: 10 },
  attacks: [
    {
      name: "Warhammer",
      attackBonus: 5,
      damage: { count: 1, sides: 8, plus: 3 },
      damageType: "bludgeoning",
      reach: 5,
    },
    {
      name: "Handaxes (×2)",
      attackBonus: 5,
      damage: { count: 1, sides: 6, plus: 3 },
      damageType: "slashing",
      thrown: true,
      range: [20, 60],
    },
  ],
  traits: [
    {
      kind: "signature",
      name: "Second Wind",
      text: "Bonus action: regain 1d10+1 hit points, once per rest.",
    },
    {
      kind: "racial",
      name: "Dwarf Resilience",
      text: "Advantage on saving throws against poison.",
    },
    { kind: "racial", name: "Darkvision", text: "Sees in darkness out to 60 feet." },
  ],
  skills: [
    { skill: "Athletics", ability: "STR", bonus: 5 },
    { skill: "Intimidation", ability: "CHA", bonus: 2 },
  ],
  level2: {
    summary: "Action Surge",
    grants: ["One extra action on a turn, once per battle."],
    hpGain: 9,
  },
};

const perrin: HeroSheet = {
  id: "perrin",
  name: "Perrin Underbough",
  race: "Lightfoot halfling",
  className: "Rogue",
  role: "Scout, burst damage",
  fantasy: "the first strike the enemy never sees.",
  bio: "A cheerful opportunist who considers a fair fight a planning failure. Perrin is the party's eyes and its knife: he scouts, he opens the ambush from the thicket, and he deletes one target per turn when an ally stands beside it.",
  level: 1,
  ac: 14,
  acNote: "leather armor",
  hp: 10,
  speed: 25,
  abilities: { STR: 8, DEX: 16, CON: 12, INT: 12, WIS: 13, CHA: 13 },
  attacks: [
    {
      name: "Shortsword",
      attackBonus: 5,
      damage: { count: 1, sides: 6, plus: 3 },
      damageType: "piercing",
      reach: 5,
    },
    {
      name: "Shortbow",
      attackBonus: 5,
      damage: { count: 1, sides: 6, plus: 3 },
      damageType: "piercing",
      range: [80, 320],
    },
  ],
  traits: [
    {
      kind: "signature",
      name: "Sneak Attack",
      text: "+1d6 damage when attacking with advantage or against a target an ally is adjacent to.",
    },
    {
      kind: "racial",
      name: "Lucky",
      text: "Reroll any natural 1 on an attack, check or save.",
    },
    {
      kind: "racial",
      name: "Naturally Stealthy",
      text: "Can hide behind creatures at least a size larger.",
    },
    { kind: "racial", name: "Brave", text: "Steady heart; resists fear." },
  ],
  skills: [
    { skill: "Stealth", ability: "DEX", bonus: 7, expertise: true },
    { skill: "Acrobatics", ability: "DEX", bonus: 5 },
    { skill: "Deception", ability: "CHA", bonus: 5, expertise: true },
    { skill: "Perception", ability: "WIS", bonus: 3 },
  ],
  level2: {
    summary: "Cunning Action",
    grants: ["Dash, Disengage or Hide as a bonus action."],
    hpGain: 6,
  },
};

const maera: HeroSheet = {
  id: "maera",
  name: "Sister Maera",
  race: "Human",
  className: "Cleric (Life Domain)",
  role: "Healer, buffer",
  fantasy: "mornings are for saving people, evenings are for scolding them.",
  bio: "A battlefield nurse of Lathander who believes mornings are for saving people and evenings are for scolding them. Maera is the party's anchor: she holds Bless on the front line, patches the wounded with bonus-action Healing Word, and swings a mace with genuine enthusiasm when prayers run out.",
  level: 1,
  ac: 18,
  acNote: "chain mail and shield",
  hp: 10,
  speed: 30,
  abilities: { STR: 14, DEX: 10, CON: 14, INT: 10, WIS: 16, CHA: 12 },
  attacks: [
    {
      name: "Mace",
      attackBonus: 4,
      damage: { count: 1, sides: 6, plus: 2 },
      damageType: "bludgeoning",
      reach: 5,
    },
  ],
  spells: [
    {
      name: "Sacred Flame",
      cost: "cantrip",
      effect: "Dexterity save or 1d8 radiant damage.",
      range: "60 ft",
      save: { ability: "DEX", outcome: "negates" },
      damage: { count: 1, sides: 8 },
      damageType: "radiant",
    },
    {
      name: "Bless",
      cost: "slot",
      effect: "Three allies add +1d4 to attacks and checks for 3 rounds.",
    },
    {
      name: "Cure Wounds",
      cost: "slot",
      effect: "Touch; heal 1d8+3 (+2 from Disciple of Life).",
      range: "Touch",
      damage: { count: 1, sides: 8, plus: 3 },
      damageType: "radiant",
    },
    {
      name: "Guiding Bolt",
      cost: "slot",
      effect: "4d6 radiant; the next attack on the target has advantage.",
      attackBonus: 5,
      damage: { count: 4, sides: 6 },
      damageType: "radiant",
    },
    {
      name: "Healing Word",
      cost: "slot",
      effect: "Heal 1d4+3 (+2 from Disciple of Life).",
      range: "60 ft",
      bonusAction: true,
      damage: { count: 1, sides: 4, plus: 3 },
      damageType: "radiant",
    },
  ],
  spellSlots: 2,
  traits: [
    {
      kind: "signature",
      name: "Bless & Healing Word",
      text: "Holds Bless on the front line; patches the wounded with a bonus-action Healing Word.",
    },
    {
      kind: "feature",
      name: "Disciple of Life",
      text: "Her level-1 healing spells restore +2 HP.",
    },
  ],
  skills: [
    { skill: "Medicine", ability: "WIS", bonus: 5 },
    { skill: "Insight", ability: "WIS", bonus: 5 },
  ],
  level2: {
    summary: "Third spell slot",
    grants: ["Three spell slots per long rest (up from two)."],
    hpGain: 7,
    slots: 3,
  },
};

const elyndra: HeroSheet = {
  id: "elyndra",
  name: "Elyndra Moonwhisper",
  race: "High elf",
  className: "Wizard",
  role: "Ranged control, burst",
  fantasy: "reading a battle and deleting half of it.",
  bio: "An elf arcanist several decades into a gap year, quietly thrilled to be anywhere dangerous. Elyndra is the party's artillery and its panic button: Fire Bolt every round at no cost, Magic Missile when a hit must land, Sleep when a fight needs to end before it starts.",
  level: 1,
  ac: 13,
  acNote: "15 with mage armor",
  hp: 8,
  speed: 30,
  abilities: { STR: 8, DEX: 16, CON: 14, INT: 16, WIS: 12, CHA: 10 },
  attacks: [],
  spells: [
    {
      name: "Fire Bolt",
      cost: "cantrip",
      effect: "A mote of fire; never runs out.",
      range: "120 ft",
      attackBonus: 5,
      damage: { count: 1, sides: 10 },
      damageType: "fire",
    },
    {
      name: "Light",
      cost: "cantrip",
      effect: "Utility cantrip for scene objects and flavor.",
    },
    {
      name: "Mage Hand",
      cost: "cantrip",
      effect: "Utility cantrip for scene objects and flavor.",
    },
    {
      name: "Burning Hands",
      cost: "slot",
      effect: "3d6 fire in a cone; Dexterity save for half.",
      range: "15-ft cone",
      save: { ability: "DEX", outcome: "half" },
      damage: { count: 3, sides: 6 },
      damageType: "fire",
    },
    {
      name: "Magic Missile",
      cost: "slot",
      effect: "3 darts, 1d4+1 force each; darts never miss.",
      damage: { count: 3, sides: 4, plus: 3 },
      damageType: "force",
    },
    {
      name: "Mage Armor",
      cost: "slot",
      effect: "Self; +2 AC for the rest of the scene.",
    },
    {
      name: "Sleep",
      cost: "slot",
      effect:
        "5d8 pool; incapacitates weakest enemies first, no save; waking costs an enemy its action.",
      damage: { count: 5, sides: 8 },
    },
    {
      name: "Misty Step",
      cost: "slot",
      effect: "Bonus action; teleport 30 ft to a visible space.",
      bonusAction: true,
      minLevel: 2,
    },
  ],
  spellSlots: 2,
  traits: [
    {
      kind: "signature",
      name: "Sleep & Magic Missile",
      text: "Sleep ends fights before they start; Magic Missile lands when a hit must.",
    },
    { kind: "racial", name: "Darkvision", text: "Sees in darkness out to 60 feet." },
    {
      kind: "racial",
      name: "Keen Senses",
      text: "Perception +3.",
    },
  ],
  skills: [
    { skill: "Arcana", ability: "INT", bonus: 5 },
    { skill: "Investigation", ability: "INT", bonus: 5 },
    { skill: "Perception", ability: "WIS", bonus: 3 },
  ],
  level2: {
    summary: "Third spell slot & Misty Step",
    grants: [
      "Three spell slots per long rest (up from two).",
      "Prepares Misty Step (bonus action, teleport 30 ft).",
    ],
    hpGain: 6,
    slots: 3,
  },
};

/** The four hero sheets in marching order. */
export const PARTY: readonly HeroSheet[] = [torvald, perrin, maera, elyndra];

export function getHeroSheet(id: HeroId): HeroSheet {
  const sheet = PARTY.find((hero) => hero.id === id);
  if (!sheet) throw new Error(`Unknown hero: ${id}`);
  return sheet;
}

/** Fresh runtime state for a new game — full HP, all resources banked.
 *
 * Level 2 applies the Chapter 3 milestone: the hit-point increase (average
 * hit die + CON), a third spell slot for both casters, and the level-2
 * feature resources (Action Surge, Cunning Action). */
export function createPartyRuntime(level: 1 | 2 = 1): Record<HeroId, HeroRuntime> {
  const runtime = {} as Record<HeroId, HeroRuntime>;
  for (const sheet of PARTY) {
    const maxHp = sheet.hp + (level >= 2 ? sheet.level2.hpGain ?? 0 : 0);
    const resources: Record<string, boolean> =
      sheet.id === "torvald" ? { secondWind: true } : {};
    if (level >= 2) {
      if (sheet.id === "torvald") resources.actionSurge = true;
      if (sheet.id === "perrin") resources.cunningAction = true;
    }
    runtime[sheet.id] = {
      heroId: sheet.id,
      level,
      hp: maxHp,
      maxHp,
      spellSlotsUsed: 0,
      conditions: [],
      resources,
    };
  }
  return runtime;
}
