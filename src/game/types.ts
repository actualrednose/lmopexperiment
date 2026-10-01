/**
 * Core type definitions — GDD Chapters 3–5 and §9.1.
 *
 * Pure engine, dumb components, typed content (GDD §9.3): these types are
 * the contract between the rules kernel (src/game), the content modules
 * (src/content), the store (src/state) and the screens (src/components).
 */

/* ══════════════════════════ Abilities & skills ══════════════════════════ */

export type AbilityKey = "STR" | "DEX" | "CON" | "INT" | "WIS" | "CHA";
export type Abilities = Record<AbilityKey, number>;

/** The eighteen 5e skills; the adventure's content uses the twelve listed in GDD Table 8. */
export type SkillName =
  | "Athletics"
  | "Acrobatics"
  | "Sleight of Hand"
  | "Stealth"
  | "Arcana"
  | "History"
  | "Investigation"
  | "Nature"
  | "Religion"
  | "Animal Handling"
  | "Insight"
  | "Medicine"
  | "Perception"
  | "Survival"
  | "Deception"
  | "Intimidation"
  | "Performance"
  | "Persuasion";

export interface SkillEntry {
  skill: SkillName;
  ability: AbilityKey;
  bonus: number;
  /** Doubles proficiency (Perrin's Stealth and Deception). */
  expertise?: boolean;
}

/* ══════════════════════════ Dice & damage ══════════════════════════ */

export type DamageType =
  | "bludgeoning"
  | "piercing"
  | "slashing"
  | "fire"
  | "radiant"
  | "force";

/** A count d sides + plus expression, e.g. { count: 1, sides: 8, plus: 3 } = 1d8+3. */
export interface DiceExpr {
  count: number;
  sides: number;
  plus?: number;
}

export interface Attack {
  name: string;
  attackBonus: number;
  damage: DiceExpr;
  damageType: DamageType;
  /** Melee reach in feet (5 for most weapons). */
  reach?: number;
  /** [standard, long] range in feet for ranged and thrown weapons. */
  range?: [number, number];
  thrown?: boolean;
  notes?: string;
}

/* ══════════════════════════ Spells ══════════════════════════ */

export type SpellCost = "cantrip" | "slot";

export interface Spell {
  name: string;
  cost: SpellCost;
  /** One-line effect as worded in GDD Table 6 / the hero sheets. */
  effect: string;
  range?: string;
  /** Saving throw, when the spell allows one. */
  save?: { ability: AbilityKey; outcome: string };
  bonusAction?: boolean;
  /** Spell attack roll bonus, when the spell rolls to hit. */
  attackBonus?: number;
  damage?: DiceExpr;
  damageType?: DamageType;
  /** Locked behind the level-2 milestone (Elyndra's Misty Step). */
  minLevel?: 2;
}

/* ══════════════════════════ Traits & conditions ══════════════════════════ */

export type TraitKind = "feature" | "racial" | "signature";

export interface Trait {
  name: string;
  text: string;
  kind: TraitKind;
}

/** The complete condition set — exactly four, by design (GDD §4.4). */
export type ConditionName = "Hidden" | "Prone" | "Surprised" | "Down";

/* ══════════════════════════ Heroes ══════════════════════════ */

export type HeroId = "torvald" | "perrin" | "maera" | "elyndra";

export interface LevelUpSpec {
  /** One-line summary of the level-2 milestone upgrade. */
  summary: string;
  grants: string[];
}

/** A hero's static sheet data — the authoritative Chapter 3 statistics. */
export interface HeroSheet {
  id: HeroId;
  name: string;
  race: string;
  className: string;
  /** Combat role, one line (GDD Table 4). */
  role: string;
  /** Player-facing fantasy line from the Chapter 3 prose. */
  fantasy: string;
  /** Intro bio paragraph from the Chapter 3 prose. */
  bio: string;
  level: number;
  ac: number;
  /** e.g. "15 with mage armor" for Elyndra. */
  acNote?: string;
  hp: number;
  /** Speed in feet. */
  speed: number;
  abilities: Abilities;
  attacks: Attack[];
  /** Present for casters only. */
  spells?: Spell[];
  /** Maximum spell slots at level 1 (two; three from level 2). */
  spellSlots?: number;
  traits: Trait[];
  skills: SkillEntry[];
  level2: LevelUpSpec;
}

/** The mutable half of a hero — everything that changes during a run. */
export interface HeroRuntime {
  heroId: HeroId;
  level: number;
  hp: number;
  maxHp: number;
  spellSlotsUsed: number;
  conditions: ConditionName[];
  /** Named resources, e.g. { secondWind: true, actionSurge: false }. */
  resources: Record<string, boolean>;
}

/* ══════════════════════════ Enemies & battle ══════════════════════════ */

export type EnemyId = "goblin" | "wolf" | "klarg" | "yeemik";

export type BattleStatus = "active" | "victory" | "defeat";

export interface Combatant {
  id: string;
  side: "party" | "enemy";
  /** HeroId or EnemyId — which sheet/stat block this combatant draws from. */
  ref: HeroId | EnemyId;
  hp: number;
  maxHp: number;
  ac: number;
  conditions: ConditionName[];
  /** Grid position in 5-foot squares, or null when off-grid. */
  position: { x: number; y: number } | null;
  initiative: number;
  spellSlotsUsed: number;
  resources: Record<string, boolean>;
}

export interface BattleLogEntry {
  round: number;
  actor: string;
  text: string;
  /** The die math behind the entry, for the dice-you-can-see pillar. */
  roll?: {
    tag: string;
    d20?: number;
    modifier?: number;
    total?: number;
    target?: number;
    success?: boolean;
  };
}

/**
 * Self-contained battle state (GDD §9.1). Structural as of Session 1 —
 * the combat kernel implements and refines it in Session 2.
 */
export interface BattleState {
  arenaId: string;
  /** Grid size in 5-foot squares. */
  width: number;
  height: number;
  round: number;
  /** Combatant ids in initiative order. */
  order: string[];
  activeIndex: number;
  combatants: Record<string, Combatant>;
  log: BattleLogEntry[];
  status: BattleStatus;
}

/* ══════════════════════════ World & saves ══════════════════════════ */

/** The whole flag list — deliberately small (GDD §5.4). */
export interface Flags {
  knowsLayout: boolean;
  wolvesCalm: boolean;
  damBroken: boolean;
  klargDead: boolean;
  yeemikDeal: boolean;
  sildarRescued: boolean;
  goblinEscaped: boolean;
}

/** Four-step alert ladder (GDD §5.3). Never decreases. */
export type AlertLevel = 0 | 1 | 2 | 3;

export type ItemKind = "potion" | "ration" | "treasure" | "quest";

export interface InventoryItem {
  id: string;
  name: string;
  kind: ItemKind;
  count: number;
  description?: string;
}

export interface Inventory {
  items: InventoryItem[];
  gold: number;
}

export interface SaveMeta {
  version: number;
  playtimeSeconds: number;
  sceneStamp: string | null;
  savedAt: number | null;
}

/** The RNG cursor as persisted in the save (GDD §9.2). */
export interface RngState {
  seed: number;
  state: number;
}

/**
 * The store's full saveable shape — capped at the GDD §9.1 field list:
 * party, sceneId + history, flags, alert, inventory, battle, rng, meta.
 * Anything speculative belongs in the parking lot, not here.
 */
export interface WorldState {
  party: Record<HeroId, HeroRuntime>;
  sceneId: string | null;
  sceneHistory: string[];
  flags: Flags;
  alertLevel: AlertLevel;
  inventory: Inventory;
  battle: BattleState | null;
  rng: RngState;
  meta: SaveMeta;
}

/* ══════════════════════════ Save file (versioned from day one) ══════════════════════════ */

export type SaveSlot = "slot-1" | "slot-2" | "slot-3" | "autosave";

export interface SaveFile {
  version: number;
  savedAt: number;
  world: WorldState;
}

export interface SaveSlotInfo {
  slot: SaveSlot;
  label: string;
  /** null when the slot is empty. */
  save: SaveFile | null;
}
