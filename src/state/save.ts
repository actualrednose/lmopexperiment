/**
 * Versioned save system (GDD §9.5) — schema versioned from day one.
 *
 * Three manual slots plus one autosave, stored in localStorage. The schema
 * carries a version integer and the full world state; SAVE_MIGRATIONS
 * upgrades old saves forward (migration i upgrades version i+1 → i+2).
 * Corrupt slots are quarantined with a clear key rather than silently
 * overwritten; quota failures are reported to the caller as false.
 *
 * The save/load round-trip is exercised for real from Session 3; this
 * module is the schema's single source of truth from Session 1.
 */

import type { SaveFile, SaveSlot, SaveSlotInfo, WorldState } from "@/game/types";

/** The save schema version written by this build. Bump + add a migration on change. */
export const SAVE_SCHEMA_VERSION = 1;

/** The four persistence slots: three manual plus the autosave. */
export const SAVE_SLOTS: readonly SaveSlot[] = [
  "slot-1",
  "slot-2",
  "slot-3",
  "autosave",
] as const;

export const SLOT_LABELS: Record<SaveSlot, string> = {
  "slot-1": "Save Slot 1",
  "slot-2": "Save Slot 2",
  "slot-3": "Save Slot 3",
  autosave: "Autosave",
};

const KEY_PREFIX = "goblin-arrows:save:";

export function slotKey(slot: SaveSlot): string {
  return `${KEY_PREFIX}${slot}`;
}

/** Migration i upgrades a save from version i+1 to version i+2. */
export type Migration = (raw: Record<string, unknown>) => Record<string, unknown>;

/** Empty until the first schema bump; a version-bump test lands in Session 6. */
export const SAVE_MIGRATIONS: readonly Migration[] = [];

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

/** Structural guard: enough shape to trust the file before migration. */
function looksLikeSaveFile(x: unknown): x is SaveFile {
  if (!isRecord(x)) return false;
  return (
    typeof x.version === "number" &&
    Number.isInteger(x.version) &&
    x.version >= 1 &&
    typeof x.savedAt === "number" &&
    isRecord(x.world) &&
    isRecord(x.world.party) &&
    isRecord(x.world.flags)
  );
}

/** Serialize a world state into a save file (does not write any slot). */
export function serializeWorld(world: WorldState): SaveFile {
  return {
    version: SAVE_SCHEMA_VERSION,
    savedAt: Date.now(),
    world: structuredClone(world),
  };
}

function migrate(raw: Record<string, unknown>): Record<string, unknown> {
  let current = raw;
  let version = typeof current.version === "number" ? current.version : 0;
  while (version < SAVE_SCHEMA_VERSION) {
    const migration = SAVE_MIGRATIONS[version - 1];
    if (!migration) {
      throw new Error(
        `No migration from save version ${version} to ${version + 1}; ` +
          `this build supports ${SAVE_SCHEMA_VERSION}.`
      );
    }
    current = migration(current);
    version = typeof current.version === "number" ? current.version : version + 1;
  }
  return current;
}

/** Read a slot; returns null when empty. Corrupt data is quarantined, not lost. */
export function readSlot(slot: SaveSlot): SaveFile | null {
  if (typeof window === "undefined") return null;
  const key = slotKey(slot);
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(key);
  } catch {
    return null;
  }
  if (raw === null) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    const migrated = migrate(parsed as Record<string, unknown>);
    if (!looksLikeSaveFile(migrated)) throw new Error("Save failed structural validation");
    if (migrated.version > SAVE_SCHEMA_VERSION) {
      throw new Error(
        `Save from a newer build (v${migrated.version}); this build supports v${SAVE_SCHEMA_VERSION}.`
      );
    }
    return migrated as SaveFile;
  } catch (error) {
    quarantine(slot, raw, error);
    return null;
  }
}

function quarantine(slot: SaveSlot, raw: string, error: unknown): void {
  try {
    const qKey = `${slotKey(slot)}:quarantine:${Date.now()}`;
    window.localStorage.setItem(
      qKey,
      JSON.stringify({ reason: String(error), raw })
    );
    window.localStorage.removeItem(slotKey(slot));
  } catch {
    // Even quarantine failed (quota?) — nothing more we can safely do.
  }
}

/** Write a world to a slot. Returns false when storage rejected the write. */
export function writeSlot(slot: SaveSlot, world: WorldState): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(slotKey(slot), JSON.stringify(serializeWorld(world)));
    return true;
  } catch {
    return false; // quota exceeded or storage disabled — caller reports it
  }
}

export function deleteSlot(slot: SaveSlot): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(slotKey(slot));
  } catch {
    // ignore
  }
}

/** All four slots with their contents, for the save/load screen. */
export function listSlots(): SaveSlotInfo[] {
  return SAVE_SLOTS.map((slot) => ({
    slot,
    label: SLOT_LABELS[slot],
    save: readSlot(slot),
  }));
}
