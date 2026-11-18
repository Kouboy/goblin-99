import { FusainPixelAtlas } from './fusainPixelSprites';

export type FusainVariationId = 'contraste' | 'gestuel' | 'atmospherique';
export type PitExperimentId = 'initial' | 'exp_a' | 'exp_b' | 'exp_c';

export const SCENE_ROWS = [
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

export const GRID_W = 14;
export const GRID_H = 9;

export type SceneTileKind = 'wall' | 'floor' | 'pit' | 'bridge' | 'inn' | 'inn_window';

export function getSceneTile(x: number, y: number): SceneTileKind {
  if (x < 0 || y < 0 || x >= GRID_W || y >= GRID_H) return 'wall';
  const ch = SCENE_ROWS[y][x];
  if (ch === '#') return 'wall';
  if (ch === 'P') return 'pit';
  if (ch === 'B') return 'bridge';
  if (ch === 'I') return 'inn';
  if (ch === 'W') return 'inn_window';
  return 'floor';
}

export function isWalkable(x: number, y: number): boolean {
  const k = getSceneTile(x, y);
  return k === 'floor' || k === 'bridge' || k === 'inn';
}

export const HERO_PATROL: Array<{ x: number; y: number }> = [
  { x: 12, y: 1 },
  { x: 12, y: 2 },
  { x: 12, y: 3 },
  { x: 12, y: 4 },
  { x: 11, y: 4 },
  { x: 10, y: 4 },
  { x: 9, y: 4 },
  { x: 8, y: 4 },
];

export function hash2D(x: number, y: number, salt = 0): number {
  let n =
    Math.imul(x + 19, 374761393) +
    Math.imul(y + 53, 668265263) +
    Math.imul(salt + 7, 1442695041);
  n = (n ^ (n >>> 13)) >>> 0;
  n = Math.imul(n, 1274126177) >>> 0;
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

export interface DustMote {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  chalk: boolean;
}

export interface FootprintMark {
  x: number;
  y: number;
  life: number;
  chalk: boolean;
}

export interface SceneRenderSnapshot {
  player: { x: number; y: number; facing: 1 | -1 };
  renderX: number;
  renderY: number;
  walkPhase: number;
  stepPulse: number;
  lanternX: number;
  lanternY: number;
  chest: { x: number; y: number; state: 'locked' | 'resisted' | 'open' };
  chestShake: number;
  rat: { x: number; y: number };
  ratFlinch: number;
  heroStepIdx: number;
  heroRenderX: number;
  heroRenderY: number;
  heroStepTimer: number;
  bridgeSagX: number;
  bridgeSagTimer: number;
  footprints: FootprintMark[];
  motes: DustMote[];
  ts: number;
  prefersReducedMotion: boolean;
  parallaxEnabled: boolean;
}

const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

let cachedGrainCanvas: HTMLCanvasElement | null = null;
function getCharcoalGrainCanvas(): HTMLCanvasElement {
  if (cachedGrainCanvas) return cachedGrainCanvas;
  const c = document.createElement('canvas');
  c.width = 168;
  c.height = 168;
  const ctx = c.getContext('2d');
  if (ctx) {
    for (let i = 0; i < 2400; i++) {
      const rx = hash2D(i, 1, 5) * 168;
      const ry = hash2D(i, 2, 11) * 168;
      const light = hash2D(i, 3, 19) > 0.52;
      const alpha = 0.025 + hash2D(i, 4, 29) * 0.04;
      ctx.fillStyle = light
        ? `rgba(244, 238, 228, ${alpha})`
        : `rgba(0, 0, 0, ${alpha * 1.45})`;
      ctx.fillRect(rx, ry, hash2D(i, 5, 37) > 0.8 ? 2 : 1, 1);
    }
  }
  cachedGrainCanvas = c;
  return c;
}

let cachedLightMaskCanvas: HTMLCanvasElement | null = null;
function getLightMaskCanvas(w: number, h: number): HTMLCanvasElement {
  if (!cachedLightMaskCanvas) {
    cachedLightMaskCanvas = document.createElement('canvas');
  }
  if (cachedLightMaskCanvas.width !== w || cachedLightMaskCanvas.height !== h) {
    cachedLightMaskCanvas.width = w;
    cachedLightMaskCanvas.height = h;
  }
  return cachedLightMaskCanvas;
}

function drawGesturalLine(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  seed: number,
  color: string,
  width = 1.4,
  roughness = 1.6,
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  const steps = Math.max(2, Math.floor(Math.hypot(x2 - x1, y2 - y1) / 14));
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const jx = (hash2D(seed, i, 1) - 0.5) * roughness;
    const jy = (hash2D(seed, i, 2) - 0.5) * roughness;
    ctx.lineTo(x1 + (x2 - x1) * t + jx, y1 + (y2 - y1) * t + jy);
  }
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function drawPixelCircle(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  color: string,
) {
  ctx.fillStyle = color;
  let x = r;
  let y = 0;
  let err = 1 - x;
  while (x >= y) {
    ctx.fillRect(cx + x, cy + y, 1, 1);
    ctx.fillRect(cx + y, cy + x, 1, 1);
    ctx.fillRect(cx - y, cy + x, 1, 1);
    ctx.fillRect(cx - x, cy + y, 1, 1);
    ctx.fillRect(cx - x, cy - y, 1, 1);
    ctx.fillRect(cx - y, cy - x, 1, 1);
    ctx.fillRect(cx + y, cy - x, 1, 1);
    ctx.fillRect(cx + x, cy - y, 1, 1);
    y += 1;
    if (err < 0) err += 2 * y + 1;
    else {
      x -= 1;
      err += 2 * (y - x) + 1;
    }
  }
}

function blitToDisplayCanvas(
  displayCanvas: HTMLCanvasElement,
  bufCanvas: HTMLCanvasElement,
  nearestNeighbor: boolean,
) {
  const ctx = displayCanvas.getContext('2d');
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  const cssW = displayCanvas.clientWidth || 672;
  const cssH = displayCanvas.clientHeight || 432;
  const targetW = Math.round(cssW * dpr);
  const targetH = Math.round(cssH * dpr);
  if (displayCanvas.width !== targetW || displayCanvas.height !== targetH) {
    displayCanvas.width = targetW;
    displayCanvas.height = targetH;
  }

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = !nearestNeighbor;
  ctx.fillStyle = '#040404';
  ctx.fillRect(0, 0, targetW, targetH);

  const scale = Math.min(targetW / bufCanvas.width, targetH / bufCanvas.height);
  const drawW = Math.round(bufCanvas.width * scale);
  const drawH = Math.round(bufCanvas.height * scale);
  const drawX = Math.floor((targetW - drawW) / 2);
  const drawY = Math.floor((targetH - drawH) / 2);
  ctx.drawImage(bufCanvas, drawX, drawY, drawW, drawH);
  ctx.restore();
}

/**
 * Renders the Reference (initial) 336x216 Bayer-dithered pixel-art version unchanged for comparison.
 */
function renderInitialReference(
  displayCanvas: HTMLCanvasElement,
  bufCanvas: HTMLCanvasElement,
  atlas: FusainPixelAtlas,
  mode: FusainVariationId,
  s: SceneRenderSnapshot,
) {
  const TILE_PX = 24;
  const BUF_W = GRID_W * TILE_PX;
  const BUF_H = GRID_H * TILE_PX;
  if (bufCanvas.width !== BUF_W || bufCanvas.height !== BUF_H) {
    bufCanvas.width = BUF_W;
    bufCanvas.height = BUF_H;
  }
  const vctx = bufCanvas.getContext('2d', { willReadFrequently: true });
  if (!vctx) return;

  vctx.imageSmoothingEnabled = false;
  vctx.fillStyle = '#040404';
  vctx.fillRect(0, 0, BUF_W, BUF_H);

  const camDx = s.parallaxEnabled ? s.renderX - 6 : 0;
  const camDy = s.parallaxEnabled ? s.renderY - 4 : 0;
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

  const p4x = Math.round(camDx * 1.1);
  const p4y = Math.round(camDy * 1.1);
  vctx.fillStyle = '#0C0C0B';
  vctx.fillRect(pitX + 18 - p4x, pitY, 8, pitH);
  vctx.fillRect(pitX + pitW - 26 - p4x, pitY, 10, pitH);
  vctx.fillStyle = '#100F0E';
  vctx.fillRect(pitX, pitY + Math.round(pitH * 0.8) - p4y, pitW, 5);

  const p3x = Math.round(camDx * 2.2);
  const p3y = Math.round(camDy * 2.2);
  const wheelX = Math.round(pitX + pitW * 0.58 - p3x);
  const wheelY = Math.round(pitY + pitH * 0.65 - p3y);
  drawPixelCircle(vctx, wheelX, wheelY, 24, '#1B1A18');
  drawPixelCircle(vctx, wheelX, wheelY, 13, '#151412');
  vctx.fillStyle = '#181715';
  vctx.fillRect(wheelX - 23, wheelY, 46, 1);
  vctx.fillRect(wheelX, wheelY - 23, 1, 46);

  const p2x = Math.round(camDx * 3.6);
  const p2y = Math.round(camDy * 3.6);
  [0.21, 0.46, 0.79].forEach((ratio, idx) => {
    const sway = s.prefersReducedMotion ? 0 : Math.round(Math.sin(s.ts * 0.0014 + idx * 1.8));
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

  [
    { rx: 0.32, ry: 0.78, phase: 0.4 },
    { rx: 0.68, ry: 0.62, phase: 2.1 },
    { rx: 0.51, ry: 0.87, phase: 4.3 },
    { rx: 0.25, ry: 0.16, phase: 1.7 },
  ].forEach((pt) => {
    const on = s.prefersReducedMotion || Math.sin(s.ts * 0.0028 + pt.phase) > -0.35;
    if (!on) return;
    vctx.fillStyle = '#FAF8F5';
    vctx.fillRect(
      Math.round(pitX + pitW * pt.rx - p3x),
      Math.round(pitY + pitH * pt.ry - p3y),
      1,
      1,
    );
  });
  vctx.restore();

  for (let ty = 0; ty < GRID_H; ty++) {
    for (let tx = 0; tx < GRID_W; tx++) {
      const kind = getSceneTile(tx, ty);
      const px = tx * TILE_PX;
      const py = ty * TILE_PX;
      if (kind === 'pit') {
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
        vctx.fillStyle = '#0C0B0A';
        vctx.fillRect(px, py, TILE_PX, TILE_PX);
        vctx.fillStyle = mode === 'contraste' ? '#A8A298' : '#78726A';
        for (let k = 0; k < TILE_PX; k++) {
          if (isWalkable(tx, ty + 1)) vctx.fillRect(px + k, py + TILE_PX - 1, 1, 1);
          if (isWalkable(tx, ty - 1)) vctx.fillRect(px + k, py, 1, 1);
          if (isWalkable(tx + 1, ty)) vctx.fillRect(px + TILE_PX - 1, py + k, 1, 1);
          if (isWalkable(tx - 1, ty)) vctx.fillRect(px, py + k, 1, 1);
        }
        continue;
      }
      if (kind === 'inn') {
        vctx.fillStyle = '#33281E';
        vctx.fillRect(px, py, TILE_PX, TILE_PX);
        vctx.fillStyle = '#1E1812';
        vctx.fillRect(px, py + 7, TILE_PX, 1);
        vctx.fillRect(px, py + 15, TILE_PX, 1);
        continue;
      }
      if (kind === 'bridge') {
        const sag = s.bridgeSagTimer > 0 && s.bridgeSagX === tx ? 1 : 0;
        vctx.drawImage(atlas.bridge, px, py + sag);
        continue;
      }
      vctx.fillStyle = mode === 'contraste' ? '#1E1D1B' : '#24221F';
      vctx.fillRect(px, py, TILE_PX, TILE_PX);
      for (let i = 0; i < 8; i++) {
        const rx = Math.floor(hash2D(tx, ty, i + 40) * (TILE_PX - 3)) + 1;
        const ry = Math.floor(hash2D(tx, ty, i + 60) * (TILE_PX - 2)) + 1;
        vctx.fillStyle = i % 2 === 0 ? '#141312' : '#33302C';
        vctx.fillRect(px + rx, py + ry, 1, 1);
      }
    }
  }

  const lampFrame =
    !s.prefersReducedMotion && Math.floor(s.ts / 280) % 2 === 0 ? atlas.innLampA : atlas.innLampB;
  vctx.drawImage(lampFrame, 1 * TILE_PX + 2, 3 * TILE_PX + 1);
  vctx.drawImage(lampFrame, 2 * TILE_PX + 10, 3 * TILE_PX + 1);

  const chestSprite =
    s.chest.state === 'open'
      ? atlas.chestOpen
      : s.chest.state === 'resisted' && s.chestShake > 0.1
      ? atlas.chestResist
      : atlas.chestLocked;
  vctx.drawImage(chestSprite, s.chest.x * TILE_PX, s.chest.y * TILE_PX);

  const ratSprite = s.ratFlinch > 0.15 ? atlas.ratStartled : atlas.ratIdle;
  vctx.drawImage(ratSprite, s.rat.x * TILE_PX, s.rat.y * TILE_PX);

  const hx = Math.round(s.heroRenderX * TILE_PX);
  const hy = Math.round(s.heroRenderY * TILE_PX) - 4;
  vctx.drawImage(s.heroStepTimer > 0 ? atlas.heroStride : atlas.hero, hx, hy);

  const gx = Math.round(s.renderX * TILE_PX);
  const gy = Math.round(s.renderY * TILE_PX);
  const goblinSprite =
    s.stepPulse > 0.12
      ? Math.sin(s.walkPhase) >= 0
        ? atlas.goblinWalkA
        : atlas.goblinWalkB
      : atlas.goblinIdle;
  vctx.save();
  if (s.player.facing === -1) {
    vctx.translate(gx + TILE_PX, gy);
    vctx.scale(-1, 1);
    vctx.drawImage(goblinSprite, 0, 0);
  } else {
    vctx.drawImage(goblinSprite, gx, gy);
  }
  vctx.restore();

  const lx = Math.round(s.lanternX * TILE_PX + TILE_PX * 0.5);
  const ly = Math.round(s.lanternY * TILE_PX + TILE_PX * 0.5);
  vctx.drawImage(atlas.lanternA, lx - 4, ly - 4);

  const img = vctx.getImageData(0, 0, BUF_W, BUF_H);
  const data = img.data;
  for (let py = 0; py < BUF_H; py++) {
    const bayerRow = (py & 3) * 4;
    for (let px = 0; px < BUF_W; px++) {
      const idx = (py * BUF_W + px) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      if (r >= 240 && g >= 235 && b >= 225) continue;
      const inPitInterior =
        px >= pitX + 2 && px < pitX + pitW - 2 && py >= pitY + 2 && py < pitY + pitH - 2;
      const isBridgeBand = py >= 4 * TILE_PX + 6 && py <= 4 * TILE_PX + 19;
      const isChestSpur =
        px >= 7 * TILE_PX && px < 8 * TILE_PX && py >= 3 * TILE_PX && py < 4 * TILE_PX;
      if (inPitInterior && !isBridgeBand && !isChestSpur) continue;

      const dl = Math.hypot(px - lx, py - ly);
      const di = Math.hypot(px - 2.1 * TILE_PX, py - 4.5 * TILE_PX);
      const dHero = Math.hypot(px - (hx + 12), py - (hy + 14));
      const vis = Math.min(
        1,
        Math.max(Math.max(0, 1 - dl / 66), Math.max(0, 1 - di / 52), Math.max(0, 1 - dHero / 44)),
      );
      const threshold = (BAYER4[bayerRow + (px & 3)] + 0.5) / 16;
      if (vis < 0.08) {
        data[idx] = 5;
        data[idx + 1] = 5;
        data[idx + 2] = 5;
      } else if (vis < threshold * 0.68) {
        data[idx] = Math.max(5, r >> 2);
        data[idx + 1] = Math.max(5, g >> 2);
        data[idx + 2] = Math.max(5, b >> 2);
      }
    }
  }
  vctx.putImageData(img, 0, 0);
  blitToDisplayCanvas(displayCanvas, bufCanvas, true);
}

/**
 * Hybrid Gestural Charcoal Renderer (672x432) for Experiments A, B, and C.
 * Preserves sharp animated sprites on a crisp grid while giving the Pit & rock walls
 * genuine hand-drawn charcoal mass, vertical face thickness, occlusion, and projection.
 */
function renderHybridGesturalExperiment(
  displayCanvas: HTMLCanvasElement,
  bufCanvas: HTMLCanvasElement,
  atlas: FusainPixelAtlas,
  experiment: Exclude<PitExperimentId, 'initial'>,
  s: SceneRenderSnapshot,
) {
  const T = 48; // 2x of 24px sprite cell -> 672x432 crisp hybrid canvas
  const W = GRID_W * T;
  const H = GRID_H * T;
  if (bufCanvas.width !== W || bufCanvas.height !== H) {
    bufCanvas.width = W;
    bufCanvas.height = H;
  }
  const ctx = bufCanvas.getContext('2d');
  if (!ctx) return;

  const effectiveParallax = experiment === 'exp_a' ? false : s.parallaxEnabled;
  const camDx = effectiveParallax ? s.renderX - 6 : 0;
  const camDy = effectiveParallax ? s.renderY - 4 : 0;

  ctx.fillStyle = '#030303';
  ctx.fillRect(0, 0, W, H);

  const pitX = 6 * T; // 288
  const pitY = 1 * T; // 48
  const pitW = 6 * T; // 288
  const pitH = 7 * T; // 336
  const spurX = 7 * T; // 336..384
  const spurY = 3 * T; // 144..192
  const bridgeY = 4 * T + 12; // 204
  const bridgeH = 24;

  // ===========================================================================
  // 1. GRAND PUITS EXPERIMENTAL ARCHITECTURE (exp_a | exp_b | exp_c)
  // ===========================================================================
  ctx.save();
  ctx.beginPath();
  ctx.rect(pitX, pitY, pitW, pitH);
  ctx.clip();

  if (experiment === 'exp_a') {
    // -------------------------------------------------------------------------
    // EXPÉRIENCE A : PAROI VERTICALE ET OCCLUSION (strictement sans parallaxe)
    // Prouver qu'on regarde PAR-DESSUS UN BORD vertical sur une image fixe.
    // -------------------------------------------------------------------------
    ctx.fillStyle = '#030303';
    ctx.fillRect(pitX, pitY, pitW, pitH);

    // 1) Deep rock vertical cliff face plunging under the north ledge (y=1..4.2)
    const wallGrad = ctx.createLinearGradient(0, pitY, 0, pitY + pitH * 0.85);
    wallGrad.addColorStop(0, '#292622');
    wallGrad.addColorStop(0.28, '#191715');
    wallGrad.addColorStop(0.58, '#0D0C0B');
    wallGrad.addColorStop(0.85, '#040404');
    wallGrad.addColorStop(1, '#020202');
    ctx.fillStyle = wallGrad;
    ctx.fillRect(pitX, pitY, pitW, pitH * 0.85);

    // Left & right side vertical rock faces showing thick chasm side walls
    ctx.fillStyle = '#1D1B18';
    ctx.fillRect(pitX, pitY, 22, pitH);
    ctx.fillStyle = '#151412';
    ctx.fillRect(pitX + pitW - 22, pitY, 22, pitH);

    // Vertical geological rock striations & gestural charcoal hatches descending straight down
    for (let col = 0; col < 14; col++) {
      const rx = pitX + 18 + col * 19 + (hash2D(col, 3, 1) - 0.5) * 6;
      const maxLen = pitH * (0.45 + hash2D(col, 9, 2) * 0.32);
      drawGesturalLine(
        ctx,
        rx,
        pitY + 8,
        rx,
        pitY + maxLen,
        col + 40,
        col % 3 === 0 ? 'rgba(195, 188, 176, 0.22)' : 'rgba(110, 104, 96, 0.16)',
        col % 4 === 0 ? 1.8 : 1.1,
        2.2,
      );
    }

    // Horizontal rock strata joints spacing closer as depth drops (vertical foreshortening)
    [18, 42, 74, 114, 164].forEach((dy, idx) => {
      const alpha = Math.max(0.05, 0.32 - idx * 0.055);
      drawGesturalLine(
        ctx,
        pitX + 4,
        pitY + dy,
        pitX + pitW - 4,
        pitY + dy + (idx % 2 === 0 ? 2 : -2),
        100 + idx,
        `rgba(180, 172, 160, ${alpha})`,
        1.2,
        2.4,
      );
    });

    // Lower occluded heavy iron beam & chain PASSING BEHIND the chest spur & bridge
    ctx.fillStyle = '#171513';
    ctx.fillRect(pitX + 20, bridgeY + 52, pitW - 40, 10);
    drawGesturalLine(
      ctx,
      pitX + 20,
      bridgeY + 52,
      pitX + pitW - 20,
      bridgeY + 52,
      210,
      'rgba(180, 172, 160, 0.25)',
      1.3,
    );
    // Vertical chain descending BEHIND the bridge into the bottom blackness
    ctx.strokeStyle = 'rgba(165, 158, 148, 0.34)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(pitX + pitW * 0.36, pitY + 8);
    ctx.lineTo(pitX + pitW * 0.36, pitY + pitH - 18);
    ctx.stroke();
    ctx.setLineDash([]);

    // Strong drop shadow cast DOWNWARD onto the cliff wall from the north ledge & chest spur
    ctx.fillStyle = 'rgba(3, 3, 3, 0.72)';
    ctx.fillRect(pitX, pitY, pitW, 14);
    ctx.fillRect(spurX - 6, spurY + T, T + 14, 22);
    // Timber support pilings rooted INTO the vertical cliff beneath the chest spur
    ctx.fillStyle = '#25211C';
    ctx.fillRect(spurX + 8, spurY + T, 6, 36);
    ctx.fillRect(spurX + T - 14, spurY + T, 6, 36);
    drawGesturalLine(ctx, spurX + 8, spurY + T, spurX + 8, spurY + T + 36, 301, '#8C857A', 1.2);
    drawGesturalLine(ctx, spurX + T - 14, spurY + T, spurX + T - 14, spurY + T + 36, 302, '#8C857A', 1.2);

    // Bridge abutment pillars & shadow cast down across the deeper chasm beam
    ctx.fillStyle = '#211E1A';
    ctx.fillRect(pitX, bridgeY + bridgeH, 16, 48);
    ctx.fillRect(pitX + pitW - 16, bridgeY + bridgeH, 16, 48);
    ctx.fillStyle = 'rgba(2, 2, 2, 0.78)';
    ctx.fillRect(pitX, bridgeY + bridgeH, pitW, 16);

    // Chipped rock rim thickness (ledge lip at north, west & east of pit)
    ctx.fillStyle = '#38342E';
    ctx.fillRect(pitX, pitY, pitW, 7);
    ctx.fillRect(pitX, pitY, 7, pitH);
    ctx.fillRect(pitX + pitW - 7, pitY, 7, pitH);

    // 2 tiny distant chalk specks deep in the absolute void
    ctx.fillStyle = '#FAF8F5';
    ctx.fillRect(pitX + Math.round(pitW * 0.62), pitY + pitH - 36, 2, 2);
    ctx.fillRect(pitX + Math.round(pitW * 0.44), pitY + pitH - 20, 1, 1);
  } else if (experiment === 'exp_b') {
    // -------------------------------------------------------------------------
    // EXPÉRIENCE B : ARCHITECTURE VERTICALE COHÉRENTE (projection 3D unifiée)
    // Un seul point de fuite vertical VP + câble maître reliant 3 plateformes étagées.
    // -------------------------------------------------------------------------
    ctx.fillStyle = '#030303';
    ctx.fillRect(pitX, pitY, pitW, pitH);

    // Subtle strictly bounded parallax (<= 3px) proportional to depth z
    const pLimX = Math.max(-1, Math.min(1, camDx * 0.35));
    const pLimY = Math.max(-1, Math.min(1, camDy * 0.35));

    // Shared vanishing point below bottom center of pit
    const vpX = pitX + pitW * 0.52;
    const vpY = pitY + pitH + 90;

    const project = (worldX: number, worldY: number, z: number) => {
      const scale = 1 / (1 + z * 0.48);
      const px = vpX + (worldX - vpX) * scale - pLimX * (z * 1.1);
      const py = vpY + (worldY - vpY) * scale - pLimY * (z * 0.9);
      return { x: px, y: py, s: scale };
    };

    // Converging pit chasm corners & solid tapered shaft walls toward VP
    const deepTL = project(pitX, pitY, 4.2);
    const deepTR = project(pitX + pitW, pitY, 4.2);
    const deepBR = project(pitX + pitW, pitY + pitH, 4.2);
    const deepBL = project(pitX, pitY + pitH, 4.2);

    // North plunging shaft wall
    const northGrad = ctx.createLinearGradient(0, pitY, 0, deepTL.y);
    northGrad.addColorStop(0, '#24221E');
    northGrad.addColorStop(0.55, '#121110');
    northGrad.addColorStop(1, '#050505');
    ctx.fillStyle = northGrad;
    ctx.beginPath();
    ctx.moveTo(pitX, pitY);
    ctx.lineTo(pitX + pitW, pitY);
    ctx.lineTo(deepTR.x, deepTR.y);
    ctx.lineTo(deepTL.x, deepTL.y);
    ctx.closePath();
    ctx.fill();

    // West plunging shaft wall
    const westGrad = ctx.createLinearGradient(pitX, 0, deepTL.x, 0);
    westGrad.addColorStop(0, '#1D1B18');
    westGrad.addColorStop(1, '#050505');
    ctx.fillStyle = westGrad;
    ctx.beginPath();
    ctx.moveTo(pitX, pitY);
    ctx.lineTo(deepTL.x, deepTL.y);
    ctx.lineTo(deepBL.x, deepBL.y);
    ctx.lineTo(pitX, pitY + pitH);
    ctx.closePath();
    ctx.fill();

    // East plunging shaft wall
    const eastGrad = ctx.createLinearGradient(pitX + pitW, 0, deepTR.x, 0);
    eastGrad.addColorStop(0, '#181614');
    eastGrad.addColorStop(1, '#040404');
    ctx.fillStyle = eastGrad;
    ctx.beginPath();
    ctx.moveTo(pitX + pitW, pitY);
    ctx.lineTo(deepTR.x, deepTR.y);
    ctx.lineTo(deepBR.x, deepBR.y);
    ctx.lineTo(pitX + pitW, pitY + pitH);
    ctx.closePath();
    ctx.fill();

    const corners = [
      { x: pitX, y: pitY },
      { x: pitX + pitW, y: pitY },
      { x: pitX, y: pitY + pitH },
      { x: pitX + pitW, y: pitY + pitH },
    ];
    corners.forEach((c, idx) => {
      const deep = project(c.x, c.y, 4.2);
      drawGesturalLine(ctx, c.x, c.y, deep.x, deep.y, 400 + idx, 'rgba(155, 148, 136, 0.34)', 1.3);
    });

    // Vertical wall masonry rings at z = 0.7, 1.5, 2.6, 4.0
    [0.7, 1.5, 2.6, 4.0].forEach((z, idx) => {
      const tl = project(pitX, pitY, z);
      const tr = project(pitX + pitW, pitY, z);
      const br = project(pitX + pitW, pitY + pitH, z);
      const bl = project(pitX, pitY + pitH, z);
      const alpha = Math.max(0.06, 0.28 - idx * 0.055);
      ctx.strokeStyle = `rgba(175, 168, 156, ${alpha})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(tl.x, tl.y);
      ctx.lineTo(tr.x, tr.y);
      ctx.lineTo(br.x, br.y);
      ctx.lineTo(bl.x, bl.y);
      ctx.closePath();
      ctx.stroke();
    });

    // Platform 3 (deepest, z = 3.2) — small suspended scaffold fading into charcoal
    {
      const z = 3.2;
      const pL = project(pitX + 86, pitY + 230, z);
      const pR = project(pitX + 206, pitY + 230, z);
      const h = Math.max(5, Math.round(14 * pL.s));
      ctx.fillStyle = '#141312';
      ctx.fillRect(pL.x, pL.y, pR.x - pL.x, h);
      drawGesturalLine(ctx, pL.x, pL.y, pR.x, pL.y, 420, 'rgba(165, 158, 148, 0.26)', 1);
      // Tiny focal chalk lantern at platform 3
      ctx.fillStyle = '#FAF8F5';
      ctx.fillRect(Math.round((pL.x + pR.x) / 2), Math.round(pL.y - 2), 2, 2);
    }

    // Platform 2 (mid-depth, z = 1.75) + distant walkway disappearing BEHIND east wall
    {
      const z = 1.75;
      const pL = project(pitX + 68, pitY + 185, z);
      const pR = project(pitX + 225, pitY + 185, z);
      const eastWallEntry = project(pitX + pitW + 24, pitY + 188, z);
      const h = Math.max(8, Math.round(16 * pL.s));

      // Walkway extending into right wall (occluded by right wall clip!)
      ctx.fillStyle = '#1B1917';
      ctx.fillRect(pR.x - 4, pL.y + 2, eastWallEntry.x - pR.x + 12, Math.max(5, h - 4));
      drawGesturalLine(ctx, pR.x - 4, pL.y + 2, eastWallEntry.x, pL.y + 2, 431, 'rgba(175, 168, 156, 0.35)', 1.1);

      // Suspended wooden stage
      ctx.fillStyle = '#23201C';
      ctx.fillRect(pL.x, pL.y, pR.x - pL.x, h);
      drawGesturalLine(ctx, pL.x, pL.y, pR.x, pL.y, 430, 'rgba(205, 198, 186, 0.45)', 1.2);
      // Guardrail posts
      for (let rx = pL.x + 6; rx < pR.x - 4; rx += 14) {
        ctx.fillStyle = 'rgba(185, 178, 168, 0.35)';
        ctx.fillRect(rx, pL.y - 4, 1, 4);
      }
    }

    // Platform 1 (near below player, z = 0.78) — clear wooden rigging deck
    {
      const z = 0.78;
      const pL = project(pitX + 54, pitY + 150, z);
      const pR = project(pitX + 236, pitY + 150, z);
      const h = Math.round(18 * pL.s);
      ctx.fillStyle = '#2C2721';
      ctx.fillRect(pL.x, pL.y, pR.x - pL.x, h);
      drawGesturalLine(ctx, pL.x, pL.y, pR.x, pL.y, 440, 'rgba(225, 218, 206, 0.62)', 1.5);
      // Corner suspension cables rising up toward z=0 hoist frame
      const topAnchorL = project(pitX + 54, pitY + 12, 0.15);
      const topAnchorR = project(pitX + 236, pitY + 12, 0.15);
      drawGesturalLine(ctx, topAnchorL.x, topAnchorL.y, pL.x + 4, pL.y, 441, 'rgba(180, 174, 165, 0.38)', 1.1);
      drawGesturalLine(ctx, topAnchorR.x, topAnchorR.y, pR.x - 4, pL.y, 442, 'rgba(180, 174, 165, 0.38)', 1.1);
    }

    // Master Hoist Cable descending from Winch at level 0 (x=9, y=1) through all 3 platforms
    // Notice: this draws BEFORE the player's bridge in step 2, so the bridge genuinely OCCLUDES it!
    const cableTopX = 9 * T + 24;
    const cableTopY = pitY;
    const cableBot = project(cableTopX, pitY + 230, 3.2);
    drawGesturalLine(ctx, cableTopX, cableTopY, cableBot.x, cableBot.y, 450, '#B5AEA2', 1.8, 1.0);
  } else {
    // -------------------------------------------------------------------------
    // EXPÉRIENCE C : REPRÉSENTATION HYBRIDE (Coupe verticale oblique stylisée)
    // Le plateau reste en vue du dessus, mais le gouffre bascule en coupe à 65° !
    // -------------------------------------------------------------------------
    ctx.fillStyle = '#020202';
    ctx.fillRect(pitX, pitY, pitW, pitH);

    const pX = s.parallaxEnabled ? Math.round(camDx * 1.8) : 0;
    const pY = s.parallaxEnabled ? Math.round(camDy * 1.4) : 0;

    // Two monumental converging vertical canyon/shaft walls plunging into an abyssal funnel
    const topL = pitX + 8;
    const topR = pitX + pitW - 8;
    const botL = pitX + pitW * 0.32 - pX * 0.4;
    const botR = pitX + pitW * 0.68 - pX * 0.4;

    // Left oblique shaft wall (charcoal rubbed stone descending vertically)
    const leftGrad = ctx.createLinearGradient(topL, pitY, botL + 20, pitY + pitH);
    leftGrad.addColorStop(0, '#2A2723');
    leftGrad.addColorStop(0.45, '#151412');
    leftGrad.addColorStop(1, '#040404');
    ctx.fillStyle = leftGrad;
    ctx.beginPath();
    ctx.moveTo(pitX, pitY);
    ctx.lineTo(topL + 36, pitY);
    ctx.lineTo(botL, pitY + pitH);
    ctx.lineTo(pitX, pitY + pitH);
    ctx.closePath();
    ctx.fill();

    // Right oblique shaft wall
    const rightGrad = ctx.createLinearGradient(topR, pitY, botR - 20, pitY + pitH);
    rightGrad.addColorStop(0, '#24221E');
    rightGrad.addColorStop(0.45, '#121110');
    rightGrad.addColorStop(1, '#040404');
    ctx.fillStyle = rightGrad;
    ctx.beginPath();
    ctx.moveTo(pitX + pitW, pitY);
    ctx.lineTo(topR - 36, pitY);
    ctx.lineTo(botR, pitY + pitH);
    ctx.lineTo(pitX + pitW, pitY + pitH);
    ctx.closePath();
    ctx.fill();

    // Vertical charcoal gestural striations along both sloped section walls
    for (let i = 0; i < 6; i++) {
      const t = i / 5;
      drawGesturalLine(
        ctx,
        pitX + 12 + t * 28,
        pitY + 4,
        pitX + 8 + t * (botL - pitX - 10),
        pitY + pitH * (0.85 - t * 0.2),
        500 + i,
        'rgba(175, 168, 158, 0.2)',
        1.1,
        2.5,
      );
      drawGesturalLine(
        ctx,
        pitX + pitW - 12 - t * 28,
        pitY + 4,
        pitX + pitW - 8 - t * (pitX + pitW - botR - 10),
        pitY + pitH * (0.85 - t * 0.2),
        520 + i,
        'rgba(165, 158, 148, 0.18)',
        1.1,
        2.5,
      );
    }

    // Étage -1 below: Cyclopean arch & giant suspended hoist cage (3x larger than goblin!)
    const archY = pitY + 95 - Math.round(pY * 0.5);
    ctx.strokeStyle = 'rgba(185, 178, 166, 0.34)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(pitX + pitW * 0.5, archY + 60, pitW * 0.36, Math.PI * 1.12, Math.PI * 1.88);
    ctx.stroke();

    // Giant hoist cage suspended on twin heavy cables
    const cageX = pitX + pitW * 0.61 - Math.round(pX * 0.6);
    const cageY = pitY + 56 - Math.round(pY * 0.6);
    drawGesturalLine(ctx, cageX + 8, pitY, cageX + 8, cageY, 540, 'rgba(195,188,176,0.45)', 1.4);
    drawGesturalLine(ctx, cageX + 34, pitY, cageX + 34, cageY, 541, 'rgba(195,188,176,0.45)', 1.4);
    ctx.fillStyle = '#181614';
    ctx.fillRect(cageX, cageY, 42, 34);
    drawGesturalLine(ctx, cageX, cageY, cageX + 42, cageY, 542, '#9A9388', 1.4);
    drawGesturalLine(ctx, cageX, cageY + 34, cageX + 42, cageY + 34, 543, '#726C63', 1.2);
    // Cage iron bars
    for (let bx = 8; bx < 40; bx += 10) {
      drawGesturalLine(ctx, cageX + bx, cageY + 2, cageX + bx, cageY + 32, 550 + bx, '#5B564F', 1);
    }

    // Étage -2 below: Miniature lower Inn hanging off the left chasm wall (warm tiny window!)
    const lowerInnX = pitX + 32 - Math.round(pX * 0.4);
    const lowerInnY = pitY + 216 - Math.round(pY * 0.3);
    ctx.fillStyle = '#1B1713';
    ctx.fillRect(lowerInnX, lowerInnY, 34, 22);
    drawGesturalLine(ctx, lowerInnX, lowerInnY, lowerInnX + 34, lowerInnY, 560, '#857B6E', 1.2);
    // Supporting diagonal wooden bracket beneath lower inn
    drawGesturalLine(ctx, lowerInnX + 4, lowerInnY + 22, lowerInnX - 10, lowerInnY + 38, 561, '#685F54', 1.4);
    // Tiny warm amber window (shows inhabited depth far below!)
    ctx.fillStyle = '#C7934F';
    ctx.fillRect(lowerInnX + 12, lowerInnY + 7, 7, 8);
    ctx.fillStyle = '#FAF3E0';
    ctx.fillRect(lowerInnX + 14, lowerInnY + 9, 3, 4);

    // Étage -3 & beyond: Fading deep arches + 2 distant white-chalk calls toward -99
    [258, 294].forEach((ay, idx) => {
      ctx.strokeStyle = `rgba(130, 124, 115, ${0.18 - idx * 0.07})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(pitX + pitW * 0.5, pitY + ay, 58 - idx * 16, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    });
    ctx.fillStyle = '#FAF8F5';
    ctx.fillRect(Math.round(pitX + pitW * 0.5), pitY + pitH - 22, 2, 2);
    ctx.fillRect(Math.round(pitX + pitW * 0.48), pitY + pitH - 9, 1, 1);
  }

  ctx.restore();

  // ===========================================================================
  // 2. GAMEPLAY LAYER (Walls, Stone Ledges, Inn Threshold, Chest Spur, Bridge)
  // ===========================================================================
  for (let ty = 0; ty < GRID_H; ty++) {
    for (let tx = 0; tx < GRID_W; tx++) {
      const kind = getSceneTile(tx, ty);
      const px = tx * T;
      const py = ty * T;

      if (kind === 'pit') {
        // Broken chalk-dusted parapet rim marking exact collision edge against the void
        if (isWalkable(tx, ty - 1)) {
          drawGesturalLine(ctx, px, py + 1, px + T, py + 1, tx * 11 + ty, '#B5AEA2', 2.2, 1.4);
        }
        if (isWalkable(tx, ty + 1)) {
          drawGesturalLine(
            ctx,
            px,
            py + T - 1,
            px + T,
            py + T - 1,
            tx * 13 + ty,
            '#B5AEA2',
            2.2,
            1.4,
          );
        }
        if (isWalkable(tx - 1, ty)) {
          drawGesturalLine(ctx, px + 1, py, px + 1, py + T, tx * 17 + ty, '#B5AEA2', 2.2, 1.4);
        }
        if (isWalkable(tx + 1, ty)) {
          drawGesturalLine(
            ctx,
            px + T - 1,
            py,
            px + T - 1,
            py + T,
            tx * 19 + ty,
            '#B5AEA2',
            2.2,
            1.4,
          );
        }
        continue;
      }

      if (kind === 'inn_window') {
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(atlas.innWindow, px, py, T, T);
        continue;
      }

      if (kind === 'wall') {
        // Pure deep charcoal wall mass with gestural mineral grain
        ctx.fillStyle = '#090908';
        ctx.fillRect(px, py, T, T);
        for (let i = 0; i < 4; i++) {
          const hx = px + 6 + hash2D(tx, ty, i) * (T - 14);
          const hy = py + 8 + hash2D(tx, ty, i + 7) * (T - 14);
          drawGesturalLine(
            ctx,
            hx,
            hy,
            hx + 10,
            hy + (hash2D(tx, ty, i + 21) - 0.5) * 6,
            tx * 23 + ty + i,
            'rgba(135, 128, 118, 0.16)',
            1.1,
            1.2,
          );
        }
        // Chipped gestural edge ONLY along sides touching walkable floors
        if (isWalkable(tx, ty + 1)) {
          drawGesturalLine(ctx, px, py + T - 1, px + T, py + T - 1, tx * 7 + ty, '#8E887D', 1.8, 1.6);
        }
        if (isWalkable(tx, ty - 1)) {
          drawGesturalLine(ctx, px, py + 1, px + T, py + 1, tx * 9 + ty, '#8E887D', 1.8, 1.6);
        }
        if (isWalkable(tx + 1, ty)) {
          drawGesturalLine(ctx, px + T - 1, py, px + T - 1, py + T, tx * 11 + ty, '#8E887D', 1.8, 1.6);
        }
        if (isWalkable(tx - 1, ty)) {
          drawGesturalLine(ctx, px + 1, py, px + 1, py + T, tx * 13 + ty, '#8E887D', 1.8, 1.6);
        }
        continue;
      }

      if (kind === 'inn') {
        ctx.fillStyle = '#2F251C';
        ctx.fillRect(px, py, T, T);
        for (let row = 12; row < T; row += 16) {
          drawGesturalLine(ctx, px, py + row, px + T, py + row, tx * 31 + row, 'rgba(18, 14, 10, 0.65)', 1.2, 0.8);
        }
        continue;
      }

      if (kind === 'bridge') {
        const sag = s.bridgeSagTimer > 0 && s.bridgeSagX === tx ? 2 : 0;
        // Shadow beneath bridge so planks clearly hover over the Pit!
        ctx.fillStyle = 'rgba(2, 2, 2, 0.65)';
        ctx.fillRect(px, py + 34 + sag, T, 10);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(atlas.bridge, px, py + sag, T, T);
        continue;
      }

      // Walkable stone floor with subtle rubbed charcoal grain
      ctx.fillStyle = '#23211E';
      ctx.fillRect(px, py, T, T);
      for (let i = 0; i < 4; i++) {
        const sx = px + 6 + hash2D(tx, ty, i + 40) * (T - 14);
        const sy = py + 8 + hash2D(tx, ty, i + 55) * (T - 14);
        drawGesturalLine(
          ctx,
          sx,
          sy,
          sx + 9,
          sy + (hash2D(tx, ty, i + 70) - 0.5) * 4,
          tx * 41 + ty + i,
          i % 2 === 0 ? 'rgba(16, 15, 14, 0.55)' : 'rgba(90, 85, 78, 0.28)',
          1.1,
          1.0,
        );
      }
    }
  }

  // Expérience B : Anchor the Level-0 Hoist Winch frame on the north wall rim (x=9, y=0/1 border)
  if (experiment === 'exp_b') {
    const wx = 9 * T + 6;
    const wy = T - 14;
    ctx.fillStyle = '#1B1814';
    ctx.fillRect(wx, wy, 36, 16);
    drawGesturalLine(ctx, wx, wy, wx + 36, wy, 480, '#C7C0B4', 1.8);
    drawGesturalLine(ctx, wx + 6, wy, wx + 6, wy + 18, 481, '#9E978B', 2);
    drawGesturalLine(ctx, wx + 30, wy, wx + 30, wy + 18, 482, '#9E978B', 2);
    // Winch drum wheel
    ctx.strokeStyle = '#D8D2C6';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(wx + 18, wy + 7, 6, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Inn hanging oil lamps
  ctx.imageSmoothingEnabled = false;
  const lampFrame =
    !s.prefersReducedMotion && Math.floor(s.ts / 280) % 2 === 0 ? atlas.innLampA : atlas.innLampB;
  ctx.drawImage(lampFrame, 1 * T + 6, 3 * T + 2, 24, 24);
  ctx.drawImage(lampFrame, 2 * T + 18, 3 * T + 2, 24, 24);

  // Boot footprints
  s.footprints.forEach((fp) => {
    const px = fp.x * T + 18;
    const py = fp.y * T + 38;
    ctx.fillStyle = fp.chalk
      ? fp.life > 2.5
        ? 'rgba(250, 248, 245, 0.85)'
        : 'rgba(180, 174, 165, 0.45)'
      : fp.life > 2
      ? 'rgba(12, 11, 10, 0.65)'
      : 'rgba(18, 16, 14, 0.35)';
    ctx.fillRect(px, py, 4, 2);
    ctx.fillRect(px + 8, py + 2, 4, 2);
  });

  // Chest
  {
    const shakePx =
      s.chestShake > 0 ? Math.round(Math.sin(s.ts * 0.08) * s.chestShake * 4) : 0;
    const cx = s.chest.x * T + shakePx;
    const cy = s.chest.y * T;
    const chestSprite =
      s.chest.state === 'open'
        ? atlas.chestOpen
        : s.chest.state === 'resisted' && s.chestShake > 0.1
        ? atlas.chestResist
        : atlas.chestLocked;
    ctx.drawImage(chestSprite, cx, cy, T, T);
  }

  // Rat Percepteur
  {
    const heroPosNow = HERO_PATROL[s.heroStepIdx];
    const heroNearRat = Math.abs(heroPosNow.x - s.rat.x) + Math.abs(heroPosNow.y - s.rat.y) <= 6;
    const hopPx =
      s.ratFlinch > 0 ? Math.round(Math.abs(Math.sin(s.ratFlinch * Math.PI * 2)) * 6) : 0;
    const shiverPx =
      heroNearRat && !s.prefersReducedMotion ? (Math.floor(s.ts / 110) % 2 === 0 ? 0 : 2) : 0;
    const rx = s.rat.x * T + shiverPx;
    const ry = s.rat.y * T - hopPx;
    const isScribbling = !s.prefersReducedMotion && Math.floor(s.ts / 550) % 4 === 0;
    const ratSprite =
      s.ratFlinch > 0.15 ? atlas.ratStartled : isScribbling ? atlas.ratScribble : atlas.ratIdle;
    ctx.drawImage(ratSprite, rx, ry, T, T);
  }

  // Blinding Hero (24x28 scaled 2x -> 48x56)
  const hx = Math.round(s.heroRenderX * T);
  const hy = Math.round(s.heroRenderY * T) - 8;
  const heroSprite =
    s.heroStepTimer > 0 && Math.floor(s.ts / 110) % 2 === 0 ? atlas.heroStride : atlas.hero;
  ctx.drawImage(heroSprite, hx, hy, T, 56);

  // Playable Goblin + Lagging Lantern
  const heroPos = HERO_PATROL[s.heroStepIdx];
  const heroDist = Math.abs(heroPos.x - s.player.x) + Math.abs(heroPos.y - s.player.y);
  const fear = heroDist <= 4 && getSceneTile(s.player.x, s.player.y) !== 'inn';
  const bobPx = s.prefersReducedMotion
    ? 0
    : Math.round(Math.abs(Math.sin(s.walkPhase)) * s.stepPulse * 4);
  const fearPx = fear && !s.prefersReducedMotion ? (Math.floor(s.ts / 85) % 2 === 0 ? -2 : 2) : 0;
  const gx = Math.round(s.renderX * T) + fearPx;
  const gy = Math.round(s.renderY * T) - bobPx;
  const isBlinking = !s.prefersReducedMotion && Math.floor(s.ts / 180) % 19 === 0;

  let goblinSprite = isBlinking ? atlas.goblinBlink : atlas.goblinIdle;
  if (fear && s.stepPulse < 0.15) goblinSprite = atlas.goblinScared;
  else if (s.stepPulse > 0.12) {
    goblinSprite = Math.sin(s.walkPhase) >= 0 ? atlas.goblinWalkA : atlas.goblinWalkB;
  }

  ctx.save();
  if (s.player.facing === -1) {
    ctx.translate(gx + T, gy);
    ctx.scale(-1, 1);
    ctx.drawImage(goblinSprite, 0, 0, T, T);
  } else {
    ctx.drawImage(goblinSprite, gx, gy, T, T);
  }
  ctx.restore();

  if (fear) {
    ctx.fillStyle = '#9E3D35';
    ctx.fillRect(gx + 22, gy - 10, 4, 8);
    ctx.fillRect(gx + 22, gy, 4, 2);
  }

  const lx = Math.round(s.lanternX * T + T * 0.5);
  const ly = Math.round(s.lanternY * T + T * 0.5);
  const handX = gx + (s.player.facing === 1 ? 30 : 16);
  const handY = gy + 24;
  drawGesturalLine(ctx, handX, handY, lx, ly - 6, 900, '#A8A298', 1.4, 0.5);
  const lanternSprite =
    !s.prefersReducedMotion && Math.floor(s.ts / 240) % 2 === 0 ? atlas.lanternA : atlas.lanternB;
  ctx.drawImage(lanternSprite, lx - 9, ly - 9, 18, 18);

  // Sparse dust motes
  s.motes.forEach((m) => {
    ctx.fillStyle = m.chalk ? '#FAF8F5' : '#8A857C';
    ctx.fillRect(Math.round((m.x + 0.5) * T), Math.round((m.y + 0.5) * T), 2, 2);
  });

  // ===========================================================================
  // 3. SELECTIVE CHARCOAL ESTOMPE LIGHTING & DIRECTIONAL INN BEAMS (non-Bayer)
  // ===========================================================================
  const maskCanvas = getLightMaskCanvas(W, H);
  const mctx = maskCanvas.getContext('2d');
  if (mctx) {
    mctx.globalCompositeOperation = 'source-over';
    mctx.clearRect(0, 0, W, H);
    mctx.fillStyle = 'rgba(3, 3, 3, 0.86)';
    mctx.fillRect(0, 0, W, H);

    mctx.globalCompositeOperation = 'destination-out';

    // Keep Grand Puits abyssal interior clearly legible even at static spawn
    mctx.fillStyle = 'rgba(0, 0, 0, 0.84)';
    mctx.fillRect(pitX + 2, pitY + 2, pitW - 4, pitH - 4);

    // Punch out soft charcoal subtraction around Goblin's lantern
    const flicker = s.prefersReducedMotion ? 0 : Math.sin(s.ts * 0.011) * 5;
    const lanternR = 160 + flicker;
    const lg = mctx.createRadialGradient(lx, ly, 16, lx, ly, lanternR);
    lg.addColorStop(0, 'rgba(0, 0, 0, 1)');
    lg.addColorStop(0.5, 'rgba(0, 0, 0, 0.72)');
    lg.addColorStop(1, 'rgba(0, 0, 0, 0)');
    mctx.fillStyle = lg;
    mctx.beginPath();
    mctx.arc(lx, ly, lanternR, 0, Math.PI * 2);
    mctx.fill();

    // Punch out warm Inn interior & threshold spill
    const innG = mctx.createRadialGradient(2 * T + 18, 4.5 * T, 24, 2 * T + 18, 4.5 * T, 148);
    innG.addColorStop(0, 'rgba(0, 0, 0, 0.96)');
    innG.addColorStop(0.55, 'rgba(0, 0, 0, 0.65)');
    innG.addColorStop(1, 'rgba(0, 0, 0, 0)');
    mctx.fillStyle = innG;
    mctx.beginPath();
    mctx.arc(2 * T + 18, 4.5 * T, 148, 0, Math.PI * 2);
    mctx.fill();

    // Punch out blinding Hero aura
    const heroG = mctx.createRadialGradient(hx + 24, hy + 28, 12, hx + 24, hy + 28, 142);
    heroG.addColorStop(0, 'rgba(0, 0, 0, 1)');
    heroG.addColorStop(0.55, 'rgba(0, 0, 0, 0.6)');
    heroG.addColorStop(1, 'rgba(0, 0, 0, 0)');
    mctx.fillStyle = heroG;
    mctx.beginPath();
    mctx.arc(hx + 24, hy + 28, 142, 0, Math.PI * 2);
    mctx.fill();

    ctx.drawImage(maskCanvas, 0, 0);
  }

  // Subtle warm lantern ivory-amber pool on ground near Goblin
  const lanternWarm = ctx.createRadialGradient(lx, ly, 4, lx, ly, 76);
  lanternWarm.addColorStop(0, 'rgba(228, 184, 118, 0.20)');
  lanternWarm.addColorStop(0.55, 'rgba(218, 166, 96, 0.07)');
  lanternWarm.addColorStop(1, 'rgba(218, 166, 96, 0)');
  ctx.fillStyle = lanternWarm;
  ctx.beginPath();
  ctx.arc(lx, ly, 76, 0, Math.PI * 2);
  ctx.fill();

  // Subtle warm directional light cones spilling RIGHTWARD out of Inn windows
  [3 * T + 24, 5 * T + 24].forEach((wy) => {
    const beam = ctx.createLinearGradient(3 * T + 38, wy, 5 * T + 36, wy);
    beam.addColorStop(0, 'rgba(218, 166, 96, 0.26)');
    beam.addColorStop(1, 'rgba(218, 166, 96, 0)');
    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.moveTo(3 * T + 38, wy - 12);
    ctx.lineTo(5 * T + 36, wy - 44);
    ctx.lineTo(5 * T + 36, wy + 44);
    ctx.lineTo(3 * T + 38, wy + 12);
    ctx.closePath();
    ctx.fill();
  });

  // Blinding Hero glare aura
  const heroGlare = ctx.createRadialGradient(hx + 24, hy + 28, 6, hx + 24, hy + 28, 92);
  heroGlare.addColorStop(0, 'rgba(250, 248, 245, 0.30)');
  heroGlare.addColorStop(0.5, 'rgba(250, 248, 245, 0.09)');
  heroGlare.addColorStop(1, 'rgba(250, 248, 245, 0)');
  ctx.fillStyle = heroGlare;
  ctx.beginPath();
  ctx.arc(hx + 24, hy + 28, 92, 0, Math.PI * 2);
  ctx.fill();

  // Tactile charcoal paper grain overlay across entire hybrid canvas
  const grain = ctx.createPattern(getCharcoalGrainCanvas(), 'repeat');
  if (grain) {
    ctx.save();
    ctx.globalAlpha = 0.82;
    ctx.fillStyle = grain;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  blitToDisplayCanvas(displayCanvas, bufCanvas, false);
}

export function renderPhaseCFrame(
  displayCanvas: HTMLCanvasElement,
  bufCanvas: HTMLCanvasElement,
  atlas: FusainPixelAtlas,
  experiment: PitExperimentId,
  variation: FusainVariationId,
  snapshot: SceneRenderSnapshot,
) {
  if (experiment === 'initial') {
    renderInitialReference(displayCanvas, bufCanvas, atlas, variation, snapshot);
  } else {
    renderHybridGesturalExperiment(displayCanvas, bufCanvas, atlas, experiment, snapshot);
  }
}
