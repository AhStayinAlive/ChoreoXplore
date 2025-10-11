import { useMemo, useRef } from "react";
import * as THREE from "three";

export type StageEffect = {
  vertexShader: string;
  fragmentShader: string;
  uniforms?: Record<string, THREE.IUniform<any>>;
};

export type CommonUniforms = {
  uTime: number; uDelta: number;
  uPointer: [number, number]; uPointerVel: [number, number];
  uJoints: Float32Array; uBodySpeed: number; uExpand: number; uAccent: number;
  uMusicReactivity: number; uMotionReactivity: number;
};

export function useStageShader(effect: StageEffect) {
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);

  const material = useMemo(() => {
    const uniforms: Record<string, THREE.IUniform<any>> = {
      uTime: { value: 0 }, uDelta: { value: 0 },
      uPointer: { value: new THREE.Vector2(0.5, 0.5) },
      uPointerVel: { value: new THREE.Vector2(0, 0) },
      uBodySpeed: { value: 0 }, uExpand: { value: 0 }, uAccent: { value: 0 },
      uMusicReactivity: { value: 0.9 }, uMotionReactivity: { value: 0.9 },
      uJoints: { value: new Float32Array(66) },
      ...(effect.uniforms ?? {})
    };

    const mat = new THREE.ShaderMaterial({
      vertexShader: effect.vertexShader,
      fragmentShader: effect.fragmentShader,
      uniforms, transparent: true
    });

    materialRef.current = mat;
    return mat;
  }, [effect]);

  function setUniforms(u: Partial<CommonUniforms>) {
    const mat = materialRef.current; if (!mat) return;
    const uni = mat.uniforms as any;
    for (const k in u) {
      if (!uni[k]) continue;
      const next = (u as any)[k];
      if (uni[k].value?.set && Array.isArray(next)) {
        uni[k].value.set(...next);
      } else if (uni[k].value instanceof Float32Array && next instanceof Float32Array) {
        uni[k].value.set(next);
      } else {
        uni[k].value = next;
      }
    }
  }

  return { material, setUniforms, materialRef };
}
