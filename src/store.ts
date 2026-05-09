import { create } from 'zustand';
import { DEFAULT_SETTINGS, POSTER_TITLES, POSTER_ARTISTS } from './types';
import type { GardenSettings, BiomeName, SongInfo } from './types';

interface GardenState {
  audioSource: import('./types').AudioSource;
  isPlaying: boolean;
  settings: GardenSettings;
  currentBiome: BiomeName;
  currentSong: SongInfo | null;
  posterMode: boolean;
  posterTitle: string;
  posterArtist: string;
  error: string | null;

  setAudioSource: (source: import('./types').AudioSource) => void;
  setIsPlaying: (playing: boolean) => void;
  updateSettings: (partial: Partial<GardenSettings>) => void;
  setBiome: (biome: BiomeName) => void;
  setCurrentSong: (song: SongInfo | null) => void;
  setPosterMode: (active: boolean) => void;
  randomizePosterText: () => void;
  setError: (error: string | null) => void;
}

function randomPoster(): { title: string; artist: string } {
  return {
    title: POSTER_TITLES[Math.floor(Math.random() * POSTER_TITLES.length)],
    artist: POSTER_ARTISTS[Math.floor(Math.random() * POSTER_ARTISTS.length)],
  };
}

const initialPoster = randomPoster();

export const useGardenStore = create<GardenState>((set) => ({
  audioSource: 'demo',
  isPlaying: true,
  settings: { ...DEFAULT_SETTINGS },
  currentBiome: 'garden',
  currentSong: null,
  posterMode: false,
  posterTitle: initialPoster.title,
  posterArtist: initialPoster.artist,
  error: null,

  setAudioSource: (source) => set({ audioSource: source }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  updateSettings: (partial) =>
    set((state) => ({ settings: { ...state.settings, ...partial } })),
  setBiome: (biome) => set({ currentBiome: biome }),
  setCurrentSong: (song) => set({ currentSong: song }),
  setPosterMode: (active) => set({ posterMode: active }),
  randomizePosterText: () => {
    const p = randomPoster();
    set({ posterTitle: p.title, posterArtist: p.artist });
  },
  setError: (error) => set({ error }),
}));
