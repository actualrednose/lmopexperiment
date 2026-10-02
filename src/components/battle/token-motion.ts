/**
 * Token motion (animation pass): log-derived hooks that turn battle-log
 * entries into movement and attack choreography — the walk stepper, the
 * strike role matcher and a keyed-flag helper for one-shot class swaps.
 * Nothing here touches game state; every effect is presentational and
 * collapses instantly under the reduced-motion toggle (globals.css).
 */

import { useEffect, useRef, useState } from "react";
import type { BattleLogEntry, Point } from "@/game/types";

/** The locked hop beat: one square per 200 ms (GDD §8.4). */
export const STEP_MS = 200;

/* ════════════════════════ Strike matching ════════════════════════ */

export interface StrikeRole {
  /** Log index of the strike entry — used as the animation key. */
  index: number;
  role: "attacker" | "target";
  attackerId: string;
  targetId: string;
  melee: boolean;
  hit: boolean;
  crit: boolean;
  flavor?: "arrow" | "fire" | "radiant" | "dart";
}

/**
 * The newest strike (last `window` log entries) this combatant takes part
 * in — as attacker (lunge/recoil) or target (shake/dodge). Returns null
 * when the combatant is not involved; callers key the motion wrapper by
 * `index` so each new strike replays its animation exactly once.
 */
export function strikeRoleFor(
  log: BattleLogEntry[],
  combatantId: string,
  window = 8
): StrikeRole | null {
  for (let i = log.length - 1; i >= Math.max(0, log.length - window); i--) {
    const s = log[i].strike;
    if (!s) continue;
    if (s.attackerId === combatantId)
      return { index: i, role: "attacker", attackerId: s.attackerId, targetId: s.targetId, melee: s.melee, hit: s.hit, crit: s.crit, flavor: s.flavor };
    if (s.targetId === combatantId)
      return { index: i, role: "target", attackerId: s.attackerId, targetId: s.targetId, melee: s.melee, hit: s.hit, crit: s.crit, flavor: s.flavor };
  }
  return null;
}

/** The newest strike in the window, for the projectile/impact layer. */
export function latestStrike(
  log: BattleLogEntry[],
  window = 8
): { index: number; attackerId: string; targetId: string; melee: boolean; hit: boolean; crit: boolean; flavor?: string } | null {
  for (let i = log.length - 1; i >= Math.max(0, log.length - window); i--) {
    const s = log[i].strike;
    if (s) return { index: i, ...s };
  }
  return null;
}

/* ════════════════════════ Path-following walk ════════════════════════ */

interface WalkSeq {
  key: number;
  from: Point;
  path: Point[];
}

/**
 * Walks a combatant along its latest move path, square by square at the
 * locked 200 ms beat. `pos` is the tile the token should render at (the
 * next waypoint while walking, the kernel position otherwise); `walking`
 * gates the CSS transition so non-walk position changes (teleports,
 * battle setup) land instantly instead of sliding.
 */
export function useWalkPosition(
  log: BattleLogEntry[],
  name: string,
  finalPos: Point | null
): { pos: Point | null; walking: boolean } {
  const seenRef = useRef<number>(-1);
  const [seq, setSeq] = useState<WalkSeq | null>(null);
  const [step, setStep] = useState(0);

  useEffect(() => {
    // Mount: every entry already in the log counts as seen — a token
    // never replays old motion when (re)appearing.
    if (seenRef.current === -1) {
      seenRef.current = log.length - 1;
      return;
    }
    // Scan the unseen slice for this actor's newest move.
    let found: WalkSeq | null = null;
    for (let i = log.length - 1; i >= seenRef.current + 1; i--) {
      const e = log[i];
      if (e.move && e.actor === name) {
        found = { key: i, from: e.move.from, path: e.move.path };
        break;
      }
    }
    seenRef.current = log.length - 1;
    if (!found) return;
    // Start on the next tick — the first frame already renders at `from`,
    // so the 0 ms defer is invisible and the effect body stays lint-clean.
    const start = setTimeout(() => {
      setSeq(found);
      setStep(0);
    }, 0);
    return () => clearTimeout(start);
  }, [log, name]);

  // Advance one waypoint per beat; clear the sequence one beat after the
  // last step so the token settles on its kernel position.
  useEffect(() => {
    if (!seq) return;
    const t = setTimeout(() => {
      setStep((s) => {
        if (s >= seq.path.length) {
          setSeq(null);
          return s;
        }
        return s + 1;
      });
    }, STEP_MS);
    return () => clearTimeout(t);
  }, [seq, step]);

  if (!seq) return { pos: finalPos, walking: false };
  const pos = step === 0 ? seq.from : seq.path[Math.min(step, seq.path.length) - 1];
  return { pos: pos ?? finalPos, walking: step <= seq.path.length };
}

/* ════════════════════════ One-shot class restart ════════════════════════ */

/**
 * Restarts a CSS animation class on `ref.current` whenever `key` changes
 * (null key = never). Uses the remove / reflow / re-add dance — imperative
 * DOM, no state, so the shaken element (the battle grid) never remounts
 * and ongoing token walks are untouched. The class is removed again after
 * `durationMs` so the next key can restart it.
 */
export function useKeyedClass(
  ref: React.RefObject<HTMLElement | null>,
  key: number | null,
  className: string,
  durationMs: number,
  delayMs = 0
): void {
  const lastRef = useRef<number | null>(null);

  useEffect(() => {
    if (key == null || key === lastRef.current) return;
    lastRef.current = key;
    const el = ref.current;
    if (!el) return;
    el.classList.remove(className);
    void el.offsetWidth; // force reflow — the canonical animation restart
    el.style.animationDelay = delayMs > 0 ? `${delayMs}ms` : "";
    el.classList.add(className);
    const t = setTimeout(() => {
      el.classList.remove(className);
      el.style.animationDelay = "";
    }, durationMs);
    return () => clearTimeout(t);
  }, [ref, key, className, durationMs, delayMs]);
}
