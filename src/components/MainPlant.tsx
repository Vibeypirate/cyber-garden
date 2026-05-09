import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { AudioData } from '../types';

function createBranchCurve(start: THREE.Vector3, end: THREE.Vector3, bend: number): THREE.CatmullRomCurve3 {
  const mid = new THREE.Vector3().lerpVectors(start, end, 0.5);
  mid.x += (Math.random() - 0.5) * bend;
  mid.z += (Math.random() - 0.5) * bend;
  return new THREE.CatmullRomCurve3([start, mid, end]);
}

interface MainPlantProps {
  audioData: AudioData;
  primaryColor: string;
  secondaryColor: string;
}

export default function MainPlant({ audioData, primaryColor, secondaryColor }: MainPlantProps) {
  const groupRef = useRef<THREE.Group>(null);
  const stemRefs = useRef<THREE.Mesh[]>([]);
  const time = useRef(0);

  const branches = useMemo(() => {
    const items: { curve: THREE.CatmullRomCurve3; radius: number; height: number; color: string }[] = [];

    // Main trunk
    const trunkHeight = 4;
    items.push({
      curve: createBranchCurve(
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, trunkHeight, 0),
        0.2
      ),
      radius: 0.15,
      height: trunkHeight,
      color: primaryColor,
    });

    // Primary branches
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      const height = 2.5 + Math.random() * 1.5;
      const spread = 1.5 + Math.random();
      items.push({
        curve: createBranchCurve(
          new THREE.Vector3(0, 1.5 + Math.random() * 1.5, 0),
          new THREE.Vector3(Math.cos(angle) * spread, height, Math.sin(angle) * spread),
          1.2
        ),
        radius: 0.06 + Math.random() * 0.04,
        height,
        color: i % 2 === 0 ? primaryColor : secondaryColor,
      });
    }

    // Secondary branches
    for (let i = 0; i < 10; i++) {
      const angle = Math.random() * Math.PI * 2;
      const height = 1.5 + Math.random() * 2;
      const spread = 0.8 + Math.random() * 1.2;
      items.push({
        curve: createBranchCurve(
          new THREE.Vector3((Math.random() - 0.5) * 0.5, 1 + Math.random() * 2, (Math.random() - 0.5) * 0.5),
          new THREE.Vector3(Math.cos(angle) * spread, height, Math.sin(angle) * spread),
          0.8
        ),
        radius: 0.02 + Math.random() * 0.03,
        height,
        color: Math.random() > 0.5 ? primaryColor : secondaryColor,
      });
    }

    return items;
  }, [primaryColor, secondaryColor]);

  useFrame((_, delta) => {
    time.current += delta;
    const sway = Math.sin(time.current * 0.5) * 0.02 * (1 + audioData.lowMids * 2);

    if (groupRef.current) {
      groupRef.current.rotation.z = sway;
      groupRef.current.rotation.x = sway * 0.5;
    }

    // Pulse stem thickness with bass
    stemRefs.current.forEach((mesh) => {
      if (mesh) {
        const pulse = 1 + audioData.bass * 0.5;
        mesh.scale.setScalar(1 + (pulse - 1) * 0.3);
      }
    });
  });

  return (
    <group ref={groupRef}>
      {branches.map((branch, i) => (
        <mesh key={i} ref={(el) => { if (el) stemRefs.current[i] = el; }}>
          <tubeGeometry args={[branch.curve, 32, branch.radius, 8, false]} />
          <meshStandardMaterial
            color={branch.color}
            emissive={branch.color}
            emissiveIntensity={0.4 + audioData.bass * 0.6}
            transparent
            opacity={0.85}
          />
        </mesh>
      ))}

      {/* Glowing central orb */}
      <mesh position={[0, 3.5, 0]}>
        <sphereGeometry args={[0.3 + audioData.bass * 0.2, 32, 32]} />
        <meshStandardMaterial
          color={primaryColor}
          emissive={primaryColor}
          emissiveIntensity={1 + audioData.bass * 2}
          transparent
          opacity={0.7}
        />
      </mesh>
    </group>
  );
}
