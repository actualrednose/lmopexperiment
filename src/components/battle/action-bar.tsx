"use client";

/**
 * The bottom action bar (GDD §8.2): Move state plus the action buttons,
 * dimming anything the current hero cannot legally do. Weapon and spell
 * choices open small popovers above the bar; multi-target spells
 * (Magic Missile, Bless) accumulate targets and confirm.
 */

import { formatDice } from "@/game/dice";
import type { BattleCommand, HeroActionLegality } from "@/game/combat/actions";
import type { BattleState, Spell } from "@/game/types";
import {
  ChevronLeft,
  Crosshair,
  FlaskConical,
  Footprints,
  Hand,
  Heart,
  Hourglass,
  Shield,
  Sparkles,
  Swords,
  EyeOff,
  Zap,
  Check,
  X,
  ArrowRight,
} from "lucide-react";
import { useState } from "react";
import type { TargetingMode } from "./battle-grid";

const btn =
  "inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-slate-line bg-slate-panel px-2.5 text-[11px] font-semibold tracking-wide text-mist uppercase transition-[background-color,border-color,color,transform] duration-150 hover:bg-slate-raised active:scale-95 disabled:pointer-events-none disabled:opacity-35 aria-disabled:pointer-events-none aria-disabled:opacity-35";

export interface ActionBarProps {
  battle: BattleState;
  legality: HeroActionLegality | null;
  mode: TargetingMode;
  setMode: (m: TargetingMode) => void;
  pendingTargets: string[];
  setPendingTargets: (ids: string[]) => void;
  onDispatchAttack: (attackIndex: number, targetId: string) => void;
  onDispatchSpell: (
    spellName: string,
    targetIds: string[],
    to?: { x: number; y: number }
  ) => void;
  onCommand: (cmd: BattleCommand) => void;
}

export function ActionBar({
  battle,
  legality,
  mode,
  setMode,
  pendingTargets,
  setPendingTargets,
  onDispatchAttack,
  onDispatchSpell,
  onCommand,
}: ActionBarProps) {
  const [popover, setPopover] = useState<"none" | "attack" | "cast" | "cunning">("none");
  const actor = battle.combatants[battle.order[battle.activeIndex]];
  const heroTurn = legality !== null;

  if (battle.status !== "active") {
    return (
      <div className="ga-panel flex items-center justify-center rounded-lg border border-slate-line px-4 py-3">
        <p className="text-xs font-semibold tracking-[0.2em] text-mist-dim uppercase">
          The battle is over
        </p>
      </div>
    );
  }

  if (!heroTurn) {
    return (
      <div className="ga-panel flex items-center justify-center gap-3 rounded-lg border border-slate-line px-4 py-3">
        <span className="h-2 w-2 animate-pulse rounded-full bg-ember" aria-hidden="true" />
        <p className="text-xs font-semibold tracking-[0.2em] text-mist-dim uppercase">
          {actor ? `${actor.name} acts…` : "…"}
        </p>
      </div>
    );
  }

  const casterSlots =
    actor.maxSpellSlots > 0
      ? `${actor.maxSpellSlots - actor.spellSlotsUsed}/${actor.maxSpellSlots}`
      : null;

  const pickSpell = (spell: Spell) => {
    setPopover("none");
    setPendingTargets([]);
    if (spell.name === "Sleep" || spell.name === "Light" || spell.name === "Mage Hand") {
      onDispatchSpell(spell.name, []);
      setMode({ kind: "none" });
      return;
    }
    if (spell.name === "Mage Armor") {
      onDispatchSpell(spell.name, [actor.id]);
      setMode({ kind: "none" });
      return;
    }
    if (spell.name === "Misty Step") {
      setMode({ kind: "spell-dest", spellName: spell.name, dests: [] });
      return;
    }
    const multi = spell.name === "Magic Missile" || spell.name === "Bless" ? 3 : 1;
    // Carry the legality's target list so the grid highlights real targets.
    const entry = legality.spells.find((s) => s.spell.name === spell.name);
    setMode({
      kind: "spell",
      spellName: spell.name,
      targetIds: entry?.targetIds ?? [],
      maxTargets: multi,
    });
  };

  const confirmMulti = () => {
    if (mode.kind === "spell" && pendingTargets.length > 0) {
      onDispatchSpell(mode.spellName, pendingTargets);
    }
    setPendingTargets([]);
    setMode({ kind: "none" });
  };

  return (
    <div className="ga-panel relative rounded-lg border border-slate-line p-2.5">
      {/* ── Popovers ── */}
      {popover === "attack" && (
        <Popover title="Choose a weapon" onClose={() => setPopover("none")}>
          {legality.attacks.map(({ index, attack, targetIds }) => (
            <button
              key={attack.name}
              type="button"
              disabled={targetIds.length === 0}
              onClick={() => {
                setPopover("none");
                setMode({ kind: "attack", attackIndex: index, targetIds });
              }}
              className="flex w-full items-center justify-between gap-3 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-slate-raised/60 disabled:opacity-35"
            >
              <span>
                <span className="block text-xs font-bold text-parchment">{attack.name}</span>
                <span className="ga-tnum block text-[10px] text-mist-dim">
                  {attack.attackBonus >= 0 ? "+" : ""}
                  {attack.attackBonus} to hit · {formatDice(attack.damage)}{" "}
                  {attack.damageType}
                </span>
              </span>
              <span className="text-[10px] text-mist-dim">
                {targetIds.length} target{targetIds.length === 1 ? "" : "s"}
              </span>
            </button>
          ))}
        </Popover>
      )}

      {popover === "cast" && (
        <Popover title="Cast a spell" onClose={() => setPopover("none")}>
          <div className="mb-1.5 flex items-center justify-between px-1">
            <span className="text-[10px] font-bold tracking-[0.18em] text-mist-dim uppercase">
              Slots
            </span>
            <span className="flex gap-1">
              {casterSlots &&
                Array.from({ length: actor.maxSpellSlots }).map((_, i) => (
                  <span
                    key={i}
                    className={`h-2.5 w-2.5 rounded-full border ${
                      i < actor.maxSpellSlots - actor.spellSlotsUsed
                        ? "border-ember bg-ember"
                        : "border-slate-line bg-transparent"
                    }`}
                  />
                ))}
            </span>
          </div>
          {legality.spells.map(({ spell }) => (
            <button
              key={spell.name}
              type="button"
              onClick={() => pickSpell(spell)}
              className="flex w-full items-start justify-between gap-3 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-slate-raised/60"
            >
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 text-xs font-bold text-parchment">
                  {spell.name}
                  {spell.bonusAction && (
                    <span className="rounded-sm bg-arcane/20 px-1 text-[9px] font-semibold text-arcane uppercase">
                      bonus
                    </span>
                  )}
                </span>
                <span className="block text-[10px] leading-snug text-mist-dim">
                  {spell.effect}
                </span>
              </span>
              <span
                className={`shrink-0 rounded-sm px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                  spell.cost === "cantrip"
                    ? "bg-healing/15 text-healing"
                    : "bg-ember/15 text-ember-bright"
                }`}
              >
                {spell.cost === "cantrip" ? "free" : "slot"}
              </span>
            </button>
          ))}
        </Popover>
      )}

      {popover === "cunning" && (
        <Popover title="Cunning Action" onClose={() => setPopover("none")}>
          {(["dash", "disengage", "hide"] as const).map((kind) => (
            <button
              key={kind}
              type="button"
              onClick={() => {
                setPopover("none");
                onCommand({ type: "cunning", kind });
              }}
              className="flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-xs font-bold text-parchment transition-colors hover:bg-slate-raised/60"
            >
              {kind === "dash" ? "Dash" : kind === "disengage" ? "Disengage" : "Hide"}
              <span className="text-[10px] font-medium text-mist-dim">bonus action</span>
            </button>
          ))}
        </Popover>
      )}

      {/* ── Row 1: actions ── */}
      <div className="ga-scroll flex items-center gap-1.5 overflow-x-auto pb-0.5">
        <button
          type="button"
          className={`${btn} ${mode.kind === "move" ? "!border-ember !bg-ember/15 !text-ember-bright" : ""}`}
          disabled={!legality.canMove}
          onClick={() => setMode(mode.kind === "move" ? { kind: "none" } : { kind: "move" })}
        >
          <Footprints className="h-3.5 w-3.5" aria-hidden="true" />
          Move
          <span className="ga-tnum text-[10px] text-ember-bright">{legality.moveBudgetFeet}ft</span>
        </button>
        <button
          type="button"
          className={`${btn} ${mode.kind === "attack" ? "!border-ember !bg-ember/15 !text-ember-bright" : ""}`}
          disabled={!legality.canAttack}
          onClick={() => setPopover(popover === "attack" ? "none" : "attack")}
        >
          <Swords className="h-3.5 w-3.5" aria-hidden="true" />
          Attack
        </button>
        <button
          type="button"
          className={`${btn} ${mode.kind === "spell" || mode.kind === "spell-dest" ? "!border-ember !bg-ember/15 !text-ember-bright" : ""}`}
          disabled={legality.spells.length === 0}
          onClick={() => setPopover(popover === "cast" ? "none" : "cast")}
        >
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          Cast
          {casterSlots && (
            <span className="ga-tnum text-[10px] text-ember-bright">{casterSlots}</span>
          )}
        </button>
        <button type="button" className={btn} disabled={!legality.canDash} onClick={() => onCommand({ type: "dash" })}>
          <Zap className="h-3.5 w-3.5" aria-hidden="true" />
          Dash
        </button>
        <button type="button" className={btn} disabled={!legality.canDisengage} onClick={() => onCommand({ type: "disengage" })}>
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Disengage
        </button>
        <button type="button" className={btn} disabled={!legality.canDodge} onClick={() => onCommand({ type: "dodge" })}>
          <Shield className="h-3.5 w-3.5" aria-hidden="true" />
          Dodge
        </button>
        <button
          type="button"
          className={`${btn} ${mode.kind === "help" ? "!border-ember !bg-ember/15 !text-ember-bright" : ""}`}
          disabled={!legality.canHelp}
          onClick={() =>
            setMode(
              mode.kind === "help"
                ? { kind: "none" }
                : { kind: "help", targetIds: legality.helpTargetIds }
            )
          }
        >
          <Hand className="h-3.5 w-3.5" aria-hidden="true" />
          Help
        </button>
        <button type="button" className={btn} disabled={!legality.canHide} onClick={() => onCommand({ type: "hide" })}>
          <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
          Hide
        </button>
        <button
          type="button"
          className={`${btn} ${mode.kind === "item" ? "!border-ember !bg-ember/15 !text-ember-bright" : ""}`}
          disabled={!legality.canPotion}
          onClick={() =>
            setMode(
              mode.kind === "item"
                ? { kind: "none" }
                : { kind: "item", targetIds: legality.potionTargetIds }
            )
          }
        >
          <FlaskConical className="h-3.5 w-3.5" aria-hidden="true" />
          Item
          <span className="ga-tnum text-[10px] text-ember-bright">×{battle.potions}</span>
        </button>
        {legality.canStand && (
          <button type="button" className={btn} onClick={() => onCommand({ type: "stand" })}>
            <Footprints className="h-3.5 w-3.5" aria-hidden="true" />
            Stand
          </button>
        )}
      </div>

      {/* ── Row 2: bonus actions, confirm, end turn ── */}
      <div className="ga-scroll mt-1.5 flex items-center gap-1.5 overflow-x-auto pt-0.5">
        {legality.canSecondWind && (
          <button type="button" className={btn} onClick={() => onCommand({ type: "secondWind" })}>
            <Heart className="h-3.5 w-3.5" aria-hidden="true" /> Second Wind
          </button>
        )}
        {legality.canActionSurge && (
          <button type="button" className={btn} onClick={() => onCommand({ type: "actionSurge" })}>
            <Zap className="h-3.5 w-3.5" aria-hidden="true" />
            Action Surge
          </button>
        )}
        {legality.cunningOptions.length > 0 && (
          <button
            type="button"
            className={btn}
            onClick={() => setPopover(popover === "cunning" ? "none" : "cunning")}
          >
            <Crosshair className="h-3.5 w-3.5" aria-hidden="true" />
            Cunning
          </button>
        )}

        {/* multi-target confirm */}
        {mode.kind === "spell" && mode.maxTargets > 1 && (
          <>
            <span className="flex shrink-0 items-center gap-1.5 text-[11px] text-mist-dim">
              <Hourglass className="h-3.5 w-3.5" aria-hidden="true" />
              Select up to {mode.maxTargets} ({pendingTargets.length} chosen)
            </span>
            <button
              type="button"
              className={`${btn} !border-ember !bg-ember/20 !text-ember-bright`}
              disabled={pendingTargets.length === 0}
              onClick={confirmMulti}
            >
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
              Cast
            </button>
          </>
        )}

        <div className="ml-auto flex items-center gap-1.5">
          {mode.kind !== "none" && (
            <button
              type="button"
              className={btn}
              onClick={() => {
                setMode({ kind: "none" });
                setPendingTargets([]);
              }}
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              Cancel
            </button>
          )}
          <button
            type="button"
            className={`${btn} ml-1 !border-ember !bg-ember !text-slate-deep hover:!bg-ember-bright`}
            onClick={() => {
              setMode({ kind: "none" });
              setPendingTargets([]);
              onCommand({ type: "endTurn" });
            }}
          >
            End Turn
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* targeting hint */}
      {(mode.kind === "attack" ||
        mode.kind === "spell" ||
        mode.kind === "help" ||
        mode.kind === "item" ||
        mode.kind === "spell-dest") && (
        <p className="mt-1.5 px-1 text-[11px] text-ember-bright/90 italic">
          {mode.kind === "spell-dest"
            ? "Choose a square within 30 ft."
            : mode.kind === "spell" && mode.maxTargets > 1
              ? "Tap targets to add them, then Cast."
              : "Tap a highlighted token to resolve."}
        </p>
      )}
    </div>
  );
}

function Popover({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      role="dialog"
      aria-label={title}
      className="ga-panel ga-rise-in absolute bottom-full left-2 right-2 z-30 mb-2 rounded-lg border border-slate-line p-2 shadow-[0_10px_36px_rgba(10,14,20,0.65)]"
    >
      <div className="mb-1 flex items-center justify-between px-1">
        <p className="text-[10px] font-bold tracking-[0.18em] text-ember-bright uppercase">
          {title}
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="rounded-sm p-0.5 text-mist-dim transition-colors hover:text-mist"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
      <div className="ga-scroll max-h-56 overflow-y-auto">{children}</div>
    </div>
  );
}
