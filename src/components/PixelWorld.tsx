import { useRef, useEffect, useCallback } from 'react';
import { useGardenStore } from '../store';
import { BIOMES } from '../types';
import type { AudioData, BiomeName, AnimationType } from '../types';

interface PixelWorldProps {
  audioData: AudioData;
}

const GRID_SIZE = 48;

interface Cell {
  type: number;
  age: number;
  variation: number;
  flash: number;
  pulseHeight: number;
  glowIntensity: number;
  x: number;
  y: number;
  layer: number;
}

interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

interface SketchMark {
  x: number;
  y: number;
  angle: number;
  length: number;
  opacity: number;
  speed: number;
}

interface Ripple {
  radius: number;
  intensity: number;
  x: number;
  y: number;
}

function getNeighbors(x: number, y: number): [number, number][] {
  const dirs = [[0,1],[0,-1],[1,0],[-1,0],[1,1],[-1,-1],[1,-1],[-1,1]];
  return dirs
    .map(([dx, dy]) => [x+dx, y+dy] as [number, number])
    .filter(([nx, ny]) => nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE);
}

function getAnimationOffset(anim: AnimationType, t: number, variation: number, kickEnergy: number, bass: number): { hOffset: number; rotOffset: number; floatOffset: number } {
  const v = variation * 10;
  const speed = t * 2 + v;
  let hOffset = 0;
  let rotOffset = 0;
  let floatOffset = 0;

  switch (anim) {
    case 'breathe':
      hOffset = Math.sin(speed) * 0.12 + kickEnergy * 0.3;
      break;
    case 'sway':
      hOffset = Math.sin(speed * 0.7) * 0.08 + kickEnergy * 0.4;
      rotOffset = Math.sin(speed * 0.5) * 0.03 + kickEnergy * 0.06;
      break;
    case 'pulse':
      hOffset = Math.sin(speed * 1.5) * 0.05 + kickEnergy * 0.35;
      break;
    case 'float':
      floatOffset = Math.sin(speed * 0.4) * 0.2 + kickEnergy * 0.2;
      break;
    case 'spin':
      rotOffset = speed * 0.1 + kickEnergy * 0.15;
      break;
    case 'ripple':
      hOffset = Math.sin(speed * 2 + bass * 3) * 0.1;
      break;
    case 'static':
      hOffset = kickEnergy * 0.25;
      break;
  }

  return { hOffset, rotOffset, floatOffset };
}

export default function PixelWorld({ audioData }: PixelWorldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gridRef = useRef<Cell[][]>([]);
  const frontierRef = useRef<Set<string>>(new Set());
  const particlesRef = useRef<Particle[]>([]);
  const ripplesRef = useRef<Ripple[]>([]);
  const sketchMarksRef = useRef<SketchMark[]>([]);
  const lastGrowRef = useRef(0);
  const timeRef = useRef(0);
  const cameraShakeRef = useRef({ x: 0, y: 0, intensity: 0 });
  const tileCacheRef = useRef<Map<string, HTMLCanvasElement>>(new Map());
  const prevKickRef = useRef(false);
  const prevSnareRef = useRef(false);
  const kickFlashRef = useRef(0);
  const totalCellsRef = useRef(0);
  const layerRef = useRef(0);
  const currentBiomeRef = useRef<BiomeName>('garden');

  const currentBiome = useGardenStore((s) => s.currentBiome);
  const worldVersion = useGardenStore((s) => s.worldVersion);
  const isPlaying = useGardenStore((s) => s.isPlaying);
  const settings = useGardenStore((s) => s.settings);

  // Init or reset grid
  useEffect(() => {
    const grid: Cell[][] = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      grid[y] = [];
      for (let x = 0; x < GRID_SIZE; x++) {
        grid[y][x] = { type: -1, age: 0, variation: Math.random(), flash: 0, pulseHeight: 0, glowIntensity: 0, x, y, layer: 0 };
      }
    }
    const cx = Math.floor(GRID_SIZE / 2);
    const cy = Math.floor(GRID_SIZE / 2);
    grid[cy][cx] = { type: 0, age: 1, variation: Math.random(), flash: 1, pulseHeight: 0, glowIntensity: 0, x: cx, y: cy, layer: 0 };

    const frontier = new Set<string>();
    getNeighbors(cx, cy).forEach(([nx, ny]) => frontier.add(`${nx},${ny}`));

    gridRef.current = grid;
    frontierRef.current = frontier;
    lastGrowRef.current = 0;
    particlesRef.current = [];
    ripplesRef.current = [];
    timeRef.current = 0;
    cameraShakeRef.current = { x: 0, y: 0, intensity: 0 };
    tileCacheRef.current.clear();
    prevKickRef.current = false;
    prevSnareRef.current = false;
    kickFlashRef.current = 0;
    totalCellsRef.current = 1;
    layerRef.current = 0;
    currentBiomeRef.current = currentBiome;

    // Generate sketch marks
    const marks: SketchMark[] = [];
    for (let i = 0; i < 60; i++) {
      marks.push({
        x: Math.random(),
        y: Math.random(),
        angle: Math.random() * Math.PI * 2,
        length: 20 + Math.random() * 60,
        opacity: 0.03 + Math.random() * 0.06,
        speed: 0.2 + Math.random() * 0.5,
      });
    }
    sketchMarksRef.current = marks;
  }, [worldVersion]); // Only reset on explicit reset, not biome switch

  // Handle biome switch: remap tiles, clear cache, keep grid
  useEffect(() => {
    if (currentBiome === currentBiomeRef.current) return;
    
    const grid = gridRef.current;
    const newTiles = BIOMES[currentBiome].tiles;
    
    // Remap existing cells to new biome tile indices
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const cell = grid[y][x];
        if (cell.type !== -1) {
          cell.type = Math.min(cell.type, newTiles.length - 1);
        }
      }
    }
    
    currentBiomeRef.current = currentBiome;
    tileCacheRef.current.clear();
  }, [currentBiome]);

  const spawnParticles = useCallback((wx: number, wy: number, wz: number, biome: BiomeName, count: number) => {
    const b = BIOMES[biome];
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        x: wx, y: wy, z: wz,
        vx: (Math.random() - 0.5) * 3,
        vy: (Math.random() - 0.5) * 3,
        vz: Math.random() * 2 + 1,
        life: 1,
        maxLife: 0.5 + Math.random() * 1.2,
        size: 1.5 + Math.random() * 2.5,
        color: b.particleColor,
      });
    }
  }, []);

  const getTileFace = useCallback((biomeName: BiomeName, typeIdx: number, face: 'top' | 'left' | 'right') => {
    const key = `${biomeName}-${typeIdx}-${face}`;
    const cache = tileCacheRef.current;
    if (cache.has(key)) return cache.get(key)!;

    const biome = BIOMES[biomeName];
    const tile = biome.tiles[typeIdx];
    if (!tile) return null;

    const size = 16;
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const ctx = c.getContext('2d')!;

    let baseColor = tile.color;
    let hlColor = tile.highlight;
    let shColor = tile.shadow;

    if (face === 'left') {
      baseColor = shColor;
      hlColor = tile.color;
      shColor = 'rgba(0,0,0,0.15)';
    } else if (face === 'right') {
      baseColor = tile.color;
      hlColor = hlColor;
      shColor = tile.shadow;
    }

    const pat = tile.pattern || [[1,1,1,1],[1,1,1,1],[1,1,1,1],[1,1,1,1]];
    const pxSize = size / 4;
    for (let py = 0; py < 4; py++) {
      for (let px = 0; px < 4; px++) {
        const val = pat[py]?.[px] ?? 1;
        if (val === 0) continue;
        let col = baseColor;
        if (val === 2) col = hlColor;
        if (val === 3) col = shColor;
        ctx.fillStyle = col;
        ctx.fillRect(px * pxSize, py * pxSize, pxSize, pxSize);
      }
    }

    cache.set(key, c);
    return c;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false })!;

    let animId: number;

    const loop = (_timestamp: number) => {
      timeRef.current += 0.016;
      const t = timeRef.current;

      const grid = gridRef.current;
      const frontier = frontierRef.current;
      const biome = BIOMES[currentBiome];
      const tiles = biome.tiles;
      const shake = cameraShakeRef.current;
      const prevKick = prevKickRef.current;
      const prevSnare = prevSnareRef.current;

      const { sensitivity, kickReactivity, snareReactivity, animationSpeed } = settings;

      // Detect edges
      const kickEdge = audioData.kick && !prevKick;
      const snareEdge = audioData.snare && !prevSnare;
      prevKickRef.current = audioData.kick;
      prevSnareRef.current = audioData.snare;

      // === KICK REACTIONS ===
      if (kickEdge) {
        shake.intensity = Math.min(shake.intensity + audioData.kickEnergy * 12 * kickReactivity, 10);
        kickFlashRef.current = Math.max(kickFlashRef.current, audioData.kickEnergy * 0.25 * kickReactivity);

        for (let y = 0; y < GRID_SIZE; y++) {
          for (let x = 0; x < GRID_SIZE; x++) {
            const cell = grid[y][x];
            if (cell.type !== -1) {
              const distFromCenter = Math.sqrt((x - GRID_SIZE/2)**2 + (y - GRID_SIZE/2)**2);
              const delay = distFromCenter * 0.02;
              cell.pulseHeight = Math.max(cell.pulseHeight, audioData.kickEnergy * kickReactivity * Math.max(0, 1 - delay * 0.2));
            }
          }
        }

        ripplesRef.current.push({ radius: 0, intensity: audioData.kickEnergy * kickReactivity, x: GRID_SIZE/2, y: GRID_SIZE/2 });
      }

      // Decay animations
      for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
          const cell = grid[y][x];
          cell.pulseHeight *= 0.88;
          cell.glowIntensity *= 0.94;
        }
      }
      kickFlashRef.current *= 0.85;

      // Update shake
      shake.intensity *= 0.88;
      shake.x = (Math.random() - 0.5) * shake.intensity;
      shake.y = (Math.random() - 0.5) * shake.intensity;

      // === GROWTH ===
      const totalEnergy = (audioData.bass * 1.5 + audioData.lowMids + audioData.highMids * 0.5 + audioData.treble * 0.3) * sensitivity;
      const growAmount = totalEnergy * 0.06;

      if (isPlaying && frontier.size > 0) {
        lastGrowRef.current += growAmount;

        // Kick burst
        const kickBurst = kickEdge ? Math.floor(2 + audioData.kickEnergy * 4 * kickReactivity) : 0;
        // Snare chunk: 5-15 cells at once
        const snareBurst = snareEdge ? Math.floor(5 + audioData.snareEnergy * 10 * snareReactivity) : 0;
        const steadyGrow = lastGrowRef.current >= 1 ? 1 : 0;
        if (lastGrowRef.current >= 1) lastGrowRef.current -= 1;

        const cellsToGrow = kickBurst + snareBurst + steadyGrow;

        for (let g = 0; g < cellsToGrow && frontier.size > 0; g++) {
          const frontierArray = Array.from(frontier);
          const key = frontierArray[Math.floor(Math.random() * frontierArray.length)];
          frontier.delete(key);

          const [fx, fy] = key.split(',').map(Number);
          const dx = fx - GRID_SIZE / 2;
          const dy = fy - GRID_SIZE / 2;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const maxDist = Math.sqrt((GRID_SIZE / 2) ** 2 * 2);
          let typeIdx = Math.floor((dist / maxDist) * tiles.length);
          typeIdx = Math.max(0, Math.min(typeIdx, tiles.length - 1));

          if (audioData.treble > 0.6 && Math.random() > 0.6) typeIdx = Math.min(typeIdx + 1, tiles.length - 1);
          if (audioData.bass > 0.8 && Math.random() > 0.7) typeIdx = Math.max(typeIdx - 1, 0);

          grid[fy][fx] = {
            type: typeIdx, age: 1, variation: Math.random(), flash: 1,
            pulseHeight: kickEdge ? audioData.kickEnergy * kickReactivity * 0.5 : 0,
            glowIntensity: 0,
            x: fx, y: fy, layer: layerRef.current,
          };
          totalCellsRef.current++;

          if (typeIdx >= 2) {
            const tile = tiles[typeIdx];
            spawnParticles(fx, fy, tile.height, currentBiome, typeIdx >= 5 ? 10 : 5);
          }

          getNeighbors(fx, fy).forEach(([nx, ny]) => {
            if (grid[ny][nx].type === -1) frontier.add(`${nx},${ny}`);
          });
        }
      }

      // === INFINITE LOOP: Auto-reset when grid is ~75% full ===
      const filledCells = totalCellsRef.current;
      const totalCells = GRID_SIZE * GRID_SIZE;
      if (filledCells > totalCells * 0.75) {
        // Reset grid but keep zoom level
        for (let y = 0; y < GRID_SIZE; y++) {
          for (let x = 0; x < GRID_SIZE; x++) {
            grid[y][x] = { type: -1, age: 0, variation: Math.random(), flash: 0, pulseHeight: 0, glowIntensity: 0, x, y, layer: layerRef.current + 1 };
          }
        }
        const cx = Math.floor(GRID_SIZE / 2);
        const cy = Math.floor(GRID_SIZE / 2);
        grid[cy][cx] = { type: 0, age: 1, variation: Math.random(), flash: 1, pulseHeight: 0, glowIntensity: 0, x: cx, y: cy, layer: layerRef.current + 1 };
        
        frontier.clear();
        getNeighbors(cx, cy).forEach(([nx, ny]) => frontier.add(`${nx},${ny}`));
        
        layerRef.current++;
        totalCellsRef.current = 1;
        lastGrowRef.current = 0;
        ripplesRef.current = [];
      }

      // Update ages
      for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
          const cell = grid[y][x];
          if (cell.type !== -1) {
            cell.age += 0.01;
            if (cell.flash > 0) cell.flash -= 0.025;
          }
        }
      }

      // Update ripples
      const ripples = ripplesRef.current;
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.radius += 0.8 * animationSpeed;
        r.intensity *= 0.95;
        if (r.intensity < 0.01) ripples.splice(i, 1);
      }

      // Update particles
      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx * 0.016;
        p.y += p.vy * 0.016;
        p.z += p.vz * 0.016;
        p.vy -= 0.5 * 0.016;
        p.life -= 0.016;
        if (p.life <= 0) particles.splice(i, 1);
      }

      // Ambient particles
      if (Math.random() < 0.04 * sensitivity) {
        particles.push({
          x: (Math.random() - 0.5) * GRID_SIZE,
          y: (Math.random() - 0.5) * GRID_SIZE,
          z: GRID_SIZE * 0.8,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          vz: -Math.random() * 0.8 - 0.3,
          life: 2 + Math.random() * 2,
          maxLife: 3,
          size: 1 + Math.random(),
          color: biome.particleColor,
        });
      }

      // === RENDER ===
      const displayW = canvas.clientWidth;
      const displayH = canvas.clientHeight;
      const dpr = Math.min(window.devicePixelRatio, 2);

      if (canvas.width !== displayW * dpr || canvas.height !== displayH * dpr) {
        canvas.width = displayW * dpr;
        canvas.height = displayH * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Sketch background
      ctx.fillStyle = biome.bgColor;
      ctx.fillRect(0, 0, displayW, displayH);

      // Subtle cross-hatch background pattern
      ctx.globalAlpha = 0.015;
      ctx.strokeStyle = biome.sketchColor;
      ctx.lineWidth = 0.5;
      const hatchSpacing = 40;
      for (let i = -displayH; i < displayW + displayH; i += hatchSpacing) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + displayH, displayH);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // Floating sketch marks
      const marks = sketchMarksRef.current;
      for (const mark of marks) {
        const mx = (mark.x * displayW + t * mark.speed * 20) % (displayW + 100) - 50 + shake.x * 0.3;
        const my = mark.y * displayH + shake.y * 0.3;
        const twinkle = Math.sin(t * mark.speed + mark.x * 10) * 0.5 + 0.5;
        ctx.globalAlpha = mark.opacity * twinkle;
        ctx.strokeStyle = biome.sketchColor;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(mx, my);
        ctx.lineTo(mx + Math.cos(mark.angle) * mark.length, my + Math.sin(mark.angle) * mark.length);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // Dynamic camera zoom: tiles shrink as world grows
      const zoomFactor = 1 / (1 + totalCellsRef.current / 150 + layerRef.current * 0.3);
      const baseTileW = Math.min(displayW / (GRID_SIZE * 1.05), displayH / (GRID_SIZE * 0.6)) * 1.0;
      const tileW = baseTileW * Math.max(0.25, zoomFactor);
      const tileH = tileW * 0.5;
      const centerX = displayW / 2 + shake.x;
      const centerY = displayH / 2 + shake.y + tileH * 2;

      // Collect visible cells
      const renderList: { cell: Cell; sx: number; sy: number }[] = [];
      for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
          const cell = grid[y][x];
          if (cell.type === -1) continue;
          const sx = (x - y) * tileW / 2 + centerX;
          const sy = (x + y) * tileH / 2 + centerY;
          renderList.push({ cell, sx, sy });
        }
      }
      renderList.sort((a, b) => {
        if (a.cell.y !== b.cell.y) return a.cell.y - b.cell.y;
        return a.cell.x - b.cell.x;
      });

      // Render cells
      for (const { cell, sx, sy } of renderList) {
        const tile = tiles[cell.type];
        if (!tile) continue;

        const anim = getAnimationOffset(tile.animation, t, cell.variation, audioData.kickEnergy * kickReactivity, audioData.bass);
        const baseH = tile.height + cell.pulseHeight;
        const h = Math.max(0, baseH + anim.hOffset);
        const hPx = h * tileH * 0.8;
        const floatY = anim.floatOffset * tileH * 0.5;

        const drawX = sx;
        const drawY = sy - hPx + floatY;

        // Layer tint (older layers get slightly desaturated)
        const layerTint = cell.layer > 0 ? 1 - (cell.layer * 0.08) : 1;

        // Side faces
        if (h > 0) {
          const leftFace = getTileFace(currentBiome, cell.type, 'left');
          const rightFace = getTileFace(currentBiome, cell.type, 'right');

          if (leftFace) {
            ctx.save();
            ctx.translate(drawX - tileW / 2, drawY);
            if (anim.rotOffset !== 0) {
              ctx.translate(0, hPx / 2);
              ctx.rotate(anim.rotOffset);
              ctx.translate(0, -hPx / 2);
            }
            ctx.transform(1, 0.5, 0, 1, 0, 0);
            ctx.globalAlpha = layerTint;
            ctx.drawImage(leftFace, 0, -hPx, tileW / 2, hPx + tileH);
            ctx.restore();
          }

          if (rightFace) {
            ctx.save();
            ctx.translate(drawX + tileW / 2, drawY);
            if (anim.rotOffset !== 0) {
              ctx.translate(0, hPx / 2);
              ctx.rotate(-anim.rotOffset);
              ctx.translate(0, -hPx / 2);
            }
            ctx.transform(1, -0.5, 0, 1, 0, 0);
            ctx.globalAlpha = layerTint;
            ctx.drawImage(rightFace, 0, -hPx, tileW / 2, hPx + tileH);
            ctx.restore();
          }
        }

        // Top face
        const topFace = getTileFace(currentBiome, cell.type, 'top');
        if (topFace) {
          ctx.save();
          ctx.translate(drawX, drawY);
          if (anim.rotOffset !== 0) {
            ctx.scale(1, 0.5);
            ctx.rotate(Math.PI / 4 + anim.rotOffset);
          } else {
            ctx.scale(1, 0.5);
            ctx.rotate(Math.PI / 4);
          }
          const s = tileW / Math.SQRT2;
          ctx.globalAlpha = layerTint;
          ctx.drawImage(topFace, -s / 2, -s / 2, s, s);
          ctx.restore();
        }

        ctx.globalAlpha = 1;

        // Sketch outline (ink line)
        ctx.strokeStyle = biome.sketchColor;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.4;
        drawIsoTileOutline(ctx, drawX, drawY, tileW, tileH);
        ctx.globalAlpha = 1;

        // Age subtle shading
        if (cell.age > 2) {
          const darken = Math.min((cell.age - 2) * 0.008, 0.06);
          ctx.fillStyle = `rgba(0,0,0,${darken})`;
          drawIsoTile(ctx, drawX, drawY, tileW, tileH);
        }

        // Flash on new growth
        if (cell.flash > 0) {
          ctx.fillStyle = `rgba(255,255,255,${cell.flash * 0.25})`;
          drawIsoTile(ctx, drawX, drawY, tileW, tileH);
        }

        // Cross-hatch shadow on side faces
        if (h > 0.5) {
          ctx.save();
          ctx.globalAlpha = 0.06;
          ctx.strokeStyle = biome.sketchColor;
          ctx.lineWidth = 0.5;
          for (let hLine = 0; hLine < hPx; hLine += 4) {
            ctx.beginPath();
            ctx.moveTo(drawX - tileW / 2, drawY - hLine);
            ctx.lineTo(drawX, drawY - hLine + tileH / 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(drawX + tileW / 2, drawY - hLine);
            ctx.lineTo(drawX, drawY - hLine + tileH / 2);
            ctx.stroke();
          }
          ctx.restore();
        }
      }

      // Render ripples
      for (const r of ripples) {
        for (let y = 0; y < GRID_SIZE; y++) {
          for (let x = 0; x < GRID_SIZE; x++) {
            const cell = grid[y][x];
            if (cell.type === -1) continue;
            const dist = Math.sqrt((x - r.x)**2 + (y - r.y)**2);
            const diff = Math.abs(dist - r.radius);
            if (diff < 2.5) {
              const sx = (x - y) * tileW / 2 + centerX;
              const sy = (x + y) * tileH / 2 + centerY;
              const intensity = r.intensity * (1 - diff / 2.5);
              ctx.fillStyle = `rgba(255,255,255,${intensity * 0.15})`;
              drawIsoTile(ctx, sx, sy, tileW * 1.05, tileH * 1.05);
            }
          }
        }
      }

      // Render particles
      for (const p of particles) {
        const psx = (p.x - p.y) * tileW / 2 + centerX;
        const psy = (p.x + p.y) * tileH / 2 + centerY - p.z * tileH * 0.8;
        const alpha = Math.max(0, p.life / p.maxLife);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        const ps = p.size;
        ctx.fillRect(psx - ps / 2, psy - ps / 2, ps, ps);
      }
      ctx.globalAlpha = 1;

      // Kick flash (subtle)
      if (kickFlashRef.current > 0.01) {
        ctx.fillStyle = `rgba(255,255,255,${kickFlashRef.current})`;
        ctx.fillRect(0, 0, displayW, displayH);
      }

      // Sketch vignette
      const vigGrad = ctx.createRadialGradient(
        displayW / 2, displayH / 2, displayW * 0.3,
        displayW / 2, displayH / 2, displayW * 0.75
      );
      vigGrad.addColorStop(0, 'rgba(0,0,0,0)');
      vigGrad.addColorStop(1, 'rgba(42,37,32,0.12)');
      ctx.fillStyle = vigGrad;
      ctx.fillRect(0, 0, displayW, displayH);

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [currentBiome, worldVersion, isPlaying, audioData, settings, spawnParticles, getTileFace]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        imageRendering: 'pixelated',
      }}
    />
  );
}

function drawIsoTile(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - h);
  ctx.lineTo(cx + w / 2, cy);
  ctx.lineTo(cx, cy + h);
  ctx.lineTo(cx - w / 2, cy);
  ctx.closePath();
  ctx.fill();
}

function drawIsoTileOutline(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - h);
  ctx.lineTo(cx + w / 2, cy);
  ctx.lineTo(cx, cy + h);
  ctx.lineTo(cx - w / 2, cy);
  ctx.closePath();
  ctx.stroke();
}
