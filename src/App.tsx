import { useEffect, Suspense, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { useGardenStore } from './store';
import { useAudioEngine } from './hooks/useAudioEngine';
import Scene from './components/Scene';
import UI from './components/UI';
import PosterMode from './components/PosterMode';

function App() {
  const audioSource = useGardenStore((s) => s.audioSource);
  const isPlaying = useGardenStore((s) => s.isPlaying);
  const currentPreset = useGardenStore((s) => s.currentPreset);
  const posterMode = useGardenStore((s) => s.posterMode);
  const setIsPlaying = useGardenStore((s) => s.setIsPlaying);
  const { startFile, startMicrophone, startDemo, stop, audioData } = useAudioEngine();
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

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', background: '#020205' }}>
      <Canvas
        camera={{ position: [0, 4, 12], fov: 55, near: 0.1, far: 200 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        style={{ position: 'absolute', inset: 0 }}
      >
        <color attach="background" args={['#020205']} />
        <fog attach="fog" args={['#020205', 15, 60]} />
        <Suspense fallback={null}>
          <Scene audioData={audioData} preset={currentPreset} />
          <EffectComposer>
            <Bloom
              luminanceThreshold={0.2}
              luminanceSmoothing={0.8}
              intensity={1.2}
              mipmapBlur
            />
          </EffectComposer>
        </Suspense>
      </Canvas>

      {!posterMode && (
        <UI
          onUpload={async (file) => {
            useGardenStore.getState().setAudioSource('file');
            useGardenStore.getState().setIsPlaying(true);
            await startFile(file);
          }}
          onMicrophone={async () => {
            useGardenStore.getState().setAudioSource('microphone');
            useGardenStore.getState().setIsPlaying(true);
            await startMicrophone();
          }}
          onDemo={async () => {
            useGardenStore.getState().setAudioSource('demo');
            useGardenStore.getState().setIsPlaying(true);
            await startDemo();
          }}
          onPauseResume={() => setIsPlaying(!isPlaying)}
          onReset={async () => {
            await stop();
            setIsPlaying(false);
            useGardenStore.getState().setAudioSource(null);
          }}
        />
      )}

      <PosterMode />
    </div>
  );
}

export default App;
