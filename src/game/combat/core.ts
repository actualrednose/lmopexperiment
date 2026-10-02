/**
 * Combat kernel — core (GDD §10.2): battle creation, initiative, the shared
 * attack-resolution primitive with the §4.1 advantage whitelist, damage and
 * healing application, morale transitions and the turn lifecycle.
 *
 * Everything here is a pure reducer over BattleState: the same inputs always
 * produce the same outputs, which makes fights unit-testable, replayable
 * from a seed and trivially undoable during development (GDD §9.1).
 */

import { getStatBlock, type EnemyStatBlock } from "@/content/bestiary";
import { getHeroSheet, PARTY_ORDER, createPartyRuntime } from "@/content/party";
import { getArena } from "@/content/arenas";
import type { ArenaDef } from "@/game/grid";
import {
  chebyshev,
  distanceFeet,
  hasCoverVsRanged,
  hasLineOfSight,
  isAdjacent,
} from "@/game/grid";
import { abilityModifier, formatDice, proficiencyBonus } from "@/game/dice";
import { Rng } from "@/game/rng";
import type {
  Attack,
  BattleLogEntry,
  BattleState,
  BattleStats,
  Combatant,
  ConditionName,
  EnemyId,
  HeroId,
  HeroRuntime,
  HeroSheet,
} from "@/game/types";

/* ══════════════════════════ Kernel context ══════════════════════════ */

/** The mutable working set every kernel branch operates on. */
export interface KernelCtx {
  battle: BattleState;
  rng: Rng;
  arena: ArenaDef;
}

export function emptyStats(): BattleStats {
  return {
    partyAttacks: 0,
    partyHits: 0,
    enemyAttacks: 0,
    enemyHits: 0,
    enemyAttacksBy: {},
    enemyHitsBy: {},
    partyDamageTaken: 0,
    partyHealing: 0,
    potionsUsed: 0,
    roundsFought: 1,
    sleptEnemies: 0,
  };
}

/* ══════════════════════════ Sheet lookups ══════════════════════════ */

export function isEnemy(c: Combatant): boolean {
  return c.side === "enemy";
}

export function heroSheetOf(c: Combatant): HeroSheet {
  return getHeroSheet(c.ref as HeroId);
}

export function statBlockOf(c: Combatant): EnemyStatBlock {
  return getStatBlock(c.ref as EnemyId);
}

/** Attacks available to a combatant: hero sheet weapons or stat block attacks. */
export function attacksOf(c: Combatant): Attack[] {
  return isEnemy(c) ? statBlockOf(c).attacks : heroSheetOf(c).attacks;
}

export function isDown(c: Combatant): boolean {
  return c.hp <= 0;
}

export function isOutOfAction(c: Combatant): boolean {
  return isDown(c) || c.fled;
}

/** Dexterity modifier: heroes from the sheet, enemies from the stat block. */
export function dexModOf(c: Combatant): number {
  return isEnemy(c) ? statBlockOf(c).dexMod : abilityModifier(heroSheetOf(c).abilities.DEX);
}

/** Strength modifier for saves (wolf trip); enemies default to 0. */
export function strModOf(c: Combatant): number {
  return isEnemy(c) ? 0 : abilityModifier(heroSheetOf(c).abilities.STR);
}

/** Passive Perception: heroes 10 + best Perception bonus or WIS mod; stat blocks otherwise. */
export function passivePerceptionOf(c: Combatant): number {
  if (isEnemy(c)) return statBlockOf(c).passivePerception;
  const sheet = heroSheetOf(c);
  const skill = sheet.skills.find((s) => s.skill === "Perception");
  return 10 + (skill ? skill.bonus : abilityModifier(sheet.abilities.WIS));
}

/** Stealth bonus for Hide actions (heroes). */
export function stealthBonusOf(c: Combatant): number {
  if (isEnemy(c)) return statBlockOf(c).stealthBonus;
  const sheet = heroSheetOf(c);
  const skill = sheet.skills.find((s) => s.skill === "Stealth");
  return skill ? skill.bonus : abilityModifier(sheet.abilities.DEX);
}

/** Spell save DC: 8 + proficiency + casting ability (13 for both casters at level 1-2). */
export function spellSaveDC(c: Combatant): number {
  const sheet = heroSheetOf(c);
  const mod =
    sheet.id === "maera"
      ? abilityModifier(sheet.abilities.WIS)
      : abilityModifier(sheet.abilities.INT);
  return 8 + proficiencyBonus(sheet.level) + mod;
}

export function hasCondition(c: Combatant, cond: ConditionName): boolean {
  return c.conditions.includes(cond);
}

export function addCondition(ctx: KernelCtx, c: Combatant, cond: ConditionName): void {
  if (!c.conditions.includes(cond)) c.conditions.push(cond);
}

export function removeCondition(c: Combatant, cond: ConditionName): void {
  const i = c.conditions.indexOf(cond);
  if (i >= 0) c.conditions.splice(i, 1);
}

/* ══════════════════════════ Logging ══════════════════════════ */

export function log(
  ctx: KernelCtx,
  actor: string,
  text: string,
  extra?: Partial<BattleLogEntry>
): void {
  ctx.battle.log.push({
    round: ctx.battle.round,
    actor,
    text,
    ...extra,
  });
}

/* ══════════════════════════ Battle creation ══════════════════════════ */

export interface CreateBattleOptions {
  level: 1 | 2;
  seed: number;
  /** Party HP override (fraction of max), for simulation variants; default full. */
  startHpFraction?: number;
  /**
   * Session 3: snapshot from the live run party (story battles) instead of a
   * fresh sheet — carries level, current HP, spent slots and resources, so
   * the ambush is part of the continuous run. `level` is then derived from
   * the party and must match.
   */
  party?: Record<HeroId, HeroRuntime>;
  /** Session 3: potion supply override (story battles carry the inventory's). */
  potions?: number;
}

export function createBattle(arena: ArenaDef, opts: CreateBattleOptions): BattleState {
  const rng = new Rng(opts.seed >>> 0);
  if (opts.party) {
    const levels = new Set(PARTY_ORDER.map((id) => opts.party![id].level));
    if (levels.size !== 1) throw new Error("createBattle: run party has mixed levels");
    if (opts.party.torvald.level !== opts.level) {
      throw new Error("createBattle: opts.level does not match the run party");
    }
  }
  const party = opts.party
    ? structuredClone(opts.party)
    : createPartyRuntime(opts.level);
  if (!opts.party && opts.startHpFraction !== undefined && opts.startHpFraction < 1) {
    for (const id of PARTY_ORDER) {
      const rt = party[id];
      rt.hp = Math.max(1, Math.round(rt.maxHp * opts.startHpFraction));
    }
  }

  const battle: BattleState = {
    arenaId: arena.id,
    width: arena.map[0]?.length ?? 0,
    height: arena.map.length,
    round: 1,
    order: [],
    activeIndex: 0,
    combatants: {},
    log: [],
    status: "active",
    rng: rng.getCursor(),
    partyLevel: opts.level,
    potions: opts.potions ?? arena.potions,
    pendingReactions: [],
    stats: emptyStats(),
  };
  const ctx: KernelCtx = { battle, rng, arena };

  // ── Party combatants ──
  PARTY_ORDER.forEach((heroId, index) => {
    const sheet = getHeroSheet(heroId);
    const rt = party[heroId];
    const spawn = arena.partySpawns[index] ?? { x: 1, y: 1 };
    const slots = sheet.spellSlots
      ? Math.max(sheet.spellSlots, opts.level >= 2 ? sheet.level2.slots ?? 0 : 0)
      : 0;
    battle.combatants[heroId] = {
      id: heroId,
      side: "party",
      ref: heroId,
      name: sheet.name,
      hp: rt.hp,
      maxHp: rt.maxHp,
      ac: sheet.ac,
      conditions: [],
      position: { ...spawn },
      initiative: 0,
      // Carried from the run party (story battles); fresh parties start clean.
      spellSlotsUsed: rt.spellSlotsUsed,
      maxSpellSlots: slots,
      resources: { ...rt.resources },
      speed: sheet.speed,
      movementUsed: 0,
      dashes: 0,
      actionUsed: false,
      bonusActionUsed: false,
      reactionUsed: false,
      dodging: false,
      disengaged: false,
      sleeping: false,
      blessRounds: 0,
      aided: false,
      guidingBolt: false,
      fleeing: false,
      fled: false,
    };
  });

  // ── Enemy combatants ──
  arena.enemySpawns.forEach((spawn) => {
    const block = getStatBlock(spawn.ref);
    battle.combatants[spawn.label] = {
      id: spawn.label,
      side: "enemy",
      ref: spawn.ref,
      name: spawn.label,
      hp: block.hp,
      maxHp: block.hp,
      ac: block.ac,
      conditions: [],
      position: { x: spawn.x, y: spawn.y },
      initiative: 0,
      spellSlotsUsed: 0,
      maxSpellSlots: 0,
      resources: {},
      speed: block.speed,
      movementUsed: 0,
      dashes: 0,
      actionUsed: false,
      bonusActionUsed: false,
      reactionUsed: false,
      dodging: false,
      disengaged: false,
      sleeping: false,
      blessRounds: 0,
      aided: false,
      guidingBolt: false,
      fleeing: false,
      fled: false,
    };
  });

  // ── Initiative: d20 + DEX modifier; heroes win ties (GDD §4.2) ──
  const all = Object.values(battle.combatants);
  for (const c of all) {
    const roll = rng.d20(`${c.id}.initiative`);
    c.initiative = roll + dexModOf(c);
    log(ctx, c.name, `rolls initiative ${roll} ${fmtSign(dexModOf(c))} = ${c.initiative}.`, {
      roll: {
        tag: `${c.id}-initiative`,
        d20: roll,
        dice: [roll],
        modifier: dexModOf(c),
        total: c.initiative,
      },
    });
  }
  const order = [...all].sort((a, b) => {
    if (b.initiative !== a.initiative) return b.initiative - a.initiative;
    if (a.side !== b.side) return a.side === "party" ? -1 : 1; // heroes win ties
    return 0; // stable for equals
  });
  battle.order = order.map((c) => c.id);

  // ── Ambush Stealth contest (GDD §5.2, run in reverse) ──
  if (arena.ambush) {
    const stealthRoll = rng.d20("ambush.stealth");
    const stealth = stealthRoll + arena.ambush.stealthBonus;
    const partyCombatants = all.filter((c) => c.side === "party");
    const bestSpotter = partyCombatants.reduce((best, c) =>
      passivePerceptionOf(c) > passivePerceptionOf(best) ? c : best
    );
    const partySurprised = stealth > passivePerceptionOf(bestSpotter);
    if (partySurprised) {
      for (const c of partyCombatants) addCondition(ctx, c, "Surprised");
      log(
        ctx,
        "The thickets",
        `Ambush! The goblins' Stealth ${stealthRoll} ${fmtSign(
          arena.ambush.stealthBonus
        )} = ${stealth} beats ${bestSpotter.name}'s passive Perception ${passivePerceptionOf(
          bestSpotter
        )} — the party starts Surprised.`,
        {
          roll: {
            tag: "ambush-stealth",
            d20: stealthRoll,
            dice: [stealthRoll],
            modifier: arena.ambush.stealthBonus,
            total: stealth,
            target: passivePerceptionOf(bestSpotter),
            success: true,
          },
          highlight: true,
        }
      );
    } else {
      log(
        ctx,
        bestSpotter.name,
        `spots movement in the thickets (passive Perception ${passivePerceptionOf(
          bestSpotter
        )} vs the goblins' Stealth ${stealth}) — no surprise.`,
        {
          roll: {
            tag: "ambush-stealth",
            d20: stealthRoll,
            dice: [stealthRoll],
            modifier: arena.ambush.stealthBonus,
            total: stealth,
            target: passivePerceptionOf(bestSpotter),
            success: false,
          },
          highlight: true,
        }
      );
    }
  }

  battle.rng = rng.getCursor();
  // Begin the first actor's turn bookkeeping — skipping anyone Surprised
  // in round 1 (they cannot act or move on the first round).
  battle.activeIndex = 0;
  let guard = 0;
  while (
    guard < battle.order.length &&
    !canAct(battle.combatants[battle.order[battle.activeIndex]], battle.round)
  ) {
    battle.activeIndex += 1;
    guard += 1;
  }
  beginTurnFor(ctx, activeCombatant(battle));
  battle.rng = rng.getCursor();
  return battle;
}

/* ══════════════════════════ Turn lifecycle ══════════════════════════ */

export function activeCombatant(battle: BattleState): Combatant {
  return battle.combatants[battle.order[battle.activeIndex]];
}

export function canAct(c: Combatant, round: number): boolean {
  if (isOutOfAction(c)) return false;
  if (round === 1 && hasCondition(c, "Surprised")) return false;
  return true;
}

/** Movement budget in feet: speed × (1 + dashes) − used. */
export function remainingMovement(c: Combatant): number {
  return Math.max(0, c.speed * (1 + c.dashes) - c.movementUsed);
}

/**
 * Begin a combatant's turn: reset move/action state, end last turn's Dodge,
 * wake sleepers at the cost of their action, and auto-exit fleeing runners.
 */
export function beginTurnFor(ctx: KernelCtx, c: Combatant | null): void {
  if (!c) return;
  c.movementUsed = 0;
  c.dashes = 0;
  c.actionUsed = false;
  c.bonusActionUsed = false;
  c.disengaged = false;
  c.dodging = false; // Dodge lasted until the start of this combatant's next turn

  if (c.fled) return;

  if (c.fleeing && c.position && atMapEdge(ctx, c.position)) {
    c.fled = true;
    c.position = null;
    log(ctx, c.name, "vanishes into the tree line.", { highlight: true });
    // The escape can end the battle (last enemy gone).
    checkBattleEnd(ctx);
    return;
  }

  if (c.sleeping) {
    c.sleeping = false;
    c.actionUsed = true; // waking costs its action (GDD Table 6)
    log(ctx, c.name, "shakes off the sleep spell — waking costs its action.");
  }
}

function atMapEdge(ctx: KernelCtx, p: { x: number; y: number }): boolean {
  return p.x === 0 || p.y === 0 || p.x === ctx.battle.width - 1 || p.y === ctx.battle.height - 1;
}

/** Advance to the next combatant in initiative order, closing rounds as needed. */
export function advanceTurn(ctx: KernelCtx): void {
  const battle = ctx.battle;
  let guard = 0;
  do {
    battle.activeIndex += 1;
    if (battle.activeIndex >= battle.order.length) {
      endRound(ctx);
      battle.activeIndex = 0;
    }
    guard += 1;
  } while (
    guard < 4 * battle.order.length &&
    !canAct(battle.combatants[battle.order[battle.activeIndex]], battle.round)
  );
  beginTurnFor(ctx, activeCombatant(battle));
}

/** End of round: clear reactions, end Surprise, tick Bless. */
export function endRound(ctx: KernelCtx): void {
  const battle = ctx.battle;
  battle.round += 1;
  battle.stats.roundsFought = battle.round;
  for (const c of Object.values(battle.combatants)) {
    c.reactionUsed = false;
    if (battle.round > 1) removeCondition(c, "Surprised");
    if (c.blessRounds > 0) {
      c.blessRounds -= 1;
      if (c.blessRounds === 0) {
        log(ctx, c.name, "feels the blessing fade.");
      }
    }
  }
}

/* ══════════════════════════ Advantage whitelist (GDD §4.1) ══════════════════════════ */

export interface AttackContext {
  /** Melee or ranged weapon/spell attack. */
  melee: boolean;
  /** True for opportunity attacks (reaction, no action cost). */
  opportunity?: boolean;
}

export interface AdvantageInfo {
  mode: "advantage" | "disadvantage" | null;
  source: string | null;
}

/**
 * The advantage/disadvantage whitelist. Only these named sources exist;
 * one of each cancels to a plain roll (GDD §4.1).
 */
export function advantageFor(
  ctx: KernelCtx,
  attacker: Combatant,
  target: Combatant,
  atkCtx: AttackContext
): AdvantageInfo {
  const adv: string[] = [];
  const dis: string[] = [];

  if (hasCondition(attacker, "Hidden")) adv.push("attacking from hiding");
  if (target.aided) adv.push("Help");
  if (target.guidingBolt) adv.push("Guiding Bolt");
  if (target.sleeping) adv.push("the target is asleep");
  if (target.fleeing && atkCtx.melee) adv.push("the target is running");
  if (
    attacker.ref === "wolf" &&
    Object.values(ctx.battle.combatants).some(
      (c) =>
        c.id !== attacker.id &&
        c.ref === "wolf" &&
        !isOutOfAction(c) &&
        c.position &&
        target.position &&
        isAdjacent(c.position, target.position)
    )
  ) {
    adv.push("Pack Tactics");
  }
  if (hasCondition(target, "Prone") && atkCtx.melee) adv.push("the target is Prone");

  if (target.dodging) dis.push("the target is Dodging");
  if (hasCondition(target, "Hidden")) dis.push("the target is Hidden");
  if (hasCondition(target, "Prone") && !atkCtx.melee) dis.push("the target is Prone");

  if (adv.length > 0 && dis.length === 0) return { mode: "advantage", source: adv[0] };
  if (dis.length > 0 && adv.length === 0) return { mode: "disadvantage", source: dis[0] };
  return { mode: null, source: null };
}

/** Effective AC vs a specific attack: base + cover vs ranged (flat +2 ruling). */
export function effectiveAcVs(
  ctx: KernelCtx,
  target: Combatant,
  melee: boolean
): { ac: number; cover: boolean } {
  if (melee || !target.position) return { ac: target.ac, cover: false };
  const cover = hasCoverVsRanged(ctx.arena, target.position);
  return { ac: target.ac + (cover ? 2 : 0), cover };
}

/* ══════════════════════════ Attack resolution ══════════════════════════ */

export interface AttackResult {
  hit: boolean;
  crit: boolean;
  damage: number;
}

/**
 * The one attack pipeline every weapon swing and attack spell flows through:
 * advantage roll, Lucky reroll, Bless die, crit, sneak attack, cover.
 */
export function resolveAttack(
  ctx: KernelCtx,
  attacker: Combatant,
  target: Combatant,
  attack: Pick<Attack, "name" | "attackBonus" | "damage">,
  atkCtx: AttackContext
): AttackResult {
  const { rng } = ctx;
  const adv = advantageFor(ctx, attacker, target, atkCtx);
  const { ac, cover } = effectiveAcVs(ctx, target, atkCtx.melee);

  // Roll the d20 (two dice for advantage or disadvantage; keep high/low).
  const diceCount = adv.mode ? 2 : 1;
  const dice: number[] = [];
  for (let i = 0; i < diceCount; i++) dice.push(rng.d20(`${attacker.id}.attack`));
  let kept = adv.mode === "advantage" ? Math.max(...dice) : Math.min(...dice);
  let lucky = false;
  // Halfling Lucky: reroll a natural 1 once (attack rolls only in battle).
  if (kept === 1 && attacker.ref === "perrin" && !isEnemy(attacker)) {
    const reroll = rng.d20(`${attacker.id}.lucky`);
    dice.push(reroll);
    kept = reroll;
    lucky = true;
  }

  const blessDie = attacker.blessRounds > 0 ? rng.die(4, `${attacker.id}.bless`) : 0;
  const total = kept + attack.attackBonus + blessDie;

  const isCrit = kept === 20;
  const isMiss = kept === 1;
  const hit = isCrit || (!isMiss && total >= ac);

  // Telemetry.
  const stats = ctx.battle.stats;
  if (attacker.side === "party") {
    stats.partyAttacks += 1;
    if (hit) stats.partyHits += 1;
  } else {
    stats.enemyAttacks += 1;
    stats.enemyAttacksBy[target.id] = (stats.enemyAttacksBy[target.id] ?? 0) + 1;
    if (hit) {
      stats.enemyHits += 1;
      stats.enemyHitsBy[target.id] = (stats.enemyHitsBy[target.id] ?? 0) + 1;
    }
  }

  // Log the swing with its full math.
  const blessMark = blessDie > 0 ? ` + 1d4 (${blessDie})` : "";
  const coverMark = cover ? ` (cover +2)` : "";
  const outcome = hit ? (isCrit ? "a critical hit" : "hit") : "miss";
  const suffix: string[] = [];
  if (adv.source) suffix.push(`${adv.mode} — ${adv.source}`);
  if (cover) suffix.push("behind cover");
  if (lucky) suffix.push("Lucky reroll");
  log(
    ctx,
    attacker.name,
    `${isCrit ? "CRITICAL — " : ""}${attack.name}: ${dice.join(", ")} ${fmtSign(
      attack.attackBonus
    )}${blessMark} = ${total} vs AC ${ac}${coverMark} — ${outcome}${
      suffix.length ? ` (${suffix.join("; ")})` : ""
    }.`,
    {
      roll: {
        tag: `${attacker.id}-attack`,
        d20: kept,
        dice,
        modifier: attack.attackBonus + blessDie,
        total,
        target: ac,
        success: hit,
        mode: adv.mode,
        source: adv.source ?? undefined,
      },
      strike: {
        attackerId: attacker.id,
        targetId: target.id,
        melee: atkCtx.melee,
        hit,
        crit: isCrit,
        flavor: atkCtx.melee
          ? undefined
          : attack.name === "Fire Bolt"
            ? "fire"
            : attack.name === "Guiding Bolt"
              ? "radiant"
              : "arrow",
      },
      highlight: true,
    }
  );

  // Marks are consumed by the next attack against the target, hit or miss.
  target.aided = false;
  target.guidingBolt = false;

  if (!hit) return { hit: false, crit: false, damage: 0 };

  // Damage: crits roll the dice twice, modifiers once (GDD §4.1).
  const times = isCrit ? 2 : 1;
  let damage = attack.damage.plus ?? 0;
  for (let t = 0; t < times; t++) {
    for (let i = 0; i < attack.damage.count; i++) {
      damage += rng.die(attack.damage.sides, `${attacker.id}.damage`);
    }
  }

  // Sneak Attack: Perrin, with advantage or an ally adjacent to the target.
  if (attacker.ref === "perrin" && !isEnemy(attacker) && target.position && attacker.position) {
    const targetPos = target.position;
    const allyAdjacent = Object.values(ctx.battle.combatants).some(
      (c) =>
        c.side === "party" &&
        c.id !== attacker.id &&
        !isOutOfAction(c) &&
        c.position &&
        isAdjacent(c.position, targetPos)
    );
    if (adv.mode === "advantage" || allyAdjacent) {
      let sneak = 0;
      for (let t = 0; t < times; t++) sneak += rng.die(6, "perrin.sneak");
      damage += sneak;
      log(
        ctx,
        attacker.name,
        `Sneak Attack: ${times === 2 ? "doubled dice — " : ""}+${sneak} damage.`
      );
    }
  }

  applyDamage(ctx, attacker, target, damage, attack.name);

  // Wolf trip: a bitten target that fails a DC 11 STR save is knocked Prone
  // (GDD Table 11) — folded into the shared pipeline like Sneak Attack.
  if (
    attacker.ref === "wolf" &&
    attacker.position &&
    target.position &&
    !isOutOfAction(target)
  ) {
    const save = rng.d20(`${target.id}.strsave`);
    const mod = strModOf(target);
    const total = save + mod;
    const fails = total < 11;
    log(
      ctx,
      attacker.name,
      `${target.name} STR save ${save} ${fmtSign(mod)} = ${total} vs DC 11 — ${
        fails ? "knocked Prone" : "keeps its footing"
      }.`,
      {
        roll: {
          tag: "wolf-trip-save",
          d20: save,
          dice: [save],
          modifier: mod,
          total,
          target: 11,
          success: !fails,
          mode: null,
          source: "Wolf bite",
        },
      }
    );
    if (fails) addCondition(ctx, target, "Prone");
  }

  return { hit: true, crit: isCrit, damage };
}

/* ══════════════════════════ Damage & healing ══════════════════════════ */

export function applyDamage(
  ctx: KernelCtx,
  source: Combatant | null,
  target: Combatant,
  amount: number,
  label: string
): void {
  if (amount <= 0 || isOutOfAction(target)) return;
  const applied = Math.min(target.hp, amount);
  target.hp -= amount;
  const stats = ctx.battle.stats;

  const entry: Partial<BattleLogEntry> = {
    fx: [{ targetId: target.id, amount, kind: "damage" as const }],
  };

  if (target.hp <= 0) {
    target.hp = 0;
    addCondition(ctx, target, "Down");
    target.dodging = false;
    target.aided = false;
    target.guidingBolt = false;
    target.blessRounds = 0;
    target.sleeping = false;
    target.fleeing = false;
    log(
      ctx,
      source ? source.name : "The battle",
      `${target.name} takes ${applied} damage and falls Down.`,
      entry
    );
    if (target.side === "party") {
      stats.partyDamageTaken += applied;
      checkBattleEnd(ctx);
    } else {
      checkMorale(ctx);
      checkBattleEnd(ctx);
    }
  } else {
    log(
      ctx,
      source ? source.name : "The battle",
      `${target.name} takes ${applied} damage${label ? ` from ${label}` : ""}.`,
      entry
    );
    if (target.side === "party") stats.partyDamageTaken += applied;
  }
}

export function applyHealing(ctx: KernelCtx, target: Combatant, amount: number): number {
  if (target.fled || amount <= 0) return 0;
  // Note: Down heroes are valid healing targets — a potion or healing spell
  // is exactly what ends the Down condition (GDD Table 7).
  const wasDown = isDown(target);
  const before = target.hp;
  target.hp = Math.min(target.maxHp, target.hp + amount);
  const healed = target.hp - before;
  if (wasDown) {
    removeCondition(target, "Down");
    log(ctx, target.name, "is back on their feet!", {
      fx: [{ targetId: target.id, amount: healed, kind: "heal" }],
    });
  }
  // Prone ends when healed (GDD Table 7).
  if (hasCondition(target, "Prone")) removeCondition(target, "Prone");
  if (target.side === "party") ctx.battle.stats.partyHealing += healed;
  return healed;
}

/* ══════════════════════════ Morale & battle end ══════════════════════════ */

/**
 * Enemy morale (GDD §4.5 / Table 11): goblins break when only one stands;
 * wolves fight while the pack stands; Klarg never flees; Yeemik breaks
 * below half HP when the deal is off (Session 5 wires his trigger).
 */
export function checkMorale(ctx: KernelCtx): void {
  const enemies = Object.values(ctx.battle.combatants).filter(
    (c) => c.side === "enemy" && !isOutOfAction(c)
  );
  for (const c of enemies) {
    const block = statBlockOf(c);
    if (block.morale === "lastOfGroupFlees" && enemies.length === 1 && !c.fleeing) {
      c.fleeing = true;
      log(ctx, c.name, "looks around at its fallen pack, yelps, and breaks for the tree line!", {
        highlight: true,
      });
    }
    if (block.morale === "halfHpFlees" && c.hp <= Math.floor(c.maxHp / 2) && !c.fleeing) {
      c.fleeing = true;
      log(ctx, c.name, "decides the price is too high and breaks for the falls!", {
        highlight: true,
      });
    }
  }
}

export function checkBattleEnd(ctx: KernelCtx): void {
  if (ctx.battle.status !== "active") return;
  const enemiesLeft = Object.values(ctx.battle.combatants).some(
    (c) => c.side === "enemy" && !isOutOfAction(c)
  );
  const partyLeft = Object.values(ctx.battle.combatants).some(
    (c) => c.side === "party" && !isDown(c)
  );
  if (!enemiesLeft) {
    ctx.battle.status = "victory";
    // Down heroes revive at 1 HP (GDD Table 7).
    for (const c of Object.values(ctx.battle.combatants)) {
      if (c.side === "party" && isDown(c)) {
        c.hp = 1;
        removeCondition(c, "Down");
        c.sleeping = false;
      }
    }
    log(ctx, "Victory", "The road is cleared. The party steadies its breathing — victory.", {
      highlight: true,
    });
  } else if (!partyLeft) {
    ctx.battle.status = "defeat";
    log(ctx, "Defeat", "All four heroes are Down. Total party kill — the run returns to its save.", {
      highlight: true,
    });
  }
}

/* ══════════════════════════ Range & visibility helpers ══════════════════════════ */

export function inWeaponRange(
  ctx: KernelCtx,
  attacker: Combatant,
  target: Combatant,
  attack: Attack
): boolean {
  if (!attacker.position || !target.position) return false;
  const feet = distanceFeet(attacker.position, target.position);
  if (attack.reach !== undefined) return feet <= attack.reach;
  if (attack.range !== undefined) return feet <= attack.range[1];
  return feet <= 5;
}

export function inSight(ctx: KernelCtx, attacker: Combatant, target: Combatant): boolean {
  if (!attacker.position || !target.position) return false;
  return hasLineOfSight(ctx.arena, attacker.position, target.position);
}

/* ══════════════════════════ Small formatting helpers ══════════════════════════ */

export function fmtSign(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}

export { formatDice, chebyshev };
