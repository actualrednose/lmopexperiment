"use client";

/**
 * The game shell — the single client-side view switcher. All gameplay
 * runs on the `/` route (story and battle modes arrive as views, not
 * pages), with overlays for the character sheet and save slots.
 */

import { useEffect } from "react";
import { ArenaLauncher } from "@/components/battle/arena-launcher";
import { BattleScreen } from "@/components/battle/battle-screen";
import { PartyIntro } from "@/components/story/party-intro";
import { TitleScreen } from "@/components/story/title-screen";
import { CharacterSheetOverlay } from "@/components/ui/character-sheet";
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
      {view === "title" && <TitleScreen />}
      {view === "roster" && <PartyIntro />}
      {view === "arena" &&
        (battle ? <BattleScreen /> : <ArenaLauncher />)}

      {/* overlays */}
      <CharacterSheetOverlay />
      <SaveLoadOverlay />
    </div>
  );
}
