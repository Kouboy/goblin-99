import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Columns2,
  Compass,
  Eye,
  FileSearch,
  Flame,
  Layers,
  Maximize2,
  Pause,
  Play,
  RotateCcw,
  ShieldAlert,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import imgAtmospherique from '../assets/images/fusain_phase_a_atmospherique_1794934271048.jpg';
import imgContraste from '../assets/images/fusain_phase_a_contraste_1794934269769.jpg';
import imgGestuel from '../assets/images/fusain_phase_a_gestuel_1794934272817.jpg';
import { soundFx } from '../game/audio';
import { buildFusainPixelAtlas, FusainPixelAtlas } from '../game/fusainPixelSprites';
import {
  DustMote,
  FootprintMark,
  FusainVariationId,
  getSceneTile,
  GRID_H,
  GRID_W,
  HERO_PATROL,
  isWalkable,
  PitExperimentId,
  renderPhaseCFrame,
  SceneRenderSnapshot,
} from '../game/fusainPitRenderer';

interface FusainStudioViewProps {
  onBack: () => void;
}

interface VariationSpec {
  id: FusainVariationId;
  code: string;
  title: string;
  subtitle: string;
  image: string;
  intent: string;
  readability: string;
  personality: string;
  production: string;
  verdict: string;
}

interface ExperimentSpec {
  id: PitExperimentId;
  keyHint: string;
  shortLabel: string;
  title: string;
  hypothesis: string;
  mechanism: string;
  parallaxRule: string;
  limitNote: string;
}

const VARIATIONS: VariationSpec[] = [
  {
    id: 'contraste',
    code: 'Variation 01',
    title: 'Masses fortement contrastées',
    subtitle: 'Fusain compressé · Noirs absolus · Craie chirurgicale',
    image: imgContraste,
    intent:
      'Découper le monde en grands blocs noirs muets et arêtes nettes à la craie. Le vide du Grand Puits devient une absence graphique totale.',
    readability:
      'Excellente à petite échelle : les silhouettes, la passerelle, le coffre et le Héros restent lisibles instantanément même en mouvement rapide.',
    personality:
      'Très forte identité graphique proche de la gravure moderne. Risque léger : un rendu parfois plus austère et géométrique que tendre.',
    production:
      'Très économique : quelques masques monochromes suffisent, faciles à décliner en couches parallaxes et éclairage temps réel.',
    verdict: 'Meilleur socle de lisibilité gameplay',
  },
  {
    id: 'gestuel',
    code: 'Variation 02',
    title: 'Dessin gestuel expressif',
    subtitle: 'Bâton de fusain · Hachures vives · Contours brisés',
    image: imgGestuel,
    intent:
      'Conserver l’énergie du trait manuel, les hachures nervurées et l’imperfection anatomique des habitants et des passerelles fragiles.',
    readability:
      'Bonne si les hachures restent contenues hors des couloirs praticables ; exige une discipline stricte pour ne pas saturer le sol.',
    personality:
      'Maximum d’humour et de tendresse gobeline. Le rat, le concierge squelette et la démarche bossue semblent vivants dès l’image fixe.',
    production:
      'Exige une bibliothèque cohérente de brosses/sprites dessinés à la main, mais très animable par découpe de membres simples.',
    verdict: 'Meilleure incarnation des personnages',
  },
  {
    id: 'atmospherique',
    code: 'Variation 03',
    title: 'Approche atmosphérique effacée',
    subtitle: 'Poussière de graphite · Estompe · Soustraction à la gomme',
    image: imgAtmospherique,
    intent:
      'Construire la lumière par soustraction dans la poussière de charbon : la lanterne efface littéralement l’obscurité autour du gobelin.',
    readability:
      'Délicate sur les bords lointains : la dissolution des murs impose des repères de craie ou de sol francs pour éviter toute ambiguïté de case.',
    personality:
      'Vertige maximal et mélancolie poétique. Le gobelin paraît minuscule et fragile face à un abîme sans fond mesurable.',
    production:
      'Très adaptée au Canvas HTML5 grâce aux masques radiaux soustractifs superposés à un fond grainé unique.',
    verdict: 'Meilleure sensation de vertige et d’échelle',
  },
];

const EXPERIMENTS: ExperimentSpec[] = [
  {
    id: 'initial',
    keyHint: '1',
    shortLabel: 'Initial',
    title: 'Référence initiale (Bayer 336×216)',
    hypothesis: 'Fond rectangulaire à 4 strates parallaxes + trame Bayer sur les dalles.',
    mechanism: 'Strates flottantes décalées par la position du joueur, bord du gouffre d’épaisseur 1 px.',
    parallaxRule: 'Parallaxe libre (indispensable pour sentir les plans).',
    limitNote: 'Sur image fixe, le gouffre s’aplatit en motif décoratif sans paroi verticale franche.',
  },
  {
    id: 'exp_a',
    keyHint: '2',
    shortLabel: 'Exp. A · Paroi',
    title: 'Expérience A — Paroi verticale & occlusion',
    hypothesis: 'Prouver qu’on regarde par-dessus un bord vertical sans aucun mouvement.',
    mechanism:
      'Rebord épais biseauté, falaise striée vers le bas, ombres portées, poutre et chaîne occultées sous le pont et l’éperon.',
    parallaxRule: 'Parallaxe strictement verrouillée à OFF.',
    limitNote: 'La lecture reste frontale sur un seul pan de falaise : l’espace latéral du puits manque encore de volume 3D.',
  },
  {
    id: 'exp_b',
    keyHint: '3',
    shortLabel: 'Exp. B · 3D unifiée',
    title: 'Expérience B — Architecture verticale cohérente',
    hypothesis: 'Relier les étages par un point de fuite vertical unique et un câble maître continu.',
    mechanism:
      'Projection vers un point de fuite inférieur unique, treuil ancré au niveau 0, 3 plateformes proportionnées et passerelle est occultée.',
    parallaxRule: 'Parallaxe optionnelle strictement bornée.',
    limitNote: 'Les anneaux concentriques risquent une lecture « cage d’ascenseur » géométrique si le fusain reste trop régulier.',
  },
  {
    id: 'exp_b2',
    keyHint: '4',
    shortLabel: 'Exp. B2 · Gestuel dense',
    title: 'Exp. B2 — Gestuel dense (charpente Exp. B + matière fusain)',
    hypothesis:
      'Conserver la charpente spatiale unifiée de l’Exp. B tout en réinjectant le grain, les hachures, la lèvre physique du bord, l’occlusion et une parallaxe hiérarchisée sur 4 strates.',
    mechanism:
      'Point de fuite vertical unifié, 4 plans à parallaxe calibrée (proche/moyen/lointain/abyssal), traits de fusain brisés, hachures directionnelles, roche en surplomb, niche occultée, rebord épais et 4 micro-événements lointains.',
    parallaxRule: 'Parallaxe hiérarchisée sur 4 niveaux (activable/coupable via P).',
    limitNote:
      'Demande de doser l’épaisseur des hachures au sol pour préserver la lecture immédiate des cases autour du coffre et de la passerelle.',
  },
  {
    id: 'exp_c',
    keyHint: '5',
    shortLabel: 'Exp. C · Hybride',
    title: 'Expérience C — Représentation hybride (coupe oblique ~65°)',
    hypothesis: 'Garder une grille jouable en vue de dessus pendant que l’ouverture bascule en coupe verticale.',
    mechanism:
      'Parois convergentes au fusain frotté, arche cyclopéenne et cage géante (×3) au -1, auberge miniature éclairée au -2.',
    parallaxRule: 'Parallaxe légère optionnelle.',
    limitNote: 'Demande de masquer soigneusement la couture entre le bord plan du sol et la coupe oblique du vide.',
  },
];

interface EvaluationRow {
  criterion: string;
  initial: string;
  expA: string;
  expB: string;
  expB2: string;
  expC: string;
}

const EVALUATION_MATRIX: EvaluationRow[] = [
  {
    criterion: '1. Sensation de hauteur et d’abîme (image fixe)',
    initial: 'Faible : les strates se superposent sans bord vertical épais ni fuite vers le bas.',
    expA: 'Bonne : on perçoit immédiatement une falaise sous la corniche et des pilotis ancrés dans la roche.',
    expB: 'Forte : la convergence vers le point de fuite inférieur aspire le regard vers les strates profondes.',
    expB2: 'Très forte : les 4 strates hachurées, l’ombre sous la margelle et le puits noir central creusent l’abîme même figé.',
    expC: 'Très forte : le contraste d’échelle (cage ×3, auberge minuscule au -2) crée un choc vertical immédiat.',
  },
  {
    criterion: '2. Lisibilité des cases jouables',
    initial: 'Correcte mais bruitée par le tramage Bayer sur le grain du sol.',
    expA: 'Exemplaire : rebords nets à la craie, séparation franche entre sol praticable et paroi plongeante.',
    expB: 'Très bonne : le treuil reste ancré hors grille jouable sans gêner le passage de la passerelle.',
    expB2: 'Très bonne : lèvre épaisse à la craie et poteaux de garde-corps soulignent physiquement la frontière du vide.',
    expC: 'Très bonne : les cases et sprites 48×48 restent strictement orthogonaux malgré l’ouverture oblique.',
  },
  {
    criterion: '3. Contraste d’échelle (Gobelin vs Architecture)',
    initial: 'Modéré : la roue lointaine paraît juste plate, sans objet intermédiaire calibré.',
    expA: 'Moyen : la poutre et la chaîne donnent de l’épaisseur, mais l’échelle monumentale reste timide.',
    expB: 'Bon : la décroissance progressive des trois plateformes mesure objectivement l’éloignement.',
    expB2: 'Très bon : cage intermédiaire, passerelle occultée, arche cyclopéenne et nacelle minuscule étagent l’échelle.',
    expC: 'Optimal : la cage cyclopéenne et la petite fenêtre d’auberge en contrebas écrasent littéralement le gobelin.',
  },
  {
    criterion: '4. Cohérence avec le Fusain Abyssal',
    initial: 'Moyenne : la trame Bayer systématique donne un aspect rétro numérique plutôt que frotté.',
    expA: 'Forte : noirs profonds, traits gestuels brisés et poudre de craie sur les arêtes de fracture.',
    expB: 'Correcte : la perspective 3D introduit des lignes géométriques qu’il faut casser manuellement au trait.',
    expB2: 'Optimale : doubles traits de fusain interrompus, hachures directionnelles, noirs d’estompe et blancs rares.',
    expC: 'Excellente : grandes masses noires, estompe soustractive autour de la lanterne, blanc réservé aux repères.',
  },
  {
    criterion: '5. Stabilité visuelle lors des déplacements',
    initial: 'Fragile : la parallaxe à 4 vitesses attire l’œil sur le glissement du décor plutôt que le vertige.',
    expA: 'Parfaite : zéro parallaxe, aucun décalage parasite entre la passerelle et le fond.',
    expB: 'Très stable : le décalage borné suit une géométrie projetée cohérente sans cisaillement.',
    expB2: 'Maîtrisée : parallaxe hiérarchisée (proche sensible → fond quasi immobile) sans faire flotter les plans.',
    expC: 'Bonne si le déplacement oblique reste subtil (≤ 2 px) et désactivable.',
  },
  {
    criterion: '6. Compatibilité avec la génération procédurale',
    initial: 'Limitée : les repères de worldGen.ts restent purement textuels et non positionnés dans le vide.',
    expA: 'Immédiate : s’applique à n’importe quel contour de puits généré (balcon, fenêtre, corniche).',
    expB: 'Exige un axe central de puits partagé entre étages et des coordonnées normalisées dans PitLandmark.',
    expB2: 'Élevée : même socle paramétrique que Exp. B, complété par des modules de bord et d’occlusion génériques.',
    expC: 'Bien adaptée dès lors que la zone de coupe dispose d’un rect de vide minimal (≥ 4 cases de large).',
  },
  {
    criterion: '7. Complexité d’intégration dans DungeonCanvas',
    initial: 'Déjà proche de l’existant, mais perpétue le découpage case par case dans drawPitTile().',
    expA: 'Faible : remplace simplement drawPitTile() par une passe unifiée du contour de gouffre.',
    expB: 'Moyenne : requiert un calcul de boîte englobante du puits et une projection par profondeur Z.',
    expB2: 'Moyenne : boîte englobante du puits + primitives gestuelles légères réutilisables sur tout le donjon.',
    expC: 'Moyenne : passe unique de rendu du puits avant les passerelles, avec table de repères multi-étages.',
  },
];

interface PhaseCState {
  player: { x: number; y: number; facing: 1 | -1 };
  chest: { x: number; y: number; state: 'locked' | 'resisted' | 'open' };
  rat: { x: number; y: number; spokeCount: number };
  heroStepIdx: number;
  turn: number;
  coins: number;
  oil: number;
  message: string;
  speaker: string;
}

function createInitialPhaseC(): PhaseCState {
  return {
    player: { x: 3, y: 4, facing: 1 },
    chest: { x: 7, y: 3, state: 'locked' },
    rat: { x: 4, y: 5, spokeCount: 0 },
    heroStepIdx: 0,
    turn: 0,
    coins: 6,
    oil: 8,
    speaker: 'Observation',
    message:
      'Vous quittez le seuil de l’auberge vers la passerelle du Grand Puits. Basculez entre les 5 rendus (1–5) ou ouvrez le comparatif complet (K).',
  };
}

export const FusainStudioView: React.FC<FusainStudioViewProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'explore' | 'phase_c' | 'audit'>('phase_c');
  const [variation, setVariation] = useState<FusainVariationId>('gestuel');
  const [experiment, setExperiment] = useState<PitExperimentId>('exp_b2');
  const [parallaxEnabled, setParallaxEnabled] = useState<boolean>(true);
  const [compareGridMode, setCompareGridMode] = useState<boolean>(false);
  const [frozenFrame, setFrozenFrame] = useState<boolean>(false);
  const [lightboxId, setLightboxId] = useState<FusainVariationId | null>(null);
  const [scene, setScene] = useState<PhaseCState>(() => createInitialPhaseC());

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const compareCanvasRefs = useRef<Record<PitExperimentId, HTMLCanvasElement | null>>({
    initial: null,
    exp_a: null,
    exp_b: null,
    exp_b2: null,
    exp_c: null,
  });
  const bufInitialRef = useRef<HTMLCanvasElement | null>(null);
  const bufHybridRef = useRef<HTMLCanvasElement | null>(null);
  const atlasRef = useRef<FusainPixelAtlas | null>(null);

  const sceneRef = useRef<PhaseCState>(scene);
  sceneRef.current = scene;
  const variationRef = useRef<FusainVariationId>(variation);
  variationRef.current = variation;
  const experimentRef = useRef<PitExperimentId>(experiment);
  experimentRef.current = experiment;
  const parallaxRef = useRef<boolean>(parallaxEnabled);
  parallaxRef.current = parallaxEnabled;
  const compareGridRef = useRef<boolean>(compareGridMode);
  compareGridRef.current = compareGridMode;
  const frozenRef = useRef<boolean>(frozenFrame);
  frozenRef.current = frozenFrame;

  const animRef = useRef({
    renderX: 3,
    renderY: 4,
    walkPhase: 0,
    stepPulse: 0,
    lanternX: 3.18,
    lanternY: 4.02,
    lanternVx: 0,
    lanternVy: 0,
    chestShake: 0,
    chestOpenProgress: 0,
    ratFlinch: 0,
    heroRenderX: HERO_PATROL[0].x,
    heroRenderY: HERO_PATROL[0].y,
    heroPulse: 0,
    heroStepTimer: 0,
    bridgeSagX: -1,
    bridgeSagTimer: 0,
    footprints: [] as FootprintMark[],
    motes: [] as DustMote[],
    lastTs: 0,
    frozenTs: 0,
  });

  const spawnMotes = useCallback(
    (gx: number, gy: number, count: number, chalk = false, downward = false) => {
      const a = animRef.current;
      for (let i = 0; i < count; i++) {
        if (a.motes.length >= 24) a.motes.shift();
        a.motes.push({
          x: gx + (Math.random() - 0.5) * 0.48,
          y: gy + (Math.random() - 0.5) * 0.35,
          vx: (Math.random() - 0.5) * 0.42,
          vy: downward ? 0.35 + Math.random() * 0.55 : -0.28 - Math.random() * 0.45,
          life: 0,
          maxLife: 0.75 + Math.random() * 0.65,
          size: 1,
          chalk,
        });
      }
    },
    [],
  );

  const resetPhaseC = useCallback(() => {
    const fresh = createInitialPhaseC();
    setScene(fresh);
    animRef.current = {
      renderX: fresh.player.x,
      renderY: fresh.player.y,
      walkPhase: 0,
      stepPulse: 0,
      lanternX: fresh.player.x + 0.18,
      lanternY: fresh.player.y + 0.02,
      lanternVx: 0,
      lanternVy: 0,
      chestShake: 0,
      chestOpenProgress: 0,
      ratFlinch: 0,
      heroRenderX: HERO_PATROL[0].x,
      heroRenderY: HERO_PATROL[0].y,
      heroPulse: 0,
      heroStepTimer: 0,
      bridgeSagX: -1,
      bridgeSagTimer: 0,
      footprints: [],
      motes: [],
      lastTs: performance.now(),
      frozenTs: performance.now(),
    };
  }, []);

  const advanceHeroStep = useCallback((prev: PhaseCState): PhaseCState => {
    const nextIdx = Math.min(HERO_PATROL.length - 1, prev.heroStepIdx + 1);
    return { ...prev, heroStepIdx: nextIdx };
  }, []);

  const interactAt = useCallback(
    (tx: number, ty: number) => {
      const current = sceneRef.current;
      if (tx === current.chest.x && ty === current.chest.y) {
        if (current.chest.state === 'locked') {
          animRef.current.chestShake = 1;
          animRef.current.ratFlinch = 0.65;
          spawnMotes(tx, ty, 4, true);
          soundFx.bumpWall();
          setScene((prev) => ({
            ...prev,
            turn: prev.turn + 1,
            chest: { ...prev.chest, state: 'resisted' },
            speaker: 'Coffre ferré',
            message:
              'La serrure grippe dans un claquement sec ! Le coffre résiste et tremble sur l’éperon rocheux. Réessayez pour forcer le pêne.',
          }));
          return true;
        }
        if (current.chest.state === 'resisted') {
          animRef.current.chestShake = 0.45;
          animRef.current.ratFlinch = 0.9;
          spawnMotes(tx, ty, 7, true);
          soundFx.coin();
          setScene((prev) =>
            advanceHeroStep({
              ...prev,
              turn: prev.turn + 1,
              coins: prev.coins + 8,
              oil: Math.min(12, prev.oil + 1),
              chest: { ...prev.chest, state: 'open' },
              speaker: 'Coffre ouvert',
              message:
                'Le couvercle cède dans un nuage de poussière blanche : +8 pièces d’ardoise, +1 fiole d’huile. Le bruit attire le Héros…',
            }),
          );
          return true;
        }
        setScene((prev) => ({
          ...prev,
          speaker: 'Coffre vide',
          message: 'Le coffre grince à vide au bord de l’abîme.',
        }));
        return true;
      }

      if (tx === current.rat.x && ty === current.rat.y) {
        animRef.current.ratFlinch = 1;
        spawnMotes(tx, ty, 3, false);
        soundFx.stamp();
        const heroPos = HERO_PATROL[current.heroStepIdx];
        const heroDist = Math.abs(heroPos.x - current.rat.x) + Math.abs(heroPos.y - current.rat.y);
        setScene((prev) => {
          const nextSpoke = prev.rat.spokeCount + 1;
          const msg =
            heroDist <= 6
              ? '« Chut ! Il porte du blanc pur sur les épaules… Rentrez derrière la fenêtre de l’auberge si vous tenez à votre matricule ! »'
              : nextSpoke % 2 === 1
              ? 'Le rat relève précipitamment son grand livre : « Péage de passerelle : zéro si vous ne tombez pas dans le Puits. Mon encre coûte cher. »'
              : 'Il lisse ses moustaches poussiéreuses : « On raconte qu’un gobelin niveau 1 cherche le Maître tout en bas… Quelle paperasse. »';
          return {
            ...prev,
            rat: { ...prev.rat, spokeCount: nextSpoke },
            speaker: 'Rat percepteur',
            message: msg,
          };
        });
        return true;
      }

      if (getSceneTile(tx, ty) === 'inn_window') {
        soundFx.pitClang();
        setScene((prev) => ({
          ...prev,
          speaker: 'Fenêtre d’auberge',
          message:
            'Une chaleur timide filtre derrière le treillis de fer : odeur de graisse chaude et de tisane de mousse à deux pas du gouffre.',
        }));
        return true;
      }

      if (getSceneTile(tx, ty) === 'pit') {
        soundFx.pitGaze();
        setScene((prev) => ({
          ...prev,
          speaker: 'Le Grand Puits',
          message:
            'Sous la margelle de roche cassée, les parois plongent vers des installations suspendues et une auberge minuscule tout en bas.',
        }));
        return true;
      }

      return false;
    },
    [advanceHeroStep, spawnMotes],
  );

  const handlePhaseCMove = useCallback(
    (dx: number, dy: number) => {
      const current = sceneRef.current;
      const nx = current.player.x + dx;
      const ny = current.player.y + dy;
      const facing: 1 | -1 = dx < 0 ? -1 : dx > 0 ? 1 : current.player.facing;

      if (
        (nx === current.chest.x && ny === current.chest.y) ||
        (nx === current.rat.x && ny === current.rat.y) ||
        getSceneTile(nx, ny) === 'pit' ||
        getSceneTile(nx, ny) === 'inn_window'
      ) {
        setScene((prev) => ({ ...prev, player: { ...prev.player, facing } }));
        interactAt(nx, ny);
        return;
      }

      const heroPos = HERO_PATROL[current.heroStepIdx];
      if (nx === heroPos.x && ny === heroPos.y) {
        animRef.current.heroPulse = 1;
        soundFx.alert();
        setScene((prev) => ({
          ...prev,
          speaker: 'Danger immédiat',
          message:
            'Trop près ! Sa silhouette tranchante vous glace le sang. Reculez vers l’auberge à gauche.',
        }));
        return;
      }

      if (!isWalkable(nx, ny)) {
        soundFx.bumpWall();
        return;
      }

      animRef.current.stepPulse = 1;
      if (getSceneTile(current.player.x, current.player.y) !== 'bridge') {
        if (animRef.current.footprints.length >= 14) animRef.current.footprints.shift();
        animRef.current.footprints.push({
          x: current.player.x,
          y: current.player.y,
          life: 4.5,
          chalk: false,
        });
      }
      if (getSceneTile(nx, ny) === 'bridge') {
        animRef.current.bridgeSagX = nx;
        animRef.current.bridgeSagTimer = 0.45;
        spawnMotes(nx, ny + 0.32, 3, false, true);
      } else {
        spawnMotes(current.player.x, current.player.y + 0.2, 2, false);
      }
      soundFx.step();

      setScene((prev) => {
        const nextTurn = prev.turn + 1;
        const tileKind = getSceneTile(nx, ny);
        const shouldHeroAdvance = nextTurn % 2 === 0 && tileKind !== 'inn';
        const nextHeroIdx = shouldHeroAdvance
          ? Math.min(HERO_PATROL.length - 1, prev.heroStepIdx + 1)
          : prev.heroStepIdx;
        const nextHero = HERO_PATROL[nextHeroIdx];
        const distToHero = Math.abs(nextHero.x - nx) + Math.abs(nextHero.y - ny);

        let speaker = 'Déplacement';
        let message =
          'Observez l’aplomb du vide depuis la corniche. Espace pour inspecter, 1–4 pour changer d’architecture.';

        if (tileKind === 'inn') {
          speaker = 'Refuge attenant';
          message =
            'Sous le linteau de l’auberge, les lampes projettent un cône chaud vers le couloir. Le Héros ne franchira pas ce seuil.';
        } else if (tileKind === 'bridge') {
          speaker = 'Passerelle suspendue';
          message =
            distToHero <= 4
              ? 'Les planches ploient au-dessus du puits tandis que la lueur aveuglante du Héros approche !'
              : 'La passerelle franchit l’abîme et occulte les câbles qui plongent sous vos pieds.';
        } else if (distToHero <= 4) {
          speaker = 'Alerte silencieuse';
          message =
            'Le Héros s’avance sur la corniche : son armure blanche déchire littéralement la pénombre.';
        }

        if (nextHeroIdx !== prev.heroStepIdx) {
          animRef.current.heroStepTimer = 0.45;
          const prevHero = HERO_PATROL[prev.heroStepIdx];
          if (animRef.current.footprints.length >= 14) animRef.current.footprints.shift();
          animRef.current.footprints.push({
            x: prevHero.x,
            y: prevHero.y,
            life: 5.5,
            chalk: true,
          });
          if (distToHero <= 5) {
            animRef.current.ratFlinch = Math.max(animRef.current.ratFlinch, 0.5);
          }
        }

        return {
          ...prev,
          turn: nextTurn,
          heroStepIdx: nextHeroIdx,
          player: { x: nx, y: ny, facing },
          oil: tileKind === 'inn' ? prev.oil : Math.max(1, Number((prev.oil - 0.15).toFixed(2))),
          speaker,
          message,
        };
      });
    },
    [interactAt, spawnMotes],
  );

  const handlePhaseCAction = useCallback(() => {
    const current = sceneRef.current;
    const { x, y, facing } = current.player;
    const candidates = [
      { x: x + facing, y },
      { x, y: y - 1 },
      { x, y: y + 1 },
      { x: x - facing, y },
    ];
    const priorityTarget = candidates.find(
      (c) =>
        (c.x === current.chest.x && c.y === current.chest.y) ||
        (c.x === current.rat.x && c.y === current.rat.y),
    );
    if (priorityTarget && interactAt(priorityTarget.x, priorityTarget.y)) return;

    const envTarget = candidates.find(
      (c) => getSceneTile(c.x, c.y) === 'inn_window' || getSceneTile(c.x, c.y) === 'pit',
    );
    if (envTarget && interactAt(envTarget.x, envTarget.y)) return;

    setScene((prev) => ({
      ...prev,
      speaker: 'Silence du Puits',
      message:
        'Approchez-vous du coffre (haut de la passerelle), du rat percepteur ou du bord du Grand Puits pour interagir.',
    }));
  }, [interactAt]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (lightboxId) {
        if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          setLightboxId(null);
        }
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        onBack();
        return;
      }

      if (e.key === 'Tab') {
        e.preventDefault();
        setActiveTab((prev) =>
          prev === 'phase_c' ? 'audit' : prev === 'audit' ? 'explore' : 'phase_c',
        );
        return;
      }

      if (activeTab !== 'phase_c') return;

      const key = e.key.toLowerCase();
      if (e.key === 'ArrowUp' || key === 'w') {
        e.preventDefault();
        handlePhaseCMove(0, -1);
      } else if (e.key === 'ArrowDown' || key === 's') {
        e.preventDefault();
        handlePhaseCMove(0, 1);
      } else if (e.key === 'ArrowLeft' || key === 'a') {
        e.preventDefault();
        handlePhaseCMove(-1, 0);
      } else if (e.key === 'ArrowRight' || key === 'd') {
        e.preventDefault();
        handlePhaseCMove(1, 0);
      } else if (e.key === ' ' || e.key === 'Enter' || key === 'e') {
        e.preventDefault();
        handlePhaseCAction();
      } else if (key === '1') {
        e.preventDefault();
        setExperiment('initial');
      } else if (key === '2') {
        e.preventDefault();
        setExperiment('exp_a');
      } else if (key === '3') {
        e.preventDefault();
        setExperiment('exp_b');
      } else if (key === '4') {
        e.preventDefault();
        setExperiment('exp_b2');
      } else if (key === '5') {
        e.preventDefault();
        setExperiment('exp_c');
      } else if (key === 'p') {
        e.preventDefault();
        setParallaxEnabled((prev) => !prev);
      } else if (key === 'k') {
        e.preventDefault();
        setCompareGridMode((prev) => !prev);
      } else if (key === 'f') {
        e.preventDefault();
        setFrozenFrame((prev) => !prev);
      } else if (key === 'v') {
        e.preventDefault();
        setVariation((prev) =>
          prev === 'contraste' ? 'gestuel' : prev === 'gestuel' ? 'atmospherique' : 'contraste',
        );
      } else if (key === 'h') {
        e.preventDefault();
        setScene((prev) => advanceHeroStep(prev));
      } else if (key === 'r') {
        e.preventDefault();
        resetPhaseC();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    activeTab,
    advanceHeroStep,
    handlePhaseCAction,
    handlePhaseCMove,
    lightboxId,
    onBack,
    resetPhaseC,
  ]);

  // Unified render loop supporting both single-view mode and synchronized 2x2 comparison grid
  useEffect(() => {
    if (activeTab !== 'phase_c') return;

    if (!bufInitialRef.current) {
      bufInitialRef.current = document.createElement('canvas');
    }
    if (!bufHybridRef.current) {
      bufHybridRef.current = document.createElement('canvas');
    }
    if (!atlasRef.current) {
      atlasRef.current = buildFusainPixelAtlas();
    }

    const atlas = atlasRef.current;
    const bufInitial = bufInitialRef.current;
    const bufHybrid = bufHybridRef.current;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let rafId = 0;

    const renderFrame = (ts: number) => {
      const a = animRef.current;
      const effectiveTs = frozenRef.current ? a.frozenTs || ts : ts;
      if (!frozenRef.current) {
        a.frozenTs = ts;
      }
      const dt =
        frozenRef.current || !a.lastTs ? 0.016 : Math.min(0.05, (ts - a.lastTs) / 1000);
      a.lastTs = ts;

      const s = sceneRef.current;

      if (!frozenRef.current) {
        const targetX = s.player.x;
        const targetY = s.player.y;
        const dx = targetX - a.renderX;
        const dy = targetY - a.renderY;
        const dist = Math.hypot(dx, dy);

        if (prefersReducedMotion) {
          a.renderX = targetX;
          a.renderY = targetY;
          a.lanternX = targetX + s.player.facing * 0.34;
          a.lanternY = targetY + 0.06;
        } else {
          a.renderX += dx * Math.min(1, dt * 15);
          a.renderY += dy * Math.min(1, dt * 15);
          if (dist > 0.02) {
            a.walkPhase += dt * 18;
          }
          a.stepPulse = Math.max(0, a.stepPulse - dt * 5);

          const handX = a.renderX + s.player.facing * 0.35;
          const handY = a.renderY + 0.06 + Math.sin(effectiveTs * 0.0032) * 0.02;
          const fx = (handX - a.lanternX) * 44;
          const fy = (handY - a.lanternY) * 44;
          a.lanternVx = (a.lanternVx + fx * dt) * Math.pow(0.04, dt);
          a.lanternVy = (a.lanternVy + fy * dt) * Math.pow(0.04, dt);
          a.lanternX += a.lanternVx * dt;
          a.lanternY += a.lanternVy * dt;
        }

        a.chestShake = Math.max(0, a.chestShake - dt * 2.4);
        const targetOpen = s.chest.state === 'open' ? 1 : 0;
        a.chestOpenProgress += (targetOpen - a.chestOpenProgress) * Math.min(1, dt * 8);
        a.ratFlinch = Math.max(0, a.ratFlinch - dt * 2.1);
        a.heroPulse = Math.max(0, a.heroPulse - dt * 3);
        a.heroStepTimer = Math.max(0, a.heroStepTimer - dt);
        a.bridgeSagTimer = Math.max(0, a.bridgeSagTimer - dt);

        const heroTarget = HERO_PATROL[s.heroStepIdx];
        if (prefersReducedMotion) {
          a.heroRenderX = heroTarget.x;
          a.heroRenderY = heroTarget.y;
        } else {
          a.heroRenderX += (heroTarget.x - a.heroRenderX) * Math.min(1, dt * 7);
          a.heroRenderY += (heroTarget.y - a.heroRenderY) * Math.min(1, dt * 7);
        }

        a.motes = a.motes.filter((m) => {
          m.life += dt;
          m.x += m.vx * dt;
          m.y += m.vy * dt;
          return m.life < m.maxLife;
        });
        a.footprints = a.footprints
          .map((f) => ({ ...f, life: f.life - dt }))
          .filter((f) => f.life > 0);
      }

      const snapshot: SceneRenderSnapshot = {
        player: s.player,
        renderX: a.renderX,
        renderY: a.renderY,
        walkPhase: a.walkPhase,
        stepPulse: a.stepPulse,
        lanternX: a.lanternX,
        lanternY: a.lanternY,
        chest: s.chest,
        chestShake: a.chestShake,
        rat: s.rat,
        ratFlinch: a.ratFlinch,
        heroStepIdx: s.heroStepIdx,
        heroRenderX: a.heroRenderX,
        heroRenderY: a.heroRenderY,
        heroStepTimer: a.heroStepTimer,
        bridgeSagX: a.bridgeSagX,
        bridgeSagTimer: a.bridgeSagTimer,
        footprints: a.footprints,
        motes: a.motes,
        ts: effectiveTs,
        prefersReducedMotion: prefersReducedMotion || frozenRef.current,
        parallaxEnabled: parallaxRef.current,
      };

      const mode = variationRef.current;

      if (compareGridRef.current) {
        (['initial', 'exp_a', 'exp_b', 'exp_b2', 'exp_c'] as PitExperimentId[]).forEach((expId) => {
          const targetCanvas = compareCanvasRefs.current[expId];
          if (!targetCanvas) return;
          renderPhaseCFrame(
            targetCanvas,
            expId === 'initial' ? bufInitial : bufHybrid,
            atlas,
            expId,
            mode,
            snapshot,
          );
        });
      } else if (canvasRef.current) {
        const activeExp = experimentRef.current;
        renderPhaseCFrame(
          canvasRef.current,
          activeExp === 'initial' ? bufInitial : bufHybrid,
          atlas,
          activeExp,
          mode,
          snapshot,
        );
      }

      rafId = requestAnimationFrame(renderFrame);
    };

    rafId = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(rafId);
  }, [activeTab]);

  const activeExperimentSpec = useMemo(
    () => EXPERIMENTS.find((e) => e.id === experiment) ?? EXPERIMENTS[3],
    [experiment],
  );
  const lightboxSpec = useMemo(
    () => VARIATIONS.find((v) => v.id === lightboxId) ?? null,
    [lightboxId],
  );

  const heroPos = HERO_PATROL[scene.heroStepIdx];
  const heroDistance = Math.abs(heroPos.x - scene.player.x) + Math.abs(heroPos.y - scene.player.y);
  const inInn = getSceneTile(scene.player.x, scene.player.y) === 'inn';
  const effectiveParallax = experiment === 'exp_a' ? false : parallaxEnabled;

  return (
    <div className="min-h-screen bg-[#0B0B0B] text-[#E9E5DC]">
      <header className="border-b border-[#242424] bg-[#0F0F0F]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-4">
            <button
              type="button"
              onClick={onBack}
              className="flex min-h-[40px] shrink-0 items-center gap-2 whitespace-nowrap border border-[#2C2C2C] bg-[#161616] px-3 py-1.5 text-xs font-medium text-[#E9E5DC] transition-colors hover:border-[#6A6760] hover:bg-[#1E1E1E]"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Retour</span>
            </button>
            <h1 className="font-display truncate text-base font-bold tracking-tight text-[#FAF8F5] sm:text-lg">
              Fusain Studio · Représentation du Grand Puits
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-1 border border-[#2A2A2A] bg-[#141414] p-1">
            <button
              type="button"
              onClick={() => setActiveTab('explore')}
              className={`min-h-[36px] shrink-0 whitespace-nowrap px-3 py-1.5 text-xs font-medium transition-colors ${
                activeTab === 'explore'
                  ? 'bg-[#FAF8F5] text-[#0A0A0A]'
                  : 'text-[#A39E95] hover:text-[#FAF8F5]'
              }`}
            >
              Phases A &amp; B · Exploration
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('phase_c')}
              className={`flex min-h-[36px] shrink-0 items-center gap-1.5 whitespace-nowrap px-3 py-1.5 text-xs font-medium transition-colors ${
                activeTab === 'phase_c'
                  ? 'bg-[#FAF8F5] text-[#0A0A0A]'
                  : 'text-[#A39E95] hover:text-[#FAF8F5]'
              }`}
            >
              <Play className="h-3 w-3" aria-hidden="true" />
              <span>Expérimentations Puits</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('audit')}
              className={`flex min-h-[36px] shrink-0 items-center gap-1.5 whitespace-nowrap px-3 py-1.5 text-xs font-medium transition-colors ${
                activeTab === 'audit'
                  ? 'bg-[#FAF8F5] text-[#0A0A0A]'
                  : 'text-[#A39E95] hover:text-[#FAF8F5]'
              }`}
            >
              <FileSearch className="h-3 w-3" aria-hidden="true" />
              <span>Audit &amp; Évaluation (7 critères)</span>
            </button>
          </div>
        </div>
      </header>

      {activeTab === 'explore' && (
        <main className="mx-auto max-w-6xl space-y-10 px-4 py-8 sm:px-6">
          <section className="flex flex-col justify-between gap-4 border-b border-[#242424] pb-6 md:flex-row md:items-end">
            <div className="space-y-2">
              <p className="font-mono-num text-xs text-[#9C978E]">
                Le noir est un espace · Le blanc est un événement · Le gris est une matière
              </p>
              <h2 className="font-display text-2xl font-bold text-[#FAF8F5] sm:text-3xl text-balance">
                Illustrations de référence : trois traitements au fusain
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('phase_c')}
              className="flex min-h-[44px] shrink-0 items-center justify-center gap-2 whitespace-nowrap bg-[#FAF8F5] px-5 py-2.5 text-sm font-semibold text-[#0B0B0B] transition-colors hover:bg-[#DFDBD2]"
            >
              <Play className="h-4 w-4" aria-hidden="true" />
              <span>Ouvrir les expérimentations Puits</span>
            </button>
          </section>

          <section aria-label="Phase A : trois variations" className="grid gap-6 lg:grid-cols-3">
            {VARIATIONS.map((item) => {
              const isSelected = variation === item.id;
              return (
                <article
                  key={item.id}
                  className={`flex flex-col justify-between border bg-[#121212] transition-colors ${
                    isSelected ? 'border-[#FAF8F5]' : 'border-[#262626]'
                  }`}
                >
                  <div>
                    <div className="relative aspect-video overflow-hidden bg-[#050505]">
                      <img
                        src={item.image}
                        alt={`${item.title} — scène de validation Fusain Abyssal`}
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setLightboxId(item.id)}
                        aria-label={`Agrandir ${item.title}`}
                        className="absolute right-2.5 bottom-2.5 flex min-h-[36px] items-center gap-1.5 border border-[#3A3A3A] bg-[#0B0B0B]/90 px-2.5 py-1 text-xs text-[#FAF8F5] hover:bg-[#1E1E1E]"
                      >
                        <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Agrandir</span>
                      </button>
                    </div>

                    <div className="space-y-3 p-5">
                      <div className="flex items-center justify-between gap-2 text-xs text-[#9C978E]">
                        <span className="font-mono-num">{item.code}</span>
                        <span>{item.verdict}</span>
                      </div>
                      <div>
                        <h3 className="font-display text-xl font-bold text-[#FAF8F5]">
                          {item.title}
                        </h3>
                        <p className="mt-0.5 text-xs text-[#A39E95]">{item.subtitle}</p>
                      </div>
                      <p className="text-sm leading-relaxed text-[#D0CCC4]">{item.intent}</p>
                    </div>
                  </div>

                  <div className="border-t border-[#222222] p-4">
                    <button
                      type="button"
                      onClick={() => {
                        setVariation(item.id);
                        setExperiment('initial');
                        setActiveTab('phase_c');
                      }}
                      className="flex min-h-[42px] w-full items-center justify-center gap-2 border border-[#3A3A3A] bg-[#181818] px-4 py-2 text-xs font-semibold text-[#FAF8F5] transition-colors hover:bg-[#FAF8F5] hover:text-[#0B0B0B]"
                    >
                      <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Comparer avec cette variante</span>
                    </button>
                  </div>
                </article>
              );
            })}
          </section>

          <section className="space-y-4 border-t border-[#242424] pt-8">
            <div>
              <p className="font-mono-num text-xs text-[#9C978E]">Phase B · Sélection</p>
              <h2 className="font-display text-2xl font-bold text-[#FAF8F5]">
                Comparatif de lisibilité, personnalité et coût de production
              </h2>
            </div>

            <div className="overflow-x-auto border border-[#262626] bg-[#111111]">
              <table className="w-full min-w-[680px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-[#262626] bg-[#161616] text-xs text-[#A39E95]">
                    <th className="px-4 py-3 font-medium">Variation</th>
                    <th className="px-4 py-3 font-medium">Lisibilité grille &amp; gameplay</th>
                    <th className="px-4 py-3 font-medium">Personnalité &amp; émotion</th>
                    <th className="px-4 py-3 font-medium">Production HTML / Canvas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#222222]">
                  {VARIATIONS.map((v) => (
                    <tr key={v.id} className="align-top">
                      <td className="px-4 py-4 font-semibold text-[#FAF8F5]">
                        <div>{v.title}</div>
                        <div className="mt-1 font-mono-num text-xs font-normal text-[#9C978E]">
                          {v.code}
                        </div>
                      </td>
                      <td className="px-4 py-4 leading-relaxed text-[#D0CCC4]">{v.readability}</td>
                      <td className="px-4 py-4 leading-relaxed text-[#D0CCC4]">{v.personality}</td>
                      <td className="px-4 py-4 leading-relaxed text-[#D0CCC4]">{v.production}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      )}

      {activeTab === 'phase_c' && (
        <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-12">
          <section className="space-y-3 lg:col-span-8">
            {/* Top Status & Experiment Selector Toolbar */}
            <div className="space-y-2 border border-[#242424] bg-[#121212] px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-4 font-mono-num text-xs">
                  <span className="text-[#FAF8F5]">
                    PV : <strong className="tabular-nums">6/6</strong>
                  </span>
                  <span className="text-[#D8A55C]">
                    Huile : <strong className="tabular-nums">{scene.oil.toFixed(1)}</strong>
                  </span>
                  <span className="text-[#D0CCC4]">
                    Pièces : <strong className="tabular-nums">{scene.coins}</strong>
                  </span>
                  <span
                    className={
                      inInn
                        ? 'text-[#D8A55C]'
                        : heroDistance <= 4
                        ? 'text-[#D1665E]'
                        : 'text-[#9C978E]'
                    }
                  >
                    {inInn
                      ? 'Auberge (sûr)'
                      : heroDistance <= 4
                      ? `Héros proche (${heroDistance} cases)`
                      : `Héros à ${heroDistance} cases`}
                  </span>
                </div>

                {/* Modes: Parallax ON/OFF, 2x2 Compare, Freeze Static Frame */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setParallaxEnabled((prev) => !prev)}
                    disabled={!compareGridMode && experiment === 'exp_a'}
                    title={
                      !compareGridMode && experiment === 'exp_a'
                        ? 'L’Expérience A impose zéro parallaxe'
                        : 'Basculer la parallaxe (P)'
                    }
                    className={`flex min-h-[32px] items-center gap-1.5 border px-2.5 py-1 text-xs transition-colors ${
                      !compareGridMode && experiment === 'exp_a'
                        ? 'cursor-not-allowed border-[#242424] bg-[#121212] text-[#5C5852]'
                        : parallaxEnabled
                        ? 'border-[#D8A55C] bg-[#221D15] text-[#FAF8F5]'
                        : 'border-[#2E2E2E] bg-[#181818] text-[#B8B2A8] hover:text-[#FAF8F5]'
                    }`}
                  >
                    <Layers className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>
                      Parallaxe :{' '}
                      {!compareGridMode && experiment === 'exp_a'
                        ? 'Verrouillée OFF'
                        : parallaxEnabled
                        ? 'ON'
                        : 'OFF'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFrozenFrame((prev) => !prev)}
                    className={`flex min-h-[32px] items-center gap-1.5 border px-2.5 py-1 text-xs transition-colors ${
                      frozenFrame
                        ? 'border-[#FAF8F5] bg-[#FAF8F5] font-semibold text-[#0B0B0B]'
                        : 'border-[#2E2E2E] bg-[#181818] text-[#B8B2A8] hover:text-[#FAF8F5]'
                    }`}
                  >
                    <Pause className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{frozenFrame ? 'Image figée (F)' : 'Figer (F)'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCompareGridMode((prev) => !prev)}
                    className={`flex min-h-[32px] items-center gap-1.5 border px-2.5 py-1 text-xs transition-colors ${
                      compareGridMode
                        ? 'border-[#FAF8F5] bg-[#FAF8F5] font-semibold text-[#0B0B0B]'
                        : 'border-[#2E2E2E] bg-[#181818] text-[#B8B2A8] hover:text-[#FAF8F5]'
                    }`}
                  >
                    <Columns2 className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Comparatif grille (K)</span>
                  </button>
                </div>
              </div>

              {/* 5-Way Pit Representation Selector */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#202020] pt-2.5">
                <div
                  className="flex flex-wrap items-center gap-1"
                  role="group"
                  aria-label="Expérimentation du Grand Puits"
                >
                  {EXPERIMENTS.map((exp) => {
                    const active = !compareGridMode && experiment === exp.id;
                    return (
                      <button
                        key={exp.id}
                        type="button"
                        onClick={() => {
                          setCompareGridMode(false);
                          setExperiment(exp.id);
                        }}
                        className={`min-h-[32px] shrink-0 whitespace-nowrap px-2.5 py-1 text-xs transition-colors ${
                          active
                            ? 'bg-[#FAF8F5] font-semibold text-[#0B0B0B]'
                            : 'border border-[#2E2E2E] bg-[#181818] text-[#B8B2A8] hover:text-[#FAF8F5]'
                        }`}
                      >
                        <span className="font-mono-num mr-1.5 opacity-60">{exp.keyHint}.</span>
                        {exp.shortLabel}
                      </button>
                    );
                  })}
                </div>

                {(compareGridMode || experiment === 'initial') && (
                  <div className="flex items-center gap-1" role="group" aria-label="Variante Bayer initiale">
                    {VARIATIONS.map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setVariation(v.id)}
                        className={`min-h-[30px] shrink-0 whitespace-nowrap px-2 py-0.5 text-[11px] transition-colors ${
                          variation === v.id
                            ? 'border border-[#FAF8F5] bg-[#242424] text-[#FAF8F5]'
                            : 'border border-[#282828] bg-[#141414] text-[#8E8980] hover:text-[#FAF8F5]'
                        }`}
                      >
                        {v.id === 'contraste'
                          ? 'Contraste'
                          : v.id === 'gestuel'
                          ? 'Gestuel'
                          : 'Atmosphère'}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Viewport: single active experiment OR synchronized 6-panel comparison (Initial, A, B, B2, C + Phase A Gestuel) */}
            {compareGridMode ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {EXPERIMENTS.map((exp) => (
                  <div
                    key={exp.id}
                    className={`border bg-[#080808] ${
                      exp.id === 'exp_b2' ? 'border-[#FAF8F5]' : 'border-[#2B2B2B]'
                    }`}
                  >
                    <div className="flex items-center justify-between border-b border-[#202020] bg-[#121212] px-3 py-1.5 text-xs">
                      <span className="font-semibold text-[#FAF8F5]">
                        <span className="font-mono-num mr-1.5 text-[#9C978E]">{exp.keyHint}.</span>
                        {exp.shortLabel}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setExperiment(exp.id);
                          setCompareGridMode(false);
                        }}
                        className="text-[11px] text-[#B8B2A8] underline-offset-2 hover:text-[#FAF8F5] hover:underline"
                      >
                        Plein cadre
                      </button>
                    </div>
                    <canvas
                      ref={(el) => {
                        compareCanvasRefs.current[exp.id] = el;
                      }}
                      aria-label={exp.title}
                      className="block aspect-[14/9] w-full bg-[#040404]"
                    />
                    <p className="border-t border-[#1D1D1D] px-3 py-2 text-[11px] leading-snug text-[#A8A298]">
                      {exp.hypothesis}
                    </p>
                  </div>
                ))}

                {/* 6th comparison card: Phase A Gestuel reference illustration for direct texture benchmark */}
                <div className="border border-[#2B2B2B] bg-[#080808]">
                  <div className="flex items-center justify-between border-b border-[#202020] bg-[#121212] px-3 py-1.5 text-xs">
                    <span className="font-semibold text-[#FAF8F5]">
                      Réf. Phase A · Dessin gestuel
                    </span>
                    <button
                      type="button"
                      onClick={() => setLightboxId('gestuel')}
                      className="text-[11px] text-[#B8B2A8] underline-offset-2 hover:text-[#FAF8F5] hover:underline"
                    >
                      Agrandir
                    </button>
                  </div>
                  <img
                    src={imgGestuel}
                    alt="Référence Phase A — Dessin gestuel expressif"
                    referrerPolicy="no-referrer"
                    className="block aspect-[14/9] w-full bg-[#040404] object-cover"
                  />
                  <p className="border-t border-[#1D1D1D] px-3 py-2 text-[11px] leading-snug text-[#A8A298]">
                    Étalon de matière : hachures vives, traits brisés, noirs charbonneux et blanc
                    réservé aux points focaux.
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-hidden border border-[#262626] bg-[#050505]">
                <canvas
                  ref={canvasRef}
                  aria-label={`${activeExperimentSpec.title} — scène jouable`}
                  className="block aspect-[14/9] w-full"
                />
              </div>
            )}

            {/* Active Observation & Architectural Hypothesis Bar */}
            <div className="border border-[#262626] bg-[#121212] px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#9C978E]">
                <span className="font-mono-num uppercase tracking-wide text-[#FAF8F5]">
                  {scene.speaker}
                </span>
                <span className="font-mono-num">
                  Tour {scene.turn} ·{' '}
                  {compareGridMode
                    ? `Comparatif 5 pistes + Réf. Gestuel · Parallaxe ${
                        parallaxEnabled ? 'ON (sauf Exp. A)' : 'OFF'
                      }`
                    : `${activeExperimentSpec.shortLabel} · Parallaxe ${
                        effectiveParallax ? 'ON' : 'OFF'
                      }`}
                </span>
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-[#E4E0D8]">{scene.message}</p>
            </div>
          </section>

          {/* Controls & Experiment Technical Notes Rail */}
          <aside className="space-y-5 lg:col-span-4">
            <div className="space-y-4 border border-[#262626] bg-[#121212] p-5">
              <div className="flex items-center justify-between border-b border-[#242424] pb-3">
                <h2 className="font-display text-lg font-bold text-[#FAF8F5]">
                  Banc d’essai du Puits
                </h2>
                <SlidersHorizontal className="h-4 w-4 text-[#9C978E]" aria-hidden="true" />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div />
                <button
                  type="button"
                  onClick={() => handlePhaseCMove(0, -1)}
                  className="min-h-[44px] border border-[#323232] bg-[#181818] text-sm font-medium text-[#FAF8F5] hover:bg-[#242424]"
                >
                  ↑
                </button>
                <div />
                <button
                  type="button"
                  onClick={() => handlePhaseCMove(-1, 0)}
                  className="min-h-[44px] border border-[#323232] bg-[#181818] text-sm font-medium text-[#FAF8F5] hover:bg-[#242424]"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={handlePhaseCAction}
                  className="min-h-[44px] bg-[#FAF8F5] text-xs font-semibold text-[#0B0B0B] hover:bg-[#DDD9D0]"
                >
                  Action
                </button>
                <button
                  type="button"
                  onClick={() => handlePhaseCMove(1, 0)}
                  className="min-h-[44px] border border-[#323232] bg-[#181818] text-sm font-medium text-[#FAF8F5] hover:bg-[#242424]"
                >
                  →
                </button>
                <div />
                <button
                  type="button"
                  onClick={() => handlePhaseCMove(0, 1)}
                  className="min-h-[44px] border border-[#323232] bg-[#181818] text-sm font-medium text-[#FAF8F5] hover:bg-[#242424]"
                >
                  ↓
                </button>
                <div />
              </div>

              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={() => setScene((prev) => advanceHeroStep(prev))}
                  className="flex min-h-[42px] w-full items-center justify-center gap-2 border border-[#343434] bg-[#181818] px-3 py-2 text-xs font-medium text-[#FAF8F5] hover:bg-[#222222]"
                >
                  <ShieldAlert className="h-3.5 w-3.5 text-[#D1665E]" aria-hidden="true" />
                  <span>Faire avancer le Héros (H)</span>
                </button>

                <button
                  type="button"
                  onClick={resetPhaseC}
                  className="flex min-h-[42px] w-full items-center justify-center gap-2 border border-[#2C2C2C] bg-[#141414] px-3 py-2 text-xs font-medium text-[#B8B2A8] hover:text-[#FAF8F5]"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Réinitialiser la scène (R)</span>
                </button>
              </div>
            </div>

            {/* Technical note for the currently selected Pit experiment */}
            <div className="space-y-3 border border-[#262626] bg-[#121212] p-5 text-xs leading-relaxed text-[#B8B2A8]">
              <div className="flex items-center gap-2 font-semibold text-[#FAF8F5]">
                <Compass className="h-4 w-4" aria-hidden="true" />
                <span>{activeExperimentSpec.title}</span>
              </div>
              <dl className="space-y-2.5">
                <div>
                  <dt className="font-medium text-[#FAF8F5]">Intention spatiale</dt>
                  <dd className="mt-0.5">{activeExperimentSpec.hypothesis}</dd>
                </div>
                <div>
                  <dt className="font-medium text-[#FAF8F5]">Procédé de rendu</dt>
                  <dd className="mt-0.5">{activeExperimentSpec.mechanism}</dd>
                </div>
                <div>
                  <dt className="font-medium text-[#FAF8F5]">Règle de parallaxe</dt>
                  <dd className="mt-0.5">{activeExperimentSpec.parallaxRule}</dd>
                </div>
                <div>
                  <dt className="font-medium text-[#D8A55C]">Limite observée</dt>
                  <dd className="mt-0.5 text-[#D0CCC4]">{activeExperimentSpec.limitNote}</dd>
                </div>
              </dl>
              <p className="border-t border-[#222222] pt-3 font-mono-num text-[11px] text-[#8E8980]">
                Clavier : Flèches/WASD · Espace (Action) · 1–5 (Pistes) · P (Parallaxe) · K
                (Comparatif) · F (Figer) · H (Héros) · Tab (Onglets)
              </p>
            </div>
          </aside>
        </main>
      )}

      {activeTab === 'audit' && (
        <main className="mx-auto max-w-6xl space-y-10 px-4 py-8 sm:px-6">
          {/* Step 1: Audit of Current Codebase */}
          <section className="space-y-4">
            <div className="border-b border-[#242424] pb-4">
              <p className="font-mono-num text-xs text-[#9C978E]">
                Étape 1 · Audit graphique &amp; architectural (moteur principal inchangé)
              </p>
              <h2 className="font-display mt-1 text-2xl font-bold text-[#FAF8F5]">
                Pourquoi le Grand Puits reste plat dans le rendu jouable actuel
              </h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <article className="space-y-2 border border-[#262626] bg-[#121212] p-5 text-sm">
                <h3 className="font-semibold text-[#FAF8F5]">
                  1. Contradiction plan / perspective
                </h3>
                <p className="leading-relaxed text-[#C9C4BC]">
                  Dans <code className="font-mono-num text-xs">FusainStudioView</code> (336×216), le
                  plateau est rigoureusement zénithal tandis que le puits empile 4 rectangles de
                  parallaxe parallèles au sol. Sans épaisseur de rebord ni paroi plongeante,
                  l’abîme ressemble à un motif animé derrière une fenêtre plane.
                </p>
              </article>

              <article className="space-y-2 border border-[#262626] bg-[#121212] p-5 text-sm">
                <h3 className="font-semibold text-[#FAF8F5]">
                  2. Fragmentation case par case
                </h3>
                <p className="leading-relaxed text-[#C9C4BC]">
                  Dans <code className="font-mono-num text-xs">DungeonCanvas.tsx</code>,{' '}
                  <code className="font-mono-num text-xs">drawPitTile()</code> dessine chaque case
                  de vide indépendamment avec son propre cadre intérieur et ses diagonales locales.
                  Le gouffre se brise visuellement en un damier répétitif au lieu d’un volume
                  monumental continu.
                </p>
              </article>

              <article className="space-y-2 border border-[#262626] bg-[#121212] p-5 text-sm">
                <h3 className="font-semibold text-[#FAF8F5]">
                  3. Absence d’occlusion &amp; d’ancrage
                </h3>
                <p className="leading-relaxed text-[#C9C4BC]">
                  Les chaînes et la roue flottent sans point d’attache sur la margelle, et
                  l’éperon du coffre comme la passerelle manquent d’ombres portées et de pilotis
                  ancrés sur la falaise. Dans <code className="font-mono-num text-xs">worldGen.ts</code>,
                  <code className="font-mono-num text-xs">PitLandmark</code> est purement textuel
                  et ne porte aucune coordonnée persistante d’un étage à l’autre.
                </p>
              </article>
            </div>
          </section>

          {/* Step 3: 7-Criterion Comparative Matrix */}
          <section className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="font-mono-num text-xs text-[#9C978E]">
                  Étape 3 · Grille d’évaluation critique
                </p>
                <h2 className="font-display text-2xl font-bold text-[#FAF8F5]">
                  Comparatif sur les 7 critères (image fixe &amp; en mouvement)
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCompareGridMode(true);
                  setFrozenFrame(true);
                  setActiveTab('phase_c');
                }}
                className="flex min-h-[40px] items-center gap-2 bg-[#FAF8F5] px-4 py-2 text-xs font-semibold text-[#0B0B0B] hover:bg-[#DFDBD2]"
              >
                <Columns2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Inspecter les captures fixes (grille)</span>
              </button>
            </div>

            <div className="overflow-x-auto border border-[#262626] bg-[#111111]">
              <table className="w-full min-w-[980px] border-collapse text-left text-xs leading-relaxed">
                <thead>
                  <tr className="border-b border-[#262626] bg-[#161616] text-[#A39E95]">
                    <th className="px-4 py-3 font-medium">Critère</th>
                    <th className="px-4 py-3 font-medium">Initial (Bayer)</th>
                    <th className="px-4 py-3 font-medium">Exp. A · Paroi &amp; occlusion</th>
                    <th className="px-4 py-3 font-medium">Exp. B · 3D unifiée</th>
                    <th className="px-4 py-3 font-medium text-[#FAF8F5]">Exp. B2 · Gestuel dense</th>
                    <th className="px-4 py-3 font-medium">Exp. C · Hybride 65°</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#222222] text-[#D0CCC4]">
                  {EVALUATION_MATRIX.map((row) => (
                    <tr key={row.criterion} className="align-top">
                      <td className="px-4 py-3.5 font-semibold text-[#FAF8F5]">{row.criterion}</td>
                      <td className="px-4 py-3.5">{row.initial}</td>
                      <td className="px-4 py-3.5">{row.expA}</td>
                      <td className="px-4 py-3.5">{row.expB}</td>
                      <td className="px-4 py-3.5 bg-[#171614] text-[#FAF8F5]">{row.expB2}</td>
                      <td className="px-4 py-3.5">{row.expC}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Steps 4 & 5: Recommendation & Migration Roadmap */}
          <section className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-3 border border-[#262626] bg-[#121212] p-6">
              <p className="font-mono-num text-xs text-[#D8A55C]">
                Étape 4 · Recommandation artistique &amp; technique
              </p>
              <h3 className="font-display text-xl font-bold text-[#FAF8F5]">
                Synthèse retenue : Exp. B2 (charpente Exp. B + Gestuel dense)
              </h3>
              <p className="text-sm leading-relaxed text-[#D0CCC4]">
                L’<strong>Exp. B2 – Gestuel dense</strong> résout le manque de matière de l’Exp. B
                tout en gardant sa charpente verticale unifiée : lèvre rocheuse physique et garde-corps
                au bord du vide, 4 strates de parallaxe hiérarchisées, roches en surplomb et tunnel
                est occultés, hachures charbonneuses et 4 micro-événements lointains rares.
              </p>
              <p className="text-sm leading-relaxed text-[#B8B2A8]">
                On peut y greffer ponctuellement les repères d’échelle d’Exp. C (auberge miniature
                lointaine au -2/-3 sur certains étages) lors de l’intégration finale dans{' '}
                <code className="font-mono-num text-xs">DungeonCanvas</code>.
              </p>
            </div>

            <div className="space-y-3 border border-[#262626] bg-[#121212] p-6">
              <p className="font-mono-num text-xs text-[#9C978E]">
                Étape 5 · Plan d’intégration ultérieure (après validation)
              </p>
              <h3 className="font-display text-xl font-bold text-[#FAF8F5]">
                Étapes ordonnées vers le moteur principal
              </h3>
              <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-[#D0CCC4]">
                <li>
                  Enrichir <code className="font-mono-num text-xs">PitLandmark</code> dans{' '}
                  <code className="font-mono-num text-xs">worldGen.ts</code> avec des coordonnées
                  normalisées persistantes (<code className="font-mono-num text-xs">xNorm, yNorm, span</code>)
                  pour projeter les infrastructures sur 3 à 4 étages d’écart.
                </li>
                <li>
                  Remplacer l’appel case par case à{' '}
                  <code className="font-mono-num text-xs">drawPitTile()</code> dans{' '}
                  <code className="font-mono-num text-xs">DungeonCanvas.tsx</code> par une passe
                  unifiée calculant le rectangle englobant du puits avant le tracé des passerelles.
                </li>
                <li>
                  Dessiner systématiquement le rebord rocheux biseauté, l’ombre portée sous les
                  balcons/passerelles et les câbles ancrés dans une passe d’occlusion Z-triée.
                </li>
                <li>
                  Calibrer la parallaxe en option subtile (≤ 2 px) jamais nécessaire à la lecture
                  statique de la profondeur.
                </li>
              </ol>
            </div>
          </section>
        </main>
      )}

      {/* Lightbox for Full-Res Phase A Inspection */}
      {lightboxSpec && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={lightboxSpec.title}
          onClick={() => setLightboxId(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 sm:p-8"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-5xl border border-[#343434] bg-[#0E0E0E]"
          >
            <div className="flex items-center justify-between border-b border-[#242424] px-4 py-3">
              <div>
                <p className="font-mono-num text-xs text-[#9C978E]">{lightboxSpec.code}</p>
                <h3 className="font-display text-lg font-bold text-[#FAF8F5]">
                  {lightboxSpec.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setLightboxId(null)}
                aria-label="Fermer l’aperçu"
                className="flex min-h-[40px] min-w-[40px] items-center justify-center border border-[#323232] bg-[#181818] text-[#FAF8F5] hover:bg-[#242424]"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <img
              src={lightboxSpec.image}
              alt={lightboxSpec.title}
              referrerPolicy="no-referrer"
              className="max-h-[75vh] w-full bg-[#050505] object-contain"
            />
            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#242424] px-4 py-3 text-xs text-[#C6C1B8]">
              <span>{lightboxSpec.subtitle}</span>
              <button
                type="button"
                onClick={() => {
                  setVariation(lightboxSpec.id);
                  setExperiment('initial');
                  setLightboxId(null);
                  setActiveTab('phase_c');
                }}
                className="flex min-h-[38px] items-center gap-2 bg-[#FAF8F5] px-4 py-1.5 font-semibold text-[#0B0B0B] hover:bg-[#E0DCD3]"
              >
                <Flame className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Comparer dans le banc d’essai</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
