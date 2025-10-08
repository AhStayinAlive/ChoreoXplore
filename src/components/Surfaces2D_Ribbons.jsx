import React from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useMemo } from 'react';
import { useVisStore } from '../state/useVisStore';

const frag = `
uniform float uTime;
uniform float uHue;
uniform float uEnergy;
uniform float uMotion;
uniform float uIntensity;
varying vec2 vUv;

void main() {
  vec2 uv = vUv * 2.0 - 1.0;
  float t = uTime;
  
  // Create ribbon-like surfaces
  float ribbon1 = abs(sin(uv.x * 5.0 + t * 1.5 + uMotion * 3.0)) - 0.3;
  float ribbon2 = abs(cos(uv.y * 4.0 + t * 1.2 + uEnergy * 2.0)) - 0.4;
  float ribbon3 = abs(sin((uv.x - uv.y) * 3.0 + t * 1.8)) - 0.35;
  
  float surface = min(min(ribbon1, ribbon2), ribbon3);
  surface = smoothstep(0.0, 0.1, surface);
  
  // Add some texture variation
  float noise = sin(uv.x * 20.0 + uv.y * 15.0 + t * 2.0) * 0.1;
  surface += noise;
  
  // Color based on hue with gradient
  float h = uHue / 360.0;
  vec3 accent = clamp(vec3(abs(h*6.0-3.0)-1.0, 2.0-abs(h*6.0-2.0), 2.0-abs(h*6.0-4.0)), 0.0, 1.0);
  
  vec3 col = mix(vec3(0.02), accent, surface * uIntensity);
  gl_FragColor = vec4(pow(col, vec3(0.9)), 1.0);
}
`;

const vert = `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
`;

export default function Surfaces2D_Ribbons() {
  const material = useMemo(() => new THREE.ShaderMaterial({
    fragmentShader: frag,
    vertexShader: vert,
    uniforms: {
      uTime: { value: 0 },
      uHue: { value: 210 },
      uEnergy: { value: 0 },
      uMotion: { value: 0 },
      uIntensity: { value: 0.8 },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }), []);
  
  const geom = useMemo(() => new THREE.PlaneGeometry(2, 2, 1, 1), []);

  const music = useVisStore(s => s.music);
  const motion = useVisStore(s => s.motion);
  const params = useVisStore(s => s.params);

  useFrame((_, dt) => {
    material.uniforms.uTime.value += dt * (0.6 + params.speed);
    material.uniforms.uHue.value = params.hue;
    material.uniforms.uIntensity.value = params.intensity;

    const energy = (music?.energy ?? 0) * params.musicReact;
    const sharp = (motion?.sharpness ?? 0) * params.motionReact;

    material.uniforms.uEnergy.value = THREE.MathUtils.lerp(
      material.uniforms.uEnergy.value, energy, 0.2
    );
    material.uniforms.uMotion.value = THREE.MathUtils.lerp(
      material.uniforms.uMotion.value, sharp, 0.15
    );
  });

  return <mesh geometry={geom} material={material} position={[0, 0, 1]} />;
}
