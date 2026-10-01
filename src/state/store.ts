/**
 * The game store (GDD §9.1) — a single Zustand store whose saveable shape
 * is deliberately capped at seven fields: party, sceneId + history, flags,
 * alert level, inventory, battle, RNG cursor, save metadata. Anything
 * speculative belongs in the parking lot, not here.
 *
 * Battle logic lands as pure reducers over this state in Session 2; the
 * scene runner writes flags and scene ids from Session 3.
 */

import { create } from "zustand";
import { createPartyRuntime } from "@/content/party";
import { Rng, randomSeed } from "@/game/rng";
import type {
  AlertLevel,
  Flags,
  HeroId,
  HeroRuntime,
  Inventory,
  RngState,
  SaveMeta,
  WorldState,
} from "@/game/types";
import { SAVE_SCHEMA_VERSION } from "./save";

const emptyFlags = (): Flags => ({
  knowsLayout: false,
  wolvesCalm: false,
  damBroken: false,
  klargDead: false,
  yeemikDeal: false,
  sildarRescued: false,
  goblinEscaped: false,
});

const emptyInventory = (): Inventory => ({ items: [], gold: 0 });

const initialMeta = (): SaveMeta => ({
  version: SAVE_SCHEMA_VERSION,
  playtimeSeconds: 0,
  sceneStamp: null,
  savedAt: null,
});

/** The full saveable world (the GDD's seven fields) + store actions. */
export interface GameStore extends WorldState {
  /** Start a fresh run: new seed, full party, clean flags. */
  newGame: () => void;
  /** Restore the whole world from a save file (used by Continue). */
  loadWorld: (world: WorldState) => void;
  /** Write a scene stamp and push the previous scene into history. */
  enterScene: (sceneId: string) => void;
}

function freshWorld(): WorldState {
  const rng = new Rng(randomSeed());
  return {
    party: createPartyRuntime(),
    sceneId: null,
    sceneHistory: [],
    flags: emptyFlags(),
    alertLevel: 0,
    inventory: emptyInventory(),
    battle: null,
    rng: rng.getCursor(),
    meta: initialMeta(),
  };
}

export const useGameStore = create<GameStore>()((set) => ({
  ...freshWorld(),

  newGame: () => set(freshWorld()),

  loadWorld: (world) =>
    set(() => ({
      party: world.party,
      sceneId: world.sceneId,
      sceneHistory: [...world.sceneHistory],
      flags: { ...world.flags },
      alertLevel: world.alertLevel,
      inventory: { ...world.inventory, items: [...world.inventory.items] },
      battle: world.battle,
      rng: { ...world.rng },
      meta: { ...world.meta },
    })),

  enterScene: (sceneId) =>
    set((state) => ({
      sceneId,
      sceneHistory:
        state.sceneId === null
          ? state.sceneHistory
          : [...state.sceneHistory, state.sceneId],
    })),
}));

/* Typed selectors used across screens. */
export const selectPartyArray = (state: GameStore): HeroRuntime[] =>
  (["torvald", "perrin", "maera", "elyndra"] as HeroId[]).map(
    (id) => state.party[id]
  );
