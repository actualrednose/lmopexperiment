/**
 * Combat kernel tests — core mechanics (GDD §10.2, acceptance criterion 4):
 * hit and crit resolution, the advantage whitelist, cover, initiative,
 * surprise, opportunity attacks, Down transitions, morale and victory or
 * defeat flows, plus seeded-replay determinism (criterion 2).
 */

import { describe, expect, test } from "bun:test";
import { ROAD_AMBUSH } from "@/content/arenas";
import { applyCommand } from "@/game/combat/actions";
import { chooseEnemyCommand } from "@/game/combat/ai";
import {
  activeCombatant,
  applyDamage,
  applyHealing,
  canAct,
  createBattle,
  hasCondition,
  resolveAttack,
} from "@/game/combat/core";
import type { BattleState, Combatant } from "@/game/types";
import { ambushBattle, forceTurn, hero, makeCtx, wolfBattle } from "./combat-helpers";

const WARHAMMER = { name: "Warhammer", attackBonus: 5, damage: { count: 1, sides: 8, plus: 3 } };
const GOBLIN_AC = 15;

describe("createBattle", () => {
  test("spawns the four heroes and four goblins with Chapter 3/7 statistics", () => {
    const battle = ambushBattle(42);
    expect(Object.keys(battle.combatants)).toHaveLength(8);
    expect(battle.order).toHaveLength(8);
    const torvald = hero(battle, "torvald");
    expect(torvald.ac).toBe(18);
    expect(torvald.hp).toBe(13);
    expect(torvald.maxSpellSlots).toBe(0);
    expect(torvald.resources.secondWind).toBe(true);
    const maera = hero(battle, "maera");
    expect(maera.maxSpellSlots).toBe(2);
    const goblin = hero(battle, "Goblin A");
    expect(goblin.ac).toBe(15);
    expect(goblin.hp).toBe(7);
    expect(battle.potions).toBe(2);
    expect(battle.round).toBe(1);
    expect(battle.status).toBe("active");
  });

  test("level 2 applies the milestone kit", () => {
    const battle = ambushBattle(7, 2);
    expect(hero(battle, "torvald").maxHp).toBe(22);
    expect(hero(battle, "perrin").maxHp).toBe(16);
    expect(hero(battle, "maera").maxHp).toBe(17);
    expect(hero(battle, "elyndra").maxHp).toBe(14);
    expect(hero(battle, "maera").maxSpellSlots).toBe(3);
    expect(hero(battle, "torvald").resources.actionSurge).toBe(true);
    expect(hero(battle, "perrin").resources.cunningAction).toBe(true);
  });

  test("initiative is sorted descending with heroes winning ties", () => {
    const battle = ambushBattle(1234);
    const inits = battle.order.map((id) => battle.combatants[id].initiative);
    for (let i = 1; i < inits.length; i++) {
      expect(inits[i - 1]).toBeGreaterThanOrEqual(inits[i]);
    }
    // Tie-break: whenever a hero and an enemy share a value, the hero is first.
    for (let i = 1; i < battle.order.length; i++) {
      const a = battle.combatants[battle.order[i - 1]];
      const b = battle.combatants[battle.order[i]];
      if (a.initiative === b.initiative && a.side !== b.side) {
        expect(a.side).toBe("party");
      }
    }
  });

  test("the ambush Stealth contest produces both Surprised and spotted runs", () => {
    let surprised: BattleState | null = null;
    let alert: BattleState | null = null;
    for (let seed = 1; seed <= 400 && (!surprised || !alert); seed++) {
      const battle = ambushBattle(seed);
      const anySurprised = Object.values(battle.combatants).some(
        (c) => c.side === "party" && hasCondition(c, "Surprised")
      );
      if (anySurprised && !surprised) surprised = battle;
      if (!anySurprised && !alert) alert = battle;
    }
    expect(surprised).not.toBeNull();
    expect(alert).not.toBeNull();
    // Surprised heroes cannot act in round 1 (GDD Table 7).
    const heroId = "torvald";
    expect(canAct(surprised!.combatants[heroId], 1)).toBe(
      hasCondition(surprised!.combatants[heroId], "Surprised") ? false : true
    );
    expect(surprised!.log.some((e) => e.text.includes("Ambush!"))).toBe(true);
    expect(alert!.log.some((e) => e.text.includes("no surprise"))).toBe(true);
  });

  test("Surprised heroes are skipped by round-1 turn advancement", () => {
    let battle: BattleState | null = null;
    for (let seed = 1; seed <= 400 && !battle; seed++) {
      const b = ambushBattle(seed);
      if (Object.values(b.combatants).some((c) => c.side === "party" && hasCondition(c, "Surprised"))) {
        battle = b;
      }
    }
    expect(battle).not.toBeNull();
    // No matter how many turns advance, round 1 never lands on a Surprised hero.
    let b = battle!;
    for (let i = 0; i < 8; i++) {
      b = applyCommand(b, { type: "endTurn" });
      if (b.round === 1) {
        const active = activeCombatant(b);
        expect(hasCondition(active, "Surprised")).toBe(false);
      }
    }
  });
});

describe("resolveAttack — the shared pipeline", () => {
  test("plain hit: d20 + 5 vs AC 15, damage applies", () => {
    const battle = ambushBattle(11);
    const { ctx } = makeCtx(battle, [14, 1]); // d20 14, d8 1
    const torvald = hero(battle, "torvald");
    const goblin = hero(battle, "Goblin A");
    const result = resolveAttack(ctx, torvald, goblin, WARHAMMER, { melee: true });
    expect(result.hit).toBe(true);
    expect(result.crit).toBe(false);
    expect(result.damage).toBe(1 + 3); // 1d8 + 3
    expect(goblin.hp).toBe(7 - 4);
    expect(battle.stats.partyAttacks).toBe(1);
    expect(battle.stats.partyHits).toBe(1);
  });

  test("plain miss: below AC", () => {
    const battle = ambushBattle(12);
    const { ctx } = makeCtx(battle, [5, 1]);
    const result = resolveAttack(ctx, hero(battle, "torvald"), hero(battle, "Goblin A"), WARHAMMER, {
      melee: true,
    });
    expect(result.hit).toBe(false);
    expect(result.damage).toBe(0);
  });

  test("natural 20 is a critical hit — dice twice, modifiers once", () => {
    const battle = ambushBattle(13);
    const { ctx } = makeCtx(battle, [20, 1, 1]); // d20 20, damage dice 1,1
    const goblin = hero(battle, "Goblin A");
    const result = resolveAttack(ctx, hero(battle, "torvald"), goblin, WARHAMMER, { melee: true });
    expect(result.crit).toBe(true);
    expect(result.damage).toBe(1 + 1 + 3);
    expect(battle.log.some((e) => e.text.includes("CRITICAL"))).toBe(true);
  });

  test("natural 1 always misses", () => {
    const battle = ambushBattle(14);
    const { ctx } = makeCtx(battle, [1, 6]);
    const result = resolveAttack(ctx, hero(battle, "torvald"), hero(battle, "Goblin A"), WARHAMMER, {
      melee: true,
    });
    expect(result.hit).toBe(false);
    expect(result.damage).toBe(0);
  });

  test("advantage — Hidden attacker keeps the higher d20", () => {
    const battle = ambushBattle(15);
    const { ctx } = makeCtx(battle, [10, 15, 4]); // dice 10,15 → keep 15; d8 4
    const perrin = hero(battle, "perrin");
    perrin.conditions.push("Hidden");
    const goblin = hero(battle, "Goblin A");
    const result = resolveAttack(
      ctx,
      perrin,
      goblin,
      { name: "Shortbow", attackBonus: 5, damage: { count: 1, sides: 6, plus: 3 } },
      { melee: false }
    );
    expect(result.hit).toBe(true); // 15 + 5 = 20 vs 15 (+2 cover = 17) → hit
    const entry = battle.log.find((e) => e.roll?.mode === "advantage");
    expect(entry?.roll?.source).toBe("attacking from hiding");
  });

  test("disadvantage — Dodging target keeps the lower d20", () => {
    const battle = ambushBattle(16);
    const { ctx } = makeCtx(battle, [15, 5, 4]); // keep 5 → 10 vs AC 15
    const goblin = hero(battle, "Goblin A");
    goblin.dodging = true;
    const result = resolveAttack(ctx, hero(battle, "torvald"), goblin, WARHAMMER, { melee: true });
    expect(result.hit).toBe(false);
    const entry = battle.log.find((e) => e.roll?.mode === "disadvantage");
    expect(entry?.roll?.source).toBe("the target is Dodging");
  });

  test("one advantage and one disadvantage cancel to a plain roll", () => {
    const battle = ambushBattle(17);
    const { ctx } = makeCtx(battle, [15, 5, 4]); // one die only → 15+5=20 vs AC 15
    const torvald = hero(battle, "torvald");
    torvald.conditions.push("Hidden"); // advantage
    const goblin = hero(battle, "Goblin A");
    goblin.dodging = true; // disadvantage
    const result = resolveAttack(ctx, torvald, goblin, WARHAMMER, { melee: true });
    expect(result.hit).toBe(true);
    expect(battle.log.every((e) => e.roll?.mode !== "advantage" && e.roll?.mode !== "disadvantage")).toBe(
      true
    );
  });

  test("cover — flat +2 AC vs ranged only (thicket tiles)", () => {
    const battle = ambushBattle(18);
    const perrin = hero(battle, "perrin");
    const goblin = hero(battle, "Goblin A");
    // Goblin A spawns on a thicket square (1,1) → covered vs ranged.
    expect(goblin.position).toEqual({ x: 1, y: 1 });
    // Same d20 (11 → total 16) for both: a miss vs covered AC 17,
    // a hit vs the melee AC 15.
    const ranged = makeCtx(battle, [11, 3]);
    const r1 = resolveAttack(
      ranged.ctx,
      perrin,
      goblin,
      { name: "Shortbow", attackBonus: 5, damage: { count: 1, sides: 6, plus: 3 } },
      { melee: false }
    );
    expect(r1.hit).toBe(false); // 16 vs AC 17 (cover +2)
    expect(battle.log.some((e) => e.text.includes("cover +2"))).toBe(true);
    const melee = makeCtx(battle, [11, 3]);
    const r2 = resolveAttack(melee.ctx, perrin, goblin, WARHAMMER, { melee: true });
    expect(r2.hit).toBe(true); // 16 vs AC 15
  });

  test("Bless adds its +1d4 to the attack roll", () => {
    const battle = ambushBattle(19);
    const { ctx } = makeCtx(battle, [9, 3, 2]); // d20 9, bless d4 3, d8 2
    const torvald = hero(battle, "torvald");
    torvald.blessRounds = 1;
    const goblin = hero(battle, "Goblin A");
    const result = resolveAttack(ctx, torvald, goblin, WARHAMMER, { melee: true });
    expect(result.hit).toBe(true); // 9 + 5 + 3 = 17 vs 15
    expect(result.damage).toBe(2 + 3);
  });

  test("Perrin's Sneak Attack fires when an ally is adjacent to the target", () => {
    const battle = ambushBattle(20);
    const torvald = hero(battle, "torvald");
    const perrin = hero(battle, "perrin");
    const goblin = hero(battle, "Goblin A");
    torvald.position = { x: 2, y: 1 }; // adjacent to Goblin A at (1,1)
    perrin.position = { x: 3, y: 3 };
    const { ctx } = makeCtx(battle, [14, 3, 4]); // d20, d6 damage, d6 sneak
    const result = resolveAttack(
      ctx,
      perrin,
      goblin,
      { name: "Shortbow", attackBonus: 5, damage: { count: 1, sides: 6, plus: 3 } },
      { melee: false }
    );
    expect(result.hit).toBe(true); // 19 vs 17 (cover)
    expect(result.damage).toBe(3 + 3 + 4); // weapon + sneak
    expect(battle.log.some((e) => e.text.includes("Sneak Attack"))).toBe(true);
  });

  test("Perrin's Lucky rerolls a natural 1 once", () => {
    const battle = ambushBattle(21);
    const { ctx } = makeCtx(battle, [1, 17, 3]); // nat 1 → reroll 17, d6 3
    const perrin = hero(battle, "perrin");
    const goblin = hero(battle, "Goblin A");
    const result = resolveAttack(
      ctx,
      perrin,
      goblin,
      { name: "Shortbow", attackBonus: 5, damage: { count: 1, sides: 6, plus: 3 } },
      { melee: false }
    );
    expect(result.hit).toBe(true); // 17 + 5 = 22 vs 17
    expect(battle.log.some((e) => e.text.includes("Lucky reroll"))).toBe(true);
  });

  test("wolf bite trips on a failed DC 11 STR save", () => {
    const battle = wolfBattle(22);
    const { ctx } = makeCtx(battle, [14, 3, 3, 2]); // attack, 2×d4 damage, save 2
    const wolf = hero(battle, "Wolf A");
    const torvald = hero(battle, "torvald");
    torvald.position = { x: 7, y: 2 }; // adjacent to Wolf A at (8,2)
    wolf.position = { x: 8, y: 2 };
    const result = resolveAttack(ctx, wolf, torvald, WOLF_BITE, {
      melee: true,
    });
    expect(result.hit).toBe(true); // 14 + 4 = 18 vs AC 18
    expect(hasCondition(torvald, "Prone")).toBe(true); // save 2 + 3 = 5 < 11
  });

  test("wolf bite spares the target on a made save", () => {
    const battle = wolfBattle(23);
    const { ctx } = makeCtx(battle, [14, 3, 3, 10]); // save 10 + 3 = 13 ≥ 11
    const wolf = hero(battle, "Wolf A");
    const torvald = hero(battle, "torvald");
    torvald.position = { x: 7, y: 2 };
    wolf.position = { x: 8, y: 2 };
    resolveAttack(ctx, wolf, torvald, WOLF_BITE, { melee: true });
    expect(hasCondition(torvald, "Prone")).toBe(false);
  });
});

const WOLF_BITE = { name: "Bite", attackBonus: 4, damage: { count: 2, sides: 4, plus: 2 } };

describe("damage, healing and Down", () => {
  test("a hero at 0 HP is Down, and healing ends Down and Prone", () => {
    const battle = ambushBattle(31);
    const { ctx } = makeCtx(battle);
    const perrin = hero(battle, "perrin");
    applyDamage(ctx, hero(battle, "Goblin A"), perrin, 10, "scimitar");
    expect(perrin.hp).toBe(0);
    expect(hasCondition(perrin, "Down")).toBe(true);
    perrin.conditions.push("Prone");
    const healed = applyHealing(ctx, perrin, 6);
    expect(healed).toBe(6);
    expect(hasCondition(perrin, "Down")).toBe(false);
    expect(hasCondition(perrin, "Prone")).toBe(false);
    expect(perrin.hp).toBe(6);
    expect(battle.stats.partyDamageTaken).toBe(10);
    expect(battle.stats.partyHealing).toBe(6);
  });

  test("victory revives Down heroes at 1 HP (GDD Table 7)", () => {
    const battle = ambushBattle(32);
    const { ctx } = makeCtx(battle);
    const perrin = hero(battle, "perrin");
    applyDamage(ctx, null, perrin, 10, "arrows");
    for (const id of ["Goblin A", "Goblin B", "Goblin C", "Goblin D"]) {
      applyDamage(ctx, hero(battle, "torvald"), hero(battle, id), 99, "warhammer");
    }
    expect(battle.status).toBe("victory");
    expect(perrin.hp).toBe(1);
    expect(hasCondition(perrin, "Down")).toBe(false);
  });

  test("all four heroes Down is a total party kill", () => {
    const battle = ambushBattle(33);
    const { ctx } = makeCtx(battle);
    for (const id of ["torvald", "perrin", "maera", "elyndra"]) {
      applyDamage(ctx, hero(battle, "Goblin A"), hero(battle, id), 99, "scimitar");
    }
    expect(battle.status).toBe("defeat");
  });
});

describe("morale (GDD §4.5 / Table 11)", () => {
  test("the last goblin standing breaks for the tree line", () => {
    const battle = ambushBattle(41);
    const { ctx } = makeCtx(battle);
    const goblins = ["Goblin A", "Goblin B", "Goblin C"];
    for (const id of goblins) {
      applyDamage(ctx, hero(battle, "torvald"), hero(battle, id), 99, "warhammer");
    }
    const last = hero(battle, "Goblin D");
    expect(last.fleeing).toBe(true);
    expect(battle.status).toBe("active"); // fled ≠ dead: battle continues
    expect(battle.log.some((e) => e.text.includes("breaks for the tree line"))).toBe(true);
  });

  test("wolves fight while the pack stands — no morale break", () => {
    const battle = wolfBattle(42);
    const { ctx } = makeCtx(battle);
    applyDamage(ctx, hero(battle, "torvald"), hero(battle, "Wolf A"), 99, "warhammer");
    applyDamage(ctx, hero(battle, "torvald"), hero(battle, "Wolf B"), 99, "warhammer");
    const last = hero(battle, "Wolf C");
    expect(last.fleeing).toBe(false);
    expect(battle.status).toBe("active");
  });

  test("a battle can end with the last goblin fleeing instead of dying", () => {
    const battle = ambushBattle(43);
    const { ctx } = makeCtx(battle);
    applyDamage(ctx, hero(battle, "torvald"), hero(battle, "Goblin A"), 99, "warhammer");
    applyDamage(ctx, hero(battle, "torvald"), hero(battle, "Goblin B"), 99, "warhammer");
    applyDamage(ctx, hero(battle, "torvald"), hero(battle, "Goblin C"), 99, "warhammer");
    const last = hero(battle, "Goblin D");
    expect(last.fleeing).toBe(true);
    // Park the runner on the map edge and let turns roll: its own turn start
    // exits it, and the escape alone ends the battle in victory.
    last.position = { x: 0, y: 6 };
    let b = battle;
    let guard = 0;
    while (b.status === "active" && guard < 16) {
      b = applyCommand(b, { type: "endTurn" });
      guard += 1;
    }
    // applyCommand returns clones — read the runner from the latest state.
    expect(b.combatants["Goblin D"].fled).toBe(true);
    expect(b.status).toBe("victory");
  });
});

describe("opportunity attacks (GDD §4.2)", () => {
  function setupEngaged(): BattleState {
    const battle = ambushBattle(51);
    const torvald = hero(battle, "torvald");
    const goblin = hero(battle, "Goblin A");
    torvald.position = { x: 6, y: 3 };
    goblin.position = { x: 7, y: 3 }; // adjacent, on the road
    // Neutralize the seed's surprise outcome — this suite tests reactions,
    // not the ambush contest.
    for (const c of Object.values(battle.combatants)) {
      c.conditions = c.conditions.filter((cond) => cond !== "Surprised");
    }
    return battle;
  }

  test("a hero leaving goblin reach eats the goblin's reaction", () => {
    const battle = setupEngaged();
    forceTurn(battle, "torvald");
    const after = applyCommand(battle, { type: "move", to: { x: 6, y: 1 } });
    const goblin = hero(after, "Goblin A");
    expect(goblin.reactionUsed).toBe(true);
    expect(after.log.some((e) => e.text.includes("strikes at Torvald"))).toBe(true);
  });

  test("Disengage suppresses the opportunity attack", () => {
    const battle = setupEngaged();
    forceTurn(battle, "torvald");
    const after = applyCommand(battle, { type: "disengage" });
    const after2 = applyCommand(after, { type: "move", to: { x: 6, y: 1 } });
    expect(hero(after2, "Goblin A").reactionUsed).toBe(false);
    expect(after2.log.some((e) => e.text.includes("strikes at Torvald"))).toBe(false);
  });

  test("an enemy leaving hero reach queues the player's reaction prompt", () => {
    const engaged = () => {
      const b = setupEngaged();
      forceTurn(b, "Goblin A");
      return b;
    };
    // (9,3) holds a dead horse — dodge it via (9,2).
    const after = applyCommand(engaged(), { type: "move", to: { x: 9, y: 2 } });
    expect(hero(after, "Goblin A").position).toEqual({ x: 9, y: 2 });
    // Torvald (6,3) alone flanks the goblin's origin — Maera waits back at
    // the wagon, so exactly one reaction is offered.
    expect(after.pendingReactions).toHaveLength(1);
    expect(after.pendingReactions[0]).toEqual({ attackerId: "torvald", moverId: "Goblin A" });
    // Declining spends nothing.
    const declined = applyCommand(after, { type: "opportunity", accept: false });
    expect(declined.pendingReactions).toHaveLength(0);
    expect(hero(declined, "torvald").reactionUsed).toBe(false);
    // Accepting spends the reaction and swings.
    const accepted = applyCommand(engagedAndMoved(), { type: "opportunity", accept: true });
    expect(hero(accepted, "torvald").reactionUsed).toBe(true);
    expect(accepted.log.some((e) => e.text.includes("reaction!"))).toBe(true);
    function engagedAndMoved(): BattleState {
      return applyCommand(engaged(), { type: "move", to: { x: 9, y: 2 } });
    }
  });
});

describe("determinism (acceptance criterion 2)", () => {
  test("the same seed and command list replays the identical battle", () => {
    const runOnce = () => {
      let battle = ambushBattle(987654);
      let guard = 0;
      while (battle.status === "active" && guard < 120) {
        guard += 1;
        const actor = activeCombatant(battle);
        if (battle.pendingReactions.length > 0) {
          battle = applyCommand(battle, { type: "opportunity", accept: true });
          continue;
        }
        if (actor.side === "enemy") {
          const cmd = chooseEnemyCommand(battle);
          battle = applyCommand(battle, cmd ?? { type: "endTurn" });
        } else {
          // Simple fixed hero script: end turn (the enemies drive the fight).
          battle = applyCommand(battle, { type: "endTurn" });
        }
      }
      return JSON.stringify(battle);
    };
    const a = runOnce();
    const b = runOnce();
    expect(a).toBe(b);
  });

  test("different seeds diverge", () => {
    const a = createBattle(ROAD_AMBUSH, { level: 1, seed: 1 });
    const b = createBattle(ROAD_AMBUSH, { level: 1, seed: 2 });
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
  });
});
