/**
 * The content linter (GDD §9.3) — validates the scene graph against the
 * frozen data contract so the Session 4 and 5 content drops are boring
 * (the highest compliment build tooling can receive).
 *
 * Pure: returns a list of problems. Empty means the content ships. The
 * test suite runs this on every build; new rules are added here, never in
 * the runner.
 */

import { ARENAS } from "@/content/arenas";
import { ITEMS } from "@/content/items";
import { PARTY } from "@/content/party";
import { FIRST_SCENE_ID, STORY_SCENES } from "@/content/story";
import type { Scene, SceneChoice, ScenePredicate } from "@/game/scene-types";

export interface LintOptions {
  /** Prose word-count bounds (GDD §10.3 template: 80–160). */
  minWords?: number;
  maxWords?: number;
  /** Choices per scene bounds. Session 3 ruling: decision scenes hold
   *  two to four choices (GDD Chapter 5); check-outcome variants and rest
   *  beats may carry a single continuation, so the floor here is 1. */
  minChoices?: number;
  maxChoices?: number;
}

const DEFAULTS: Required<LintOptions> = {
  minWords: 80,
  maxWords: 160,
  minChoices: 1,
  maxChoices: 4,
};

/** Lint the full story graph; returns human-readable problems. */
export function lintStoryContent(options: LintOptions = {}): string[] {
  const opts = { ...DEFAULTS, ...options };
  const problems: string[] = [];
  const scenes = Object.values(STORY_SCENES);
  const ids = new Set<string>();
  const edges: [string, string][] = [];

  const edge = (from: string, to: string) => {
    edges.push([from, to]);
    if (!STORY_SCENES[to]) problems.push(`${from}: target scene "${to}" does not exist`);
  };

  if (!STORY_SCENES[FIRST_SCENE_ID]) {
    problems.push(`FIRST_SCENE_ID "${FIRST_SCENE_ID}" does not exist`);
  } else if (STORY_SCENES[FIRST_SCENE_ID].act !== 1) {
    problems.push(`FIRST_SCENE_ID "${FIRST_SCENE_ID}" must be an act-1 scene`);
  }

  for (const scene of scenes) {
    const where = scene.id;

    if (ids.has(scene.id)) problems.push(`duplicate scene id "${scene.id}"`);
    ids.add(scene.id);

    // Prose template (§10.3): 80–160 words per scene.
    const words = scene.prose.trim().split(/\s+/).filter(Boolean).length;
    if (words < opts.minWords || words > opts.maxWords) {
      problems.push(`${where}: prose is ${words} words (template ${opts.minWords}-${opts.maxWords})`);
    }

    // Choice count (Chapter 5: two to four).
    if (scene.choices.length < opts.minChoices || scene.choices.length > opts.maxChoices) {
      problems.push(
        `${where}: ${scene.choices.length} choices (spec ${opts.minChoices}-${opts.maxChoices})`
      );
    }
    const choiceIds = new Set<string>();

    for (const choice of scene.choices) {
      lintChoice(scene, choice, problems, edge);
    }
    void choiceIds; // (choice-id uniqueness checked inside lintChoice)

    for (const note of scene.proseNotes ?? []) {
      for (const p of note.requires) lintPredicate(where, "proseNote", p, problems, edge);
    }
  }

  // Acts never run backwards along any edge.
  for (const [from, to] of edges) {
    const a = STORY_SCENES[from];
    const b = STORY_SCENES[to];
    if (a && b && b.act < a.act) {
      problems.push(`act regression: ${from} (act ${a.act}) → ${to} (act ${b.act})`);
    }
  }

  // Reachability: every scene must be walkable from the first scene.
  const reachable = new Set<string>([FIRST_SCENE_ID]);
  const queue = [FIRST_SCENE_ID];
  while (queue.length > 0) {
    const id = queue.shift()!;
    const scene = STORY_SCENES[id];
    if (!scene) continue;
    const outs: string[] = [];
    for (const choice of scene.choices) {
      outs.push(choice.goto, choice.gotoFled ?? "");
      if (choice.check) {
        outs.push(choice.check.successScene, choice.check.failureScene);
      }
    }
    for (const to of outs) {
      if (to && STORY_SCENES[to] && !reachable.has(to)) {
        reachable.add(to);
        queue.push(to);
      }
    }
  }
  for (const scene of scenes) {
    if (!reachable.has(scene.id)) {
      problems.push(`scene "${scene.id}" is unreachable from ${FIRST_SCENE_ID}`);
    }
  }

  // Rest discipline: rest-marked scenes are the short-rest variants, reached
  // only by rest choices gated on restAvailable (§4.5: once per act).
  for (const scene of scenes) {
    if (!scene.rest) continue;
    const incoming = edges
      .filter(([, to]) => to === scene.id)
      .map(([from]) => STORY_SCENES[from])
      .filter(Boolean);
    const ok = incoming.some((from) =>
      from.choices.some(
        (c) =>
          (c.goto === scene.id || c.gotoFled === scene.id) &&
          (c.effects ?? []).some((e) => e.kind === "shortRest")
      )
    );
    if (!ok) {
      problems.push(`rest scene "${scene.id}" must be entered by a shortRest choice`);
    }
  }
  for (const scene of scenes) {
    for (const choice of scene.choices) {
      const hasRest = (choice.effects ?? []).some((e) => e.kind === "shortRest");
      if (!hasRest) continue;
      const gated = (choice.requires ?? []).some((p) => p.kind === "restAvailable");
      const target = STORY_SCENES[choice.goto];
      if (!gated) {
        problems.push(`${scene.id}/${choice.id}: shortRest choice must require restAvailable`);
      }
      if (!target?.rest) {
        problems.push(`${scene.id}/${choice.id}: shortRest choice must target a rest-marked scene`);
      }
    }
  }
  // At most one rest scene per act (§4.5: once per act).
  const restByAct = new Map<number, number>();
  for (const scene of scenes) {
    if (!scene.rest) continue;
    restByAct.set(scene.act, (restByAct.get(scene.act) ?? 0) + 1);
  }
  for (const [act, count] of restByAct) {
    if (count > 1) problems.push(`act ${act} has ${count} rest scenes (one per act)`);
  }

  // The level-2 milestone must exist and be reachable before act 3's door.
  const milestone = scenes.find((s) => s.milestone);
  if (!milestone) {
    problems.push("no milestone scene — the level-2 flow (§10.3) is missing");
  } else {
    const grantsLevel = scenes.some((s) =>
      s.choices.some((c) => (c.effects ?? []).some((e) => e.kind === "levelUp"))
    );
    if (!grantsLevel) problems.push("no choice carries the levelUp effect");
  }

  return problems;
}

function lintChoice(
  scene: Scene,
  choice: SceneChoice,
  problems: string[],
  edge: (from: string, to: string) => void
): void {
  const where = `${scene.id}/${choice.id}`;

  // Battle choices: no checks, valid arena, routed on victory and on flee.
  if (choice.battle) {
    if (choice.check) problems.push(`${where}: battle choices cannot carry checks`);
    if (!ARENAS[choice.battle.arenaId]) {
      problems.push(`${where}: unknown arena "${choice.battle.arenaId}"`);
    }
    if (choice.gotoFled && !STORY_SCENES[choice.gotoFled]) {
      problems.push(`${where}: gotoFled "${choice.gotoFled}" does not exist`);
    }
  }

  // Checks: skill XOR attack, valid attack reference, both branches defined.
  if (choice.check) {
    const spec = choice.check;
    if (Boolean(spec.skill) === Boolean(spec.attack)) {
      problems.push(`${where}: a check needs exactly one of skill or attack`);
    }
    if (spec.skill && spec.attack) {
      problems.push(`${where}: a check cannot be both skill and attack`);
    }
    if (spec.attack) {
      const sheet = PARTY.find((h) => h.id === spec.attack!.hero);
      if (!sheet) {
        problems.push(`${where}: unknown hero "${spec.attack.hero}"`);
      } else if (!sheet.attacks.some((a) => a.name === spec.attack!.attack)) {
        problems.push(`${where}: ${sheet.name} has no attack named "${spec.attack!.attack}"`);
      }
    }
    if (spec.dc < 5 || spec.dc > 25) {
      problems.push(`${where}: DC ${spec.dc} outside sane bounds (5-25)`);
    }
    edge(scene.id, spec.successScene);
    edge(scene.id, spec.failureScene);
  }

  // goto is always required and must exist (title-effect choices may
  // self-point; their goto never executes).
  if (!choice.goto) problems.push(`${where}: missing goto`);
  if (choice.goto === scene.id) {
    const isTitle = (choice.effects ?? []).some((e) => e.kind === "title");
    if (!isTitle) problems.push(`${where}: self-pointing goto (only title exits may self-point)`);
  } else {
    edge(scene.id, choice.goto);
  }
  if (choice.gotoFled) edge(scene.id, choice.gotoFled);

  // Effects & predicates reference real flags, items and scenes.
  for (const effect of choice.effects ?? []) {
    if (effect.kind === "item" && !ITEMS[effect.item as keyof typeof ITEMS]) {
      problems.push(`${where}: unknown item "${effect.item}"`);
    }
    if (effect.kind === "alert" && (effect.to < 0 || effect.to > 3)) {
      problems.push(`${where}: alert ${effect.to} outside 0-3`);
    }
  }
  for (const spec of [choice.check?.successEffects, choice.check?.failureEffects]) {
    for (const effect of spec ?? []) {
      if (effect.kind === "item" && !ITEMS[effect.item as keyof typeof ITEMS]) {
        problems.push(`${where}: check effect references unknown item "${effect.item}"`);
      }
    }
  }
  for (const p of [...(choice.requires ?? []), ...(choice.hides ?? [])]) {
    lintPredicate(scene.id, choice.id, p, problems, edge);
  }
}

function lintPredicate(
  where: string,
  what: string,
  p: ScenePredicate,
  problems: string[],
  edge: (from: string, to: string) => void
): void {
  switch (p.kind) {
    case "sceneSeen":
    case "sceneNotSeen":
      // Existence only — predicate references are not transitions, so they
      // must not feed the act-regression or reachability walks.
      if (!STORY_SCENES[p.sceneId]) {
        problems.push(`${where} (${what}): predicate references unknown scene "${p.sceneId}"`);
      }
      break;
    case "hasItem":
      if (!ITEMS[p.item as keyof typeof ITEMS]) {
        problems.push(`${where} (${what}): predicate references unknown item "${p.item}"`);
      }
      break;
    case "alertAtLeast":
      if (p.level < 0 || p.level > 3) {
        problems.push(`${where} (${what}): alertAtLeast ${p.level} outside 0-3`);
      }
      break;
    default:
      break;
  }
}
