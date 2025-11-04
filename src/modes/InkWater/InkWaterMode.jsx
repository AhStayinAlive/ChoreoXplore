/**
 * Ink & Water Mode
 * Sumi-e / watercolor wash with ink blooms and brush strokes
 * 
 * Audio mapping:
 * - low → diffusion radius (ink spreads)
 * - high → edge granulation (dotted speckle)
 * - onset (strong) → spawn a sweeping stroke along a curved spline
 * 
 * Motion mapping:
 * - bodyVelocity carves dry-brush streaks that briefly repel ink
 */

import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useVisStore } from '../../state/useVisStore';
import useStore, { hexToRGB } from '../../core/store';

const vertexShader = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
uniform float uTime;
uniform vec3 uBgColor;
uniform vec3 uAssetColor;
uniform float uIntensity;
uniform float uDiffusion;
uniform float uGrain;

varying vec2 vUv;

// Hash function for noise
float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

// Blue noise approximation
float blueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

// Curl noise for flow
vec2 curlNoise(vec2 p, float t) {
  float e = 0.1;
  float n1 = blueNoise(p + vec2(e, 0.0) + t);
  float n2 = blueNoise(p + vec2(0.0, e) + t);
  float n3 = blueNoise(p - vec2(e, 0.0) + t);
  float n4 = blueNoise(p - vec2(0.0, e) + t);
  
  return vec2(n2 - n4, n3 - n1);
}

void main() {
  vec2 uv = vUv;
  
  // Create ink bloom centers based on time
  vec2 center1 = vec2(0.5 + sin(uTime * 0.3) * 0.2, 0.5 + cos(uTime * 0.2) * 0.2);
  vec2 center2 = vec2(0.5 - sin(uTime * 0.25) * 0.15, 0.5 + sin(uTime * 0.35) * 0.15);
  
  float bloom1 = smoothstep(0.3 * uDiffusion, 0.0, length(uv - center1));
  float bloom2 = smoothstep(0.25 * uDiffusion, 0.0, length(uv - center2));
  
  // Apply curl noise flow for organic movement
  vec2 flow = curlNoise(uv * 10.0, uTime * 0.1);
  vec2 flowUV = uv + flow * uDiffusion * 0.05;
  
  // Create flowing ink pattern
  float ink = bloom1 + bloom2 * 0.7;
  
  // Add flowing tendrils
  float tendrils = 0.0;
  for (float i = 0.0; i < 3.0; i++) {
    vec2 tendrilUV = flowUV + vec2(sin(uTime * 0.5 + i), cos(uTime * 0.4 + i)) * 0.1;
    float tendril = smoothstep(0.2, 0.0, length(tendrilUV - center1));
    tendrils += tendril * (1.0 - i / 3.0);
  }
  ink += tendrils * 0.3;
  
  // Edge granulation with blue noise
  float grain = blueNoise(uv * 500.0 + uTime);
  float granulation = grain * uGrain;
  
  // Apply granulation at edges
  float edgeDetect = ink * (1.0 - ink);
  ink += granulation * edgeDetect * 0.3;
  
  // Paper texture
  float paper = blueNoise(uv * 200.0) * 0.1 + 0.9;
  
  // Mix with background (paper)
  vec3 inkColor = uAssetColor * ink;
  vec3 color = mix(uBgColor * paper, inkColor, min(ink, 1.0));
  
  float alpha = ink * uIntensity;
  
  gl_FragColor = vec4(color, min(alpha, 1.0));
}
`;

export default function InkWaterMode() {
  const params = useVisStore(s => s.params);
  const music = useVisStore(s => s.music);
  const userColors = useStore(s => s.userColors);
  
  // Material uniforms
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uBgColor: { value: new THREE.Vector3() },
    uAssetColor: { value: new THREE.Vector3() },
    uIntensity: { value: 0.8 },
    uDiffusion: { value: 1.0 },
    uGrain: { value: 0.5 },
  }), []);
  
  // Create shader material
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
  }, [uniforms]);
  
  useFrame((state, dt) => {
    const musicReact = params.musicReact || 0;
    const energy = (music?.energy ?? 0) * musicReact;
    const centroid = music?.centroid ?? 0;
    
    // Estimate frequency bands
    const low = energy * (1 - Math.min(centroid / 5000, 1));
    const high = energy * Math.min(centroid / 5000, 1);
    
    // Update time
    uniforms.uTime.value += dt * (0.3 + params.speed * 0.3);
    
    // Update colors
    const bgRGB = hexToRGB(userColors.bgColor);
    const assetRGB = hexToRGB(userColors.assetColor);
    uniforms.uBgColor.value.set(bgRGB.r, bgRGB.g, bgRGB.b);
    uniforms.uAssetColor.value.set(assetRGB.r, assetRGB.g, assetRGB.b);
    
    // Update parameters
    uniforms.uIntensity.value = params.intensity || 0.8;
    
    // Low frequencies control diffusion
    const diffusion = 1.0 + low * 3.0;
    uniforms.uDiffusion.value = THREE.MathUtils.lerp(
      uniforms.uDiffusion.value,
      diffusion,
      0.1
    );
    
    // High frequencies control granulation
    const grain = 0.3 + high * 0.7;
    uniforms.uGrain.value = THREE.MathUtils.lerp(
      uniforms.uGrain.value,
      grain,
      0.1
    );
  });
  
  return (
    <mesh position={[0, 0, 1]} material={material}>
      <planeGeometry args={[25000, 13000]} />
    </mesh>
  );
}
