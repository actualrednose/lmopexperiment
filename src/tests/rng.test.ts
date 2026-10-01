/**
 * RNG determinism tests — Session 1 acceptance criterion #3:
 * identical seeds replay identical draw sequences (GDD §10.1).
 */

import { describe, expect, test } from "bun:test";
import { Rng, randomSeed } from "@/game/rng";
import type { DiceExpr } from "@/game/types";

const N = 10_000;

function drawFloats(seed: number, count: number): number[] {
  const rng = new Rng(seed);
  return Array.from({ length: count }, () => rng.float("test"));
}

describe("Rng (mulberry32) determinism", () => {
  test("identical seeds replay identical float sequences", () => {
    const a = drawFloats(0xc0ffee, N);
    const b = drawFloats(0xc0ffee, N);
    expect(a.length).toBe(N);
    expect(a).toEqual(b);
  });

  test("different seeds diverge", () => {
    const a = drawFloats(1, 1000);
    const b = drawFloats(2, 1000);
    const differs = a.some((value, i) => value !== b[i]);
    expect(differs).toBe(true);
  });

  test("floats are uniform in [0, 1)", () => {
    const rng = new Rng(42);
    let min = 1;
    let max = 0;
    for (let i = 0; i < N; i++) {
      const v = rng.float();
      if (v < 0 || v >= 1) throw new Error(`float out of range: ${v}`);
      min = Math.min(min, v);
      max = Math.max(max, v);
    }
    expect(min).toBeLessThan(0.001);
    expect(max).toBeGreaterThan(0.999);
  });

  test("d20 draws stay in bounds and hit every face", () => {
    const rng = new Rng(1337);
    const faces = new Set<number>();
    for (let i = 0; i < N; i++) {
      const roll = rng.d20("test.d20");
      expect(roll).toBeGreaterThanOrEqual(1);
      expect(roll).toBeLessThanOrEqual(20);
      expect(Number.isInteger(roll)).toBe(true);
      faces.add(roll);
    }
    expect(faces.size).toBe(20);
  });

  test("identical seeds replay identical d20 sequences", () => {
    const a = new Rng(987654321);
    const b = new Rng(987654321);
    for (let i = 0; i < 1000; i++) {
      expect(a.d20("a")).toBe(b.d20("b"));
    }
  });
});

describe("Rng draw log", () => {
  test("log records indices, tags, sides and values in order", () => {
    const rng = new Rng(77);
    const rolls = [rng.d20("attack"), rng.die(6, "damage"), rng.float("raw")];
    expect(rng.log.length).toBe(3);
    rng.log.forEach((entry, i) => {
      expect(entry.index).toBe(i);
    });
    expect(rng.log[0]).toMatchObject({ tag: "attack", sides: 20, value: rolls[0] });
    expect(rng.log[1]).toMatchObject({ tag: "damage", sides: 6, value: rolls[1] });
    expect(rng.log[2]).toMatchObject({ tag: "raw", sides: null, value: rolls[2] });
    expect(rng.drawCount).toBe(3);
  });

  test("log is a ring buffer capped at 1000 entries", () => {
    const rng = new Rng(5);
    for (let i = 0; i < 1200; i++) rng.die(4, "spam");
    expect(rng.log.length).toBe(1000);
    expect(rng.log[0].index).toBe(200);
    expect(rng.drawCount).toBe(1200);
  });
});

describe("Rng cursor save/restore", () => {
  test("a restored cursor continues the exact sequence", () => {
    const original = new Rng(0x5eed);
    // burn 100 draws, then snapshot
    for (let i = 0; i < 100; i++) original.d20("warmup");
    const cursor = original.getCursor();

    const restored = Rng.fromState(cursor);
    for (let i = 0; i < 500; i++) {
      expect(original.d20("orig")).toBe(restored.d20("copy"));
    }
  });

  test("cursor round-trips through JSON like a save file would", () => {
    const original = new Rng(0xfeed);
    for (let i = 0; i < 50; i++) original.die(8, "warm");
    const viaJson = JSON.parse(JSON.stringify(original.getCursor()));
    const restored = Rng.fromState(viaJson);
    for (let i = 0; i < 200; i++) {
      expect(original.float()).toBe(restored.float());
    }
  });
});

describe("Rng dice expressions & utilities", () => {
  const expr: DiceExpr = { count: 3, sides: 6, plus: 2 };

  test("roll() stays within [min, max] and is deterministic", () => {
    const a = new Rng(31337);
    const b = new Rng(31337);
    for (let i = 0; i < 1000; i++) {
      const roll = a.roll(expr, "test.roll");
      expect(roll).toBeGreaterThanOrEqual(5);
      expect(roll).toBeLessThanOrEqual(20);
      expect(roll).toBe(b.roll(expr, "test.roll"));
    }
  });

  test("roll() equals the sum of its logged dice plus the modifier", () => {
    const rng = new Rng(24);
    const total = rng.roll(expr, "sum.check");
    const dice = rng.log.slice(-3).map((entry) => entry.value);
    expect(total).toBe(dice[0] + dice[1] + dice[2] + 2);
  });

  test("int() is inclusive on both ends over many draws", () => {
    const rng = new Rng(99);
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i++) {
      const v = rng.int(2, 5);
      expect(v).toBeGreaterThanOrEqual(2);
      expect(v).toBeLessThanOrEqual(5);
      seen.add(v);
    }
    expect(seen.size).toBe(4);
  });

  test("pick() is deterministic and covers the array", () => {
    const items = ["goblin", "wolf", "klarg", "yeemik"] as const;
    const a = new Rng(606);
    const b = new Rng(606);
    const seen = new Set<string>();
    for (let i = 0; i < 400; i++) {
      const pickA = a.pick(items);
      expect(pickA).toBe(b.pick(items));
      seen.add(pickA);
    }
    expect(seen.size).toBe(items.length);
  });

  test("chance(0) never fires and chance(1) always fires", () => {
    const rng = new Rng(11);
    let never = true;
    let always = false;
    for (let i = 0; i < 1000; i++) {
      never = never && !rng.chance(0);
      always = always || rng.chance(1);
    }
    expect(never).toBe(true);
    expect(always).toBe(true);
  });

  test("invalid arguments throw", () => {
    const rng = new Rng(1);
    expect(() => rng.die(0)).toThrow();
    expect(() => rng.die(2.5)).toThrow();
    expect(() => rng.int(5, 2)).toThrow();
    expect(() => rng.pick([])).toThrow();
  });

  test("randomSeed returns a uint32", () => {
    for (let i = 0; i < 100; i++) {
      const seed = randomSeed();
      expect(Number.isInteger(seed)).toBe(true);
      expect(seed).toBeGreaterThanOrEqual(0);
      expect(seed).toBeLessThanOrEqual(0xffffffff);
    }
  });
});
