"use client";

/**
 * The game shell — the single client-side view switcher. All gameplay
 * runs on the `/` route (story and battle modes arrive as views, not
 * pages), with overlays for the character sheet and save slots.
 */

import { useEffect } from "react";
import { PartyIntro } from "@/components/story/party-intro";
import { TitleScreen } from "@/components/story/title-screen";
import { CharacterSheetOverlay } from "@/components/ui/character-sheet";
import { SaveLoadOverlay } from "@/components/ui/save-load";
import { useUiStore } from "@/state/ui-store";

export function GameShell() {
  const view = useUiStore((s) => s.view);
  const hydratePreferences = useUiStore((s) => s.hydratePreferences);

  useEffect(() => {
    hydratePreferences();
  }, [hydratePreferences]);

  return (
    <div className="game-root min-h-screen bg-slate-deep font-sans text-mist">
      {view === "title" ? <TitleScreen /> : <PartyIntro />}

      {/* overlays */}
      <CharacterSheetOverlay />
      <SaveLoadOverlay />
    </div>
  );
}
