import { useEffect, useRef, useState, useCallback } from 'react';
import { AudioEngine } from '../audioEngine';
import type { AudioData } from '../types';
import { useGardenStore } from '../store';

export function useAudioEngine() {
  const engineRef = useRef<AudioEngine | null>(null);
  const [audioData, setAudioData] = useState<AudioData>({
    bass: 0,
    lowMids: 0,
    highMids: 0,
    treble: 0,
    average: 0,
  });
  const animationRef = useRef<number>(0);
  const { isPlaying, settings } = useGardenStore();
  const setError = useGardenStore((s) => s.setError);

  useEffect(() => {
    engineRef.current = new AudioEngine();
    return () => {
      cancelAnimationFrame(animationRef.current);
      engineRef.current?.stop();
    };
  }, []);

  useEffect(() => {
    engineRef.current?.setSmoothing(1 - settings.sensitivity * 0.3);
  }, [settings.sensitivity]);

  useEffect(() => {
    if (!isPlaying) {
      cancelAnimationFrame(animationRef.current);
      engineRef.current?.stop();
      return;
    }

    const loop = () => {
      if (engineRef.current) {
        setAudioData(engineRef.current.getAudioData());
      }
      animationRef.current = requestAnimationFrame(loop);
    };
    animationRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying]);

  const startFile = useCallback(
    async (file: File) => {
      try {
        setError(null);
        await engineRef.current?.startFile(file);
      } catch (err) {
        setError('Failed to load audio file. Please try another.');
        console.error(err);
      }
    },
    [setError]
  );

  const startMicrophone = useCallback(async () => {
    try {
      setError(null);
      await engineRef.current?.startMicrophone();
    } catch (err) {
      setError('Microphone access denied or unavailable.');
      console.error(err);
    }
  }, [setError]);

  const startDemo = useCallback(async () => {
    try {
      setError(null);
      await engineRef.current?.startDemo();
    } catch (err) {
      setError('Demo mode failed to start.');
      console.error(err);
    }
  }, [setError]);

  const stop = useCallback(async () => {
    await engineRef.current?.stop();
  }, []);

  return { audioData, startFile, startMicrophone, startDemo, stop };
}
