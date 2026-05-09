import { create } from 'zustand';
import type { GardenSettings, PresetName, AudioSource } from './types';
import { PRESETS } from './types';

interface GardenState {
  audioSource: AudioSource;
  isPlaying: boolean;
  settings: GardenSettings;
  currentPreset: PresetName;
  posterMode: boolean;
  posterTitle: string;
  posterArtist: string;
  error: string | null;

  setAudioSource: (source: AudioSource) => void;
  setIsPlaying: (playing: boolean) => void;
  updateSettings: (settings: Partial<GardenSettings>) => void;
  setPreset: (preset: PresetName) => void;
  setPosterMode: (active: boolean) => void;
  setPosterTitle: (title: string) => void;
  setPosterArtist: (artist: string) => void;
  setError: (error: string | null) => void;
  randomizePosterText: () => void;
}

const defaultSettings: GardenSettings = {
  sensitivity: 1.0,
  bloom: 1.0,
  cameraMotion: 0.5,
  particleAmount: 0.7,
};

export const useGardenStore = create<GardenState>((set) => ({
  audioSource: 'demo',
  isPlaying: true,
  settings: { ...defaultSettings },
  currentPreset: 'Neon Orchid',
  posterMode: false,
  posterTitle: 'Cyber Garden',
  posterArtist: 'Unknown Artist',
  error: null,

  setAudioSource: (source) => set({ audioSource: source }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  updateSettings: (settings) =>
    set((state) => ({ settings: { ...state.settings, ...settings } })),
  setPreset: (preset) =>
    set((state) => {
      const p = PRESETS[preset];
      return {
        currentPreset: preset,
        settings: { ...state.settings, ...p.settings },
      };
    }),
  setPosterMode: (active) => set({ posterMode: active }),
  setPosterTitle: (title) => set({ posterTitle: title }),
  setPosterArtist: (artist) => set({ posterArtist: artist }),
  setError: (error) => set({ error }),
  randomizePosterText: () => {
    const titles = [
      'Neon Roots',
      'Digital Bloom',
      'Synthetic Flora',
      'Echo Garden',
      'Pulse of Nature',
      'Fractal Petals',
      'Aether Vines',
      'Luminous Seeds',
    ];
    const artists = [
      'Cipher Bloom',
      'The Algorithms',
      'Neural Gardens',
      'Glitch Flora',
      'Spectral Botany',
      'Data Seeds',
      'Quantum Petals',
    ];
    set({
      posterTitle: titles[Math.floor(Math.random() * titles.length)],
      posterArtist: artists[Math.floor(Math.random() * artists.length)],
    });
  },
}));
