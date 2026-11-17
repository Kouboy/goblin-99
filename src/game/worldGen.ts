import { CONFIG } from './config';
import { deriveFloorSeed, SeededRNG } from './rng';
import {
  BiomeId,
  FloorMap,
  FloorTile,
  InnMeta,
  MushroomColor,
  NpcEntity,
  NpcKind,
  TileFeature,
} from './types';

const INN_NAMES = [
  'Auberge du Rat Borgne',
  'Comptoir de la Chandelle Molle',
  'Relais du Formulaire B-12',
  'Taverne de l’Écuelle Fêlée',
  'Gîte du Sceau Humide',
  'Halte du Gobelin Prudent',
  'Sous-Sol des Quittances',
  'Refuge de la Mèche Courte',
];

const INNKEEPER_NAMES = [
  'Gribouille l’Archiviste',
  'Mère Rognure',
  'Maître Griffe-Douce',
  'Barnabé le Percepteur',
  'Tante Suie',
  'Greffier Cloporte',
];

const RUMORS = [
  'Un chevalier complétionniste fouille chaque placard au-dessous.',
  'Les flaques brillantes ne sont pas toujours de l’eau potable.',
  'Un rat percepteur accepte encore la petite monnaie contre de l’huile.',
  'Les pièges pliants immobilisent un héros pendant quatre précieux tours.',
  'Ne vous fiez jamais au champignon de la même couleur avant de l’avoir goûté.',
  'Plus vous descendez, plus les galeries s’étendent : prenez des repères au marché.',
  'En cas de manque d’huile, votre carte mémorisée et vos repères restent vos seuls guides.',
];

const NPC_TEMPLATES: Record<
  NpcKind,
  { names: string[]; role: string; bribe: number; recruit: number; rumors: string[] }
> = {
  rat_percepteur: {
    names: ['Raton-Taxe', 'Maître Grignote', 'Percepteur Grisou', 'Sieur Quittance'],
    role: 'Rat percepteur',
    bribe: 2,
    recruit: 4,
    rumors: [
      '« Article 4 alinéa 2 : toute lanterne nécessite un timbre ou 2 pièces d’or. »',
      '« J’ai vu un paladin descendre avec une torche trop vive deux galeries plus loin. »',
      '« Les reliques se négocient bien mieux au refuge qu’ici, croyez mon flair. »',
    ],
  },
  squelette_concierge: {
    names: ['Osselet', 'Concierge Cliquetis', 'Archiviste Fémur', 'Gardien Vertèbre'],
    role: 'Squelette concierge',
    bribe: 2,
    recruit: 4,
    rumors: [
      '« J’ai balayé ces dalles avant le passage des héros. Ne marchez pas sur les trappes. »',
      '« Le registre indique que l’escalier vers la surface reste libre derrière vous. »',
      '« Si vous recrutez mes os, je retiendrai un héros le temps d’un soupir. »',
    ],
  },
  slime_territorial: {
    names: ['Gloups', 'Gelée Règlementaire', 'Mucus-Chef', 'Flasque'],
    role: 'Slime territorial',
    bribe: 2,
    recruit: 4,
    rumors: [
      '« *Bloop.* Zone réservée aux espèces rampantes accréditées. »',
      '« *Gloup.* L’eau qui sent la rouille vient d’en haut. »',
      '« *Schlurp.* Contre quelques pièces, je peux absorber une lance pour vous. »',
    ],
  },
};

const BIOME_DEFS: Array<{ id: BiomeId; label: string }> = [
  { id: 'couloirs_administratifs', label: 'Couloirs administratifs' },
  { id: 'champignonniere', label: 'Champignonnière humide' },
  { id: 'necropole_heros', label: 'Nécropole de héros' },
  { id: 'galerie_miniere', label: 'Galerie minière' },
  { id: 'reseau_inonde', label: 'Réseau inondé' },
];

const MUSHROOM_COLORS: MushroomColor[] = ['violet', 'ocre', 'pale', 'carmin'];

/**
 * Progressive floor size scaling with depth so deeper expeditions feel vast and treacherous.
 */
export function getFloorDimensions(depth: number): { width: number; height: number } {
  if (isInnDepth(depth)) {
    return { width: CONFIG.INN_W, height: CONFIG.INN_H };
  }
  if (depth <= CONFIG.TARGET_DEPTH) {
    return { width: 13, height: 13 };
  }
  const abs = Math.abs(depth);
  if (abs <= 3) return { width: 11, height: 11 };
  if (abs <= 11) return { width: 15, height: 15 };
  if (abs <= 23) return { width: 19, height: 19 };
  if (abs <= 47) return { width: 23, height: 23 };
  return { width: 27, height: 27 };
}

function createEmptyGrid(
  width: number,
  height: number,
  defaultKind: 'wall' | 'floor' = 'wall',
): FloorTile[][] {
  const tiles: FloorTile[][] = [];
  for (let y = 0; y < height; y++) {
    const row: FloorTile[] = [];
    for (let x = 0; x < width; x++) {
      row.push({
        x,
        y,
        kind: defaultKind,
        visibility: 'unknown',
      });
    }
    tiles.push(row);
  }
  return tiles;
}

export function isPassableForBfs(tile: FloorTile): boolean {
  return tile.kind !== 'wall';
}

/**
 * Verifies with BFS that all target positions are reachable from startPos.
 */
export function verifyConnectivity(
  tiles: FloorTile[][],
  width: number,
  height: number,
  startPos: { x: number; y: number },
  targets: Array<{ x: number; y: number }>,
): boolean {
  const visited = new Set<string>();
  const queue: Array<{ x: number; y: number }> = [startPos];
  visited.add(`${startPos.x},${startPos.y}`);

  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  while (queue.length > 0) {
    const curr = queue.shift()!;
    for (const [dx, dy] of dirs) {
      const nx = curr.x + dx;
      const ny = curr.y + dy;
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
      const key = `${nx},${ny}`;
      if (visited.has(key)) continue;
      if (!isPassableForBfs(tiles[ny][nx])) continue;
      visited.add(key);
      queue.push({ x: nx, y: ny });
    }
  }

  return targets.every((t) => visited.has(`${t.x},${t.y}`));
}

export function isInnDepth(depth: number): boolean {
  return (
    depth === 0 ||
    (depth < 0 &&
      depth > CONFIG.TARGET_DEPTH &&
      Math.abs(depth) % CONFIG.FLOORS_PER_INN === 0)
  );
}

/**
 * Generates an explorable 9x9 Inn floor.
 */
export function generateInnFloor(runSeed: string, depth: number): FloorMap {
  const rng = new SeededRNG(deriveFloorSeed(runSeed, depth, 0));
  const width = CONFIG.INN_W;
  const height = CONFIG.INN_H;
  const tiles = createEmptyGrid(width, height, 'floor');

  for (let x = 0; x < width; x++) {
    tiles[0][x].kind = 'wall';
    tiles[height - 1][x].kind = 'wall';
  }
  for (let y = 0; y < height; y++) {
    tiles[y][0].kind = 'wall';
    tiles[y][width - 1].kind = 'wall';
  }

  tiles[3][3].kind = 'wall';
  tiles[3][5].kind = 'wall';

  tiles[1][4].kind = 'inn_counter';
  tiles[2][1].kind = 'inn_market';
  tiles[2][7].kind = 'inn_tavern';
  tiles[6][1].kind = 'inn_bed';

  let stairsUpPos: { x: number; y: number } | null = null;
  if (depth < 0) {
    stairsUpPos = { x: 4, y: 2 };
    tiles[stairsUpPos.y][stairsUpPos.x].kind = 'stairs_up';
  }

  const stairsDownPos = { x: 4, y: 7 };
  tiles[stairsDownPos.y][stairsDownPos.x].kind = 'stairs_down';

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      tiles[y][x].visibility = 'visible';
    }
  }

  const innIndex = Math.abs(depth) / CONFIG.FLOORS_PER_INN;
  const innName =
    depth === 0
      ? 'Avant-Poste du Registre Zéro'
      : INN_NAMES[(innIndex + rng.int(0, INN_NAMES.length - 1)) % INN_NAMES.length];

  const innMeta: InnMeta = {
    name: innName,
    innkeeperName: rng.pick(INNKEEPER_NAMES),
    formCode: `CERFA-G${Math.abs(depth).toString().padStart(2, '0')}-${rng.int(10, 99)}`,
    rumor: rng.pick(RUMORS),
    visitedBefore: depth === 0,
  };

  return {
    depth,
    width,
    height,
    isInn: true,
    biome: 'auberge',
    biomeLabel: innName,
    tiles,
    stairsUpPos,
    stairsDownPos,
    npcs: [],
    hero: null,
    innMeta,
    turnsSpentHere: 0,
  };
}

/**
 * Generates the terminal vault at depth -99.
 */
function generateTerminalVaultFloor(runSeed: string): FloorMap {
  const rng = new SeededRNG(deriveFloorSeed(runSeed, CONFIG.TARGET_DEPTH, 0));
  const { width, height } = getFloorDimensions(CONFIG.TARGET_DEPTH);
  const tiles = createEmptyGrid(width, height, 'wall');

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      tiles[y][x].kind = 'floor';
    }
  }

  // Grand archival pillars
  const pillars = [
    [3, 3],
    [3, 9],
    [9, 3],
    [9, 9],
    [5, 6],
    [7, 6],
  ];
  for (const [py, px] of pillars) {
    tiles[py][px].kind = 'wall';
  }

  const stairsUpPos = { x: 6, y: 1 };
  tiles[stairsUpPos.y][stairsUpPos.x].kind = 'stairs_up';

  tiles[6][6].kind = 'vault_seal';

  tiles[6][2].feature = {
    id: `feat-${CONFIG.TARGET_DEPTH}-c1`,
    kind: 'chest',
    consumed: false,
    revealed: true,
    chestTrapped: false,
  };
  tiles[6][10].feature = {
    id: `feat-${CONFIG.TARGET_DEPTH}-c2`,
    kind: 'chest',
    consumed: false,
    revealed: true,
    chestTrapped: rng.chance(0.3),
  };

  return {
    depth: CONFIG.TARGET_DEPTH,
    width,
    height,
    isInn: false,
    biome: 'archive_terminale',
    biomeLabel: 'Chambre des Archives -99',
    tiles,
    stairsUpPos,
    stairsDownPos: null,
    npcs: [],
    hero: null,
    turnsSpentHere: 0,
  };
}

/**
 * Generates a labyrinthine multi-room + branching corridor floor whose size scales with depth.
 */
export function generateDungeonFloor(runSeed: string, depth: number): FloorMap {
  if (isInnDepth(depth)) {
    return generateInnFloor(runSeed, depth);
  }
  if (depth <= CONFIG.TARGET_DEPTH) {
    return generateTerminalVaultFloor(runSeed);
  }

  const absDepth = Math.abs(depth);
  const { width, height } = getFloorDimensions(depth);
  const areaFactor = (width * height) / 81; // 1.5x at 11x11, ~2.8x at 15x15, up to 9x at 27x27

  for (let attempt = 0; attempt < 30; attempt++) {
    const rng = new SeededRNG(deriveFloorSeed(runSeed, depth, attempt));
    const tiles = createEmptyGrid(width, height, 'wall');

    const targetRooms = Math.min(14, Math.max(4, Math.round(3.5 + areaFactor * 1.4)));
    const centers: Array<{ x: number; y: number }> = [];

    for (let r = 0; r < targetRooms; r++) {
      const rw = rng.int(2, width >= 19 ? 4 : 3);
      const rh = rng.int(2, height >= 19 ? 4 : 3);
      const rx = rng.int(1, width - rw - 1);
      const ry = rng.int(1, height - rh - 1);

      for (let y = ry; y < ry + rh; y++) {
        for (let x = rx; x < rx + rw; x++) {
          tiles[y][x].kind = 'floor';
        }
      }
      centers.push({
        x: Math.floor(rx + rw / 2),
        y: Math.floor(ry + rh / 2),
      });
    }

    const carveCorridor = (a: { x: number; y: number }, b: { x: number; y: number }) => {
      let cx = a.x;
      let cy = a.y;
      if (rng.chance(0.5)) {
        while (cx !== b.x) {
          tiles[cy][cx].kind = 'floor';
          cx += cx < b.x ? 1 : -1;
        }
        while (cy !== b.y) {
          tiles[cy][cx].kind = 'floor';
          cy += cy < b.y ? 1 : -1;
        }
      } else {
        while (cy !== b.y) {
          tiles[cy][cx].kind = 'floor';
          cy += cy < b.y ? 1 : -1;
        }
        while (cx !== b.x) {
          tiles[cy][cx].kind = 'floor';
          cx += cx < b.x ? 1 : -1;
        }
      }
      tiles[b.y][b.x].kind = 'floor';
    };

    // Connect each room to its nearest previous room (spanning tree) + occasional loops
    for (let i = 1; i < centers.length; i++) {
      let nearestIdx = 0;
      let nearestDist = Infinity;
      for (let j = 0; j < i; j++) {
        const d =
          Math.abs(centers[i].x - centers[j].x) + Math.abs(centers[i].y - centers[j].y);
        if (d < nearestDist) {
          nearestDist = d;
          nearestIdx = j;
        }
      }
      carveCorridor(centers[i], centers[nearestIdx]);
      if (i > 2 && rng.chance(0.32)) {
        carveCorridor(centers[i], centers[rng.int(0, i - 1)]);
      }
    }

    // Add winding dead-end side branches (alcoves where treasures/risks hide)
    const alcoveCount = Math.max(2, Math.floor(width / 4));
    const deadEndTips: Array<{ x: number; y: number }> = [];
    for (let a = 0; a < alcoveCount; a++) {
      const origin = rng.pick(centers);
      let cx = origin.x;
      let cy = origin.y;
      const dirs = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ];
      const [dx, dy] = rng.pick(dirs);
      const len = rng.int(2, Math.max(3, Math.floor(width / 4)));
      for (let step = 0; step < len; step++) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx <= 0 || nx >= width - 1 || ny <= 0 || ny >= height - 1) break;
        cx = nx;
        cy = ny;
        tiles[cy][cx].kind = 'floor';
      }
      if (cx !== origin.x || cy !== origin.y) {
        deadEndTips.push({ x: cx, y: cy });
      }
    }

    const floorCells: Array<{ x: number; y: number }> = [];
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        if (tiles[y][x].kind === 'floor') {
          floorCells.push({ x, y });
        }
      }
    }

    if (floorCells.length < Math.max(20, Math.floor(width * height * 0.22))) continue;

    // Pick stairsUpPos and stairsDownPos maximized for exploration choice
    const shuffled = rng.shuffle(floorCells);
    const stairsUpPos = shuffled[0];
    let stairsDownPos = shuffled[1];
    let bestDist = 0;

    for (const candidate of shuffled.slice(1, Math.min(shuffled.length, 60))) {
      const dist =
        Math.abs(candidate.x - stairsUpPos.x) + Math.abs(candidate.y - stairsUpPos.y);
      if (dist > bestDist) {
        bestDist = dist;
        stairsDownPos = candidate;
      }
    }

    if (bestDist < Math.max(5, Math.floor(width * 0.6))) continue;

    tiles[stairsUpPos.y][stairsUpPos.x].kind = 'stairs_up';
    tiles[stairsDownPos.y][stairsDownPos.x].kind = 'stairs_down';

    const biomeDef =
      BIOME_DEFS[(Math.floor((absDepth - 1) / 2) + rng.int(0, 1)) % BIOME_DEFS.length];

    const occupied = new Set<string>([
      `${stairsUpPos.x},${stairsUpPos.y}`,
      `${stairsDownPos.x},${stairsDownPos.y}`,
    ]);

    const prioritizedCells = [
      ...rng.shuffle(deadEndTips),
      ...shuffled,
    ].filter((c) => !occupied.has(`${c.x},${c.y}`));

    const takeFreeCell = (): { x: number; y: number } | null => {
      for (const c of prioritizedCells) {
        const key = `${c.x},${c.y}`;
        if (!occupied.has(key)) {
          occupied.add(key);
          return c;
        }
      }
      return null;
    };

    const importantTargets: Array<{ x: number; y: number }> = [stairsDownPos];
    let featCounter = 0;

    const addFeature = (
      pos: { x: number; y: number } | null,
      partial: Omit<TileFeature, 'id'>,
    ) => {
      if (!pos) return;
      featCounter++;
      tiles[pos.y][pos.x].feature = {
        id: `feat-${depth}-${featCounter}`,
        ...partial,
      };
      importantTargets.push(pos);
    };

    // Water sources scale gently with floor size so larger labyrinths remain solvable
    const waterSources =
      width >= 19 ? 2 : biomeDef.id === 'reseau_inonde' || rng.chance(0.8) ? 1 : 0;
    for (let w = 0; w < waterSources; w++) {
      const isWell = rng.chance(0.55);
      addFeature(takeFreeCell(), {
        kind: isWell ? 'well' : 'puddle',
        consumed: false,
        revealed: true,
        waterQuality: isWell
          ? rng.chance(0.75)
            ? 'pure'
            : 'trouble'
          : rng.chance(0.45)
          ? 'trouble'
          : 'douteuse',
      });
    }

    // Mushrooms
    const mushCount =
      (biomeDef.id === 'champignonniere' ? 2 : 1) + (width >= 19 ? 1 : 0);
    for (let m = 0; m < mushCount; m++) {
      addFeature(takeFreeCell(), {
        kind: 'mushroom',
        consumed: false,
        revealed: true,
        mushroomColor: rng.pick(MUSHROOM_COLORS),
      });
    }

    // Corpses
    const corpseCount =
      biomeDef.id === 'necropole_heros' || width >= 19 ? 2 : rng.chance(0.6) ? 1 : 0;
    for (let c = 0; c < corpseCount; c++) {
      const corpsePos = takeFreeCell();
      addFeature(corpsePos, {
        kind: 'corpse',
        consumed: false,
        revealed: true,
        corpseLooted: false,
      });
      if (corpsePos) {
        tiles[corpsePos.y][corpsePos.x].trace = {
          x: corpsePos.x,
          y: corpsePos.y,
          kind: 'footprints',
          age: rng.int(1, 5),
        };
      }
    }

    // Chests (tempting rewards hidden in alcoves)
    const chestCount =
      biomeDef.id === 'galerie_miniere' || width >= 15 ? 2 : rng.chance(0.7) ? 1 : 0;
    for (let ch = 0; ch < chestCount; ch++) {
      addFeature(takeFreeCell(), {
        kind: 'chest',
        consumed: false,
        revealed: true,
        chestTrapped: rng.chance(0.28),
      });
    }

    // Hidden traps
    const trapCount = Math.max(1, Math.floor(areaFactor * 0.9));
    for (let t = 0; t < trapCount; t++) {
      const trapPos = takeFreeCell();
      if (trapPos) {
        featCounter++;
        tiles[trapPos.y][trapPos.x].feature = {
          id: `feat-${depth}-${featCounter}`,
          kind: 'trap',
          consumed: false,
          revealed: false,
        };
      }
    }

    // Hero traces scattered across branches
    const traceCount = Math.max(1, Math.floor(width / 6));
    for (let tr = 0; tr < traceCount; tr++) {
      const tracePos = takeFreeCell();
      if (tracePos) {
        tiles[tracePos.y][tracePos.x].trace = {
          x: tracePos.x,
          y: tracePos.y,
          kind: rng.chance(0.5) ? 'torch' : 'door_forced',
          age: rng.int(2, 8),
        };
      }
    }

    // Resident NPCs (up to 2 on vast floors)
    const npcs: NpcEntity[] = [];
    const npcSlots = width >= 19 ? 2 : rng.chance(0.62) ? 1 : 0;
    for (let n = 0; n < npcSlots; n++) {
      const npcPos = takeFreeCell();
      if (npcPos) {
        const kind = rng.pick<NpcKind>([
          'rat_percepteur',
          'squelette_concierge',
          'slime_territorial',
        ]);
        const tpl = NPC_TEMPLATES[kind];
        npcs.push({
          id: `npc-${depth}-${n + 1}`,
          kind,
          name: rng.pick(tpl.names),
          role: tpl.role,
          x: npcPos.x,
          y: npcPos.y,
          paid: false,
          talked: false,
          recruited: false,
          fled: false,
          bribeCost: tpl.bribe,
          recruitCost: tpl.recruit,
          rumor: rng.pick(tpl.rumors),
        });
        importantTargets.push(npcPos);
      }
    }

    if (!verifyConnectivity(tiles, width, height, stairsUpPos, importantTargets)) {
      continue;
    }

    return {
      depth,
      width,
      height,
      isInn: false,
      biome: biomeDef.id,
      biomeLabel: biomeDef.label,
      tiles,
      stairsUpPos,
      stairsDownPos,
      npcs,
      hero: {
        status: 'absent',
        name: rng.pick([
          'Sire Galahad-le-Pressé',
          'Dame Isolde la Fouine',
          'Paladin Vaurien',
          'Rôdeur Balthazar',
        ]),
        archetype: 'Complétionniste',
        countdown: CONFIG.HUNTER_DELAY,
        x: stairsDownPos.x,
        y: stairsDownPos.y,
        stunTurns: 0,
        stepsOnFloor: 0,
      },
      turnsSpentHere: 0,
    };
  }

  // Guaranteed open fallback
  const fallbackTiles = createEmptyGrid(width, height, 'wall');
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      fallbackTiles[y][x].kind = 'floor';
    }
  }
  const stairsUpPos = { x: 1, y: 1 };
  const stairsDownPos = { x: width - 2, y: height - 2 };
  fallbackTiles[stairsUpPos.y][stairsUpPos.x].kind = 'stairs_up';
  fallbackTiles[stairsDownPos.y][stairsDownPos.x].kind = 'stairs_down';

  return {
    depth,
    width,
    height,
    isInn: false,
    biome: 'couloirs_administratifs',
    biomeLabel: 'Couloirs administratifs',
    tiles: fallbackTiles,
    stairsUpPos,
    stairsDownPos,
    npcs: [],
    hero: {
      status: 'absent',
      name: 'Paladin Vaurien',
      archetype: 'Complétionniste',
      countdown: CONFIG.HUNTER_DELAY,
      x: stairsDownPos.x,
      y: stairsDownPos.y,
      stunTurns: 0,
      stepsOnFloor: 0,
    },
    turnsSpentHere: 0,
  };
}
