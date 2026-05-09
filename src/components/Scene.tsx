import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { AudioData, PresetName } from '../types';
import { PRESETS } from '../types';
import { useGardenStore } from '../store';
import CameraRig from './CameraRig';
import Ground from './Ground';
import MainPlant from './MainPlant';
import Roots from './Roots';
import GardenPlants from './GardenPlants';
import Flowers from './Flowers';
import Pollen from './Pollen';
import Butterflies from './Butterflies';
import Atmosphere from './Atmosphere';

interface SceneProps {
  audioData: AudioData;
  preset: PresetName;
  isMobile: boolean;
}

export default function Scene({ audioData, preset, isMobile }: SceneProps) {
  const settings = useGardenStore((s) => s.settings);
  const colors = PRESETS[preset].colors;
  const groupRef = useRef<THREE.Group>(null);

  // Smooth time-based idle motion even without audio
  const timeRef = useRef(0);
  useFrame((_, delta) => {
    timeRef.current += delta;
    if (groupRef.current) {
      // Very subtle idle sway
      groupRef.current.rotation.y = Math.sin(timeRef.current * 0.05) * 0.02;
    }
  });

  // Scale audio values by sensitivity
  const scaled = useMemo(() => ({
    bass: audioData.bass * settings.sensitivity,
    lowMids: audioData.lowMids * settings.sensitivity,
    highMids: audioData.highMids * settings.sensitivity,
    treble: audioData.treble * settings.sensitivity,
    average: audioData.average * settings.sensitivity,
  }), [audioData, settings.sensitivity]);

  // Reduce particle counts on mobile for performance
  const mobileParticleAmount = isMobile ? settings.particleAmount * 0.5 : settings.particleAmount;

  return (
    <group ref={groupRef}>
      <ambientLight intensity={0.15} color={colors.primary} />
      <directionalLight position={[5, 10, 5]} intensity={0.3} color={colors.secondary} />
      <pointLight position={[0, 3, 0]} intensity={1.5} color={colors.primary} distance={20} />
      <pointLight position={[-5, 2, -5]} intensity={0.8} color={colors.accent} distance={15} />
      <pointLight position={[5, 1, 5]} intensity={0.6} color={colors.secondary} distance={15} />

      <CameraRig motion={settings.cameraMotion} />
      <Ground color={colors.ground} pulse={scaled.bass} />
      <MainPlant
        audioData={scaled}
        primaryColor={colors.primary}
        secondaryColor={colors.secondary}
      />
      <Roots audioData={scaled} color={colors.primary} />
      <GardenPlants audioData={scaled} colors={colors} />
      <Flowers audioData={scaled} colors={colors} />
      <Pollen amount={mobileParticleAmount} audioData={scaled} color={colors.accent} />
      <Butterflies audioData={scaled} color={colors.accent} />
      <Atmosphere color={colors.background} isMobile={isMobile} />
    </group>
  );
}
