import { useRef, useEffect, useCallback } from 'react';
import { useGardenStore } from '../store';
import { BIOMES } from '../types';
import type { AudioData, BiomeName } from '../types';

interface PixelWorldProps {
  audioData: AudioData;
}

const GRID_SIZE = 48;

interface Cell {
  type: number;
  age: number;
  variation: number;
  flash: number;
  x: number;
  y: number;
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

interface Camera {
  x: number;
  y: number;
  zoom: number;
  shakeX: number;
  shakeY: number;
  shakeIntensity: number;
}

function getNeighbors(x: number, y: number): [number, number][] {
  const dirs = [[0,1],[0,-1],[1,0],[-1,0],[1,1],[-1,-1],[1,-1],[-1,1]];
  return dirs
    .map(([dx, dy]) => [x+dx, y+dy] as [number, number])
    .filter(([nx, ny]) => nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE);
}

export default function PixelWorld({ audioData }: PixelWorldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gridRef = useRef<Cell[][]>([]);
  const frontierRef = useRef<Set<string>>(new Set());
  const particlesRef = useRef<Particle[]>([]);
  const lastGrowRef = useRef(0);
  const timeRef = useRef(0);
  const cameraRef = useRef<Camera>({ x: 0, y: 0, zoom: 1, shakeX: 0, shakeY: 0, shakeIntensity: 0 });
  const tileCacheRef = useRef<Map<string, HTMLCanvasElement>>(new Map());

  const currentBiome = useGardenStore((s) => s.currentBiome);
  const isPlaying = useGardenStore((s) => s.isPlaying);
  const sensitivity = useGardenStore((s) => s.settings.sensitivity);

  // Initialize grid
  useEffect(() => {
    const grid: Cell[][] = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      grid[y] = [];
      for (let x = 0; x < GRID_SIZE; x++) {
        grid[y][x] = { type: -1, age: 0, variation: Math.random(), flash: 0, x, y };
      }
    }
    const cx = Math.floor(GRID_SIZE / 2);
    const cy = Math.floor(GRID_SIZE / 2);
    grid[cy][cx] = { type: 0, age: 1, variation: Math.random(), flash: 1, x: cx, y: cy };

    const frontier = new Set<string>();
    getNeighbors(cx, cy).forEach(([nx, ny]) => frontier.add(`${nx},${ny}`));

    gridRef.current = grid;
    frontierRef.current = frontier;
    lastGrowRef.current = 0;
    particlesRef.current = [];
    timeRef.current = 0;
    cameraRef.current = { x: 0, y: 0, zoom: 1, shakeX: 0, shakeY: 0, shakeIntensity: 0 };
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

  // Pre-render a tile face to offscreen canvas
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

    // Face-specific lighting
    if (face === 'left') {
      baseColor = shColor;
      hlColor = tile.color;
      shColor = '#00000022';
    } else if (face === 'right') {
      baseColor = tile.color;
      hlColor = hlColor;
      shColor = tile.shadow;
    }

    // Draw pixel pattern
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
      const camera = cameraRef.current;

      // === BEAT & GROWTH ===
      const beat = (audioData as any).beat === true;
      const totalEnergy = (audioData.bass * 1.5 + audioData.lowMids + audioData.highMids * 0.5 + audioData.treble * 0.3) * sensitivity;
      const growAmount = totalEnergy * 0.12;

      if (beat) {
        camera.shakeIntensity = Math.min(camera.shakeIntensity + audioData.bass * 8, 6);
      }
      camera.shakeIntensity *= 0.92;
      camera.shakeX = (Math.random() - 0.5) * camera.shakeIntensity;
      camera.shakeY = (Math.random() - 0.5) * camera.shakeIntensity;

      if (isPlaying && frontier.size > 0) {
        lastGrowRef.current += growAmount;

        // Beat burst: grow extra cells on strong beats
        const burstCount = beat ? Math.floor(2 + audioData.bass * 4) : 0;
        const cellsToGrow = burstCount + (lastGrowRef.current >= 1 ? 1 : 0);
        if (lastGrowRef.current >= 1) lastGrowRef.current -= 1;

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
            type: typeIdx, age: 1, variation: Math.random(), flash: 1, x: fx, y: fy,
          };

          if (typeIdx >= 2) {
            const tile = tiles[typeIdx];
            spawnParticles(fx, fy, tile.height, currentBiome, typeIdx >= 4 ? 8 : 4);
          }

          getNeighbors(fx, fy).forEach(([nx, ny]) => {
            if (grid[ny][nx].type === -1) frontier.add(`${nx},${ny}`);
          });
        }
      }

      // Update cells
      for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
          const cell = grid[y][x];
          if (cell.type !== -1) {
            cell.age += 0.01;
            if (cell.flash > 0) cell.flash -= 0.025;
          }
        }
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
      if (Math.random() < 0.08 * sensitivity) {
        const b = BIOMES[currentBiome];
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
          color: b.particleColor,
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

      // Background with frequency-reactive colour shifts
      const skyGrad = ctx.createLinearGradient(0, 0, 0, displayH);
      const bassWarmth = Math.floor(audioData.bass * 30);
      const trebleCool = Math.floor(audioData.treble * 20);
      skyGrad.addColorStop(0, shiftColor(biome.skyGradient[0], bassWarmth, 0, -trebleCool));
      skyGrad.addColorStop(0.5, shiftColor(biome.skyGradient[1], bassWarmth * 0.5, 0, -trebleCool * 0.5));
      skyGrad.addColorStop(1, shiftColor(biome.skyGradient[2], 0, 0, -trebleCool));
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, displayW, displayH);

      // Calculate isometric projection parameters
      // Fit the diamond grid into the viewport
      const diamondW = GRID_SIZE;
      const diamondH = GRID_SIZE;
      const tileW = Math.min(displayW / (diamondW * 1.05), displayH / (diamondH * 0.6)) * camera.zoom;
      const tileH = tileW * 0.5;
      const centerX = displayW / 2 + camera.shakeX;
      const centerY = displayH / 2 + camera.shakeY + tileH * 2;

      // Collect visible cells and sort back-to-front
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

      // Sort back-to-front (lower y first, then lower x)
      renderList.sort((a, b) => {
        if (a.cell.y !== b.cell.y) return a.cell.y - b.cell.y;
        return a.cell.x - b.cell.x;
      });

      // Render cells
      for (const { cell, sx, sy } of renderList) {
        const tile = tiles[cell.type];
        if (!tile) continue;
        const h = tile.height;
        const hPx = h * tileH * 0.8;

        // Side faces (left and right)
        if (h > 0) {
          const leftFace = getTileFace(currentBiome, cell.type, 'left');
          const rightFace = getTileFace(currentBiome, cell.type, 'right');

          if (leftFace) {
            ctx.save();
            ctx.translate(sx - tileW / 2, sy);
            ctx.transform(1, 0.5, 0, 1, 0, 0);
            ctx.drawImage(leftFace, 0, -hPx, tileW / 2, hPx + tileH);
            ctx.restore();
          }

          if (rightFace) {
            ctx.save();
            ctx.translate(sx + tileW / 2, sy);
            ctx.transform(1, -0.5, 0, 1, 0, 0);
            ctx.drawImage(rightFace, 0, -hPx, tileW / 2, hPx + tileH);
            ctx.restore();
          }
        }

        // Top face
        const topFace = getTileFace(currentBiome, cell.type, 'top');
        if (topFace) {
          ctx.save();
          ctx.translate(sx, sy - hPx);
          ctx.scale(1, 0.5);
          ctx.rotate(Math.PI / 4);
          const s = tileW / Math.SQRT2;
          ctx.drawImage(topFace, -s / 2, -s / 2, s, s);
          ctx.restore();
        }

        // Age darkening
        if (cell.age > 2) {
          const darken = Math.min((cell.age - 2) * 0.012, 0.1);
          ctx.fillStyle = `rgba(0,0,0,${darken})`;
          drawIsoTile(ctx, sx, sy - hPx, tileW, tileH);
        }

        // Flash on new growth
        if (cell.flash > 0) {
          ctx.fillStyle = `rgba(255,255,255,${cell.flash * 0.35})`;
          drawIsoTile(ctx, sx, sy - hPx, tileW, tileH);
        }

        // Glow for special tiles
        if (tile.glow && cell.age > 0.5) {
          const bloom = useGardenStore.getState().settings.bloom;
          const pulse = Math.sin(t * 3 + cell.variation * 10) * 0.3 + 0.7;
          ctx.shadowColor = tile.glow;
          ctx.shadowBlur = 12 * pulse * bloom;
          ctx.fillStyle = tile.glow;
          ctx.globalAlpha = 0.12 * pulse;
          drawIsoTile(ctx, sx, sy - hPx, tileW * 1.1, tileH * 1.1);
          ctx.globalAlpha = 1;
          ctx.shadowBlur = 0;
        }
      }

      // Render particles in world space
      for (const p of particles) {
        const psx = (p.x - p.y) * tileW / 2 + centerX;
        const psy = (p.x + p.y) * tileH / 2 + centerY - p.z * tileH * 0.8;
        const alpha = Math.max(0, p.life / p.maxLife);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        const ps = p.size * camera.zoom;
        ctx.fillRect(psx - ps / 2, psy - ps / 2, ps, ps);
      }
      ctx.globalAlpha = 1;

      // Beat flash overlay
      if (beat) {
        ctx.fillStyle = `rgba(255,255,255,${audioData.bass * 0.08})`;
        ctx.fillRect(0, 0, displayW, displayH);
      }

      // Vignette
      const vigGrad = ctx.createRadialGradient(
        displayW / 2, displayH / 2, displayW * 0.25,
        displayW / 2, displayH / 2, displayW * 0.7
      );
      vigGrad.addColorStop(0, 'rgba(0,0,0,0)');
      vigGrad.addColorStop(1, 'rgba(0,0,0,0.45)');
      ctx.fillStyle = vigGrad;
      ctx.fillRect(0, 0, displayW, displayH);

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [currentBiome, isPlaying, audioData, sensitivity, spawnParticles, getTileFace]);

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

function shiftColor(hex: string, rShift: number, gShift: number, bShift: number): string {
  const num = parseInt(hex.slice(1), 16);
  let r = Math.max(0, Math.min(255, (num >> 16) + rShift));
  let g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + gShift));
  let b = Math.max(0, Math.min(255, (num & 0xff) + bShift));
  return `rgb(${r},${g},${b})`;
}
