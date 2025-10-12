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
      // Canonical names used by our pipeline
      uTime: { value: 0 }, uDelta: { value: 0 },
      uPointer: { value: new THREE.Vector2(0.5, 0.5) },
      uPointerVel: { value: new THREE.Vector2(0, 0) },
      uBodySpeed: { value: 0 }, uExpand: { value: 0 }, uAccent: { value: 0 },
      uMusicReactivity: { value: 0.9 }, uMotionReactivity: { value: 0.9 },
      uJoints: { value: new Float32Array(66) },

      // Common aliases expected by many GLSL repos (Shadertoy-style, etc.)
      iTime: { value: 0 },
      u_mouse: { value: new THREE.Vector2(0.5, 0.5) },
      iMouse: { value: new THREE.Vector2(0.5, 0.5) },
      u_resolution: { value: new THREE.Vector2(1, 1) },
      iResolution: { value: new THREE.Vector2(1, 1) },

      ...(effect.uniforms ?? {})
    };

    const mat = new THREE.ShaderMaterial({
      vertexShader: effect.vertexShader,
      fragmentShader: effect.fragmentShader,
      uniforms,
      transparent: true,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    mat.depthTest = false;
    mat.depthWrite = false;
    mat.fog = false;

    // Cursor overlay injector (no duplicate uniforms, uses vUv, GLSL1/3 safe)
    mat.onBeforeCompile = (shader) => {
      const is300 = /#\s*version\s+300\s+es/.test(shader.fragmentShader);
      let outVar = 'gl_FragColor';
      if (is300) {
        const m = shader.fragmentShader.match(/out\s+vec4\s+(\w+)\s*;/);
        outVar = (m && m[1]) ? m[1] : 'fragColor';
        if (!m) {
          shader.fragmentShader = shader.fragmentShader.replace(
            /precision.*?;\s*/s,
            s => s + '\nout vec4 fragColor;\n'
          );
        }
      }
      const WR = is300 ? outVar : 'gl_FragColor';

      // Only add uniforms if missing
      const needsUPointer = !/uniform\s+vec2\s+uPointer\s*;/.test(shader.fragmentShader);
      const needsUPointerVel = !/uniform\s+vec2\s+uPointerVel\s*;/.test(shader.fragmentShader);
      const needsUMotion = !/uniform\s+float\s+uMotionReactivity\s*;/.test(shader.fragmentShader);
      let header = '';
      if (needsUPointer) header += 'uniform vec2 uPointer;\n';
      if (needsUPointerVel) header += 'uniform vec2 uPointerVel;\n';
      if (needsUMotion) header += 'uniform float uMotionReactivity;\n';
      if (header) shader.fragmentShader = header + shader.fragmentShader;

      // Append bright ring overlay at end of main(), using vUv
      shader.fragmentShader = shader.fragmentShader.replace(
        /void\s+main\s*\(\s*\)\s*{([\s\S]*?)}/,
        (_, body) => `void main(){${body}
      vec2 cUv = vUv;
      float cRing = 1.0 - smoothstep(0.145, 0.155, distance(cUv, uPointer));
      float cVel  = clamp(length(uPointerVel) * 0.05, 0.0, 1.0);
      ${WR}.rgb += cRing * 0.85;
      ${WR}.rgb += vec3(cVel) * 0.25;
    }`
      );

      mat.needsUpdate = true;
    };

    materialRef.current = mat;
    return mat;
  }, [effect]);

  function setUniforms(u: Record<string, any>) {
    const mat = materialRef.current;
    if (!mat) return;
    const uni = mat.uniforms as any;

    for (const k in u) {
      if (!(k in uni)) continue;

      const src = (u as any)[k];
      const dst = uni[k].value;

      // Vector2/3/4: spread the array into .set(x, y [,z, w])
      if (dst && typeof dst.set === 'function' && Array.isArray(src)) {
        if ((dst as any).isVector2 && src.length >= 2) (dst as any).set(src[0], src[1]);
        else if ((dst as any).isVector3 && src.length >= 3) (dst as any).set(src[0], src[1], src[2]);
        else if ((dst as any).isVector4 && src.length >= 4) (dst as any).set(src[0], src[1], src[2], src[3]);
        else dst.set(...src);
        continue;
      }

      // Typed arrays
      if (dst instanceof Float32Array && src instanceof Float32Array) {
        dst.set(src);
        continue;
      }

      // Everything else (numbers, booleans, textures, etc.)
      uni[k].value = src;
    }

    // (optional) broadcast to aliases after updating canonical names
    const aliasMap: Record<string, string[]> = {
      uPointer: ['u_mouse', 'iMouse', 'mouse', 'uMouse'],
      uTime: ['iTime', 'time', 'u_time'],
      u_resolution: ['iResolution', 'resolution', 'uResolution'],
    };
    for (const [srcName, aliases] of Object.entries(aliasMap)) {
      if (!(srcName in uni)) continue;
      for (const a of aliases) {
        if (!(a in uni)) continue;
        const v = uni[srcName].value;
        const d = uni[a].value;
        if (d?.set && Array.isArray(v)) d.set(...v);
        else if (d instanceof Float32Array && v instanceof Float32Array) d.set(v);
        else uni[a].value = v;
      }
    }
  }

  return { material, setUniforms, materialRef };
}
