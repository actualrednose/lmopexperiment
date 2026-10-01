/**
 * Combat kernel tests — the complete spell list (GDD §10.2, criterion 4):
 * every spell from Table 6 resolves with its written effect, slots are
 * consumed correctly, bonus-action spells use the bonus economy, and
 * level-2 gating holds (Misty Step).
 */

import { describe, expect, test } from "bun:test";
import { applyCommand, type BattleCommand } from "@/game/combat/actions";
import { castSpell } from "@/game/combat/spells";
import { hasCondition } from "@/game/combat/core";
import { getHeroSheet } from "@/content/party";
import type { Spell } from "@/game/types";
import { ambushBattle, forceTurn, hero, makeCtx } from "./combat-helpers";

function spellOf(name: string, casterId: "maera" | "elyndra"): Spell {
  const sheet = getHeroSheet(casterId);
  const spell = sheet.spells?.find((s) => s.name === name);
  if (!spell) throw new Error(`No spell ${name} on ${casterId}`);
  return spell;
}

describe("Maera's spells", () => {
  test("Sacred Flame — DEX save or 1d8 radiant", () => {
    const battle = ambushBattle(61);
    const goblin = hero(battle, "Goblin A");
    // Failed save (goblin DEX +2): save 3 + 2 = 5 < DC 13.
    const fail = makeCtx(battle, [3, 6]); // save d20, damage d8
    let r = castSpell(fail.ctx, hero(battle, "maera"), spellOf("Sacred Flame", "maera"), {
      targetIds: ["Goblin A"],
    });
    expect(r.ok).toBe(true);
    expect(goblin.hp).toBe(7 - 6);
    // Made save: 15 + 2 = 17 ≥ 13 → no damage.
    const made = makeCtx(battle, [15, 6]);
    goblin.hp = 7;
    r = castSpell(made.ctx, hero(battle, "maera"), spellOf("Sacred Flame", "maera"), {
      targetIds: ["Goblin A"],
    });
    expect(r.ok).toBe(true);
    expect(goblin.hp).toBe(7);
  });

  test("Bless — three allies carry +1d4 for exactly three rounds", () => {
    const battle = ambushBattle(62);
    const { ctx } = makeCtx(battle);
    const r = castSpell(ctx, hero(battle, "maera"), spellOf("Bless", "maera"), {
      targetIds: ["torvald", "perrin", "maera"],
    });
    expect(r.ok).toBe(true);
    expect(hero(battle, "torvald").blessRounds).toBe(3);
    expect(hero(battle, "perrin").blessRounds).toBe(3);
    expect(hero(battle, "maera").blessRounds).toBe(3);
    expect(hero(battle, "elyndra").blessRounds).toBe(0);
    // Three end-of-round ticks expire it.
    applyCommandEndRound3(battle);
    expect(hero(battle, "torvald").blessRounds).toBe(0);

    function applyCommandEndRound3(b: Parameters<typeof endRoundTimes>[0]) {
      endRoundTimes(b, 3);
    }
  });

  test("Cure Wounds — touch heal 1d8+5 (Disciple of Life), revives the Down", () => {
    const battle = ambushBattle(63);
    const maera = hero(battle, "maera");
    const perrin = hero(battle, "perrin");
    perrin.hp = 0;
    perrin.conditions.push("Down");
    perrin.position = { x: 1, y: 6 }; // far away — touch fails, no dice spent
    const rejected = castSpell(makeCtx(battle, [4]).ctx, maera, spellOf("Cure Wounds", "maera"), {
      targetIds: ["perrin"],
    });
    expect(rejected.ok).toBe(false);
    expect(hasCondition(perrin, "Down")).toBe(true);
    // Adjacent at the wagon: Maera (6,4) reaches Perrin (5,4).
    perrin.position = { x: 5, y: 4 };
    const { ctx } = makeCtx(battle, [4]); // d8 = 4
    const ok = castSpell(ctx, maera, spellOf("Cure Wounds", "maera"), {
      targetIds: ["perrin"],
    });
    expect(ok.ok).toBe(true);
    expect(hasCondition(perrin, "Down")).toBe(false);
    expect(perrin.hp).toBe(4 + 5); // 1d8 + 3, +2 Disciple of Life
  });

  test("Guiding Bolt — 4d6 radiant and marks the target for advantage", () => {
    const battle = ambushBattle(64);
    const goblin = hero(battle, "Goblin A");
    hero(battle, "maera").position = { x: 5, y: 3 };
    // d20 16 (+5 = 21 vs AC 15), then 4d6.
    const { ctx } = makeCtx(battle, [16, 3, 3, 3, 3]);
    const r = castSpell(ctx, hero(battle, "maera"), spellOf("Guiding Bolt", "maera"), {
      targetIds: ["Goblin A"],
    });
    expect(r.ok).toBe(true);
    expect(goblin.hp).toBe(0); // 12 damage on a 7 HP goblin — clamped, Down
    expect(hasCondition(goblin, "Down")).toBe(true);
    const battle2 = ambushBattle(64);
    const goblin2 = hero(battle2, "Goblin A");
    goblin2.hp = 40; // sturdy target
    const { ctx: ctx2 } = makeCtx(battle2, [16, 1, 1, 1, 1]);
    castSpell(ctx2, hero(battle2, "maera"), spellOf("Guiding Bolt", "maera"), {
      targetIds: ["Goblin A"],
    });
    expect(goblin2.guidingBolt).toBe(true);
    expect(goblin2.hp).toBe(40 - 4); // 4d6, all ones
  });

  test("Healing Word — bonus-action pickup at range", () => {
    const battle = ambushBattle(65);
    const { ctx } = makeCtx(battle, [3]); // d4 = 3
    const elyndra = hero(battle, "elyndra");
    elyndra.hp = 2;
    const r = castSpell(ctx, hero(battle, "maera"), spellOf("Healing Word", "maera"), {
      targetIds: ["elyndra"],
    });
    expect(r.ok).toBe(true);
    expect(elyndra.hp).toBe(8); // 2 + (3 + 3 + 2 Disciple) = 10, capped at max 8
    expect(battle.stats.partyHealing).toBe(6); // 8 - 2 actually healed
  });
});

describe("Elyndra's spells", () => {
  test("Fire Bolt — +5 attack, 1d10 fire", () => {
    const battle = ambushBattle(71);
    const goblin = hero(battle, "Goblin A");
    const { ctx } = makeCtx(battle, [15, 7]); // d20 15 → 20 vs 17 (cover), d10 7
    const r = castSpell(ctx, hero(battle, "elyndra"), spellOf("Fire Bolt", "elyndra"), {
      targetIds: ["Goblin A"],
    });
    expect(r.ok).toBe(true);
    expect(goblin.hp).toBe(0); // 7 damage exactly drops the goblin
    expect(hasCondition(goblin, "Down")).toBe(true);
  });

  test("Light and Mage Hand — flavor only, no state change", () => {
    const battle = ambushBattle(72);
    const before = JSON.stringify({
      hp: Object.values(battle.combatants).map((c) => c.hp),
    });
    const a = castSpell(makeCtx(battle).ctx, hero(battle, "elyndra"), spellOf("Light", "elyndra"), {});
    const b = castSpell(
      makeCtx(battle).ctx,
      hero(battle, "elyndra"),
      spellOf("Mage Hand", "elyndra"),
      {}
    );
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
    expect(before).toBe(
      JSON.stringify({ hp: Object.values(battle.combatants).map((c) => c.hp) })
    );
  });

  test("Burning Hands — 15-ft cone, DEX save half", () => {
    const battle = ambushBattle(73);
    const elyndra = hero(battle, "elyndra");
    elyndra.position = { x: 5, y: 3 };
    // Two goblins in the eastern cone, one far behind — out of it.
    const g1 = hero(battle, "Goblin A");
    const g2 = hero(battle, "Goblin B");
    const far = hero(battle, "Goblin C");
    g1.position = { x: 7, y: 3 }; // 2 east — in cone
    g2.position = { x: 7, y: 2 }; // east-north — in cone (≤ 45°)
    far.position = { x: 3, y: 6 }; // far south-west — out
    // Per victim the kernel draws: save d20, then 3× d6.
    // g1: save 2 (+2 = 4 < 13, fails) → 4+1+2 = 7 fire. g2: save 20 (+2, saves)
    // → 6+1+1 = 8, halved to 4.
    const { ctx } = makeCtx(battle, [2, 4, 1, 2, 20, 6, 1, 1]);
    const r = castSpell(ctx, elyndra, spellOf("Burning Hands", "elyndra"), {
      targetIds: ["Goblin A"],
    });
    expect(r.ok).toBe(true);
    expect(g1.hp).toBe(0); // 7 damage drops a 7 HP goblin
    expect(hasCondition(g1, "Down")).toBe(true);
    expect(g2.hp).toBe(7 - 4); // goblins have 7 HP; halved 4 damage
    expect(far.hp).toBe(7); // untouched outside the cone
  });

  test("Magic Missile — three darts never miss, round-robin over targets", () => {
    const battle = ambushBattle(74);
    const g1 = hero(battle, "Goblin A");
    const g2 = hero(battle, "Goblin B");
    g1.hp = 20;
    g2.hp = 20;
    g1.position = { x: 6, y: 3 };
    g2.position = { x: 6, y: 4 };
    // d4s: 3, 2, 3 → darts 4, 3, 4; round-robin g1, g2, g1.
    const { ctx } = makeCtx(battle, [3, 2, 3]);
    const r = castSpell(ctx, hero(battle, "elyndra"), spellOf("Magic Missile", "elyndra"), {
      targetIds: ["Goblin A", "Goblin B"],
    });
    expect(r.ok).toBe(true);
    expect(g1.hp).toBe(20 - 4 - 4);
    expect(g2.hp).toBe(20 - 3);
  });

  test("Mage Armor — self, +2 AC for the rest of the scene, once", () => {
    const battle = ambushBattle(75);
    const elyndra = hero(battle, "elyndra");
    expect(elyndra.ac).toBe(13);
    const a = castSpell(makeCtx(battle).ctx, elyndra, spellOf("Mage Armor", "elyndra"), {});
    expect(a.ok).toBe(true);
    expect(elyndra.ac).toBe(15);
    const again = castSpell(makeCtx(battle).ctx, elyndra, spellOf("Mage Armor", "elyndra"), {});
    expect(again.ok).toBe(false);
    expect(elyndra.ac).toBe(15);
  });

  test("Sleep — 5d8 pool, weakest enemies first, no save", () => {
    const battle = ambushBattle(76);
    // Weakest first: 7,7,7,7 → pool 24 sleeps three goblins.
    const { ctx } = makeCtx(battle, [4, 4, 4, 4, 8]); // 5d8 = 24
    const r = castSpell(ctx, hero(battle, "elyndra"), spellOf("Sleep", "elyndra"), {});
    expect(r.ok).toBe(true);
    const sleeping = Object.values(battle.combatants).filter((c) => c.side === "enemy" && c.sleeping);
    expect(sleeping.length).toBe(3);
    expect(battle.stats.sleptEnemies).toBe(3);
  });

  test("Misty Step — bonus-action teleport 30 ft to an empty square", () => {
    const battle = ambushBattle(77, 2);
    const elyndra = hero(battle, "elyndra");
    elyndra.position = { x: 5, y: 3 };
    const { ctx } = makeCtx(battle);
    const r = castSpell(ctx, elyndra, spellOf("Misty Step", "elyndra"), {
      to: { x: 10, y: 4 },
    });
    expect(r.ok).toBe(true);
    expect(elyndra.position).toEqual({ x: 10, y: 4 });
    // Beyond 30 ft is rejected.
    const far = castSpell(makeCtx(battle).ctx, elyndra, spellOf("Misty Step", "elyndra"), {
      to: { x: 0, y: 6 },
    });
    expect(far.ok).toBe(false);
  });
});

describe("slot and action economy via applyCommand", () => {
  function withTurn(battleId: "maera" | "elyndra", cmd: BattleCommand) {
    const battle = ambushBattle(81);
    forceTurn(battle, battleId);
    return applyCommand(battle, cmd);
  }

  test("a leveled spell consumes a slot; cantrips do not", () => {
    const fire = withTurn("elyndra", { type: "cast", spellName: "Fire Bolt", targetIds: ["Goblin A"] });
    expect(hero(fire, "elyndra").spellSlotsUsed).toBe(0);
    expect(hero(fire, "elyndra").actionUsed).toBe(true);
    const missile = withTurn("elyndra", { type: "cast", spellName: "Magic Missile", targetIds: ["Goblin A"] });
    expect(hero(missile, "elyndra").spellSlotsUsed).toBe(1);
  });

  test("the slot counter gates casting", () => {
    const battle = ambushBattle(82);
    forceTurn(battle, "maera");
    let b = battle;
    b.combatants["maera"].maxSpellSlots = 1;
    const first = applyCommand(b, { type: "cast", spellName: "Bless", targetIds: ["torvald"] });
    expect(hero(first, "maera").spellSlotsUsed).toBe(1);
    const second = applyCommand(first, { type: "cast", spellName: "Guiding Bolt", targetIds: ["Goblin A"] });
    // No slot left, and the action is spent — nothing happens.
    expect(hero(second, "maera").spellSlotsUsed).toBe(1);
    expect(second.log.length).toBe(first.log.length);
  });

  test("Healing Word is a bonus action — the action stays available", () => {
    const battle = ambushBattle(83);
    forceTurn(battle, "maera");
    const after = applyCommand(battle, {
      type: "cast",
      spellName: "Healing Word",
      targetIds: ["perrin"],
    });
    expect(hero(after, "maera").bonusActionUsed).toBe(true);
    expect(hero(after, "maera").actionUsed).toBe(false);
    expect(hero(after, "maera").spellSlotsUsed).toBe(1);
    expect(hero(after, "perrin").hp).toBe(10); // capped at max
  });

  test("Misty Step is gated behind party level 2", () => {
    const battle = ambushBattle(84, 1);
    forceTurn(battle, "elyndra");
    const before = battle.log.length;
    const after = applyCommand(battle, {
      type: "cast",
      spellName: "Misty Step",
      to: { x: 8, y: 4 },
    });
    expect(after.log.length).toBe(before); // rejected silently
    expect(hero(after, "elyndra").position).toEqual({ x: 5, y: 5 }); // spawn unchanged
    expect(hero(after, "elyndra").spellSlotsUsed).toBe(0);
  });

  test("potions heal 2d4+2 and consume the shared supply", () => {
    const battle = ambushBattle(85);
    forceTurn(battle, "perrin");
    const after = applyCommand(battle, { type: "item", targetId: "perrin" });
    expect(after.potions).toBe(1);
    expect(after.stats.potionsUsed).toBe(1);
    expect(hero(after, "perrin").hp).toBe(10); // capped at max
    expect(hero(after, "perrin").actionUsed).toBe(true);
  });
});

/* Round-ticker used by the Bless expiry test. */
function endRoundTimes(battle: import("@/game/types").BattleState, times: number): void {
  let b = battle;
  let rounds = 0;
  let guard = 0;
  while (rounds < times && guard < 64) {
    b = applyCommand(b, { type: "endTurn" });
    guard += 1;
    if (b.round > battle.round + rounds) rounds = b.round - battle.round;
  }
  // The Bless counters live on the clone chain — copy the latest values back
  // onto the passed-in battle handle so assertions see them.
  for (const id of Object.keys(battle.combatants)) {
    battle.combatants[id].blessRounds = b.combatants[id].blessRounds;
  }
}
