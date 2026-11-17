import { CONFIG } from './config';
import { SeededRNG } from './rng';
import { GameState, MemorialEntry } from './types';

const ADMIN_TITLES = [
  'Comptabilité du désastre',
  'Une fin tout à fait réglementaire',
  'Le donjon a classé votre dossier',
  'Quittance définitive de survie',
  'Procès-verbal de disparition souterraine',
  'Clôture de compte sans appel',
  'Bordereau d’inhumation n°99-B',
  'Archive d’un gobelin trop curieux',
];

const GOBLIN_NAMES = [
  'Krik',
  'Grum',
  'Sniv',
  'Brikol',
  'Zoglet',
  'Poussière',
  'Fripouille',
  'Trogne',
  'Mouche',
  'Rognon',
  'Cliquet',
  'Biscuit',
];

const GOBLIN_TRAITS = [
  'dos voûté et lanterne tremblante',
  'petite bourse et grandes oreilles',
  'prudence presque exemplaire',
  'semelles trouées mais cœur alerte',
  'goût immodéré pour les inventaires',
  'flair douteux mais tenace',
];

const ABSURD_CODAS = [
  'Le formulaire de réclamation devra être déposé en trois exemplaires par ses ayants droit.',
  'L’administration remercie le défunt d’avoir libéré un emplacement de sac.',
  'Sa petite cuillère réglementaire a été réaffectée au service des poussières.',
  'Aucun héros n’a jugé utile de noter cet incident dans son journal de quête.',
  'Son dossier porte désormais la mention : « Soldé pour manque de souffle ».',
];

const MELANCHOLIC_CODAS = [
  'La mèche s’est tue bien avant qu’on retrouve la sortie.',
  'Il aura au moins vu un peu plus loin que le seuil de la porte.',
  'Quelque part au-dessus, un comptoir attend encore qu’on vienne y compter deux pièces.',
  'Dans le noir, les murs se souviennent un instant de ses pas prudents.',
  'Une petite ombre de moins dans un couloir déjà bien trop grand.',
];

export function rollGoblinIdentity(seed: string): { name: string; trait: string } {
  const rng = new SeededRNG(`${seed}::IDENTITY`);
  return {
    name: rng.pick(GOBLIN_NAMES),
    trait: rng.pick(GOBLIN_TRAITS),
  };
}

export function loadMemorial(): MemorialEntry[] {
  try {
    const raw = localStorage.getItem(CONFIG.MEMORIAL_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as MemorialEntry[];
  } catch {
    return [];
  }
}

export function saveMemorialEntry(entry: MemorialEntry): MemorialEntry[] {
  const existing = loadMemorial();
  const updated = [entry, ...existing].slice(0, CONFIG.MEMORIAL_MAX_ENTRIES);
  try {
    localStorage.setItem(CONFIG.MEMORIAL_KEY, JSON.stringify(updated));
  } catch {
    // Tolerant to quota / private browsing errors
  }
  return updated;
}

export function clearMemorial(): void {
  try {
    localStorage.removeItem(CONFIG.MEMORIAL_KEY);
  } catch {
    // Ignore storage error
  }
}

function formatDistanceToInn(depth: number, lastInnDepth: number, lastInnName: string): string {
  const dist = Math.abs(depth - lastInnDepth);
  if (dist === 0) {
    return `au seuil même de ${lastInnName}`;
  }
  if (dist === 1) {
    return `à un seul étage de ${lastInnName}`;
  }
  return `à ${dist} étages de ${lastInnName}`;
}

function pickAntiRepeat<T extends string>(
  pool: readonly T[],
  recentlyUsed: string[],
  rng: SeededRNG,
): T {
  const fresh = pool.filter((item) => !recentlyUsed.includes(item));
  const candidates = fresh.length > 0 ? fresh : pool;
  return rng.pick(candidates);
}

/**
 * Generates a deterministic epitaph purely from observed run events (zero generative AI).
 */
export function buildEpitaph(
  state: GameState,
  outcome: 'dead' | 'survived_99',
): MemorialEntry {
  const rng = new SeededRNG(`${state.seed}::EPITAPH::${state.turn}::${state.depth}`);
  const history = loadMemorial();
  const recentTitles = history.slice(0, 4).map((h) => h.title);

  const title =
    outcome === 'survived_99'
      ? 'Homologation exceptionnelle — Étage -99'
      : pickAntiRepeat(ADMIN_TITLES, recentTitles, rng);

  const { narrative } = state;
  const distPhrase = formatDistanceToInn(
    state.depth,
    narrative.lastInnDepth,
    narrative.lastInnName,
  );

  const notableParts: string[] = [];
  if (narrative.allySacrificedName) {
    notableParts.push(
      `${narrative.allySacrificedName} s’était sacrifié pour lui laisser une chance`,
    );
  }
  if (narrative.heroesEvaded > 0) {
    notableParts.push(
      `il avait déjoué ${narrative.heroesEvaded} approche${narrative.heroesEvaded > 1 ? 's' : ''} de héros`,
    );
  }
  if (narrative.lastMushroomColor && narrative.lastMushroomEffect) {
    const labelMap: Record<string, string> = {
      beneficial: 'étonnamment nourrissant',
      neutral: 'sans saveur particulière',
      toxic: 'nettement amer',
      hallucinatory: 'un peu trop bavard',
    };
    notableParts.push(
      `son dernier champignon ${narrative.lastMushroomColor} s’était révélé ${labelMap[narrative.lastMushroomEffect]}`,
    );
  }
  if (narrative.treasuresSold > 0) {
    notableParts.push(
      `il avait déjà écoulé ${narrative.treasuresSold} trésor${narrative.treasuresSold > 1 ? 's' : ''} au comptoir`,
    );
  }
  if (narrative.markersPlaced > 0) {
    notableParts.push(
      `il avait laissé ${narrative.markersPlaced} repère${narrative.markersPlaced > 1 ? 's' : ''} à la craie dans les galeries`,
    );
  }
  if (notableParts.length === 0) {
    notableParts.push(
      `il avait arpenté ${narrative.stairsCrossed} volée${narrative.stairsCrossed > 1 ? 's' : ''} d’escaliers en ${state.turn} tours`,
    );
  }

  const factSentence = `${notableParts[0].charAt(0).toUpperCase()}${notableParts[0].slice(1)}.`;

  let body: string;
  if (outcome === 'survived_99') {
    body = `${narrative.goblinName}, gobelin au ${narrative.goblinTrait}, a atteint la Chambre des Archives (-99) après ${state.turn} tours et fait tamponner son registre de survie. ${factSentence} Les héros n’ont jamais remarqué la petite signature en bas de page.`;
  } else {
    const useMelancholic =
      narrative.allySacrificedName !== null ||
      state.maxDepthReached <= -8 ||
      rng.chance(0.45);
    const coda = useMelancholic
      ? rng.pick(MELANCHOLIC_CODAS)
      : rng.pick(ABSURD_CODAS);

    body = `${narrative.goblinName}, gobelin au ${narrative.goblinTrait}, est ${narrative.causeOfDeath} à l’étage ${state.depth}, ${distPhrase}. ${factSentence} ${coda}`;
  }

  return {
    id: `${state.seed}-${Date.now()}`,
    seed: state.seed,
    dateIso: new Date().toISOString(),
    title,
    epitaph: body,
    goblinName: narrative.goblinName,
    maxDepth: state.maxDepthReached,
    turns: state.turn,
    cause: outcome === 'survived_99' ? 'Survie homologuée à -99' : narrative.causeOfDeath,
    outcome,
    lastInnName: narrative.lastInnName,
  };
}
