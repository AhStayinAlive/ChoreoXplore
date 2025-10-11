import React from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useMemo } from 'react';
import { useVisStore } from '../state/useVisStore';
import useStore, { hexToRGB } from '../core/store';

const frag = `
uniform float uTime;
uniform vec3 uColor;
uniform float uEnergy;
uniform float uMotion;
uniform float uIntensity;
varying vec2 vUv;

void main() {
  vec2 uv = vUv * 2.0 - 1.0;
  float t = uTime;
  
  // Create volumetric burst patterns
  float burst1 = length(uv - vec2(sin(t * 1.5 + uMotion * 2.0), cos(t * 1.2 + uEnergy * 1.5)) * 0.3);
  float burst2 = length(uv - vec2(cos(t * 1.8), sin(t * 1.6 + uMotion * 1.8)) * 0.25);
  float burst3 = length(uv - vec2(sin(t * 2.0 + uEnergy * 2.5), cos(t * 1.4)) * 0.35);
  
  float volume = min(min(burst1, burst2), burst3);
  volume = smoothstep(0.2, 0.0, volume);
  
  // Add pulsing effect
  float pulse = sin(t * 3.0 + uEnergy * 5.0) * 0.1 + 0.9;
  volume *= pulse;
  
  // Use RGB color directly
  vec3 accent = uColor;
  
  vec3 col = mix(vec3(0.02), accent, volume * uIntensity);
  gl_FragColor = vec4(pow(col, vec3(0.9)), 1.0);
}
`;

const vert = `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
`;

export default function Volumes3D_Bursts() {
  const material = useMemo(() => new THREE.ShaderMaterial({
    fragmentShader: frag,
    vertexShader: vert,
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Vector3(0.5, 0.5, 0.5) },
      uEnergy: { value: 0 },
      uMotion: { value: 0 },
      uIntensity: { value: 0.8 },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
  }), []);
  
  const geom = useMemo(() => new THREE.PlaneGeometry(2, 2, 1, 1), []);

  const music = useVisStore(s => s.music);
  const motion = useVisStore(s => s.motion);
  const params = useVisStore(s => s.params);
  const userColors = useStore(s => s.userColors);

  useFrame((_, dt) => {
    material.uniforms.uTime.value += dt * (0.6 + params.speed);
    const rgb = hexToRGB(userColors.assetColor);
    material.uniforms.uColor.value.set(rgb.r, rgb.g, rgb.b);
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
