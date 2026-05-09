import { useEffect, useRef, useCallback } from 'react';
import { useGardenStore } from './store';
import { useAudioEngine } from './hooks/useAudioEngine';
import PixelWorld from './components/PixelWorld';
import UI from './components/UI';
import PosterMode from './components/PosterMode';

function App() {
  const audioSource = useGardenStore((s) => s.audioSource);
  const isPlaying = useGardenStore((s) => s.isPlaying);
  const posterMode = useGardenStore((s) => s.posterMode);
  const setIsPlaying = useGardenStore((s) => s.setIsPlaying);
  const setCurrentSong = useGardenStore((s) => s.setCurrentSong);
  const setAudioSource = useGardenStore((s) => s.setAudioSource);
  const { startFile, startMicrophone, startDemo, stop, audioData, resumeContext, isUploading } = useAudioEngine();
  const initialized = useRef(false);

  // Auto-start demo on first load
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      startDemo();
    }
  }, [startDemo]);

  // Handle play/pause
  useEffect(() => {
    if (!isPlaying) {
      stop();
    } else if (!audioSource) {
      setIsPlaying(false);
    }
  }, [isPlaying, audioSource, stop, setIsPlaying]);

  // Handle source changes
  useEffect(() => {
    if (!isPlaying) return;
    if (audioSource === 'demo') {
      startDemo();
    }
  }, [audioSource, isPlaying, startDemo]);

  // Unlock audio context on first user interaction (critical for mobile)
  const unlockAudio = useCallback(() => {
    resumeContext();
  }, [resumeContext]);

  const handleUpload = useCallback(async (file: File) => {
    setAudioSource('file');
    setCurrentSong({ name: file.name, size: file.size });
    setIsPlaying(true);
    await startFile(file);
  }, [setAudioSource, setCurrentSong, setIsPlaying, startFile]);

  const handleRemoveSong = useCallback(async () => {
    await stop();
    setCurrentSong(null);
    setAudioSource(null);
    setIsPlaying(false);
  }, [stop, setCurrentSong, setAudioSource, setIsPlaying]);

  return (
    <div
      style={{
        width: '100%',
        height: '100dvh',
        position: 'relative',
        background: '#020205',
        overflow: 'hidden',
      }}
      onTouchStart={unlockAudio}
      onClick={unlockAudio}
    >
      <PixelWorld audioData={audioData} />

      {!posterMode && (
        <UI
          isUploading={isUploading}
          onUpload={handleUpload}
          onMicrophone={async () => {
            setAudioSource('microphone');
            setCurrentSong(null);
            setIsPlaying(true);
            await startMicrophone();
          }}
          onDemo={async () => {
            setAudioSource('demo');
            setCurrentSong(null);
            setIsPlaying(true);
            await startDemo();
          }}
          onPauseResume={() => setIsPlaying(!isPlaying)}
          onReset={async () => {
            await stop();
            setIsPlaying(false);
            setAudioSource(null);
            setCurrentSong(null);
          }}
          onRemoveSong={handleRemoveSong}
        />
      )}

      <PosterMode />
    </div>
  );
}

export default App;
