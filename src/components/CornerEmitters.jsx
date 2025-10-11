import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import useStore from "../core/store";

const COUNT = 400;

export default function CornerEmitters() {
  const audioEnabled = useStore((s) => s.audioEnabled);
  const audioFeatures = useStore((s) => s.audioFeatures);

  const geometryRef = useRef(new THREE.BufferGeometry());
  const positions = useMemo(() => new Float32Array(COUNT * 3), []);
  const colors = useMemo(() => new Float32Array(COUNT * 3), []);
  const materialRef = useRef(new THREE.PointsMaterial({ size: 0.04, transparent: true, opacity: 0 }));

  useEffect(() => {
    const geo = geometryRef.current;
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    materialRef.current.vertexColors = true;
  }, [positions, colors]);

  useEffect(() => {
    if (!audioEnabled || !audioFeatures?.events?.percussiveSpike) return;

    for (let i = 0; i < COUNT; i++) {
      const corner = i % 4;
      const base = [corner < 2 ? -6 : 6, corner % 2 ? -2.5 : 2.5, -2.5];
      positions[i * 3 + 0] = base[0] + (Math.random() - 0.5) * 0.8;
      positions[i * 3 + 1] = base[1] + (Math.random() - 0.5) * 0.8;
      positions[i * 3 + 2] = base[2] + Math.random() * 0.5;
      colors[i * 3 + 0] = 1;
      colors[i * 3 + 1] = 1;
      colors[i * 3 + 2] = 1;
    }

    const geo = geometryRef.current;
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;

    materialRef.current.opacity = 0.6 + 0.4 * (audioFeatures.vizAttributes?.particleActivity || 0);
    const id = setInterval(() => {
      materialRef.current.opacity = Math.max(0, materialRef.current.opacity - 0.1);
    }, 50);
    return () => clearInterval(id);
  }, [audioEnabled, audioFeatures?.events?.percussiveSpike]);

  return <points geometry={geometryRef.current} material={materialRef.current} position={[0, 0, 2.4]} />;
}
