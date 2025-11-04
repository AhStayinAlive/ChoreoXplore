/**
 * Opaline Wave Mode
 * Silky, pastel, oil-on-water swirls with iridescent rims
 * 
 * Audio mapping:
 * - low → base flow strength (big slow bends)
 * - mid → advection/scroll speed (overall motion)
 * - high → shimmer speed (fine iridescent ripples)
 * 
 * Motion mapping (optional):
 * - com.xy → affects flow direction
 * - bodyVelocity → flow intensity
 */

import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useVisStore } from '../../state/useVisStore';
import useStore, { hexToRGB } from '../../core/store';

// Simplified shader without FBOs
const vertexShader = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
uniform float uTime;
uniform float uLowFreq;
uniform float uMidFreq;
uniform float uHighFreq;
uniform float uMusicReact;
uniform vec3 uBgColor;
uniform vec3 uAssetColor;
uniform float uTransparency;
uniform bool uRainbowMode;
uniform float uColorSpread;
uniform float uShimmerSpeed;

varying vec2 vUv;

// Hash for noise
float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

// Smooth noise
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

// Fractal noise
float fbm(vec2 p, int octaves) {
  float value = 0.0;
  float amplitude = 0.5;
  float frequency = 1.0;
  
  for(int i = 0; i < 6; i++) {
    if(i >= octaves) break;
    value += amplitude * noise(p * frequency);
    frequency *= 2.0;
    amplitude *= 0.5;
  }
  
  return value;
}

// HSV to RGB
vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

// Rotation matrix for swirls
vec2 rotate2D(vec2 p, float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return vec2(p.x * c - p.y * s, p.x * s + p.y * c);
}

// Domain warping for oil-on-water effect with swirl
vec2 domainWarp(vec2 p, float time, float strength, float swirlStrength) {
  vec2 q = vec2(
    fbm(p + vec2(0.0, 0.0), 4),
    fbm(p + vec2(5.2, 1.3), 4)
  );
  
  // Add swirling motion
  vec2 center = vec2(0.5, 0.5);
  vec2 toCenter = p - center;
  float dist = length(toCenter);
  float angle = atan(toCenter.y, toCenter.x);
  
  // Spiral swirl based on distance and time
  float swirlAngle = swirlStrength * (1.0 - dist) * (sin(time * 0.3) * 0.5 + 0.5);
  vec2 swirled = center + rotate2D(toCenter, swirlAngle);
  
  vec2 r = vec2(
    fbm(swirled + 4.0 * q + vec2(1.7 + time * 0.15, 9.2), 4),
    fbm(swirled + 4.0 * q + vec2(8.3 + time * 0.12, 2.8), 4)
  );
  
  return p + strength * r;
}

void main() {
  vec2 uv = vUv;
  
  // Audio-reactive flow
  float flowScale = 2.0 + uLowFreq * 2.0;
  float flowSpeed = 0.3 + uMidFreq * 0.5;
  float shimmer = uHighFreq;
  float swirlIntensity = 1.5 + uMidFreq * 2.0; // Swirl reacts to mid frequencies
  
  // Domain-warped coordinates for oil-on-water swirls with rotation
  vec2 warpedUV = domainWarp(uv * flowScale, uTime * flowSpeed, 0.5, swirlIntensity);
  
  // Add additional rotational flow field
  vec2 center = vec2(0.5, 0.5);
  vec2 toCenter = warpedUV - center;
  float dist = length(toCenter);
  float rotationSpeed = 0.2 + uLowFreq * 0.3;
  warpedUV = center + rotate2D(toCenter, uTime * rotationSpeed * (1.0 - dist * 0.5));
  
  // Create layered, flowing patterns
  float pattern1 = fbm(warpedUV + uTime * 0.1, 5);
  float pattern2 = fbm(warpedUV * 1.5 - uTime * 0.08, 4);
  float pattern3 = fbm(warpedUV * 2.0 + vec2(uTime * 0.15, -uTime * 0.12), 3);
  
  // Combine patterns for creamy fluid look
  float thickness = (pattern1 * 0.5 + pattern2 * 0.3 + pattern3 * 0.2);
  thickness = smoothstep(0.2, 0.8, thickness);
  
  // Add shimmer detail
  float detail = noise(warpedUV * 8.0 + uTime * shimmer * 2.0) * 0.1;
  thickness += detail;
  
  vec3 color;
  
  if(uRainbowMode) {
    // Rainbow iridescent mode
    float hue = fract(thickness * uColorSpread + uTime * uShimmerSpeed);
    vec3 iridescent = hsv2rgb(vec3(hue, 0.7 + shimmer * 0.2, 0.9));
    // Mix with white for pastel effect
    color = mix(iridescent, vec3(1.0), 0.3);
  } else {
    // Music mode - blend bg and asset colors based on thickness
    color = mix(uBgColor, uAssetColor, thickness);
  }
  
  // Pearlescent rim effect (edges glow)
  float edge = abs(thickness - 0.5) * 2.0;
  float rim = smoothstep(0.7, 1.0, edge);
  color += rim * 0.15;
  
  // Soft overall glow
  color += vec3(0.05) * (1.0 - thickness);
  
  gl_FragColor = vec4(color, uTransparency * (0.7 + thickness * 0.3));
}
`;

// Default parameters - simplified
const DEFAULT_PARAMS = {
  rainbowMode: true,
  colorSpread: 0.9,
  shimmerSpeed: 0.25
};

export default function OpalineWaveMode() {
  const params = useVisStore(s => s.params);
  const music = useVisStore(s => s.music);
  const userColors = useStore(s => s.userColors);
  
  // Get mode-specific params or use defaults
  const opalineParams = params.opalineWave || DEFAULT_PARAMS;
  
  const lastEnergyRef = useRef(0);
  
  // Create material with uniforms
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uLowFreq: { value: 0 },
        uMidFreq: { value: 0 },
        uHighFreq: { value: 0 },
        uMusicReact: { value: 1 },
        uBgColor: { value: new THREE.Color() },
        uAssetColor: { value: new THREE.Color() },
        uTransparency: { value: 0.8 },
        uRainbowMode: { value: true },
        uColorSpread: { value: DEFAULT_PARAMS.colorSpread },
        uShimmerSpeed: { value: DEFAULT_PARAMS.shimmerSpeed }
      },
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false
    });
  }, []);
  
  useFrame((state, dt) => {
    const musicReact = params.musicReact || 0;
    const audioMode = params.audioMode || 'frequencies';
    const energy = (music?.energy ?? 0);
    const rms = (music?.rms ?? 0);
    const centroid = music?.centroid ?? 0;
    
    let lowBand, midBand, highBand;
    
    // Different audio modes drive visuals differently
    switch(audioMode) {
      case 'energy':
        // Energy mode: all bands driven by overall energy with slight variation
        lowBand = energy * 0.8 * musicReact;
        midBand = energy * 1.0 * musicReact;
        highBand = energy * 0.6 * musicReact;
        break;
      case 'rms':
        // RMS mode: volume-based with smooth changes
        lowBand = rms * 0.9 * musicReact;
        midBand = rms * 1.1 * musicReact;
        highBand = rms * 0.7 * musicReact;
        break;
      case 'beat':
        // Beat mode: detect strong energy changes for rhythmic pulses
        const energyChange = Math.abs(energy - lastEnergyRef.current);
        lastEnergyRef.current = energy;
        const beatPulse = energyChange > 0.15 ? 1.0 : 0.0;
        lowBand = beatPulse * musicReact;
        midBand = beatPulse * 0.8 * musicReact;
        highBand = beatPulse * 0.6 * musicReact;
        break;
      case 'frequencies':
      default:
        // Frequencies mode: separate low/mid/high bands based on centroid
        lowBand = energy * (1 - Math.min(centroid / 5000, 1)) * musicReact;
        midBand = energy * (1 - Math.abs(centroid / 5000 - 0.5) * 2) * musicReact;
        highBand = energy * Math.min(centroid / 5000, 1) * musicReact;
        break;
    }
    
    // Update time
    material.uniforms.uTime.value += dt * (0.5 + params.speed * 0.5);
    
    // Update audio reactivity with lerping for smoothness
    material.uniforms.uLowFreq.value = THREE.MathUtils.lerp(
      material.uniforms.uLowFreq.value,
      lowBand,
      audioMode === 'beat' ? 0.3 : 0.1
    );
    material.uniforms.uMidFreq.value = THREE.MathUtils.lerp(
      material.uniforms.uMidFreq.value,
      midBand,
      audioMode === 'beat' ? 0.3 : 0.1
    );
    material.uniforms.uHighFreq.value = THREE.MathUtils.lerp(
      material.uniforms.uHighFreq.value,
      highBand,
      audioMode === 'beat' ? 0.3 : 0.1
    );
    
    // Update colors
    const bgRGB = hexToRGB(userColors.bgColor);
    const assetRGB = hexToRGB(userColors.assetColor);
    material.uniforms.uBgColor.value.set(bgRGB.r, bgRGB.g, bgRGB.b);
    material.uniforms.uAssetColor.value.set(assetRGB.r, assetRGB.g, assetRGB.b);
    
    // Update transparency
    material.uniforms.uTransparency.value = params.intensity || 0.8;
    
    // Update rainbow mode
    material.uniforms.uRainbowMode.value = opalineParams.rainbowMode ?? true;
    material.uniforms.uColorSpread.value = opalineParams.colorSpread ?? DEFAULT_PARAMS.colorSpread;
    material.uniforms.uShimmerSpeed.value = opalineParams.shimmerSpeed ?? DEFAULT_PARAMS.shimmerSpeed;
  });
  
  return (
    <mesh position={[0, 0, 1]} material={material}>
      <planeGeometry args={[25000, 13000]} />
    </mesh>
  );
}
