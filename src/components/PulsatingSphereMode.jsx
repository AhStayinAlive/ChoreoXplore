import React, { useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useVisStore } from "../state/useVisStore";

const frag = `
uniform float uTime;
uniform float uHue;
uniform float uEnergy;
uniform float uMotion;
uniform float uIntensity;
uniform float uBeat;
uniform float uRms;
varying vec2 vUv;

void main() {
  vec2 uv = vUv;
  float t = uTime;

  // Center & distance
  vec2 center = vec2(0.5);
  float dist = distance(uv, center);

  // Audio parameters
  float baseRadius = 0.25;
  float pulse = (uEnergy * 0.4) + (uBeat * 0.25) + (uRms * 0.3);
  float radius = baseRadius + pulse;

  // Core sphere falloff
  float core = 1.0 - smoothstep(radius - 0.08, radius, dist);

  // Soft glow layers
  float innerGlow = smoothstep(radius * 0.5, radius * 0.9, dist);
  float outerGlow = 1.0 - smoothstep(radius, radius + 0.25, dist);

  // Wave distortion (motion reactive)
  float wave = sin(dist * 20.0 - t * 3.0) * 0.05 * uMotion;
  float pattern = core + wave;
  pattern += outerGlow * 0.5;
  pattern += innerGlow * 0.25;

  // Hue to RGB
  float h = fract((uHue + uMotion * 30.0) / 360.0);
  vec3 accent = clamp(vec3(
    abs(h * 6.0 - 3.0) - 1.0,
    2.0 - abs(h * 6.0 - 2.0),
    2.0 - abs(h * 6.0 - 4.0)
  ), 0.0, 1.0);

  // Final color
  vec3 col = accent * pattern * (0.8 + uIntensity);
  col *= 1.0 + (uEnergy * 0.6 + uBeat * 0.4 + uRms * 0.3);

  // Clamp for safety
  col = clamp(col, 0.0, 1.0);

  gl_FragColor = vec4(col, pattern * 1.2);
}
`;

const vert = `
varying vec2 vUv;
void main(){
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export default function PulsatingSphereMode() {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        fragmentShader: frag,
        vertexShader: vert,
        uniforms: {
          uTime: { value: 0 },
          uHue: { value: 210 },
          uEnergy: { value: 0 },
          uMotion: { value: 0 },
          uIntensity: { value: 0.8 },
          uBeat: { value: 0 },
          uRms: { value: 0 },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide, // ✅ important for visibility
      }),
    []
  );

  const geom = useMemo(() => new THREE.PlaneGeometry(25000, 13000, 1, 1), []);

  const music = useVisStore((s) => s.music);
  const motion = useVisStore((s) => s.motion);
  const params = useVisStore((s) => s.params);

  useFrame((_, dt) => {
    material.uniforms.uTime.value += dt * (0.8 + params.speed);
    material.uniforms.uHue.value = params.hue;
    material.uniforms.uIntensity.value = params.intensity;

    const energy = (music?.energy ?? 0) * params.musicReact;
    const sharp = (motion?.sharpness ?? 0) * params.motionReact;
    const rms = music?.rms ?? 0;
    const beat = (music?.onset ?? false) ? 1.0 : 0.0;

    material.uniforms.uEnergy.value = THREE.MathUtils.lerp(
      material.uniforms.uEnergy.value,
      energy,
      0.4
    );
    material.uniforms.uMotion.value = THREE.MathUtils.lerp(
      material.uniforms.uMotion.value,
      sharp,
      0.25
    );
    material.uniforms.uRms.value = THREE.MathUtils.lerp(
      material.uniforms.uRms.value,
      rms,
      0.5
    );
    material.uniforms.uBeat.value = THREE.MathUtils.lerp(
      material.uniforms.uBeat.value,
      beat,
      0.6
    );
  });

  return <mesh geometry={geom} material={material} position={[0, 0, 2]} />;
}
