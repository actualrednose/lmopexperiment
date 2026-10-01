/**
 * Content lint (GDD §9.3) — the story graph must validate clean so the
 * Session 4 and 5 dungeon content drops stay boring: every choice target
 * exists, every check names a skill the party can actually roll, every
 * battle references a defined arena, acts never regress, every scene is
 * reachable, prose holds the 80–160-word template, and the rest
 * discipline (one per act, predicate-gated) holds.
 */

import { describe, expect, test } from "bun:test";
import { lintStoryContent } from "@/game/content-lint";
import { FIRST_SCENE_ID, STORY_SCENES } from "@/content/story";

describe("content linter — Acts I–II story graph", () => {
  test("the full scene graph lints clean", () => {
    const problems = lintStoryContent();
    if (problems.length > 0) {
      console.error("lint problems:\n" + problems.map((p) => `  - ${p}`).join("\n"));
    }
    expect(problems).toEqual([]);
  });

  test("decision scenes hold two to four choices; beats may carry one", () => {
    // Session 3 ruling recorded in SESSIONS.md: hub/decision scenes carry the
    // GDD's two-to-four choice cards; check-outcome variants narrate a
    // consequence and hand back with a single continuation.
    const HUBS = [
      "act1-job",
      "act1-road",
      "act1-camp",
      "act2-horses",
      "act2-runner",
      "act2-interrogate",
      "act2-aftermath",
      "act2-trail",
      "act2-arrival",
      "act2-levelup",
      "act3-door",
    ] as const;
    for (const id of HUBS) {
      const count = STORY_SCENES[id].choices.length;
      expect(count).toBeGreaterThanOrEqual(2);
      expect(count).toBeLessThanOrEqual(4);
    }
    // Every scene has at least one way forward (no dead ends).
    for (const scene of Object.values(STORY_SCENES)) {
      expect(scene.choices.length).toBeGreaterThanOrEqual(1);
    }
  });

  test("the graph is a real act structure: first scene in act 1, door in act 3", () => {
    expect(STORY_SCENES[FIRST_SCENE_ID].act).toBe(1);
    expect(STORY_SCENES["act3-door"].act).toBe(3);
    // The Session 3 handoff: the door is reachable and holds the milestone.
    expect(STORY_SCENES["act2-levelup"].milestone).toBe(true);
  });

  test("26 scenes ship (six beats plus their check variants)", () => {
    expect(Object.keys(STORY_SCENES).length).toBe(26);
  });
});
