import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { AudioData } from '../types';

export default function Flowers({ audioData, colors }: { audioData: AudioData; colors: any }) {
  const groupRef = useRef<THREE.Group>(null);
  const flowerRefs = useRef<THREE.Group[]>([]);

  const flowers = useMemo(() => {
    const items: {
      position: [number, number, number];
      scale: number;
      color: string;
      petalCount: number;
      speed: number;
    }[] = [];

    const positions = [
      [0, 4.2, 0],
      [1.2, 3.8, 0.8],
      [-1.0, 3.5, -0.6],
      [0.6, 2.8, -1.2],
      [-0.8, 3.2, 1.0],
      [1.5, 2.5, -0.3],
      [-1.3, 2.2, 0.5],
      [0.3, 3.8, 1.3],
      [-0.5, 4.0, -0.8],
      [1.0, 3.0, 1.0],
    ];

    positions.forEach((pos, i) => {
      items.push({
        position: pos as [number, number, number],
        scale: 0.15 + Math.random() * 0.15,
        color: i % 3 === 0 ? colors.primary : i % 3 === 1 ? colors.secondary : colors.accent,
        petalCount: 5 + Math.floor(Math.random() * 4),
        speed: 0.5 + Math.random() * 1.5,
      });
    });
    return items;
  }, [colors]);

  useFrame((_, delta) => {
    // Treble triggers bloom size
    const bloomScale = 1 + audioData.treble * 2.5;

    flowerRefs.current.forEach((group, i) => {
      if (!group) return;
      const flower = flowers[i];
      if (!flower) return;

      const individualPulse = Math.sin(performance.now() * 0.001 * flower.speed + i) * 0.1;
      const targetScale = flower.scale * bloomScale + individualPulse;
      group.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.05);

      // Rotate slowly
      group.rotation.y += delta * flower.speed * 0.2;
    });
  });

  return (
    <group ref={groupRef}>
      {flowers.map((flower, i) => (
        <group key={i} position={flower.position} ref={(el) => { if (el) flowerRefs.current[i] = el; }}>
          {/* Petals */}
          {Array.from({ length: flower.petalCount }).map((_, j) => {
            const angle = (j / flower.petalCount) * Math.PI * 2;
            const px = Math.cos(angle) * 0.3;
            const pz = Math.sin(angle) * 0.3;
            return (
              <mesh key={j} position={[px, 0, pz]} rotation={[0.3, angle, 0]}>
                <coneGeometry args={[0.12, 0.4, 4]} />
                <meshStandardMaterial
                  color={flower.color}
                  emissive={flower.color}
                  emissiveIntensity={0.6 + audioData.treble * 1.5}
                  transparent
                  opacity={0.8}
                  side={THREE.DoubleSide}
                />
              </mesh>
            );
          })}
          {/* Center */}
          <mesh>
            <sphereGeometry args={[0.08, 16, 16]} />
            <meshStandardMaterial
              color={colors.accent}
              emissive={colors.accent}
              emissiveIntensity={1 + audioData.treble * 2}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}
