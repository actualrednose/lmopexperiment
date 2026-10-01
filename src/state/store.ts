/**
 * The game store (GDD §9.1) — a single Zustand store whose saveable shape
 * is deliberately capped at seven fields: party, sceneId + history, flags,
 * alert level, inventory, battle, RNG cursor, save metadata. Anything
 * speculative belongs in the parking lot, not here.
 *
 * Session 3 turns the store into the story runner's orchestration layer:
 * choice commits (pure resolution in src/game/scenes.ts), the staged check
 * flow, battle handoff and return, act-transition autosaves, and the
 * world picker the save system reads. The EPHEMERAL fields below the world
 * fields (stagedTransition, battleRoute, battleOrigin, lastRest,
 * gameOverStats) are flow state only — `worldFromStore` never includes
 * them, so saves stay exactly the seven GDD fields.
 */

import { create } from "zustand";
import { getArena } from "@/content/arenas";
import { startingInventory } from "@/content/items";
import { createPartyRuntime } from "@/content/party";
import { FIRST_SCENE_ID } from "@/content/story";
import { applyCommand, type BattleCommand } from "@/game/combat/actions";
import { createBattle } from "@/game/combat/core";
import {
  applyBattleResult,
  resolveChoice,
  sceneStamp,
  type BattleRoute,
  type ChoiceTransition,
} from "@/game/scenes";
import type { RestRoll } from "@/game/scene-types";
import { Rng, randomSeed } from "@/game/rng";
import type {
  AlertLevel,
  BattleStats,
  Flags,
  HeroId,
  Inventory,
  RngState,
  SaveMeta,
  WorldState,
} from "@/game/types";
import { SAVE_SCHEMA_VERSION, writeSlot } from "./save";
import { useUiStore } from "./ui-store";

const emptyFlags = (): Flags => ({
  knowsLayout: false,
  wolvesCalm: false,
  damBroken: false,
  klargDead: false,
  yeemikDeal: false,
  sildarRescued: false,
  goblinEscaped: false,
});

const initialMeta = (): SaveMeta => ({
  version: SAVE_SCHEMA_VERSION,
  playtimeSeconds: 0,
  sceneStamp: null,
  savedAt: null,
});

function freshWorld(seed?: number): WorldState {
  const rng = new Rng(seed === undefined ? randomSeed() : seed >>> 0);
  return {
    party: createPartyRuntime(),
    sceneId: null,
    sceneHistory: [],
    flags: emptyFlags(),
    alertLevel: 0,
    inventory: startingInventory(),
    battle: null,
    rng: rng.getCursor(),
    meta: initialMeta(),
  };
}

/** Exactly the seven GDD §9.1 fields — what saves serialize. */
export function worldFromStore(state: GameStore): WorldState {
  return {
    party: state.party,
    sceneId: state.sceneId,
    sceneHistory: state.sceneHistory,
    flags: state.flags,
    alertLevel: state.alertLevel,
    inventory: state.inventory,
    battle: state.battle,
    rng: state.rng,
    meta: state.meta,
  };
}

/** The world patch used by every transition (same seven fields). */
function patchWorld(world: WorldState) {
  return {
    party: world.party,
    sceneId: world.sceneId,
    sceneHistory: world.sceneHistory,
    flags: world.flags,
    alertLevel: world.alertLevel,
    inventory: world.inventory,
    battle: world.battle,
    rng: world.rng,
    meta: world.meta,
  };
}

/**
 * The scene record: push the outgoing scene into history, set the new
 * scene id and write the slot-card stamp (GDD §9.5).
 */
function withSceneRecord(
  world: WorldState,
  prevSceneId: string | null,
  nextSceneId: string
): WorldState {
  return {
    ...world,
    sceneId: nextSceneId,
    sceneHistory: prevSceneId
      ? [...world.sceneHistory, prevSceneId]
      : world.sceneHistory,
    meta: { ...world.meta, sceneStamp: sceneStamp(nextSceneId) },
  };
}

/** The full saveable world (the GDD's seven fields) + store actions. */
export interface GameStore extends WorldState {
  /* ── ephemeral flow state (never saved; see the module note) ── */
  /** A resolved check waiting on its dice overlay before the world advances. */
  stagedTransition: ChoiceTransition | null;
  /** Routing for the active story battle (set at the battle choice). */
  battleRoute: BattleRoute | null;
  /** Whether the active battle belongs to the run or the debug arena. */
  battleOrigin: "story" | "arena" | null;
  /** The most recent short rest's rolls, for the rest panel. */
  lastRest: RestRoll[] | null;
  /** The defeat card's statistics, held after the battle clears. */
  gameOverStats: { arenaTitle: string; stats: BattleStats } | null;

  /** Start a fresh run; an optional seed pins the RNG (QA + tests). */
  newGame: (seed?: number) => void;
  /** Restore the whole world from a save file (used by Continue). */
  loadWorld: (world: WorldState) => void;
  /** Enter the run's first scene (the party intro's Begin button). */
  beginStory: () => void;
  /** Commit a scene choice: pure resolution, then battle/stage/apply. */
  commitChoice: (sceneId: string, choiceId: string) => void;
  /** Apply the staged check's transition (the overlay's Continue). */
  confirmPendingCheck: () => void;
  /** Fold the finished story battle back into the run and route the story. */
  resolveStoryBattle: () => void;

  /* ── Session 2: the debug arena (GDD §10.2) ── */
  /** Start a seeded, resettable arena battle — isolated from the run party. */
  startArenaBattle: (arenaId: string, level: 1 | 2, seed: number) => void;
  /** Apply one kernel command to the active battle (pure reducer). */
  battleCommand: (cmd: BattleCommand) => void;
  /** Leave the battle back to the arena launcher. */
  exitBattle: () => void;
}

export const useGameStore = create<GameStore>()((set, get) => ({
  ...freshWorld(),
  stagedTransition: null,
  battleRoute: null,
  battleOrigin: null,
  lastRest: null,
  gameOverStats: null,

  newGame: (seed) =>
    set({
      ...freshWorld(seed),
      stagedTransition: null,
      battleRoute: null,
      battleOrigin: null,
      lastRest: null,
      gameOverStats: null,
    }),

  loadWorld: (world) =>
    set({
      party: world.party,
      sceneId: world.sceneId,
      sceneHistory: [...world.sceneHistory],
      flags: { ...world.flags },
      alertLevel: world.alertLevel,
      inventory: { ...world.inventory, items: [...world.inventory.items] },
      // Saves exist only at scene boundaries (GDD §9.5), where battle is
      // null; a battle inside a loaded file is out of contract and cleared.
      battle: null,
      rng: { ...world.rng },
      meta: { ...world.meta },
      stagedTransition: null,
      battleRoute: null,
      battleOrigin: null,
      lastRest: null,
      gameOverStats: null,
    }),

  beginStory: () => {
    const world = worldFromStore(get());
    const next = withSceneRecord(world, world.sceneId, FIRST_SCENE_ID);
    set({
      ...patchWorld(next),
      stagedTransition: null,
      lastRest: null,
    });
    useUiStore.getState().setView("story");
  },

  commitChoice: (sceneId, choiceId) => {
    const state = get();
    if (state.stagedTransition) return; // a check overlay is already pending
    const transition = resolveChoice(worldFromStore(state), sceneId, choiceId);

    if (transition.battle) {
      // Story battle: the current scene holds until the fight resolves.
      set({
        ...patchWorld(transition.world),
        battle: transition.battle.state,
        battleRoute: transition.battle.route,
        battleOrigin: "story",
      });
      return;
    }
    if (transition.check) {
      // Stage the check: the dice overlay plays the genuine engine roll,
      // the world advances only on Continue (deterministic either way).
      set({ stagedTransition: transition });
      return;
    }
    applyTransitionNow(transition);
  },

  confirmPendingCheck: () => {
    const staged = get().stagedTransition;
    if (!staged) return;
    set({ stagedTransition: null });
    applyTransitionNow(staged);
  },

  resolveStoryBattle: () => {
    const state = get();
    const battle = state.battle;
    if (!battle || battle.status === "active") return;
    const route: BattleRoute =
      state.battleRoute ?? { onVictory: state.sceneId ?? FIRST_SCENE_ID, onVictoryFled: null };
    const result = applyBattleResult(worldFromStore(state), battle, route);

    if (result.defeat) {
      set({
        ...patchWorld(result.world),
        battle: null,
        battleRoute: null,
        battleOrigin: null,
        gameOverStats: { arenaTitle: getArena(battle.arenaId).title, stats: battle.stats },
      });
      useUiStore.getState().setView("gameover");
      return;
    }

    const next = withSceneRecord(result.world, result.world.sceneId, result.nextSceneId!);
    set({
      ...patchWorld(next),
      battle: null,
      battleRoute: null,
      battleOrigin: null,
    });
    if (result.actAdvanced) writeSlot("autosave", next);
    useUiStore.getState().setView("story");
  },

  startArenaBattle: (arenaId, level, seed) =>
    set({
      battle: createBattle(getArena(arenaId), { level, seed }),
      battleOrigin: "arena",
      battleRoute: null,
    }),

  battleCommand: (cmd) =>
    set((state) => ({
      battle: state.battle ? applyCommand(state.battle, cmd) : state.battle,
    })),

  exitBattle: () =>
    set({
      battle: null,
      battleRoute: null,
      battleOrigin: null,
    }),
}));

/** Internal: apply a fully-resolved non-battle transition to the store. */
function applyTransitionNow(transition: ChoiceTransition): void {
  const store = useGameStore.getState();
  const prevSceneId = store.sceneId;
  const next = withSceneRecord(transition.world, prevSceneId, transition.nextSceneId);
  useGameStore.setState({
    ...patchWorld(next),
    lastRest: transition.rest,
  });
  // Acts are the autosave unit (GDD §2.1): write the autosave on crossing.
  if (transition.actAdvanced) writeSlot("autosave", next);
  if (transition.toTitle) useUiStore.getState().setView("title");
}

/* Typed selectors used across screens. */
export const selectPartyArray = (state: GameStore) =>
  (["torvald", "perrin", "maera", "elyndra"] as HeroId[]).map(
    (id) => state.party[id]
  );

/** Re-exported for the screens: the first scene of a fresh run. */
export { FIRST_SCENE_ID };
export type { AlertLevel, Inventory, RngState };
