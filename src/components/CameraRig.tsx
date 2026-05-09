import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

export default function CameraRig({ motion }: { motion: number }) {
  const { camera } = useThree();
  const time = useRef(0);
  const basePos = useRef(new THREE.Vector3(0, 4, 12));

  useFrame((_, delta) => {
    time.current += delta;
    const t = time.current;
    const m = motion;

    // Slow cinematic drift around the garden
    const x = Math.sin(t * 0.08 * m) * 4 * m;
    const z = 12 + Math.cos(t * 0.06 * m) * 3 * m;
    const y = 4 + Math.sin(t * 0.04 * m) * 1.5 * m;

    camera.position.lerp(
      new THREE.Vector3(basePos.current.x + x, y, z),
      0.015
    );
    camera.lookAt(0, 1.5, 0);
  });

  return null;
}
