/**
 * The scene runner (GDD §10.3) — pure functions over WorldState that turn
 * scene data into world changes: choice resolution, the skill-check flow,
 * flag/item/alert effects, short and long rests, the level-2 milestone,
 * act transitions, and the battle handoff and return.
 *
 * Everything here is deterministic given (world, sceneId, choiceId): draws
 * come from the world's seeded stream in a fixed order, so identical seeds
 * replay identical games (GDD §9.2). The store orchestrates these pure
 * functions; nothing in this module touches localStorage or React.
 */

import { getArena } from "@/content/arenas";
import { addItem, itemCount, type ItemId } from "@/content/items";
import { createPartyRuntime, getHeroSheet, PARTY, PARTY_ORDER } from "@/content/party";
import { getScene, FIRST_SCENE_ID } from "@/content/story";
import { createBattle } from "@/game/combat/core";
import { abilityModifier } from "@/game/dice";
import { Rng } from "@/game/rng";
import type {
  AlertLevel,
  BattleState,
  Flags,
  HeroId,
  HeroRuntime,
  WorldState,
} from "@/game/types";
import type {
  CheckSpec,
  ResolvedCheck,
  RestRoll,
  Scene,
  SceneChoice,
  SceneEffect,
  ScenePredicate,
} from "@/game/scene-types";
import { SKILL_ABILITY } from "@/game/scene-types";

/* ══════════════════════════ Check resolution (GDD §5.1) ══════════════════════════ */

export interface SkillRoller {
  heroId: HeroId;
  name: string;
  bonus: number;
}

/**
 * Group checks automatically assign the party member with the highest
 * modifier (GDD §5.1): a trained hero uses the sheet bonus, otherwise the
 * governing ability modifier (e.g. Survival → Maera's WIS +3). Ties go to
 * marching order.
 */
export function bestSkillRoller(skill: CheckSpec["skill"]): SkillRoller {
  if (!skill) throw new Error("bestSkillRoller: no skill given");
  const ability = SKILL_ABILITY[skill];
  let best: SkillRoller | null = null;
  for (const sheet of PARTY) {
    const trained = sheet.skills.find((entry) => entry.skill === skill);
    const bonus = trained ? trained.bonus : abilityModifier(sheet.abilities[ability]);
    if (!best || bonus > best.bonus) {
      best = { heroId: sheet.id, name: sheet.name, bonus };
    }
  }
  return best!;
}

/** What the choice card previews before the player commits (GDD §5.1). */
export function previewCheck(spec: CheckSpec): {
  label: string;
  rollerName: string;
  bonus: number;
  dc: number;
  advantage: boolean;
  advantageFrom?: string;
  attack: boolean;
} {
  if (spec.attack) {
    const sheet = getHeroSheet(spec.attack.hero);
    const attack = sheet.attacks.find((a) => a.name === spec.attack!.attack);
    if (!attack) throw new Error(`Unknown attack ${spec.attack.attack} on ${sheet.name}`);
    return {
      label: attack.name,
      rollerName: sheet.name,
      bonus: attack.attackBonus,
      dc: spec.dc,
      advantage: false,
      attack: true,
    };
  }
  const roller = bestSkillRoller(spec.skill);
  return {
    label: spec.skill!,
    rollerName: roller.name,
    bonus: roller.bonus,
    dc: spec.dc,
    advantage: Boolean(spec.advantageFrom),
    advantageFrom: spec.advantageFrom,
    attack: false,
  };
}

/**
 * Roll a check from the given stream — the genuine engine result the dice
 * UI animates. Draw order is fixed: [a], then [b] with advantage, then a
 * Lucky reroll when Perrin rolls a natural 1 (Session 2 ruling extended to
 * exploration checks). Attacks and checks share the d20 chassis (§4.1).
 */
export function resolveCheck(world: WorldState, spec: CheckSpec, rng: Rng): ResolvedCheck {
  const preview = previewCheck(spec);
  let roller: SkillRoller;
  if (spec.attack) {
    roller = { heroId: spec.attack.hero, name: preview.rollerName, bonus: preview.bonus };
  } else {
    roller = bestSkillRoller(spec.skill);
  }

  const dice: number[] = [];
  let kept: number;
  if (spec.advantageFrom) {
    const a = rng.d20("check.adv-a");
    const b = rng.d20("check.adv-b");
    dice.push(a, b);
    kept = Math.max(a, b);
  } else {
    kept = rng.d20("check");
    dice.push(kept);
  }

  let luckyRerolled: number | undefined;
  if (kept === 1 && roller.heroId === "perrin") {
    luckyRerolled = kept;
    kept = rng.d20("check.lucky");
    dice.push(kept);
  }

  const total = kept + roller.bonus;
  return {
    label: preview.label,
    roller,
    bonus: roller.bonus,
    advantage: Boolean(spec.advantageFrom),
    advantageFrom: spec.advantageFrom,
    dice,
    kept,
    luckyRerolled,
    total,
    dc: spec.dc,
    success: total >= spec.dc,
  };
}

/* ══════════════════════════ Predicates ══════════════════════════ */

export function hasVisited(world: WorldState, sceneId: string): boolean {
  return world.sceneHistory.includes(sceneId) || world.sceneId === sceneId;
}

/** Has this act's short rest been taken (a visited scene marked rest)? */
export function restTakenInAct(world: WorldState, act: Scene["act"]): boolean {
  const ids = [...world.sceneHistory, ...(world.sceneId ? [world.sceneId] : [])];
  return ids.some((id) => {
    const scene = getSceneSafe(id);
    return scene !== undefined && scene.rest === true && scene.act === act;
  });
}

function getSceneSafe(id: string): Scene | undefined {
  try {
    return getScene(id);
  } catch {
    return undefined;
  }
}

export function predicateHolds(world: WorldState, p: ScenePredicate): boolean {
  switch (p.kind) {
    case "flag":
      return world.flags[p.flag] === (p.value ?? true);
    case "sceneSeen":
      return hasVisited(world, p.sceneId);
    case "sceneNotSeen":
      return !hasVisited(world, p.sceneId);
    case "alertAtLeast":
      return world.alertLevel >= p.level;
    case "restAvailable": {
      const act = world.sceneId ? (getScene(world.sceneId).act ?? 1) : 1;
      return !restTakenInAct(world, act);
    }
    case "hasItem":
      return itemCount(world.inventory, p.item as ItemId) >= (p.count ?? 1);
  }
}

export function choiceVisible(world: WorldState, scene: Scene, choice: SceneChoice): boolean {
  const holds = (list?: ScenePredicate[]) => (list ?? []).every((p) => predicateHolds(world, p));
  return holds(choice.requires) && !choice.hides?.some((p) => predicateHolds(world, p));
}

/* ══════════════════════════ Effects ══════════════════════════ */

/** Apply one effect list in order. Returns rest rolls when a rest fires. */
function applyEffects(world: WorldState, effects: SceneEffect[], rng: Rng): RestRoll[] | null {
  let rest: RestRoll[] | null = null;
  for (const effect of effects) {
    switch (effect.kind) {
      case "flag":
        world.flags[effect.flag] = effect.value;
        break;
      case "alert":
        // The ladder never decreases (GDD §5.3).
        world.alertLevel = Math.max(world.alertLevel, Math.min(3, Math.max(0, effect.to))) as AlertLevel;
        break;
      case "item":
        addItem(world.inventory, effect.item as ItemId, effect.count);
        break;
      case "gold":
        world.inventory.gold = Math.max(0, world.inventory.gold + effect.amount);
        break;
      case "shortRest":
        rest = shortRestParty(world, rng);
        break;
      case "levelUp":
        applyLevelUp(world);
        break;
      case "title":
        break; // UI-only; the store reads it off the transition
    }
  }
  return rest;
}

/** Each hero rolls hit die + CON; Second Wind recharges (GDD §4.5). */
export function shortRestParty(world: WorldState, rng: Rng): RestRoll[] {
  const rolls: RestRoll[] = [];
  for (const heroId of PARTY_ORDER) {
    const sheet = getHeroSheet(heroId);
    const rt = world.party[heroId];
    const die = rng.die(sheet.hitDie, `rest.${heroId}`);
    const con = abilityModifier(sheet.abilities.CON);
    const atFull = rt.hp >= rt.maxHp;
    const healed = Math.max(0, Math.min(die + con, rt.maxHp - rt.hp));
    rt.hp += healed;
    if ("secondWind" in rt.resources) rt.resources.secondWind = true;
    rolls.push({ heroId, name: sheet.name, die, con, healed, atFull });
  }
  return rolls;
}

/** Full hit points, all slots, all abilities (GDD §4.5, act boundaries). */
export function applyLongRest(world: WorldState): void {
  for (const heroId of PARTY_ORDER) {
    const rt = world.party[heroId];
    rt.hp = rt.maxHp;
    rt.spellSlotsUsed = 0;
    rt.conditions = [];
    rt.resources = { ...createPartyRuntime(rt.level as 1 | 2)[heroId].resources };
  }
}

/**
 * The level-2 milestone (GDD §2.2, §3.1): hit-point increase, third slots
 * for the casters (computed from the sheet at battle creation), and the
 * level-2 feature resources — Action Surge, Cunning Action. Idempotent.
 */
export function applyLevelUp(world: WorldState): void {
  for (const heroId of PARTY_ORDER) {
    const sheet = getHeroSheet(heroId);
    const rt = world.party[heroId];
    if (rt.level >= 2) continue;
    rt.level = 2;
    rt.maxHp += sheet.level2.hpGain ?? 0;
    rt.hp += sheet.level2.hpGain ?? 0;
    // Merge only the NEW level-2 resources; spent lower-level resources
    // (Second Wind) are restored by the act-boundary long rest that follows.
    const fresh = createPartyRuntime(2)[heroId].resources;
    for (const key of Object.keys(fresh)) {
      if (!(key in rt.resources)) rt.resources[key] = fresh[key];
    }
  }
}

/* ══════════════════════════ Choice resolution ══════════════════════════ */

/** Where a story battle routes after it resolves (GDD §6.2 runner beat). */
export interface BattleRoute {
  onVictory: string;
  onVictoryFled: string | null;
}

export interface ChoiceTransition {
  /** The world after effects and RNG advance (scene id NOT yet advanced for
   *  staged checks; advanced for immediate transitions). */
  world: WorldState;
  check: ResolvedCheck | null;
  /** Destination scene (the victory route for battle choices). */
  nextSceneId: string;
  battle: { state: BattleState; route: BattleRoute } | null;
  rest: RestRoll[] | null;
  /** True when the transition crosses an act boundary (long rest + autosave). */
  actAdvanced: boolean;
  /** The choice carries { kind: "title" } — the store returns to the title screen. */
  toTitle: boolean;
}

/**
 * Resolve a committed choice. Draw order (the determinism contract):
 *   1. the check's d20s (advantage pair, then a Lucky reroll), if any;
 *   2. short-rest hit dice, if the choice takes one;
 *   3. the battle seed, if the choice starts a battle.
 * Effects apply in order: choice effects, then the check's branch effects.
 */
export function resolveChoice(
  world: WorldState,
  sceneId: string,
  choiceId: string
): ChoiceTransition {
  const scene = getScene(sceneId);
  const choice = scene.choices.find((c) => c.id === choiceId);
  if (!choice) throw new Error(`Scene ${sceneId} has no choice ${choiceId}`);
  if (!choiceVisible(world, scene, choice)) {
    throw new Error(`Choice ${sceneId}/${choiceId} is not currently visible`);
  }

  const draft: WorldState = structuredClone(world);
  const rng = Rng.fromState(draft.rng);

  // 1. The check, if any.
  let check: ResolvedCheck | null = null;
  let nextSceneId = choice.goto;
  let branchEffects: SceneEffect[] = [];
  if (choice.check) {
    check = resolveCheck(draft, choice.check, rng);
    nextSceneId = check.success ? choice.check.successScene : choice.check.failureScene;
    branchEffects = check.success
      ? (choice.check.successEffects ?? [])
      : (choice.check.failureEffects ?? []);
  }

  // 2 & 3. Effects — choice effects first, then the check's branch effects
  // (both lists always apply; a rest can only fire from one of them).
  const restA = applyEffects(draft, choice.effects ?? [], rng);
  const restB = applyEffects(draft, branchEffects, rng);
  const rest = restA ?? restB;
  const toTitle = [...(choice.effects ?? []), ...branchEffects].some((e) => e.kind === "title");

  // Battle handoff: snapshot the run party and the inventory's potions;
  // the seed is drawn from the world stream, so saves replay exactly.
  let battle: ChoiceTransition["battle"] = null;
  if (choice.battle) {
    const arena = getArena(choice.battle.arenaId);
    const level = draft.party.torvald.level as 1 | 2;
    const seed = Math.floor(rng.float("battle-seed") * 4294967296);
    const potions = itemCount(draft.inventory, "potion");
    battle = {
      state: createBattle(arena, { level, seed, party: draft.party, potions }),
      route: { onVictory: choice.goto, onVictoryFled: choice.gotoFled ?? null },
    };
  }

  // Act boundary: long rest + autosave when the act steps upward (§2.1).
  // The scene record itself (history push + stamp) is the store's job.
  let actAdvanced = false;
  if (!battle && !toTitle) {
    const next = getScene(nextSceneId);
    if (next.act > scene.act) {
      applyLongRest(draft);
      actAdvanced = true;
    }
  }

  draft.rng = rng.getCursor();
  return { world: draft, check, nextSceneId, battle, rest, actAdvanced, toTitle };
}

/* ══════════════════════════ Battle result (the return handoff) ══════════════════════════ */

export interface BattleResult {
  world: WorldState;
  nextSceneId: string | null;
  defeat: boolean;
  /** True when the resolution crosses an act boundary. */
  actAdvanced: boolean;
}

/**
 * Fold a finished story battle back into the world and route the story
 * (GDD §10.3 acceptance 1 & 4). Victory syncs each hero's combatant state
 * into the run party (Down heroes already rose at 1 HP in the kernel),
 * carries potion usage back into the inventory, rolls the goblins' potion
 * drops ("roughly every fourth goblin", §4.5), and sets goblinEscaped when
 * any goblin slipped off the map. Defeat is the total party kill — the
 * world stands still and the UI routes to the game-over screen.
 *
 * Draw order: one 25 % chance per defeated goblin, in battle order.
 */
export function applyBattleResult(
  world: WorldState,
  battle: BattleState,
  route: BattleRoute
): BattleResult {
  if (battle.status === "defeat") {
    return { world, nextSceneId: null, defeat: true, actAdvanced: false };
  }
  if (battle.status !== "victory") {
    throw new Error(`applyBattleResult: battle is still ${battle.status}`);
  }

  const draft: WorldState = structuredClone(world);
  const rng = Rng.fromState(draft.rng);

  // Party sync — combatant state flows back into the run party.
  for (const heroId of PARTY_ORDER) {
    const c = battle.combatants[heroId];
    const rt: HeroRuntime = draft.party[heroId];
    rt.hp = Math.max(1, c.hp); // Down heroes rose at 1 HP (kernel Table 7)
    rt.spellSlotsUsed = c.spellSlotsUsed;
    rt.resources = { ...c.resources };
    rt.conditions = [];
  }

  // Potion economy: what the fight didn't drink comes home, plus drops.
  const carried = battle.potions;
  const remaining = Math.max(0, carried - battle.stats.potionsUsed);
  let loot = 0;
  for (const id of battle.order) {
    const c = battle.combatants[id];
    if (c.side === "enemy" && c.hp <= 0 && !c.fled) {
      if (rng.chance(0.25, `loot.${id}`)) loot += 1;
    }
  }
  const potionCount = itemCount(draft.inventory, "potion");
  const target = remaining + loot;
  if (target !== potionCount) {
    addItem(draft.inventory, "potion", target - potionCount);
  }

  // The runner beat: a goblin that slipped off the field is going home.
  const goblinEscaped = Object.values(battle.combatants).some(
    (c) => c.side === "enemy" && c.fled && c.ref === "goblin"
  );
  if (goblinEscaped) draft.flags.goblinEscaped = true;

  // Route: the fled variant when a goblin escaped, the victory scene otherwise.
  const nextSceneId = goblinEscaped && route.onVictoryFled ? route.onVictoryFled : route.onVictory;

  // Act boundary across the battle, if the route steps the act upward.
  // The scene record (history push + stamp) is the store's job.
  let actAdvanced = false;
  const current = draft.sceneId ? getScene(draft.sceneId) : undefined;
  const next = getScene(nextSceneId);
  if (current && next.act > current.act) {
    applyLongRest(draft);
    actAdvanced = true;
  }

  draft.rng = rng.getCursor();
  return { world: draft, nextSceneId, defeat: false, actAdvanced };
}

/* ══════════════════════════ Scene metadata ══════════════════════════ */

const ACT_ROMAN: Record<Scene["act"], string> = { 1: "I", 2: "II", 3: "III", 4: "IV" };

/** The slot-card stamp: "Act II · The Empty Map Case". */
export function sceneStamp(sceneId: string): string {
  const scene = getScene(sceneId);
  return `Act ${ACT_ROMAN[scene.act]} · ${scene.title}`;
}

/** Where a fresh run begins (GDD §6.1). */
export { FIRST_SCENE_ID };

/** Type re-exports for the store and screens. */
export type { Flags };
