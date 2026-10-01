/**
 * Story-run test helpers: a compact, deterministic hero policy for
 * autoplaying story battles headlessly (the §9.6 smoke pass — "autoplay-
 * solves every battle with a greedy strategy to prove the game is
 * completable"), trimmed from the Session 2 balance-sim policy.
 */

import { type ArenaDef } from "@/game/grid";
import { ROAD_AMBUSH } from "@/content/arenas";
import { applyCommand, type BattleCommand } from "@/game/combat/actions";
import { chooseEnemyCommand } from "@/game/combat/ai";
import { chebyshev, findPath, isFree, neighbors } from "@/game/grid";
import type { BattleState, Combatant } from "@/game/types";

const GUARD = 600;

/** Drive a battle to a terminal state with the greedy policy. */
export function autoplayBattle(
  battle: BattleState,
  arena: ArenaDef = ROAD_AMBUSH
): BattleState {
  let b = battle;
  let guard = 0;
  while (b.status === "active" && guard < GUARD) {
    guard += 1;
    if (b.pendingReactions.length > 0) {
      b = applyCommand(b, { type: "opportunity", accept: true });
      continue;
    }
    const actor: Combatant | undefined = b.combatants[b.order[b.activeIndex]];
    if (!actor) break;
    if (actor.side === "enemy") {
      b = applyCommand(b, chooseEnemyCommand(b) ?? { type: "endTurn" });
      continue;
    }
    b = applyCommand(b, heroCmd(b, actor, arena) ?? { type: "endTurn" });
  }
  if (b.status === "active") throw new Error("autoplay guard exhausted — battle never resolved");
  return b;
}

function livingEnemies(b: BattleState): Combatant[] {
  return Object.values(b.combatants).filter(
    (c) => c.side === "enemy" && !c.fled && c.hp > 0
  );
}

function focusTarget(b: BattleState): Combatant | null {
  const enemies = livingEnemies(b);
  if (enemies.length === 0) return null;
  return enemies.reduce((low, c) => (c.hp < low.hp ? c : low));
}

function adjacent(a: Combatant, t: Combatant): boolean {
  return (
    !!a.position && !!t.position && chebyshev(a.position, t.position) <= 1
  );
}

function remaining(c: Combatant): number {
  return Math.max(0, c.speed * (1 + c.dashes) - c.movementUsed);
}

/** One greedy command for the active hero (focus fire + emergency care). */
function heroCmd(
  b: BattleState,
  hero: Combatant,
  arena: ArenaDef
): BattleCommand | null {
  if (hero.hp <= 0) return null;
  // Surprised heroes cannot act on round one (Table 11).
  if (b.round === 1 && hero.conditions.includes("Surprised")) return null;
  const focus = focusTarget(b);
  if (!focus) return null;

  if (hero.hp <= 3 && b.potions > 0 && !hero.actionUsed) {
    return { type: "item", targetId: hero.id };
  }

  switch (hero.id) {
    case "torvald": {
      if (hero.hp <= hero.maxHp / 2 && hero.resources.secondWind && !hero.bonusActionUsed) {
        return { type: "secondWind" };
      }
      if (!hero.actionUsed) {
        if (adjacent(hero, focus)) {
          return { type: "attack", attackIndex: 0, targetId: focus.id };
        }
        if (remaining(hero) >= 5) {
          const step = stepToward(b, hero, focus, arena);
          if (step) return { type: "move", to: step };
        }
        // Out of reach: throw a handaxe (attacks[1]).
        return { type: "attack", attackIndex: 1, targetId: focus.id };
      }
      return null;
    }
    case "perrin": {
      if (!hero.actionUsed) {
        return adjacent(hero, focus)
          ? { type: "attack", attackIndex: 0, targetId: focus.id }
          : { type: "attack", attackIndex: 1, targetId: focus.id };
      }
      return null;
    }
    case "maera": {
      const downed = Object.values(b.combatants).find(
        (c) => c.side === "party" && c.hp <= 0
      );
      const hurt = Object.values(b.combatants)
        .filter((c) => c.side === "party" && c.hp > 0 && c.hp <= c.maxHp / 3)
        .sort((x, y) => x.hp - y.hp)[0];
      if (
        !hero.bonusActionUsed &&
        hero.spellSlotsUsed < hero.maxSpellSlots &&
        (downed ?? hurt)
      ) {
        return { type: "cast", spellName: "Healing Word", targetIds: [(downed ?? hurt)!.id] };
      }
      if (!hero.actionUsed) {
        if (adjacent(hero, focus)) {
          return { type: "attack", attackIndex: 0, targetId: focus.id };
        }
        return { type: "cast", spellName: "Sacred Flame", targetIds: [focus.id] };
      }
      return null;
    }
    case "elyndra": {
      if (!hero.actionUsed && hero.spellSlotsUsed < hero.maxSpellSlots) {
        const awake = livingEnemies(b).filter((e) => !e.sleeping);
        if (b.round <= 1 && awake.length >= 2) {
          return { type: "cast", spellName: "Sleep" };
        }
      }
      if (!hero.actionUsed) {
        return { type: "cast", spellName: "Fire Bolt", targetIds: [focus.id] };
      }
      return null;
    }
    default:
      return null;
  }
}

/** One step (or the reachable prefix) along the path to the focus target. */
function stepToward(
  b: BattleState,
  hero: Combatant,
  target: Combatant,
  arena: ArenaDef
): { x: number; y: number } | null {
  if (!hero.position || !target.position) return null;
  const budget = Math.floor(remaining(hero) / 5);
  if (budget <= 0) return null;
  let best: { path: { x: number; y: number }[]; cost: number } | null = null;
  for (const goal of neighbors(target.position)) {
    if (!isFree(arena, b, goal)) continue;
    const p = findPath(arena, b, hero, goal);
    if (p && p.path.length > 0 && (!best || p.cost < best.cost)) best = p;
  }
  if (!best) return null;
  let lastGood: { x: number; y: number } | null = null;
  for (let i = 0; i < best.path.length && i < budget; i++) {
    const step = best.path[i];
    if (isFree(arena, b, step)) lastGood = step;
  }
  return lastGood;
}
