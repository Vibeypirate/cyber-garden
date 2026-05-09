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
  bgColor: string;
  skyGradient: [string, string, string];
  tiles: TileDef[];
  particleColor: string;
  accentColor: string;
  starColors: string[];
  sketchColor: string;
}

// Sketch aesthetic: white/cream backgrounds, ink outlines, hand-drawn feel
export const BIOMES: Record<BiomeName, Biome> = {
  garden: {
    name: 'Garden',
    bgColor: '#f5f0e8',
    skyGradient: ['#f5f0e8', '#ede6da', '#e5dccf'],
    particleColor: '#7a9e6e',
    accentColor: '#c75b7a',
    starColors: ['#8fa8b8', '#d4a574', '#8fb88f'],
    sketchColor: '#2a2520',
    tiles: [
      { name: 'dirt', color: '#8b7355', highlight: '#a08b6d', shadow: '#6b5740', height: 1, pattern: [[1,1,1,1],[1,3,1,1],[1,1,3,1],[1,1,1,1]], animation: 'static' },
      { name: 'grass', color: '#6b9e5e', highlight: '#8bb87a', shadow: '#4a7a3e', height: 1, pattern: [[0,2,0,2],[2,1,2,1],[1,3,1,3],[3,1,3,1]], animation: 'breathe' },
      { name: 'mushroom', color: '#c75b7a', highlight: '#e08a9e', shadow: '#a0405a', glow: '#e8a0b0', height: 2, pattern: [[0,2,0,0],[2,1,2,0],[0,2,0,0],[0,3,0,0]], animation: 'sway' },
      { name: 'flower', color: '#e8a040', highlight: '#f0c060', shadow: '#c08030', glow: '#f5d080', height: 2, pattern: [[0,2,0,0],[2,1,2,0],[0,2,0,0],[0,3,0,0]], animation: 'sway' },
      { name: 'bush', color: '#4a7a3e', highlight: '#6a9a5a', shadow: '#305a28', height: 2, pattern: [[0,2,0,0],[2,1,2,0],[1,3,1,0],[0,3,0,0]], animation: 'breathe' },
      { name: 'tree', color: '#5a8a4a', highlight: '#7aaa6a', shadow: '#3a6a2e', height: 3, pattern: [[0,2,0,0],[2,1,2,0],[1,3,1,0],[0,3,0,0]], animation: 'sway' },
      { name: 'water', color: '#6a9ec0', highlight: '#8abed8', shadow: '#4a7ea0', glow: '#a0d0e8', height: 0, pattern: [[1,2,1,2],[2,1,2,1],[1,2,1,2],[2,1,2,1]], animation: 'ripple' },
      { name: 'willow', color: '#7aaa5a', highlight: '#9aca7a', shadow: '#5a8a3a', height: 3, pattern: [[0,2,0,0],[2,1,2,0],[0,2,0,0],[0,2,0,0]], animation: 'sway' },
    ],
  },

  city: {
    name: 'Neon City',
    bgColor: '#e8e8f0',
    skyGradient: ['#e8e8f0', '#dddde8', '#d0d0e0'],
    particleColor: '#d04080',
    accentColor: '#40a0c0',
    starColors: ['#e04080', '#40a0c0', '#e0a040'],
    sketchColor: '#1a1a2a',
    tiles: [
      { name: 'concrete', color: '#8a8a9a', highlight: '#a0a0b0', shadow: '#6a6a7a', height: 1, pattern: [[1,1,1,1],[1,3,1,1],[1,1,3,1],[1,1,1,1]], animation: 'static' },
      { name: 'road', color: '#5a5a6a', highlight: '#6a6a7a', shadow: '#3a3a4a', height: 0, pattern: [[3,3,3,3],[3,1,1,3],[3,1,1,3],[3,3,3,3]], animation: 'static' },
      { name: 'park', color: '#5a8a5a', highlight: '#6aaa6a', shadow: '#3a6a3a', height: 1, pattern: [[0,2,0,2],[2,1,2,1],[1,3,1,3],[3,1,3,1]], animation: 'breathe' },
      { name: 'building', color: '#7a7a9a', highlight: '#9090b0', shadow: '#5a5a7a', height: 2, pattern: [[3,3,3,3],[3,1,2,3],[3,2,1,3],[3,3,3,3]], animation: 'pulse' },
      { name: 'neon', color: '#d04080', highlight: '#e870a0', shadow: '#a03060', glow: '#f0a0c0', height: 1, pattern: [[0,2,0,0],[2,1,2,0],[0,2,0,0],[0,0,0,0]], animation: 'pulse' },
      { name: 'antenna', color: '#6a6a8a', highlight: '#8080a0', shadow: '#4a4a6a', glow: '#d04080', height: 3, pattern: [[0,2,0,0],[0,1,0,0],[0,1,0,0],[0,2,0,0]], animation: 'pulse' },
      { name: 'skyscraper', color: '#5a5a7a', highlight: '#707090', shadow: '#3a3a5a', height: 4, pattern: [[3,3,3,3],[3,1,1,3],[3,2,2,3],[3,1,1,3]], animation: 'pulse' },
      { name: 'data_tower', color: '#4a4a6a', highlight: '#606080', shadow: '#2a2a4a', glow: '#40a0c0', height: 3, pattern: [[0,2,0,0],[2,1,2,0],[0,2,0,0],[0,0,0,0]], animation: 'spin' },
    ],
  },

  desert: {
    name: 'Desert Mirage',
    bgColor: '#f0ebe0',
    skyGradient: ['#f0ebe0', '#e8e0d0', '#dfd5c5'],
    particleColor: '#c09040',
    accentColor: '#c07040',
    starColors: ['#c09040', '#b07030', '#d0a860'],
    sketchColor: '#2a2018',
    tiles: [
      { name: 'sand', color: '#c8a860', highlight: '#dcc080', shadow: '#a08840', height: 1, pattern: [[1,1,1,1],[1,3,1,1],[1,1,3,1],[1,1,1,1]], animation: 'static' },
      { name: 'dune', color: '#b89850', highlight: '#d0b068', shadow: '#988038', height: 2, pattern: [[1,2,1,1],[2,1,2,1],[1,2,1,2],[1,1,2,1]], animation: 'breathe' },
      { name: 'cactus', color: '#5a8a5a', highlight: '#7aaa7a', shadow: '#3a6a3a', height: 2, pattern: [[0,2,0,0],[2,1,2,0],[0,2,0,0],[0,3,0,0]], animation: 'sway' },
      { name: 'rock', color: '#a09080', highlight: '#b8a898', shadow: '#7a6a5a', height: 1, pattern: [[0,2,2,0],[2,1,1,2],[2,1,3,2],[0,2,2,0]], animation: 'static' },
      { name: 'oasis', color: '#5aa0b0', highlight: '#7ac0d0', shadow: '#3a8090', glow: '#a0d8e8', height: 0, pattern: [[0,2,0,0],[2,1,1,2],[0,1,1,0],[0,2,0,0]], animation: 'ripple' },
      { name: 'palm', color: '#6a9a4a', highlight: '#8aba6a', shadow: '#4a7a2a', height: 3, pattern: [[0,2,0,0],[2,1,2,0],[0,2,0,0],[0,3,0,0]], animation: 'sway' },
      { name: 'temple', color: '#c8a050', highlight: '#e0c070', shadow: '#a08038', glow: '#f0d090', height: 3, pattern: [[0,2,2,0],[2,1,1,2],[2,1,2,2],[0,2,2,0]], animation: 'static' },
      { name: 'ruin', color: '#a89888', highlight: '#c0b0a0', shadow: '#887868', glow: '#d8c8a0', height: 2, pattern: [[1,2,1,1],[2,1,2,1],[1,3,1,1],[1,1,1,1]], animation: 'breathe' },
    ],
  },

  ice: {
    name: 'Ice Village',
    bgColor: '#e8f0f5',
    skyGradient: ['#e8f0f5', '#dde8f0', '#d0e0e8'],
    particleColor: '#70a8c0',
    accentColor: '#50b0a0',
    starColors: ['#70a8c0', '#50b0a0', '#a0c0d0'],
    sketchColor: '#1a2528',
    tiles: [
      { name: 'snow', color: '#c8d8e8', highlight: '#e0e8f5', shadow: '#a0b8d0', height: 1, pattern: [[1,1,1,1],[1,3,1,1],[1,1,3,1],[1,1,1,1]], animation: 'static' },
      { name: 'ice', color: '#90c8e0', highlight: '#b0e0f5', shadow: '#70a8c8', height: 1, pattern: [[2,2,1,1],[2,1,2,1],[1,2,1,2],[1,1,2,2]], animation: 'ripple' },
      { name: 'crystal', color: '#a0d0e8', highlight: '#c0e8f8', shadow: '#80b8d8', glow: '#d8f0ff', height: 2, pattern: [[0,2,0,0],[2,1,2,0],[0,2,0,0],[0,0,0,0]], animation: 'pulse' },
      { name: 'aurora', color: '#50c0a8', highlight: '#70e0c8', shadow: '#30a088', glow: '#a0f0e0', height: 1, pattern: [[0,2,0,2],[2,1,2,1],[0,2,0,0],[0,0,0,0]], animation: 'float' },
      { name: 'iceberg', color: '#b0d0e0', highlight: '#d0e8f8', shadow: '#90b8d0', height: 2, pattern: [[0,2,2,0],[2,1,1,2],[2,1,3,2],[0,2,2,0]], animation: 'static' },
      { name: 'spire', color: '#d0e8f5', highlight: '#f0f8ff', shadow: '#b0d8e8', glow: '#e0f8ff', height: 4, pattern: [[0,2,0,0],[0,1,0,0],[0,1,0,0],[3,3,3,3]], animation: 'pulse' },
      { name: 'frost_tree', color: '#80a8b8', highlight: '#a0c8d8', shadow: '#608898', glow: '#c0e8f8', height: 3, pattern: [[0,2,0,0],[2,1,2,0],[0,2,0,0],[0,3,0,0]], animation: 'sway' },
      { name: 'glacier', color: '#90b8d0', highlight: '#b0d8f0', shadow: '#7098b8', height: 2, pattern: [[2,2,1,1],[2,1,2,1],[1,2,1,2],[1,1,2,2]], animation: 'breathe' },
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
