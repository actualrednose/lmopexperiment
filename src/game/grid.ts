/**
 * The battle grid (GDD §10.2): 5-foot squares, occupancy, movement costs,
 * reach, line of sight and cover flags on marked tiles.
 *
 * Session 2 rulings, shipped as-is per the §10.2 risk note:
 * - Diagonal movement costs the same as orthogonal movement (free diagonals).
 * - Cover is a flat +2 AC vs ranged attacks: a defender on a cover tile
 *   (thicket) or adjacent to a cover object (wagon, dead horses) is covered.
 * - Distance is Chebyshev distance × 5 ft, consistent with free diagonals.
 * - A weapon's long range band is a hard cap (the advantage whitelist of
 *   GDD §4.1 has no long-range entry, so no long-range disadvantage).
 */

import type { BattleState, Combatant, EnemyId } from "./types";

/* ══════════════════════════ Arena definitions ══════════════════════════ */

/** Terrain tiles from the GDD §8.3 art grammar; Session 2 arenas use the first four. */
export type TerrainKind =
  | "grass"
  | "road"
  | "thicket" // light cover
  | "clearing"
  | "stream"
  | "rock"
  | "chasm"
  | "bridge"
  | "firepit"
  | "ledge";

export const TERRAIN_COLORS: Record<TerrainKind, { fill: string; edge: string }> = {
  grass: { fill: "#3A4A38", edge: "#46584200" },
  road: { fill: "#4A4238", edge: "#574E4200" },
  thicket: { fill: "#2C3A2C", edge: "#3E523800" },
  clearing: { fill: "#43503C", edge: "#4F5D4600" },
  stream: { fill: "#33505C", edge: "#3E5F6C00" },
  rock: { fill: "#4E4A44", edge: "#5C585000" },
  chasm: { fill: "#1B2330", edge: "#232E3F00" },
  bridge: { fill: "#5A4634", edge: "#6B554000" },
  firepit: { fill: "#4A3A32", edge: "#5C463800" },
  ledge: { fill: "#4E4A44", edge: "#5C585000" },
};

/** A solid battlefield object that blocks movement and grants adjacent cover. */
export interface ArenaObject {
  kind: "wagon" | "horse" | "rock" | "dam" | "bridge-post";
  label: string;
  tiles: { x: number; y: number }[];
  /** Objects never block line of sight in Session 2 (cover, not concealment). */
  blocksLos: false;
}

export interface EnemySpawn {
  ref: EnemyId;
  x: number;
  y: number;
  label: string;
}

export interface ArenaDef {
  id: string;
  title: string;
  subtitle: string;
  /** Map rows, one character per tile. Legend: G grass, R road, T thicket, C clearing. */
  map: string[];
  objects: ArenaObject[];
  /** Party spawn squares, in marching order (Torvald, Perrin, Maera, Elyndra). */
  partySpawns: { x: number; y: number }[];
  enemySpawns: EnemySpawn[];
  /** Present when the encounter opens with an ambush Stealth contest (GDD §5.2). */
  ambush?: {
    /** The ambushing side's Stealth bonus (goblins: +6). */
    stealthBonus: number;
  };
  /** Debug potions granted for the fight (GDD §4.5 healing budget). */
  potions: number;
}

/* ══════════════════════════ Geometry ══════════════════════════ */

export interface Point {
  x: number;
  y: number;
}

export const chebyshev = (a: Point, b: Point): number =>
  Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));

/** Grid distance in feet (5 ft per square, diagonals included). */
export const distanceFeet = (a: Point, b: Point): number => chebyshev(a, b) * 5;

export function isAdjacent(a: Point, b: Point): boolean {
  return chebyshev(a, b) <= 1;
}

/* ══════════════════════════ Arena lookups ══════════════════════════ */

export function arenaWidth(arena: ArenaDef): number {
  return arena.map[0]?.length ?? 0;
}

export function arenaHeight(arena: ArenaDef): number {
  return arena.map.length;
}

export function inBounds(arena: ArenaDef, p: Point): boolean {
  return p.x >= 0 && p.y >= 0 && p.y < arena.map.length && p.x < (arena.map[0]?.length ?? 0);
}

const TERRAIN_LEGEND: Record<string, TerrainKind> = {
  G: "grass",
  R: "road",
  T: "thicket",
  C: "clearing",
};

export function terrainAt(arena: ArenaDef, p: Point): TerrainKind {
  if (!inBounds(arena, p)) return "grass";
  return TERRAIN_LEGEND[arena.map[p.y][p.x]] ?? "grass";
}

export function isCoverTerrain(arena: ArenaDef, p: Point): boolean {
  return terrainAt(arena, p) === "thicket";
}

export function objectAt(arena: ArenaDef, p: Point): ArenaObject | null {
  return (
    arena.objects.find((obj) => obj.tiles.some((t) => t.x === p.x && t.y === p.y)) ?? null
  );
}

export function isObjectTile(arena: ArenaDef, p: Point): boolean {
  return objectAt(arena, p) !== null;
}

/**
 * Flat cover ruling (§10.2): +2 AC against ranged attacks while the defender
 * stands on a cover tile (thicket) or adjacent to a cover object.
 */
export function hasCoverVsRanged(arena: ArenaDef, p: Point): boolean {
  if (isCoverTerrain(arena, p)) return true;
  return arena.objects.some((obj) =>
    obj.tiles.some((t) => chebyshev(t, p) <= 1)
  );
}

/**
 * Line of sight between two squares (Bresenham). Session 2 objects never
 * block sight, so this only guards future blocking terrain; it exists so
 * the arena engine has the seam from day one.
 */
export function hasLineOfSight(arena: ArenaDef, a: Point, b: Point): boolean {
  let x0 = a.x;
  let y0 = a.y;
  const x1 = b.x;
  const y1 = b.y;
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  // Only objects with blocksLos would interrupt; none exist in Session 2.
  while (!(x0 === x1 && y0 === y1)) {
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x0 += sx;
    }
    if (e2 < dx) {
      err += dx;
      y0 += sy;
    }
    if (x0 === x1 && y0 === y1) break;
    if (objectBlocksLos(arena, { x: x0, y: y0 })) return false;
  }
  return true;
}

function objectBlocksLos(_arena: ArenaDef, _p: Point): boolean {
  return false; // no sight-blocking objects in Session 2 arenas
}

/* ══════════════════════════ Occupancy & pathing ══════════════════════════ */

/** Living, on-grid combatants keyed by "x,y" for quick occupancy checks. */
export function occupancy(battle: BattleState): Map<string, Combatant> {
  const map = new Map<string, Combatant>();
  for (const c of Object.values(battle.combatants)) {
    if (c.fled || !c.position) continue;
    map.set(`${c.position.x},${c.position.y}`, c);
  }
  return map;
}

export function combatantAt(battle: BattleState, p: Point): Combatant | null {
  return occupancy(battle).get(`${p.x},${p.y}`) ?? null;
}

export function isDown(c: Combatant): boolean {
  return c.hp <= 0;
}

/**
 * A square can be stood upon: in bounds, no object, no body — living OR Down.
 * (Bodies may be moved through — `passableFor` — but never finished on, so
 * tokens never stack on the fallen.)
 */
export function isFree(arena: ArenaDef, battle: BattleState, p: Point): boolean {
  if (!inBounds(arena, p) || isObjectTile(arena, p)) return false;
  return combatantAt(battle, p) === null;
}

/**
 * Passability for pathing: objects and living hostiles block; living allies
 * may be moved through but not finished on (checked by the caller).
 */
function passableFor(arena: ArenaDef, battle: BattleState, mover: Combatant, p: Point): boolean {
  if (!inBounds(arena, p) || isObjectTile(arena, p)) return false;
  const other = combatantAt(battle, p);
  if (other && other.id !== mover.id && other.side !== mover.side && !isDown(other)) {
    return false; // hostile body blocks
  }
  return true;
}

export interface PathResult {
  path: Point[]; // excludes the start square, includes the destination
  cost: number; // squares; one per step, diagonals free
}

/**
 * Breadth-first path over the 8-square neighborhood (Dijkstra degenerate:
 * every step costs 1). Returns null when no path exists within maxSquares.
 */
export function findPath(
  arena: ArenaDef,
  battle: BattleState,
  mover: Combatant,
  to: Point,
  maxSquares = Infinity
): PathResult | null {
  const from = mover.position;
  if (!from) return null;
  if (!isFree(arena, battle, to)) return null;
  const key = (p: Point) => `${p.x},${p.y}`;
  if (key(from) === key(to)) return { path: [], cost: 0 };

  const frontier: Point[] = [from];
  const cameFrom = new Map<string, string | null>([[key(from), null]]);
  const costSoFar = new Map<string, number>([[key(from), 0]]);

  while (frontier.length > 0) {
    // BFS with uniform cost: shift is fine
    const current = frontier.shift()!;
    if (key(current) === key(to)) break;
    const step = (costSoFar.get(key(current)) ?? 0) + 1;
    if (step > maxSquares) continue;
    for (const n of neighbors(current)) {
      if (cameFrom.has(key(n))) continue;
      if (!passableFor(arena, battle, mover, n)) continue;
      // The destination must be free (no ally body either); intermediate
      // squares may contain allies (pass-through) but not hostiles.
      if (key(n) !== key(to) && combatantAt(battle, n) !== null) continue;
      cameFrom.set(key(n), key(current));
      costSoFar.set(key(n), step);
      frontier.push(n);
    }
  }

  if (!cameFrom.has(key(to))) return null;
  const path: Point[] = [];
  let cursor: string | null = key(to);
  while (cursor !== null && cursor !== key(from)) {
    const [x, y] = cursor.split(",").map(Number);
    path.unshift({ x, y });
    cursor = cameFrom.get(cursor) ?? null;
  }
  return { path, cost: costSoFar.get(key(to)) ?? path.length };
}

/** The 8-square neighborhood (free diagonals). */
export function neighbors(p: Point): Point[] {
  const out: Point[] = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      out.push({ x: p.x + dx, y: p.y + dy });
    }
  }
  return out;
}

/**
 * Opportunity-attack triggers along a path (GDD §4.2): each hostile whose
 * reach the mover leaves (adjacent → not adjacent) may react once per round.
 * `from` is the mover's origin square — pass it explicitly; the mover's
 * current position may already be the destination when this runs.
 */
export function pathProvocations(
  battle: BattleState,
  mover: Combatant,
  path: Point[],
  from: Point
): Combatant[] {
  const out: Combatant[] = [];
  const seen = new Set<string>();
  let prev = from;
  for (const step of path) {
    for (const c of Object.values(battle.combatants)) {
      if (c.side === mover.side || isDown(c) || c.fled) continue;
      if (!c.position) continue;
      const wasAdjacent = chebyshev(prev, c.position) <= 1;
      const isAdjacentNow = chebyshev(step, c.position) <= 1;
      if (wasAdjacent && !isAdjacentNow && !seen.has(c.id)) {
        seen.add(c.id);
        out.push(c);
      }
    }
    prev = step;
  }
  return out;
}

/** Reach of a weapon attack in feet, or null for a pure ranged weapon. */
export function attackReachFeet(atk: { reach?: number; range?: [number, number] }): {
  minFt: number;
  maxFt: number;
  melee: boolean;
} {
  if (atk.reach !== undefined) {
    return { minFt: 0, maxFt: atk.reach, melee: true };
  }
  if (atk.range !== undefined) {
    return { minFt: 0, maxFt: atk.range[1], melee: false };
  }
  return { minFt: 0, maxFt: 5, melee: true };
}
