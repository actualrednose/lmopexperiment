/**
 * Party content tests — the four hero sheets must carry every Chapter 3
 * field, and every listed skill bonus must be derivable from the ability
 * score, proficiency (+2 at level 1) and the expertise flag.
 */

import { describe, expect, test } from "bun:test";
import { PARTY, PARTY_ORDER, createPartyRuntime, getHeroSheet } from "@/content/party";
import { abilityModifier, diceAverage, diceMax, diceMin, formatDice } from "@/game/dice";
import type { AbilityKey, HeroId } from "@/game/types";

const ABILITY_KEYS: readonly AbilityKey[] = ["STR", "DEX", "CON", "INT", "WIS", "CHA"];
const VALID_DIE_SIDES = new Set([4, 6, 8, 10, 12, 20]);

describe("party roster", () => {
  test("four heroes in marching order with unique ids", () => {
    expect(PARTY.length).toBe(4);
    expect(PARTY.map((h) => h.id)).toEqual([...PARTY_ORDER]);
    expect(new Set(PARTY.map((h) => h.id)).size).toBe(4);
  });

  test("getHeroSheet resolves every hero and rejects unknown ids", () => {
    for (const id of PARTY_ORDER) {
      expect(getHeroSheet(id).id).toBe(id);
    }
    expect(() => getHeroSheet("sildar" as HeroId)).toThrow();
  });
});

describe("hero sheet structure (Chapter 3 fidelity)", () => {
  for (const hero of PARTY) {
    test(`${hero.name} carries a complete sheet`, () => {
      expect(hero.level).toBe(1);
      expect(hero.ac).toBeGreaterThan(0);
      expect(hero.hp).toBeGreaterThan(0);
      expect(hero.speed).toBeGreaterThan(0);
      expect(hero.bio.length).toBeGreaterThan(40);
      expect(hero.fantasy.length).toBeGreaterThan(10);
      expect(hero.role.length).toBeGreaterThan(5);

      for (const key of ABILITY_KEYS) {
        expect(typeof hero.abilities[key]).toBe("number");
        expect(hero.abilities[key]).toBeGreaterThanOrEqual(6);
        expect(hero.abilities[key]).toBeLessThanOrEqual(20);
      }

      for (const attack of hero.attacks) {
        expect(attack.attackBonus).toBeGreaterThan(0);
        expect(attack.damage.count).toBeGreaterThanOrEqual(1);
        expect(VALID_DIE_SIDES.has(attack.damage.sides)).toBe(true);
        expect(attack.damageType.length).toBeGreaterThan(3);
      }

      expect(hero.skills.length).toBeGreaterThan(0);
      expect(hero.traits.some((t) => t.kind === "signature")).toBe(true);
      expect(hero.level2.grants.length).toBeGreaterThan(0);
      expect(hero.level2.summary.length).toBeGreaterThan(3);
    });
  }

  test("only the two casters carry spells and slots", () => {
    const maera = getHeroSheet("maera");
    const elyndra = getHeroSheet("elyndra");
    const torvald = getHeroSheet("torvald");
    const perrin = getHeroSheet("perrin");

    expect(maera.spells?.length).toBeGreaterThan(0);
    expect(maera.spellSlots).toBe(2);
    expect(elyndra.spells?.length).toBeGreaterThan(0);
    expect(elyndra.spellSlots).toBe(2);
    expect(torvald.spells).toBeUndefined();
    expect(torvald.spellSlots).toBeUndefined();
    expect(perrin.spells).toBeUndefined();
    expect(perrin.spellSlots).toBeUndefined();
  });

  test("GDD spot values (Tables 4–7)", () => {
    const torvald = getHeroSheet("torvald");
    expect(torvald.ac).toBe(18);
    expect(torvald.hp).toBe(13);
    expect(torvald.speed).toBe(25);
    expect(torvald.abilities.STR).toBe(16);

    const perrin = getHeroSheet("perrin");
    expect(perrin.ac).toBe(14);
    expect(perrin.hp).toBe(10);
    const stealth = perrin.skills.find((s) => s.skill === "Stealth");
    expect(stealth?.bonus).toBe(7);
    expect(stealth?.expertise).toBe(true);

    const maera = getHeroSheet("maera");
    expect(maera.ac).toBe(18);
    expect(maera.hp).toBe(10);
    const spellNames = maera.spells!.map((s) => s.name);
    expect(spellNames).toEqual(
      expect.arrayContaining(["Sacred Flame", "Bless", "Cure Wounds", "Guiding Bolt", "Healing Word"])
    );

    const elyndra = getHeroSheet("elyndra");
    expect(elyndra.ac).toBe(13);
    expect(elyndra.acNote).toContain("15");
    expect(elyndra.hp).toBe(8);
    const elyndraSpells = elyndra.spells!.map((s) => s.name);
    expect(elyndraSpells).toEqual(
      expect.arrayContaining([
        "Fire Bolt",
        "Light",
        "Mage Hand",
        "Burning Hands",
        "Magic Missile",
        "Mage Armor",
        "Sleep",
        "Misty Step",
      ])
    );
    const mistyStep = elyndra.spells!.find((s) => s.name === "Misty Step");
    expect(mistyStep?.minLevel).toBe(2);
  });
});

describe("skill math (ability + proficiency + expertise)", () => {
  test("every listed bonus is derivable from the sheet's abilities", () => {
    for (const hero of PARTY) {
      for (const entry of hero.skills) {
        const expected =
          abilityModifier(hero.abilities[entry.ability]) +
          2 + // proficiency at level 1
          (entry.expertise ? 2 : 0);
        expect(entry.bonus).toBe(expected);
      }
    }
  });
});

describe("attack math sanity", () => {
  test("attack bonuses equal STR/DEX modifier + proficiency", () => {
    for (const hero of PARTY) {
      for (const attack of hero.attacks) {
        const expected =
          Math.max(
            abilityModifier(hero.abilities.STR),
            abilityModifier(hero.abilities.DEX)
          ) + 2;
        expect(attack.attackBonus).toBe(expected);
      }
    }
  });
});

describe("createPartyRuntime", () => {
  test("spawns four heroes at full health with banked resources", () => {
    const runtime = createPartyRuntime();
    expect(Object.keys(runtime).length).toBe(4);
    for (const id of PARTY_ORDER) {
      const hero = runtime[id];
      const sheet = getHeroSheet(id);
      expect(hero.heroId).toBe(id);
      expect(hero.level).toBe(1);
      expect(hero.hp).toBe(sheet.hp);
      expect(hero.maxHp).toBe(sheet.hp);
      expect(hero.spellSlotsUsed).toBe(0);
      expect(hero.conditions).toEqual([]);
    }
    expect(runtime.torvald.resources.secondWind).toBe(true);
  });
});

describe("dice helpers", () => {
  test("formatDice, min/max/average agree", () => {
    expect(formatDice({ count: 1, sides: 8, plus: 3 })).toBe("1d8+3");
    expect(formatDice({ count: 2, sides: 6 })).toBe("2d6");
    expect(formatDice({ count: 1, sides: 10, plus: -1 })).toBe("1d10-1");
    const expr = { count: 4, sides: 6 };
    expect(diceMin(expr)).toBe(4);
    expect(diceMax(expr)).toBe(24);
    expect(diceAverage(expr)).toBe(14);
  });
});
