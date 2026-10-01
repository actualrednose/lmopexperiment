/**
 * Combat kernel — actions (GDD §10.2): the full frozen action vocabulary of
 * Table 5 (Attack, Cast a Spell, Dash, Disengage, Dodge, Help, Hide, Use an
 * Item) plus named bonus actions (Second Wind, Healing Word, Cunning Action,
 * Misty Step, Nimble Escape), movement with opportunity-attack triggers,
 * standing from Prone, and the end-of-turn flow.
 *
 * applyCommand is the single entry point: a pure function
 * (BattleState, command) → BattleState. Same seed + same command list =
 * identical battle (Session 2 acceptance criterion #2).
 */

import { getArena } from "@/content/arenas";
import { getHeroSheet, PARTY_ORDER } from "@/content/party";
import {
  chebyshev,
  findPath,
  isFree,
  neighbors,
  pathProvocations,
  type Point,
} from "@/game/grid";
import { Rng } from "@/game/rng";
import type { BattleState, Combatant, Spell } from "@/game/types";
import {
  activeCombatant,
  addCondition,
  advanceTurn,
  applyHealing,
  attacksOf,
  checkBattleEnd,
  hasCondition,
  heroSheetOf,
  inSight,
  inWeaponRange,
  isDown,
  isEnemy,
  isOutOfAction,
  log,
  passivePerceptionOf,
  remainingMovement,
  removeCondition,
  resolveAttack,
  stealthBonusOf,
  type KernelCtx,
} from "./core";
import { castSpell, type SpellParams } from "./spells";

/* ══════════════════════════ Commands ══════════════════════════ */

export type BattleCommand =
  | { type: "move"; to: Point }
  | { type: "attack"; attackIndex: number; targetId: string }
  | { type: "cast"; spellName: string; targetIds?: string[]; to?: Point }
  | { type: "dash" }
  | { type: "disengage" }
  | { type: "dodge" }
  | { type: "help"; targetId: string }
  | { type: "hide" }
  | { type: "item"; targetId: string }
  | { type: "stand" }
  | { type: "cunning"; kind: "dash" | "disengage" | "hide" }
  | { type: "nimble"; kind: "disengage" | "hide" }
  | { type: "secondWind" }
  | { type: "actionSurge" }
  | { type: "endTurn" }
  | { type: "opportunity"; accept: boolean };

/* ══════════════════════════ Entry point ══════════════════════════ */

export function applyCommand(battle: BattleState, cmd: BattleCommand): BattleState {
  if (battle.status !== "active") return battle;
  const draft: BattleState = structuredClone(battle);
  const rng = Rng.fromState(draft.rng);
  const arena = getArena(draft.arenaId);
  const ctx: KernelCtx = { battle: draft, rng, arena };

  try {
    // While reactions are pending, only resolving them is legal.
    if (draft.pendingReactions.length > 0) {
      if (cmd.type === "opportunity") {
        resolveOpportunity(ctx, cmd.accept);
      }
    } else {
      switch (cmd.type) {
        case "move":
          doMove(ctx, cmd.to);
          break;
        case "attack":
          doAttack(ctx, cmd.attackIndex, cmd.targetId);
          break;
        case "cast":
          doCast(ctx, cmd);
          break;
        case "dash":
          doDash(ctx);
          break;
        case "disengage":
          doDisengage(ctx);
          break;
        case "dodge":
          doDodge(ctx);
          break;
        case "help":
          doHelp(ctx, cmd.targetId);
          break;
        case "hide":
          doHide(ctx, false);
          break;
        case "item":
          doPotion(ctx, cmd.targetId);
          break;
        case "stand":
          doStand(ctx);
          break;
        case "cunning":
          doCunning(ctx, cmd.kind);
          break;
        case "nimble":
          doNimble(ctx, cmd.kind);
          break;
        case "secondWind":
          doSecondWind(ctx);
          break;
        case "actionSurge":
          doActionSurge(ctx);
          break;
        case "endTurn":
          advanceTurn(ctx);
          break;
        case "opportunity":
          break; // nothing pending — no-op
      }
    }
  } finally {
    draft.rng = rng.getCursor();
  }
  return draft;
}

/** The combatant whose turn it is; commands apply to them. */
function actor(ctx: KernelCtx): Combatant {
  return activeCombatant(ctx.battle);
}

function requireActiveActor(ctx: KernelCtx): Combatant | null {
  const c = actor(ctx);
  if (!c || isOutOfAction(c)) return null;
  if (c.fled) return null;
  // Surprised combatants cannot act or move on the first round (GDD Table 7).
  if (ctx.battle.round === 1 && hasCondition(c, "Surprised")) return null;
  return c;
}

/* ══════════════════════════ Movement ══════════════════════════ */

function doMove(ctx: KernelCtx, to: Point): void {
  const mover = requireActiveActor(ctx);
  if (!mover || mover.sleeping) return;
  const start = mover.position;
  if (!start) return;

  const battle = ctx.battle;

  // Fleeing combatants may step off the map edge to escape.
  const outOfBounds =
    to.x < 0 || to.y < 0 || to.y >= battle.height || to.x >= battle.width;
  if (outOfBounds) {
    if (!mover.fleeing) return;
    if (chebyshev(start, to) > 1) return;
    if (!(
      start.x === 0 ||
      start.y === 0 ||
      start.x === battle.width - 1 ||
      start.y === battle.height - 1
    ))
      return; // must be stepping off from an edge square
    const from = { ...start };
    offerReactionsForEscape(ctx, mover);
    if (battle.status !== "active") return; // a reaction ended the battle
    mover.fled = true;
    mover.position = null;
    log(ctx, mover.name, "slips away through the trees.", {
      move: { from, path: [to] },
    });
    checkAfterCommand(ctx);
    return;
  }

  const budgetSquares = Math.floor(remainingMovement(mover) / 5);
  if (budgetSquares <= 0) return;
  const path = findPath(ctx.arena, battle, mover, to, budgetSquares);
  if (!path || path.cost === 0 || path.cost > budgetSquares) return;

  const from = { ...start };
  mover.position = { ...path.path[path.path.length - 1] };
  mover.movementUsed += path.cost * 5;
  log(ctx, mover.name, `moves ${path.cost * 5} ft.`, {
    move: { from, path: path.path },
  });

  // Opportunity attacks from hostiles whose reach the mover left (GDD §4.2).
  if (!mover.disengaged) {
    const hostiles = pathProvocations(battle, mover, path.path, from).filter(
      (h) =>
        !h.reactionUsed &&
        !isOutOfAction(h) &&
        !h.sleeping &&
        !hasCondition(h, "Surprised") &&
        hasMeleeAttack(h)
    );
    for (const hostile of hostiles) {
      if (isOutOfAction(mover)) break;
      if (hostile.side === "party") {
        // The player decides — queue the reaction prompt.
        battle.pendingReactions.push({ attackerId: hostile.id, moverId: mover.id });
      } else {
        // Enemy AI always takes the free swing.
        takeOpportunityAttack(ctx, hostile, mover);
      }
    }
  }
  checkAfterCommand(ctx);
}

function offerReactionsForEscape(ctx: KernelCtx, mover: Combatant): void {
  // Heroes adjacent to the escape square may strike as it goes.
  if (mover.disengaged || !mover.position) return;
  const moverPos = mover.position;
  const heroes = Object.values(ctx.battle.combatants).filter(
    (h) =>
      h.side === "party" &&
      !isOutOfAction(h) &&
      !h.sleeping &&
      !h.reactionUsed &&
      !hasCondition(h, "Surprised") &&
      h.position &&
      chebyshev(h.position, moverPos) <= 1 &&
      hasMeleeAttack(h)
  );
  for (const hero of heroes) {
    ctx.battle.pendingReactions.push({ attackerId: hero.id, moverId: mover.id });
  }
}

function hasMeleeAttack(c: Combatant): boolean {
  return attacksOf(c).some((a) => a.reach !== undefined);
}

function resolveOpportunity(ctx: KernelCtx, accept: boolean): void {
  const battle = ctx.battle;
  const head = battle.pendingReactions[0];
  if (!head) return;
  const attacker = battle.combatants[head.attackerId];
  const mover = battle.combatants[head.moverId];
  battle.pendingReactions.shift();
  if (!accept || !attacker || !mover || isOutOfAction(attacker) || attacker.reactionUsed)
    return;
  takeOpportunityAttack(ctx, attacker, mover);
}

function takeOpportunityAttack(ctx: KernelCtx, attacker: Combatant, mover: Combatant): void {
  if (isOutOfAction(attacker) || isOutOfAction(mover)) return;
  const melee = attacksOf(attacker).find((a) => a.reach !== undefined);
  if (!melee) return;
  attacker.reactionUsed = true;
  log(ctx, attacker.name, `strikes at ${mover.name} as it breaks away — reaction!`);
  resolveAttack(ctx, attacker, mover, melee, { melee: true, opportunity: true });
}

/* ══════════════════════════ Attack ══════════════════════════ */

function doAttack(ctx: KernelCtx, attackIndex: number, targetId: string): void {
  const attacker = requireActiveActor(ctx);
  if (!attacker || attacker.actionUsed) return;
  const target = ctx.battle.combatants[targetId];
  if (!target || target.side === attacker.side || isOutOfAction(target)) return;
  const attacks = attacksOf(attacker);
  const attack = attacks[attackIndex];
  if (!attack) return;
  if (!inWeaponRange(ctx, attacker, target, attack)) return;
  if (!inSight(ctx, attacker, target)) return;

  attacker.actionUsed = true;
  // Attacking breaks Hidden (GDD Table 7).
  removeCondition(attacker, "Hidden");
  resolveAttack(ctx, attacker, target, attack, {
    melee: attack.reach !== undefined,
  });
  checkAfterCommand(ctx);
}

/* ══════════════════════════ Cast a spell ══════════════════════════ */

const OFFENSIVE_SPELLS = new Set([
  "Sacred Flame",
  "Guiding Bolt",
  "Fire Bolt",
  "Burning Hands",
  "Magic Missile",
  "Sleep",
]);

function doCast(
  ctx: KernelCtx,
  cmd: { spellName: string; targetIds?: string[]; to?: Point }
): void {
  const caster = requireActiveActor(ctx);
  if (!caster || isEnemy(caster)) return;
  const sheet = heroSheetOf(caster);
  const spell = sheet.spells?.find((s) => s.name === cmd.spellName);
  if (!spell) return;
  if (spell.minLevel && ctx.battle.partyLevel < spell.minLevel) return;

  const isBonus = spell.bonusAction === true;
  if (isBonus ? caster.bonusActionUsed : caster.actionUsed) return;
  if (spell.cost === "slot" && caster.spellSlotsUsed >= caster.maxSpellSlots) return;

  const params: SpellParams = { targetIds: cmd.targetIds, to: cmd.to };
  const outcome = castSpell(ctx, caster, spell, params);
  if (!outcome.ok) return; // validation failed before any mutation

  if (spell.cost === "slot") caster.spellSlotsUsed += 1;
  if (isBonus) {
    caster.bonusActionUsed = true;
    log(ctx, caster.name, `(${spell.name} — bonus action, ${caster.maxSpellSlots - caster.spellSlotsUsed} slot${caster.maxSpellSlots - caster.spellSlotsUsed === 1 ? "" : "s"} left.)`);
  } else if (spell.cost === "slot") {
    caster.actionUsed = true;
    log(ctx, caster.name, `(${caster.maxSpellSlots - caster.spellSlotsUsed} slot${caster.maxSpellSlots - caster.spellSlotsUsed === 1 ? "" : "s"} left.)`);
  } else {
    caster.actionUsed = true; // cantrips take the action too
  }
  // Casting at an enemy breaks Hidden.
  if (OFFENSIVE_SPELLS.has(spell.name)) removeCondition(caster, "Hidden");
  checkAfterCommand(ctx);
}

/* ══════════════════════════ Simple actions ══════════════════════════ */

function doDash(ctx: KernelCtx): void {
  const actor = requireActiveActor(ctx);
  if (!actor || actor.actionUsed) return;
  actor.actionUsed = true;
  actor.dashes += 1;
  log(ctx, actor.name, "dashes — double movement this turn.");
}

function doDisengage(ctx: KernelCtx): void {
  const actor = requireActiveActor(ctx);
  if (!actor || actor.actionUsed) return;
  actor.actionUsed = true;
  actor.disengaged = true;
  log(ctx, actor.name, "disengages — its movement provokes no opportunity attacks.");
}

function doDodge(ctx: KernelCtx): void {
  const actor = requireActiveActor(ctx);
  if (!actor || actor.actionUsed) return;
  actor.actionUsed = true;
  actor.dodging = true;
  log(ctx, actor.name, "dodges — attacks against it have disadvantage until its next turn.");
}

function doHelp(ctx: KernelCtx, targetId: string): void {
  const actor = requireActiveActor(ctx);
  if (!actor || actor.actionUsed) return;
  const target = ctx.battle.combatants[targetId];
  if (!target || target.side === actor.side || isOutOfAction(target)) return;
  if (!actor.position || !target.position || chebyshev(actor.position, target.position) > 1)
    return; // must threaten the target
  actor.actionUsed = true;
  target.aided = true;
  log(ctx, actor.name, `creates an opening on ${target.name} — the next attack against it has advantage.`);
}

function doHide(ctx: KernelCtx, asBonus: boolean): void {
  const actor = requireActiveActor(ctx);
  if (!actor) return;
  if (asBonus ? actor.bonusActionUsed : actor.actionUsed) return;

  const enemies = Object.values(ctx.battle.combatants).filter(
    (e) => e.side === "enemy" && !isOutOfAction(e)
  );
  if (enemies.length === 0) return;
  const bestWarden = enemies.reduce((best, e) =>
    passivePerceptionOf(e) > passivePerceptionOf(best) ? e : best
  );
  const roll = ctx.rng.d20(`${actor.id}.stealth`);
  const bonus = stealthBonusOf(actor);
  const total = roll + bonus;
  const dc = passivePerceptionOf(bestWarden);
  const success = total > dc;
  if (asBonus) actor.bonusActionUsed = true;
  else actor.actionUsed = true;
  if (success) {
    addCondition(ctx, actor, "Hidden");
  }
  log(
    ctx,
    actor.name,
    `hides: Stealth ${roll} ${bonus >= 0 ? "+" : ""}${bonus} = ${total} vs ${bestWarden.name}'s passive Perception ${dc} — ${
      success ? "Hidden." : "spotted."
    }`,
    {
      roll: {
        tag: "hide-stealth",
        d20: roll,
        dice: [roll],
        modifier: bonus,
        total,
        target: dc,
        success,
        mode: null,
        source: "Hide",
      },
      highlight: true,
    }
  );
}

function doPotion(ctx: KernelCtx, targetId: string): void {
  const actor = requireActiveActor(ctx);
  if (!actor || actor.actionUsed) return;
  if (ctx.battle.potions <= 0) return;
  const target = ctx.battle.combatants[targetId];
  if (!target || target.side !== "party" || target.fled) return;
  // Down allies can be fed a potion — that is what ends Down (GDD Table 7).
  if (target.id !== actor.id) {
    if (!actor.position || !target.position || chebyshev(actor.position, target.position) > 1)
      return; // administering a potion is touch range
  }
  actor.actionUsed = true;
  ctx.battle.potions -= 1;
  ctx.battle.stats.potionsUsed += 1;
  let healed = ctx.rng.die(4, "potion") + ctx.rng.die(4, "potion") + 2;
  healed = applyHealing(ctx, target, healed);
  log(
    ctx,
    actor.name,
    `pours a potion of healing down ${target.id === actor.id ? "their own" : target.name + "'s"} throat — 2d4+2 restores ${healed} HP.`,
    { fx: [{ targetId: target.id, amount: healed, kind: "heal" }] }
  );
  checkAfterCommand(ctx);
}

function doStand(ctx: KernelCtx): void {
  const actor = requireActiveActor(ctx);
  if (!actor || !hasCondition(actor, "Prone")) return;
  const half = Math.floor(actor.speed / 2);
  if (remainingMovement(actor) < half) return;
  actor.movementUsed += half;
  removeCondition(actor, "Prone");
  log(ctx, actor.name, `stands up (${half} ft of movement).`);
}

/* ══════════════════════════ Bonus actions & features ══════════════════════════ */

function doCunning(ctx: KernelCtx, kind: "dash" | "disengage" | "hide"): void {
  const actor = requireActiveActor(ctx);
  if (!actor || actor.ref !== "perrin" || !actor.resources.cunningAction) return;
  if (actor.bonusActionUsed) return;
  switch (kind) {
    case "dash":
      actor.bonusActionUsed = true;
      actor.dashes += 1;
      log(ctx, actor.name, "uses Cunning Action to dash (bonus action).");
      break;
    case "disengage":
      actor.bonusActionUsed = true;
      actor.disengaged = true;
      log(ctx, actor.name, "uses Cunning Action to disengage (bonus action).");
      break;
    case "hide":
      doHide(ctx, true);
      break;
  }
}

function doNimble(ctx: KernelCtx, kind: "disengage" | "hide"): void {
  const actor = requireActiveActor(ctx);
  if (!actor || !isEnemy(actor) || actor.ref !== "goblin") return;
  if (actor.bonusActionUsed) return;
  actor.bonusActionUsed = true;
  if (kind === "disengage") {
    actor.disengaged = true;
    log(ctx, actor.name, "uses Nimble Escape to slip away (bonus action).");
  } else {
    log(ctx, actor.name, "uses Nimble Escape to vanish into the brush (bonus action).");
    const heroes = Object.values(ctx.battle.combatants).filter(
      (h) => h.side === "party" && !isDown(h)
    );
    const bestWarden = heroes.reduce((best, h) =>
      passivePerceptionOf(h) > passivePerceptionOf(best) ? h : best
    );
    const roll = ctx.rng.d20(`${actor.id}.stealth`);
    const total = roll + stealthBonusOf(actor);
    const dc = passivePerceptionOf(bestWarden);
    if (total > dc) addCondition(ctx, actor, "Hidden");
    log(ctx, actor.name, `hides: Stealth ${roll} +${stealthBonusOf(actor)} = ${total} vs ${bestWarden.name}'s passive Perception ${dc}.`);
  }
}

function doSecondWind(ctx: KernelCtx): void {
  const actor = requireActiveActor(ctx);
  if (!actor || actor.ref !== "torvald" || !actor.resources.secondWind) return;
  if (actor.bonusActionUsed) return;
  actor.bonusActionUsed = true;
  actor.resources.secondWind = false;
  const rolled = ctx.rng.die(10, "torvald.secondwind") + 1;
  const healed = applyHealing(ctx, actor, rolled);
  log(
    ctx,
    actor.name,
    `Second Wind: 1d10+1 restores ${healed} HP (bonus action).`,
    { fx: [{ targetId: actor.id, amount: healed, kind: "heal" }] }
  );
}

function doActionSurge(ctx: KernelCtx): void {
  const actor = requireActiveActor(ctx);
  if (!actor || actor.ref !== "torvald" || !actor.resources.actionSurge) return;
  actor.resources.actionSurge = false;
  actor.actionUsed = false;
  log(ctx, actor.name, "Action Surge — one extra action this turn!", { highlight: true });
}

/* ══════════════════════════ Shared post-command checks ══════════════════════════ */

function checkAfterCommand(ctx: KernelCtx): void {
  // The battle may have ended mid-command (a fleeing runner left the field,
  // the last enemy dropped). Idempotent: no-ops once a status is set.
  checkBattleEnd(ctx);
}

/* ══════════════════════════ Legality queries (for the UI) ══════════════════════════ */

export interface HeroActionLegality {
  canMove: boolean;
  moveBudgetFeet: number;
  canAttack: boolean;
  attacks: { index: number; attack: ReturnType<typeof attacksOf>[number]; targetIds: string[] }[];
  spells: { spell: Spell; targetIds: string[]; needsDestination: boolean }[];
  canDash: boolean;
  canDisengage: boolean;
  canDodge: boolean;
  canHelp: boolean;
  helpTargetIds: string[];
  canHide: boolean;
  canPotion: boolean;
  potionTargetIds: string[];
  canStand: boolean;
  canCunning: "none" | "some";
  cunningOptions: ("dash" | "disengage" | "hide")[];
  canSecondWind: boolean;
  canActionSurge: boolean;
  canEndTurn: boolean;
}

/** Everything the action bar needs to light up for the active hero. */
export function heroLegality(battle: BattleState): HeroActionLegality | null {
  if (battle.status !== "active") return null;
  const hero = activeCombatant(battle);
  if (!hero || hero.side !== "party" || isOutOfAction(hero)) return null;
  const arena = getArena(battle.arenaId);
  const ctx: KernelCtx = { battle, rng: new Rng(1), arena };

  const enemies = Object.values(battle.combatants).filter(
    (e) => e.side === "enemy" && !isOutOfAction(e)
  );
  const allies = Object.values(battle.combatants).filter(
    (a) => a.side === "party" && !isOutOfAction(a)
  );
  // Down allies are healable — potions and healing spells end Down (Table 7).
  const healable = Object.values(battle.combatants).filter(
    (a) => a.side === "party" && !a.fled
  );

  const attacks = attacksOf(hero).map((attack, index) => ({
    index,
    attack,
    targetIds: enemies
      .filter((e) => inWeaponRange(ctx, hero, e, attack) && inSight(ctx, hero, e))
      .map((e) => e.id),
  }));

  const sheet = heroSheetOf(hero);
  const spells: HeroActionLegality["spells"] = [];
  for (const spell of sheet.spells ?? []) {
    if (spell.minLevel && battle.partyLevel < spell.minLevel) continue;
    const isBonus = spell.bonusAction === true;
    if (isBonus ? hero.bonusActionUsed : hero.actionUsed) continue;
    if (spell.cost === "slot" && hero.spellSlotsUsed >= hero.maxSpellSlots) continue;
    let targetIds: string[] = [];
    let needsDestination = false;
    switch (spell.name) {
      case "Sacred Flame":
      case "Guiding Bolt":
      case "Fire Bolt":
        targetIds = enemies
          .filter((e) => e.position && hero.position && inSight(ctx, hero, e))
          .map((e) => e.id);
        break;
      case "Burning Hands":
        targetIds = enemies
          .filter((e) => e.position && hero.position && inSight(ctx, hero, e))
          .map((e) => e.id);
        break;
      case "Magic Missile":
        targetIds = enemies.map((e) => e.id);
        break;
      case "Bless":
        targetIds = allies.map((a) => a.id);
        break;
      case "Cure Wounds":
        targetIds = healable.filter((a) => a.id === hero.id ||
          (hero.position && a.position && chebyshev(hero.position, a.position) <= 1)).map((a) => a.id);
        break;
      case "Healing Word":
        targetIds = healable.map((a) => a.id);
        break;
      case "Mage Armor":
        targetIds = hero.resources.mageArmor ? [] : [hero.id];
        break;
      case "Misty Step":
        needsDestination = true;
        targetIds = [];
        break;
      default:
        targetIds = [];
        break;
    }
    if (spell.name !== "Light" && spell.name !== "Mage Hand" && spell.name !== "Misty Step" && targetIds.length === 0 && spell.name !== "Sleep") {
      continue; // no legal target for a targeted spell
    }
    spells.push({ spell, targetIds, needsDestination });
  }

  const moveBudgetFeet = remainingMovement(hero);
  return {
    canMove: moveBudgetFeet >= 5,
    moveBudgetFeet,
    canAttack: !hero.actionUsed && attacks.some((a) => a.targetIds.length > 0),
    attacks,
    spells,
    canDash: !hero.actionUsed,
    canDisengage: !hero.actionUsed,
    canDodge: !hero.actionUsed,
    canHelp:
      !hero.actionUsed &&
      enemies.some(
        (e) => hero.position && e.position && chebyshev(hero.position, e.position) <= 1
      ),
    helpTargetIds: enemies
      .filter((e) => hero.position && e.position && chebyshev(hero.position, e.position) <= 1)
      .map((e) => e.id),
    canHide: !hero.actionUsed,
    canPotion: !hero.actionUsed && battle.potions > 0,
    potionTargetIds: healable
      .filter(
        (a) =>
          a.id === hero.id ||
          (hero.position && a.position && chebyshev(hero.position, a.position) <= 1)
      )
      .map((a) => a.id),
    canStand: hasCondition(hero, "Prone") && moveBudgetFeet >= Math.floor(hero.speed / 2),
    canCunning: hero.resources.cunningAction && !hero.bonusActionUsed ? "some" : "none",
    cunningOptions: hero.resources.cunningAction && !hero.bonusActionUsed ? ["dash", "disengage", "hide"] : [],
    canSecondWind: hero.ref === "torvald" && !!hero.resources.secondWind && !hero.bonusActionUsed,
    canActionSurge: hero.ref === "torvald" && !!hero.resources.actionSurge && hero.actionUsed,
    canEndTurn: true,
  };
}

/** Squares the active hero can reach with their remaining movement. */
export function reachableTiles(battle: BattleState): Map<string, { path: Point[]; cost: number }> {
  const out = new Map<string, { path: Point[]; cost: number }>();
  if (battle.status !== "active") return out;
  const hero = activeCombatant(battle);
  if (!hero || hero.side !== "party" || !hero.position || isOutOfAction(hero)) return out;
  const arena = getArena(battle.arenaId);
  const budget = Math.floor(remainingMovement(hero) / 5);
  if (budget <= 0) return out;
  for (let y = 0; y < battle.height; y++) {
    for (let x = 0; x < battle.width; x++) {
      const to = { x, y };
      if (to.x === hero.position.x && to.y === hero.position.y) continue;
      const path = findPath(arena, battle, hero, to, budget);
      if (path && path.cost <= budget) {
        out.set(`${x},${y}`, path);
      }
    }
  }
  return out;
}

/** Empty squares within 30 ft for Misty Step. */
export function mistyStepDestinations(battle: BattleState): Point[] {
  const hero = activeCombatant(battle);
  if (!hero || !hero.position) return [];
  const arena = getArena(battle.arenaId);
  const out: Point[] = [];
  for (const n of allTiles(battle)) {
    if (chebyshev(n, hero.position) <= 6 && isFree(arena, battle, n)) out.push(n);
  }
  return out;
}

function allTiles(battle: BattleState): Point[] {
  const out: Point[] = [];
  for (let y = 0; y < battle.height; y++) {
    for (let x = 0; x < battle.width; x++) out.push({ x, y });
  }
  return out;
}

export { PARTY_ORDER, neighbors };
