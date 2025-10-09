import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import useStore from "../core/store";

export default function AudioReactiveChromaColumns() {
  const groupRef = useRef();
  const audioEnabled = useStore((s) => s.audioEnabled);
  const audioFeatures = useStore((s) => s.audioFeatures);

  const materials = useMemo(
    () =>
      Array.from({ length: 12 }).map((_, i) =>
        new THREE.MeshStandardMaterial({
          color: new THREE.Color().setHSL(i / 12, 0.7, 0.5),
          transparent: true,
          opacity: 0.6,
        })
      ),
    []
  );

  useFrame(() => {
    if (!audioEnabled || !audioFeatures || !groupRef.current) return;
    const { bands, vizAttributes } = audioFeatures;
    const mid = (bands.lowground + bands.highground) / 2;

    groupRef.current.children.forEach((mesh) => {
      const targetY = 0.25 + 2.5 * mid;
      mesh.scale.y = THREE.MathUtils.lerp(mesh.scale.y, targetY, 0.2);
    });

    const opacity = 0.5 + 0.5 * (vizAttributes?.rectangleContiguity ?? 0);
    materials.forEach((m) => (m.opacity = opacity));
  });

  return (
    <group ref={groupRef} position={[0, 0, -2]}>
      {Array.from({ length: 12 }).map((_, i) => (
        <mesh key={i} position={[i - 5.5, 0, 0]} scale={[0.6, 0.25, 0.1]} material={materials[i]}>
          <boxGeometry args={[1, 1, 0.2]} />
        </mesh>
      ))}
    </group>
  );
}
