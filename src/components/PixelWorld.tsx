import { useRef, useEffect, useCallback } from 'react';
import { useGardenStore } from '../store';
import { BIOMES } from '../types';
import type { AudioData, BiomeName } from '../types';

interface PixelWorldProps {
  audioData: AudioData;
}

const GRID_W = 72;
const GRID_H = 72;
const TILE_SIZE = 8; // pixels per tile on the source canvas

interface Cell {
  type: number; // index into biome tiles, -1 = void
  age: number;
  variation: number;
  flash: number; // 0-1 brightness flash when newly grown
  x: number;
  y: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

function getNeighbors(x: number, y: number): [number, number][] {
  const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [-1, -1], [1, -1], [-1, 1]];
  return dirs
    .map(([dx, dy]) => [x + dx, y + dy] as [number, number])
    .filter(([nx, ny]) => nx >= 0 && nx < GRID_W && ny >= 0 && ny < GRID_H);
}

export default function PixelWorld({ audioData }: PixelWorldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gridRef = useRef<Cell[][]>([]);
  const frontierRef = useRef<Set<string>>(new Set());
  const grownCountRef = useRef(0);
  const particlesRef = useRef<Particle[]>([]);
  const lastGrowRef = useRef(0);
  const timeRef = useRef(0);

  const currentBiome = useGardenStore((s) => s.currentBiome);
  const isPlaying = useGardenStore((s) => s.isPlaying);
  const sensitivity = useGardenStore((s) => s.settings.sensitivity);

  // Initialize or reset grid when biome changes
  useEffect(() => {
    const grid: Cell[][] = [];
    for (let y = 0; y < GRID_H; y++) {
      grid[y] = [];
      for (let x = 0; x < GRID_W; x++) {
        grid[y][x] = { type: -1, age: 0, variation: Math.random(), flash: 0, x, y };
      }
    }

    // Seed: center cell
    const cx = Math.floor(GRID_W / 2);
    const cy = Math.floor(GRID_H / 2);
    grid[cy][cx] = { type: 0, age: 1, variation: Math.random(), flash: 1, x: cx, y: cy };

    const frontier = new Set<string>();
    getNeighbors(cx, cy).forEach(([nx, ny]) => {
      frontier.add(`${nx},${ny}`);
    });

    gridRef.current = grid;
    frontierRef.current = frontier;
    grownCountRef.current = 1;
    particlesRef.current = [];
    lastGrowRef.current = 0;
    timeRef.current = 0;
  }, [currentBiome]);

  const spawnParticles = useCallback((x: number, y: number, biome: BiomeName, count: number) => {
    const b = BIOMES[biome];
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        x: x * TILE_SIZE + TILE_SIZE / 2,
        y: y * TILE_SIZE + TILE_SIZE / 2,
        vx: (Math.random() - 0.5) * 2,
        vy: -Math.random() * 2 - 0.5,
        life: 1,
        maxLife: 0.5 + Math.random() * 1,
        size: 1 + Math.random() * 2,
        color: b.particleColor,
      });
    }
  }, []);

  // Main game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false })!;

    let animId: number;

    const loop = (_timestamp: number) => {
      timeRef.current += 0.016;

      const grid = gridRef.current;
      const frontier = frontierRef.current;
      const biome = BIOMES[currentBiome];
      const tiles = biome.tiles;

      // === GROWTH ===
      if (isPlaying && frontier.size > 0) {
        const totalEnergy = (audioData.bass * 1.5 + audioData.lowMids + audioData.highMids * 0.5 + audioData.treble * 0.3) * sensitivity;
        const growAmount = totalEnergy * 0.15;

        lastGrowRef.current += growAmount;

        while (lastGrowRef.current >= 1 && frontier.size > 0) {
          lastGrowRef.current -= 1;

          // Pick random frontier cell
          const frontierArray = Array.from(frontier);
          const key = frontierArray[Math.floor(Math.random() * frontierArray.length)];
          frontier.delete(key);

          const [fx, fy] = key.split(',').map(Number);

          // Determine tile type based on distance from center
          const dx = fx - GRID_W / 2;
          const dy = fy - GRID_H / 2;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const maxDist = Math.sqrt((GRID_W / 2) ** 2 + (GRID_H / 2) ** 2);
          let typeIdx = Math.floor((dist / maxDist) * tiles.length);
          typeIdx = Math.max(0, Math.min(typeIdx, tiles.length - 1));

          // Audio can upgrade type
          if (audioData.treble > 0.6 && Math.random() > 0.6) {
            typeIdx = Math.min(typeIdx + 1, tiles.length - 1);
          }
          if (audioData.bass > 0.8 && Math.random() > 0.7) {
            typeIdx = Math.max(typeIdx - 1, 0);
          }

          grid[fy][fx] = {
            type: typeIdx,
            age: 1,
            variation: Math.random(),
            flash: 1,
            x: fx,
            y: fy,
          };
          grownCountRef.current++;

          // Spawn particles for special tiles
          if (typeIdx >= 2) {
            spawnParticles(fx, fy, currentBiome, typeIdx >= 4 ? 6 : 3);
          }

          // Add neighbors to frontier
          getNeighbors(fx, fy).forEach(([nx, ny]) => {
            if (grid[ny][nx].type === -1) {
              frontier.add(`${nx},${ny}`);
            }
          });
        }
      }

      // === UPDATE CELLS ===
      for (let y = 0; y < GRID_H; y++) {
        for (let x = 0; x < GRID_W; x++) {
          const cell = grid[y][x];
          if (cell.type !== -1) {
            cell.age += 0.01;
            if (cell.flash > 0) cell.flash -= 0.03;
          }
        }
      }

      // === UPDATE PARTICLES ===
      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy -= 0.02; // float up
        p.life -= 0.016;
        if (p.life <= 0) {
          particles.splice(i, 1);
        }
      }

      // Ambient particles
      if (Math.random() < 0.1 * sensitivity) {
        const b = BIOMES[currentBiome];
        particles.push({
          x: Math.random() * GRID_W * TILE_SIZE,
          y: GRID_H * TILE_SIZE + 5,
          vx: (Math.random() - 0.5) * 0.5,
          vy: -Math.random() * 0.8 - 0.2,
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

      // Sky / background
      const skyGrad = ctx.createLinearGradient(0, 0, 0, displayH);
      skyGrad.addColorStop(0, biome.skyGradient[0]);
      skyGrad.addColorStop(1, biome.skyGradient[1]);
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, displayW, displayH);

      // Calculate scale to fit grid in viewport
      const worldPixelW = GRID_W * TILE_SIZE;
      const worldPixelH = GRID_H * TILE_SIZE;
      const scale = Math.min(displayW / worldPixelW, displayH / worldPixelH) * 0.95;
      const offsetX = (displayW - worldPixelW * scale) / 2;
      const offsetY = (displayH - worldPixelH * scale) / 2;

      ctx.save();
      ctx.translate(offsetX, offsetY);
      ctx.scale(scale, scale);

      // Draw void background behind grid
      ctx.fillStyle = biome.voidColor;
      ctx.fillRect(0, 0, worldPixelW, worldPixelH);

      // Draw tiles
      for (let y = 0; y < GRID_H; y++) {
        for (let x = 0; x < GRID_W; x++) {
          const cell = grid[y][x];
          if (cell.type === -1) continue;

          const tile = tiles[cell.type];
          if (!tile) continue;

          const px = x * TILE_SIZE;
          const py = y * TILE_SIZE;

          // Draw tile pattern
          const pattern = tile.pattern;
          for (let ty = 0; ty < 8; ty++) {
            for (let tx = 0; tx < 8; tx++) {
              const patVal = pattern?.[ty]?.[tx] ?? 1;
              if (patVal === 0) continue;

              let col = tile.color;
              if (patVal === 2) col = tile.highlight;
              if (patVal === 3) col = tile.shadow;

              ctx.fillStyle = col;
              ctx.fillRect(px + tx, py + ty, 1, 1);
            }
          }

          // Age-based subtle darkening (older = slightly darker)
          if (cell.age > 2) {
            const darken = Math.min((cell.age - 2) * 0.015, 0.15);
            ctx.fillStyle = `rgba(0,0,0,${darken})`;
            ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          }

          // Flash effect for newly grown cells
          if (cell.flash > 0) {
            ctx.fillStyle = `rgba(255,255,255,${cell.flash * 0.4})`;
            ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          }

          // Glow for special tiles
          if (tile.glow && cell.age > 0.5) {
            const pulse = Math.sin(timeRef.current * 3 + cell.variation * 10) * 0.3 + 0.7;
            ctx.shadowColor = tile.glow;
            ctx.shadowBlur = 4 * pulse;
            ctx.fillStyle = tile.glow;
            ctx.globalAlpha = 0.15 * pulse;
            ctx.fillRect(px - 1, py - 1, TILE_SIZE + 2, TILE_SIZE + 2);
            ctx.globalAlpha = 1;
            ctx.shadowBlur = 0;
          }
        }
      }

      // Draw particles
      for (const p of particles) {
        const alpha = Math.max(0, p.life / p.maxLife);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
      ctx.globalAlpha = 1;

      // Audio-reactive border glow
      const avgEnergy = (audioData.bass + audioData.lowMids + audioData.highMids + audioData.treble) / 4;
      if (avgEnergy > 0.3) {
        ctx.strokeStyle = biome.accentColor;
        ctx.globalAlpha = avgEnergy * 0.3;
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, worldPixelW, worldPixelH);
        ctx.globalAlpha = 1;
      }

      ctx.restore();

      // Vignette overlay
      const vigGrad = ctx.createRadialGradient(
        displayW / 2, displayH / 2, displayW * 0.3,
        displayW / 2, displayH / 2, displayW * 0.7
      );
      vigGrad.addColorStop(0, 'rgba(0,0,0,0)');
      vigGrad.addColorStop(1, 'rgba(0,0,0,0.5)');
      ctx.fillStyle = vigGrad;
      ctx.fillRect(0, 0, displayW, displayH);

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [currentBiome, isPlaying, audioData, sensitivity, spawnParticles]);

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
