import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { AudioData } from '../types';

export default function Butterflies({ audioData, color }: { audioData: AudioData; color: string }) {
  const groupRef = useRef<THREE.Group>(null);
  const time = useRef(0);

  const butterflies = useMemo(() => {
    const items: {
      position: THREE.Vector3;
      speed: number;
      radius: number;
      height: number;
      phase: number;
      wingSpeed: number;
    }[] = [];
    for (let i = 0; i < 6; i++) {
      items.push({
        position: new THREE.Vector3((Math.random() - 0.5) * 8, 2 + Math.random() * 4, (Math.random() - 0.5) * 8),
        speed: 0.3 + Math.random() * 0.5,
        radius: 2 + Math.random() * 4,
        height: 2 + Math.random() * 3,
        phase: Math.random() * Math.PI * 2,
        wingSpeed: 8 + Math.random() * 6,
      });
    }
    return items;
  }, []);

  useFrame((_, delta) => {
    time.current += delta;
    if (!groupRef.current) return;

    // Only show butterflies prominently on high treble
    const trebleBoost = Math.max(0, audioData.treble - 0.15) * 3;

    groupRef.current.children.forEach((child, i) => {
      const b = butterflies[i];
      if (!b) return;

      const t = time.current * b.speed + b.phase;
      child.position.x = Math.cos(t) * b.radius;
      child.position.z = Math.sin(t) * b.radius;
      child.position.y = b.height + Math.sin(t * 2) * 0.5;
      child.rotation.y = -t + Math.PI / 2;

      // Wing flap
      const wingFlap = Math.sin(time.current * b.wingSpeed * (1 + trebleBoost));
      const scale = Math.max(0.1, trebleBoost);
      child.scale.setScalar(scale);

      // Animate wings (child children)
      child.children.forEach((wing, wi) => {
        if (wi < 2) {
          wing.rotation.y = wingFlap * 0.8 * (wi === 0 ? 1 : -1);
        }
      });
    });
  });

  return (
    <group ref={groupRef}>
      {butterflies.map((_, i) => (
        <group key={i}>
          {/* Left wing */}
          <mesh position={[-0.1, 0, 0]} rotation={[0, 0, 0.2]}>
            <planeGeometry args={[0.4, 0.3]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={2}
              transparent
              opacity={0.8}
              side={THREE.DoubleSide}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
          {/* Right wing */}
          <mesh position={[0.1, 0, 0]} rotation={[0, 0, -0.2]}>
            <planeGeometry args={[0.4, 0.3]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={2}
              transparent
              opacity={0.8}
              side={THREE.DoubleSide}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
          {/* Body */}
          <mesh>
            <sphereGeometry args={[0.02, 8, 8]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={3} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
