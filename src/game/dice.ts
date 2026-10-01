/**
 * Dice math and formatting helpers (pure — no RNG state).
 * Shared by the character sheets, the dice UI and (from Session 2) the
 * combat kernel, so every surface shows identical notation and math.
 */

import type { AbilityKey, Abilities, DiceExpr } from "./types";

/** 5e ability modifier: floor((score - 10) / 2). */
export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

/** The whole ability block's modifiers, e.g. for sheet rendering. */
export function abilityModifiers(abilities: Abilities): Record<AbilityKey, number> {
  return {
    STR: abilityModifier(abilities.STR),
    DEX: abilityModifier(abilities.DEX),
    CON: abilityModifier(abilities.CON),
    INT: abilityModifier(abilities.INT),
    WIS: abilityModifier(abilities.WIS),
    CHA: abilityModifier(abilities.CHA),
  };
}

/** Signed bonus formatting: +5, +0, -1. */
export function formatBonus(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}

/** Dice notation: 1d8+3, 2d6, 1d10, 4d6+0 → 4d6. */
export function formatDice(expr: DiceExpr): string {
  const plus = expr.plus ?? 0;
  return `${expr.count}d${expr.sides}${plus !== 0 ? formatBonus(plus) : ""}`;
}

/** Expected value of a dice expression (for balance telemetry and tooltips). */
export function diceAverage(expr: DiceExpr): number {
  const plus = expr.plus ?? 0;
  return expr.count * ((expr.sides + 1) / 2) + plus;
}

/** Minimum possible roll. */
export function diceMin(expr: DiceExpr): number {
  return expr.count * 1 + (expr.plus ?? 0);
}

/** Maximum possible roll. */
export function diceMax(expr: DiceExpr): number {
  return expr.count * expr.sides + (expr.plus ?? 0);
}

/** Fixed proficiency bonus by level (streamlined table: +2 at 1, +2 at 2). */
export function proficiencyBonus(level: number): number {
  return level >= 3 ? 3 : 2;
}
