export interface AudioData {
  bass: number;
  lowMids: number;
  highMids: number;
  treble: number;
  average: number;
  kick: boolean;
  snare: boolean;
  kickEnergy: number;
  snareEnergy: number;
}

export type AudioSource = 'file' | 'microphone' | 'demo' | null;

export type BiomeName = 'garden' | 'city' | 'desert' | 'ice';

export type AnimationType = 'breathe' | 'sway' | 'pulse' | 'float' | 'spin' | 'ripple' | 'static';

export interface TileDef {
  name: string;
  color: string;
  highlight: string;
  shadow: string;
  glow?: string;
  height: number;
  pattern?: number[][];
  animation: AnimationType;
}

export interface Biome {
  name: string;
  voidColor: string;
  skyGradient: [string, string, string];
  tiles: TileDef[];
  particleColor: string;
  accentColor: string;
  starColors: string[];
}

export const BIOMES: Record<BiomeName, Biome> = {
  garden: {
    name: 'Garden',
    voidColor: '#0a0f08',
    skyGradient: ['#0a1a0a', '#051005', '#020804'],
    particleColor: '#88ffaa',
    accentColor: '#ff66aa',
    starColors: ['#aaddff', '#ffeeaa', '#aaffaa'],
    tiles: [
      { name: 'dirt', color: '#5c3a1e', highlight: '#7a5230', shadow: '#3d2614', height: 1, pattern: [[1,1,1,1],[1,3,1,1],[1,1,3,1],[1,1,1,1]], animation: 'static' },
      { name: 'grass', color: '#2d8a3e', highlight: '#4aad5c', shadow: '#1a5c2e', height: 1, pattern: [[0,2,0,2],[2,1,2,1],[1,3,1,3],[3,1,3,1]], animation: 'breathe' },
      { name: 'mushroom', color: '#d45555', highlight: '#ff8888', shadow: '#aa3333', glow: '#ffaaaa', height: 2, pattern: [[0,2,0,0],[2,1,2,0],[0,2,0,0],[0,3,0,0]], animation: 'sway' },
      { name: 'flower', color: '#e855a0', highlight: '#ff88cc', shadow: '#b0407a', glow: '#ffaad0', height: 2, pattern: [[0,2,0,0],[2,1,2,0],[0,2,0,0],[0,3,0,0]], animation: 'sway' },
      { name: 'bush', color: '#1a6b2e', highlight: '#2d9a45', shadow: '#0f4a1f', height: 2, pattern: [[0,2,0,0],[2,1,2,0],[1,3,1,0],[0,3,0,0]], animation: 'breathe' },
      { name: 'tree', color: '#1a5c2e', highlight: '#2d8a45', shadow: '#0f3d1f', height: 3, pattern: [[0,2,0,0],[2,1,2,0],[1,3,1,0],[0,3,0,0]], animation: 'sway' },
      { name: 'water', color: '#2a6b9e', highlight: '#4a9acc', shadow: '#1a4a6e', glow: '#88ccff', height: 0, pattern: [[1,2,1,2],[2,1,2,1],[1,2,1,2],[2,1,2,1]], animation: 'ripple' },
      { name: 'willow', color: '#4a8a3a', highlight: '#6aba5a', shadow: '#2a5a1e', height: 3, pattern: [[0,2,0,0],[2,1,2,0],[0,2,0,0],[0,2,0,0]], animation: 'sway' },
    ],
  },

  city: {
    name: 'Neon City',
    voidColor: '#050510',
    skyGradient: ['#0a0a1a', '#020208', '#010105'],
    particleColor: '#ff00aa',
    accentColor: '#00f0ff',
    starColors: ['#ff00aa', '#00f0ff', '#ffaa00'],
    tiles: [
      { name: 'concrete', color: '#3a3a4a', highlight: '#555566', shadow: '#222233', height: 1, pattern: [[1,1,1,1],[1,3,1,1],[1,1,3,1],[1,1,1,1]], animation: 'static' },
      { name: 'road', color: '#1a1a2e', highlight: '#2a2a3e', shadow: '#0f0f1a', height: 0, pattern: [[3,3,3,3],[3,1,1,3],[3,1,1,3],[3,3,3,3]], animation: 'static' },
      { name: 'park', color: '#2a4a2a', highlight: '#3a6a3a', shadow: '#1a2a1a', height: 1, pattern: [[0,2,0,2],[2,1,2,1],[1,3,1,3],[3,1,3,1]], animation: 'breathe' },
      { name: 'building', color: '#5a5a7a', highlight: '#777799', shadow: '#3d3d55', height: 2, pattern: [[3,3,3,3],[3,1,2,3],[3,2,1,3],[3,3,3,3]], animation: 'pulse' },
      { name: 'neon', color: '#ff00aa', highlight: '#ff66cc', shadow: '#aa0077', glow: '#ff88dd', height: 1, pattern: [[0,2,0,0],[2,1,2,0],[0,2,0,0],[0,0,0,0]], animation: 'pulse' },
      { name: 'antenna', color: '#4a4a6a', highlight: '#666688', shadow: '#2a2a4a', glow: '#ff00aa', height: 3, pattern: [[0,2,0,0],[0,1,0,0],[0,1,0,0],[0,2,0,0]], animation: 'pulse' },
      { name: 'skyscraper', color: '#3a3a5a', highlight: '#555577', shadow: '#222244', height: 4, pattern: [[3,3,3,3],[3,1,1,3],[3,2,2,3],[3,1,1,3]], animation: 'pulse' },
      { name: 'data_tower', color: '#2a2a4a', highlight: '#444466', shadow: '#1a1a3a', glow: '#00f0ff', height: 3, pattern: [[0,2,0,0],[2,1,2,0],[0,2,0,0],[0,0,0,0]], animation: 'spin' },
    ],
  },

  desert: {
    name: 'Desert Mirage',
    voidColor: '#0a0805',
    skyGradient: ['#1a1510', '#0a0805', '#050402'],
    particleColor: '#ffcc55',
    accentColor: '#ff6644',
    starColors: ['#ffcc55', '#ff9955', '#ffddaa'],
    tiles: [
      { name: 'sand', color: '#c4a35a', highlight: '#e0c070', shadow: '#9a8040', height: 1, pattern: [[1,1,1,1],[1,3,1,1],[1,1,3,1],[1,1,1,1]], animation: 'static' },
      { name: 'dune', color: '#b09040', highlight: '#d0b060', shadow: '#8a7020', height: 2, pattern: [[1,2,1,1],[2,1,2,1],[1,2,1,2],[1,1,2,1]], animation: 'breathe' },
      { name: 'cactus', color: '#3a7a3a', highlight: '#55aa55', shadow: '#255525', height: 2, pattern: [[0,2,0,0],[2,1,2,0],[0,2,0,0],[0,3,0,0]], animation: 'sway' },
      { name: 'rock', color: '#8a7a6a', highlight: '#aa9988', shadow: '#665544', height: 1, pattern: [[0,2,2,0],[2,1,1,2],[2,1,3,2],[0,2,2,0]], animation: 'static' },
      { name: 'oasis', color: '#4a9aaa', highlight: '#66ccee', shadow: '#2a6a7a', glow: '#88eeff', height: 0, pattern: [[0,2,0,0],[2,1,1,2],[0,1,1,0],[0,2,0,0]], animation: 'ripple' },
      { name: 'palm', color: '#4a7a2a', highlight: '#6aaa3a', shadow: '#2a4a1a', height: 3, pattern: [[0,2,0,0],[2,1,2,0],[0,2,0,0],[0,3,0,0]], animation: 'sway' },
      { name: 'temple', color: '#d4a050', highlight: '#f0c070', shadow: '#aa8040', glow: '#ffdd88', height: 3, pattern: [[0,2,2,0],[2,1,1,2],[2,1,2,2],[0,2,2,0]], animation: 'static' },
      { name: 'ruin', color: '#9a8a7a', highlight: '#baaa9a', shadow: '#7a6a5a', glow: '#ffcc88', height: 2, pattern: [[1,2,1,1],[2,1,2,1],[1,3,1,1],[1,1,1,1]], animation: 'breathe' },
    ],
  },

  ice: {
    name: 'Ice Village',
    voidColor: '#050a12',
    skyGradient: ['#0a1520', '#050a10', '#020508'],
    particleColor: '#aaddff',
    accentColor: '#55ffcc',
    starColors: ['#aaddff', '#55ffcc', '#ffffff'],
    tiles: [
      { name: 'snow', color: '#d0e0f0', highlight: '#f0f8ff', shadow: '#a0b8d0', height: 1, pattern: [[1,1,1,1],[1,3,1,1],[1,1,3,1],[1,1,1,1]], animation: 'static' },
      { name: 'ice', color: '#88ccee', highlight: '#aaeeff', shadow: '#66aacc', height: 1, pattern: [[2,2,1,1],[2,1,2,1],[1,2,1,2],[1,1,2,2]], animation: 'ripple' },
      { name: 'crystal', color: '#aaddff', highlight: '#cceeff', shadow: '#88bbee', glow: '#ddffff', height: 2, pattern: [[0,2,0,0],[2,1,2,0],[0,2,0,0],[0,0,0,0]], animation: 'pulse' },
      { name: 'aurora', color: '#55ffcc', highlight: '#88ffdd', shadow: '#33ccaa', glow: '#aaffee', height: 1, pattern: [[0,2,0,2],[2,1,2,1],[0,2,0,0],[0,0,0,0]], animation: 'float' },
      { name: 'iceberg', color: '#b0d0e8', highlight: '#d0f0ff', shadow: '#90b0d0', height: 2, pattern: [[0,2,2,0],[2,1,1,2],[2,1,3,2],[0,2,2,0]], animation: 'static' },
      { name: 'spire', color: '#e0f0ff', highlight: '#ffffff', shadow: '#b0d0ee', glow: '#ffffff', height: 4, pattern: [[0,2,0,0],[0,1,0,0],[0,1,0,0],[3,3,3,3]], animation: 'pulse' },
      { name: 'frost_tree', color: '#6a9aaa', highlight: '#8abacc', shadow: '#4a7a8a', glow: '#aaddff', height: 3, pattern: [[0,2,0,0],[2,1,2,0],[0,2,0,0],[0,3,0,0]], animation: 'sway' },
      { name: 'glacier', color: '#7ab0d0', highlight: '#9ad0f0', shadow: '#5a90b0', height: 2, pattern: [[2,2,1,1],[2,1,2,1],[1,2,1,2],[1,1,2,2]], animation: 'breathe' },
    ],
  },
};

export interface GardenSettings {
  sensitivity: number;
  bloom: number;
  cameraMotion: number;
  particleAmount: number;
  beatSensitivity: number;
  kickReactivity: number;
  snareReactivity: number;
  animationSpeed: number;
}

export const DEFAULT_SETTINGS: GardenSettings = {
  sensitivity: 1.0,
  bloom: 1.0,
  cameraMotion: 0.5,
  particleAmount: 1.0,
  beatSensitivity: 1.0,
  kickReactivity: 1.0,
  snareReactivity: 1.0,
  animationSpeed: 1.0,
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
