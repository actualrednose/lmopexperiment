"use client";

/**
 * The game shell — the single client-side view switcher. All gameplay
 * runs on the `/` route: story and battle arrive as views, not pages
 * (GDD §8), with overlays for the character sheet, save slots and the
 * inventory. An active battle always owns the screen while it lasts.
 */

import { useEffect } from "react";
import { ArenaLauncher } from "@/components/battle/arena-launcher";
import { BattleScreen } from "@/components/battle/battle-screen";
import { GameOverScreen } from "@/components/story/game-over";
import { PartyIntro } from "@/components/story/party-intro";
import { StoryScreen } from "@/components/story/story-screen";
import { TitleScreen } from "@/components/story/title-screen";
import { CharacterSheetOverlay } from "@/components/ui/character-sheet";
import { InventoryOverlay } from "@/components/ui/inventory-overlay";
import { SaveLoadOverlay } from "@/components/ui/save-load";
import { useGameStore } from "@/state/store";
import { useUiStore } from "@/state/ui-store";

export function GameShell() {
  const view = useUiStore((s) => s.view);
  const hydratePreferences = useUiStore((s) => s.hydratePreferences);
  const battle = useGameStore((s) => s.battle);

  useEffect(() => {
    hydratePreferences();
  }, [hydratePreferences]);

  return (
    <div className="game-root min-h-screen bg-slate-deep font-sans text-mist">
      {/* An active battle owns the screen — story and arena both hand
          over to it and are routed back on resolution. */}
      {battle ? (
        <BattleScreen />
      ) : view === "story" ? (
        <StoryScreen />
      ) : view === "gameover" ? (
        <GameOverScreen />
      ) : view === "title" ? (
        <TitleScreen />
      ) : view === "roster" ? (
        <PartyIntro />
      ) : (
        <ArenaLauncher />
      )}

      {/* overlays */}
      <CharacterSheetOverlay />
      <SaveLoadOverlay />
      <InventoryOverlay />
    </div>
  );
}
