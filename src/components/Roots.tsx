import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { AudioData } from '../types';

export default function Roots({ audioData, color }: { audioData: AudioData; color: string }) {
  const groupRef = useRef<THREE.Group>(null);
  const time = useRef(0);

  const roots = useMemo(() => {
    const items: { curve: THREE.CatmullRomCurve3; radius: number }[] = [];
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      const length = 2 + Math.random() * 4;
      const spread = length * 0.7;
      const points: THREE.Vector3[] = [
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(
          Math.cos(angle) * spread * 0.4,
          -0.3 - Math.random() * 0.5,
          Math.sin(angle) * spread * 0.4
        ),
        new THREE.Vector3(
          Math.cos(angle) * spread,
          -0.1 - Math.random() * 0.3,
          Math.sin(angle) * spread
        ),
      ];
      items.push({
        curve: new THREE.CatmullRomCurve3(points),
        radius: 0.04 + Math.random() * 0.06,
      });
    }
    return items;
  }, []);

  useFrame((_, delta) => {
    time.current += delta;
    if (groupRef.current) {
      // Subtle root pulse with bass
      const pulse = 1 + audioData.bass * 0.3;
      groupRef.current.scale.setScalar(pulse);
    }
  });

  return (
    <group ref={groupRef} position={[0, -0.2, 0]}>
      {roots.map((root, i) => (
        <mesh key={i}>
          <tubeGeometry args={[root.curve, 24, root.radius, 6, false]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.3 + audioData.bass * 0.5}
            transparent
            opacity={0.7}
          />
        </mesh>
      ))}
    </group>
  );
}
