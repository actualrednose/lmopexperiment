/**
 * Combat kernel — spells (GDD §10.2): the complete magic system from Table 6,
 * all twelve spells. Cantrips are free; leveled spells draw from the slot
 * counter; Healing Word and Misty Step are bonus actions. No concentration:
 * ongoing effects last three rounds (Bless).
 *
 * Session 2 rulings (recorded in SESSIONS.md):
 * - Disciple of Life adds +2 to Maera's Cure Wounds and Healing Word.
 * - Sleep affects enemies only, weakest first, arena-wide (no range given).
 * - Magic Missile darts are distributed round-robin over 1-3 chosen targets.
 * - Casting at an enemy breaks Hidden; self/utility casting does not.
 */

import {
  applyDamage,
  applyHealing,
  fmtSign,
  isDown,
  isOutOfAction,
  log,
  resolveAttack,
  spellSaveDC,
  statBlockOf,
  type KernelCtx,
} from "./core";
import { chebyshev, distanceFeet, isFree } from "@/game/grid";
import type { Combatant, Spell } from "@/game/types";

export interface SpellParams {
  /** Chosen targets (1 for most spells, up to 3 for Bless and Magic Missile). */
  targetIds?: string[];
  /** Destination square for Misty Step. */
  to?: { x: number; y: number };
}

export type SpellOutcome = { ok: true } | { ok: false; reason: string };

function byId(ctx: KernelCtx, id: string | undefined): Combatant | null {
  if (!id) return null;
  return ctx.battle.combatants[id] ?? null;
}

function livingEnemyTargets(ctx: KernelCtx): Combatant[] {
  return Object.values(ctx.battle.combatants).filter(
    (c) => c.side === "enemy" && !isOutOfAction(c)
  );
}

function livingAllies(ctx: KernelCtx): Combatant[] {
  return Object.values(ctx.battle.combatants).filter(
    (c) => c.side === "party" && !isDown(c)
  );
}

/** Execute a validated spell. Assumes the caller checked slots and action economy. */
export function castSpell(
  ctx: KernelCtx,
  caster: Combatant,
  spell: Spell,
  params: SpellParams
): SpellOutcome {
  switch (spell.name) {
    case "Sacred Flame":
      return sacredFlame(ctx, caster, byId(ctx, params.targetIds?.[0]));
    case "Bless":
      return bless(ctx, caster, params.targetIds ?? []);
    case "Cure Wounds":
      return cureWounds(ctx, caster, byId(ctx, params.targetIds?.[0]));
    case "Guiding Bolt":
      return guidingBolt(ctx, caster, byId(ctx, params.targetIds?.[0]));
    case "Healing Word":
      return healingWord(ctx, caster, byId(ctx, params.targetIds?.[0]));
    case "Fire Bolt":
      return fireBolt(ctx, caster, byId(ctx, params.targetIds?.[0]));
    case "Burning Hands":
      return burningHands(ctx, caster, params);
    case "Magic Missile":
      return magicMissile(ctx, caster, params.targetIds ?? []);
    case "Mage Armor":
      return mageArmor(ctx, caster);
    case "Sleep":
      return sleep(ctx, caster);
    case "Misty Step":
      return mistyStep(ctx, caster, params.to ?? null);
    case "Light":
    case "Mage Hand":
      log(ctx, caster.name, `casts ${spell.name} — ${spell.effect}`);
      return { ok: true };
    default:
      return { ok: false, reason: `Unknown spell: ${spell.name}` };
  }
}

/* ── Maera ─────────────────────────────────────────────────────── */

function sacredFlame(ctx: KernelCtx, caster: Combatant, target: Combatant | null): SpellOutcome {
  if (!target || target.side !== "enemy" || isOutOfAction(target))
    return { ok: false, reason: "Sacred Flame needs a living enemy target." };
  if (!caster.position || !target.position) return { ok: false, reason: "Off-grid." };
  if (distanceFeet(caster.position, target.position) > 60)
    return { ok: false, reason: "Sacred Flame reaches 60 feet." };

  const dc = spellSaveDC(caster);
  const save = ctx.rng.d20(`${target.id}.save`);
  const dexMod = statBlockOf(target).dexMod;
  const total = save + dexMod;
  const fails = total < dc;
  let damage = 0;
  if (fails) {
    damage = ctx.rng.die(8, "maera.sacredflame");
  }
  log(
    ctx,
    caster.name,
    `Sacred Flame: ${target.name} DEX save ${save} ${fmtSign(dexMod)} = ${total} vs DC ${dc} — ${
      fails ? `fails and burns for ${damage} radiant` : "succeeds"
    }.`,
    {
      roll: {
        tag: "sacred-flame-save",
        d20: save,
        dice: [save],
        modifier: dexMod,
        total,
        target: dc,
        success: !fails,
        mode: null,
        source: "Sacred Flame",
      },
      strike: {
        attackerId: caster.id,
        targetId: target.id,
        melee: false,
        hit: fails,
        crit: false,
        flavor: "radiant",
      },
      highlight: true,
    }
  );
  if (fails && damage > 0) {
    applyDamage(ctx, caster, target, damage, "Sacred Flame");
  }
  return { ok: true };
}

function bless(ctx: KernelCtx, caster: Combatant, targetIds: string[]): SpellOutcome {
  if (targetIds.length < 1 || targetIds.length > 3)
    return { ok: false, reason: "Bless touches one to three allies." };
  const targets: Combatant[] = [];
  for (const id of targetIds) {
    const t = byId(ctx, id);
    if (!t || t.side !== "party" || isDown(t))
      return { ok: false, reason: "Bless only touches living allies." };
    targets.push(t);
  }
  for (const t of targets) {
    t.blessRounds = 3;
  }
  log(
    ctx,
    caster.name,
    `Bless: ${targets.map((t) => t.name).join(", ")} glow with morning light — +1d4 on attacks and checks for 3 rounds.`,
    { highlight: true }
  );
  return { ok: true };
}

function cureWounds(ctx: KernelCtx, caster: Combatant, target: Combatant | null): SpellOutcome {
  if (!target || target.side !== "party" || target.fled)
    return { ok: false, reason: "Cure Wounds needs an ally (or the caster)." };
  // Down allies are valid — healing is what ends Down (GDD Table 7).
  if (target.id !== caster.id) {
    if (!caster.position || !target.position || chebyshev(caster.position, target.position) > 1)
      return { ok: false, reason: "Cure Wounds is a touch spell." };
  }
  const rolled = ctx.rng.die(8, "maera.cure") + 5; // 1d8+3, +2 Disciple of Life
  const healed = applyHealing(ctx, target, rolled);
  log(
    ctx,
    caster.name,
    `Cure Wounds: 1d8+3 (+2 Disciple of Life) restores ${healed} HP to ${target.name}.`,
    { fx: [{ targetId: target.id, amount: healed, kind: "heal" }] }
  );
  return { ok: true };
}

function guidingBolt(ctx: KernelCtx, caster: Combatant, target: Combatant | null): SpellOutcome {
  if (!target || target.side !== "enemy" || isOutOfAction(target))
    return { ok: false, reason: "Guiding Bolt needs a living enemy target." };
  if (!caster.position || !target.position) return { ok: false, reason: "Off-grid." };
  if (distanceFeet(caster.position, target.position) > 120)
    return { ok: false, reason: "Guiding Bolt reaches 120 feet." };
  const result = resolveAttack(
    ctx,
    caster,
    target,
    { name: "Guiding Bolt", attackBonus: 5, damage: { count: 4, sides: 6 } },
    { melee: false }
  );
  if (result.hit) {
    target.guidingBolt = true;
    log(ctx, caster.name, `Light clings to ${target.name} — the next attack against it has advantage.`);
  }
  return { ok: true };
}

function healingWord(ctx: KernelCtx, caster: Combatant, target: Combatant | null): SpellOutcome {
  if (!target || target.side !== "party" || target.fled)
    return { ok: false, reason: "Healing Word needs an ally." };
  // Down allies are valid — the bonus-action pickup is the spell's whole job.
  if (!caster.position || !target.position) return { ok: false, reason: "Off-grid." };
  if (distanceFeet(caster.position, target.position) > 60)
    return { ok: false, reason: "Healing Word reaches 60 feet." };
  const rolled = ctx.rng.die(4, "maera.healingword") + 5; // 1d4+3, +2 Disciple of Life
  const healed = applyHealing(ctx, target, rolled);
  log(
    ctx,
    caster.name,
    `Healing Word: 1d4+3 (+2 Disciple of Life) restores ${healed} HP to ${target.name}.`,
    { fx: [{ targetId: target.id, amount: healed, kind: "heal" }] }
  );
  return { ok: true };
}

/* ── Elyndra ───────────────────────────────────────────────────── */

function fireBolt(ctx: KernelCtx, caster: Combatant, target: Combatant | null): SpellOutcome {
  if (!target || target.side !== "enemy" || isOutOfAction(target))
    return { ok: false, reason: "Fire Bolt needs a living enemy target." };
  if (!caster.position || !target.position) return { ok: false, reason: "Off-grid." };
  if (distanceFeet(caster.position, target.position) > 120)
    return { ok: false, reason: "Fire Bolt reaches 120 feet." };
  resolveAttack(
    ctx,
    caster,
    target,
    { name: "Fire Bolt", attackBonus: 5, damage: { count: 1, sides: 10 } },
    { melee: false }
  );
  return { ok: true };
}

function burningHands(ctx: KernelCtx, caster: Combatant, params: SpellParams): SpellOutcome {
  const aimTarget = byId(ctx, params.targetIds?.[0]);
  const aim: { x: number; y: number } | null =
    aimTarget?.position ?? params.to ?? caster.position;
  if (!caster.position || !aim) return { ok: false, reason: "No aim." };

  // 15-ft cone (Chebyshev ≤ 3 squares, consistent with free diagonals) in a
  // 90° arc toward the aim point.
  const dx = aim.x - caster.position.x;
  const dy = aim.y - caster.position.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const inCone = (t: Combatant): boolean => {
    if (!t.position || !caster.position) return false;
    const tx = t.position.x - caster.position.x;
    const ty = t.position.y - caster.position.y;
    if (tx === 0 && ty === 0) return false; // never the caster
    if (Math.max(Math.abs(tx), Math.abs(ty)) > 3) return false; // beyond 15 ft
    if (tx * ux + ty * uy <= 0) return false; // behind the caster
    const d = Math.hypot(tx, ty);
    return (tx * ux + ty * uy) / d >= Math.SQRT1_2 - 1e-9; // within 45°
  };
  const victims = livingEnemyTargets(ctx).filter(inCone);
  if (victims.length === 0) {
    log(ctx, caster.name, "Burning Hands roars across an empty patch of ground.");
    return { ok: true };
  }

  const dc = spellSaveDC(caster);
  for (const victim of victims) {
    const save = ctx.rng.d20(`${victim.id}.save`);
    const dexMod = statBlockOf(victim).dexMod;
    const total = save + dexMod;
    const fails = total < dc;
    let damage = 0;
    for (let i = 0; i < 3; i++) damage += ctx.rng.die(6, "elyndra.burninghands");
    if (!fails) damage = Math.floor(damage / 2);
    log(
      ctx,
      caster.name,
      `Burning Hands: ${victim.name} DEX save ${save} ${fmtSign(dexMod)} = ${total} vs DC ${dc} — ${
        fails ? `${damage} fire damage` : `half damage, ${damage}`
      }.`,
      {
        roll: {
          tag: "burning-hands-save",
          d20: save,
          dice: [save],
          modifier: dexMod,
          total,
          target: dc,
          success: !fails,
          mode: null,
          source: "Burning Hands",
        },
        highlight: victims[0].id === victim.id,
      }
    );
    applyDamage(ctx, caster, victim, damage, "Burning Hands");
  }
  return { ok: true };
}

function magicMissile(ctx: KernelCtx, caster: Combatant, targetIds: string[]): SpellOutcome {
  if (targetIds.length < 1 || targetIds.length > 3)
    return { ok: false, reason: "Magic Missile needs one to three targets." };
  const targets: Combatant[] = [];
  for (const id of targetIds) {
    const t = byId(ctx, id);
    if (!t || t.side !== "enemy" || isOutOfAction(t))
      return { ok: false, reason: "Magic Missile only strikes living enemies." };
    if (!caster.position || !t.position || distanceFeet(caster.position, t.position) > 120)
      return { ok: false, reason: "Magic Missile reaches 120 feet." };
    targets.push(t);
  }
  // Three darts, distributed round-robin; darts never miss.
  for (let dart = 0; dart < 3; dart++) {
    const t = targets[dart % targets.length];
    if (isOutOfAction(t)) continue;
    const damage = ctx.rng.die(4, "elyndra.missile") + 1;
    log(
      ctx,
      caster.name,
      `Magic Missile dart ${dart + 1} unerringly strikes ${t.name} — ${damage} force damage.`,
      { fx: [{ targetId: t.id, amount: damage, kind: "damage" }],
        strike: {
          attackerId: caster.id,
          targetId: t.id,
          melee: false,
          hit: true,
          crit: false,
          flavor: "dart",
        } }
    );
    applyDamage(ctx, caster, t, damage, "Magic Missile");
  }
  return { ok: true };
}

function mageArmor(ctx: KernelCtx, caster: Combatant): SpellOutcome {
  if (caster.resources.mageArmor)
    return { ok: false, reason: "Mage Armor already shimmers around her." };
  caster.resources.mageArmor = true;
  caster.ac += 2;
  log(
    ctx,
    caster.name,
    "Mage Armor: a shimmering ward of force wraps her — +2 AC for the rest of the scene.",
    { highlight: true }
  );
  return { ok: true };
}

function sleep(ctx: KernelCtx, caster: Combatant): SpellOutcome {
  let pool = 0;
  for (let i = 0; i < 5; i++) pool += ctx.rng.die(8, "elyndra.sleep");
  log(ctx, caster.name, `Sleep: the 5d8 pool rolls ${pool} points of drowsiness.`, {
    highlight: true,
  });
  const weakest = livingEnemyTargets(ctx).sort((a, b) => a.hp - b.hp);
  let remaining = pool;
  const drifted: string[] = [];
  for (const enemy of weakest) {
    if (enemy.hp <= remaining) {
      enemy.sleeping = true;
      remaining -= enemy.hp;
      ctx.battle.stats.sleptEnemies += 1;
      drifted.push(`${enemy.name} (${enemy.hp} HP)`);
    } else {
      break; // sorted ascending; nothing weaker remains
    }
  }
  if (drifted.length > 0) {
    log(ctx, caster.name, `Sleep: ${drifted.join(", ")} slump into uneasy dreams.`, {
      highlight: true,
    });
  } else {
    log(ctx, caster.name, "Sleep: the energies scatter — nobody succumbs.");
  }
  return { ok: true };
}

function mistyStep(
  ctx: KernelCtx,
  caster: Combatant,
  to: { x: number; y: number } | null
): SpellOutcome {
  if (!to) return { ok: false, reason: "Misty Step needs a destination square." };
  if (!caster.position) return { ok: false, reason: "Off-grid." };
  if (chebyshev(caster.position, to) > 6)
    return { ok: false, reason: "Misty Step reaches 30 feet." };
  if (!isFree(ctx.arena, ctx.battle, to))
    return { ok: false, reason: "That square is occupied." };
  log(
    ctx,
    caster.name,
    `Misty Step: she dissolves into silver mist and reforms ${distanceFeet(
      caster.position,
      to
    )} feet away.`,
    { teleport: { from: { ...caster.position }, to: { ...to } } }
  );
  caster.position = { ...to };
  return { ok: true };
}
