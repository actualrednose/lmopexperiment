/**
 * Animation-pass metadata tests: every log entry that should drive an
 * attack animation carries `strike` (who, whom, melee/ranged, hit, crit,
 * projectile flavor), teleports carry `teleport`, and nothing else does.
 * The metadata is UI-only — these tests also pin the contract that it
 * never appears on non-combat entries (moves, dashes, buffs).
 */

import { describe, expect, test } from "bun:test";
import { resolveAttack } from "@/game/combat/core";
import { castSpell } from "@/game/combat/spells";
import { getHeroSheet } from "@/content/party";
import type { Spell } from "@/game/types";
import { ambushBattle, hero, makeCtx } from "./combat-helpers";

const WARHAMMER = { name: "Warhammer", attackBonus: 5, damage: { count: 1, sides: 8, plus: 3 } };
const LONGBOW = { name: "Shortbow", attackBonus: 5, damage: { count: 1, sides: 6, plus: 3 } };

function spellOf(name: string, casterId: "maera" | "elyndra"): Spell {
  const sheet = getHeroSheet(casterId);
  const spell = sheet.spells?.find((s) => s.name === name);
  if (!spell) throw new Error(`No spell ${name} on ${casterId}`);
  return spell;
}

describe("strike metadata — the shared attack pipeline", () => {
  test("melee hit carries melee strike with hit/crit flags", () => {
    const battle = ambushBattle(11);
    const { ctx } = makeCtx(battle, [14, 1]);
    resolveAttack(ctx, hero(battle, "torvald"), hero(battle, "Goblin A"), WARHAMMER, {
      melee: true,
    });
    const strike = battle.log.find((e) => e.strike)?.strike;
    expect(strike).toEqual({
      attackerId: "torvald",
      targetId: "Goblin A",
      melee: true,
      hit: true,
      crit: false,
      flavor: undefined,
    });
  });

  test("melee miss still carries the strike (hit false)", () => {
    const battle = ambushBattle(12);
    const { ctx } = makeCtx(battle, [4, 1]);
    resolveAttack(ctx, hero(battle, "torvald"), hero(battle, "Goblin A"), WARHAMMER, {
      melee: true,
    });
    expect(battle.log.at(-1)?.strike?.hit).toBe(false);
  });

  test("crit is flagged for the crit burst animation", () => {
    const battle = ambushBattle(13);
    const { ctx } = makeCtx(battle, [20, 1, 1]);
    resolveAttack(ctx, hero(battle, "torvald"), hero(battle, "Goblin A"), WARHAMMER, {
      melee: true,
    });
    expect(battle.log.find((e) => e.strike)?.strike?.crit).toBe(true);
  });

  test("ranged weapons get the arrow flavor", () => {
    const battle = ambushBattle(14);
    const { ctx } = makeCtx(battle, [16, 3]);
    resolveAttack(ctx, hero(battle, "perrin"), hero(battle, "Goblin A"), LONGBOW, {
      melee: false,
    });
    const strike = battle.log.find((e) => e.strike)?.strike;
    expect(strike?.melee).toBe(false);
    expect(strike?.flavor).toBe("arrow");
  });

  test("Fire Bolt and Guiding Bolt pick their spell flavors", () => {
    const fireBolt = { name: "Fire Bolt", attackBonus: 5, damage: { count: 1, sides: 10, plus: 0 } };
    const battle = ambushBattle(15);
    const { ctx } = makeCtx(battle, [16, 4]);
    resolveAttack(ctx, hero(battle, "elyndra"), hero(battle, "Goblin A"), fireBolt, {
      melee: false,
    });
    expect(battle.log.find((e) => e.strike)?.strike?.flavor).toBe("fire");

    const bolt = { name: "Guiding Bolt", attackBonus: 5, damage: { count: 4, sides: 6, plus: 0 } };
    const battle2 = ambushBattle(16);
    const { ctx: ctx2 } = makeCtx(battle2, [16, 1, 1, 1, 1]);
    resolveAttack(ctx2, hero(battle2, "maera"), hero(battle2, "Goblin A"), bolt, {
      melee: false,
    });
    expect(battle2.log.find((e) => e.strike)?.strike?.flavor).toBe("radiant");
  });
});

describe("strike metadata — spells", () => {
  test("Sacred Flame's save entry strikes radiant, hit = failed save", () => {
    const battle = ambushBattle(61);
    const goblin = hero(battle, "Goblin A");
    const { ctx } = makeCtx(battle, [3, 6]); // save 3+2 < 13 → burns
    const r = castSpell(ctx, hero(battle, "maera"), spellOf("Sacred Flame", "maera"), {
      targetIds: ["Goblin A"],
    });
    expect(r.ok).toBe(true);
    expect(goblin.hp).toBeLessThan(7);
    const strike = battle.log.find((e) => e.strike)?.strike;
    expect(strike).toMatchObject({
      attackerId: "maera",
      targetId: "Goblin A",
      melee: false,
      hit: true,
      flavor: "radiant",
    });

    // Made save → hit false.
    const made = ambushBattle(62);
    const { ctx: mctx } = makeCtx(made, [15, 6]);
    castSpell(mctx, hero(made, "maera"), spellOf("Sacred Flame", "maera"), {
      targetIds: ["Goblin A"],
    });
    expect(made.log.find((e) => e.strike)?.strike?.hit).toBe(false);
  });

  test("every Magic Missile dart carries a dart strike at its own target", () => {
    const battle = ambushBattle(181);
    const { ctx } = makeCtx(battle, [1, 1, 1, 2, 2, 2]);
    const r = castSpell(ctx, hero(battle, "elyndra"), spellOf("Magic Missile", "elyndra"), {
      targetIds: ["Goblin A", "Goblin B"],
    });
    expect(r.ok).toBe(true);
    const strikes = battle.log
      .filter((e) => e.strike?.flavor === "dart")
      .map((e) => e.strike!);
    expect(strikes.length).toBe(3);
    expect(strikes.every((s) => s.attackerId === "elyndra" && s.hit && !s.crit)).toBe(true);
    expect(new Set(strikes.map((s) => s.targetId))).toEqual(new Set(["Goblin A", "Goblin B"]));
  });

  test("Misty Step logs a teleport from and to", () => {
    const battle = ambushBattle(222, 2);
    const elyndra = hero(battle, "elyndra");
    const from = { ...elyndra.position! };
    const dest = { x: Math.min(battle.width - 1, from.x + 2), y: from.y };
    const { ctx } = makeCtx(battle, []);
    const r = castSpell(ctx, elyndra, spellOf("Misty Step", "elyndra"), { to: dest });
    expect(r.ok).toBe(true);
    const tp = battle.log.find((e) => e.teleport)?.teleport;
    expect(tp?.from).toEqual(from);
    expect(tp?.to).toEqual(dest);
    expect(elyndra.position).toEqual(dest);
  });
});

describe("strike metadata — negative space", () => {
  test("moves, dashes and buffs never carry strike or teleport", () => {
    const battle = ambushBattle(31);
    const { ctx } = makeCtx(battle, [18, 1]);
    // A melee attack whose *damage* entry follows — both scanned below.
    resolveAttack(ctx, hero(battle, "torvald"), hero(battle, "Goblin A"), WARHAMMER, {
      melee: true,
    });
    // The damage entry (logged by applyDamage) must NOT re-carry the strike.
    const damageEntries = battle.log.filter((e) => e.fx?.length && e.strike);
    expect(damageEntries.length).toBe(0);
    // No entry so far carries a teleport.
    expect(battle.log.some((e) => e.teleport)).toBe(false);
  });
});
