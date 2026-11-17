export type VisibilityState = 'unknown' | 'remembered' | 'visible';

export type TileKind =
  | 'wall'
  | 'floor'
  | 'stairs_up'
  | 'stairs_down'
  | 'inn_counter'
  | 'inn_market'
  | 'inn_tavern'
  | 'inn_bed'
  | 'vault_seal';

export type FeatureKind =
  | 'chest'
  | 'mushroom'
  | 'corpse'
  | 'well'
  | 'puddle'
  | 'trap'
  | 'placed_trap';

export type MushroomColor = 'violet' | 'ocre' | 'pale' | 'carmin';

export type MushroomEffect = 'beneficial' | 'neutral' | 'toxic' | 'hallucinatory';

export type BiomeId =
  | 'auberge'
  | 'couloirs_administratifs'
  | 'champignonniere'
  | 'necropole_heros'
  | 'galerie_miniere'
  | 'reseau_inonde'
  | 'archive_terminale';

export type NpcKind = 'rat_percepteur' | 'squelette_concierge' | 'slime_territorial';

export interface TileFeature {
  id: string;
  kind: FeatureKind;
  consumed: boolean;
  revealed: boolean; // For traps: hidden until scanned/stepped/noticed
  mushroomColor?: MushroomColor;
  chestTrapped?: boolean;
  waterQuality?: 'pure' | 'trouble' | 'douteuse';
  corpseLooted?: boolean;
}

export interface TileMarker {
  text: string;
  createdTurn: number;
}

export interface NpcEntity {
  id: string;
  kind: NpcKind;
  name: string;
  role: string;
  x: number;
  y: number;
  paid: boolean;
  talked: boolean;
  recruited: boolean;
  fled: boolean;
  bribeCost: number;
  recruitCost: number;
  rumor: string;
}

export interface HeroTrace {
  x: number;
  y: number;
  kind: 'torch' | 'footprints' | 'door_forced';
  age: number;
}

export interface HeroState {
  status: 'absent' | 'announced' | 'active';
  name: string;
  archetype: string;
  countdown: number; // turns until arrival when announced
  x: number;
  y: number;
  stunTurns: number;
  stepsOnFloor: number;
}

export interface FloorTile {
  x: number;
  y: number;
  kind: TileKind;
  visibility: VisibilityState;
  feature?: TileFeature;
  trace?: HeroTrace;
  marker?: TileMarker;
}

export interface InnMeta {
  name: string;
  innkeeperName: string;
  formCode: string;
  rumor: string;
  visitedBefore: boolean;
}

export interface FloorMap {
  depth: number; // 0, -1, -2, ..., -99
  width: number;
  height: number;
  isInn: boolean;
  biome: BiomeId;
  biomeLabel: string;
  tiles: FloorTile[][];
  stairsUpPos: { x: number; y: number } | null;
  stairsDownPos: { x: number; y: number } | null;
  npcs: NpcEntity[];
  hero: HeroState | null;
  innMeta?: InnMeta;
  turnsSpentHere: number;
}

export type BagItemKind = 'ration' | 'waterskin' | 'trap' | 'marker' | 'jewel' | 'relic';

export interface BagItem {
  id: string;
  kind: BagItemKind;
  name: string;
  description: string;
  sellValue: number;
  consumable: boolean;
  quantity: number;
  maxStack: number;
}

export interface Ally {
  name: string;
  kind: NpcKind;
  role: string;
}

export interface LogEntry {
  id: string;
  turn: number;
  depth: number;
  text: string;
  tone: 'neutral' | 'info' | 'warn' | 'danger' | 'good';
}

export interface DialogueItem {
  id: string;
  speaker: string;
  badge?: string;
  text: string;
  deltaText?: string;
  tone: LogEntry['tone'];
  turn: number;
  depth: number;
}

export interface NarrativeStats {
  goblinName: string;
  goblinTrait: string;
  lastInnName: string;
  lastInnDepth: number;
  innsReached: number;
  stairsCrossed: number;
  npcsMet: number;
  npcsPaid: number;
  alliesRecruited: number;
  allySacrificedName: string | null;
  heroesEvaded: number;
  trapsTriggeredOnHeroes: number;
  treasuresSold: number;
  markersPlaced: number;
  lastMushroomColor: MushroomColor | null;
  lastMushroomEffect: MushroomEffect | null;
  causeOfDeath: string;
}

export type ModalContext =
  | { type: 'none' }
  | { type: 'action_menu' }
  | { type: 'inn_counter' }
  | { type: 'inn_market' }
  | { type: 'inn_tavern' }
  | { type: 'inn_dormitory' }
  | { type: 'npc'; npcId: string }
  | { type: 'feature'; x: number; y: number }
  | { type: 'bag'; pendingPickup?: BagItem; sourcePos?: { x: number; y: number } }
  | { type: 'camp_confirm' }
  | { type: 'marker_place' }
  | { type: 'map_overview' }
  | { type: 'vault_finale' };

export type ScreenMode = 'title' | 'playing' | 'dead' | 'victory' | 'memorial';

export interface MemorialEntry {
  id: string;
  seed: string;
  dateIso: string;
  title: string;
  epitaph: string;
  goblinName: string;
  maxDepth: number;
  turns: number;
  cause: string;
  outcome: 'dead' | 'survived_99';
  lastInnName: string;
}

export interface GameState {
  seed: string;
  screen: ScreenMode;
  turn: number;
  depth: number;
  maxDepthReached: number;
  player: { x: number; y: number };
  resources: {
    oil: number;
    food: number;
    water: number;
    hp: number;
    gold: number;
  };
  emptyWaterCounter: number;
  emptyFoodCounter: number;
  hallucinationTurns: number;
  localNoise: number; // 0.0 to 1.0+
  bag: BagItem[];
  ally: Ally | null;
  mushroomEffects: Record<MushroomColor, MushroomEffect>;
  discoveredMushrooms: Partial<Record<MushroomColor, MushroomEffect>>;
  floors: Record<number, FloorMap>;
  logs: LogEntry[];
  dialogueQueue: DialogueItem[];
  modal: ModalContext;
  narrative: NarrativeStats;
  lastMovementBlocked: boolean;
  lastEpitaph: MemorialEntry | null;
}

export interface ContextAction {
  id: string;
  label: string;
  shortHint: string;
  urgent?: boolean;
  execute: () => void;
}
