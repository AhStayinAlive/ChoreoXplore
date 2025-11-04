/**
 * Stained Glass Rose Mode
 * Cathedral rosette with volumetric light rays
 * 
 * Audio mapping:
 * - onset → pane flash + radial ray burst
 * - rms → ray length / bloom strength
 * - centroid → pane color bias (reds on low, whites on high)
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
#define PI 3.14159265359

uniform float uTime;
uniform vec3 uBgColor;
uniform vec3 uAssetColor;
uniform float uIntensity;
uniform float uRotation;
uniform float uBloom;
uniform float uRayLength;
uniform float uFlash;
uniform float uColorBias;

varying vec2 vUv;

// SDF for rosette pattern
float rosettePattern(vec2 p, float petals) {
  float a = atan(p.y, p.x);
  float r = length(p);
  
  // Create petal shape
  float petalAngle = PI * 2.0 / petals;
  float localAngle = mod(a + PI / petals, petalAngle) - petalAngle * 0.5;
  
  float petalShape = cos(localAngle * petals * 0.5) * 0.5 + 0.5;
  petalShape = pow(petalShape, 2.0);
  
  // Radial bands
  float bands = smoothstep(0.02, 0.0, abs(fract(r * 0.003) - 0.5));
  
  return petalShape * (1.0 - smoothstep(0.3, 1.0, r * 0.001)) + bands * 0.3;
}

// Radial blur for god rays
vec3 godRays(vec2 uv, vec2 center, float intensity, float rayLen) {
  vec2 dir = uv - center;
  float dist = length(dir);
  dir = normalize(dir);
  
  vec3 ray = vec3(0.0);
  float samples = 8.0;
  
  for (float i = 0.0; i < samples; i++) {
    float t = i / samples;
    vec2 samplePos = center + dir * dist * t * rayLen;
    float fade = (1.0 - t) * (1.0 - smoothstep(0.0, 0.5, dist));
    ray += vec3(fade) * intensity;
  }
  
  return ray / samples;
}

// HSV to RGB
vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

vec3 rgb2hsv(vec3 c) {
  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
  
  float d = q.x - min(q.w, q.y);
  float e = 1.0e-10;
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

void main() {
  vec2 uv = vUv - 0.5;
  vec2 center = vec2(0.0);
  
  // Apply rotation
  float angle = uRotation;
  mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
  uv = rot * uv;
  
  // Scale for world space
  uv *= 2000.0;
  
  // Create rosette pattern
  float pattern = rosettePattern(uv, 12.0);
  
  // Add inner details
  float innerRose = rosettePattern(uv * 0.5, 8.0) * 0.5;
  pattern = max(pattern, innerRose);
  
  // Apply color bias based on centroid
  vec3 hsv = rgb2hsv(uAssetColor);
  
  // Low centroid = warmer (reds), high centroid = cooler (whites)
  hsv.x = mod(hsv.x - uColorBias * 0.2, 1.0);
  hsv.y = mix(hsv.y, hsv.y * 0.3, uColorBias); // Desaturate for white
  hsv.z = mix(hsv.z, 1.0, uColorBias * 0.5); // Brighten for white
  
  vec3 stainedColor = hsv2rgb(hsv);
  
  // God rays
  vec3 rays = godRays(vUv, vec2(0.5), uBloom, uRayLength);
  
  // Combine pattern with background
  vec3 color = mix(uBgColor, stainedColor, pattern);
  
  // Add rays
  color += rays * stainedColor * 0.5;
  
  // Flash effect on onset
  color += uFlash * vec3(1.0, 0.9, 0.8);
  
  // Add bloom
  float bloom = pattern * uBloom;
  color += bloom * stainedColor * 0.3;
  
  float alpha = (pattern + length(rays) * 0.3) * uIntensity;
  
  gl_FragColor = vec4(color, min(alpha, 1.0));
}
`;

export default function StainedGlassRoseMode() {
  const params = useVisStore(s => s.params);
  const music = useVisStore(s => s.music);
  const userColors = useStore(s => s.userColors);
  
  const rotationRef = useRef(0);
  const flashRef = useRef(0);
  const lastEnergyRef = useRef(0);
  
  // Material uniforms
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uBgColor: { value: new THREE.Vector3() },
    uAssetColor: { value: new THREE.Vector3() },
    uIntensity: { value: 0.8 },
    uRotation: { value: 0 },
    uBloom: { value: 0.5 },
    uRayLength: { value: 1.0 },
    uFlash: { value: 0 },
    uColorBias: { value: 0 },
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
      blending: THREE.AdditiveBlending,
    });
  }, [uniforms]);
  
  useFrame((state, dt) => {
    const musicReact = params.musicReact || 0;
    const audioMode = params.audioMode || 'frequencies';
    const rmsRaw = music?.rms ?? 0;
    const centroid = music?.centroid ?? 0;
    const energyRaw = music?.energy ?? 0;
    
    let rms, energy;
    
    // Different audio modes
    switch(audioMode) {
      case 'energy':
        energy = energyRaw * musicReact;
        rms = energyRaw * 0.8 * musicReact;
        break;
      case 'rms':
        rms = rmsRaw * musicReact;
        energy = rmsRaw * 1.2 * musicReact;
        break;
      case 'beat':
        const energyChange = Math.abs(energyRaw - lastEnergyRef.current);
        const beatPulse = energyChange > 0.15 ? 1.0 : 0.0;
        energy = beatPulse * musicReact;
        rms = beatPulse * 0.8 * musicReact;
        break;
      case 'frequencies':
      default:
        rms = rmsRaw * musicReact;
        energy = energyRaw * musicReact;
        break;
    }
    
    // Onset detection
    const onset = energy > lastEnergyRef.current * 1.5 && energy > 0.1;
    lastEnergyRef.current = energy;
    
    // Update time
    uniforms.uTime.value += dt;
    
    // Update colors
    const bgRGB = hexToRGB(userColors.bgColor);
    const assetRGB = hexToRGB(userColors.assetColor);
    uniforms.uBgColor.value.set(bgRGB.r, bgRGB.g, bgRGB.b);
    uniforms.uAssetColor.value.set(assetRGB.r, assetRGB.g, assetRGB.b);
    
    // Update parameters
    uniforms.uIntensity.value = params.intensity || 0.8;
    
    // Slow sacred rotation
    rotationRef.current += dt * 0.05 * params.speed;
    uniforms.uRotation.value = rotationRef.current;
    
    // RMS controls ray length and bloom
    const rayLength = 0.5 + rms * 1.5;
    uniforms.uRayLength.value = THREE.MathUtils.lerp(
      uniforms.uRayLength.value,
      rayLength,
      0.1
    );
    
    const bloom = 0.3 + rms * 0.7;
    uniforms.uBloom.value = THREE.MathUtils.lerp(
      uniforms.uBloom.value,
      bloom,
      0.1
    );
    
    // Centroid controls color bias
    const normalizedCentroid = Math.min(centroid / 22050, 1.0);
    uniforms.uColorBias.value = THREE.MathUtils.lerp(
      uniforms.uColorBias.value,
      normalizedCentroid * musicReact,
      0.1
    );
    
    // Onset triggers flash
    if (onset) {
      flashRef.current = 1.0;
    }
    
    // Decay flash
    flashRef.current *= 0.9;
    uniforms.uFlash.value = flashRef.current;
  });
  
  return (
    <mesh position={[0, 0, 1]} material={material}>
      <planeGeometry args={[25000, 13000]} />
    </mesh>
  );
}
