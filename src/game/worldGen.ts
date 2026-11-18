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
  PitLandmark,
  PitRelation,
  TileFeature,
} from './types';

const INN_NAMES = [
  'Balcon du Rat Borgne',
  'Comptoir du Grand Puits',
  'Relais du Formulaire B-12',
  'Terrasse de l’Écuelle Fêlée',
  'Gîte du Treuil Humide',
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
  'On raconte qu’un gobelin niveau 1 touchant le fond du Grand Puits recevrait du Maître le rang de Héros.',
  'Pour les uns, la Prophétie du Niveau 1 est sacrée ; pour moi, elle fait surtout vendre des gourdes.',
  'Trois étages plus bas, quelqu’un a laissé brûler une lanterne sur une passerelle brisée.',
  'Les routes le long du Grand Puits sont rapides mais exposées aux Héros qui descendent.',
  'Les galeries extérieures sont sombres et tortueuses, mais elles cachent puits et vivres.',
  'Au fond de l’abîme, le Maître du Donjon tiendrait lui-même le grand registre des règles.',
  'Plus vous descendez, plus les anneaux autour du Puits s’élargissent : posez des repères à la craie.',
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
      '« La Prophétie du Gobelin Niveau 1 ? Timbre de candidature obligatoire : 2 pièces, non remboursable ! »',
      '« Des câbles et des chaînes descendent tout droit vers -99. Qui donc graisse encore ces treuils ? »',
      '« Les Héros longent souvent les corniches du Puits ; contournez-les par les boyaux extérieurs. »',
    ],
  },
  squelette_concierge: {
    names: ['Osselet', 'Concierge Cliquetis', 'Archiviste Fémur', 'Gardien Vertèbre'],
    role: 'Squelette concierge',
    bribe: 2,
    recruit: 4,
    rumors: [
      '« Avant d’être ici, j’ai vu un gobelin tomber du bord à -12. On n’a jamais entendu l’impact. »',
      '« Certains prient la Prophétie du Niveau 1. Moi, je balaie seulement les marches pour le Maître. »',
      '« J’ai noté l’emplacement des trappes autour du gouffre. Contre deux pièces, je vous montre le plan. »',
    ],
  },
  slime_territorial: {
    names: ['Gloups', 'Gelée Règlementaire', 'Mucus-Chef', 'Flasque'],
    role: 'Slime territorial',
    bribe: 2,
    recruit: 4,
    rumors: [
      '« *Bloop.* En bas, le Maître ne ressemble pas à un monstre. Il écrit. Il efface. »',
      '« *Gloup.* Le courant d’air qui monte du Grand Puits sent l’encre froide et la vieille pierre. »',
      '« *Schlurp.* La Prophétie est peut-être une blague du Maître pour faire descendre les faibles. »',
    ],
  },
};

const BIOME_DEFS: Array<{ id: BiomeId; label: string }> = [
  { id: 'couloirs_administratifs', label: 'Corniches administratives' },
  { id: 'champignonniere', label: 'Champignonnière du Puits' },
  { id: 'necropole_heros', label: 'Nécropole suspendue' },
  { id: 'galerie_miniere', label: 'Galerie des treuils' },
  { id: 'reseau_inonde', label: 'Conduits suintants' },
];

const MUSHROOM_COLORS: MushroomColor[] = ['violet', 'ocre', 'pale', 'carmin'];

const LANDMARK_POOL: Array<{
  kind: PitLandmark['kind'];
  label: string;
  description: string;
}> = [
  {
    kind: 'broken_bridge',
    label: 'Passerelle suspendue',
    description: 'une étroite passerelle de bois jetée au travers du vide',
  },
  {
    kind: 'rusty_crane',
    label: 'Treuil à chaînes',
    description: 'un vieux monte-charge rouillé grinçant contre la paroi',
  },
  {
    kind: 'hero_camp',
    label: 'Brasero d’avant-garde',
    description: 'une lueur d’huile rougeoyante sur une corniche exposée',
  },
  {
    kind: 'ancient_arch',
    label: 'Arche démesurée',
    description: 'des contreforts cyclopéens qui plongent sans fin vers le bas',
  },
  {
    kind: 'silent_monolith',
    label: 'Poutre numérotée',
    description: 'une charpente verticale gravée de chiffres incompréhensibles',
  },
];

/**
 * Deterministic vertical shaft landmark for a given floor depth,
 * allowing upper floors to glimpse structures that actually exist deeper down.
 */
export function getPitLandmarkForDepth(runSeed: string, depth: number): PitLandmark | null {
  if (depth >= 0 || depth <= CONFIG.TARGET_DEPTH || isInnDepth(depth)) return null;
  const rng = new SeededRNG(deriveFloorSeed(runSeed, depth, 777));
  const abs = Math.abs(depth);
  const idx =
    abs <= 10
      ? rng.int(0, 2)
      : abs <= 25
      ? rng.int(0, 3)
      : rng.int(1, LANDMARK_POOL.length - 1);
  const tpl = LANDMARK_POOL[idx];
  return {
    depth,
    kind: tpl.kind,
    label: tpl.label,
    description: tpl.description,
  };
}

/**
 * Narrative perception bracket for the Great Pit by depth.
 */
export function getPitPerceptionNote(depth: number): string {
  const abs = Math.abs(depth);
  if (abs <= 10) {
    return 'L’abîme s’ouvre d’un seul tenant : vous distinguez des chaînes proches et quelques feux minuscules loin dessous.';
  }
  if (abs <= 25) {
    return 'Vous reconnaissez désormais les poutres et les conduits aperçus depuis les premiers étages.';
  }
  if (abs <= 50) {
    return 'Les infrastructures du Puits paraissent plus anciennes, disproportionnées, bâties pour bien plus grand que des gobelins.';
  }
  if (abs <= 75) {
    return 'Des câbles s’animent sans vent et certaines arches semblent inverser le sens des mesures.';
  }
  if (abs <= 98) {
    return 'L’air vibre d’un silence attentif. Tout converge vers le fond : la présence du Maître du Donjon se fait tangible.';
  }
  return 'Le Grand Puits touche ici son terme. Les câbles venus de quatre-vingt-dix-neuf étages s’immobilisent devant le Grand Registre.';
}

/**
 * Progressive floor size scaling with depth around the central Great Pit.
 */
export function getFloorDimensions(depth: number): { width: number; height: number } {
  if (isInnDepth(depth)) {
    return { width: CONFIG.INN_W, height: CONFIG.INN_H };
  }
  if (depth <= CONFIG.TARGET_DEPTH) {
    return { width: 13, height: 13 };
  }
  const abs = Math.abs(depth);
  if (abs <= 3) return { width: 13, height: 13 };
  if (abs <= 11) return { width: 17, height: 17 };
  if (abs <= 23) return { width: 21, height: 21 };
  if (abs <= 47) return { width: 25, height: 25 };
  return { width: 27, height: 27 };
}

function getPitRectForSize(width: number, height: number): {
  x: number;
  y: number;
  w: number;
  h: number;
} {
  const pitSize = width <= 13 ? 3 : width <= 21 ? 5 : 7;
  const x = Math.floor((width - pitSize) / 2);
  const y = Math.floor((height - pitSize) / 2);
  return { x, y, w: pitSize, h: pitSize };
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
  return tile.kind !== 'wall' && tile.kind !== 'pit' && tile.kind !== 'pit_winch';
}

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
 * Generates an explorable 9x9 Inn floor with a permanent architectural view onto Le Grand Puits.
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

  const innIndex = Math.abs(depth) / CONFIG.FLOORS_PER_INN;
  const relations: PitRelation[] = ['terrace', 'bay', 'platform', 'scaffolding'];
  const pitRelation = relations[innIndex % relations.length];

  let pitRect = { x: 7, y: 2, w: 2, h: 5 };
  if (pitRelation === 'terrace') {
    // Open east terrace overlooking the Grand Puits
    pitRect = { x: 7, y: 2, w: 2, h: 5 };
    for (let y = pitRect.y; y < pitRect.y + pitRect.h; y++) {
      for (let x = pitRect.x; x < pitRect.x + pitRect.w; x++) {
        tiles[y][x].kind = 'pit';
      }
    }
    tiles[3][3].kind = 'wall';
    tiles[1][4].kind = 'inn_counter';
    tiles[2][1].kind = 'inn_market';
    tiles[4][6].kind = 'inn_tavern';
    tiles[6][1].kind = 'inn_bed';
  } else if (pitRelation === 'bay') {
    // Great bay window directly behind the innkeeper's counter
    pitRect = { x: 5, y: 0, w: 3, h: 3 };
    for (let y = pitRect.y; y < pitRect.y + pitRect.h; y++) {
      for (let x = pitRect.x; x < pitRect.x + pitRect.w; x++) {
        tiles[y][x].kind = 'pit';
      }
    }
    tiles[1][3].kind = 'inn_counter';
    tiles[2][1].kind = 'inn_market';
    tiles[5][7].kind = 'inn_tavern';
    tiles[6][1].kind = 'inn_bed';
  } else if (pitRelation === 'platform') {
    // Suspended delivery platform jutting over the lower-right abyss
    pitRect = { x: 6, y: 4, w: 3, h: 4 };
    for (let y = pitRect.y; y < pitRect.y + pitRect.h; y++) {
      for (let x = pitRect.x; x < pitRect.x + pitRect.w; x++) {
        tiles[y][x].kind = 'pit';
      }
    }
    tiles[5][6].kind = 'pit_bridge';
    tiles[5][7].kind = 'pit_bridge';
    tiles[1][4].kind = 'inn_counter';
    tiles[2][1].kind = 'inn_market';
    tiles[2][7].kind = 'inn_tavern';
    tiles[6][1].kind = 'inn_bed';
  } else {
    // Scaffolding around an open central-right shaft
    pitRect = { x: 5, y: 3, w: 2, h: 3 };
    for (let y = pitRect.y; y < pitRect.y + pitRect.h; y++) {
      for (let x = pitRect.x; x < pitRect.x + pitRect.w; x++) {
        tiles[y][x].kind = 'pit';
      }
    }
    tiles[1][4].kind = 'inn_counter';
    tiles[2][1].kind = 'inn_market';
    tiles[2][7].kind = 'inn_tavern';
    tiles[6][1].kind = 'inn_bed';
  }

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

  const innName =
    depth === 0
      ? 'Avant-Poste du Grand Puits'
      : INN_NAMES[(innIndex + rng.int(0, INN_NAMES.length - 1)) % INN_NAMES.length];

  const innMeta: InnMeta = {
    name: innName,
    innkeeperName: rng.pick(INNKEEPER_NAMES),
    formCode: `CERFA-P${Math.abs(depth).toString().padStart(2, '0')}-${rng.int(10, 99)}`,
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
    pitRect,
    pitRelation,
    npcs: [],
    hero: null,
    innMeta,
    turnsSpentHere: 0,
  };
}

/**
 * Generates the bottom of the Great Pit at depth -99: the Dungeon Master's Terminal Archive.
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

  // The base of the vertical Pit shaft sits at the heart-north of the chamber
  const pitRect = { x: 5, y: 3, w: 3, h: 3 };
  for (let y = pitRect.y; y < pitRect.y + pitRect.h; y++) {
    for (let x = pitRect.x; x < pitRect.x + pitRect.w; x++) {
      tiles[y][x].kind = 'pit';
    }
  }
  tiles[4][6].kind = 'pit_bridge';

  const pillars = [
    [2, 2],
    [2, 10],
    [9, 3],
    [9, 9],
  ];
  for (const [py, px] of pillars) {
    tiles[py][px].kind = 'wall';
  }

  const stairsUpPos = { x: 6, y: 1 };
  tiles[stairsUpPos.y][stairsUpPos.x].kind = 'stairs_up';

  tiles[8][6].kind = 'vault_seal';

  tiles[8][2].feature = {
    id: `feat-${CONFIG.TARGET_DEPTH}-c1`,
    kind: 'chest',
    consumed: false,
    revealed: true,
    chestTrapped: false,
  };
  tiles[8][10].feature = {
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
    biomeLabel: 'Fond du Grand Puits (-99)',
    tiles,
    stairsUpPos,
    stairsDownPos: null,
    pitRect,
    pitRelation: 'fond',
    npcs: [],
    hero: null,
    turnsSpentHere: 0,
  };
}

/**
 * Generates a labyrinthine floor wrapped around the continuous central Great Pit,
 * offering Inner Rim / Bridge routes vs Peripheral Outer Galleries.
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
  const areaFactor = (width * height) / 81;
  const pitRect = getPitRectForSize(width, height);
  const landmark = getPitLandmarkForDepth(runSeed, depth) ?? undefined;

  // Choose Pit relation coherent with visible landmark when present
  let pitRelation: PitRelation = 'corniche';
  if (landmark?.kind === 'broken_bridge') {
    pitRelation = 'passerelle';
  } else if (landmark?.kind === 'rusty_crane') {
    pitRelation = 'treuil';
  } else {
    const cycle: PitRelation[] = ['corniche', 'passerelle', 'fenetre', 'treuil'];
    pitRelation = cycle[(absDepth + Math.floor(absDepth / 4)) % cycle.length];
  }

  const inPitRect = (x: number, y: number) =>
    x >= pitRect.x &&
    x < pitRect.x + pitRect.w &&
    y >= pitRect.y &&
    y < pitRect.y + pitRect.h;

  for (let attempt = 0; attempt < 36; attempt++) {
    const rng = new SeededRNG(deriveFloorSeed(runSeed, depth, attempt));
    const tiles = createEmptyGrid(width, height, 'wall');

    // 1. Carve peripheral rooms in outer ring around the Great Pit
    const targetRooms = Math.min(14, Math.max(4, Math.round(3.5 + areaFactor * 1.15)));
    const centers: Array<{ x: number; y: number }> = [];

    for (let r = 0; r < targetRooms * 3 && centers.length < targetRooms; r++) {
      const rw = rng.int(2, width >= 19 ? 4 : 3);
      const rh = rng.int(2, height >= 19 ? 4 : 3);
      const rx = rng.int(1, width - rw - 1);
      const ry = rng.int(1, height - rh - 1);

      // Keep rooms out of the Pit shaft core
      let overlapsPit = false;
      for (let y = ry; y < ry + rh; y++) {
        for (let x = rx; x < rx + rw; x++) {
          if (inPitRect(x, y)) {
            overlapsPit = true;
            break;
          }
        }
        if (overlapsPit) break;
      }
      if (overlapsPit) continue;

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

    if (centers.length < 3) continue;

    // 2. Carve Inner Rim / Pit Openings so every floor has a distinct relation to Le Grand Puits
    const pitRimAnchors: Array<{ x: number; y: number }> = [];
    const midX = pitRect.x + Math.floor(pitRect.w / 2);
    const midY = pitRect.y + Math.floor(pitRect.h / 2);

    if (pitRelation === 'corniche') {
      // Exposed inner gallery hugging 3 sides of the Pit
      const skipSide = rng.int(0, 3);
      if (skipSide !== 0) {
        for (let x = Math.max(1, pitRect.x - 1); x <= Math.min(width - 2, pitRect.x + pitRect.w); x++) {
          tiles[pitRect.y - 1][x].kind = 'floor';
        }
        pitRimAnchors.push({ x: midX, y: pitRect.y - 1 });
      }
      if (skipSide !== 1) {
        for (let x = Math.max(1, pitRect.x - 1); x <= Math.min(width - 2, pitRect.x + pitRect.w); x++) {
          tiles[pitRect.y + pitRect.h][x].kind = 'floor';
        }
        pitRimAnchors.push({ x: midX, y: pitRect.y + pitRect.h });
      }
      if (skipSide !== 2) {
        for (let y = Math.max(1, pitRect.y - 1); y <= Math.min(height - 2, pitRect.y + pitRect.h); y++) {
          tiles[y][pitRect.x - 1].kind = 'floor';
        }
        pitRimAnchors.push({ x: pitRect.x - 1, y: midY });
      }
      if (skipSide !== 3) {
        for (let y = Math.max(1, pitRect.y - 1); y <= Math.min(height - 2, pitRect.y + pitRect.h); y++) {
          tiles[y][pitRect.x + pitRect.w].kind = 'floor';
        }
        pitRimAnchors.push({ x: pitRect.x + pitRect.w, y: midY });
      }
    } else if (pitRelation === 'passerelle') {
      // Two opposing landings connected by a suspended walkway right across the abyss
      const horizontal = rng.chance(0.5);
      if (horizontal) {
        for (let y = pitRect.y; y < pitRect.y + pitRect.h; y++) {
          tiles[y][pitRect.x - 1].kind = 'floor';
          tiles[y][pitRect.x + pitRect.w].kind = 'floor';
        }
        pitRimAnchors.push({ x: pitRect.x - 1, y: midY });
        pitRimAnchors.push({ x: pitRect.x + pitRect.w, y: midY });
      } else {
        for (let x = pitRect.x; x < pitRect.x + pitRect.w; x++) {
          tiles[pitRect.y - 1][x].kind = 'floor';
          tiles[pitRect.y + pitRect.h][x].kind = 'floor';
        }
        pitRimAnchors.push({ x: midX, y: pitRect.y - 1 });
        pitRimAnchors.push({ x: midX, y: pitRect.y + pitRect.h });
      }
    } else if (pitRelation === 'fenetre') {
      // Rock balconies piercing up to the Pit rim at 2-3 separate vantage points
      const openings = [
        { x: midX, y: pitRect.y - 1 },
        { x: pitRect.x - 1, y: midY },
        { x: pitRect.x + pitRect.w, y: midY },
      ];
      for (const op of openings) {
        tiles[op.y][op.x].kind = 'floor';
        pitRimAnchors.push(op);
      }
    } else {
      // 'treuil': Service dock along one edge + opposite lookout
      for (let x = pitRect.x - 1; x <= pitRect.x + pitRect.w; x++) {
        tiles[pitRect.y - 1][x].kind = 'floor';
      }
      tiles[pitRect.y + pitRect.h][midX].kind = 'floor';
      pitRimAnchors.push({ x: midX, y: pitRect.y - 1 });
      pitRimAnchors.push({ x: midX, y: pitRect.y + pitRect.h });
    }

    // Add pitRimAnchors to corridor graph so outer rooms connect cleanly to Pit edges
    const allNodes = [...centers, ...pitRimAnchors];

    const carveCorridor = (a: { x: number; y: number }, b: { x: number; y: number }) => {
      let cx = a.x;
      let cy = a.y;
      const tryStep = (nx: number, ny: number) => {
        if (!inPitRect(nx, ny)) {
          tiles[ny][nx].kind = 'floor';
        }
      };

      let safety = 0;
      while ((cx !== b.x || cy !== b.y) && safety < width * height) {
        safety++;
        const stepX = cx !== b.x ? (cx < b.x ? 1 : -1) : 0;
        const stepY = cy !== b.y ? (cy < b.y ? 1 : -1) : 0;

        if (stepX !== 0 && !inPitRect(cx + stepX, cy) && (stepY === 0 || rng.chance(0.55))) {
          cx += stepX;
          tryStep(cx, cy);
        } else if (stepY !== 0 && !inPitRect(cx, cy + stepY)) {
          cy += stepY;
          tryStep(cx, cy);
        } else if (stepX !== 0) {
          // Detour around Pit border
          const detourY = cy < midY ? -1 : 1;
          if (cy + detourY > 0 && cy + detourY < height - 1 && !inPitRect(cx, cy + detourY)) {
            cy += detourY;
            tryStep(cx, cy);
          } else {
            break;
          }
        } else if (stepY !== 0) {
          const detourX = cx < midX ? -1 : 1;
          if (cx + detourX > 0 && cx + detourX < width - 1 && !inPitRect(cx + detourX, cy)) {
            cx += detourX;
            tryStep(cx, cy);
          } else {
            break;
          }
        } else {
          break;
        }
      }
    };

    for (let i = 1; i < allNodes.length; i++) {
      let nearestIdx = 0;
      let nearestDist = Infinity;
      for (let j = 0; j < i; j++) {
        const d =
          Math.abs(allNodes[i].x - allNodes[j].x) + Math.abs(allNodes[i].y - allNodes[j].y);
        if (d < nearestDist) {
          nearestDist = d;
          nearestIdx = j;
        }
      }
      carveCorridor(allNodes[i], allNodes[nearestIdx]);
      if (i > 2 && rng.chance(0.35)) {
        carveCorridor(allNodes[i], allNodes[rng.int(0, i - 1)]);
      }
    }

    // Dead-end side branches
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
        if (nx <= 0 || nx >= width - 1 || ny <= 0 || ny >= height - 1 || inPitRect(nx, ny)) {
          break;
        }
        cx = nx;
        cy = ny;
        tiles[cy][cx].kind = 'floor';
      }
      if (cx !== origin.x || cy !== origin.y) {
        deadEndTips.push({ x: cx, y: cy });
      }
    }

    // 3. Carve the Great Pit Void inside pitRect + suspended bridges / winches
    for (let y = pitRect.y; y < pitRect.y + pitRect.h; y++) {
      for (let x = pitRect.x; x < pitRect.x + pitRect.w; x++) {
        tiles[y][x].kind = 'pit';
      }
    }

    if (pitRelation === 'passerelle') {
      const horiz = tiles[midY][pitRect.x - 1].kind === 'floor' && tiles[midY][pitRect.x + pitRect.w].kind === 'floor';
      if (horiz) {
        for (let x = pitRect.x; x < pitRect.x + pitRect.w; x++) {
          tiles[midY][x].kind = 'pit_bridge';
        }
      } else {
        for (let y = pitRect.y; y < pitRect.y + pitRect.h; y++) {
          tiles[y][midX].kind = 'pit_bridge';
        }
      }
    }

    let winchPos: { x: number; y: number } | null = null;
    if (pitRelation === 'treuil') {
      tiles[pitRect.y][midX].kind = 'pit_winch';
      winchPos = { x: midX, y: pitRect.y };
      // Also guarantee access tile just north of winch
      tiles[pitRect.y - 1][midX].kind = 'floor';
    }

    // Collect passable floor cells (not bridges/winches for stairs)
    const floorCells: Array<{ x: number; y: number }> = [];
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        if (tiles[y][x].kind === 'floor') {
          floorCells.push({ x, y });
        }
      }
    }

    if (floorCells.length < Math.max(22, Math.floor(width * height * 0.22))) continue;

    const shuffled = rng.shuffle(floorCells);
    const stairsUpPos = shuffled[0];
    let stairsDownPos = shuffled[1];
    let bestDist = 0;

    for (const candidate of shuffled.slice(1, Math.min(shuffled.length, 65))) {
      const dist =
        Math.abs(candidate.x - stairsUpPos.x) + Math.abs(candidate.y - stairsUpPos.y);
      if (dist > bestDist) {
        bestDist = dist;
        stairsDownPos = candidate;
      }
    }

    if (bestDist < Math.max(6, Math.floor(width * 0.55))) continue;

    tiles[stairsUpPos.y][stairsUpPos.x].kind = 'stairs_up';
    tiles[stairsDownPos.y][stairsDownPos.x].kind = 'stairs_down';

    const biomeDef =
      BIOME_DEFS[(Math.floor((absDepth - 1) / 2) + rng.int(0, 1)) % BIOME_DEFS.length];

    const occupied = new Set<string>([
      `${stairsUpPos.x},${stairsUpPos.y}`,
      `${stairsDownPos.x},${stairsDownPos.y}`,
    ]);
    if (winchPos) {
      occupied.add(`${winchPos.x},${winchPos.y - 1}`);
    }

    const prioritizedCells = [...rng.shuffle(deadEndTips), ...shuffled].filter(
      (c) => !occupied.has(`${c.x},${c.y}`),
    );

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

    const importantTargets: Array<{ x: number; y: number }> = [
      stairsDownPos,
      ...pitRimAnchors.filter((p) => tiles[p.y][p.x].kind === 'floor'),
    ];
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

    const npcs: NpcEntity[] = [];
    const npcSlots = width >= 19 ? 2 : rng.chance(0.65) ? 1 : 0;
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
      pitRect,
      pitRelation,
      pitLandmark: landmark,
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

  // Guaranteed open fallback wrapped around the Pit
  const fallbackTiles = createEmptyGrid(width, height, 'wall');
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      fallbackTiles[y][x].kind = inPitRect(x, y) ? 'pit' : 'floor';
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
    biomeLabel: 'Corniches administratives',
    tiles: fallbackTiles,
    stairsUpPos,
    stairsDownPos,
    pitRect,
    pitRelation: 'corniche',
    pitLandmark: landmark,
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
