import { useRef, useState, useCallback, useEffect } from 'react';
import { useGardenStore } from '../store';
import { BIOMES } from '../types';
import type { BiomeName } from '../types';

interface UIProps {
  onUpload: (file: File) => void;
  onMicrophone: () => void;
  onDemo: () => void;
  onPauseResume: () => void;
  onReset: () => void;
  onRemoveSong: () => void;
  isUploading: boolean;
}

export default function UI({ onUpload, onMicrophone, onDemo, onPauseResume, onReset, onRemoveSong, isUploading }: UIProps) {
  const [uiVisible, setUiVisible] = useState(true);
  const [panelVisible, setPanelVisible] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'audio' | 'visuals'>('audio');
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showHint, setShowHint] = useState(true);

  const {
    audioSource,
    isPlaying,
    settings,
    currentBiome,
    currentSong,
    error,
    updateSettings,
    setBiome,
    setPosterMode,
  } = useGardenStore();

  useEffect(() => {
    const t = setTimeout(() => setShowHint(false), 4000);
    return () => clearTimeout(t);
  }, []);

  const hideAll = useCallback(() => {
    setPanelVisible(false);
    setUiVisible(false);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
  }, []);

  const showAll = useCallback(() => {
    setUiVisible(true);
    setPanelVisible(true);
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
    e.target.value = '';
  }, [onUpload]);

  const resetHideTimer = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    if (panelVisible && uiVisible) {
      hideTimerRef.current = setTimeout(() => {
        hideAll();
      }, 8000);
    }
  }, [panelVisible, uiVisible, hideAll]);

  useEffect(() => {
    resetHideTimer();
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [panelVisible, uiVisible, resetHideTimer]);

  if (!uiVisible) {
    return (
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 10,
          pointerEvents: 'auto',
          cursor: 'default',
        }}
        onClick={showAll}
        onTouchStart={showAll}
      >
        <div
          style={{
            position: 'absolute',
            top: 'max(12px, env(safe-area-inset-top))',
            left: 'max(12px, env(safe-area-inset-left))',
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: 'rgba(0, 240, 255, 0.25)',
            boxShadow: '0 0 8px rgba(0, 240, 255, 0.2)',
            pointerEvents: 'none',
            zIndex: 30,
          }}
        />
      </div>
    );
  }

  return (
    <div className="ui-overlay">
      <button
        className="ui-toggle"
        onClick={() => {
          if (panelVisible) hideAll();
          else showAll();
        }}
        title={panelVisible ? 'Hide everything' : 'Show UI'}
      >
        {panelVisible ? '✕' : '☰'}
      </button>

      {showHint && panelVisible && (
        <div className="ui-hint">
          Tap ✕ to hide all UI and view fullscreen
        </div>
      )}

      <div
        className={`ui-panel ${panelVisible ? '' : 'hidden'}`}
        onMouseMove={resetHideTimer}
        onTouchMove={resetHideTimer}
        onClick={resetHideTimer}
      >
        <div className="ui-title">Audio-Reactive Pixel World</div>
        <div className="ui-subtitle">Grow a world from sound.</div>

        {/* Biome Switcher */}
        <div className="ui-section">
          <span className="ui-label">World</span>
          <div className="ui-btn-row biome-row">
            {(Object.keys(BIOMES) as BiomeName[]).map((name) => (
              <button
                key={name}
                className={`ui-btn biome-btn ${currentBiome === name ? 'active' : ''}`}
                onClick={() => setBiome(name)}
                title={BIOMES[name].name}
              >
                {BIOMES[name].name}
              </button>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="ui-section">
          <div className="ui-btn-row">
            <button className={`ui-btn tab-btn ${activeTab === 'audio' ? 'active' : ''}`} onClick={() => setActiveTab('audio')}>
              Audio
            </button>
            <button className={`ui-btn tab-btn ${activeTab === 'visuals' ? 'active' : ''}`} onClick={() => setActiveTab('visuals')}>
              Visuals
            </button>
          </div>
        </div>

        {activeTab === 'audio' && (
          <>
            <div className="ui-section">
              <span className="ui-label">Audio Source</span>
              <div className="ui-btn-row">
                <button
                  className={`ui-btn ${audioSource === 'file' ? 'active' : ''}`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  Upload Song
                </button>
                <button
                  className={`ui-btn ${audioSource === 'microphone' ? 'active' : ''}`}
                  onClick={onMicrophone}
                >
                  Mic
                </button>
                <button
                  className={`ui-btn ${audioSource === 'demo' ? 'active' : ''}`}
                  onClick={onDemo}
                >
                  Demo
                </button>
              </div>
              <input ref={fileInputRef} type="file" accept="audio/*" style={{ display: 'none' }} onChange={handleFileChange} />
            </div>

            {/* Current Song Info */}
            {currentSong && (
              <div className="ui-section">
                <span className="ui-label">Now Playing</span>
                <div className="song-info">
                  <span className="song-name">{currentSong.name}</span>
                  <button className="song-remove" onClick={onRemoveSong} title="Remove song">
                    ✕
                  </button>
                </div>
              </div>
            )}

            <div className="ui-section">
              <div className="ui-btn-row">
                <button className="ui-btn" onClick={onPauseResume}>
                  {isPlaying ? '⏸ Pause' : '▶ Play'}
                </button>
                <button className="ui-btn danger" onClick={onReset}>
                  ↺ Reset
                </button>
                <button className="ui-btn" onClick={() => setPosterMode(true)}>
                  🖼 Poster
                </button>
              </div>
            </div>
          </>
        )}

        {activeTab === 'visuals' && (
          <>
            <div className="ui-section">
              <span className="ui-label">Sensitivity</span>
              <input
                className="ui-slider"
                type="range"
                min={0.1}
                max={3}
                step={0.1}
                value={settings.sensitivity}
                onChange={(e) => updateSettings({ sensitivity: parseFloat(e.target.value) })}
              />
            </div>

            <div className="ui-section">
              <span className="ui-label">Bloom / Glow</span>
              <input
                className="ui-slider"
                type="range"
                min={0}
                max={3}
                step={0.1}
                value={settings.bloom}
                onChange={(e) => updateSettings({ bloom: parseFloat(e.target.value) })}
              />
            </div>

            <div className="ui-section">
              <span className="ui-label">Growth Speed</span>
              <input
                className="ui-slider"
                type="range"
                min={0.1}
                max={2}
                step={0.1}
                value={settings.cameraMotion}
                onChange={(e) => updateSettings({ cameraMotion: parseFloat(e.target.value) })}
              />
            </div>

            <div className="ui-section">
              <span className="ui-label">Particles</span>
              <input
                className="ui-slider"
                type="range"
                min={0}
                max={2}
                step={0.1}
                value={settings.particleAmount}
                onChange={(e) => updateSettings({ particleAmount: parseFloat(e.target.value) })}
              />
            </div>
          </>
        )}
      </div>

      {error && <div className="error-toast">{error}</div>}

      {isUploading && (
        <div className="upload-overlay">
          <div className="spinner-wrap">
            <div className="spinner-ring outer" />
            <div className="spinner-ring middle" />
            <div className="spinner-ring inner" />
            <div className="spinner-glow" />
          </div>
          <div className="upload-title">DECODING AUDIO</div>
          <div className="upload-sub">Growing the world from sound...</div>
          <div className="wave-bars">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="wave-bar" style={{ animationDelay: `${i * 0.08}s` }} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
