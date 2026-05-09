import { useRef, useState, useCallback, useEffect } from 'react';
import { AudioEngine } from '../audioEngine';
import type { AudioData } from '../types';

export function useAudioEngine() {
  const engineRef = useRef<AudioEngine | null>(null);
  const [audioData, setAudioData] = useState<AudioData>({
    bass: 0, lowMids: 0, highMids: 0, treble: 0, average: 0,
  });
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  if (!engineRef.current) {
    engineRef.current = new AudioEngine();
  }

  // Poll audio data
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      const data = engineRef.current!.getAudioData();
      setAudioData(data);
    }, 16);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const startFile = useCallback(async (file: File) => {
    try {
      setIsUploading(true);
      setError(null);
      await engineRef.current?.startFile(file);
    } catch (err) {
      setError('Failed to load audio file');
    } finally {
      setIsUploading(false);
    }
  }, []);

  const startMicrophone = useCallback(async () => {
    try {
      setError(null);
      await engineRef.current?.startMicrophone();
    } catch (err) {
      setError('Microphone access denied');
    }
  }, []);

  const startDemo = useCallback(async () => {
    try {
      setError(null);
      await engineRef.current?.startDemo();
    } catch (err) {
      setError('Failed to start demo');
    }
  }, []);

  const pause = useCallback(async () => {
    await engineRef.current?.pause();
  }, []);

  const resumeAudio = useCallback(async () => {
    await engineRef.current?.resume();
  }, []);

  const stop = useCallback(async () => {
    await engineRef.current?.stop();
  }, []);

  const resumeContext = useCallback(async () => {
    await engineRef.current?.resumeContext();
  }, []);

  return {
    audioData,
    startFile,
    startMicrophone,
    startDemo,
    pause,
    resumeAudio,
    stop,
    resumeContext,
    isUploading,
    error,
  };
}
