import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function Ground({ color, pulse }: { color: string; pulse: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);

  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(60, 60, 64, 64);
    geo.rotateX(-Math.PI / 2);
    return geo;
  }, []);

  useFrame(() => {
    if (materialRef.current) {
      materialRef.current.emissiveIntensity = 0.1 + pulse * 0.4;
    }
    if (meshRef.current) {
      const pos = meshRef.current.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const z = pos.getZ(i);
        const dist = Math.sqrt(x * x + z * z);
        const wave = Math.sin(dist * 0.5 - performance.now() * 0.001) * 0.1;
        pos.setY(i, wave + Math.max(0, (1 - dist / 8) * pulse * 0.3));
      }
      pos.needsUpdate = true;
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry} receiveShadow position={[0, -0.5, 0]}>
      <meshStandardMaterial
        ref={materialRef}
        color={color}
        emissive={color}
        emissiveIntensity={0.1}
        roughness={0.8}
        metalness={0.3}
        transparent
        opacity={0.9}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
