/**
 * Central balancing and world configuration for Goblin Survivor -99 (v2).
 * Every constant carries explicit units and is actively wired into the engine.
 */
export const CONFIG = {
  // Camera viewport size (tiles displayed simultaneously on Canvas for crisp mobile touch)
  VIEW_W: 9,
  VIEW_H: 9,

  // Inn grid dimensions (compact & fast to navigate)
  INN_W: 9,
  INN_H: 9,

  // Progression structure (negative depths: 0 is outpost inn, -4/-8/... are inns, -99 is terminal vault)
  START_DEPTH: 0,
  TARGET_DEPTH: -99,
  FLOORS_PER_INN: 4,

  // Bag capacity (slots) and stack size for trail markers
  PORTAGE: 6,
  MARKER_STACK_MAX: 4,

  // Resource caps
  MAX_HP: 10,
  MAX_OIL: 50,
  MAX_FOOD: 12,
  MAX_WATER: 12,

  // Starting reserves (matched to v1 baseline)
  START: {
    oil: 46,
    food: 7,
    water: 9,
    hp: 10,
    gold: 9,
  },

  // Per-turn consumption inside dungeon floors (not drained inside inns)
  OIL_STEP: 0.62,
  WATER_STEP: 0.09,
  FOOD_STEP: 0.045,

  // Starvation & dehydration penalties when reserve reaches 0
  EMPTY_WATER_DAMAGE: 0.85,
  EMPTY_FOOD_DAMAGE: 0.55,
  EMPTY_WATER_EVERY: 2, // turns
  EMPTY_FOOD_EVERY: 4, // turns

  // Lantern vision thresholds (circular Euclidean radius in tiles)
  OIL_VISION: [
    { minOil: 18, radius: 4 },
    { minOil: 7, radius: 3 },
    { minOil: 1, radius: 2 },
  ],
  DARK_VISION: 1, // radius when oil === 0

  // Inn arrival guarantee & welcome relief
  INN_ARRIVAL_BONUS: {
    hp: 3,
    gold: 2,
    oil: 6,
  },
  INN_OIL: 27, // minimum guaranteed oil floor on discovering a new inn
  INN_FOOD: 5, // minimum guaranteed food floor on discovering a new inn
  INN_WATER: 7, // minimum guaranteed water floor on discovering a new inn

  // Local noise & hero threat system
  NOISE_DECAY: 0.06, // per turn
  NOISE_ALERT_THRESHOLD: 0.45,
  NOISE_HIGH_THRESHOLD: 0.75,
  HUNTER_DELAY: 5, // turns between announcement and hero appearance
  HUNTER_CHANCE: 0.02, // base trigger factor after turn 4 on a floor
  NOISE_HUNTER: 0.015, // extra spawn probability added per unit of local noise
  HERO_TRAP_STUN_TURNS: 4, // turns a hero stays immobilized in a trap

  // Camping cost & reward
  CAMP: {
    oilCost: 3,
    foodCost: 1,
    waterCost: 1,
    hpHeal: 3,
    baseAmbushChance: 0.22,
  },

  // Market prices & quantities
  MARKET: {
    oilPack: { amount: 15, price: 3 },
    foodPack: { amount: 4, price: 2 },
    waterPack: { amount: 5, price: 2 },
    rationItem: { price: 2 },
    waterskinItem: { price: 2 },
    trapItem: { price: 4 },
    markerPack: { amount: 4, price: 2 },
    dormitoryPrice: 3,
  },

  // Treasure sell values at inns
  SELL_VALUES: {
    jewel: 3,
    relic: 6,
  },

  // Critical alert thresholds for readable HUD & quick-action suggestion
  CRITICAL_THRESHOLDS: {
    oil: 10,
    water: 2.5,
    food: 2.0,
    hp: 3.5,
  },

  // Memorial localStorage key & limit
  MEMORIAL_KEY: 'goblin_survivor_99_memorial_v2',
  MEMORIAL_MAX_ENTRIES: 30,
} as const;
