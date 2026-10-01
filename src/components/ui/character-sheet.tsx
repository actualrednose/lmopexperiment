"use client";

/**
 * The character sheet overlay (GDD Table 13) — a full reference sheet for
 * one hero, rendering every field from the Chapter 3 data: core stats,
 * the six ability scores with modifiers, attacks with dice math, the
 * complete spell list, features & racial traits, skills, and the
 * level-2 milestone unlock.
 */

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { DiceIcon, type DiceSides } from "@/components/ui/dice-icon";
import { HeroToken } from "@/components/ui/hero-token";
import { getHeroSheet, PARTY } from "@/content/party";
import { abilityModifier, formatBonus, formatDice } from "@/game/dice";
import type { AbilityKey, Attack, DamageType, DiceExpr, Spell } from "@/game/types";
import { useUiStore } from "@/state/ui-store";
import { cn } from "@/lib/utils";

const ABILITY_KEYS: readonly AbilityKey[] = ["STR", "DEX", "CON", "INT", "WIS", "CHA"];
const ABILITY_NAMES: Record<AbilityKey, string> = {
  STR: "Strength",
  DEX: "Dexterity",
  CON: "Constitution",
  INT: "Intelligence",
  WIS: "Wisdom",
  CHA: "Charisma",
};

const DAMAGE_COLOR: Record<DamageType, string> = {
  bludgeoning: "text-ink-soft",
  piercing: "text-ink-soft",
  slashing: "text-ink-soft",
  fire: "text-fire",
  radiant: "text-radiant",
  force: "text-arcane",
};

export function CharacterSheetOverlay() {
  const heroId = useUiStore((s) => s.sheetHeroId);
  const closeSheet = useUiStore((s) => s.closeSheet);
  const sheet = heroId ? getHeroSheet(heroId) : null;

  return (
    <Dialog open={sheet !== null} onOpenChange={(open) => !open && closeSheet()}>
      {sheet && <SheetBody key={sheet.id} heroId={sheet.id} />}
    </Dialog>
  );
}

function SheetBody({ heroId }: { heroId: ReturnType<typeof getHeroSheet>["id"] }) {
  const sheet = getHeroSheet(heroId);
  const cantrips = sheet.spells?.filter((s) => s.cost === "cantrip") ?? [];
  const slotSpells = sheet.spells?.filter((s) => s.cost === "slot") ?? [];
  const order = PARTY.findIndex((h) => h.id === sheet.id) + 1;

  return (
    <DialogContent
      className="ga-scroll ga-parchment max-h-[88vh] w-full max-w-3xl overflow-y-auto border-parchment-dim p-0 text-ink sm:max-w-3xl"
    >
      <div className="border-b-2 border-ember/70 bg-slate-deep px-5 py-4 sm:px-7">
        <div className="flex items-center gap-4">
          <HeroToken heroId={sheet.id} size={60} className="shrink-0" />
          <div className="min-w-0 flex-1">
            <DialogTitle className="font-display text-xl font-bold tracking-wide text-parchment sm:text-2xl">
              {sheet.name}
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm text-mist-dim">
              {sheet.race} · {sheet.className} — {sheet.role}
            </DialogDescription>
          </div>
          <div className="shrink-0 rounded-md border border-slate-line bg-slate-panel px-3 py-1.5 text-center">
            <div className="font-display text-lg font-bold leading-none text-ember">1</div>
            <div className="mt-0.5 text-[10px] font-semibold tracking-widest text-mist-dim uppercase">
              Level
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6 px-5 py-5 sm:px-7 sm:py-6">
        {/* Core stats */}
        <section aria-label="Core statistics" className="grid grid-cols-3 gap-3">
          <StatBig label="Armor Class" value={sheet.ac} note={sheet.acNote} />
          <StatBig label="Hit Points" value={sheet.hp} note="max" />
          <StatBig label="Speed" value={sheet.speed} note="feet" />
        </section>

        {/* Signature & bio */}
        <section aria-label="Hero identity" className="rounded-md border border-parchment-dim bg-white/40 p-4">
          <p className="font-prose text-[15px] leading-relaxed text-ink">{sheet.bio}</p>
          <p className="mt-2 font-prose text-sm text-ink-soft italic">
            Player-facing fantasy: {sheet.fantasy}
          </p>
        </section>

        {/* Abilities */}
        <section aria-label="Ability scores">
          <SectionTitle>Ability Scores</SectionTitle>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {ABILITY_KEYS.map((key) => {
              const score = sheet.abilities[key];
              const mod = abilityModifier(score);
              return (
                <div
                  key={key}
                  className="rounded-md border border-parchment-dim bg-white/40 px-2 py-2.5 text-center"
                >
                  <div className="text-[10px] font-bold tracking-widest text-ink-soft uppercase" title={ABILITY_NAMES[key]}>
                    {key}
                  </div>
                  <div className="ga-tnum font-display text-xl font-bold text-ink">{score}</div>
                  <div className="ga-tnum text-sm font-semibold text-ember-deep">
                    ({formatBonus(mod)})
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Attacks */}
        {sheet.attacks.length > 0 && (
          <section aria-label="Weapon attacks">
            <SectionTitle>Attacks</SectionTitle>
            <div className="space-y-2">
              {sheet.attacks.map((attack) => (
                <AttackRow key={attack.name} attack={attack} />
              ))}
            </div>
          </section>
        )}

        {/* Spells */}
        {(cantrips.length > 0 || slotSpells.length > 0) && (
          <section aria-label="Spells">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <SectionTitle className="mb-0">Spells</SectionTitle>
              {sheet.spellSlots !== undefined && (
                <p className="ga-tnum text-sm font-semibold text-ink-soft">
                  Spell Slots{" "}
                  <span className="text-ember-deep" aria-label={`${sheet.spellSlots} slots per long rest`}>
                    {"● ".repeat(sheet.spellSlots).trim()}
                  </span>{" "}
                  · {sheet.spellSlots} per long rest
                </p>
              )}
            </div>
            <div className="mt-2 space-y-2">
              {cantrips.map((spell) => (
                <SpellRow key={spell.name} spell={spell} />
              ))}
              {slotSpells.map((spell) => (
                <SpellRow key={spell.name} spell={spell} />
              ))}
            </div>
          </section>
        )}

        {/* Features & traits */}
        <section aria-label="Features and traits">
          <SectionTitle>Features & Traits</SectionTitle>
          <div className="space-y-2">
            {sheet.traits.map((trait) => (
              <div
                key={trait.name}
                className={cn(
                  "rounded-md border p-3",
                  trait.kind === "signature"
                    ? "border-ember/60 bg-ember/10"
                    : "border-parchment-dim bg-white/40"
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-display text-sm font-bold text-ink">{trait.name}</span>
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wider uppercase",
                      trait.kind === "signature"
                        ? "bg-ember text-slate-deep"
                        : "bg-parchment-dim text-ink-soft"
                    )}
                  >
                    {trait.kind === "signature" ? "Signature" : trait.kind}
                  </span>
                </div>
                <p className="mt-1 text-sm leading-relaxed text-ink-soft">{trait.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Skills */}
        <section aria-label="Skills">
          <SectionTitle>Skills</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {sheet.skills.map((entry) => (
              <span
                key={entry.skill}
                className="ga-tnum inline-flex items-center gap-1.5 rounded-md border border-parchment-dim bg-white/40 px-2.5 py-1.5 text-sm"
              >
                <span className="font-semibold text-ink">{entry.skill}</span>
                <span className="text-xs text-ink-soft">{entry.ability}</span>
                <span className="font-bold text-ember-deep">{formatBonus(entry.bonus)}</span>
                {entry.expertise && (
                  <span
                    className="rounded bg-ember/25 px-1 text-[10px] font-bold tracking-wide text-ember-deep uppercase"
                    title="Doubled proficiency"
                  >
                    Exp
                  </span>
                )}
              </span>
            ))}
          </div>
        </section>

        {/* Level 2 unlock */}
        <section
          aria-label="Level 2 unlock"
          className="rounded-md border-2 border-dashed border-ember/60 bg-ember/10 p-4"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded bg-ember px-2 py-0.5 text-[10px] font-bold tracking-widest text-slate-deep uppercase">
              Level 2 Unlock
            </span>
            <span className="font-display text-sm font-bold text-ink">{sheet.level2.summary}</span>
          </div>
          <ul className="mt-2 space-y-1">
            {sheet.level2.grants.map((grant) => (
              <li key={grant} className="flex gap-2 text-sm leading-relaxed text-ink-soft">
                <span aria-hidden="true" className="text-ember-deep">◆</span>
                {grant}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-ink-soft italic">
            Unlocks at the milestone after the road ambush, before the dungeon.
          </p>
        </section>

        <p className="text-center text-[11px] tracking-wider text-ink-soft/70 uppercase">
          Party sheet {order} of 4 · Goblin Arrows — Session 1 reference build
        </p>
      </div>
    </DialogContent>
  );
}

function SectionTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h3 className={cn("mb-2 font-display text-xs font-bold tracking-[0.18em] text-ink-soft uppercase", className)}>
      {children}
    </h3>
  );
}

function StatBig({ label, value, note }: { label: string; value: number; note?: string }) {
  return (
    <div className="rounded-md border border-parchment-dim bg-white/40 px-3 py-3 text-center">
      <div className="text-[10px] font-bold tracking-widest text-ink-soft uppercase">{label}</div>
      <div className="ga-tnum font-display text-3xl font-extrabold text-ink">{value}</div>
      {note && <div className="text-[11px] text-ink-soft">{note}</div>}
    </div>
  );
}

function AttackRow({ attack }: { attack: Attack }) {
  return (
    <div className="rounded-md border border-parchment-dim bg-white/40 p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="font-display text-sm font-bold text-ink">{attack.name}</span>
        <span className="ga-tnum text-sm text-ink-soft">
          <span className="font-bold text-ember-deep">{formatBonus(attack.attackBonus)}</span> to hit
        </span>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <DiceLine expr={attack.damage} type={attack.damageType} />
        {attack.reach && <span className="text-ink-soft">reach {attack.reach} ft</span>}
        {attack.range && (
          <span className="ga-tnum text-ink-soft">
            {attack.thrown ? "thrown" : "range"} {attack.range[0]}/{attack.range[1]} ft
          </span>
        )}
      </div>
    </div>
  );
}

function SpellRow({ spell }: { spell: Spell }) {
  const locked = spell.minLevel !== undefined;
  return (
    <div
      className={cn(
        "rounded-md border p-3",
        locked ? "border-dashed border-ink-soft/50 bg-white/20 opacity-75" : "border-parchment-dim bg-white/40"
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-display text-sm font-bold text-ink">{spell.name}</span>
        <span
          className={cn(
            "rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wider uppercase",
            spell.cost === "cantrip" ? "bg-healing/25 text-healing" : "bg-arcane/20 text-arcane"
          )}
        >
          {spell.cost === "cantrip" ? "Cantrip" : "1 Slot"}
        </span>
        {spell.bonusAction && (
          <span className="rounded bg-parchment-dim px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-ink-soft uppercase">
            Bonus Action
          </span>
        )}
        {locked && (
          <span className="rounded bg-ember px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-slate-deep uppercase">
            Level 2
          </span>
        )}
      </div>
      <p className="mt-1 text-sm leading-relaxed text-ink-soft">{spell.effect}</p>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        {spell.range && <span className="ga-tnum text-ink-soft">{spell.range}</span>}
        {spell.attackBonus !== undefined && (
          <span className="ga-tnum text-ink-soft">
            <span className="font-bold text-ember-deep">{formatBonus(spell.attackBonus)}</span> to hit
          </span>
        )}
        {spell.save && (
          <span className="ga-tnum text-ink-soft">
            {spell.save.ability} save — {spell.save.outcome}
          </span>
        )}
        {spell.damage && <DiceLine expr={spell.damage} type={spell.damageType} />}
      </div>
    </div>
  );
}

function DiceLine({ expr, type }: { expr: DiceExpr; type?: DamageType }) {
  return (
    <span className="ga-tnum inline-flex items-center gap-1.5">
      <DiceIcon sides={expr.sides as DiceSides} size={15} className="text-ink-soft" />
      <span className="font-bold text-ink">{formatDice(expr)}</span>
      {type && <span className={cn("text-xs", DAMAGE_COLOR[type])}>{type}</span>}
    </span>
  );
}
