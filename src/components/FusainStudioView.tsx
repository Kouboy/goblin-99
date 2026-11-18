import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Compass,
  Eye,
  Flame,
  Maximize2,
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

export type FusainVariationId = 'contraste' | 'gestuel' | 'atmospherique';

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

// --- Phase C Playable Validation Grid (14x9) ---
// Legend: '#' = wall, '.' = floor, 'P' = Grand Puits void, 'B' = narrow pit bridge, 'I' = inn warm floor, 'W' = inn window wall
const SCENE_ROWS = [
  '##############',
  '#...##PPPPPP.#',
  '#...#.PPPPPP.#',
  '#IIW..P.PPPP.#',
  '#II...BBBBBB.#',
  '#IIW..PPPPPP.#',
  '#...#.PPPPPP.#',
  '#...##PPPPPP.#',
  '##############',
];

const GRID_W = 14;
const GRID_H = 9;

type SceneTileKind = 'wall' | 'floor' | 'pit' | 'bridge' | 'inn' | 'inn_window';

function getSceneTile(x: number, y: number): SceneTileKind {
  if (x < 0 || y < 0 || x >= GRID_W || y >= GRID_H) return 'wall';
  const ch = SCENE_ROWS[y][x];
  if (ch === '#') return 'wall';
  if (ch === 'P') return 'pit';
  if (ch === 'B') return 'bridge';
  if (ch === 'I') return 'inn';
  if (ch === 'W') return 'inn_window';
  return 'floor';
}

function isWalkable(x: number, y: number): boolean {
  const k = getSceneTile(x, y);
  return k === 'floor' || k === 'bridge' || k === 'inn';
}

function hash2D(x: number, y: number, salt = 0): number {
  let n = Math.imul(x + 19, 374761393) + Math.imul(y + 53, 668265263) + Math.imul(salt + 7, 1442695041);
  n = (n ^ (n >>> 13)) >>> 0;
  n = Math.imul(n, 1274126177) >>> 0;
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

const HERO_PATROL: Array<{ x: number; y: number }> = [
  { x: 12, y: 1 },
  { x: 12, y: 2 },
  { x: 12, y: 3 },
  { x: 12, y: 4 },
  { x: 11, y: 4 },
  { x: 10, y: 4 },
  { x: 9, y: 4 },
  { x: 8, y: 4 },
];

interface DustMote {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  chalk: boolean;
}

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
      'Vous quittez le seuil de l’auberge vers la passerelle du Grand Puits. Un Héros patrouille sur la corniche opposée.',
  };
}

const TILE_PX = 24;
const BUF_W = GRID_W * TILE_PX; // 336
const BUF_H = GRID_H * TILE_PX; // 216

// 4x4 Bayer ordered dithering threshold matrix (0..15) for non-retro charcoal shading
const BAYER4 = [
  0, 8, 2, 10,
  12, 4, 14, 6,
  3, 11, 1, 9,
  15, 7, 13, 5,
];

export const FusainStudioView: React.FC<FusainStudioViewProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'explore' | 'phase_c'>('explore');
  const [variation, setVariation] = useState<FusainVariationId>('gestuel');
  const [lightboxId, setLightboxId] = useState<FusainVariationId | null>(null);
  const [scene, setScene] = useState<PhaseCState>(() => createInitialPhaseC());

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pixelBufRef = useRef<HTMLCanvasElement | null>(null);
  const atlasRef = useRef<FusainPixelAtlas | null>(null);
  const sceneRef = useRef<PhaseCState>(scene);
  sceneRef.current = scene;
  const variationRef = useRef<FusainVariationId>(variation);
  variationRef.current = variation;

  // Real-time physical animation state (not triggering React re-renders)
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
    footprints: [] as Array<{ x: number; y: number; life: number; chalk: boolean }>,
    motes: [] as DustMote[],
    lastTs: 0,
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
    };
  }, []);

  const advanceHeroStep = useCallback((prev: PhaseCState): PhaseCState => {
    const nextIdx = Math.min(HERO_PATROL.length - 1, prev.heroStepIdx + 1);
    return { ...prev, heroStepIdx: nextIdx };
  }, []);

  const interactAt = useCallback(
    (tx: number, ty: number) => {
      const current = sceneRef.current;
      // 1. Chest interaction (resists first, opens second)
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
              'La serrure grippe dans un claquement sec ! Le coffre résiste et tremble sur le bord du vide. Réessayez pour forcer le pêne.',
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

      // 2. Rat Percepteur reaction
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

      // 3. Inn glowing window
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

      // 4. Grand Puits rim gaze
      if (getSceneTile(tx, ty) === 'pit') {
        soundFx.pitGaze();
        setScene((prev) => ({
          ...prev,
          speaker: 'Le Grand Puits',
          message:
            'Aucune brume magique : seulement du noir pur, des passerelles filiformes et trois lumières minuscules suspendues très loin dessous.',
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

      // Check interactive bump targets first
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
      // Leave faint boot print behind on stone/inn floor
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
          'Vous progressez le long de la corniche. Appuyez sur Espace face à un élément pour agir.';

        if (tileKind === 'inn') {
          speaker = 'Refuge attenant';
          message =
            'Sous le linteau de l’auberge, les lampes répandent une lueur tiède vers le couloir. Le Héros ne franchira pas ce seuil.';
        } else if (tileKind === 'bridge') {
          speaker = 'Passerelle suspendue';
          message =
            distToHero <= 4
              ? 'Les planches ploient au-dessus du vide tandis que la lueur aveuglante du Héros approche !'
              : 'Sous vos pieds, la planche fléchit d’un souffle et laisse choir quelques grains de poussière dans le Puits.';
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
    // Priority: Chest or Rat adjacent, then Window, then Pit rim
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

  // Keyboard handling for Studio & Phase C
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
        setActiveTab((prev) => (prev === 'explore' ? 'phase_c' : 'explore'));
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

  // Native 336x216 (24x24 tiles) Pixel-Art Charcoal & Chalk Renderer for Phase C
  useEffect(() => {
    if (activeTab !== 'phase_c') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (!pixelBufRef.current) {
      const buf = document.createElement('canvas');
      buf.width = BUF_W;
      buf.height = BUF_H;
      pixelBufRef.current = buf;
    }
    if (!atlasRef.current) {
      atlasRef.current = buildFusainPixelAtlas();
    }

    const vCanvas = pixelBufRef.current;
    const vctx = vCanvas.getContext('2d', { willReadFrequently: true });
    if (!vctx) return;
    const atlas = atlasRef.current;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let rafId = 0;

    // Integer pixel circle helper for distant giant Pit winch wheel
    const drawPixelCircle = (cx: number, cy: number, r: number, color: string) => {
      vctx.fillStyle = color;
      let x = r;
      let y = 0;
      let err = 1 - x;
      while (x >= y) {
        vctx.fillRect(cx + x, cy + y, 1, 1);
        vctx.fillRect(cx + y, cy + x, 1, 1);
        vctx.fillRect(cx - y, cy + x, 1, 1);
        vctx.fillRect(cx - x, cy + y, 1, 1);
        vctx.fillRect(cx - x, cy - y, 1, 1);
        vctx.fillRect(cx - y, cy - x, 1, 1);
        vctx.fillRect(cx + y, cy - x, 1, 1);
        vctx.fillRect(cx + x, cy - y, 1, 1);
        y += 1;
        if (err < 0) {
          err += 2 * y + 1;
        } else {
          x -= 1;
          err += 2 * (y - x) + 1;
        }
      }
    };

    const renderFrame = (ts: number) => {
      const a = animRef.current;
      const dt = a.lastTs ? Math.min(0.05, (ts - a.lastTs) / 1000) : 0.016;
      a.lastTs = ts;

      const s = sceneRef.current;
      const mode = variationRef.current;

      // Update physical interpolation
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

        // Spring-lag lantern physics behind goblin hand
        const handX = a.renderX + s.player.facing * 0.35;
        const handY = a.renderY + 0.06 + Math.sin(ts * 0.0032) * 0.02;
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

      // Sparse 1x1 pixel dust motes & footprints decay
      a.motes = a.motes.filter((m) => {
        m.life += dt;
        m.x += m.vx * dt;
        m.y += m.vy * dt;
        return m.life < m.maxLife;
      });
      a.footprints = a.footprints
        .map((f) => ({ ...f, life: f.life - dt }))
        .filter((f) => f.life > 0);

      // === PASS 1: DRAW ON NATIVE 336x216 INTEGER PIXEL BUFFER ===
      vctx.imageSmoothingEnabled = false;
      vctx.fillStyle = '#040404';
      vctx.fillRect(0, 0, BUF_W, BUF_H);

      // Camera offset for multi-layer depth parallax
      const camDx = a.renderX - 6;
      const camDy = a.renderY - 4;

      // 1A. GRAND PUITS — 4-Strata Vertical Parallax Shaft (x=6..11, y=1..7)
      const pitX = 6 * TILE_PX;
      const pitY = 1 * TILE_PX;
      const pitW = 6 * TILE_PX;
      const pitH = 7 * TILE_PX;

      vctx.save();
      vctx.beginPath();
      vctx.rect(pitX, pitY, pitW, pitH);
      vctx.clip();

      vctx.fillStyle = '#030303';
      vctx.fillRect(pitX, pitY, pitW, pitH);

      // Stratum -4 (deepest void: massive faint buttress ribs + drifting abyssal specks, 0.18x parallax)
      const p4x = Math.round(camDx * 1.1);
      const p4y = Math.round(camDy * 1.1);
      vctx.fillStyle = '#0C0C0B';
      vctx.fillRect(pitX + 18 - p4x, pitY, 8, pitH);
      vctx.fillRect(pitX + pitW - 26 - p4x, pitY, 10, pitH);
      // Distant horizontal stone arch girder
      vctx.fillStyle = '#100F0E';
      vctx.fillRect(pitX, pitY + Math.round(pitH * 0.8) - p4y, pitW, 5);

      // Stratum -3 (deep giant counterweight wheel & heavy beam, 0.38x parallax)
      const p3x = Math.round(camDx * 2.2);
      const p3y = Math.round(camDy * 2.2);
      const wheelX = Math.round(pitX + pitW * 0.58 - p3x);
      const wheelY = Math.round(pitY + pitH * 0.65 - p3y);
      drawPixelCircle(wheelX, wheelY, 24, '#1B1A18');
      drawPixelCircle(wheelX, wheelY, 13, '#151412');
      // Wheel spokes
      vctx.fillStyle = '#181715';
      vctx.fillRect(wheelX - 23, wheelY, 46, 1);
      vctx.fillRect(wheelX, wheelY - 23, 1, 46);
      vctx.fillStyle = '#171614';
      vctx.fillRect(pitX + 6 - p3x, wheelY + 14, pitW - 12, 2);

      // Stratum -2 (swaying vertical chains, suspended catwalk & wooden hoist arm, 0.62x parallax)
      const p2x = Math.round(camDx * 3.6);
      const p2y = Math.round(camDy * 3.6);
      const chainCols = [0.21, 0.46, 0.79];
      chainCols.forEach((ratio, idx) => {
        const sway = prefersReducedMotion ? 0 : Math.round(Math.sin(ts * 0.0014 + idx * 1.8));
        const cx = Math.round(pitX + pitW * ratio - p2x) + sway;
        vctx.fillStyle = idx === 1 ? '#36332E' : '#262421';
        for (let py = pitY; py < pitY + pitH; py += 4) {
          vctx.fillRect(cx, py, idx === 1 ? 2 : 1, 2);
        }
      });

      const farWalkY = Math.round(pitY + pitH * 0.23 - p2y);
      vctx.fillStyle = '#171614';
      vctx.fillRect(pitX, farWalkY, pitW, 5);
      vctx.fillStyle = '#403D37';
      vctx.fillRect(pitX, farWalkY, pitW, 1);
      // Tiny handrail posts on distant catwalk
      for (let rx = pitX + 6; rx < pitX + pitW; rx += 16) {
        vctx.fillRect(rx - p2x, farWalkY - 3, 1, 3);
      }

      // Stratum -1 (just below ledges: vertical rock cliff faces & under-bridge timber brackets, 0.88x parallax)
      const p1y = Math.round(camDy * 4.8);
      // Top ledge cliff face descending into pit (under row 0 walls & chest spur)
      vctx.fillStyle = '#121110';
      vctx.fillRect(pitX, pitY, pitW, 9);
      vctx.fillStyle = '#22201D';
      for (let sx = pitX + 2; sx < pitX + pitW - 2; sx += 7) {
        vctx.fillRect(sx, pitY + 2, 1, 6);
      }
      // Left chasm rock wall drop-off beside bridge
      vctx.fillStyle = '#151412';
      vctx.fillRect(pitX, pitY, 6, pitH);
      vctx.fillStyle = '#282622';
      vctx.fillRect(pitX + 5, pitY + 4, 1, pitH - 8);
      // Timber support struts under the chest spur (x=7, y=4 top)
      vctx.fillStyle = '#2B251E';
      vctx.fillRect(7 * TILE_PX + 4, 4 * TILE_PX - 1 - Math.round(p1y * 0.2), 2, 7);
      vctx.fillRect(7 * TILE_PX + 18, 4 * TILE_PX - 1 - Math.round(p1y * 0.2), 2, 7);

      // Slow updraft ash wisps rising from the Pit + 1x1 distant pinpoint lights
      for (let w = 0; w < 8; w++) {
        const wSpeed = 0.008 + (w % 3) * 0.005;
        const wyFrac = prefersReducedMotion ? (w * 0.13) % 1 : (1 - ((ts * wSpeed * 0.01 + w * 0.19) % 1));
        const wx = Math.round(pitX + ((w * 37 + 15) % (pitW - 12)) - p3x);
        const wy = Math.round(pitY + wyFrac * pitH);
        vctx.fillStyle = w % 2 === 0 ? '#4B4842' : '#2E2C28';
        vctx.fillRect(wx, wy, 1, w % 3 === 0 ? 2 : 1);
      }

      const pinpoints = [
        { rx: 0.32, ry: 0.78, phase: 0.4 },
        { rx: 0.68, ry: 0.62, phase: 2.1 },
        { rx: 0.51, ry: 0.87, phase: 4.3 },
        { rx: 0.25, ry: 0.16, phase: 1.7 },
      ];
      pinpoints.forEach((pt) => {
        const on = prefersReducedMotion || Math.sin(ts * 0.0028 + pt.phase) > -0.35;
        if (!on) return;
        const px = Math.round(pitX + pitW * pt.rx - p3x);
        const py = Math.round(pitY + pitH * pt.ry - p3y);
        vctx.fillStyle = '#FAF8F5';
        vctx.fillRect(px, py, 1, 1);
      });

      vctx.restore();

      // 1B. Draw Pixel Tiles (Base Floors, Inn Refuge, Fragile Bridge, Wall Bases)
      // Elevated walls also draw a subtle 1.12x parallax cap in 1B-2 so height reads immediately!
      const wallCapOffX = Math.max(-2, Math.min(2, Math.round(camDx * 0.55)));
      const wallCapOffY = Math.max(-2, Math.min(2, Math.round(camDy * 0.55)));

      for (let ty = 0; ty < GRID_H; ty++) {
        for (let tx = 0; tx < GRID_W; tx++) {
          const kind = getSceneTile(tx, ty);
          const px = tx * TILE_PX;
          const py = ty * TILE_PX;

          if (kind === 'pit') {
            // Crisp 1px chalk-dusted parapet along ledges bordering the Pit
            vctx.fillStyle = mode === 'contraste' ? '#A8A298' : '#78726A';
            if (isWalkable(tx, ty - 1)) vctx.fillRect(px, py, TILE_PX, 1);
            if (isWalkable(tx, ty + 1)) vctx.fillRect(px, py + TILE_PX - 1, TILE_PX, 1);
            if (isWalkable(tx - 1, ty)) vctx.fillRect(px, py, 1, TILE_PX);
            if (isWalkable(tx + 1, ty)) vctx.fillRect(px + TILE_PX - 1, py, 1, TILE_PX);
            continue;
          }

          if (kind === 'inn_window') {
            vctx.drawImage(atlas.innWindow, px, py);
            continue;
          }

          if (kind === 'wall') {
            // Lower wall cliff base (gives shadow relief)
            vctx.fillStyle = '#060606';
            vctx.fillRect(px, py, TILE_PX, TILE_PX);

            // Upper wall crown shifted with 1.12x parallax to express vertical wall height!
            const capX = px + wallCapOffX;
            const capY = py + wallCapOffY - 2;
            vctx.fillStyle = '#0D0C0B';
            vctx.fillRect(capX, capY, TILE_PX, TILE_PX);

            for (let i = 0; i < 8; i++) {
              const rx = Math.floor(hash2D(tx, ty, i + 2) * (TILE_PX - 4)) + 2;
              const ry = Math.floor(hash2D(tx, ty, i + 15) * (TILE_PX - 4)) + 2;
              vctx.fillStyle = mode === 'gestuel' ? '#2A2825' : '#1B1A18';
              vctx.fillRect(capX + rx, capY + ry, mode === 'gestuel' ? 3 : 2, 1);
            }

            // Broken hand-pixeled chalk rim ONLY along edges touching walkable tiles
            const rimColor = mode === 'contraste' ? '#A8A298' : '#78726A';
            vctx.fillStyle = rimColor;
            for (let k = 0; k < TILE_PX; k++) {
              if (mode === 'gestuel' && hash2D(tx + k, ty, 33) < 0.16) continue;
              if (isWalkable(tx, ty + 1)) vctx.fillRect(capX + k, capY + TILE_PX - 1, 1, 1);
              if (isWalkable(tx, ty - 1)) vctx.fillRect(capX + k, capY, 1, 1);
              if (isWalkable(tx + 1, ty)) vctx.fillRect(capX + TILE_PX - 1, capY + k, 1, 1);
              if (isWalkable(tx - 1, ty)) vctx.fillRect(capX, capY + k, 1, 1);
            }
            continue;
          }

          if (kind === 'inn') {
            // Warm dusty floorboards inside the sheltered alcove
            vctx.fillStyle = '#33281E';
            vctx.fillRect(px, py, TILE_PX, TILE_PX);
            vctx.fillStyle = '#1E1812';
            vctx.fillRect(px, py + 7, TILE_PX, 1);
            vctx.fillRect(px, py + 15, TILE_PX, 1);
            vctx.fillRect(px, py + 23, TILE_PX, 1);
            vctx.fillStyle = '#564331';
            vctx.fillRect(px + 3, py + 2, 6, 1);
            vctx.fillRect(px + 13, py + 10, 7, 1);
            vctx.fillRect(px + 5, py + 18, 5, 1);
            continue;
          }

          if (kind === 'bridge') {
            const sag = a.bridgeSagTimer > 0 && a.bridgeSagX === tx ? 1 : 0;
            vctx.drawImage(atlas.bridge, px, py + sag);
            continue;
          }

          // Walkable stone ledge ('floor'): dithered graphite base + charcoal grain
          vctx.fillStyle = mode === 'contraste' ? '#1E1D1B' : '#24221F';
          vctx.fillRect(px, py, TILE_PX, TILE_PX);

          for (let i = 0; i < (mode === 'gestuel' ? 11 : 6); i++) {
            const rx = Math.floor(hash2D(tx, ty, i + 40) * (TILE_PX - 3)) + 1;
            const ry = Math.floor(hash2D(tx, ty, i + 60) * (TILE_PX - 2)) + 1;
            vctx.fillStyle = i % 2 === 0 ? '#141312' : '#33302C';
            vctx.fillRect(px + rx, py + ry, mode === 'gestuel' && i % 3 === 0 ? 3 : 1, 1);
          }
        }
      }

      // Draw hanging oil lamps inside the Inn alcove (signifying exact light source positions)
      const lampFrame =
        !prefersReducedMotion && Math.floor(ts / 280) % 2 === 0 ? atlas.innLampA : atlas.innLampB;
      vctx.drawImage(lampFrame, 1 * TILE_PX + 2, 3 * TILE_PX + 1);
      vctx.drawImage(lampFrame, 2 * TILE_PX + 10, 3 * TILE_PX + 1);

      // Draw fading boot footprints (dark charcoal for goblin, bright chalk scuff for Hero!)
      a.footprints.forEach((fp) => {
        const px = fp.x * TILE_PX + 9;
        const py = fp.y * TILE_PX + 19;
        vctx.fillStyle = fp.chalk
          ? fp.life > 2.5
            ? '#FAF8F5'
            : '#A8A298'
          : fp.life > 2
          ? '#100F0E'
          : '#1A1816';
        vctx.fillRect(px, py, 2, 1);
        vctx.fillRect(px + 4, py + 1, 2, 1);
      });

      // 1C. Chest Sprite (locked / resisted shake / open + persistent chalk glint when open)
      {
        const shakePx =
          a.chestShake > 0 ? Math.round(Math.sin(ts * 0.08) * a.chestShake * 2) : 0;
        const cx = s.chest.x * TILE_PX + shakePx;
        const cy = s.chest.y * TILE_PX;
        const chestSprite =
          s.chest.state === 'open'
            ? atlas.chestOpen
            : s.chest.state === 'resisted' && a.chestShake > 0.1
            ? atlas.chestResist
            : atlas.chestLocked;
        vctx.drawImage(chestSprite, cx, cy);
        if (s.chest.state === 'open' && !prefersReducedMotion && Math.floor(ts / 350) % 2 === 0) {
          vctx.fillStyle = '#FAF8F5';
          vctx.fillRect(cx + 12, cy + 8, 1, 1);
        }
      }

      // 1D. Rat Percepteur Sprite (idle / scribbling / startled hop / tail twitch)
      {
        const heroPosNow = HERO_PATROL[s.heroStepIdx];
        const heroNearRat =
          Math.abs(heroPosNow.x - s.rat.x) + Math.abs(heroPosNow.y - s.rat.y) <= 6;
        const hopPx =
          a.ratFlinch > 0 ? Math.round(Math.abs(Math.sin(a.ratFlinch * Math.PI * 2)) * 3) : 0;
        const shiverPx =
          heroNearRat && !prefersReducedMotion ? (Math.floor(ts / 110) % 2 === 0 ? 0 : 1) : 0;
        const rx = s.rat.x * TILE_PX + shiverPx;
        const ry = s.rat.y * TILE_PX - hopPx;
        const isScribbling = !prefersReducedMotion && Math.floor(ts / 550) % 4 === 0;
        const ratSprite =
          a.ratFlinch > 0.15
            ? atlas.ratStartled
            : isScribbling
            ? atlas.ratScribble
            : atlas.ratIdle;
        vctx.drawImage(ratSprite, rx, ry);
      }

      // 1E. Approaching Blinding HERO Sprite (24x28 tall + bright stride + blade shimmer)
      const hx = Math.round(a.heroRenderX * TILE_PX);
      const hy = Math.round(a.heroRenderY * TILE_PX) - 4;
      const heroSprite =
        a.heroStepTimer > 0 && Math.floor(ts / 110) % 2 === 0 ? atlas.heroStride : atlas.hero;
      vctx.drawImage(heroSprite, hx, hy);
      // Specular sword-tip glint
      if (!prefersReducedMotion && Math.floor(ts / 220) % 3 === 0) {
        vctx.fillStyle = '#FAF8F5';
        vctx.fillRect(hx + 2, hy + 2, 2, 1);
        vctx.fillRect(hx + 3, hy + 1, 1, 3);
      }

      // 1F. Playable Goblin Sprite + Breathing/Blink + Physically Lagged Lantern Sprite
      const heroPos = HERO_PATROL[s.heroStepIdx];
      const heroDist = Math.abs(heroPos.x - s.player.x) + Math.abs(heroPos.y - s.player.y);
      const fear = heroDist <= 4 && getSceneTile(s.player.x, s.player.y) !== 'inn';
      const bobPx = prefersReducedMotion
        ? 0
        : Math.round(Math.abs(Math.sin(a.walkPhase)) * a.stepPulse * 2);
      const breathPx =
        !prefersReducedMotion && a.stepPulse < 0.05 && Math.sin(ts * 0.003) > 0.88 ? -1 : 0;
      const fearPx = fear && !prefersReducedMotion ? (Math.floor(ts / 85) % 2 === 0 ? -1 : 1) : 0;

      const gx = Math.round(a.renderX * TILE_PX) + fearPx;
      const gy = Math.round(a.renderY * TILE_PX) - bobPx + breathPx;
      const isBlinking = !prefersReducedMotion && Math.floor(ts / 180) % 19 === 0;

      let goblinSprite = isBlinking ? atlas.goblinBlink : atlas.goblinIdle;
      if (fear && a.stepPulse < 0.15) {
        goblinSprite = atlas.goblinScared;
      } else if (a.stepPulse > 0.12) {
        goblinSprite = Math.sin(a.walkPhase) >= 0 ? atlas.goblinWalkA : atlas.goblinWalkB;
      }

      vctx.save();
      if (s.player.facing === -1) {
        vctx.translate(gx + TILE_PX, gy);
        vctx.scale(-1, 1);
        vctx.drawImage(goblinSprite, 0, 0);
      } else {
        vctx.drawImage(goblinSprite, gx, gy);
      }
      vctx.restore();

      // Subtle 1px red-oxide '!' above scared goblin
      if (fear) {
        vctx.fillStyle = '#9E3D35';
        vctx.fillRect(gx + 11, gy - 5, 2, 4);
        vctx.fillRect(gx + 11, gy, 2, 1);
      }

      // Lagging pixel lantern + 1px cord to goblin hand
      const lx = Math.round(a.lanternX * TILE_PX + TILE_PX * 0.5);
      const ly = Math.round(a.lanternY * TILE_PX + TILE_PX * 0.5);
      const handPxX = gx + (s.player.facing === 1 ? 15 : 8);
      const handPxY = gy + 12;

      vctx.fillStyle = '#A8A298';
      vctx.fillRect(Math.round((handPxX + lx) / 2), Math.round((handPxY + ly - 2) / 2), 1, 1);

      const lanternSprite =
        !prefersReducedMotion && Math.floor(ts / 240) % 2 === 0
          ? atlas.lanternA
          : atlas.lanternB;
      vctx.drawImage(lanternSprite, lx - 4, ly - 4);

      // Sparse 1x1 dust motes
      a.motes.forEach((m) => {
        vctx.fillStyle = m.chalk ? '#FAF8F5' : '#8A857C';
        vctx.fillRect(
          Math.round((m.x + 0.5) * TILE_PX),
          Math.round((m.y + 0.5) * TILE_PX),
          1,
          1,
        );
      });

      // === PASS 2: SUBTRACTIVE BAYER-DITHERED CHARCOAL LIGHTING + DIRECTIONAL INN CONES + BLINDING HERO AURA ===
      const img = vctx.getImageData(0, 0, BUF_W, BUF_H);
      const data = img.data;

      const flicker = prefersReducedMotion ? 0 : Math.sin(ts * 0.011) * 2.2;
      const lightRadiusPx =
        (mode === 'atmospherique' ? 78 : mode === 'gestuel' ? 68 : 58) + flicker;
      const heroCenterX = hx + 12;
      const heroCenterY = hy + 14;
      const heroAuraRadius = 46;

      // Inn lamp & directional window beam origins
      const lamp1X = 1 * TILE_PX + 8;
      const lamp1Y = 3 * TILE_PX + 7;
      const lamp2X = 2 * TILE_PX + 16;
      const lamp2Y = 3 * TILE_PX + 7;
      const win1X = 3 * TILE_PX + 20;
      const win1Y = 3 * TILE_PX + 12;
      const win2X = 3 * TILE_PX + 20;
      const win2Y = 5 * TILE_PX + 12;

      for (let py = 0; py < BUF_H; py++) {
        const bayerRow = (py & 3) * 4;
        for (let px = 0; px < BUF_W; px++) {
          const idx = (py * BUF_W + px) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];

          const isChalkEvent = r >= 240 && g >= 235 && b >= 225;
          if (isChalkEvent) continue;

          // Keep Pit abyss interior strata untouched (except bridge & chest spur)
          const inPitInterior =
            px >= pitX + 2 && px < pitX + pitW - 2 && py >= pitY + 2 && py < pitY + pitH - 2;
          const isBridgeBand = py >= 4 * TILE_PX + 6 && py <= 4 * TILE_PX + 19;
          const isChestSpur =
            px >= 7 * TILE_PX && px < 8 * TILE_PX && py >= 3 * TILE_PX && py < 4 * TILE_PX;
          if (inPitInterior && !isBridgeBand && !isChestSpur) {
            continue;
          }

          const dl = Math.hypot(px - lx, py - ly);
          const lanternFactor = Math.max(0, 1 - dl / lightRadiusPx);

          // Inn lamps illuminating inside the refuge
          const dLamp1 = Math.hypot(px - lamp1X, py - lamp1Y);
          const dLamp2 = Math.hypot(px - lamp2X, py - lamp2Y);
          const innInteriorLight = Math.max(
            Math.max(0, 1 - dLamp1 / 38),
            Math.max(0, 1 - dLamp2 / 42),
          );

          // Directional warm amber cones spilling RIGHTWARD out of the two barred Inn windows
          let windowCone = 0;
          if (px >= win1X - 4) {
            const dx1 = px - win1X;
            const dy1 = Math.abs(py - win1Y);
            if (dx1 >= 0 && dx1 < 52 && dy1 < 8 + dx1 * 0.42) {
              windowCone = Math.max(windowCone, (1 - dx1 / 52) * (1 - dy1 / (8 + dx1 * 0.42)) * 0.95);
            }
          }
          if (px >= win2X - 4) {
            const dx2 = px - win2X;
            const dy2 = Math.abs(py - win2Y);
            if (dx2 >= 0 && dx2 < 52 && dy2 < 8 + dx2 * 0.42) {
              windowCone = Math.max(windowCone, (1 - dx2 / 52) * (1 - dy2 / (8 + dx2 * 0.42)) * 0.95);
            }
          }

          // Hero blinding luminous aura (pierces darkness around the Hero!)
          const dHero = Math.hypot(px - heroCenterX, py - heroCenterY);
          const heroFactor = Math.max(0, 1 - dHero / heroAuraRadius);

          const vis = Math.min(1, Math.max(lanternFactor, innInteriorLight, windowCone, heroFactor));
          const threshold = (BAYER4[bayerRow + (px & 3)] + 0.5) / 16;

          // Warm amber tint inside Inn lamps & directional window beams
          const warmStrength = Math.max(innInteriorLight, windowCone);
          let outR = r;
          let outG = g;
          let outB = b;

          if (warmStrength > threshold * 0.45 && (outR > 12 || outG > 12)) {
            outR = Math.min(250, outR + Math.round(warmStrength * 28));
            outG = Math.min(240, outG + Math.round(warmStrength * 16));
            outB = Math.max(5, outB - Math.round(warmStrength * 4));
          }

          // Blinding chalk-white overexposure near the Hero
          if (heroFactor > 0.25 && heroFactor > threshold * 0.65 && (outR > 10 || outG > 10)) {
            const glare = Math.round((heroFactor - 0.2) * 95);
            outR = Math.min(250, outR + glare);
            outG = Math.min(248, outG + glare);
            outB = Math.min(245, outB + glare);
          }

          if (mode === 'contraste') {
            if (vis < 0.14 || (vis < 0.38 && vis < threshold * 0.55)) {
              outR = 5;
              outG = 5;
              outB = 5;
            }
          } else {
            if (vis < 0.08) {
              outR = 5;
              outG = 5;
              outB = 5;
            } else if (vis < threshold * 0.68) {
              outR = Math.max(5, outR >> 2);
              outG = Math.max(5, outG >> 2);
              outB = Math.max(5, outB >> 2);
            } else if (vis < threshold * 0.92) {
              outR = Math.max(5, (outR * 3) >> 2);
              outG = Math.max(5, (outG * 3) >> 2);
              outB = Math.max(5, (outB * 3) >> 2);
            }
          }

          data[idx] = outR;
          data[idx + 1] = outG;
          data[idx + 2] = outB;
        }
      }
      vctx.putImageData(img, 0, 0);

      // === PASS 3: CRISP NEAREST-NEIGHBOR BLIT TO DISPLAY CANVAS ===
      const dpr = window.devicePixelRatio || 1;
      const cssW = canvas.clientWidth || 784;
      const cssH = canvas.clientHeight || 504;
      const targetW = Math.round(cssW * dpr);
      const targetH = Math.round(cssH * dpr);
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }

      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, targetW, targetH);

      const scale = Math.min(targetW / BUF_W, targetH / BUF_H);
      const drawW = Math.round(BUF_W * scale);
      const drawH = Math.round(BUF_H * scale);
      const drawX = Math.floor((targetW - drawW) / 2);
      const drawY = Math.floor((targetH - drawH) / 2);
      ctx.drawImage(vCanvas, drawX, drawY, drawW, drawH);
      ctx.restore();

      rafId = requestAnimationFrame(renderFrame);
    };

    rafId = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(rafId);
  }, [activeTab]);

  const activeSpec = useMemo(
    () => VARIATIONS.find((v) => v.id === variation) ?? VARIATIONS[0],
    [variation],
  );
  const lightboxSpec = useMemo(
    () => VARIATIONS.find((v) => v.id === lightboxId) ?? null,
    [lightboxId],
  );

  const heroPos = HERO_PATROL[scene.heroStepIdx];
  const heroDistance = Math.abs(heroPos.x - scene.player.x) + Math.abs(heroPos.y - scene.player.y);
  const inInn = getSceneTile(scene.player.x, scene.player.y) === 'inn';

  return (
    <div className="min-h-screen bg-[#0B0B0B] text-[#E9E5DC]">
      {/* Sober, utilitarian top bar — no medieval ornament */}
      <header className="border-b border-[#242424] bg-[#0F0F0F]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-4 min-w-0">
            <button
              type="button"
              onClick={onBack}
              className="flex min-h-[40px] items-center gap-2 border border-[#2C2C2C] bg-[#161616] px-3 py-1.5 text-xs font-medium text-[#E9E5DC] transition-colors hover:border-[#6A6760] hover:bg-[#1E1E1E] whitespace-nowrap shrink-0"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Retour</span>
            </button>
            <h1 className="font-display text-base font-bold tracking-tight text-[#FAF8F5] truncate sm:text-lg">
              Direction artistique · Fusain Abyssal
            </h1>
          </div>

          {/* Segmented phase switcher */}
          <div className="flex items-center gap-1 border border-[#2A2A2A] bg-[#141414] p-1">
            <button
              type="button"
              onClick={() => setActiveTab('explore')}
              className={`min-h-[36px] px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
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
              className={`flex min-h-[36px] items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'phase_c'
                  ? 'bg-[#FAF8F5] text-[#0A0A0A]'
                  : 'text-[#A39E95] hover:text-[#FAF8F5]'
              }`}
            >
              <Play className="h-3 w-3" aria-hidden="true" />
              <span>Phase C · Test pixel-art 24×24</span>
            </button>
          </div>
        </div>
      </header>

      {activeTab === 'explore' ? (
        <main className="mx-auto max-w-6xl space-y-10 px-4 py-8 sm:px-6">
          {/* Brief Manifesto Strip */}
          <section className="flex flex-col justify-between gap-4 border-b border-[#242424] pb-6 md:flex-row md:items-end">
            <div className="space-y-2">
              <p className="font-mono-num text-xs text-[#9C978E]">
                Le noir est un espace · Le blanc est un événement · Le gris est une matière
              </p>
              <h2 className="font-display text-2xl font-bold text-[#FAF8F5] sm:text-3xl text-balance">
                Scène de validation commune : trois traitements au fusain
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('phase_c')}
              className="flex min-h-[44px] items-center justify-center gap-2 bg-[#FAF8F5] px-5 py-2.5 text-sm font-semibold text-[#0B0B0B] transition-colors hover:bg-[#DFDBD2] whitespace-nowrap shrink-0"
            >
              <Play className="h-4 w-4" aria-hidden="true" />
              <span>Lancer le test d’intégration (Phase C)</span>
            </button>
          </section>

          {/* Phase A: Three Variations Grid */}
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
                        setActiveTab('phase_c');
                      }}
                      className="flex min-h-[42px] w-full items-center justify-center gap-2 border border-[#3A3A3A] bg-[#181818] px-4 py-2 text-xs font-semibold text-[#FAF8F5] transition-colors hover:bg-[#FAF8F5] hover:text-[#0B0B0B]"
                    >
                      <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Tester ce rendu dans Phase C</span>
                    </button>
                  </div>
                </article>
              );
            })}
          </section>

          {/* Phase B: Comparative Matrix */}
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
      ) : (
        /* Phase C: Playable Animated Integration Test */
        <main className="mx-auto grid max-w-6xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-12">
          {/* Canvas Viewport */}
          <section className="space-y-3 lg:col-span-8">
            <div className="flex flex-wrap items-center justify-between gap-3 border border-[#242424] bg-[#121212] px-4 py-2.5">
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
                <span className={inInn ? 'text-[#D8A55C]' : heroDistance <= 4 ? 'text-[#D1665E]' : 'text-[#9C978E]'}>
                  {inInn
                    ? 'Statut : En sûreté (Auberge)'
                    : heroDistance <= 4
                    ? `Héros proche (${heroDistance} cases)`
                    : `Héros à ${heroDistance} cases`}
                </span>
              </div>

              {/* Live shader switcher */}
              <div className="flex items-center gap-1" role="group" aria-label="Variante de rendu">
                {VARIATIONS.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setVariation(v.id)}
                    className={`min-h-[32px] px-2.5 py-1 text-xs transition-colors whitespace-nowrap shrink-0 ${
                      variation === v.id
                        ? 'bg-[#FAF8F5] font-semibold text-[#0B0B0B]'
                        : 'border border-[#2E2E2E] bg-[#181818] text-[#B8B2A8] hover:text-[#FAF8F5]'
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
            </div>

            <div className="overflow-hidden border border-[#262626] bg-[#050505]">
              <canvas
                ref={canvasRef}
                aria-label="Scène animée Phase C — Fusain Abyssal"
                className="block aspect-[14/9] w-full"
              />
            </div>

            {/* Active Observation Bar (sober, zero ornament) */}
            <div className="border border-[#262626] bg-[#121212] px-4 py-3">
              <div className="flex items-center justify-between gap-2 text-xs text-[#9C978E]">
                <span className="font-mono-num uppercase tracking-wide text-[#FAF8F5]">
                  {scene.speaker}
                </span>
                <span className="font-mono-num">Tour {scene.turn} · Mode {activeSpec.title}</span>
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-[#E4E0D8]">{scene.message}</p>
            </div>
          </section>

          {/* Controls & Checklist Rail */}
          <aside className="space-y-5 lg:col-span-4">
            <div className="space-y-4 border border-[#262626] bg-[#121212] p-5">
              <div className="flex items-center justify-between border-b border-[#242424] pb-3">
                <h2 className="font-display text-lg font-bold text-[#FAF8F5]">
                  Banc d’essai animé
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

            <div className="space-y-3 border border-[#262626] bg-[#121212] p-5 text-xs leading-relaxed text-[#B8B2A8]">
              <div className="flex items-center gap-2 font-semibold text-[#FAF8F5]">
                <Compass className="h-4 w-4" aria-hidden="true" />
                <span>Points à vérifier dans ce test</span>
              </div>
              <ul className="space-y-2">
                <li>
                  <strong className="text-[#FAF8F5]">1. Gobelin &amp; lanterne :</strong> démarche sautillante, oscillation des oreilles/sacoche et inertie physique de la lanterne.
                </li>
                <li>
                  <strong className="text-[#FAF8F5]">2. Coffre (haut de passerelle) :</strong> premier essai bloqué avec tremblement et étincelles de craie, second essai ouvrant le couvercle.
                </li>
                <li>
                  <strong className="text-[#FAF8F5]">3. Rat percepteur (en bas) :</strong> sursaute et lève son registre, puis panique quand le Héros approche.
                </li>
                <li>
                  <strong className="text-[#FAF8F5]">4. Rupture du Héros :</strong> blanc pur tranchant contrastant avec l’estompe et la sécurité tiède de l’auberge à gauche.
                </li>
              </ul>
              <p className="border-t border-[#222222] pt-3 font-mono-num text-[11px] text-[#8E8980]">
                Clavier : Flèches / WASD · Espace / Entrée (Action) · V (Variante) · H (Héros) · Tab (Phases A/B)
              </p>
            </div>
          </aside>
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
                  setLightboxId(null);
                  setActiveTab('phase_c');
                }}
                className="flex min-h-[38px] items-center gap-2 bg-[#FAF8F5] px-4 py-1.5 font-semibold text-[#0B0B0B] hover:bg-[#E0DCD3]"
              >
                <Flame className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Charger dans Phase C</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
