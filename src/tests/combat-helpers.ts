/**
 * Shared combat-test helpers: a scripted RNG (deterministic die sequences)
 * and battle fixtures for the kernel suites.
 */

import { ROAD_AMBUSH, WOLF_PACK } from "@/content/arenas";
import { createBattle, type KernelCtx } from "@/game/combat/core";
import { Rng } from "@/game/rng";
import type { BattleState } from "@/game/types";

/**
 * An Rng whose die results come from a preloaded queue — every draw is
 * exactly the test's script. Falls back to the real stream when the queue
 * runs dry, so over-long tests still terminate.
 */
export class ScriptedRng extends Rng {
  private queue: number[] = [];

  constructor(values: number[] = [], seed = 1) {
    super(seed);
    this.queue = [...values];
  }

  override die(sides: number, tag = "die"): number {
    const v = this.queue.shift();
    return v === undefined ? super.die(sides, tag) : Math.min(sides, Math.max(1, v));
  }
}

export function ambushBattle(seed = 42, level: 1 | 2 = 1): BattleState {
  return createBattle(ROAD_AMBUSH, { level, seed });
}

export function wolfBattle(seed = 42, level: 1 | 2 = 1): BattleState {
  return createBattle(WOLF_PACK, { level, seed });
}

export function makeCtx(
  battle: BattleState,
  scripted: number[] = []
): { ctx: KernelCtx; rng: ScriptedRng } {
  const rng = new ScriptedRng(scripted);
  const ctx: KernelCtx = { battle, rng, arena: ROAD_AMBUSH };
  return { ctx, rng };
}

/** The first combatant on each side, by combatant id. */
export function hero(battle: BattleState, id: string) {
  const c = battle.combatants[id];
  if (!c) throw new Error(`No combatant ${id}`);
  return c;
}

/** Make it a specific combatant's turn (fresh turn state, never Surprised). */
export function forceTurn(battle: BattleState, id: string): void {
  const index = battle.order.indexOf(id);
  if (index < 0) throw new Error(`${id} not in initiative order`);
  battle.activeIndex = index;
  const c = battle.combatants[id];
  c.actionUsed = false;
  c.bonusActionUsed = false;
  c.movementUsed = 0;
  c.dashes = 0;
  c.disengaged = false;
  // Tests that isolate a turn don't care about the ambush contest.
  c.conditions = c.conditions.filter((cond) => cond !== "Surprised");
}
