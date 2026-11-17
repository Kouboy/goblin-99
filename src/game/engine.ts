import { soundFx } from './audio';
import { CONFIG } from './config';
import { buildEpitaph, rollGoblinIdentity, saveMemorialEntry } from './epitaph';
import { normalizeSeedString, SeededRNG } from './rng';
import {
  BagItem,
  BagItemKind,
  ContextAction,
  DialogueItem,
  FloorMap,
  GameState,
  LogEntry,
  MushroomColor,
  MushroomEffect,
  NpcEntity,
} from './types';
import { generateDungeonFloor, isInnDepth } from './worldGen';

export function makeBagItem(
  kind: BagItemKind,
  uid: string,
  quantity = 1,
): BagItem {
  switch (kind) {
    case 'ration':
      return {
        id: uid,
        kind,
        name: 'Ration sèche',
        description: 'Restaure +4 vivres immédiatement.',
        sellValue: 1,
        consumable: true,
        quantity: 1,
        maxStack: 1,
      };
    case 'waterskin':
      return {
        id: uid,
        kind,
        name: 'Gourde scellée',
        description: 'Restaure +5 eau immédiatement.',
        sellValue: 1,
        consumable: true,
        quantity: 1,
        maxStack: 1,
      };
    case 'trap':
      return {
        id: uid,
        kind,
        name: 'Piège pliant',
        description: 'Pose un piège sur la case actuelle (bloque un héros 4 tours).',
        sellValue: 2,
        consumable: true,
        quantity: 1,
        maxStack: 1,
      };
    case 'marker':
      return {
        id: uid,
        kind,
        name: 'Repères à la craie',
        description: `Balise un couloir avec votre propre note (empilable par ${CONFIG.MARKER_STACK_MAX}).`,
        sellValue: 1,
        consumable: true,
        quantity: Math.min(CONFIG.MARKER_STACK_MAX, Math.max(1, quantity)),
        maxStack: CONFIG.MARKER_STACK_MAX,
      };
    case 'jewel':
      return {
        id: uid,
        kind,
        name: 'Bijou cabossé',
        description: `Trésor rapporté : se vend ${CONFIG.SELL_VALUES.jewel} or au comptoir.`,
        sellValue: CONFIG.SELL_VALUES.jewel,
        consumable: false,
        quantity: 1,
        maxStack: 1,
      };
    case 'relic':
      return {
        id: uid,
        kind,
        name: 'Relique de héros',
        description: `Butin précieux : se vend ${CONFIG.SELL_VALUES.relic} or au comptoir.`,
        sellValue: CONFIG.SELL_VALUES.relic,
        consumable: false,
        quantity: 1,
        maxStack: 1,
      };
  }
}

function appendLog(
  logs: LogEntry[],
  turn: number,
  depth: number,
  text: string,
  tone: LogEntry['tone'] = 'neutral',
): LogEntry[] {
  const entry: LogEntry = {
    id: `${turn}-${logs.length}-${Math.random().toString(36).slice(2, 6)}`,
    turn,
    depth,
    text,
    tone,
  };
  return [entry, ...logs].slice(0, 50);
}

function enqueueDialogue(
  queue: DialogueItem[],
  item: Omit<DialogueItem, 'id'>,
): DialogueItem[] {
  return [
    ...queue,
    {
      ...item,
      id: `dlg-${item.turn}-${queue.length}-${Math.random().toString(36).slice(2, 6)}`,
    },
  ];
}

/**
 * Dismisses the active dialogue item and archives it into the permanent log.
 */
export function dismissDialogue(state: GameState): GameState {
  if (state.dialogueQueue.length === 0) return state;
  const [current, ...rest] = state.dialogueQueue;
  const line = `${current.speaker} — ${current.text}${
    current.deltaText ? ` (${current.deltaText})` : ''
  }`;
  return {
    ...state,
    dialogueQueue: rest,
    logs: appendLog(state.logs, current.turn, current.depth, line, current.tone),
  };
}

/**
 * Merges stackable items (like markers) into existing slots before taking a new slot.
 */
function tryAddItemToBag(
  bag: BagItem[],
  incoming: BagItem,
): { bag: BagItem[]; leftoverItem: BagItem | null } {
  const nextBag = bag.map((i) => ({ ...i }));
  let remaining = incoming.quantity;

  if (incoming.maxStack > 1) {
    for (const slot of nextBag) {
      if (slot.kind === incoming.kind && slot.quantity < slot.maxStack) {
        const space = slot.maxStack - slot.quantity;
        const add = Math.min(space, remaining);
        slot.quantity += add;
        remaining -= add;
        if (remaining === 0) break;
      }
    }
  }

  while (remaining > 0 && nextBag.length < CONFIG.PORTAGE) {
    const chunk = Math.min(remaining, incoming.maxStack);
    nextBag.push({
      ...incoming,
      id: `${incoming.id}-${nextBag.length}`,
      quantity: chunk,
    });
    remaining -= chunk;
  }

  if (remaining > 0) {
    return {
      bag: nextBag,
      leftoverItem: { ...incoming, quantity: remaining },
    };
  }
  return { bag: nextBag, leftoverItem: null };
}

/**
 * Computes circular Euclidean vision radius based on current oil level.
 */
export function getVisionRadius(oil: number): number {
  for (const tier of CONFIG.OIL_VISION) {
    if (oil >= tier.minOil) return tier.radius;
  }
  return CONFIG.DARK_VISION;
}

/**
 * Updates visibility on a floor: previously 'visible' tiles become 'remembered',
 * and tiles within Euclidean lantern radius become 'visible'.
 */
export function updateFloorVisibility(
  floor: FloorMap,
  playerPos: { x: number; y: number },
  oil: number,
): FloorMap {
  if (floor.isInn) {
    return floor;
  }

  const radius = getVisionRadius(oil);
  const rSq = radius * radius + 0.5;

  const newTiles = floor.tiles.map((row) =>
    row.map((tile) => {
      const dx = tile.x - playerPos.x;
      const dy = tile.y - playerPos.y;
      const distSq = dx * dx + dy * dy;

      if (distSq <= rSq) {
        return { ...tile, visibility: 'visible' as const };
      }
      if (tile.visibility === 'visible') {
        return { ...tile, visibility: 'remembered' as const };
      }
      return tile;
    }),
  );

  return { ...floor, tiles: newTiles };
}

/**
 * Creates a fresh run from a deterministic or random seed.
 */
export function createNewGame(rawSeed?: string): GameState {
  const seed = normalizeSeedString(rawSeed);
  const rng = new SeededRNG(`${seed}::INIT`);
  const identity = rollGoblinIdentity(seed);

  const effectsPool = rng.shuffle<MushroomEffect>([
    'beneficial',
    'neutral',
    'toxic',
    'hallucinatory',
  ]);
  const mushroomEffects: Record<MushroomColor, MushroomEffect> = {
    violet: effectsPool[0],
    ocre: effectsPool[1],
    pale: effectsPool[2],
    carmin: effectsPool[3],
  };

  const startFloor = generateDungeonFloor(seed, CONFIG.START_DEPTH);
  const startPos = { x: 4, y: 5 };

  return {
    seed,
    screen: 'playing',
    turn: 0,
    depth: CONFIG.START_DEPTH,
    maxDepthReached: CONFIG.START_DEPTH,
    player: startPos,
    resources: {
      oil: CONFIG.START.oil,
      food: CONFIG.START.food,
      water: CONFIG.START.water,
      hp: CONFIG.START.hp,
      gold: CONFIG.START.gold,
    },
    emptyWaterCounter: 0,
    emptyFoodCounter: 0,
    hallucinationTurns: 0,
    localNoise: 0,
    bag: [
      makeBagItem('ration', 'item-init-1'),
      makeBagItem('waterskin', 'item-init-2'),
      makeBagItem('marker', 'item-init-3', 3),
    ],
    ally: null,
    mushroomEffects,
    discoveredMushrooms: {},
    floors: {
      [CONFIG.START_DEPTH]: startFloor,
    },
    logs: [
      {
        id: 'init-1',
        turn: 0,
        depth: 0,
        text: `${identity.name} prépare son sac à ${startFloor.innMeta?.name ?? 'l’Avant-Poste'}.`,
        tone: 'info',
      },
    ],
    dialogueQueue: [
      {
        id: 'dlg-init',
        speaker: identity.name,
        badge: 'DÉPART',
        text: `Lanterne prête, trois repères à la craie dans la poche. Faites le tour des comptoirs de l’auberge ou descendez par la trappe au sud.`,
        tone: 'info',
        turn: 0,
        depth: 0,
      },
    ],
    modal: { type: 'none' },
    narrative: {
      goblinName: identity.name,
      goblinTrait: identity.trait,
      lastInnName: startFloor.innMeta?.name ?? 'Avant-Poste du Registre Zéro',
      lastInnDepth: CONFIG.START_DEPTH,
      innsReached: 1,
      stairsCrossed: 0,
      npcsMet: 0,
      npcsPaid: 0,
      alliesRecruited: 0,
      allySacrificedName: null,
      heroesEvaded: 0,
      trapsTriggeredOnHeroes: 0,
      treasuresSold: 0,
      markersPlaced: 0,
      lastMushroomColor: null,
      lastMushroomEffect: null,
      causeOfDeath: '',
    },
    lastMovementBlocked: false,
    lastEpitaph: null,
  };
}

function finalizeRun(
  state: GameState,
  outcome: 'dead' | 'survived_99',
  causeText?: string,
): GameState {
  const nextNarrative = causeText
    ? { ...state.narrative, causeOfDeath: causeText }
    : state.narrative;
  const finalState: GameState = {
    ...state,
    narrative: nextNarrative,
    dialogueQueue: [],
    modal: { type: 'none' },
    screen: outcome === 'survived_99' ? 'victory' : 'dead',
  };
  const entry = buildEpitaph(finalState, outcome);
  saveMemorialEntry(entry);
  if (outcome === 'dead') {
    soundFx.hurt();
  } else {
    soundFx.stamp();
  }
  return {
    ...finalState,
    lastEpitaph: entry,
  };
}

function findNextHeroStep(
  floor: FloorMap,
  sx: number,
  sy: number,
  tx: number,
  ty: number,
): { x: number; y: number } {
  if (sx === tx && sy === ty) return { x: sx, y: sy };
  const visited = new Set<string>([`${sx},${sy}`]);
  const queue: Array<{ x: number; y: number; firstStep: { x: number; y: number } | null }> = [
    { x: sx, y: sy, firstStep: null },
  ];
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
      if (nx < 0 || nx >= floor.width || ny < 0 || ny >= floor.height) continue;
      const key = `${nx},${ny}`;
      if (visited.has(key)) continue;
      if (floor.tiles[ny][nx].kind === 'wall') continue;

      const step = curr.firstStep ?? { x: nx, y: ny };
      if (nx === tx && ny === ty) {
        return step;
      }
      visited.add(key);
      queue.push({ x: nx, y: ny, firstStep: step });
    }
  }
  return { x: sx, y: sy };
}

function findSafeEscapeTile(
  floor: FloorMap,
  from: { x: number; y: number },
  avoid: { x: number; y: number },
): { x: number; y: number } {
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  let best = from;
  let bestDist = -1;
  for (const [dx, dy] of dirs) {
    const nx = from.x + dx;
    const ny = from.y + dy;
    if (nx < 0 || nx >= floor.width || ny < 0 || ny >= floor.height) continue;
    if (floor.tiles[ny][nx].kind === 'wall') continue;
    const hasNpc = floor.npcs.some((n) => !n.fled && !n.recruited && n.x === nx && n.y === ny);
    if (hasNpc) continue;
    const d = Math.abs(nx - avoid.x) + Math.abs(ny - avoid.y);
    if (d > bestDist) {
      bestDist = d;
      best = { x: nx, y: ny };
    }
  }
  return best;
}

function passiveRevealAdjacent(
  floor: FloorMap,
  pos: { x: number; y: number },
  rng: SeededRNG,
  activeScan: boolean,
): { floor: FloorMap; discoveredTraps: number } {
  let discoveredTraps = 0;
  const newTiles = floor.tiles.map((row) => row.map((t) => ({ ...t })));

  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = pos.x + dx;
      const ny = pos.y + dy;
      if (nx < 0 || nx >= floor.width || ny < 0 || ny >= floor.height) continue;
      const tile = newTiles[ny][nx];
      if (
        tile.feature &&
        tile.feature.kind === 'trap' &&
        !tile.feature.revealed &&
        !tile.feature.consumed
      ) {
        if (activeScan || rng.chance(0.45)) {
          tile.feature = { ...tile.feature, revealed: true };
          discoveredTraps++;
        }
      }
    }
  }

  return {
    floor: { ...floor, tiles: newTiles },
    discoveredTraps,
  };
}

/**
 * Advances 1 dungeon turn (resources, local noise, hero threats).
 */
function advanceDungeonTurn(
  state: GameState,
  extraNoise = 0,
  activeScan = false,
): GameState {
  const floor = state.floors[state.depth];
  if (!floor || floor.isInn) return state;

  const nextTurn = state.turn + 1;
  const rng = new SeededRNG(`${state.seed}::T${nextTurn}::D${state.depth}`);
  let logs = state.logs;
  let dialogueQueue = state.dialogueQueue;

  const oil = Math.max(0, Number((state.resources.oil - CONFIG.OIL_STEP).toFixed(2)));
  const water = Math.max(0, Number((state.resources.water - CONFIG.WATER_STEP).toFixed(3)));
  const food = Math.max(0, Number((state.resources.food - CONFIG.FOOD_STEP).toFixed(3)));
  let hp = state.resources.hp;
  let emptyWaterCounter = state.emptyWaterCounter;
  let emptyFoodCounter = state.emptyFoodCounter;

  if (state.resources.oil > 0 && oil === 0) {
    dialogueQueue = enqueueDialogue(dialogueQueue, {
      speaker: state.narrative.goblinName,
      badge: 'OBSCURITÉ',
      text: 'Ma lanterne vient de grésiller et de s’éteindre ! Je n’y vois plus qu’à un pas, mais je me souviens du chemin déjà tracé.',
      tone: 'warn',
      turn: nextTurn,
      depth: state.depth,
    });
  }

  if (water <= 0) {
    emptyWaterCounter++;
    if (emptyWaterCounter % CONFIG.EMPTY_WATER_EVERY === 0) {
      hp = Math.max(0, Number((hp - CONFIG.EMPTY_WATER_DAMAGE).toFixed(2)));
      logs = appendLog(
        logs,
        nextTurn,
        state.depth,
        'La gorge sèche vous brûle (-0,85 PV). Trouvez de l’eau.',
        'danger',
      );
      soundFx.hurt();
      if (hp <= 0) {
        return finalizeRun(
          {
            ...state,
            turn: nextTurn,
            resources: { ...state.resources, oil, water, food, hp: 0 },
            logs,
          },
          'dead',
          'mort de soif',
        );
      }
    }
  } else {
    emptyWaterCounter = 0;
  }

  if (food <= 0) {
    emptyFoodCounter++;
    if (emptyFoodCounter % CONFIG.EMPTY_FOOD_EVERY === 0) {
      hp = Math.max(0, Number((hp - CONFIG.EMPTY_FOOD_DAMAGE).toFixed(2)));
      logs = appendLog(logs, nextTurn, state.depth, 'L’estomac se tord de faim (-0,55 PV).', 'danger');
      soundFx.hurt();
      if (hp <= 0) {
        return finalizeRun(
          {
            ...state,
            turn: nextTurn,
            resources: { ...state.resources, oil, water, food, hp: 0 },
            logs,
          },
          'dead',
          'mort de faim',
        );
      }
    }
  } else {
    emptyFoodCounter = 0;
  }

  const scanRes = passiveRevealAdjacent(floor, state.player, rng, activeScan);
  let updatedFloor = scanRes.floor;
  updatedFloor = { ...updatedFloor, turnsSpentHere: updatedFloor.turnsSpentHere + 1 };

  if (scanRes.discoveredTraps > 0) {
    if (activeScan) {
      dialogueQueue = enqueueDialogue(dialogueQueue, {
        speaker: state.narrative.goblinName,
        badge: 'SCRUTATION',
        text: `En tendant la lanterne au ras des dalles, je repère ${scanRes.discoveredTraps} piège${scanRes.discoveredTraps > 1 ? 's' : ''} juste à côté !`,
        tone: 'info',
        turn: nextTurn,
        depth: state.depth,
      });
    } else {
      logs = appendLog(
        logs,
        nextTurn,
        state.depth,
        `Votre prudence révèle ${scanRes.discoveredTraps} piège${scanRes.discoveredTraps > 1 ? 's' : ''} adjacent${scanRes.discoveredTraps > 1 ? 's' : ''}.`,
        'info',
      );
    }
  } else if (activeScan) {
    dialogueQueue = enqueueDialogue(dialogueQueue, {
      speaker: state.narrative.goblinName,
      badge: 'SCRUTATION',
      text: 'Rien d’anormal à portée immédiate, hormis l’humidité des pierres et un courant d’air lointain.',
      tone: 'neutral',
      turn: nextTurn,
      depth: state.depth,
    });
  }

  let localNoise = Math.max(
    0,
    Number((state.localNoise + extraNoise - CONFIG.NOISE_DECAY).toFixed(3)),
  );
  let ally = state.ally;
  let playerPos = state.player;
  let narrative = { ...state.narrative };

  if (updatedFloor.hero) {
    const hero = { ...updatedFloor.hero };

    if (hero.status === 'absent') {
      const spawnProb =
        updatedFloor.turnsSpentHere > 4
          ? Math.min(
              0.26,
              CONFIG.HUNTER_CHANCE * 0.12 +
                localNoise * CONFIG.NOISE_HUNTER * 10 +
                (localNoise >= CONFIG.NOISE_HIGH_THRESHOLD ? 0.08 : 0),
            )
          : localNoise >= CONFIG.NOISE_HIGH_THRESHOLD
          ? 0.08
          : 0;

      if (spawnProb > 0 && rng.chance(spawnProb)) {
        hero.status = 'announced';
        hero.countdown = CONFIG.HUNTER_DELAY;
        const candidates = [updatedFloor.stairsDownPos, updatedFloor.stairsUpPos].filter(
          Boolean,
        ) as Array<{ x: number; y: number }>;
        let spawnPos = candidates[0] ?? { x: 1, y: 1 };
        let maxD = -1;
        for (const c of candidates) {
          const d = Math.abs(c.x - playerPos.x) + Math.abs(c.y - playerPos.y);
          if (d > maxD) {
            maxD = d;
            spawnPos = c;
          }
        }
        hero.x = spawnPos.x;
        hero.y = spawnPos.y;
        const newTiles = updatedFloor.tiles.map((r) => r.map((t) => ({ ...t })));
        newTiles[spawnPos.y][spawnPos.x].trace = {
          x: spawnPos.x,
          y: spawnPos.y,
          kind: 'torch',
          age: 0,
        };
        updatedFloor = { ...updatedFloor, tiles: newTiles };
        dialogueQueue = enqueueDialogue(dialogueQueue, {
          speaker: state.narrative.goblinName,
          badge: 'ALERTE',
          text: `Bruits de bottes ferrées et lueur de torche ! ${hero.name} approche de cet étage (${CONFIG.HUNTER_DELAY} tours avant qu’il n’entre).`,
          tone: 'warn',
          turn: nextTurn,
          depth: state.depth,
        });
        soundFx.alert();
      }
    } else if (hero.status === 'announced') {
      hero.countdown -= 1;
      if (hero.countdown <= 0) {
        hero.status = 'active';
        hero.stepsOnFloor = 0;
        dialogueQueue = enqueueDialogue(dialogueQueue, {
          speaker: hero.name,
          badge: 'HÉROS',
          text: `« Je sais qu’une créature rôde par ici... » (${hero.name} pénètre dans l’étage !)`,
          tone: 'danger',
          turn: nextTurn,
          depth: state.depth,
        });
        soundFx.alert();
      } else if (hero.countdown === 2) {
        logs = appendLog(
          logs,
          nextTurn,
          state.depth,
          `Les voix héroïques résonnent tout près (2 tours avant l’arrivée).`,
          'warn',
        );
      }
    } else if (hero.status === 'active') {
      if (hero.stunTurns > 0) {
        hero.stunTurns -= 1;
        logs = appendLog(
          logs,
          nextTurn,
          state.depth,
          `${hero.name} peste contre le piège (${hero.stunTurns} tour${hero.stunTurns > 1 ? 's' : ''} restant${hero.stunTurns > 1 ? 's' : ''}).`,
          'info',
        );
      } else {
        const nextStep = findNextHeroStep(updatedFloor, hero.x, hero.y, playerPos.x, playerPos.y);
        hero.x = nextStep.x;
        hero.y = nextStep.y;
        hero.stepsOnFloor += 1;

        const newTiles = updatedFloor.tiles.map((r) => r.map((t) => ({ ...t })));
        const steppedTile = newTiles[hero.y][hero.x];
        steppedTile.trace = {
          x: hero.x,
          y: hero.y,
          kind: 'footprints',
          age: 0,
        };

        if (
          steppedTile.feature &&
          (steppedTile.feature.kind === 'placed_trap' || steppedTile.feature.kind === 'trap') &&
          !steppedTile.feature.consumed
        ) {
          steppedTile.feature = {
            ...steppedTile.feature,
            consumed: true,
            revealed: true,
          };
          hero.stunTurns = CONFIG.HERO_TRAP_STUN_TURNS;
          narrative.trapsTriggeredOnHeroes += 1;
          narrative.heroesEvaded += 1;
          dialogueQueue = enqueueDialogue(dialogueQueue, {
            speaker: hero.name,
            badge: 'PIÈGE',
            text: `« Argh ! Quelle vermine a posé ça ici ?! » ${hero.name} est bloqué pour ${CONFIG.HERO_TRAP_STUN_TURNS} tours.`,
            tone: 'good',
            turn: nextTurn,
            depth: state.depth,
          });
          soundFx.stamp();
        }

        updatedFloor = { ...updatedFloor, tiles: newTiles };

        if (hero.x === playerPos.x && hero.y === playerPos.y && hero.stunTurns === 0) {
          if (ally) {
            const sacrificed = ally.name;
            narrative.allySacrificedName = sacrificed;
            narrative.heroesEvaded += 1;
            ally = null;
            hero.stunTurns = 2;
            playerPos = findSafeEscapeTile(updatedFloor, playerPos, { x: hero.x, y: hero.y });
            dialogueQueue = enqueueDialogue(dialogueQueue, {
              speaker: sacrificed,
              badge: 'SACRIFICE',
              text: `« Filez sans vous retourner ! Je le retiens ! » ${sacrificed} s’interpose devant ${hero.name} pour vous laisser fuir.`,
              tone: 'warn',
              turn: nextTurn,
              depth: state.depth,
            });
            soundFx.alert();
          } else {
            const heroDmg = 6;
            hp = Math.max(0, Number((hp - heroDmg).toFixed(2)));
            soundFx.hurt();
            if (hp <= 0) {
              updatedFloor = { ...updatedFloor, hero };
              return finalizeRun(
                {
                  ...state,
                  turn: nextTurn,
                  player: playerPos,
                  resources: { ...state.resources, oil, water, food, hp: 0 },
                  localNoise,
                  ally,
                  narrative,
                  floors: { ...state.floors, [state.depth]: updatedFloor },
                  logs: appendLog(
                    logs,
                    nextTurn,
                    state.depth,
                    `${hero.name} vous rattrape au détour d’un couloir.`,
                    'danger',
                  ),
                },
                'dead',
                `rattrapé par ${hero.name}`,
              );
            } else {
              hero.stunTurns = 1;
              playerPos = findSafeEscapeTile(updatedFloor, playerPos, { x: hero.x, y: hero.y });
              dialogueQueue = enqueueDialogue(dialogueQueue, {
                speaker: state.narrative.goblinName,
                badge: 'BLESSURE',
                text: `La lame de ${hero.name} m’érafle dans la pénombre ! Je me faufile in extremis vers une case libre.`,
                deltaText: `-${heroDmg} PV`,
                tone: 'danger',
                turn: nextTurn,
                depth: state.depth,
              });
            }
          }
        }
      }
    }

    updatedFloor = { ...updatedFloor, hero };
  }

  updatedFloor = updateFloorVisibility(updatedFloor, playerPos, oil);

  return {
    ...state,
    turn: nextTurn,
    player: playerPos,
    resources: { ...state.resources, oil, water, food, hp },
    emptyWaterCounter,
    emptyFoodCounter,
    hallucinationTurns: Math.max(0, state.hallucinationTurns - 1),
    localNoise,
    ally,
    narrative,
    floors: {
      ...state.floors,
      [state.depth]: updatedFloor,
    },
    logs,
    dialogueQueue,
    lastMovementBlocked: false,
  };
}

/**
 * Handles player movement or bump interaction in (dx, dy).
 */
export function movePlayer(state: GameState, dx: number, dy: number): GameState {
  if (
    state.screen !== 'playing' ||
    state.modal.type !== 'none' ||
    state.dialogueQueue.length > 0
  ) {
    return state;
  }

  const floor = state.floors[state.depth];
  if (!floor) return state;

  const nx = state.player.x + dx;
  const ny = state.player.y + dy;

  if (nx < 0 || nx >= floor.width || ny < 0 || ny >= floor.height) {
    soundFx.bumpWall();
    return { ...state, lastMovementBlocked: true };
  }

  const targetTile = floor.tiles[ny][nx];

  if (targetTile.kind === 'wall') {
    soundFx.bumpWall();
    return { ...state, lastMovementBlocked: true };
  }

  const npc = floor.npcs.find((n) => !n.fled && !n.recruited && n.x === nx && n.y === ny);
  if (npc && !npc.paid) {
    return {
      ...state,
      modal: { type: 'npc', npcId: npc.id },
      lastMovementBlocked: false,
    };
  }

  // A paid resident gives way even in a single-tile corridor.
  // Swapping positions keeps both creatures visible and never requires a free side tile.
  const crossingState: GameState = npc?.paid
    ? {
        ...state,
        floors: {
          ...state.floors,
          [state.depth]: {
            ...floor,
            npcs: floor.npcs.map((resident) =>
              resident.id === npc.id
                ? { ...resident, x: state.player.x, y: state.player.y }
                : resident,
            ),
          },
        },
      }
    : state;

  if (targetTile.kind === 'inn_counter') {
    return { ...state, modal: { type: 'inn_counter' }, lastMovementBlocked: false };
  }
  if (targetTile.kind === 'inn_market') {
    return { ...state, modal: { type: 'inn_market' }, lastMovementBlocked: false };
  }
  if (targetTile.kind === 'inn_tavern') {
    return { ...state, modal: { type: 'inn_tavern' }, lastMovementBlocked: false };
  }
  if (targetTile.kind === 'inn_bed') {
    return { ...state, modal: { type: 'inn_dormitory' }, lastMovementBlocked: false };
  }
  if (targetTile.kind === 'vault_seal') {
    return { ...state, modal: { type: 'vault_finale' }, lastMovementBlocked: false };
  }

  if (floor.hero && floor.hero.status === 'active' && floor.hero.x === nx && floor.hero.y === ny) {
    const logs = appendLog(
      state.logs,
      state.turn,
      state.depth,
      `Vous vous retenez de foncer tout droit sur ${floor.hero.name} !`,
      'warn',
    );
    soundFx.alert();
    return { ...state, logs, lastMovementBlocked: true };
  }

  // Objects are on the floor, not walls: enter their tile freely.
  // Space / Enter offers the deliberate choice to inspect or leave them.
  soundFx.step();

  if (floor.isInn) {
    return {
      ...crossingState,
      player: { x: nx, y: ny },
      lastMovementBlocked: false,
    };
  }

  if (
    targetTile.feature &&
    targetTile.feature.kind === 'trap' &&
    !targetTile.feature.consumed
  ) {
    if (!targetTile.feature.revealed) {
      const newTiles = floor.tiles.map((r) => r.map((t) => ({ ...t })));
      newTiles[ny][nx].feature = {
        ...targetTile.feature,
        revealed: true,
        consumed: true,
      };
      const newHp = Math.max(0, Number((state.resources.hp - 2).toFixed(2)));
      soundFx.hurt();

      const updatedFloor = { ...floor, tiles: newTiles };
      const dialogueQueue = enqueueDialogue(state.dialogueQueue, {
        speaker: state.narrative.goblinName,
        badge: 'PIÈGE',
        text: 'Aïe ! Mon pied a enclenché un ressort caché dans la dalle !',
        deltaText: '-2 PV',
        tone: 'danger',
        turn: state.turn + 1,
        depth: state.depth,
      });

      const nextState: GameState = {
        ...crossingState,
        player: { x: nx, y: ny },
        resources: { ...state.resources, hp: newHp },
        floors: { ...state.floors, [state.depth]: updatedFloor },
        dialogueQueue,
      };

      if (newHp <= 0) {
        return finalizeRun(nextState, 'dead', 'mort dans un piège dissimulé');
      }
      return advanceDungeonTurn(nextState, 0.25);
    } else {
      const logs = appendLog(
        state.logs,
        state.turn + 1,
        state.depth,
        'Vous contournez avec précaution le piège repéré.',
        'info',
      );
      return advanceDungeonTurn({ ...crossingState, player: { x: nx, y: ny }, logs });
    }
  }

  return advanceDungeonTurn({
    ...crossingState,
    player: { x: nx, y: ny },
  });
}

/**
 * Direct scan action (Space): spends 1 turn, inspects adjacent tiles and outputs an observation dialogue.
 */
export function waitAndScan(state: GameState): GameState {
  if (
    state.screen !== 'playing' ||
    state.modal.type !== 'none' ||
    state.dialogueQueue.length > 0
  ) {
    return state;
  }
  const floor = state.floors[state.depth];
  if (!floor || floor.isInn) return state;

  return advanceDungeonTurn(state, 0.08, true);
}

/**
 * Ascends or descends stairs when standing on stairs tile.
 */
export function useStairs(state: GameState, direction: 'up' | 'down'): GameState {
  const currentFloor = state.floors[state.depth];
  if (!currentFloor) return state;

  const targetDepth = direction === 'down' ? state.depth - 1 : state.depth + 1;
  if (targetDepth > 0 || targetDepth < CONFIG.TARGET_DEPTH) return state;

  let narrative = { ...state.narrative, stairsCrossed: state.narrative.stairsCrossed + 1 };
  let updatedCurrentFloor = currentFloor;
  if (currentFloor.hero && currentFloor.hero.status !== 'absent') {
    if (currentFloor.hero.status === 'active') {
      narrative.heroesEvaded += 1;
    }
    updatedCurrentFloor = {
      ...currentFloor,
      hero: { ...currentFloor.hero, status: 'absent', countdown: CONFIG.HUNTER_DELAY, stunTurns: 0 },
    };
  }

  let nextFloor = state.floors[targetDepth];
  if (!nextFloor) {
    nextFloor = generateDungeonFloor(state.seed, targetDepth);
  }

  const spawnPos =
    direction === 'down'
      ? nextFloor.stairsUpPos ?? { x: 4, y: 2 }
      : nextFloor.stairsDownPos ?? { x: 4, y: 7 };

  let resources = { ...state.resources };
  let logs = state.logs;
  let dialogueQueue = state.dialogueQueue;

  if (nextFloor.isInn && nextFloor.innMeta) {
    const innMeta = nextFloor.innMeta;
    if (!innMeta.visitedBefore) {
      const newHp = Math.min(CONFIG.MAX_HP, resources.hp + CONFIG.INN_ARRIVAL_BONUS.hp);
      const newGold = resources.gold + CONFIG.INN_ARRIVAL_BONUS.gold;
      const newOil = Math.min(
        CONFIG.MAX_OIL,
        Math.max(resources.oil + CONFIG.INN_ARRIVAL_BONUS.oil, CONFIG.INN_OIL),
      );
      const newFood = Math.max(resources.food, CONFIG.INN_FOOD);
      const newWater = Math.max(resources.water, CONFIG.INN_WATER);

      resources = {
        ...resources,
        hp: newHp,
        gold: newGold,
        oil: newOil,
        food: newFood,
        water: newWater,
      };
      nextFloor = {
        ...nextFloor,
        innMeta: { ...innMeta, visitedBefore: true },
      };
      narrative = {
        ...narrative,
        lastInnName: innMeta.name,
        lastInnDepth: targetDepth,
        innsReached: narrative.innsReached + 1,
      };
      dialogueQueue = enqueueDialogue(dialogueQueue, {
        speaker: innMeta.innkeeperName,
        badge: 'REFUGE',
        text: `« Encore entier ? Bienvenue à ${innMeta.name}. Voici le minimum réglementaire pour souffler un peu. »`,
        deltaText: '+3 PV, +2 or, +6 huile & secours garantis',
        tone: 'good',
        turn: state.turn,
        depth: targetDepth,
      });
      soundFx.stamp();
    } else {
      narrative = {
        ...narrative,
        lastInnName: innMeta.name,
        lastInnDepth: targetDepth,
      };
      logs = appendLog(
        logs,
        state.turn,
        targetDepth,
        `Retour à ${innMeta.name}. Zone sûre : les réserves ne baissent plus.`,
        'info',
      );
    }
  } else {
    logs = appendLog(
      logs,
      state.turn,
      targetDepth,
      `${direction === 'down' ? 'Descente' : 'Remontée'} à l’étage ${targetDepth} (${nextFloor.biomeLabel}, ${nextFloor.width}×${nextFloor.height}).`,
      'info',
    );
    soundFx.step();
  }

  nextFloor = updateFloorVisibility(nextFloor, spawnPos, resources.oil);

  return {
    ...state,
    depth: targetDepth,
    maxDepthReached: Math.min(state.maxDepthReached, targetDepth),
    player: spawnPos,
    resources,
    localNoise: 0,
    modal: { type: 'none' },
    narrative,
    logs,
    dialogueQueue,
    floors: {
      ...state.floors,
      [state.depth]: updatedCurrentFloor,
      [targetDepth]: nextFloor,
    },
  };
}

function giveOrPromptBagItem(
  state: GameState,
  item: BagItem,
  sourcePos?: { x: number; y: number },
): GameState {
  const { bag, leftoverItem } = tryAddItemToBag(state.bag, item);
  if (!leftoverItem) {
    return { ...state, bag };
  }
  return {
    ...state,
    bag,
    modal: { type: 'bag', pendingPickup: leftoverItem, sourcePos },
  };
}

/**
 * Resolves chest, mushroom, corpse, well, or puddle interaction with immediate dialogue feedback.
 */
export function resolveFeatureAction(
  state: GameState,
  x: number,
  y: number,
  action: 'confirm' | 'leave',
): GameState {
  if (action === 'leave') {
    return { ...state, modal: { type: 'none' } };
  }

  const floor = state.floors[state.depth];
  if (!floor) return { ...state, modal: { type: 'none' } };

  const tile = floor.tiles[y][x];
  const feat = tile.feature;
  if (!feat || feat.consumed) return { ...state, modal: { type: 'none' } };

  const rng = new SeededRNG(`${state.seed}::FEAT::${state.depth}::${x},${y}::${state.turn}`);
  const newTiles = floor.tiles.map((r) => r.map((t) => ({ ...t })));
  newTiles[y][x].feature = { ...feat, consumed: true };

  let nextState: GameState = {
    ...state,
    modal: { type: 'none' },
    floors: { ...state.floors, [state.depth]: { ...floor, tiles: newTiles } },
  };

  if (feat.kind === 'chest') {
    let extraNoise = 0.22;
    let trapText = '';
    if (feat.chestTrapped) {
      const dmg = 2;
      const newHp = Math.max(0, nextState.resources.hp - dmg);
      nextState.resources = { ...nextState.resources, hp: newHp };
      trapText = ' Le loquet cachait une aiguille empoisonnée (-2 PV) !';
      soundFx.hurt();
      extraNoise = 0.4;
      if (newHp <= 0) {
        return finalizeRun(nextState, 'dead', 'mort en forçant un coffre piégé');
      }
    }

    const goldFound = rng.int(2, 5);
    nextState.resources = { ...nextState.resources, gold: nextState.resources.gold + goldFound };
    const lootRoll = rng.next();
    let item: BagItem | null = null;
    if (lootRoll < 0.4) {
      item = makeBagItem('jewel', `item-${state.turn}-${x}-${y}`);
    } else if (lootRoll < 0.65) {
      item = makeBagItem('relic', `item-${state.turn}-${x}-${y}`);
    } else if (lootRoll < 0.82) {
      item = makeBagItem('trap', `item-${state.turn}-${x}-${y}`);
    } else if (lootRoll < 0.94) {
      item = makeBagItem('marker', `item-${state.turn}-${x}-${y}`, 2);
    }

    nextState.dialogueQueue = enqueueDialogue(nextState.dialogueQueue, {
      speaker: state.narrative.goblinName,
      badge: 'COFFRE',
      text: `Le couvercle cède dans un grincement sec.${trapText}${item ? ` Je glisse ${item.name}${item.quantity > 1 ? ` (×${item.quantity})` : ''} dans mon sac.` : ''}`,
      deltaText: `+${goldFound} or${item ? `, +${item.name}` : ''}`,
      tone: feat.chestTrapped ? 'warn' : 'good',
      turn: nextState.turn + 1,
      depth: nextState.depth,
    });
    soundFx.coin();

    if (item) {
      nextState = giveOrPromptBagItem(nextState, item, { x, y });
      if (nextState.modal.type === 'bag') {
        return nextState;
      }
    }
    return advanceDungeonTurn(nextState, extraNoise);
  }

  if (feat.kind === 'mushroom') {
    const color = feat.mushroomColor ?? 'ocre';
    const effect = state.mushroomEffects[color];
    const discoveredMushrooms = { ...state.discoveredMushrooms, [color]: effect };
    const resources = { ...nextState.resources };
    let hallucinationTurns = nextState.hallucinationTurns;

    if (effect === 'beneficial') {
      resources.food = Math.min(CONFIG.MAX_FOOD, Number((resources.food + 3).toFixed(2)));
      resources.hp = Math.min(CONFIG.MAX_HP, Number((resources.hp + 1).toFixed(2)));
      nextState.dialogueQueue = enqueueDialogue(nextState.dialogueQueue, {
        speaker: state.narrative.goblinName,
        badge: 'CHAMPIGNON',
        text: `Ce champignon ${color} a un goût de noisette humide ! Je note dans un coin de ma tête que cette couleur est excellente.`,
        deltaText: '+3 vivres, +1 PV',
        tone: 'good',
        turn: nextState.turn + 1,
        depth: nextState.depth,
      });
      soundFx.coin();
    } else if (effect === 'neutral') {
      resources.food = Math.min(CONFIG.MAX_FOOD, Number((resources.food + 1.5).toFixed(2)));
      nextState.dialogueQueue = enqueueDialogue(nextState.dialogueQueue, {
        speaker: state.narrative.goblinName,
        badge: 'CHAMPIGNON',
        text: `La chair ${color} a le goût d’un vieux torchon administratif. Ça cale tout de même l’estomac.`,
        deltaText: '+1,5 vivres',
        tone: 'info',
        turn: nextState.turn + 1,
        depth: nextState.depth,
      });
    } else if (effect === 'toxic') {
      resources.food = Math.min(CONFIG.MAX_FOOD, Number((resources.food + 1).toFixed(2)));
      resources.hp = Math.max(0, Number((resources.hp - 2).toFixed(2)));
      nextState.dialogueQueue = enqueueDialogue(nextState.dialogueQueue, {
        speaker: state.narrative.goblinName,
        badge: 'TOXIQUE',
        text: `Pouah ! Cette variété ${color} brûle la gorge immédiatement ! À éviter absolument pour la suite.`,
        deltaText: '-2 PV, +1 vivre',
        tone: 'danger',
        turn: nextState.turn + 1,
        depth: nextState.depth,
      });
      soundFx.hurt();
    } else {
      resources.food = Math.min(CONFIG.MAX_FOOD, Number((resources.food + 2).toFixed(2)));
      hallucinationTurns = 6;
      nextState.dialogueQueue = enqueueDialogue(nextState.dialogueQueue, {
        speaker: state.narrative.goblinName,
        badge: 'HALLUCINOGÈNE',
        text: `Le chapeau ${color} laisse un arrière-goût violet... Les murs semblent soudain me demander mon numéro de dossier.`,
        deltaText: '+2 vivres, vision troublée',
        tone: 'warn',
        turn: nextState.turn + 1,
        depth: nextState.depth,
      });
    }

    nextState = {
      ...nextState,
      resources,
      discoveredMushrooms,
      hallucinationTurns,
      narrative: {
        ...nextState.narrative,
        lastMushroomColor: color,
        lastMushroomEffect: effect,
      },
    };

    if (resources.hp <= 0) {
      return finalizeRun(nextState, 'dead', `empoisonné par un champignon ${color}`);
    }
    return advanceDungeonTurn(nextState, 0.04);
  }

  if (feat.kind === 'corpse') {
    const resources = {
      ...nextState.resources,
      food: Math.min(CONFIG.MAX_FOOD, Number((nextState.resources.food + 2.5).toFixed(2))),
    };
    const foundOil = rng.chance(0.5) ? 6 : 0;
    resources.oil = Math.min(CONFIG.MAX_OIL, Number((resources.oil + foundOil).toFixed(2)));

    let noise = 0.25;
    let bite = false;
    if (rng.chance(0.25)) {
      bite = true;
      resources.hp = Math.max(0, Number((resources.hp - 1).toFixed(2)));
      soundFx.hurt();
      noise = 0.35;
    }

    nextState.dialogueQueue = enqueueDialogue(nextState.dialogueQueue, {
      speaker: state.narrative.goblinName,
      badge: 'CHAROGNAGE',
      text: bite
        ? 'Des rats affamés surgissent du manteau pendant que je fouille ! J’arrache tout de même quelques provisions.'
        : 'Le pauvre aventurier n’avait plus besoin de sa musette. J’y récupère des biscuits secs intactes.',
      deltaText: `+2,5 vivres${foundOil ? `, +${foundOil} huile` : ''}${bite ? ', -1 PV' : ''}`,
      tone: bite ? 'warn' : 'good',
      turn: nextState.turn + 1,
      depth: nextState.depth,
    });

    nextState.resources = resources;
    if (resources.hp <= 0) {
      return finalizeRun(nextState, 'dead', 'mort mordu en charognant un cadavre');
    }
    return advanceDungeonTurn(nextState, noise);
  }

  if (feat.kind === 'well' || feat.kind === 'puddle') {
    const quality = feat.waterQuality ?? 'trouble';
    const resources = { ...nextState.resources };
    let msg = '';
    let delta = '';
    let tone: LogEntry['tone'] = 'info';

    if (quality === 'pure') {
      resources.water = Math.min(CONFIG.MAX_WATER, Number((resources.water + 5).toFixed(2)));
      msg = 'Une eau fraîche et claire remonte du fond. Cela redonne presque envie d’y croire.';
      delta = '+5 eau';
      tone = 'good';
      soundFx.coin();
    } else if (quality === 'trouble') {
      resources.water = Math.min(CONFIG.MAX_WATER, Number((resources.water + 3.5).toFixed(2)));
      if (rng.chance(0.3)) {
        resources.hp = Math.max(0, Number((resources.hp - 1).toFixed(2)));
        msg = 'L’eau a un goût prononcé de mousse et de ferraille. Mon estomac proteste.';
        delta = '+3,5 eau, -1 PV';
        tone = 'warn';
        soundFx.hurt();
      } else {
        msg = 'Un peu terreuse, mais parfaitement buvable pour un gobelin.';
        delta = '+3,5 eau';
        tone = 'info';
      }
    } else {
      resources.water = Math.min(CONFIG.MAX_WATER, Number((resources.water + 2.5).toFixed(2)));
      resources.hp = Math.max(0, Number((resources.hp - 1.5).toFixed(2)));
      msg = 'Flaque croupie ! Elle calme ma soif sur le coup, mais les crampes arrivent aussitôt.';
      delta = '+2,5 eau, -1,5 PV';
      tone = 'danger';
      soundFx.hurt();
    }

    nextState.dialogueQueue = enqueueDialogue(nextState.dialogueQueue, {
      speaker: state.narrative.goblinName,
      badge: feat.kind === 'well' ? 'PUITS' : 'FLAQUE',
      text: msg,
      deltaText: delta,
      tone,
      turn: nextState.turn + 1,
      depth: nextState.depth,
    });

    nextState.resources = resources;
    if (resources.hp <= 0) {
      return finalizeRun(nextState, 'dead', 'mort d’avoir bu une eau douteuse');
    }
    return advanceDungeonTurn(nextState, 0.05);
  }

  return nextState;
}

/**
 * Resolves the 4 social options (Payer, Parler, Recruter, Fuir) with an NPC.
 */
export function resolveNpcInteraction(
  state: GameState,
  npcId: string,
  choice: 'pay' | 'talk' | 'recruit' | 'flee',
): GameState {
  const floor = state.floors[state.depth];
  if (!floor) return { ...state, modal: { type: 'none' } };
  const npcIndex = floor.npcs.findIndex((n) => n.id === npcId);
  if (npcIndex === -1) return { ...state, modal: { type: 'none' } };

  const npc: NpcEntity = { ...floor.npcs[npcIndex] };
  const resources = { ...state.resources };
  let dialogueQueue = state.dialogueQueue;
  let ally = state.ally;
  const narrative = { ...state.narrative, npcsMet: state.narrative.npcsMet + 1 };
  let updatedFloor = floor;

  if (choice === 'pay') {
    if (npc.paid) {
      dialogueQueue = enqueueDialogue(dialogueQueue, {
        speaker: npc.name,
        badge: npc.role,
        text: '« Votre timbre fiscal est déjà validé pour cet étage, circulez. »',
        tone: 'info',
        turn: state.turn,
        depth: state.depth,
      });
      return { ...state, dialogueQueue, modal: { type: 'none' } };
    }
    if (resources.gold < npc.bribeCost) {
      const logs = appendLog(state.logs, state.turn, state.depth, `Pas assez d’or (${npc.bribeCost} requis).`, 'warn');
      return { ...state, logs };
    }

    resources.gold -= npc.bribeCost;
    npc.paid = true;
    narrative.npcsPaid += 1;
    soundFx.coin();

    if (npc.kind === 'rat_percepteur') {
      resources.oil = Math.min(CONFIG.MAX_OIL, Number((resources.oil + 4).toFixed(2)));
      dialogueQueue = enqueueDialogue(dialogueQueue, {
        speaker: npc.name,
        badge: npc.role,
        text: '« En règle ! Voici votre flasque d’huile détaxée. Ne la renversez pas sur les registres. »',
        deltaText: `-${npc.bribeCost} or, +4 huile`,
        tone: 'good',
        turn: state.turn + 1,
        depth: state.depth,
      });
    } else if (npc.kind === 'squelette_concierge') {
      const newTiles = floor.tiles.map((r) =>
        r.map((t) => ({
          ...t,
          visibility: t.visibility === 'unknown' ? ('remembered' as const) : t.visibility,
          feature: t.feature ? { ...t.feature, revealed: true } : undefined,
        })),
      );
      updatedFloor = { ...floor, tiles: newTiles };
      dialogueQueue = enqueueDialogue(dialogueQueue, {
        speaker: npc.name,
        badge: npc.role,
        text: '« Pour deux pièces, voici le plan d’entretien de l’étage. Tous les pièges y sont cochés au crayon rouge. »',
        deltaText: `-${npc.bribeCost} or, carte & pièges révélés`,
        tone: 'good',
        turn: state.turn + 1,
        depth: state.depth,
      });
    } else {
      resources.water = Math.min(CONFIG.MAX_WATER, Number((resources.water + 3).toFixed(2)));
      dialogueQueue = enqueueDialogue(dialogueQueue, {
        speaker: npc.name,
        badge: npc.role,
        text: '« *Gloup.* Péage accepté. Prenez cette eau filtrée par mes soins. »',
        deltaText: `-${npc.bribeCost} or, +3 eau`,
        tone: 'good',
        turn: state.turn + 1,
        depth: state.depth,
      });
    }
  } else if (choice === 'talk') {
    npc.talked = true;
    dialogueQueue = enqueueDialogue(dialogueQueue, {
      speaker: npc.name,
      badge: npc.role,
      text: npc.rumor,
      tone: 'info',
      turn: state.turn + 1,
      depth: state.depth,
    });
  } else if (choice === 'recruit') {
    if (resources.gold < npc.recruitCost) {
      const logs = appendLog(
        state.logs,
        state.turn,
        state.depth,
        `Il faut ${npc.recruitCost} or pour recruter ${npc.name}.`,
        'warn',
      );
      return { ...state, logs };
    }
    resources.gold -= npc.recruitCost;
    npc.recruited = true;
    ally = {
      name: npc.name,
      kind: npc.kind,
      role: npc.role,
    };
    narrative.alliesRecruited += 1;
    soundFx.stamp();
    dialogueQueue = enqueueDialogue(dialogueQueue, {
      speaker: npc.name,
      badge: 'RECRUTÉ',
      text: '« Contrat signé. Si un héros vous barre la route, je m’interposerai une fois pour vous laisser fuir. »',
      deltaText: `-${npc.recruitCost} or, compagnon actif`,
      tone: 'good',
      turn: state.turn + 1,
      depth: state.depth,
    });
  } else if (choice === 'flee') {
    npc.fled = true;
    const retreat = findSafeEscapeTile(floor, state.player, { x: npc.x, y: npc.y });
    dialogueQueue = enqueueDialogue(dialogueQueue, {
      speaker: state.narrative.goblinName,
      badge: 'ESQUIVE',
      text: `Je préfère reculer d’un pas avant que ${npc.name} ne sorte un nouveau formulaire.`,
      tone: 'neutral',
      turn: state.turn + 1,
      depth: state.depth,
    });
    const newNpcs = [...updatedFloor.npcs];
    newNpcs[npcIndex] = npc;
    return advanceDungeonTurn(
      {
        ...state,
        player: retreat,
        ally,
        resources,
        narrative,
        dialogueQueue,
        modal: { type: 'none' },
        floors: { ...state.floors, [state.depth]: { ...updatedFloor, npcs: newNpcs } },
      },
      0.08,
    );
  }

  const newNpcs = [...updatedFloor.npcs];
  newNpcs[npcIndex] = npc;

  return advanceDungeonTurn(
    {
      ...state,
      ally,
      resources,
      narrative,
      dialogueQueue,
      modal: { type: 'none' },
      floors: { ...state.floors, [state.depth]: { ...updatedFloor, npcs: newNpcs } },
    },
    0.04,
  );
}

/**
 * Places a handwritten marker on the player's current tile, consuming 1 unit from a marker stack.
 */
export function placeMarkerOnCurrentTile(state: GameState, rawText: string): GameState {
  const text = rawText.trim().slice(0, 28);
  const floor = state.floors[state.depth];
  if (!floor || floor.isInn || !text) {
    return { ...state, modal: { type: 'none' } };
  }

  const tile = floor.tiles[state.player.y][state.player.x];
  const alreadyHasMarker = Boolean(tile.marker);

  let nextBag = state.bag.map((i) => ({ ...i }));
  if (!alreadyHasMarker) {
    const markerSlot = nextBag.find((i) => i.kind === 'marker' && i.quantity > 0);
    if (!markerSlot) {
      return {
        ...state,
        modal: { type: 'none' },
        logs: appendLog(state.logs, state.turn, state.depth, 'Aucun repère disponible dans le sac.', 'warn'),
      };
    }
    markerSlot.quantity -= 1;
    nextBag = nextBag.filter((i) => i.quantity > 0);
  }

  const newTiles = floor.tiles.map((r) => r.map((t) => ({ ...t })));
  newTiles[state.player.y][state.player.x] = {
    ...tile,
    marker: {
      text,
      createdTurn: state.turn,
    },
  };

  soundFx.stamp();
  const dialogueQueue = enqueueDialogue(state.dialogueQueue, {
    speaker: state.narrative.goblinName,
    badge: 'REPÈRE POSÉ',
    text: `Je trace à la craie sur la dalle : « ${text} ». Même dans l’obscurité, ma mémoire gardera cette marque.`,
    deltaText: alreadyHasMarker ? 'note mise à jour' : '-1 repère',
    tone: 'info',
    turn: state.turn,
    depth: state.depth,
  });

  return {
    ...state,
    bag: nextBag,
    modal: { type: 'none' },
    dialogueQueue,
    narrative: {
      ...state.narrative,
      markersPlaced: state.narrative.markersPlaced + (alreadyHasMarker ? 0 : 1),
    },
    floors: {
      ...state.floors,
      [state.depth]: { ...floor, tiles: newTiles },
    },
  };
}

/**
 * Uses or drops an item from the 6-slot bag.
 */
export function useBagItem(state: GameState, itemId: string, action: 'use' | 'drop'): GameState {
  const idx = state.bag.findIndex((i) => i.id === itemId);
  if (idx === -1) return state;
  const item = state.bag[idx];
  const floor = state.floors[state.depth];
  if (!floor) return state;

  const resources = { ...state.resources };
  let logs = state.logs;
  let dialogueQueue = state.dialogueQueue;
  let newBag = state.bag.filter((i) => i.id !== itemId);
  let updatedFloor = floor;

  if (action === 'drop') {
    logs = appendLog(logs, state.turn, state.depth, `${item.name} abandonné pour alléger le sac.`, 'neutral');
    if (state.modal.type === 'bag' && state.modal.pendingPickup) {
      const res = tryAddItemToBag(newBag, state.modal.pendingPickup);
      newBag = res.bag;
      logs = appendLog(logs, state.turn, state.depth, `${state.modal.pendingPickup.name} rangé dans le sac.`, 'good');
      soundFx.coin();
      return {
        ...state,
        bag: newBag,
        logs,
        modal: { type: 'none' },
      };
    }
    return { ...state, bag: newBag, logs };
  }

  if (item.kind === 'marker') {
    if (floor.isInn) {
      logs = appendLog(logs, state.turn, state.depth, 'Inutile de baliser une auberge déjà cartographiée.', 'warn');
      return { ...state, logs };
    }
    return {
      ...state,
      modal: { type: 'marker_place' },
    };
  }

  if (item.kind === 'ration') {
    resources.food = Math.min(CONFIG.MAX_FOOD, Number((resources.food + 4).toFixed(2)));
    dialogueQueue = enqueueDialogue(dialogueQueue, {
      speaker: state.narrative.goblinName,
      badge: 'RATION',
      text: 'Je croque une ration sèche de voyage. C’est dur sous la dent, mais ça remet d’aplomb.',
      deltaText: '+4 vivres',
      tone: 'good',
      turn: state.turn,
      depth: state.depth,
    });
    soundFx.coin();
  } else if (item.kind === 'waterskin') {
    resources.water = Math.min(CONFIG.MAX_WATER, Number((resources.water + 5).toFixed(2)));
    dialogueQueue = enqueueDialogue(dialogueQueue, {
      speaker: state.narrative.goblinName,
      badge: 'GOURDE',
      text: 'Une longue gorgée d’eau claire tirée de la gourde scellée.',
      deltaText: '+5 eau',
      tone: 'good',
      turn: state.turn,
      depth: state.depth,
    });
    soundFx.coin();
  } else if (item.kind === 'trap') {
    if (floor.isInn) {
      logs = appendLog(logs, state.turn, state.depth, 'Interdit de poser des pièges dans une auberge !', 'warn');
      return { ...state, logs };
    }
    const newTiles = floor.tiles.map((r) => r.map((t) => ({ ...t })));
    newTiles[state.player.y][state.player.x].feature = {
      id: `placed-trap-${state.turn}`,
      kind: 'placed_trap',
      consumed: false,
      revealed: true,
    };
    updatedFloor = { ...floor, tiles: newTiles };
    dialogueQueue = enqueueDialogue(dialogueQueue, {
      speaker: state.narrative.goblinName,
      badge: 'PIÈGE ARMÉ',
      text: 'Je tends les mâchoires du piège pliant sur cette dalle. Le prochain héros qui passe ici y laissera quatre tours.',
      tone: 'good',
      turn: state.turn,
      depth: state.depth,
    });
    soundFx.stamp();
  } else {
    return state;
  }

  if (state.modal.type === 'bag' && state.modal.pendingPickup) {
    const res = tryAddItemToBag(newBag, state.modal.pendingPickup);
    newBag = res.bag;
  }

  return {
    ...state,
    resources,
    bag: newBag,
    logs,
    dialogueQueue,
    modal: { type: 'none' },
    floors: { ...state.floors, [state.depth]: updatedFloor },
  };
}

/**
 * Performs emergency camping in the dungeon.
 */
export function performCamping(state: GameState): GameState {
  const floor = state.floors[state.depth];
  if (!floor || floor.isInn) return { ...state, modal: { type: 'none' } };

  const { oilCost, foodCost, waterCost, hpHeal, baseAmbushChance } = CONFIG.CAMP;
  if (
    state.resources.oil < oilCost ||
    state.resources.food < foodCost ||
    state.resources.water < waterCost
  ) {
    const logs = appendLog(
      state.logs,
      state.turn,
      state.depth,
      `Ressources insuffisantes pour camper (${oilCost} huile, ${foodCost} vivre, ${waterCost} eau).`,
      'warn',
    );
    return { ...state, logs, modal: { type: 'none' } };
  }

  const rng = new SeededRNG(`${state.seed}::CAMP::${state.turn}`);
  const hp = Math.min(CONFIG.MAX_HP, Number((state.resources.hp + hpHeal).toFixed(2)));
  const oil = Number((state.resources.oil - oilCost).toFixed(2));
  const food = Number((state.resources.food - foodCost).toFixed(2));
  const water = Number((state.resources.water - waterCost).toFixed(2));

  const ambushRisk = Math.min(0.65, baseAmbushChance + state.localNoise * 0.35);
  let updatedFloor = floor;
  let dialogueQueue = state.dialogueQueue;

  if (rng.chance(ambushRisk) && updatedFloor.hero && updatedFloor.hero.status === 'absent') {
    updatedFloor = {
      ...updatedFloor,
      hero: {
        ...updatedFloor.hero,
        status: 'announced',
        countdown: 3,
      },
    };
    dialogueQueue = enqueueDialogue(dialogueQueue, {
      speaker: state.narrative.goblinName,
      badge: 'BIVOUAC',
      text: 'Le petit feu a soulagé mes plaies, mais sa fumée vient d’attirer un héros tout proche (3 tours) !',
      deltaText: `+${hpHeal} PV, -${oilCost} huile`,
      tone: 'warn',
      turn: state.turn + 1,
      depth: state.depth,
    });
    soundFx.alert();
  } else {
    dialogueQueue = enqueueDialogue(dialogueQueue, {
      speaker: state.narrative.goblinName,
      badge: 'BIVOUAC',
      text: 'Un bref repos dos au mur pour bander mes écorchures avant de reprendre la route.',
      deltaText: `+${hpHeal} PV, -${oilCost} huile`,
      tone: 'good',
      turn: state.turn + 1,
      depth: state.depth,
    });
    soundFx.stamp();
  }

  return advanceDungeonTurn(
    {
      ...state,
      resources: { ...state.resources, hp, oil, food, water },
      dialogueQueue,
      modal: { type: 'none' },
      floors: { ...state.floors, [state.depth]: updatedFloor },
    },
    0.15,
  );
}

/**
 * Inn market & services handlers.
 */
export function performInnService(
  state: GameState,
  action:
    | { type: 'buy_oil' }
    | { type: 'buy_food' }
    | { type: 'buy_water' }
    | { type: 'buy_ration' }
    | { type: 'buy_waterskin' }
    | { type: 'buy_trap' }
    | { type: 'buy_markers' }
    | { type: 'sell_item'; itemId: string }
    | { type: 'sell_all_treasures' }
    | { type: 'dormitory' }
    | { type: 'hire_tavern_ally' }
    | { type: 'stamp_99_victory' },
): GameState {
  if (action.type === 'stamp_99_victory') {
    return finalizeRun(state, 'survived_99');
  }

  const resources = { ...state.resources };
  let bag = [...state.bag];
  let logs = state.logs;
  const narrative = { ...state.narrative };
  let ally = state.ally;

  if (action.type === 'buy_oil') {
    const { amount, price } = CONFIG.MARKET.oilPack;
    if (resources.gold < price) {
      return { ...state, logs: appendLog(logs, state.turn, state.depth, 'Or insuffisant.', 'warn') };
    }
    resources.gold -= price;
    resources.oil = Math.min(CONFIG.MAX_OIL, Number((resources.oil + amount).toFixed(2)));
    logs = appendLog(logs, state.turn, state.depth, `Achat d’huile : +${amount} huile (-${price} or).`, 'good');
    soundFx.coin();
  } else if (action.type === 'buy_food') {
    const { amount, price } = CONFIG.MARKET.foodPack;
    if (resources.gold < price) {
      return { ...state, logs: appendLog(logs, state.turn, state.depth, 'Or insuffisant.', 'warn') };
    }
    resources.gold -= price;
    resources.food = Math.min(CONFIG.MAX_FOOD, Number((resources.food + amount).toFixed(2)));
    logs = appendLog(logs, state.turn, state.depth, `Achat de vivres : +${amount} vivres (-${price} or).`, 'good');
    soundFx.coin();
  } else if (action.type === 'buy_water') {
    const { amount, price } = CONFIG.MARKET.waterPack;
    if (resources.gold < price) {
      return { ...state, logs: appendLog(logs, state.turn, state.depth, 'Or insuffisant.', 'warn') };
    }
    resources.gold -= price;
    resources.water = Math.min(CONFIG.MAX_WATER, Number((resources.water + amount).toFixed(2)));
    logs = appendLog(logs, state.turn, state.depth, `Achat d’eau : +${amount} eau (-${price} or).`, 'good');
    soundFx.coin();
  } else if (action.type === 'buy_markers') {
    const { amount, price } = CONFIG.MARKET.markerPack;
    if (resources.gold < price) {
      return { ...state, logs: appendLog(logs, state.turn, state.depth, 'Or insuffisant.', 'warn') };
    }
    const pack = makeBagItem('marker', `buy-m-${state.turn}-${Date.now()}`, amount);
    const res = tryAddItemToBag(bag, pack);
    if (res.leftoverItem && res.leftoverItem.quantity === amount) {
      return {
        ...state,
        logs: appendLog(logs, state.turn, state.depth, 'Sac plein ! Libérez un emplacement pour ce lot de repères.', 'warn'),
      };
    }
    resources.gold -= price;
    bag = res.bag;
    logs = appendLog(
      logs,
      state.turn,
      state.depth,
      `Acheté : lot de repères à la craie (-${price} or).`,
      'good',
    );
    soundFx.coin();
  } else if (
    action.type === 'buy_ration' ||
    action.type === 'buy_waterskin' ||
    action.type === 'buy_trap'
  ) {
    const price =
      action.type === 'buy_ration'
        ? CONFIG.MARKET.rationItem.price
        : action.type === 'buy_waterskin'
        ? CONFIG.MARKET.waterskinItem.price
        : CONFIG.MARKET.trapItem.price;
    const kind: BagItemKind =
      action.type === 'buy_ration'
        ? 'ration'
        : action.type === 'buy_waterskin'
        ? 'waterskin'
        : 'trap';

    if (resources.gold < price) {
      return { ...state, logs: appendLog(logs, state.turn, state.depth, 'Or insuffisant.', 'warn') };
    }
    if (bag.length >= CONFIG.PORTAGE) {
      return {
        ...state,
        logs: appendLog(logs, state.turn, state.depth, 'Votre sac (6/6) est plein ! Vendez ou jetez un objet.', 'warn'),
      };
    }
    const newItem = makeBagItem(kind, `buy-${state.turn}-${Date.now()}-${bag.length}`);
    resources.gold -= price;
    bag.push(newItem);
    logs = appendLog(logs, state.turn, state.depth, `Acheté : ${newItem.name} (-${price} or).`, 'good');
    soundFx.coin();
  } else if (action.type === 'sell_item') {
    const item = bag.find((i) => i.id === action.itemId);
    if (!item) return state;
    resources.gold += item.sellValue;
    bag = bag.filter((i) => i.id !== action.itemId);
    if (item.kind === 'jewel' || item.kind === 'relic') {
      narrative.treasuresSold += 1;
    }
    logs = appendLog(logs, state.turn, state.depth, `Vendu : ${item.name} (+${item.sellValue} or).`, 'good');
    soundFx.coin();
  } else if (action.type === 'sell_all_treasures') {
    const treasures = bag.filter((i) => i.kind === 'jewel' || i.kind === 'relic');
    if (treasures.length === 0) return state;
    const total = treasures.reduce((acc, i) => acc + i.sellValue, 0);
    resources.gold += total;
    bag = bag.filter((i) => i.kind !== 'jewel' && i.kind !== 'relic');
    narrative.treasuresSold += treasures.length;
    logs = appendLog(
      logs,
      state.turn,
      state.depth,
      `Comptoir : ${treasures.length} trésor(s) liquidé(s) pour +${total} or.`,
      'good',
    );
    soundFx.coin();
  } else if (action.type === 'dormitory') {
    const price = CONFIG.MARKET.dormitoryPrice;
    if (resources.gold < price) {
      return { ...state, logs: appendLog(logs, state.turn, state.depth, 'Or insuffisant pour le dortoir.', 'warn') };
    }
    if (resources.hp >= CONFIG.MAX_HP) {
      return { ...state, logs: appendLog(logs, state.turn, state.depth, 'Vos PV sont déjà au maximum.', 'info') };
    }
    resources.gold -= price;
    resources.hp = CONFIG.MAX_HP;
    logs = appendLog(logs, state.turn, state.depth, `Nuit paisible au dortoir : PV restaurés à ${CONFIG.MAX_HP}/${CONFIG.MAX_HP}.`, 'good');
    soundFx.stamp();
  } else if (action.type === 'hire_tavern_ally') {
    const cost = 4;
    if (ally) {
      return { ...state, logs: appendLog(logs, state.turn, state.depth, `${ally.name} vous accompagne déjà.`, 'warn') };
    }
    if (resources.gold < cost) {
      return { ...state, logs: appendLog(logs, state.turn, state.depth, `Il faut ${cost} or pour recruter un acolyte.`, 'warn') };
    }
    resources.gold -= cost;
    ally = {
      name: 'Biscuit le Rat-Portier',
      kind: 'rat_percepteur',
      role: 'Éclaireur sous contrat',
    };
    narrative.alliesRecruited += 1;
    logs = appendLog(logs, state.turn, state.depth, `${ally.name} signe le formulaire d’accompagnement (-4 or).`, 'good');
    soundFx.stamp();
  }

  return {
    ...state,
    resources,
    bag,
    logs,
    narrative,
    ally,
  };
}

export function getSurvivalSuggestion(
  state: GameState,
): { label: string; itemId: string } | null {
  const { resources, bag } = state;
  if (resources.water <= CONFIG.CRITICAL_THRESHOLDS.water) {
    const waterskin = bag.find((i) => i.kind === 'waterskin');
    if (waterskin) return { label: 'Boire gourde (+5 eau)', itemId: waterskin.id };
  }
  if (resources.food <= CONFIG.CRITICAL_THRESHOLDS.food) {
    const ration = bag.find((i) => i.kind === 'ration');
    if (ration) return { label: 'Manger ration (+4 vivres)', itemId: ration.id };
  }
  return null;
}

export function getContextAction(
  state: GameState,
  dispatch: (updater: (s: GameState) => GameState) => void,
): ContextAction | null {
  const floor = state.floors[state.depth];
  if (!floor || state.screen !== 'playing') return null;

  const tile = floor.tiles[state.player.y][state.player.x];

  // Stepping onto a find is never blocked. Inspect only when the player chooses.
  if (
    tile.feature &&
    tile.feature.revealed &&
    !tile.feature.consumed &&
    tile.feature.kind !== 'trap' &&
    tile.feature.kind !== 'placed_trap'
  ) {
    const label =
      tile.feature.kind === 'chest'
        ? 'Examiner le coffre'
        : tile.feature.kind === 'mushroom'
        ? 'Examiner le champignon'
        : tile.feature.kind === 'corpse'
        ? 'Fouiller la dépouille'
        : tile.feature.kind === 'well'
        ? 'Examiner le puits'
        : 'Examiner la flaque';

    return {
      id: 'inspect_feature',
      label,
      shortHint: 'Espace / Entrée',
      execute: () =>
        dispatch((s) => ({
          ...s,
          modal: { type: 'feature', x: s.player.x, y: s.player.y },
        })),
    };
  }

  if (tile.kind === 'stairs_down') {
    return {
      id: 'stairs_down',
      label: `Descendre (${state.depth - 1})`,
      shortHint: 'Espace / Entrée',
      urgent: true,
      execute: () => dispatch((s) => useStairs(s, 'down')),
    };
  }

  if (tile.kind === 'stairs_up') {
    return {
      id: 'stairs_up',
      label: `Remonter (${state.depth + 1})`,
      shortHint: 'Espace / Entrée',
      urgent: true,
      execute: () => dispatch((s) => useStairs(s, 'up')),
    };
  }

  return {
    id: 'action_menu',
    label: floor.isInn ? 'Sac / Carte' : 'Actions (Fouiller, Camper…)',
    shortHint: 'Espace / Entrée',
    execute: () => dispatch((s) => ({ ...s, modal: { type: 'action_menu' } })),
  };
}

export function getNearestInnInfo(depth: number): { label: string; distance: number } {
  if (isInnDepth(depth)) {
    return { label: 'En sécurité dans un refuge', distance: 0 };
  }
  const prevInn = Math.ceil(depth / CONFIG.FLOORS_PER_INN) * CONFIG.FLOORS_PER_INN;
  const nextInn = prevInn - CONFIG.FLOORS_PER_INN;
  const distUp = Math.abs(depth - prevInn);
  const distDown = Math.abs(nextInn - depth);

  if (nextInn < CONFIG.TARGET_DEPTH) {
    return {
      label: `Refuge précédent à ${distUp} étage${distUp > 1 ? 's' : ''} (${prevInn})`,
      distance: distUp,
    };
  }
  if (distUp <= distDown) {
    return { label: `Refuge ${prevInn} à ${distUp} ét. au-dessus`, distance: distUp };
  }
  return { label: `Prochain refuge (${nextInn}) à ${distDown} ét.`, distance: distDown };
}
