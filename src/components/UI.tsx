import { useRef, useState, useCallback } from 'react';
import { useGardenStore } from '../store';
import { PRESETS } from '../types';
import type { PresetName } from '../types';

interface UIProps {
  onUpload: (file: File) => void;
  onMicrophone: () => void;
  onDemo: () => void;
  onPauseResume: () => void;
  onReset: () => void;
}

export default function UI({ onUpload, onMicrophone, onDemo, onPauseResume, onReset }: UIProps) {
  const [visible, setVisible] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'audio' | 'visuals'>('audio');

  const {
    audioSource,
    isPlaying,
    settings,
    currentPreset,
    error,
    updateSettings,
    setPreset,
    setPosterMode,
  } = useGardenStore();

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
    e.target.value = '';
  }, [onUpload]);

  return (
    <>
      <button
        className="ui-toggle"
        onClick={() => setVisible(!visible)}
        title={visible ? 'Hide UI' : 'Show UI'}
        aria-label={visible ? 'Hide UI' : 'Show UI'}
      >
        {visible ? '✕' : '☰'}
      </button>

      <div className={`ui-panel ${visible ? '' : 'hidden'}`}>
        <div className="ui-title">Audio-Reactive Cyber Garden</div>
        <div className="ui-subtitle">Grow a living digital ecosystem from sound.</div>

        {/* Tabs for mobile organization */}
        <div className="ui-section">
          <div className="ui-btn-row">
            <button
              className={`ui-btn ${activeTab === 'audio' ? 'active' : ''}`}
              onClick={() => setActiveTab('audio')}
              style={{ flex: 1 }}
            >
              Audio
            </button>
            <button
              className={`ui-btn ${activeTab === 'visuals' ? 'active' : ''}`}
              onClick={() => setActiveTab('visuals')}
              style={{ flex: 1 }}
            >
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
                  Microphone
                </button>
                <button
                  className={`ui-btn ${audioSource === 'demo' ? 'active' : ''}`}
                  onClick={onDemo}
                >
                  Demo Mode
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
            </div>

            <div className="ui-section">
              <div className="ui-btn-row">
                <button className="ui-btn" onClick={onPauseResume}>
                  {isPlaying ? '⏸ Pause' : '▶ Resume'}
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
                aria-label="Sensitivity"
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
                aria-label="Bloom"
              />
            </div>

            <div className="ui-section">
              <span className="ui-label">Camera Motion</span>
              <input
                className="ui-slider"
                type="range"
                min={0}
                max={2}
                step={0.1}
                value={settings.cameraMotion}
                onChange={(e) => updateSettings({ cameraMotion: parseFloat(e.target.value) })}
                aria-label="Camera Motion"
              />
            </div>

            <div className="ui-section">
              <span className="ui-label">Particle Amount</span>
              <input
                className="ui-slider"
                type="range"
                min={0.1}
                max={2}
                step={0.1}
                value={settings.particleAmount}
                onChange={(e) => updateSettings({ particleAmount: parseFloat(e.target.value) })}
                aria-label="Particle Amount"
              />
            </div>

            <div className="ui-section">
              <span className="ui-label">Colour Presets</span>
              <div className="ui-btn-row">
                {(Object.keys(PRESETS) as PresetName[]).map((name) => (
                  <button
                    key={name}
                    className={`ui-btn preset-btn ${currentPreset === name ? 'active' : ''}`}
                    onClick={() => setPreset(name)}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {error && <div className="error-toast">{error}</div>}
    </>
  );
}
