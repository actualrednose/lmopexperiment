"use client";

/**
 * The battle screen (GDD §8.2): full-screen tactical mode — grid with tokens,
 * initiative rail down the left edge, action bar at the bottom, target card
 * and collapsible combat log on the right, dice popups and damage floaters
 * at the point of action.
 *
 * The enemy driver walks AI turns one command at a time (~650 ms beats so
 * the player can follow), pausing whenever a hero has a pending reaction.
 */

import { ActionBar } from "@/components/battle/action-bar";
import { BattleGrid, type TargetingMode } from "@/components/battle/battle-grid";
import { CombatLog } from "@/components/battle/combat-log";
import { DicePopup } from "@/components/battle/dice-popup";
import { InitiativeRail } from "@/components/battle/initiative-rail";
import { TargetCard } from "@/components/battle/target-card";
import { getArena } from "@/content/arenas";
import { chooseEnemyCommand } from "@/game/combat/ai";
import { heroLegality, mistyStepDestinations, reachableTiles } from "@/game/combat/actions";
import type { BattleCommand } from "@/game/combat/actions";
import { useGameStore } from "@/state/store";
import type { Point } from "@/game/grid";
import { Copy, DoorOpen, Swords } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export function BattleScreen() {
  const battle = useGameStore((s) => s.battle);
  const battleCommand = useGameStore((s) => s.battleCommand);
  const exitBattle = useGameStore((s) => s.exitBattle);
  const startArenaBattle = useGameStore((s) => s.startArenaBattle);
  const setView = useUiSetView();

  const [mode, setMode] = useState<TargetingMode>({ kind: "none" });
  const [pendingTargets, setPendingTargets] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const arena = battle ? getArena(battle.arenaId) : null;

  const legality = useMemo(() => (battle ? heroLegality(battle) : null), [battle]);
  const reachable = useMemo(
    () => (battle && mode.kind === "move" ? reachableTiles(battle) : new Map<string, { path: Point[]; cost: number }>()),
    [battle, mode.kind]
  );
  const mistyDests = useMemo(
    () =>
      battle && mode.kind === "spell-dest" && mode.spellName === "Misty Step"
        ? mistyStepDestinations(battle).map((p) => `${p.x},${p.y}`)
        : [],
    [battle, mode]
  );

  // Reset transient selection when the active combatant changes — the
  // render-time adjustment pattern (state derived from a changing prop key).
  const activeKey = battle ? `${battle.round}:${battle.order[battle.activeIndex]}` : "";
  const [resetKey, setResetKey] = useState(activeKey);
  if (resetKey !== activeKey) {
    setResetKey(activeKey);
    setMode({ kind: "none" });
    setPendingTargets([]);
  }

  /* ── Enemy turn driver ── */
  const actor = battle
    ? battle.combatants[battle.order[battle.activeIndex]]
    : null;
  const enemyDriving =
    battle?.status === "active" &&
    actor?.side === "enemy" &&
    battle.pendingReactions.length === 0;

  useEffect(() => {
    if (!enemyDriving || !battle) return;
    const timer = setTimeout(() => {
      const current = useGameStore.getState().battle;
      if (!current || current.status !== "active") return;
      const cmd = chooseEnemyCommand(current);
      battleCommand(cmd ?? { type: "endTurn" });
    }, 650);
    return () => clearTimeout(timer);
  }, [enemyDriving, battle, battleCommand]);

  if (!battle || !arena) return null;

  const dispatch = (cmd: BattleCommand) => {
    battleCommand(cmd);
  };

  const onTokenClick = (id: string) => {
    if (mode.kind === "attack") {
      if (mode.targetIds.includes(id)) {
        dispatch({ type: "attack", attackIndex: mode.attackIndex, targetId: id });
        setMode({ kind: "none" });
      }
      return;
    }
    if (mode.kind === "spell") {
      if (!mode.targetIds.includes(id)) return;
      if (mode.maxTargets === 1) {
        dispatch({ type: "cast", spellName: mode.spellName, targetIds: [id] });
        setMode({ kind: "none" });
      } else {
        setPendingTargets((prev) =>
          prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id].slice(0, mode.maxTargets)
        );
      }
      return;
    }
    if (mode.kind === "help" && mode.targetIds.includes(id)) {
      dispatch({ type: "help", targetId: id });
      setMode({ kind: "none" });
      return;
    }
    if (mode.kind === "item" && mode.targetIds.includes(id)) {
      dispatch({ type: "item", targetId: id });
      setMode({ kind: "none" });
      return;
    }
    setSelectedId(id);
  };

  const onTileClick = (p: Point) => {
    if (mode.kind === "move") {
      dispatch({ type: "move", to: p });
      setMode({ kind: "none" });
    } else if (mode.kind === "spell-dest" && mode.spellName === "Misty Step") {
      dispatch({ type: "cast", spellName: "Misty Step", to: p });
      setMode({ kind: "none" });
    }
  };

  const pending = battle.pendingReactions[0] ?? null;
  const selectedCombatant = selectedId ? battle.combatants[selectedId] : null;
  const s = battle.stats;
  const outcome =
    battle.status === "victory" || battle.status === "defeat" ? battle.status : null;

  return (
    <div className="game-root flex min-h-screen flex-col bg-slate-deep">
      {/* ── Header ── */}
      <header className="flex items-center gap-3 border-b border-slate-line bg-slate-panel/60 px-3 py-2">
        <button
          type="button"
          onClick={() => {
            exitBattle();
            setView("arena");
          }}
          className="flex items-center gap-1.5 rounded-md border border-slate-line bg-slate-panel px-2.5 py-1.5 text-[11px] font-semibold tracking-wide text-mist uppercase transition-colors hover:bg-slate-raised"
        >
          <DoorOpen className="h-3.5 w-3.5" aria-hidden="true" />
          Arena
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-sm font-bold text-parchment">
            {arena.title}
          </h1>
          <p className="hidden truncate text-[11px] text-mist-dim sm:block">
            {arena.subtitle}
          </p>
        </div>
        <span className="ga-tnum rounded-md border border-ember/40 bg-ember/10 px-2 py-1 text-[11px] font-bold text-ember-bright">
          Round {battle.round}
        </span>
        <button
          type="button"
          title="Copy seed & battle state to the clipboard (QA)"
          onClick={() => {
            const payload = JSON.stringify(
              { seed: battle.rng.seed, arena: battle.arenaId, level: battle.partyLevel },
              null,
              2
            );
            navigator.clipboard?.writeText(payload).catch(() => undefined);
          }}
          className="rounded-md border border-slate-line bg-slate-panel p-1.5 text-mist-dim transition-colors hover:text-mist"
          aria-label="Copy battle seed to clipboard"
        >
          <Copy className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </header>

      {/* ── Main tactical area ── */}
      <div className="flex flex-1 gap-2.5 overflow-hidden p-2.5">
        <InitiativeRail battle={battle} />

        <div className="ga-scroll relative flex min-w-0 flex-1 items-center justify-center overflow-auto rounded-lg border border-slate-line bg-slate-deep/80 p-3">
          <BattleGrid
            battle={battle}
            mode={
              mode.kind === "spell-dest"
                ? { ...mode, dests: mistyDests }
                : mode
            }
            reachable={new Set(reachable.keys())}
            pendingTargets={pendingTargets}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onTileClick={onTileClick}
            onTokenClick={onTokenClick}
          />
          <DicePopup battle={battle} />
        </div>

        {/* Right rail: target card + log */}
        <div className="hidden w-64 shrink-0 flex-col gap-2.5 lg:flex xl:w-72">
          <TargetCard battle={battle} combatant={selectedCombatant ?? actor} />
          <div className="min-h-0 flex-1">
            <CombatLog battle={battle} />
          </div>
        </div>
      </div>

      {/* Mobile log strip */}
      <div className="px-2.5 pb-1.5 lg:hidden">
        <details className="ga-panel rounded-lg border border-slate-line">
          <summary className="cursor-pointer px-3 py-2 text-[11px] font-bold tracking-[0.18em] text-mist-dim uppercase">
            Combat log ({battle.log.length})
          </summary>
          <div className="ga-scroll max-h-36 overflow-y-auto px-3 pb-2">
            <ol className="space-y-1.5">
              {battle.log.slice(-40).map((entry, i) => (
                <li key={i} className="text-[11px] leading-snug text-mist-dim">
                  <span className="font-semibold text-mist">{entry.actor}</span> {entry.text}
                </li>
              ))}
            </ol>
          </div>
        </details>
      </div>

      {/* ── Action bar ── */}
      <div className="px-2.5 pb-2.5">
        <ActionBar
          battle={battle}
          legality={legality}
          mode={mode}
          setMode={setMode}
          pendingTargets={pendingTargets}
          setPendingTargets={setPendingTargets}
          onDispatchAttack={(attackIndex, targetId) =>
            dispatch({ type: "attack", attackIndex, targetId })
          }
          onDispatchSpell={(spellName, targetIds, to) =>
            dispatch({ type: "cast", spellName, targetIds, to })
          }
          onCommand={dispatch}
        />
      </div>

      {/* ── Pending reaction prompt ── */}
      {pending && battle.status === "active" && (
        <div className="fixed inset-x-0 bottom-24 z-40 flex justify-center px-4">
          <div className="ga-panel flex flex-wrap items-center gap-3 rounded-xl border border-ember/50 px-4 py-3 shadow-[0_12px_40px_rgba(10,14,20,0.7)]">
            <Swords className="h-5 w-5 shrink-0 text-ember" aria-hidden="true" />
            <p className="text-sm text-mist">
              <span className="font-bold text-parchment">
                {battle.combatants[pending.attackerId]?.name}
              </span>{" "}
              — {battle.combatants[pending.moverId]?.name} breaks away. Strike as it goes?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded-md border border-ember bg-ember px-3 py-1.5 text-xs font-bold tracking-wide text-slate-deep uppercase transition-colors hover:bg-ember-bright"
                onClick={() => dispatch({ type: "opportunity", accept: true })}
              >
                Strike (reaction)
              </button>
              <button
                type="button"
                className="rounded-md border border-slate-line bg-slate-panel px-3 py-1.5 text-xs font-bold tracking-wide text-mist uppercase transition-colors hover:bg-slate-raised"
                onClick={() => dispatch({ type: "opportunity", accept: false })}
              >
                Let it go
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Outcome overlay ── */}
      {outcome && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-deep/85 p-4 backdrop-blur-sm">
          <div className="ga-parchment w-full max-w-md rounded-2xl border-4 border-ember/50 p-6 text-ink shadow-[0_24px_80px_rgba(10,14,20,0.8)]">
            <p className="text-center font-display text-[11px] font-bold tracking-[0.3em] text-ink-soft uppercase">
              {outcome === "victory" ? "The road is cleared" : "Total party kill"}
            </p>
            <h2 className="mt-1 text-center font-display text-3xl font-extrabold tracking-wide">
              {outcome === "victory" ? "Victory" : "Defeat"}
            </h2>
            <p className="mt-2 text-center font-prose text-sm text-ink-soft italic">
              {outcome === "victory"
                ? "The party steadies its breathing. Downed heroes rise at 1 HP."
                : "The goblins drag the wagon into the trees. Another seed, another run."}
            </p>

            <dl className="ga-tnum mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
              <dt className="text-ink-soft">Rounds fought</dt>
              <dd className="text-right font-bold">{s.roundsFought}</dd>
              <dt className="text-ink-soft">Party damage taken</dt>
              <dd className="text-right font-bold">{s.partyDamageTaken}</dd>
              <dt className="text-ink-soft">Party healing</dt>
              <dd className="text-right font-bold">{s.partyHealing}</dd>
              <dt className="text-ink-soft">Potions used</dt>
              <dd className="text-right font-bold">{s.potionsUsed}</dd>
              <dt className="text-ink-soft">Party attacks</dt>
              <dd className="text-right font-bold">
                {s.partyHits}/{s.partyAttacks}
                {s.partyAttacks > 0
                  ? ` (${Math.round((s.partyHits / s.partyAttacks) * 100)}%)`
                  : ""}
              </dd>
              <dt className="text-ink-soft">Enemy attacks</dt>
              <dd className="text-right font-bold">
                {s.enemyHits}/{s.enemyAttacks}
                {s.enemyAttacks > 0
                  ? ` (${Math.round((s.enemyHits / s.enemyAttacks) * 100)}%)`
                  : ""}
              </dd>
              <dt className="text-ink-soft">Enemies slept</dt>
              <dd className="text-right font-bold">{s.sleptEnemies}</dd>
            </dl>

            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                className="w-full rounded-md bg-ember px-4 py-2.5 font-display text-sm font-bold tracking-[0.18em] text-slate-deep uppercase transition-colors hover:bg-ember-bright"
                onClick={() => {
                  startArenaBattle(battle.arenaId, battle.partyLevel, battle.rng.seed);
                  setSelectedId(null);
                }}
              >
                Rematch — same seed
              </button>
              <button
                type="button"
                className="w-full rounded-md border-2 border-ink/25 px-4 py-2.5 font-display text-sm font-bold tracking-[0.18em] text-ink uppercase transition-colors hover:bg-ink/5"
                onClick={() => {
                  const seed = Math.floor(Math.random() * 4294967296);
                  startArenaBattle(battle.arenaId, battle.partyLevel, seed);
                  setSelectedId(null);
                }}
              >
                Rematch — new seed
              </button>
              <button
                type="button"
                className="w-full rounded-md border-2 border-ink/25 px-4 py-2 font-display text-xs font-bold tracking-[0.18em] text-ink-soft uppercase transition-colors hover:bg-ink/5"
                onClick={() => {
                  exitBattle();
                  setView("arena");
                }}
              >
                Back to the arena
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* Tiny helper to avoid importing the ui-store twice in this file. */
import { useUiStore } from "@/state/ui-store";
function useUiSetView() {
  return useUiStore((s) => s.setView);
}
