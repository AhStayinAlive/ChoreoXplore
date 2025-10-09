import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import useStore from "../core/store";

export default function StarLayer() {
  const meshRef = useRef();
  const audioEnabled = useStore((s) => s.audioEnabled);
  const audioFeatures = useStore((s) => s.audioFeatures);

  const geo = useMemo(() => new THREE.RingGeometry(0.2, 0.5, 8, 1), []);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.6, color: 0xffffff }), []);

  useFrame(() => {
    if (!audioEnabled || !audioFeatures || !meshRef.current) return;
    const s = 0.5 + 2.0 * (audioFeatures.vizAttributes?.starProminence ?? 0);
    const lerped = THREE.MathUtils.lerp(meshRef.current.scale.x || 1, s, 0.2);
    meshRef.current.scale.setScalar(lerped);
    mat.opacity = 0.4 + 0.6 * (audioFeatures.vizAttributes?.starProminence ?? 0);
  });

  return <mesh ref={meshRef} geometry={geo} material={mat} position={[0, 0, -1.5]} />;
}
