/**
 * Combat kernel — enemy AI (GDD §9.4): a utility-scoring layer over the same
 * action vocabulary the player uses. Each candidate attack is scored as
 * expected damage weighted by target squishiness (low AC, low HP), filtered
 * through a behavior profile:
 *
 *   Goblins — open at range, hold position until engaged, spend Nimble Escape
 *   to break contact toward cover.
 *   Wolves — seek flanks and isolated targets to maximize pack tactics; the
 *   bite's Prone effect creates follow-up value for the pack.
 *
 * Decisions are pure functions of the battle state (no RNG draws), so a
 * seeded replay walks the exact same enemy turns.
 *
 * Klarg's beeline and Yeemik's ledge behavior arrive with their arenas in
 * Session 5; their stat blocks ship now so the typing is complete.
 */

import { getArena } from "@/content/arenas";
import { diceAverage } from "@/game/dice";
import {
  chebyshev,
  findPath,
  isAdjacent,
  isFree,
  isCoverTerrain,
  neighbors,
  type Point,
} from "@/game/grid";
import { Rng } from "@/game/rng";
import type { BattleState, Combatant } from "@/game/types";
import type { BattleCommand } from "./actions";
import {
  activeCombatant,
  advantageFor,
  attacksOf,
  effectiveAcVs,
  isDown,
  isOutOfAction,
  remainingMovement,
  statBlockOf,
  type KernelCtx,
} from "./core";

/** The next command the active enemy wants, or null when its turn is over. */
export function chooseEnemyCommand(battle: BattleState): BattleCommand | null {
  if (battle.status !== "active") return null;
  const actor = activeCombatant(battle);
  if (!actor || actor.side !== "enemy" || isOutOfAction(actor) || actor.fled) return null;
  const ctx: KernelCtx = {
    battle,
    rng: new Rng(1), // decisions never draw — determinism by construction
    arena: getArena(battle.arenaId),
  };

  if (actor.fleeing) return fleeCommand(ctx, actor);

  switch (statBlockOf(actor).ai) {
    case "goblin":
      return goblinCommand(ctx, actor);
    case "wolf":
      return wolfCommand(ctx, actor);
    default:
      return null; // Klarg & Yeemik profiles land with Session 5's arenas
  }
}

/* ══════════════════════════ Target scoring ══════════════════════════ */

function livingHeroes(ctx: KernelCtx): Combatant[] {
  return Object.values(ctx.battle.combatants).filter(
    (c) => c.side === "party" && !isDown(c)
  );
}

/** Expected damage of one attack, weighted by target squishiness. */
function scoreAttack(
  ctx: KernelCtx,
  attacker: Combatant,
  target: Combatant,
  attack: { attackBonus: number; damage: { count: number; sides: number; plus?: number } },
  melee: boolean,
  isolationBonus = 0
): number {
  const { ac } = effectiveAcVs(ctx, target, melee);
  let p = (21 - (ac - attack.attackBonus)) / 20;
  p = Math.min(0.95, Math.max(0.05, p));
  const adv = advantageFor(ctx, attacker, target, { melee });
  if (adv.mode === "advantage") p = 1 - (1 - p) * (1 - p);
  if (adv.mode === "disadvantage") p = p * p;
  const expected = p * diceAverage(attack.damage);
  const squishy =
    1 + Math.max(0, 16 - ac) * 0.06 + (1 - target.hp / target.maxHp) * 0.5;
  return expected * squishy + isolationBonus;
}

function bestTarget(
  ctx: KernelCtx,
  attacker: Combatant,
  attackIndex: number,
  opts: { adjacentOnly?: boolean; isolation?: boolean } = {}
): Combatant | null {
  const attacks = attacksOf(attacker);
  const attack = attacks[attackIndex];
  if (!attack || !attacker.position) return null;
  const melee = attack.reach !== undefined;
  let best: Combatant | null = null;
  let bestScore = -Infinity;
  for (const hero of livingHeroes(ctx)) {
    if (!hero.position) continue;
    if (opts.adjacentOnly && !isAdjacent(attacker.position, hero.position)) continue;
    if (!melee) {
      const feet = chebyshev(attacker.position, hero.position) * 5;
      if (attack.range && feet > attack.range[1]) continue;
    }
    // Isolation (wolves): fewer adjacent allies means a straggler.
    let isolation = 0;
    if (opts.isolation && attacker.position && hero.position) {
      const heroPos = hero.position;
      const alliesBeside = Object.values(ctx.battle.combatants).filter(
        (c) =>
          c.side === "party" &&
          c.id !== hero.id &&
          !isDown(c) &&
          c.position &&
          isAdjacent(c.position, heroPos)
      ).length;
      isolation = (2 - Math.min(2, alliesBeside)) * 1.2;
    }
    const score = scoreAttack(ctx, attacker, hero, attack, melee, isolation);
    if (score > bestScore) {
      bestScore = score;
      best = hero;
    }
  }
  return best;
}

/* ══════════════════════════ Goblin profile ══════════════════════════ */

function goblinCommand(ctx: KernelCtx, goblin: Combatant): BattleCommand | null {
  if (!goblin.position) return null;
  const adjacentHero = livingHeroes(ctx).find(
    (h) => h.position && isAdjacent(goblin.position!, h.position)
  );

  if (adjacentHero) {
    // Engaged: break contact toward cover with Nimble Escape, else scimitar.
    const cover = findCoverTile(ctx, goblin);
    if (!goblin.bonusActionUsed && cover) {
      return { type: "nimble", kind: "disengage" };
    }
    if (cover && goblin.disengaged && remainingMovement(goblin) >= 5) {
      const step = stepToward(ctx, goblin, cover);
      if (step) return { type: "move", to: step };
    }
    if (!goblin.actionUsed) {
      const meleeTarget = bestTarget(ctx, goblin, 0, { adjacentOnly: true });
      if (meleeTarget) return { type: "attack", attackIndex: 0, targetId: meleeTarget.id };
    }
    return null;
  }

  // Open field: hold position, prefer thicket cover, shoot the best target.
  if (!isCoverTerrain(ctx.arena, goblin.position) && remainingMovement(goblin) >= 5) {
    const cover = findCoverTile(ctx, goblin);
    if (cover) {
      const step = stepToward(ctx, goblin, cover);
      if (step) return { type: "move", to: step };
    }
  }
  if (!goblin.actionUsed) {
    const target = bestTarget(ctx, goblin, 1); // shortbow
    if (target) return { type: "attack", attackIndex: 1, targetId: target.id };
  }
  if (remainingMovement(goblin) >= 5) {
    // No shot available (rare): close the distance.
    const target = bestTarget(ctx, goblin, 0);
    if (target?.position) {
      const step = stepToward(ctx, goblin, target.position);
      if (step) return { type: "move", to: step };
    }
  }
  return null;
}

/** A reachable thicket square with no hero adjacent to it. */
function findCoverTile(ctx: KernelCtx, goblin: Combatant): Point | null {
  if (!goblin.position) return null;
  const budget = Math.floor(remainingMovement(goblin) / 5);
  if (budget <= 0) return null;
  let best: Point | null = null;
  let bestCost = Infinity;
  for (let y = 0; y < ctx.battle.height; y++) {
    for (let x = 0; x < ctx.battle.width; x++) {
      const p = { x, y };
      if (!isCoverTerrain(ctx.arena, p)) continue;
      if (!isFree(ctx.arena, ctx.battle, p)) continue;
      const heroNear = livingHeroes(ctx).some(
        (h) => h.position && isAdjacent(h.position, p)
      );
      if (heroNear) continue;
      const path = findPath(ctx.arena, ctx.battle, goblin, p, budget);
      if (path && path.cost <= budget && path.cost < bestCost) {
        bestCost = path.cost;
        best = p;
      }
    }
  }
  return best;
}

/* ══════════════════════════ Wolf profile ══════════════════════════ */

function wolfCommand(ctx: KernelCtx, wolf: Combatant): BattleCommand | null {
  if (!wolf.position) return null;
  const adjacentTarget = bestTarget(ctx, wolf, 0, {
    adjacentOnly: true,
    isolation: true,
  });
  if (adjacentTarget) {
    if (!wolf.actionUsed) {
      return { type: "attack", attackIndex: 0, targetId: adjacentTarget.id };
    }
    return null;
  }
  if (!wolf.actionUsed || remainingMovement(wolf) >= 5) {
    const target = bestTarget(ctx, wolf, 0, { isolation: true });
    if (target?.position && remainingMovement(wolf) >= 5) {
      const step = stepToward(ctx, wolf, target.position);
      if (step) return { type: "move", to: step };
    }
  }
  return null;
}

/* ══════════════════════════ Fleeing ══════════════════════════ */

function fleeCommand(ctx: KernelCtx, runner: Combatant): BattleCommand | null {
  if (!runner.position) return null;
  const { width, height } = ctx.battle;
  const p = runner.position;
  const atEdge = p.x === 0 || p.y === 0 || p.x === width - 1 || p.y === height - 1;

  if (atEdge) {
    // Step off the map.
    const off: Point =
      p.x === 0 ? { x: -1, y: p.y }
      : p.x === width - 1 ? { x: width, y: p.y }
      : p.y === 0 ? { x: p.x, y: -1 }
      : { x: p.x, y: height };
    return { type: "move", to: off };
  }

  // Break contact first if something threatens the runner.
  const adjacentHero = livingHeroes(ctx).find(
    (h) => h.position && isAdjacent(runner.position!, h.position)
  );
  if (adjacentHero && !runner.bonusActionUsed && !runner.disengaged) {
    if (runner.ref === "goblin") return { type: "nimble", kind: "disengage" };
    if (runner.ref === "perrin") return { type: "cunning", kind: "disengage" };
  }

  // Run for the nearest edge square.
  let best: Point | null = null;
  let bestDist = Infinity;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (x !== 0 && y !== 0 && x !== width - 1 && y !== height - 1) continue;
      if (!isFree(ctx.arena, ctx.battle, { x, y })) continue;
      const d = chebyshev({ x, y }, p);
      if (d < bestDist) {
        bestDist = d;
        best = { x, y };
      }
    }
  }
  if (best) {
    const step = stepToward(ctx, runner, best);
    if (step) return { type: "move", to: step };
  }
  return null;
}

/* ══════════════════════════ Movement helper ══════════════════════════ */

/**
 * The furthest affordable square along the path toward a destination. When
 * the destination itself is occupied (the target's square), the wolf paths
 * to the best free square beside it instead.
 */
function stepToward(ctx: KernelCtx, mover: Combatant, dest: Point): Point | null {
  if (!mover.position) return null;
  if (mover.position.x === dest.x && mover.position.y === dest.y) return null;
  const budget = Math.floor(remainingMovement(mover) / 5);
  if (budget <= 0) return null;

  const goals: Point[] = isFree(ctx.arena, ctx.battle, dest)
    ? [dest]
    : neighbors(dest).filter((n) => isFree(ctx.arena, ctx.battle, n));
  let bestPath: { path: Point[]; cost: number } | null = null;
  for (const goal of goals) {
    const p = findPath(ctx.arena, ctx.battle, mover, goal);
    if (p && p.path.length > 0 && (!bestPath || p.cost < bestPath.cost)) {
      bestPath = p;
    }
  }
  if (!bestPath) return null;

  // Walk the path as far as the budget allows, stopping only on free squares.
  let lastGood: Point | null = null;
  for (let i = 0; i < bestPath.path.length && i < budget; i++) {
    const step = bestPath.path[i];
    if (isFree(ctx.arena, ctx.battle, step)) lastGood = step;
  }
  if (!lastGood) return null;
  if (lastGood.x === mover.position.x && lastGood.y === mover.position.y) return null;
  return lastGood;
}
