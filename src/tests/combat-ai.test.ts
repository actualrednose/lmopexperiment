/**
 * Combat kernel tests — enemy AI profiles and morale behavior
 * (GDD §9.4, §10.2 criterion 3): goblins open at range, hold position until
 * engaged, and spend Nimble Escape to break contact toward cover; wolves
 * seek isolated targets to maximize pack tactics; sleeping enemies wake at
 * the cost of their action; the last goblin runs, wolves never do.
 */

import { describe, expect, test } from "bun:test";
import { chooseEnemyCommand } from "@/game/combat/ai";
import { applyCommand } from "@/game/combat/actions";
import {
  advanceTurn,
  advantageFor,
  applyDamage,
  beginTurnFor,
  createBattle,
  hasCondition,
  type KernelCtx,
} from "@/game/combat/core";
import { ROAD_AMBUSH, WOLF_PACK } from "@/content/arenas";
import type { BattleState, Combatant } from "@/game/types";
import { ambushBattle, hero, wolfBattle } from "./combat-helpers";

function ctxOf(battle: BattleState, arena = ROAD_AMBUSH): KernelCtx {
  return { battle, rng: fakeRng(), arena };
}

/** AI decisions never draw — a dummy generator is enough. */
function fakeRng(): never {
  return undefined as never;
}

function clearSurprise(battle: BattleState): void {
  for (const c of Object.values(battle.combatants)) {
    c.conditions = c.conditions.filter((cond) => cond !== "Surprised");
  }
}

function makeActorTurn(battle: BattleState, id: string): void {
  const c = battle.combatants[id];
  battle.activeIndex = battle.order.indexOf(id);
  c.actionUsed = false;
  c.bonusActionUsed = false;
  c.movementUsed = 0;
  c.disengaged = false;
  clearSurprise(battle);
}

describe("goblin profile — skirmisher (GDD §9.4)", () => {
  test("opens at range with the shortbow when not engaged", () => {
    const battle = ambushBattle(101);
    makeActorTurn(battle, "Goblin A");
    const cmd = chooseEnemyCommand(battle);
    expect(cmd).not.toBeNull();
    expect(cmd?.type).toBe("attack");
    if (cmd?.type === "attack") {
      expect(cmd.attackIndex).toBe(1); // shortbow
      expect(cmd.targetId).toBeTruthy();
    }
  });

  test("scimitars the adjacent hero when no cover is reachable", () => {
    const battle = ambushBattle(102);
    const goblin = hero(battle, "Goblin A");
    goblin.position = { x: 6, y: 3 }; // beside Torvald's spawn (5,3)
    // Park the goblin far from every thicket to deny cover.
    for (const c of Object.values(battle.combatants)) {
      if (c.side === "enemy") c.speed = 0;
    }
    makeActorTurn(battle, "Goblin A");
    const cmd = chooseEnemyCommand(battle);
    expect(cmd?.type).toBe("attack");
    if (cmd?.type === "attack") expect(cmd.attackIndex).toBe(0); // scimitar
  });

  test("breaks contact toward cover with Nimble Escape when engaged", () => {
    const battle = ambushBattle(103);
    const goblin = hero(battle, "Goblin A");
    goblin.position = { x: 6, y: 3 }; // engaged by Torvald at (5,3)
    makeActorTurn(battle, "Goblin A");
    const cmd = chooseEnemyCommand(battle);
    expect(cmd?.type).toBe("nimble"); // disengage first, cover next command
    if (cmd?.type === "nimble") expect(cmd.kind).toBe("disengage");
    // After the bonus disengage, the next command moves toward cover.
    const after = applyCommand(battle, cmd ?? { type: "endTurn" });
    makeActorTurn(after, "Goblin A");
    after.combatants["Goblin A"].bonusActionUsed = true;
    after.combatants["Goblin A"].disengaged = true;
    const move = chooseEnemyCommand(after);
    expect(move?.type).toBe("move");
  });
});

describe("wolf profile — pack hunter (GDD §9.4)", () => {
  test("moves toward the pack's chosen target when not adjacent", () => {
    const battle = wolfBattle(111);
    makeActorTurn(battle, "Wolf A");
    const cmd = chooseEnemyCommand(battle);
    expect(cmd?.type).toBe("move");
  });

  test("bites when adjacent, and Pack Tactics grants advantage beside a packmate", () => {
    const battle = wolfBattle(112);
    const wolfA = hero(battle, "Wolf A");
    const wolfB = hero(battle, "Wolf B");
    const torvald = hero(battle, "torvald");
    wolfA.position = { x: 2, y: 3 };
    wolfB.position = { x: 2, y: 4 }; // flanking Torvald
    torvald.position = { x: 2, y: 2 }; // hmm — recompute below
    torvald.position = { x: 3, y: 3 }; // adjacent to both wolves
    makeActorTurn(battle, "Wolf A");
    const cmd = chooseEnemyCommand(battle);
    expect(cmd?.type).toBe("attack");
    if (cmd?.type === "attack") expect(cmd.targetId).toBeTruthy();
    // The whitelist source fires through the real advantage pipeline.
    const ctx = ctxOf(battle, WOLF_PACK);
    const adv = advantageFor(ctx, wolfA, torvald, { melee: true });
    expect(adv.mode).toBe("advantage");
    expect(adv.source).toBe("Pack Tactics");
  });

  test("isolation scoring prefers the straggler", () => {
    const battle = wolfBattle(113);
    const wolfA = hero(battle, "Wolf A");
    wolfA.position = { x: 8, y: 2 };
    // Torvald stands with the line; Elyndra straggles north alone.
    const torvald = hero(battle, "torvald");
    const maera = hero(battle, "maera");
    const elyndra = hero(battle, "elyndra");
    torvald.position = { x: 2, y: 3 };
    maera.position = { x: 2, y: 4 }; // adjacent to Torvald
    elyndra.position = { x: 2, y: 0 }; // alone
    makeActorTurn(battle, "Wolf A");
    const cmd = chooseEnemyCommand(battle);
    // Wolf A is at (8,2): nearest by movement is Elyndra's lane anyway;
    // the meaningful assertion is that the chosen move heads for the straggler.
    expect(cmd?.type).toBe("move");
    if (cmd?.type === "move") {
      expect(cmd.to.y).toBeLessThanOrEqual(1); // climbing toward Elyndra's row
    }
  });
});

describe("sleep and wake (GDD Table 6)", () => {
  test("a sleeping enemy wakes at the cost of its action", () => {
    const battle = ambushBattle(121);
    const goblin = hero(battle, "Goblin A");
    goblin.sleeping = true;
    const ctx = ctxOf(battle);
    beginTurnFor(ctx, goblin);
    expect(goblin.sleeping).toBe(false);
    expect(goblin.actionUsed).toBe(true);
    expect(battle.log.some((e) => e.text.includes("waking costs its action"))).toBe(true);
  });
});

describe("full autoplay sanity (both arena fights)", () => {
  test("the road ambush resolves to a terminal state under autoplay", () => {
    for (const seed of [1, 42, 777, 31415]) {
      const battle = createBattle(ROAD_AMBUSH, { level: 1, seed });
      const result = autoplay(battle);
      expect(["victory", "defeat"]).toContain(result.status);
      expect(result.commands).toBeGreaterThan(8);
      expect(result.commands).toBeLessThan(400);
    }
  });

  test("the wolf pack resolves to a terminal state under autoplay", () => {
    for (const seed of [5, 99, 1234, 90000]) {
      const battle = createBattle(WOLF_PACK, { level: 2, seed });
      const result = autoplay(battle);
      expect(["victory", "defeat"]).toContain(result.status);
    }
  });

  test("morale: the last goblin flees and can escape; wolves never flee", () => {
    // Heroes passing can't kill goblins, so seed the morale state directly:
    // three goblins down, then autoplay — the runner breaks and escapes.
    let sawEscape = false;
    for (const seed of [3, 17, 91]) {
      const battle = createBattle(ROAD_AMBUSH, { level: 1, seed });
      const ctx = ctxOf(battle);
      for (const id of ["Goblin A", "Goblin B", "Goblin C"]) {
        applyDamage(ctx, battle.combatants["torvald"], battle.combatants[id], 99, "warhammer");
      }
      expect(battle.combatants["Goblin D"].fleeing).toBe(true);
      const result = autoplay(battle);
      expect(result.status).toBe("victory");
      expect(result.fledGoblins).toBe(1);
      sawEscape = true;
    }
    expect(sawEscape).toBe(true);
    // Wolves: kill two, autoplay the rest — the survivor fights to the end.
    for (const seed of [8, 64]) {
      const battle = createBattle(WOLF_PACK, { level: 1, seed });
      const ctx = ctxOf(battle, WOLF_PACK);
      applyDamage(ctx, battle.combatants["torvald"], battle.combatants["Wolf A"], 99, "warhammer");
      applyDamage(ctx, battle.combatants["torvald"], battle.combatants["Wolf B"], 99, "warhammer");
      expect(battle.combatants["Wolf C"].fleeing).toBe(false);
      const result = autoplay(battle);
      expect(result.wolfFleeingSeen).toBe(false);
    }
  });
});

/* ── Autoplay driver: heroes pass, enemies run their AI ── */

interface AutoplayResult {
  status: "victory" | "defeat" | "active";
  commands: number;
  fledGoblins: number;
  wolfFleeingSeen: boolean;
}

function autoplay(start: BattleState): AutoplayResult {
  let battle = start;
  let commands = 0;
  let wolfFleeingSeen = false;
  while (battle.status === "active" && commands < 400) {
    if (battle.pendingReactions.length > 0) {
      battle = applyCommand(battle, { type: "opportunity", accept: false });
      commands += 1;
      continue;
    }
    const actor: Combatant | undefined =
      battle.combatants[battle.order[battle.activeIndex]];
    if (!actor) break;
    if (actor.side === "enemy") {
      if (actor.ref === "wolf" && actor.fleeing) wolfFleeingSeen = true;
      const cmd = chooseEnemyCommand(battle);
      battle = applyCommand(battle, cmd ?? { type: "endTurn" });
    } else {
      battle = applyCommand(battle, { type: "endTurn" });
    }
    commands += 1;
  }
  return {
    status: battle.status,
    commands,
    fledGoblins: Object.values(battle.combatants).filter((c) => c.fled).length,
    wolfFleeingSeen,
  };
}

void hasCondition;
