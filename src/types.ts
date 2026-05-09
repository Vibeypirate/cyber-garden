export interface AudioData {
  bass: number;       // 20–150 Hz
  lowMids: number;    // 150–500 Hz
  highMids: number;   // 500–2000 Hz
  treble: number;     // 2000–8000 Hz
  average: number;
}

export interface GardenSettings {
  sensitivity: number;
  bloom: number;
  cameraMotion: number;
  particleAmount: number;
}

export type PresetName = 'Neon Orchid' | 'Alien Jungle' | 'Crystal Bloom' | 'Solar Garden';

export interface Preset {
  name: PresetName;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    ground: string;
    background: string;
  };
  settings: Partial<GardenSettings>;
}

export const PRESETS: Record<PresetName, Preset> = {
  'Neon Orchid': {
    name: 'Neon Orchid',
    colors: {
      primary: '#00f0ff',
      secondary: '#ff00aa',
      accent: '#ccff00',
      ground: '#0a0a1a',
      background: '#020205',
    },
    settings: { sensitivity: 1.0, bloom: 1.2, cameraMotion: 0.5, particleAmount: 0.7 },
  },
  'Alien Jungle': {
    name: 'Alien Jungle',
    colors: {
      primary: '#39ff14',
      secondary: '#bf00ff',
      accent: '#ff4500',
      ground: '#051005',
      background: '#010a01',
    },
    settings: { sensitivity: 1.3, bloom: 0.8, cameraMotion: 0.7, particleAmount: 1.0 },
  },
  'Crystal Bloom': {
    name: 'Crystal Bloom',
    colors: {
      primary: '#a0e7ff',
      secondary: '#e0b0ff',
      accent: '#ffffff',
      ground: '#0a0f1a',
      background: '#02040a',
    },
    settings: { sensitivity: 0.9, bloom: 1.5, cameraMotion: 0.4, particleAmount: 0.5 },
  },
  'Solar Garden': {
    name: 'Solar Garden',
    colors: {
      primary: '#ffd700',
      secondary: '#ff6b35',
      accent: '#ff0040',
      ground: '#1a0f05',
      background: '#0a0502',
    },
    settings: { sensitivity: 1.1, bloom: 1.0, cameraMotion: 0.6, particleAmount: 0.8 },
  },
};

export type AudioSource = 'file' | 'microphone' | 'demo' | null;
