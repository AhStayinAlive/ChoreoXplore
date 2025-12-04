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

float angleField(vec2 p, float a){
  float s = sin(a), c = cos(a);
  mat2 R = mat2(c,-s,s,c);
  p = R * p;
  vec2 q = abs(fract(p*4.0)-0.5);
  float d1 = abs(q.x - q.y);
  float d2 = min(abs(q.x), abs(q.y));
  return mix(d1, d2, 0.2);
}
void main() {
  vec2 uv = vUv*2.0-1.0;
  uv *= 0.1; // Scale down UV to make patterns larger
  float t = uTime;
  
  // Make music reactivity much more dramatic
  float musicBoost = uEnergy * 3.0; // Triple the music energy effect
  float musicPulse = sin(t * 4.0 + uEnergy * 10.0) * musicBoost; // Faster, more dramatic pulsing
  
  float ang = 1.5708 * (0.25 + 0.75*fract(t*0.07 + uMotion*0.4 + musicPulse*0.5));
  float f = angleField(uv*1.2, ang);
  f = min(f, angleField(uv*1.2 + vec2(0.17,0.11)*sin(t*0.3+uMotion + musicPulse), ang+1.047));
  f = min(f, angleField(uv*1.2 + vec2(-0.2,0.07)*cos(t*0.23 + musicPulse*0.8), ang+2.094));
  
  // Make thickness much more reactive to music with sharper edges
  float thickness = mix(0.05, 0.35, clamp(uEnergy*2.0 + musicBoost*0.5 + 0.2, 0.0, 1.0));
  float line = 1.0 - smoothstep(thickness*0.8, thickness, f); // Sharper line edges
  
  vec3 base = vec3(0.0); // Make base transparent
  // Use RGB color directly
  vec3 accent = uColor;
  
  // Make color intensity much more reactive to music
  float musicIntensity = uIntensity * (1.0 + musicBoost * 2.0); // Music can double the intensity
  vec3 col = mix(base, accent, line * musicIntensity);
  
  // Make alpha much more reactive to music
  float musicAlpha = line * uIntensity * (0.4 + musicBoost * 0.8); // Music can significantly increase alpha
  
  gl_FragColor = vec4(col, musicAlpha);
}
`;

const vert = `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
`;

export default function Lines1D_Irina() {
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
  
  const geom = useMemo(() => new THREE.PlaneGeometry(19500, 9550, 1, 1), []);

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

  return <mesh geometry={geom} material={material} position={[0, 0, 2]} />;
}
