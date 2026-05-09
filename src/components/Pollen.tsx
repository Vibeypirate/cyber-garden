import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { AudioData } from '../types';

export default function Pollen({ amount, audioData, color }: { amount: number; audioData: AudioData; color: string }) {
  const pointsRef = useRef<THREE.Points>(null);
  const count = Math.floor(400 * amount);

  const { positions, velocities } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 1] = Math.random() * 8;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 20;
      vel[i * 3] = (Math.random() - 0.5) * 0.01;
      vel[i * 3 + 1] = Math.random() * 0.005 + 0.002;
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.01;
    }
    return { positions: pos, velocities: vel };
  }, [count]);

  useFrame(() => {
    if (!pointsRef.current) return;
    const posArray = pointsRef.current.geometry.attributes.position.array as Float32Array;

    // Treble triggers burst of upward motion
    const burst = audioData.treble * 0.05;

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      posArray[idx] += velocities[idx] + Math.sin(performance.now() * 0.001 + i) * 0.002;
      posArray[idx + 1] += velocities[idx + 1] + burst;
      posArray[idx + 2] += velocities[idx + 2] + Math.cos(performance.now() * 0.001 + i) * 0.002;

      // Wrap around
      if (posArray[idx + 1] > 10) posArray[idx + 1] = 0;
      if (posArray[idx] > 10) posArray[idx] = -10;
      if (posArray[idx] < -10) posArray[idx] = 10;
      if (posArray[idx + 2] > 10) posArray[idx + 2] = -10;
      if (posArray[idx + 2] < -10) posArray[idx + 2] = 10;
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        color={color}
        size={0.08}
        transparent
        opacity={0.6}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}
