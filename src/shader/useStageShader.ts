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

    // Robust injector: bright ring overlay driven by cursor/pose
    mat.onBeforeCompile = (shader) => {
      const is300 = /#\s*version\s+300\s+es/.test(shader.fragmentShader);
      let outVar = 'gl_FragColor';
      if (is300) {
        const m = shader.fragmentShader.match(/out\s+vec4\s+(\w+)\s*;/);
        outVar = (m && m[1]) ? m[1] : 'fragColor';
        if (!m) {
          shader.fragmentShader = shader.fragmentShader.replace(
            /precision.*?;\s*/s,
            (s) => s + '\nout vec4 fragColor;\n'
          );
        }
      }
      const WR = is300 ? outVar : 'gl_FragColor';

      const header = `\nuniform vec2 uPointer;\nuniform vec2 uPointerVel;\nuniform float uBodySpeed, uExpand, uAccent, uMotionReactivity;\nuniform vec2 u_resolution;`;
      shader.fragmentShader = header + '\n' + shader.fragmentShader;

      shader.fragmentShader = shader.fragmentShader.replace(
        /void\s+main\s*\(\s*\)\s*{([\s\S]*?)}/,
        (_full, body) => `void main(){${body}
      vec2 __uv = gl_FragCoord.xy / u_resolution;
      float __cursor = 1.0 - smoothstep(0.145, 0.155, distance(__uv, uPointer));
      float __vel    = clamp(length(uPointerVel) * 0.05, 0.0, 1.0);
      ${WR}.rgb += __cursor * 0.85;                // strong visible ring
      ${WR}.rgb += vec3(__vel) * 0.25;             // flick with velocity
      ${WR}.rgb += vec3(0.2) * uBodySpeed;         // pose speed
      ${WR}.rgb += vec3(0.25) * uAccent;           // pose accents
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
