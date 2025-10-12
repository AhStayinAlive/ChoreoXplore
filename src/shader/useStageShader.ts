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

    // Robust injector to force visible reaction even if shader ignores uniforms
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

      const header = `uniform vec2 uPointer;\n` +
        `uniform vec2 uPointerVel;\n` +
        `uniform float uBodySpeed, uExpand, uAccent, uMotionReactivity;\n` +
        `uniform vec2 u_resolution;\n`;

      shader.fragmentShader = header + '\n' + shader.fragmentShader;

      shader.fragmentShader = shader.fragmentShader.replace(
        /void\s+main\s*\(\s*\)\s*{([\s\S]*?)}/,
        (full, body) => {
          const bump = `${is300 ? outVar : 'gl_FragColor'}.rgb += (1.0 - smoothstep(0.0, 0.55, distance(gl_FragCoord.xy / u_resolution, uPointer))) * 0.25 * (1.0 - uMotionReactivity);\n${is300 ? outVar : 'gl_FragColor'}.rgb += vec3(0.2) * uBodySpeed * uMotionReactivity;\n${is300 ? outVar : 'gl_FragColor'}.rgb += vec3(0.25) * uAccent * uMotionReactivity;`;
          return `void main(){${body}\n${bump}\n}`;
        }
      );
    };

    materialRef.current = mat;
    return mat;
  }, [effect]);

  function setUniforms(u: Partial<CommonUniforms> & Record<string, any>) {
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
    // broadcast canonical → aliases
    const aliasMap: Record<string, string[]> = {
      uPointer: ['u_mouse', 'iMouse', 'mouse', 'uMouse'],
      uTime: ['iTime', 'time', 'u_time'],
      u_resolution: ['iResolution', 'resolution', 'uResolution'],
    };
    for (const [src, aliases] of Object.entries(aliasMap)) {
      if (!uni[src]) continue;
      for (const a of aliases) if (uni[a]) {
        const v = uni[src].value;
        if (uni[a].value?.set && v?.set) uni[a].value.set(v); else uni[a].value = v;
      }
    }
  }

  return { material, setUniforms, materialRef };
}
