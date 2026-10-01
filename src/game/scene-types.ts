/**
 * The scene-runner data contract (GDD §10.3) — FROZEN at Session 3.
 *
 * Sessions 4 and 5 write their dungeon content against exactly these types;
 * per the §10.7 dependency rule, hideout prose drafting begins only after
 * this contract freezes, so content is never written against a moving
 * format. The content linter (src/game/content-lint.ts) enforces the
 * contract's invariants at test time; changing anything in this file after
 * Session 3 requires a change-control note in SESSIONS.md first.
 *
 * Layering: this module is TYPES ONLY (no imports beyond ../game/types), so
 * the content layer (src/content) can depend on it without cycles. The
 * runner lives in src/game/scenes.ts.
 */

import type { AbilityKey, AlertLevel, Flags, HeroId, SkillName } from "./types";

/* ══════════════════════════ Tableau (GDD §8.1) ══════════════════════════ */

/** The scene tableau's environment — drives the layered CSS gradient sky. */
export type TableauSetting = "city" | "road" | "camp" | "meadow" | "forest" | "hideout";

export type TableauTime = "morning" | "day" | "dusk" | "night";

/**
 * Vector silhouette props posed into the tableau. Each is a small SVG
 * silhouette; scenes compose two or three for a distinct shape (GDD §8.1:
 * "every scene a distinct silhouette without a single drawn asset").
 */
export type TableauProp =
  | "wagon" // the provision wagon, tongue-out silhouette
  | "deadHorses" // two low shapes with standing arrows
  | "arrows" // black-fletched arrows planted in the ground
  | "campfire" // fire glow with log silhouette
  | "thicket" // flanking brush masses
  | "mapCase" // the torn, emptied leather case
  | "wolfTracks" // paw prints climbing the trail
  | "stream" // the bright band of falling water
  | "brush" // the curtain that hides the cave mouth
  | "caveMouth" // the dark arch in the hillside;

export interface TableauSpec {
  setting: TableauSetting;
  time: TableauTime;
  props?: TableauProp[];
}

/* ══════════════════════════ Checks (GDD §5.1) ══════════════════════════ */

/**
 * A die roll the choice carries. Exactly one of `skill` / `attack`:
 *  - skill: a group check — the party member with the best modifier rolls
 *    (trained bonus from the sheet, or the ability modifier when nobody
 *    lists the skill, e.g. Survival → Maera's WIS).
 *  - attack: a hero's weapon attack against the named AC — the same d20
 *    chassis as combat, used for the runner shot.
 *
 * The choice card previews skill, roller, modifier and DC before the
 * player commits (dice-you-can-see, §5.1); the overlay then plays the
 * genuine engine roll.
 */
export interface CheckSpec {
  skill?: SkillName;
  attack?: { hero: HeroId; attack: string };
  dc: number;
  /** Names the helper whose fiction grants advantage (GDD §5.1). */
  advantageFrom?: string;
  successScene: string;
  failureScene: string;
  /** Applied only on the success branch (e.g. knowsLayout). */
  successEffects?: SceneEffect[];
  /** Applied only on the failure branch (e.g. alert → 1 on the trail). */
  failureEffects?: SceneEffect[];
}

/* ══════════════════════════ Predicates & effects ══════════════════════════ */

/** Visibility conditions: all `requires` and no `hides` must hold to show a card. */
export type ScenePredicate =
  | { kind: "flag"; flag: keyof Flags; value?: boolean } // value defaults to true
  | { kind: "sceneSeen"; sceneId: string }
  | { kind: "sceneNotSeen"; sceneId: string }
  | { kind: "alertAtLeast"; level: AlertLevel }
  | { kind: "restAvailable" } // this act's short rest not yet taken
  | { kind: "hasItem"; item: string; count?: number };

/**
 * World changes applied when a choice commits (and after its check, if any,
 * resolves). Effects bind to choices and check branches — never to scene
 * entry — a contract the linter enforces.
 */
export type SceneEffect =
  | { kind: "flag"; flag: keyof Flags; value: boolean }
  | { kind: "alert"; to: AlertLevel } // never decreases; the runner clamps
  | { kind: "item"; item: string; count: number } // negative removes
  | { kind: "gold"; amount: number }
  | { kind: "shortRest" } // once per act (predicate-gated); rolls hit dice
  | { kind: "levelUp" } // the level-2 milestone (idempotent)
  | { kind: "title" }; // UI-only: return to the title screen

/* ══════════════════════════ Choices & scenes ══════════════════════════ */

export interface SceneChoice {
  id: string;
  /** Card headline, imperative voice. */
  label: string;
  /** Second line on the card — the fiction or the mechanic nuance. */
  detail?: string;
  check?: CheckSpec;
  requires?: ScenePredicate[];
  hides?: ScenePredicate[];
  effects?: SceneEffect[];
  /** Starts a battle; the current scene holds until the battle resolves. */
  battle?: { arenaId: string };
  /** Destination scene — the victory route when the choice starts a battle. */
  goto: string;
  /** Battle victory with an escaped goblin routes here instead (GDD §6.2). */
  gotoFled?: string;
}

export interface ProseNote {
  requires: ScenePredicate[];
  text: string;
}

export interface Scene {
  id: string;
  /** Acts advance only forward; crossing upward applies a long rest and
   *  writes the autosave (GDD §2.1, §4.5). */
  act: 1 | 2 | 3 | 4;
  /** Scene title, shown on the prose panel. */
  title: string;
  /** Kicker above the title, e.g. "Act I · Neverwinter, the east yard". */
  location: string;
  tableau: TableauSpec;
  /** 80–160 words (GDD §10.3 prose template); lint-enforced. */
  prose: string;
  /** Conditional paragraphs appended while all predicates hold. */
  proseNotes?: ProseNote[];
  /** Two to four choices (GDD Chapter 5). */
  choices: SceneChoice[];
  /** Marks the short-rest variant scene — one per act; gates restAvailable. */
  rest?: boolean;
  /** Renders the level-2 milestone panel, data-driven from Chapter 3. */
  milestone?: boolean;
}

/* ══════════════════════════ Resolved check (engine output) ══════════════════════════ */

/** The genuine engine roll behind a check — what the overlay animates. */
export interface ResolvedCheck {
  /** "Insight", "Shortbow" — the skill or weapon being rolled. */
  label: string;
  roller: { heroId: HeroId; name: string };
  bonus: number;
  advantage: boolean;
  advantageFrom?: string;
  /** Every d20 drawn, in order: [a], [a, b] with advantage, plus a Lucky reroll last. */
  dice: number[];
  /** The face that counted (highest with advantage; the Lucky reroll when spent). */
  kept: number;
  /** The natural 1 Perrin's Lucky rerolled, when it fired. */
  luckyRerolled?: number;
  total: number;
  dc: number;
  success: boolean;
}

/* ══════════════════════════ Rest rolls (engine output) ══════════════════════════ */

/** One hero's short-rest hit-die roll — the rest panel's rows. */
export interface RestRoll {
  heroId: HeroId;
  name: string;
  /** The hit-die face (d10/d8/d8/d6 by class). */
  die: number;
  /** The hero's CON modifier. */
  con: number;
  /** Hit points actually restored (capped at max). */
  healed: number;
  atFull: boolean;
}

/* ══════════════════════════ Skill map (Table 8) ══════════════════════════ */

/** The eighteen skills → governing ability (GDD Table 8 lists this adventure's twelve). */
export const SKILL_ABILITY: Record<SkillName, AbilityKey> = {
  Athletics: "STR",
  Acrobatics: "DEX",
  "Sleight of Hand": "DEX",
  Stealth: "DEX",
  Arcana: "INT",
  History: "INT",
  Investigation: "INT",
  Nature: "INT",
  Religion: "INT",
  "Animal Handling": "WIS",
  Insight: "WIS",
  Medicine: "WIS",
  Perception: "WIS",
  Survival: "WIS",
  Deception: "CHA",
  Intimidation: "CHA",
  Performance: "CHA",
  Persuasion: "CHA",
};
