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
  pulseHeight: number;
  glowIntensity: number;
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

export default function PixelWorld({ audioData }: PixelWorldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gridRef = useRef<Cell[][]>([]);
  const frontierRef = useRef<Set<string>>(new Set());
  const particlesRef = useRef<Particle[]>([]);
  const ripplesRef = useRef<Ripple[]>([]);
  const lastGrowRef = useRef(0);
  const timeRef = useRef(0);
  const cameraShakeRef = useRef({ x: 0, y: 0, intensity: 0 });
  const tileCacheRef = useRef<Map<string, HTMLCanvasElement>>(new Map());

  const currentBiome = useGardenStore((s) => s.currentBiome);
  const isPlaying = useGardenStore((s) => s.isPlaying);
  const settings = useGardenStore((s) => s.settings);

  // Init grid
  useEffect(() => {
    const grid: Cell[][] = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      grid[y] = [];
      for (let x = 0; x < GRID_SIZE; x++) {
        grid[y][x] = { type: -1, age: 0, variation: Math.random(), flash: 0, pulseHeight: 0, glowIntensity: 0, x, y };
      }
    }
    const cx = Math.floor(GRID_SIZE / 2);
    const cy = Math.floor(GRID_SIZE / 2);
    grid[cy][cx] = { type: 0, age: 1, variation: Math.random(), flash: 1, pulseHeight: 0, glowIntensity: 0, x: cx, y: cy };

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
      shColor = '#00000022';
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

      const { sensitivity, kickReactivity, snareReactivity, animationSpeed } = settings;

      // === BEAT REACTIONS ===
      if (audioData.kick) {
        shake.intensity = Math.min(shake.intensity + audioData.kickEnergy * 10 * kickReactivity, 8);
        // Pulse all existing cells
        for (let y = 0; y < GRID_SIZE; y++) {
          for (let x = 0; x < GRID_SIZE; x++) {
            const cell = grid[y][x];
            if (cell.type !== -1) {
              const distFromCenter = Math.sqrt((x - GRID_SIZE/2)**2 + (y - GRID_SIZE/2)**2);
              const delay = distFromCenter * 0.03;
              cell.pulseHeight = Math.max(cell.pulseHeight, audioData.kickEnergy * kickReactivity * (1 - delay * 0.1));
            }
          }
        }
        // Spawn ripple
        ripplesRef.current.push({ radius: 0, intensity: audioData.kickEnergy * kickReactivity, x: GRID_SIZE/2, y: GRID_SIZE/2 });
      }

      if (audioData.snare) {
        // Glow burst on all cells
        for (let y = 0; y < GRID_SIZE; y++) {
          for (let x = 0; x < GRID_SIZE; x++) {
            const cell = grid[y][x];
            if (cell.type !== -1) {
              cell.glowIntensity = Math.max(cell.glowIntensity, audioData.snareEnergy * snareReactivity);
            }
          }
        }
      }

      // Decay animations
      for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
          const cell = grid[y][x];
          cell.pulseHeight *= 0.92;
          cell.glowIntensity *= 0.94;
        }
      }

      // Update camera shake
      shake.intensity *= 0.9;
      shake.x = (Math.random() - 0.5) * shake.intensity;
      shake.y = (Math.random() - 0.5) * shake.intensity;

      // === GROWTH ===
      const totalEnergy = (audioData.bass * 1.5 + audioData.lowMids + audioData.highMids * 0.5 + audioData.treble * 0.3) * sensitivity;
      const growAmount = totalEnergy * 0.1;

      if (isPlaying && frontier.size > 0) {
        lastGrowRef.current += growAmount;

        const burstCount = audioData.kick ? Math.floor(2 + audioData.kickEnergy * 5 * kickReactivity) : 0;
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
            type: typeIdx, age: 1, variation: Math.random(), flash: 1,
            pulseHeight: audioData.kick ? audioData.kickEnergy * kickReactivity * 0.5 : 0,
            glowIntensity: audioData.snare ? audioData.snareEnergy * snareReactivity * 0.5 : 0,
            x: fx, y: fy,
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

      // Update cell ages
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

      // Sky with frequency reactivity
      const skyGrad = ctx.createLinearGradient(0, 0, 0, displayH);
      const bassWarmth = Math.floor(audioData.bass * 30);
      const trebleCool = Math.floor(audioData.treble * 20);
      skyGrad.addColorStop(0, shiftColor(biome.skyGradient[0], bassWarmth, 0, -trebleCool));
      skyGrad.addColorStop(0.5, shiftColor(biome.skyGradient[1], bassWarmth * 0.5, 0, -trebleCool * 0.5));
      skyGrad.addColorStop(1, shiftColor(biome.skyGradient[2], 0, 0, -trebleCool));
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, displayW, displayH);

      // Isometric projection
      const diamondW = GRID_SIZE;
      const tileW = Math.min(displayW / (diamondW * 1.05), displayH / (diamondW * 0.6)) * 1.0;
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

        // Animated height: base + pulse + idle breathing
        const idleBreath = Math.sin(t * 2 * animationSpeed + cell.variation * 10) * 0.15;
        const h = tile.height + cell.pulseHeight + idleBreath * (tile.height > 0 ? 1 : 0);
        const hPx = Math.max(0, h * tileH * 0.8);

        // Side faces
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

        // Glow with animation reactivity
        if ((tile.glow || cell.glowIntensity > 0.05) && cell.age > 0.3) {
          const bloom = settings.bloom;
          const idlePulse = Math.sin(t * 3 * animationSpeed + cell.variation * 10) * 0.3 + 0.7;
          const totalGlow = Math.max(idlePulse * 0.3, cell.glowIntensity);
          ctx.shadowColor = tile.glow || biome.accentColor;
          ctx.shadowBlur = 12 * totalGlow * bloom;
          ctx.fillStyle = tile.glow || biome.accentColor;
          ctx.globalAlpha = 0.12 * totalGlow;
          drawIsoTile(ctx, sx, sy - hPx, tileW * 1.1, tileH * 1.1);
          ctx.globalAlpha = 1;
          ctx.shadowBlur = 0;
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
              ctx.fillStyle = `rgba(255,255,255,${intensity * 0.3})`;
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

      // Kick flash overlay
      if (audioData.kick) {
        ctx.fillStyle = `rgba(255,255,255,${audioData.kickEnergy * 0.06})`;
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
  }, [currentBiome, isPlaying, audioData, settings, spawnParticles, getTileFace]);

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
