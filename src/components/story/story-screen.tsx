"use client";

/**
 * The story screen (GDD §8.1): left 55 % scene tableau, right 45 % prose
 * panel and choice cards. Choice cards that carry checks preview the
 * skill, the roller, the party's modifier and the DC before commitment
 * (§5.1); committing routes through the store's runner — checks stage the
 * dice overlay, battles hand off to the battle screen, everything else
 * advances immediately.
 */

import { AlertGaugeIfVisible } from "@/components/story/alert-gauge";
import { CheckOverlay } from "@/components/story/check-overlay";
import { PartyStrip } from "@/components/story/party-strip";
import { SceneTableau } from "@/components/story/scene-tableau";
import { HeroToken } from "@/components/ui/hero-token";
import { getScene } from "@/content/story";
import { PARTY } from "@/content/party";
import { choiceVisible, predicateHolds, previewCheck } from "@/game/scenes";
import type { RestRoll, Scene, SceneChoice, ScenePredicate } from "@/game/scene-types";
import type { WorldState } from "@/game/types";
import { useGameStore } from "@/state/store";
import { useUiStore } from "@/state/ui-store";
import { cn } from "@/lib/utils";
import {
  Backpack,
  ChevronRight,
  Dices,
  Dumbbell,
  Eye,
  EyeOff,
  Footprints,
  Home,
  MessageCircle,
  MoonStar,
  Save,
  Search,
  Shield,
  Swords,
  Target,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const ACT_LABELS: Record<Scene["act"], string> = {
  1: "Act I — The Road from Neverwinter",
  2: "Act II — The Goblin Ambush",
  3: "Act III — Cragmaw Hideout",
  4: "Act IV — The Rescue",
};

export function StoryScreen() {
  const sceneId = useGameStore((s) => s.sceneId);
  // Stable per-field selectors (zustand v5: object-returning selectors
  // loop) assembled into the WorldState the predicates read.
  const party = useGameStore((s) => s.party);
  const sceneHistory = useGameStore((s) => s.sceneHistory);
  const flags = useGameStore((s) => s.flags);
  const alertLevel = useGameStore((s) => s.alertLevel);
  const inventory = useGameStore((s) => s.inventory);
  const commitChoice = useGameStore((s) => s.commitChoice);
  const lastRest = useGameStore((s) => s.lastRest);
  const setView = useUiStore((s) => s.setView);
  const setSaveOverlay = useUiStore((s) => s.setSaveOverlay);
  const setInventoryOpen = useUiStore((s) => s.setInventoryOpen);

  if (!sceneId) return null;
  const scene = getScene(sceneId);
  const world: WorldState = {
    party,
    sceneId,
    sceneHistory,
    flags,
    alertLevel,
    inventory,
    battle: null,
    rng: useGameStore.getState().rng,
    meta: useGameStore.getState().meta,
  };
  const visibleChoices = scene.choices.filter((choice) => choiceVisible(world, scene, choice));
  const noteHolds = (p: ScenePredicate) => predicateHolds(world, p);

  return (
    <div className="game-root flex min-h-screen flex-col bg-slate-deep">
      {/* ── Header: act, party strip, alert, inventory, save ── */}
      <header className="flex flex-wrap items-center gap-2 border-b border-slate-line bg-slate-panel/60 px-2.5 py-2 sm:gap-3 sm:px-3">
        <button
          type="button"
          onClick={() => setView("title")}
          className="flex items-center gap-1.5 rounded-md border border-slate-line bg-slate-panel px-2.5 py-1.5 text-[11px] font-semibold tracking-wide text-mist uppercase transition-colors hover:bg-slate-raised"
          aria-label="Return to the title screen"
        >
          <Home className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="hidden sm:inline">Title</span>
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[10px] font-bold tracking-[0.22em] text-ember uppercase">
            {ACT_LABELS[scene.act]}
          </p>
          <h1 className="truncate font-display text-sm font-bold text-parchment sm:text-base">
            {scene.title}
          </h1>
        </div>
        <PartyStrip />
        <AlertGaugeIfVisible />
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setInventoryOpen(true)}
            className="rounded-md border border-slate-line bg-slate-panel p-1.5 text-mist-dim transition-colors hover:text-mist"
            aria-label="Open the inventory"
            title="Inventory"
          >
            <Backpack className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setSaveOverlay(true, "save")}
            className="rounded-md border border-slate-line bg-slate-panel p-1.5 text-mist-dim transition-colors hover:text-mist"
            aria-label="Save or load the run"
            title="Save / Load"
          >
            <Save className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </header>

      {/* ── Main: tableau + prose/choices ── */}
      <main className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <section
          className="relative h-[32vh] shrink-0 overflow-hidden border-b border-slate-line lg:h-auto lg:w-[55%] lg:border-b-0 lg:border-r"
          aria-hidden="true"
        >
          <SceneTableau spec={scene.tableau} />
          <p className="absolute bottom-2.5 left-3 rounded-md bg-slate-deep/70 px-2 py-1 font-prose text-[11px] text-mist-dim italic backdrop-blur-sm">
            {scene.location}
          </p>
        </section>

        <section className="ga-scroll min-h-0 flex-1 overflow-y-auto" aria-label="Scene prose and choices">
          <div className="mx-auto flex max-w-2xl flex-col gap-4 p-4 sm:p-6">
            <article className="ga-parchment rounded-xl border border-slate-line/50 p-5 text-ink shadow-[0_14px_44px_rgba(10,14,20,0.4)] sm:p-6">
              <p className="font-display text-[10px] font-bold tracking-[0.28em] text-ink-soft uppercase">
                {scene.location}
              </p>
              <h2 className="mt-1 font-display text-2xl font-extrabold tracking-wide text-ink">
                {scene.title}
              </h2>
              <div className="mt-3 space-y-3 font-prose text-[15px] leading-relaxed text-ink/90">
                <p>{scene.prose}</p>
                {(scene.proseNotes ?? [])
                  .filter((note) => note.requires.every(noteHolds))
                  .map((note, i) => (
                    <p
                      key={i}
                      className="border-l-2 border-ember/60 pl-3 text-ink-soft italic"
                    >
                      {note.text}
                    </p>
                  ))}
              </div>
              {scene.rest && lastRest && <RestPanel rolls={lastRest} />}
            </article>

            {scene.milestone && <MilestonePanel />}

            <nav aria-label="Scene choices" className="grid gap-2.5">
              {visibleChoices.map((choice) => (
                <ChoiceCard
                  key={choice.id}
                  choice={choice}
                  onCommit={() => commitChoice(scene.id, choice.id)}
                />
              ))}
            </nav>

            <p className="pb-6 text-center text-[10px] tracking-[0.2em] text-mist-dim/50 uppercase">
              Choices write the run the seed remembers
            </p>
          </div>
        </section>
      </main>

      {/* overlays */}
      <CheckOverlay />
    </div>
  );
}

/* ── Choice cards ── */

// Static glyph registry (module-level constant — the lint-safe way to
// vary icons by data; mirrors inventory-overlay's KIND_ICONS).
const SKILL_ICONS: Record<string, LucideIcon> = {
  Insight: Eye,
  Perception: Eye,
  Investigation: Search,
  Survival: Footprints,
  Athletics: Dumbbell,
  Stealth: EyeOff,
  Persuasion: MessageCircle,
  Deception: MessageCircle,
  Intimidation: Shield,
  default: Dices,
  attack: Target,
};

function checkIconKey(label: string, attack: boolean): string {
  if (attack) return "attack";
  return label in SKILL_ICONS ? label : "default";
}

function ChoiceCard({ choice, onCommit }: { choice: SceneChoice; onCommit: () => void }) {
  const check = choice.check ? previewCheck(choice.check) : null;
  const isBattle = Boolean(choice.battle);
  const isRest = (choice.effects ?? []).some((e) => e.kind === "shortRest");

  return (
    <button
      type="button"
      onClick={onCommit}
      className="group ga-panel rounded-lg border border-slate-line p-4 text-left transition-all hover:border-ember/60 hover:bg-slate-raised active:translate-y-px"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-sm font-bold tracking-wide text-parchment transition-colors group-hover:text-ember-bright">
            {choice.label}
          </p>
          {choice.detail && (
            <p className="mt-1 text-xs leading-relaxed text-mist-dim">{choice.detail}</p>
          )}
        </div>
        {isBattle ? (
          <Swords className="mt-0.5 h-4 w-4 shrink-0 text-ember" aria-hidden="true" />
        ) : isRest ? (
          <MoonStar className="mt-0.5 h-4 w-4 shrink-0 text-radiant" aria-hidden="true" />
        ) : check ? (
          <CheckChipIcon label={check.label} attack={check.attack} />
        ) : (
          <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-mist-dim" aria-hidden="true" />
        )}
      </div>

      {check && (
        <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border border-slate-line/70 bg-slate-deep/50 px-2.5 py-1.5">
          {(() => {
            const Glyph = SKILL_ICONS[checkIconKey(check.label, check.attack)];
            return <Glyph className="h-3.5 w-3.5 text-ember-bright" aria-hidden="true" />;
          })()}
          <span className="text-[11px] font-bold tracking-wider text-ember-bright uppercase">
            {check.label}
          </span>
          <span className="text-[11px] text-mist-dim" aria-hidden="true">·</span>
          <span className="ga-tnum text-[11px] font-semibold text-mist">
            {shortName(check.rollerName)} {check.bonus >= 0 ? `+${check.bonus}` : check.bonus}
          </span>
          <span className="ga-tnum text-[11px] text-mist-dim">
            vs {check.attack ? `AC ${check.dc}` : `DC ${check.dc}`}
          </span>
          {check.advantage && (
            <span className="rounded bg-healing/15 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-healing uppercase">
              advantage
            </span>
          )}
        </div>
      )}

      {isBattle && (
        <p className="mt-2.5 inline-flex items-center gap-1.5 rounded-md border border-ember/40 bg-ember/10 px-2.5 py-1 text-[10px] font-bold tracking-[0.18em] text-ember-bright uppercase">
          <Swords className="h-3 w-3" aria-hidden="true" />
          A fight — the tactical grid takes over
        </p>
      )}
    </button>
  );
}

function CheckChipIcon({ label, attack }: { label: string; attack: boolean }) {
  const Icon = SKILL_ICONS[checkIconKey(label, attack)];
  return <Icon className="mt-0.5 h-4 w-4 shrink-0 text-ember-bright" aria-hidden="true" />;
}

function shortName(name: string): string {
  return name.split(" ")[0];
}

/* ── Rest panel: the fire's genuine rolls ── */

function RestPanel({ rolls }: { rolls: RestRoll[] }) {
  return (
    <div className="mt-4 rounded-lg border border-ink/15 bg-ink/5 p-3">
      <p className="font-display text-[10px] font-bold tracking-[0.22em] text-ink-soft uppercase">
        Short rest — the fire&apos;s rolls
      </p>
      <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
        {rolls.map((r) => (
          <li
            key={r.heroId}
            className="ga-tnum flex items-center justify-between gap-2 rounded-md bg-parchment-dim/70 px-2.5 py-1.5 text-xs text-ink"
          >
            <span className="font-semibold">{shortName(r.name)}</span>
            <span className="text-ink-soft">
              1d{r.heroId === "torvald" ? 10 : r.heroId === "elyndra" ? 6 : 8}: {r.die}{" "}
              {r.con >= 0 ? `+${r.con}` : r.con}
            </span>
            <span className={cn("font-bold", r.healed > 0 ? "text-healing" : "text-ink-soft")}>
              {r.healed > 0 ? `+${r.healed} HP` : "at full"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── Milestone panel: the level-2 grants, data-driven from Chapter 3 ── */

function MilestonePanel() {
  return (
    <section
      aria-label="The level-2 milestone"
      className="ga-parchment rounded-xl border-2 border-ember/60 p-5 text-ink shadow-[0_14px_44px_rgba(10,14,20,0.4)] sm:p-6"
    >
      <p className="font-display text-[10px] font-bold tracking-[0.28em] text-ink-soft uppercase">
        The road&apos;s wages
      </p>
      <h3 className="mt-1 font-display text-2xl font-extrabold tracking-wide">
        Level 2 <span className="text-ember-deep">— the milestone</span>
      </h3>
      <ul className="mt-4 space-y-2.5">
        {PARTY.map((sheet) => (
          <li key={sheet.id} className="flex items-start gap-3 rounded-lg bg-ink/5 p-3">
            <HeroToken heroId={sheet.id} size={44} className="shrink-0" />
            <div className="min-w-0">
              <p className="font-display text-sm font-bold">
                {sheet.name}
                <span className="font-prose font-normal text-ink-soft"> — {sheet.level2.summary}</span>
              </p>
              <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs leading-relaxed text-ink-soft">
                {sheet.level2.grants.map((grant) => (
                  <li key={grant}>{grant}</li>
                ))}
                <li>+{sheet.level2.hpGain} maximum hit points.</li>
              </ul>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
