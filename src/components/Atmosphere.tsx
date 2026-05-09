import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function Atmosphere({ color }: { color: string }) {
  const starsRef = useRef<THREE.Points>(null);
  const mistRef = useRef<THREE.Points>(null);

  const starCount = 800;
  const mistCount = 200;

  const starPositions = useMemo(() => {
    const arr = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 80;
      arr[i * 3 + 1] = Math.random() * 30 + 5;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 80;
    }
    return arr;
  }, []);

  const mistPositions = useMemo(() => {
    const arr = new Float32Array(mistCount * 3);
    for (let i = 0; i < mistCount; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 30;
      arr[i * 3 + 1] = Math.random() * 3;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 30;
    }
    return arr;
  }, []);

  useFrame(() => {
    if (mistRef.current) {
      mistRef.current.rotation.y += 0.0005;
    }
  });

  return (
    <group>
      {/* Stars */}
      <points ref={starsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[starPositions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          color="#ffffff"
          size={0.12}
          transparent
          opacity={0.6}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>

      {/* Mist */}
      <points ref={mistRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[mistPositions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          color={color}
          size={0.5}
          transparent
          opacity={0.08}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
    </group>
  );
}
