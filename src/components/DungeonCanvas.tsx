import React, { useEffect, useRef } from 'react';
import { CONFIG } from '../game/config';
import { getVisionRadius } from '../game/engine';
import { FloorMap, GameState, MushroomColor } from '../game/types';

interface DungeonCanvasProps {
  state: GameState;
  onMove: (dx: number, dy: number) => void;
}

const MUSHROOM_HEX: Record<MushroomColor, { fill: string; spot: string }> = {
  violet: { fill: '#7C5D8E', spot: '#EDE4F2' },
  ocre: { fill: '#C87D20', spot: '#FBF1DA' },
  pale: { fill: '#D8D1C5', spot: '#575046' },
  carmin: { fill: '#B8332F', spot: '#FBE4E2' },
};

function clampCamera(center: number, viewSize: number, mapSize: number): number {
  if (mapSize <= viewSize) return 0;
  return Math.max(0, Math.min(mapSize - viewSize, Math.round(center - Math.floor(viewSize / 2))));
}

function tileHash(x: number, y: number, salt = 0): number {
  let n = Math.imul(x + 37, 374761393) + Math.imul(y + 91, 668265263) + Math.imul(salt + 13, 1442695041);
  n = (n ^ (n >>> 13)) >>> 0;
  n = Math.imul(n, 1274126177) >>> 0;
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

function drawCrosshatchedWall(
  ctx: CanvasRenderingContext2D,
  floor: FloorMap,
  x: number,
  y: number,
  px: number,
  py: number,
  tileSize: number,
  isInn: boolean,
  isRemembered: boolean,
) {
  // Base engraved rock / masonry tone
  ctx.fillStyle = isInn ? '#332C26' : isRemembered ? '#1C1916' : '#26211C';
  ctx.fillRect(px, py, tileSize, tileSize);

  // Subtle diagonal copperplate ink hatching
  ctx.save();
  ctx.beginPath();
  ctx.rect(px, py, tileSize, tileSize);
  ctx.clip();

  ctx.strokeStyle = isInn
    ? 'rgba(243, 236, 224, 0.14)'
    : isRemembered
    ? 'rgba(229, 218, 198, 0.10)'
    : 'rgba(235, 224, 204, 0.20)';
  ctx.lineWidth = Math.max(0.8, tileSize * 0.022);

  const step = Math.max(5, tileSize / 5.5);
  ctx.beginPath();
  for (let d = -tileSize; d <= tileSize * 2; d += step) {
    ctx.moveTo(px + d, py);
    ctx.lineTo(px + d - tileSize, py + tileSize);
  }
  // Secondary cross-hatch on alternating tiles for mineral depth
  if (tileHash(x, y, 2) > 0.38) {
    for (let d = -tileSize; d <= tileSize * 2; d += step * 1.4) {
      ctx.moveTo(px + d, py);
      ctx.lineTo(px + d + tileSize, py + tileSize);
    }
  }
  ctx.stroke();

  // Heavy dip-pen contour ONLY along borders touching open floor (gives hand-drawn cavern outline)
  const isOpen = (nx: number, ny: number) => {
    if (nx < 0 || ny < 0 || nx >= floor.width || ny >= floor.height) return false;
    const neighbor = floor.tiles[ny][nx];
    if (!isInn && neighbor.visibility === 'unknown') return false;
    return neighbor.kind !== 'wall';
  };

  ctx.strokeStyle = isInn ? '#171411' : isRemembered ? '#685D50' : '#120F0D';
  ctx.lineWidth = Math.max(1.8, tileSize * 0.055);
  ctx.beginPath();
  if (isOpen(x, y - 1)) {
    ctx.moveTo(px, py + 1);
    ctx.lineTo(px + tileSize, py + 1);
  }
  if (isOpen(x, y + 1)) {
    ctx.moveTo(px, py + tileSize - 1);
    ctx.lineTo(px + tileSize, py + tileSize - 1);
  }
  if (isOpen(x - 1, y)) {
    ctx.moveTo(px + 1, py);
    ctx.lineTo(px + 1, py + tileSize);
  }
  if (isOpen(x + 1, y)) {
    ctx.moveTo(px + tileSize - 1, py);
    ctx.lineTo(px + tileSize - 1, py + tileSize);
  }
  ctx.stroke();

  ctx.restore();
}

function drawGoblin(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  hasLantern: boolean,
) {
  ctx.save();
  ctx.translate(cx, cy);

  const ink = '#15120F';
  ctx.lineWidth = Math.max(1.5, size * 0.042);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // Soft ink ground shadow
  ctx.fillStyle = 'rgba(21, 18, 15, 0.28)';
  ctx.beginPath();
  ctx.ellipse(0, size * 0.27, size * 0.26, size * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();

  // Long crooked ears
  ctx.fillStyle = '#8EA66D';
  ctx.strokeStyle = ink;
  ctx.beginPath();
  ctx.moveTo(-size * 0.14, -size * 0.12);
  ctx.lineTo(-size * 0.43, -size * 0.24);
  ctx.lineTo(-size * 0.17, size * 0.02);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(size * 0.14, -size * 0.12);
  ctx.lineTo(size * 0.41, -size * 0.22);
  ctx.lineTo(size * 0.17, size * 0.02);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Hunched tattered surveyor coat
  ctx.fillStyle = '#5B5042';
  ctx.beginPath();
  ctx.roundRect(-size * 0.2, size * 0.01, size * 0.38, size * 0.26, size * 0.07);
  ctx.fill();
  ctx.stroke();

  // Ink hatch lines on coat
  ctx.beginPath();
  ctx.moveTo(-size * 0.1, size * 0.08);
  ctx.lineTo(-size * 0.02, size * 0.22);
  ctx.moveTo(size * 0.02, size * 0.08);
  ctx.lineTo(size * 0.09, size * 0.21);
  ctx.stroke();

  // Head
  ctx.fillStyle = '#9BB478';
  ctx.beginPath();
  ctx.arc(-size * 0.01, -size * 0.09, size * 0.19, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Pointed nose line
  ctx.beginPath();
  ctx.moveTo(-size * 0.02, -size * 0.08);
  ctx.lineTo(size * 0.05, -size * 0.03);
  ctx.lineTo(-size * 0.02, -size * 0.01);
  ctx.stroke();

  // Wary amber eyes
  ctx.fillStyle = '#F7D26A';
  ctx.beginPath();
  ctx.arc(-size * 0.08, -size * 0.11, size * 0.042, 0, Math.PI * 2);
  ctx.arc(size * 0.06, -size * 0.11, size * 0.042, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = ink;
  ctx.beginPath();
  ctx.arc(-size * 0.075, -size * 0.11, size * 0.018, 0, Math.PI * 2);
  ctx.arc(size * 0.065, -size * 0.11, size * 0.018, 0, Math.PI * 2);
  ctx.fill();

  // Brass hand lantern
  if (hasLantern) {
    ctx.strokeStyle = ink;
    ctx.beginPath();
    ctx.moveTo(size * 0.15, size * 0.08);
    ctx.lineTo(size * 0.27, size * 0.06);
    ctx.stroke();

    ctx.fillStyle = '#F3A833';
    ctx.beginPath();
    ctx.roundRect(size * 0.2, size * 0.06, size * 0.14, size * 0.18, 2);
    ctx.fill();
    ctx.strokeStyle = '#4A2B0D';
    ctx.stroke();
  }

  ctx.restore();
}

function drawHero(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  stunned: boolean,
) {
  ctx.save();
  ctx.translate(cx, cy);

  const ink = '#14110E';
  ctx.lineWidth = Math.max(1.5, size * 0.04);

  // Crimson wax cloak / armor silhouette
  ctx.fillStyle = stunned ? '#6B655E' : '#A62D29';
  ctx.strokeStyle = ink;
  ctx.beginPath();
  ctx.roundRect(-size * 0.23, -size * 0.1, size * 0.46, size * 0.39, size * 0.07);
  ctx.fill();
  ctx.stroke();

  // Engraved steel helm
  ctx.fillStyle = '#D5CFC4';
  ctx.beginPath();
  ctx.arc(0, -size * 0.16, size * 0.18, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Visor slit
  ctx.fillStyle = ink;
  ctx.fillRect(-size * 0.1, -size * 0.18, size * 0.2, size * 0.04);

  // Halberd & flickering torch
  ctx.strokeStyle = '#3E2D1D';
  ctx.lineWidth = Math.max(2, size * 0.055);
  ctx.beginPath();
  ctx.moveTo(size * 0.27, size * 0.24);
  ctx.lineTo(size * 0.27, -size * 0.25);
  ctx.stroke();

  if (!stunned) {
    ctx.fillStyle = '#EA580C';
    ctx.beginPath();
    ctx.arc(size * 0.27, -size * 0.28, size * 0.07, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = '#FDE047';
    ctx.strokeStyle = ink;
    ctx.font = `bold ${Math.round(size * 0.24)}px "JetBrains Mono", monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('✦', 0, -size * 0.36);
  }

  ctx.restore();
}

export const DungeonCanvas: React.FC<DungeonCanvasProps> = ({ state, onMove }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const animPosRef = useRef<{ x: number; y: number; depth: number }>({
    x: state.player.x,
    y: state.player.y,
    depth: state.depth,
  });

  const floor: FloorMap | undefined = state.floors[state.depth];
  const camX = floor ? clampCamera(state.player.x, CONFIG.VIEW_W, floor.width) : 0;
  const camY = floor ? clampCamera(state.player.y, CONFIG.VIEW_H, floor.height) : 0;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !floor) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (animPosRef.current.depth !== state.depth || prefersReducedMotion) {
      animPosRef.current = { x: state.player.x, y: state.player.y, depth: state.depth };
    }

    let rafId = 0;

    const renderFrame = (time: number) => {
      const parent = canvas.parentElement;
      const cssSize = parent ? Math.min(parent.clientWidth, 452) : 380;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      if (
        canvas.width !== Math.round(cssSize * dpr) ||
        canvas.height !== Math.round(cssSize * dpr)
      ) {
        canvas.width = Math.round(cssSize * dpr);
        canvas.height = Math.round(cssSize * dpr);
        canvas.style.width = `${cssSize}px`;
        canvas.style.height = `${cssSize}px`;
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      const dxAnim = state.player.x - animPosRef.current.x;
      const dyAnim = state.player.y - animPosRef.current.y;
      if (Math.abs(dxAnim) > 0.01 || Math.abs(dyAnim) > 0.01) {
        animPosRef.current.x += dxAnim * 0.36;
        animPosRef.current.y += dyAnim * 0.36;
      } else {
        animPosRef.current.x = state.player.x;
        animPosRef.current.y = state.player.y;
      }

      const tileSize = cssSize / CONFIG.VIEW_W;
      const isInn = floor.isInn;

      // Void background: archival cotton for Inns, deep soot ink for Dungeon abyss
      ctx.fillStyle = isInn ? '#EFE6D5' : '#0F0D0B';
      ctx.fillRect(0, 0, cssSize, cssSize);

      for (let vy = 0; vy < CONFIG.VIEW_H; vy++) {
        for (let vx = 0; vx < CONFIG.VIEW_W; vx++) {
          const x = camX + vx;
          const y = camY + vy;
          if (x >= floor.width || y >= floor.height) continue;

          const tile = floor.tiles[y][x];
          const px = vx * tileSize;
          const py = vy * tileSize;
          const cx = px + tileSize / 2;
          const cy = py + tileSize / 2;

          // Unknown fog: pitch soot with subtle surveyor drafting crosshairs
          if (!isInn && tile.visibility === 'unknown') {
            ctx.fillStyle = '#0F0D0B';
            ctx.fillRect(px, py, tileSize, tileSize);
            ctx.strokeStyle = 'rgba(235, 224, 204, 0.09)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(cx - 2.5, cy);
            ctx.lineTo(cx + 2.5, cy);
            ctx.moveTo(cx, cy - 2.5);
            ctx.lineTo(cx, cy + 2.5);
            ctx.stroke();
            continue;
          }

          const isRemembered = !isInn && tile.visibility === 'remembered';

          if (tile.kind === 'wall') {
            drawCrosshatchedWall(ctx, floor, x, y, px, py, tileSize, isInn, isRemembered);
            continue;
          }

          // Floor stone / drafting paper slabs
          const h1 = tileHash(x, y, 1);
          const h2 = tileHash(x, y, 2);
          if (isInn) {
            ctx.fillStyle = (x + y) % 2 === 0 ? '#EFE7D8' : '#F6F0E4';
          } else if (isRemembered) {
            ctx.fillStyle = (x + y) % 2 === 0 ? '#3A332B' : '#342E27';
          } else {
            ctx.fillStyle = h1 > 0.5 ? '#E6DAC4' : '#DFD2BA';
          }
          ctx.fillRect(px, py, tileSize, tileSize);

          // Hand-inked slab border & mineral stippling
          ctx.strokeStyle = isInn
            ? 'rgba(30, 27, 24, 0.14)'
            : isRemembered
            ? 'rgba(230, 218, 196, 0.12)'
            : 'rgba(30, 27, 24, 0.22)';
          ctx.lineWidth = 1;
          ctx.strokeRect(px, py, tileSize, tileSize);

          if (!isRemembered) {
            ctx.fillStyle = isInn ? 'rgba(30, 27, 24, 0.14)' : 'rgba(30, 27, 24, 0.24)';
            ctx.fillRect(px + tileSize * (0.2 + h1 * 0.5), py + tileSize * (0.25 + h2 * 0.45), 1.4, 1.4);
            ctx.fillRect(px + tileSize * (0.3 + h2 * 0.4), py + tileSize * (0.18 + h1 * 0.55), 1.2, 1.2);
            if (!isInn && h1 > 0.72) {
              ctx.strokeStyle = 'rgba(30, 27, 24, 0.18)';
              ctx.beginPath();
              ctx.moveTo(px + tileSize * 0.18, py + tileSize * 0.74);
              ctx.lineTo(px + tileSize * 0.42, py + tileSize * 0.62);
              ctx.stroke();
            }
          }

          ctx.save();
          if (isRemembered) ctx.globalAlpha = 0.55;

          if (tile.kind === 'stairs_down') {
            ctx.fillStyle = isInn ? '#B8332F' : '#C87D20';
            ctx.strokeStyle = '#15120F';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.roundRect(
              px + tileSize * 0.14,
              py + tileSize * 0.14,
              tileSize * 0.72,
              tileSize * 0.72,
              3,
            );
            ctx.fill();
            ctx.stroke();
            // Architectural stair steps
            ctx.strokeStyle = 'rgba(21, 18, 15, 0.45)';
            ctx.beginPath();
            ctx.moveTo(px + tileSize * 0.22, py + tileSize * 0.34);
            ctx.lineTo(px + tileSize * 0.78, py + tileSize * 0.34);
            ctx.moveTo(px + tileSize * 0.22, py + tileSize * 0.66);
            ctx.lineTo(px + tileSize * 0.78, py + tileSize * 0.66);
            ctx.stroke();

            ctx.fillStyle = '#F6F0E4';
            ctx.font = `bold ${Math.round(tileSize * 0.38)}px "JetBrains Mono", monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('▼', cx, cy + 1);
          } else if (tile.kind === 'stairs_up') {
            ctx.fillStyle = '#3F6B46';
            ctx.strokeStyle = '#15120F';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.roundRect(
              px + tileSize * 0.14,
              py + tileSize * 0.14,
              tileSize * 0.72,
              tileSize * 0.72,
              3,
            );
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#F6F0E4';
            ctx.font = `bold ${Math.round(tileSize * 0.38)}px "JetBrains Mono", monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('▲', cx, cy + 1);
          } else if (tile.kind === 'inn_counter') {
            ctx.fillStyle = '#8B5E34';
            ctx.fillRect(
              px + tileSize * 0.12,
              py + tileSize * 0.18,
              tileSize * 0.76,
              tileSize * 0.64,
            );
            ctx.strokeStyle = '#1E1B18';
            ctx.lineWidth = 1.6;
            ctx.strokeRect(
              px + tileSize * 0.12,
              py + tileSize * 0.18,
              tileSize * 0.76,
              tileSize * 0.64,
            );
            ctx.fillStyle = '#F6F0E4';
            ctx.font = `bold ${Math.round(tileSize * 0.23)}px "JetBrains Mono", monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('REG', cx, cy);
          } else if (tile.kind === 'inn_market') {
            ctx.fillStyle = '#C87D20';
            ctx.strokeStyle = '#1E1B18';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.roundRect(
              px + tileSize * 0.14,
              py + tileSize * 0.14,
              tileSize * 0.72,
              tileSize * 0.72,
              4,
            );
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#1E1B18';
            ctx.font = `bold ${Math.round(tileSize * 0.24)}px "JetBrains Mono", monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('OR', cx, cy);
          } else if (tile.kind === 'inn_tavern') {
            ctx.fillStyle = '#734B6D';
            ctx.strokeStyle = '#1E1B18';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(cx, cy, tileSize * 0.34, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#F6F0E4';
            ctx.font = `bold ${Math.round(tileSize * 0.23)}px "JetBrains Mono", monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('TAV', cx, cy);
          } else if (tile.kind === 'inn_bed') {
            ctx.fillStyle = '#385F7D';
            ctx.strokeStyle = '#1E1B18';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.roundRect(
              px + tileSize * 0.14,
              py + tileSize * 0.22,
              tileSize * 0.72,
              tileSize * 0.56,
              3,
            );
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#F6F0E4';
            ctx.font = `bold ${Math.round(tileSize * 0.23)}px "JetBrains Mono", monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('LIT', cx, cy);
          } else if (tile.kind === 'vault_seal') {
            ctx.fillStyle = '#B8332F';
            ctx.beginPath();
            ctx.arc(cx, cy, tileSize * 0.38, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#1E1B18';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.fillStyle = '#F6F0E4';
            ctx.font = `bold ${Math.round(tileSize * 0.25)}px "JetBrains Mono", monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('-99', cx, cy);
          }

          // Hero traces (boot scuffs or torch soot)
          if (tile.trace && (!isRemembered || tile.trace.kind === 'torch')) {
            ctx.fillStyle =
              tile.trace.kind === 'torch'
                ? 'rgba(184, 51, 47, 0.72)'
                : 'rgba(30, 27, 24, 0.36)';
            ctx.beginPath();
            ctx.arc(cx - tileSize * 0.22, cy + tileSize * 0.22, tileSize * 0.065, 0, Math.PI * 2);
            ctx.arc(cx + tileSize * 0.2, cy - tileSize * 0.2, tileSize * 0.055, 0, Math.PI * 2);
            ctx.fill();
          }

          // Hand-inked Dungeon Features
          if (tile.feature && !tile.feature.consumed && tile.feature.revealed) {
            const f = tile.feature;
            const ink = '#1A1613';
            if (f.kind === 'chest') {
              ctx.fillStyle = '#A66828';
              ctx.fillRect(
                px + tileSize * 0.2,
                py + tileSize * 0.26,
                tileSize * 0.6,
                tileSize * 0.48,
              );
              ctx.strokeStyle = ink;
              ctx.lineWidth = 1.6;
              ctx.strokeRect(
                px + tileSize * 0.2,
                py + tileSize * 0.26,
                tileSize * 0.6,
                tileSize * 0.48,
              );
              // Lid line & iron clasp
              ctx.beginPath();
              ctx.moveTo(px + tileSize * 0.2, py + tileSize * 0.44);
              ctx.lineTo(px + tileSize * 0.8, py + tileSize * 0.44);
              ctx.stroke();
              ctx.fillStyle = '#E5B454';
              ctx.fillRect(cx - 2.5, cy - 2, 5, 6);
              ctx.strokeRect(cx - 2.5, cy - 2, 5, 6);
            } else if (f.kind === 'well') {
              ctx.fillStyle = '#B8AD9B';
              ctx.strokeStyle = ink;
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.arc(cx, cy, tileSize * 0.31, 0, Math.PI * 2);
              ctx.fill();
              ctx.stroke();
              ctx.fillStyle = '#2A556E';
              ctx.beginPath();
              ctx.arc(cx, cy, tileSize * 0.18, 0, Math.PI * 2);
              ctx.fill();
              ctx.stroke();
            } else if (f.kind === 'puddle') {
              ctx.fillStyle = '#4B7B94';
              ctx.strokeStyle = ink;
              ctx.lineWidth = 1.4;
              ctx.beginPath();
              ctx.ellipse(cx, cy + 2, tileSize * 0.31, tileSize * 0.18, 0.2, 0, Math.PI * 2);
              ctx.fill();
              ctx.stroke();
            } else if (f.kind === 'mushroom') {
              const col = MUSHROOM_HEX[f.mushroomColor ?? 'ocre'];
              ctx.strokeStyle = ink;
              ctx.lineWidth = 1.4;
              ctx.fillStyle = '#EFE7D8';
              ctx.fillRect(cx - tileSize * 0.08, cy, tileSize * 0.16, tileSize * 0.24);
              ctx.strokeRect(cx - tileSize * 0.08, cy, tileSize * 0.16, tileSize * 0.24);
              ctx.fillStyle = col.fill;
              ctx.beginPath();
              ctx.arc(cx, cy, tileSize * 0.24, Math.PI, 0);
              ctx.closePath();
              ctx.fill();
              ctx.stroke();
              ctx.fillStyle = col.spot;
              ctx.beginPath();
              ctx.arc(cx - tileSize * 0.08, cy - tileSize * 0.09, tileSize * 0.04, 0, Math.PI * 2);
              ctx.arc(cx + tileSize * 0.08, cy - tileSize * 0.07, tileSize * 0.032, 0, Math.PI * 2);
              ctx.fill();
            } else if (f.kind === 'corpse') {
              ctx.strokeStyle = ink;
              ctx.lineWidth = 1.8;
              ctx.beginPath();
              ctx.moveTo(cx - tileSize * 0.22, cy + tileSize * 0.18);
              ctx.lineTo(cx + tileSize * 0.22, cy - tileSize * 0.1);
              ctx.stroke();
              ctx.fillStyle = '#E6DEC8';
              ctx.beginPath();
              ctx.arc(cx - tileSize * 0.14, cy - tileSize * 0.12, tileSize * 0.12, 0, Math.PI * 2);
              ctx.fill();
              ctx.stroke();
            } else if (f.kind === 'trap' || f.kind === 'placed_trap') {
              ctx.strokeStyle = f.kind === 'placed_trap' ? '#C87D20' : '#B8332F';
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.moveTo(cx - tileSize * 0.2, cy - tileSize * 0.2);
              ctx.lineTo(cx + tileSize * 0.2, cy + tileSize * 0.2);
              ctx.moveTo(cx + tileSize * 0.2, cy - tileSize * 0.2);
              ctx.lineTo(cx - tileSize * 0.2, cy + tileSize * 0.2);
              ctx.stroke();
              ctx.strokeRect(
                cx - tileSize * 0.22,
                cy - tileSize * 0.22,
                tileSize * 0.44,
                tileSize * 0.44,
              );
            }
          }

          ctx.restore();

          // Chalk Surveyor Marker (always crisp on the slab, even in remembered fog)
          if (tile.marker) {
            ctx.save();
            ctx.globalAlpha = isRemembered ? 0.92 : 1;
            ctx.fillStyle = '#F7F1E3';
            ctx.strokeStyle = '#B8332F';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.roundRect(
              px + tileSize * 0.1,
              py + tileSize * 0.1,
              tileSize * 0.4,
              tileSize * 0.3,
              2,
            );
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#B8332F';
            ctx.font = `bold ${Math.round(tileSize * 0.21)}px "JetBrains Mono", monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('⚑', px + tileSize * 0.3, py + tileSize * 0.26);
            ctx.restore();
          }
        }
      }

      // Draw NPCs within viewport (engraved wax tokens)
      for (const npc of floor.npcs) {
        if (npc.fled || npc.recruited) continue;
        if (
          npc.x < camX ||
          npc.x >= camX + CONFIG.VIEW_W ||
          npc.y < camY ||
          npc.y >= camY + CONFIG.VIEW_H
        ) {
          continue;
        }
        const tile = floor.tiles[npc.y][npc.x];
        if (!isInn && tile.visibility !== 'visible') continue;

        const cx = (npc.x - camX) * tileSize + tileSize / 2;
        const cy = (npc.y - camY) * tileSize + tileSize / 2;
        ctx.save();
        ctx.fillStyle =
          npc.kind === 'rat_percepteur'
            ? '#B5ABA0'
            : npc.kind === 'squelette_concierge'
            ? '#F3ECE0'
            : '#7FA37C';
        ctx.strokeStyle = '#15120F';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(cx, cy, tileSize * 0.28, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#15120F';
        ctx.font = `bold ${Math.round(tileSize * 0.29)}px "JetBrains Mono", monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const glyph =
          npc.kind === 'rat_percepteur' ? 'R' : npc.kind === 'squelette_concierge' ? 'S' : 'G';
        ctx.fillText(glyph, cx, cy + 1);
        ctx.restore();
      }

      // Draw active Hero or menacing distant torchlight in corridor
      if (!isInn && floor.hero && floor.hero.status === 'active') {
        const h = floor.hero;
        if (
          h.x >= camX &&
          h.x < camX + CONFIG.VIEW_W &&
          h.y >= camY &&
          h.y < camY + CONFIG.VIEW_H
        ) {
          const hTile = floor.tiles[h.y][h.x];
          const hx = (h.x - camX) * tileSize + tileSize / 2;
          const hy = (h.y - camY) * tileSize + tileSize / 2;
          if (hTile.visibility === 'visible') {
            drawHero(ctx, hx, hy, tileSize, h.stunTurns > 0);
          } else {
            const pulse = prefersReducedMotion ? 0.42 : 0.28 + 0.16 * Math.sin(time * 0.008);
            const torchGrad = ctx.createRadialGradient(hx, hy, 2, hx, hy, tileSize * 0.7);
            torchGrad.addColorStop(0, `rgba(217, 95, 32, ${pulse + 0.2})`);
            torchGrad.addColorStop(1, 'rgba(217, 95, 32, 0)');
            ctx.fillStyle = torchGrad;
            ctx.beginPath();
            ctx.arc(hx, hy, tileSize * 0.7, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // Sepia & Amber Lantern Wash Overlay centered on goblin
      const gx = (animPosRef.current.x - camX) * tileSize + tileSize / 2;
      const gy = (animPosRef.current.y - camY) * tileSize + tileSize / 2;

      if (!isInn) {
        const radiusTiles = getVisionRadius(state.resources.oil);
        const flicker = prefersReducedMotion ? 0 : Math.sin(time * 0.007) * 2.2;
        const outerR = Math.max(tileSize * 1.15, radiusTiles * tileSize + flicker);

        const grad = ctx.createRadialGradient(gx, gy, tileSize * 0.25, gx, gy, outerR * 1.15);
        if (state.resources.oil > 0) {
          grad.addColorStop(0, 'rgba(227, 154, 48, 0.22)');
          grad.addColorStop(0.55, 'rgba(196, 128, 42, 0.08)');
          grad.addColorStop(1, 'rgba(15, 13, 11, 0.46)');
        } else {
          grad.addColorStop(0, 'rgba(243, 236, 224, 0.04)');
          grad.addColorStop(1, 'rgba(15, 13, 11, 0.72)');
        }
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, cssSize, cssSize);

        // Subtle surveyor range ring
        if (state.resources.oil > 0) {
          ctx.save();
          ctx.setLineDash([3, 4]);
          ctx.strokeStyle = 'rgba(138, 79, 20, 0.28)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(gx, gy, outerR * 0.92, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      }

      if (state.hallucinationTurns > 0) {
        ctx.fillStyle = 'rgba(124, 93, 142, 0.14)';
        ctx.fillRect(0, 0, cssSize, cssSize);
      }

      drawGoblin(ctx, gx, gy, tileSize, state.resources.oil > 0);

      if (state.ally) {
        ctx.fillStyle = '#C87D20';
        ctx.strokeStyle = '#15120F';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(gx - tileSize * 0.32, gy + tileSize * 0.28, tileSize * 0.12, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      // Survey map edge scroll ticks when floor extends past 9x9 camera
      if (floor.width > CONFIG.VIEW_W || floor.height > CONFIG.VIEW_H) {
        ctx.fillStyle = 'rgba(200, 125, 32, 0.65)';
        if (camX > 0) ctx.fillRect(0, cssSize * 0.4, 3, cssSize * 0.2);
        if (camX + CONFIG.VIEW_W < floor.width)
          ctx.fillRect(cssSize - 3, cssSize * 0.4, 3, cssSize * 0.2);
        if (camY > 0) ctx.fillRect(cssSize * 0.4, 0, cssSize * 0.2, 3);
        if (camY + CONFIG.VIEW_H < floor.height)
          ctx.fillRect(cssSize * 0.4, cssSize - 3, cssSize * 0.2, 3);
      }

      ctx.restore();

      if (
        !prefersReducedMotion &&
        (Math.abs(state.player.x - animPosRef.current.x) > 0.01 ||
          Math.abs(state.player.y - animPosRef.current.y) > 0.01 ||
          (!isInn && state.resources.oil > 0))
      ) {
        rafId = requestAnimationFrame(renderFrame);
      }
    };

    rafId = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(rafId);
  }, [state, floor, camX, camY]);

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length !== 1) return;
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!touchStartRef.current || e.changedTouches.length !== 1) return;
    const end = {
      x: e.changedTouches[0].clientX,
      y: e.changedTouches[0].clientY,
    };
    const dx = end.x - touchStartRef.current.x;
    const dy = end.y - touchStartRef.current.y;
    touchStartRef.current = null;

    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    if (Math.max(absX, absY) >= 24) {
      if (absX > absY) {
        onMove(dx > 0 ? 1 : -1, 0);
      } else {
        onMove(0, dy > 0 ? 1 : -1);
      }
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const vx = Math.floor(((e.clientX - rect.left) / rect.width) * CONFIG.VIEW_W);
    const vy = Math.floor(((e.clientY - rect.top) / rect.height) * CONFIG.VIEW_H);
    const mapX = camX + vx;
    const mapY = camY + vy;
    const dx = mapX - state.player.x;
    const dy = mapY - state.player.y;
    if (Math.abs(dx) + Math.abs(dy) === 1) {
      onMove(dx, dy);
    }
  };

  const isInn = floor?.isInn ?? false;
  const currentTile = floor?.tiles[state.player.y]?.[state.player.x];

  return (
    <div className="flex w-full max-w-[476px] flex-col gap-2">
      {/* Archival Survey Mat Frame */}
      <div
        className={`archival-ledger relative flex flex-col items-center justify-center rounded-sm p-2.5 transition-colors ${
          state.lastMovementBlocked ? 'ring-2 ring-[#B8332F]' : ''
        }`}
      >
        <div className="mb-1.5 flex w-full items-center justify-between px-1 text-[11px] font-mono-num text-[#574D43]">
          <span>
            PLAN {floor?.isInn ? 'REFUGE' : 'GALERIE'} · ÉT. {state.depth}
          </span>
          <span>
            POS ({state.player.x}, {state.player.y}) / {floor?.width ?? 9}×{floor?.height ?? 9}
          </span>
        </div>

        <div className="w-full border border-[#231F1B] bg-[#0F0D0B]">
          <canvas
            ref={canvasRef}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onClick={handleClick}
            className="block touch-none select-none cursor-pointer"
            aria-label="Grille d'exploration du donjon et des auberges"
          />
        </div>
      </div>

      {currentTile?.marker && (
        <div className="paper-surface flex items-center justify-between gap-2 rounded-sm border border-[#231F1B]/45 px-3 py-1.5 text-xs">
          <span className="font-semibold text-[#1E1B18]">
            Repère à la craie : « {currentTile.marker.text} »
          </span>
          <span className="font-mono-num text-[11px] text-[#574D43]">
            T{currentTile.marker.createdTurn}
          </span>
        </div>
      )}
    </div>
  );
};
