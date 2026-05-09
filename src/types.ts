export interface AudioData {
  bass: number;
  lowMids: number;
  highMids: number;
  treble: number;
  average: number;
  beat?: boolean;
}

export type AudioSource = 'file' | 'microphone' | 'demo' | null;

export type BiomeName = 'garden' | 'city' | 'desert' | 'ice';

export interface TileDef {
  name: string;
  color: string;
  highlight: string;
  shadow: string;
  glow?: string;
  height: number; // voxel height in tile units
  pattern?: number[][];
}

export interface Biome {
  name: string;
  voidColor: string;
  skyGradient: [string, string, string]; // top, middle, bottom
  tiles: TileDef[];
  particleColor: string;
  accentColor: string;
}

export const BIOMES: Record<BiomeName, Biome> = {
  garden: {
    name: 'Garden',
    voidColor: '#0a0f08',
    skyGradient: ['#0a1a0a', '#051005', '#020804'],
    particleColor: '#88ffaa',
    accentColor: '#ff66aa',
    tiles: [
      { name: 'dirt', color: '#5c3a1e', highlight: '#7a5230', shadow: '#3d2614', height: 1, pattern: [[1,1,1,1],[1,3,1,1],[1,1,3,1],[1,1,1,1]] },
      { name: 'grass', color: '#2d8a3e', highlight: '#4aad5c', shadow: '#1a5c2e', height: 1, pattern: [[0,2,0,2],[2,1,2,1],[1,3,1,3],[3,1,3,1]] },
      { name: 'flower', color: '#e855a0', highlight: '#ff88cc', shadow: '#b0407a', glow: '#ffaad0', height: 2, pattern: [[0,2,0,0],[2,1,2,0],[0,2,0,0],[0,3,0,0]] },
      { name: 'tree', color: '#1a5c2e', highlight: '#2d8a45', shadow: '#0f3d1f', height: 3, pattern: [[0,2,0,0],[2,1,2,0],[1,3,1,0],[0,3,0,0]] },
      { name: 'water', color: '#2a6b9e', highlight: '#4a9acc', shadow: '#1a4a6e', glow: '#88ccff', height: 0, pattern: [[1,2,1,2],[2,1,2,1],[1,2,1,2],[2,1,2,1]] },
    ],
  },

  city: {
    name: 'Neon City',
    voidColor: '#050510',
    skyGradient: ['#0a0a1a', '#020208', '#010105'],
    particleColor: '#ff00aa',
    accentColor: '#00f0ff',
    tiles: [
      { name: 'concrete', color: '#3a3a4a', highlight: '#555566', shadow: '#222233', height: 1, pattern: [[1,1,1,1],[1,3,1,1],[1,1,3,1],[1,1,1,1]] },
      { name: 'road', color: '#1a1a2e', highlight: '#2a2a3e', shadow: '#0f0f1a', height: 0, pattern: [[3,3,3,3],[3,1,1,3],[3,1,1,3],[3,3,3,3]] },
      { name: 'building', color: '#5a5a7a', highlight: '#777799', shadow: '#3d3d55', height: 2, pattern: [[3,3,3,3],[3,1,2,3],[3,2,1,3],[3,3,3,3]] },
      { name: 'neon', color: '#ff00aa', highlight: '#ff66cc', shadow: '#aa0077', glow: '#ff88dd', height: 1, pattern: [[0,2,0,0],[2,1,2,0],[0,2,0,0],[0,0,0,0]] },
      { name: 'skyscraper', color: '#3a3a5a', highlight: '#555577', shadow: '#222244', height: 4, pattern: [[3,3,3,3],[3,1,1,3],[3,2,2,3],[3,1,1,3]] },
    ],
  },

  desert: {
    name: 'Desert Mirage',
    voidColor: '#0a0805',
    skyGradient: ['#1a1510', '#0a0805', '#050402'],
    particleColor: '#ffcc55',
    accentColor: '#ff6644',
    tiles: [
      { name: 'sand', color: '#c4a35a', highlight: '#e0c070', shadow: '#9a8040', height: 1, pattern: [[1,1,1,1],[1,3,1,1],[1,1,3,1],[1,1,1,1]] },
      { name: 'cactus', color: '#3a7a3a', highlight: '#55aa55', shadow: '#255525', height: 2, pattern: [[0,2,0,0],[2,1,2,0],[0,2,0,0],[0,3,0,0]] },
      { name: 'rock', color: '#8a7a6a', highlight: '#aa9988', shadow: '#665544', height: 1, pattern: [[0,2,2,0],[2,1,1,2],[2,1,3,2],[0,2,2,0]] },
      { name: 'oasis', color: '#4a9aaa', highlight: '#66ccee', shadow: '#2a6a7a', glow: '#88eeff', height: 0, pattern: [[0,2,0,0],[2,1,1,2],[0,1,1,0],[0,2,0,0]] },
      { name: 'temple', color: '#d4a050', highlight: '#f0c070', shadow: '#aa8040', glow: '#ffdd88', height: 3, pattern: [[0,2,2,0],[2,1,1,2],[2,1,2,2],[0,2,2,0]] },
    ],
  },

  ice: {
    name: 'Ice Village',
    voidColor: '#050a12',
    skyGradient: ['#0a1520', '#050a10', '#020508'],
    particleColor: '#aaddff',
    accentColor: '#55ffcc',
    tiles: [
      { name: 'snow', color: '#d0e0f0', highlight: '#f0f8ff', shadow: '#a0b8d0', height: 1, pattern: [[1,1,1,1],[1,3,1,1],[1,1,3,1],[1,1,1,1]] },
      { name: 'ice', color: '#88ccee', highlight: '#aaeeff', shadow: '#66aacc', height: 1, pattern: [[2,2,1,1],[2,1,2,1],[1,2,1,2],[1,1,2,2]] },
      { name: 'crystal', color: '#aaddff', highlight: '#cceeff', shadow: '#88bbee', glow: '#ddffff', height: 2, pattern: [[0,2,0,0],[2,1,2,0],[0,2,0,0],[0,0,0,0]] },
      { name: 'aurora', color: '#55ffcc', highlight: '#88ffdd', shadow: '#33ccaa', glow: '#aaffee', height: 1, pattern: [[0,2,0,2],[2,1,2,1],[0,2,0,0],[0,0,0,0]] },
      { name: 'spire', color: '#e0f0ff', highlight: '#ffffff', shadow: '#b0d0ee', glow: '#ffffff', height: 4, pattern: [[0,2,0,0],[0,1,0,0],[0,1,0,0],[3,3,3,3]] },
    ],
  },
};

export interface GardenSettings {
  sensitivity: number;
  bloom: number;
  cameraMotion: number;
  particleAmount: number;
}

export const DEFAULT_SETTINGS: GardenSettings = {
  sensitivity: 1.0,
  bloom: 1.0,
  cameraMotion: 0.5,
  particleAmount: 1.0,
};

export interface SongInfo {
  name: string;
  size: number;
}

export const POSTER_TITLES = [
  'Neon Bloom', 'Digital Eden', 'Cyber Flora', 'Electric Roots',
  'Synth Garden', 'Data Meadow', 'Photon Petals', 'Glitch Grove',
  'Void Blossoms', 'Quantum Ferns', 'Neural Nettles', 'Binary Buds',
];

export const POSTER_ARTISTS = [
  'System Audio', 'Unknown Source', 'Live Input', 'Generated',
  'Anonymous', 'Digital Soul', 'Wave Form', 'Frequency',
];
