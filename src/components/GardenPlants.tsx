import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { AudioData } from '../types';

export default function GardenPlants({ audioData, colors }: { audioData: AudioData; colors: any }) {
  const groupRef = useRef<THREE.Group>(null);

  const plants = useMemo(() => {
    const items: {
      position: [number, number, number];
      height: number;
      curve: THREE.CatmullRomCurve3;
      radius: number;
      color: string;
    }[] = [];

    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + Math.random() * 0.5;
      const dist = 3 + Math.random() * 4;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      const height = 0.8 + Math.random() * 1.5;
      const bend = 0.3 + Math.random() * 0.5;

      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(x, 0, z),
        new THREE.Vector3(x + (Math.random() - 0.5) * bend, height * 0.5, z + (Math.random() - 0.5) * bend),
        new THREE.Vector3(x + (Math.random() - 0.5) * bend * 2, height, z + (Math.random() - 0.5) * bend * 2),
      ]);

      items.push({
        position: [x, 0, z],
        height,
        curve,
        radius: 0.03 + Math.random() * 0.04,
        color: Math.random() > 0.5 ? colors.primary : colors.secondary,
      });
    }
    return items;
  }, [colors]);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.children.forEach((child, i) => {
        const plant = plants[i];
        if (!plant) return;
        // Low mids control height / sway
        const sway = Math.sin(performance.now() * 0.001 + i) * 0.02 * (1 + audioData.lowMids * 3);
        child.rotation.z = sway;
        child.rotation.x = sway * 0.6;
        const scaleY = 1 + audioData.lowMids * 0.4;
        child.scale.y = scaleY;
      });
    }
  });

  return (
    <group ref={groupRef}>
      {plants.map((plant, i) => (
        <mesh key={i} position={plant.position}>
          <tubeGeometry args={[plant.curve, 16, plant.radius, 6, false]} />
          <meshStandardMaterial
            color={plant.color}
            emissive={plant.color}
            emissiveIntensity={0.3 + audioData.lowMids * 0.5}
            transparent
            opacity={0.75}
          />
        </mesh>
      ))}
    </group>
  );
}
