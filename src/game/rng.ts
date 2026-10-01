/**
 * Seeded RNG — mulberry32 (GDD §9.2).
 *
 * Every die in the game, combat and exploration alike, is drawn from one
 * seeded generator whose cursor lives in the save state. Consequences:
 * a bug report that includes the seed reproduces the exact fight; the dice
 * animations display genuine engine rolls; Session 6's balance testing can
 * run thousands of seeded battles and measure real rates.
 *
 * The cursor is the raw 32-bit internal state, so saving and restoring it
 * is exact — no replay needed. The draw log is a QA aid (kept as a ring
 * buffer of the last MAX_LOG draws) and is not part of the save.
 */

import type { DiceExpr, RngState } from "./types";

export interface RngDraw {
  /** Monotonic draw index for this generator. */
  index: number;
  /** What the draw was for, e.g. "torvald.attack", "ambush.initiative". */
  tag: string;
  /** Die sides, or null for a raw uniform draw. */
  sides: number | null;
  /** The value produced: a float in [0, 1) when sides is null, else 1..sides. */
  value: number;
}

const MAX_LOG = 1000;

/** The largest float mulberry32 can return, just below 1. */
export const RNG_FLOAT_EXCLUSIVE_MAX = 1;

export class Rng {
  readonly seed: number;
  private state: number;
  private drawIndex: number;
  readonly log: RngDraw[] = [];

  constructor(seed: number) {
    this.seed = seed >>> 0;
    this.state = this.seed;
    this.drawIndex = 0;
  }

  /* ── Core ─────────────────────────────────────────────────────── */

  /** One mulberry32 round; returns a float in [0, 1). Raw draw, no die mapping. */
  float(tag = "float"): number {
    // Standard mulberry32 step.
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    this.record(tag, null, value);
    return value;
  }

  private record(tag: string, sides: number | null, value: number): void {
    this.log.push({ index: this.drawIndex++, tag, sides, value });
    if (this.log.length > MAX_LOG) {
      this.log.splice(0, this.log.length - MAX_LOG);
    }
  }

  /* ── Dice API ─────────────────────────────────────────────────── */

  /** Roll a single die with `sides` faces: an integer in [1, sides]. */
  die(sides: number, tag = "die"): number {
    if (!Number.isInteger(sides) || sides < 1) {
      throw new Error(`Rng.die: sides must be a positive integer, got ${sides}`);
    }
    const value = 1 + Math.floor(this.float(tag) * sides);
    // Overwrite the raw draw's log entry with the die result.
    this.log[this.log.length - 1] = { index: this.drawIndex - 1, tag, sides, value };
    return value;
  }

  /** Roll a d20 — the game's core resolution die. */
  d20(tag = "d20"): number {
    return this.die(20, tag);
  }

  /** Roll a full dice expression and return the sum (each die logged). */
  roll(expr: DiceExpr, tag = "roll"): number {
    let total = expr.plus ?? 0;
    for (let i = 0; i < expr.count; i++) {
      total += this.die(expr.sides, `${tag}#${i + 1}`);
    }
    return total;
  }

  /* ── Utility draws ────────────────────────────────────────────── */

  /** True with probability p (0..1). */
  chance(p: number, tag = "chance"): boolean {
    return this.float(tag) < p;
  }

  /** Uniform integer in [min, max] inclusive. */
  int(min: number, max: number, tag = "int"): number {
    if (!Number.isInteger(min) || !Number.isInteger(max) || max < min) {
      throw new Error(`Rng.int: invalid range [${min}, ${max}]`);
    }
    return min + Math.floor(this.float(tag) * (max - min + 1));
  }

  /** Uniform element of a non-empty array. */
  pick<T>(items: readonly T[], tag = "pick"): T {
    if (items.length === 0) {
      throw new Error("Rng.pick: cannot pick from an empty array");
    }
    return items[Math.floor(this.float(tag) * items.length)];
  }

  /* ── Cursor (what gets saved) ─────────────────────────────────── */

  /** Snapshot the exact position in the stream — restore with `fromState`. */
  getCursor(): RngState {
    return { seed: this.seed, state: this.state };
  }

  /** Total draws taken by this generator instance. */
  get drawCount(): number {
    return this.drawIndex;
  }

  /** Rebuild a generator from a saved cursor. */
  static fromState(saved: RngState): Rng {
    const rng = new Rng(saved.seed);
    rng.state = saved.state >>> 0;
    return rng;
  }
}

/** A fresh random seed (crypto when available, time-based fallback). */
export function randomSeed(): number {
  const cryptoObj = typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
  if (cryptoObj?.getRandomValues) {
    const buf = new Uint32Array(1);
    cryptoObj.getRandomValues(buf);
    return buf[0] >>> 0;
  }
  return (Math.floor(Date.now() * 7919) ^ (performance.now() * 104729)) >>> 0;
}
