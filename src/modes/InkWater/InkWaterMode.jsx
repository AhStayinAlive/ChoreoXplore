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

// Smooth noise for organic blob movement
float smoothNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

void main() {
  vec2 uv = vUv;
  
  // Create 1-2 large lava lamp blobs that move slowly and organically
  // Blob 1 - main blob
  vec2 blob1Pos = vec2(
    0.5 + sin(uTime * 0.15 + smoothNoise(vec2(uTime * 0.1))) * 0.25,
    0.5 + cos(uTime * 0.12 + smoothNoise(vec2(uTime * 0.1 + 100.0))) * 0.25
  );
  
  // Blob 2 - secondary blob (controlled by diffusion parameter)
  vec2 blob2Pos = vec2(
    0.5 - sin(uTime * 0.18 + smoothNoise(vec2(uTime * 0.09 + 50.0))) * 0.2,
    0.5 + sin(uTime * 0.16 + smoothNoise(vec2(uTime * 0.11 + 150.0))) * 0.2
  );
  
  // Distance from blobs with organic deformation
  float noise1 = smoothNoise(uv * 3.0 + uTime * 0.1);
  float noise2 = smoothNoise(uv * 5.0 - uTime * 0.15);
  
  float dist1 = length(uv - blob1Pos) - noise1 * 0.08;
  float dist2 = length(uv - blob2Pos) - noise2 * 0.06;
  
  // Blob size influenced by diffusion (more diffusion = bigger blobs)
  float size1 = 0.15 + uDiffusion * 0.1;
  float size2 = 0.12 + uDiffusion * 0.08;
  
  // Create smooth blobs with soft edges
  float blob1 = smoothstep(size1 + 0.1, size1 - 0.05, dist1);
  float blob2 = smoothstep(size2 + 0.1, size2 - 0.05, dist2);
  
  // Merge blobs with metaball effect
  float blobs = blob1 + blob2;
  blobs = smoothstep(0.3, 0.8, blobs);
  
  // Add subtle internal swirls for more interest
  float swirl = smoothNoise(uv * 8.0 + uTime * 0.2);
  blobs += swirl * 0.1 * blobs;
  
  // Soft gradient within blobs
  float blobGradient = smoothstep(0.0, 1.0, blobs);
  
  // Create smooth color transition
  vec3 blobColor = mix(
    uAssetColor * 0.6,
    uAssetColor,
    blobGradient
  );
  
  // Mix with background for smooth transition
  vec3 color = mix(uBgColor, blobColor, blobs * uIntensity);
  
  float alpha = blobs * uIntensity;
  
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
