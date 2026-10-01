/**
 * Ephemeral UI state — view routing, overlays and player preferences.
 * Kept out of the game store so saves never serialize transient UI.
 */

import { create } from "zustand";
import type { HeroId } from "@/game/types";

export type GameView = "title" | "roster";

const REDUCED_MOTION_KEY = "goblin-arrows:reduced-motion";

function applyReducedMotion(on: boolean): void {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute(
    "data-ga-reduced-motion",
    on ? "true" : "false"
  );
}

export interface UiStore {
  view: GameView;
  /** Which hero's character sheet is open (overlay), or null. */
  sheetHeroId: HeroId | null;
  saveOverlayOpen: boolean;
  /** null until hydrated on mount; then the effective preference. */
  reducedMotion: boolean | null;

  setView: (view: GameView) => void;
  openSheet: (heroId: HeroId) => void;
  closeSheet: () => void;
  setSaveOverlay: (open: boolean) => void;
  setReducedMotion: (on: boolean) => void;
  /** Call once on mount: loads the stored preference or the system one. */
  hydratePreferences: () => void;
}

export const useUiStore = create<UiStore>()((set) => ({
  view: "title",
  sheetHeroId: null,
  saveOverlayOpen: false,
  reducedMotion: null,

  setView: (view) => set({ view }),
  openSheet: (heroId) => set({ sheetHeroId: heroId }),
  closeSheet: () => set({ sheetHeroId: null }),
  setSaveOverlay: (open) => set({ saveOverlayOpen: open }),
  setReducedMotion: (on) => {
    try {
      window.localStorage.setItem(REDUCED_MOTION_KEY, on ? "on" : "off");
    } catch {
      // storage unavailable — the toggle still applies for this session
    }
    set({ reducedMotion: on });
    applyReducedMotion(on);
  },
  hydratePreferences: () => {
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(REDUCED_MOTION_KEY);
    } catch {
      stored = null;
    }
    const system =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const on = stored === "on" ? true : stored === "off" ? false : system;
    set({ reducedMotion: on });
    applyReducedMotion(on);
  },
}));
