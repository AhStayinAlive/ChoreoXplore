/**
 * Opaline Wave Mode
 * Silky, pastel, oil-on-water swirls with iridescent rims
 * 
 * Audio mapping (when motionReactive is false):
 * - low → base flow strength (big slow bends)
 * - mid → advection/scroll speed (overall motion)
 * - high → shimmer speed (fine iridescent ripples)
 * 
 * Motion mapping (when motionReactive is true):
 * - hand positions → affects flow direction and swirl centers
 * - hand velocity → flow intensity and shimmer speed
 */

import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useVisStore } from '../../state/useVisStore';
import useStore, { hexToRGB } from '../../core/store';
import usePoseDetection from '../../hooks/usePoseDetection';
import { 
  getRightHandAnchor as getRightHandPosition,
  getLeftHandAnchor as getLeftHandPosition,
  calculateHandVelocity,
  smoothHandPosition
} from '../../utils/handTracking';

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
uniform bool uMotionReactive;
uniform vec2 uLeftHandPos;
uniform vec2 uRightHandPos;
uniform float uLeftHandVelocity;
uniform float uRightHandVelocity;

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
  
  for(int i = 0; i < 4; i++) {
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
  
  float flowScale, flowSpeed, shimmer, swirlIntensity;
  
  if (uMotionReactive) {
    // Motion-reactive mode: use hand movements
    float avgVelocity = (uLeftHandVelocity + uRightHandVelocity) * 0.5;
    flowScale = 2.0 + avgVelocity * 3.0;
    flowSpeed = 0.3 + avgVelocity * 0.7;
    shimmer = avgVelocity * 2.0;
    swirlIntensity = 1.5 + avgVelocity * 3.0;
  } else {
    // Audio-reactive mode: use music data
    flowScale = 2.0 + uLowFreq * 2.0;
    flowSpeed = 0.3 + uMidFreq * 0.5;
    shimmer = uHighFreq;
    swirlIntensity = 1.5 + uMidFreq * 2.0;
  }
  
  // Domain-warped coordinates for oil-on-water swirls with rotation
  vec2 warpedUV = domainWarp(uv * flowScale, uTime * flowSpeed, 0.5, swirlIntensity);
  
  // Add hand-influenced swirl centers when in motion mode
  if (uMotionReactive) {
    // Create swirl effects around each hand position
    vec2 leftHandUV = vec2(uLeftHandPos.x, 1.0 - uLeftHandPos.y);
    vec2 rightHandUV = vec2(uRightHandPos.x, 1.0 - uRightHandPos.y);
    
    // Calculate distance and angle from each hand
    vec2 toLeftHand = warpedUV - leftHandUV;
    vec2 toRightHand = warpedUV - rightHandUV;
    float distLeft = length(toLeftHand);
    float distRight = length(toRightHand);
    
    // Apply hand-based swirls (stronger when hands are moving)
    if (distLeft < 0.5) {
      float leftSwirlStrength = (0.5 - distLeft) * uLeftHandVelocity * 2.0;
      float angleLeft = atan(toLeftHand.y, toLeftHand.x);
      warpedUV = leftHandUV + rotate2D(toLeftHand, leftSwirlStrength * sin(uTime * 0.5));
    }
    
    if (distRight < 0.5) {
      float rightSwirlStrength = (0.5 - distRight) * uRightHandVelocity * 2.0;
      float angleRight = atan(toRightHand.y, toRightHand.x);
      warpedUV = rightHandUV + rotate2D(toRightHand, rightSwirlStrength * sin(uTime * 0.5));
    }
  } else {
    // Add additional rotational flow field (audio mode)
    vec2 center = vec2(0.5, 0.5);
    vec2 toCenter = warpedUV - center;
    float dist = length(toCenter);
    float rotationSpeed = 0.2 + uLowFreq * 0.3;
    warpedUV = center + rotate2D(toCenter, uTime * rotationSpeed * (1.0 - dist * 0.5));
  }
  
  // Create layered, flowing patterns (reduced octaves for performance)
  float pattern1 = fbm(warpedUV + uTime * 0.1, 3);
  float pattern2 = fbm(warpedUV * 1.5 - uTime * 0.08, 2);
  
  // Combine patterns for creamy fluid look
  float thickness = (pattern1 * 0.6 + pattern2 * 0.4);
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
  rainbowMode: false,
  colorSpread: 0.9,
  shimmerSpeed: 0.25,
  motionReactive: true  // Enable motion-reactive mode by default
};

export default function OpalineWaveMode() {
  const params = useVisStore(s => s.params);
  const music = useVisStore(s => s.music);
  const userColors = useStore(s => s.userColors);
  const { poseData } = usePoseDetection();
  
  // Get mode-specific params or use defaults
  const opalineParams = params.opalineWave || DEFAULT_PARAMS;
  
  // Check if we should use motion-reactive mode (based on opalineParams or handEffect settings)
  const motionReactive = opalineParams.motionReactive ?? false;
  
  const lastEnergyRef = useRef(0);
  
  // Hand tracking refs for motion-reactive mode
  const leftHandRefs = {
    lastPosition: useRef({ x: 0.5, y: 0.5 }),
    smoothedPosition: useRef({ x: 0.5, y: 0.5 }),
    velocity: useRef(0)
  };

  const rightHandRefs = {
    lastPosition: useRef({ x: 0.5, y: 0.5 }),
    smoothedPosition: useRef({ x: 0.5, y: 0.5 }),
    velocity: useRef(0)
  };
  
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
        uRainbowMode: { value: false },
        uColorSpread: { value: DEFAULT_PARAMS.colorSpread },
        uShimmerSpeed: { value: DEFAULT_PARAMS.shimmerSpeed },
        uMotionReactive: { value: false },
        uLeftHandPos: { value: new THREE.Vector2(0.3, 0.5) },
        uRightHandPos: { value: new THREE.Vector2(0.7, 0.5) },
        uLeftHandVelocity: { value: 0 },
        uRightHandVelocity: { value: 0 }
      },
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false
    });
  }, []);
  
  useFrame((state, dt) => {
    // Update motion reactive mode
    material.uniforms.uMotionReactive.value = motionReactive;
    
    if (motionReactive) {
      // Motion-reactive mode: use hand tracking
      const leftHandPos = getLeftHandPosition(poseData?.landmarks);
      const rightHandPos = getRightHandPosition(poseData?.landmarks);
      
      // Update left hand
      if (leftHandPos) {
        const smoothedLeft = smoothHandPosition(leftHandPos, leftHandRefs.smoothedPosition.current, 0.3);
        leftHandRefs.smoothedPosition.current = smoothedLeft;
        
        const leftVelocity = calculateHandVelocity(smoothedLeft, leftHandRefs.lastPosition.current, dt);
        leftHandRefs.velocity.current = leftVelocity;
        leftHandRefs.lastPosition.current = smoothedLeft;
        
        material.uniforms.uLeftHandPos.value.set(smoothedLeft.x, smoothedLeft.y);
        material.uniforms.uLeftHandVelocity.value = leftVelocity;
      } else {
        // No hand detected - reduce velocity smoothly
        material.uniforms.uLeftHandVelocity.value *= 0.95;
      }
      
      // Update right hand
      if (rightHandPos) {
        const smoothedRight = smoothHandPosition(rightHandPos, rightHandRefs.smoothedPosition.current, 0.3);
        rightHandRefs.smoothedPosition.current = smoothedRight;
        
        const rightVelocity = calculateHandVelocity(smoothedRight, rightHandRefs.lastPosition.current, dt);
        rightHandRefs.velocity.current = rightVelocity;
        rightHandRefs.lastPosition.current = smoothedRight;
        
        material.uniforms.uRightHandPos.value.set(smoothedRight.x, smoothedRight.y);
        material.uniforms.uRightHandVelocity.value = rightVelocity;
      } else {
        // No hand detected - reduce velocity smoothly
        material.uniforms.uRightHandVelocity.value *= 0.95;
      }
    } else {
      // Audio-reactive mode: use music data
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
        case 'beat': {
          // Beat mode: detect strong energy changes for rhythmic pulses
          const energyChange = Math.abs(energy - lastEnergyRef.current);
          const beatPulse = energyChange > 0.15 ? 1.0 : 0.0;
          lowBand = beatPulse * musicReact;
          midBand = beatPulse * 0.8 * musicReact;
          highBand = beatPulse * 0.6 * musicReact;
          lastEnergyRef.current = energy;
          break;
        }
        case 'frequencies':
        default:
          // Frequencies mode: separate low/mid/high bands based on centroid
          lowBand = energy * (1 - Math.min(centroid / 5000, 1)) * musicReact;
          midBand = energy * (1 - Math.abs(centroid / 5000 - 0.5) * 2) * musicReact;
          highBand = energy * Math.min(centroid / 5000, 1) * musicReact;
          break;
      }
      
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
    }
    
    // Update time
    material.uniforms.uTime.value += dt * (0.5 + params.speed * 0.5);
    
    // Update colors
    const bgRGB = hexToRGB(userColors.bgColor);
    const assetRGB = hexToRGB(userColors.assetColor);
    material.uniforms.uBgColor.value.set(bgRGB.r, bgRGB.g, bgRGB.b);
    material.uniforms.uAssetColor.value.set(assetRGB.r, assetRGB.g, assetRGB.b);
    
    // Update transparency
    material.uniforms.uTransparency.value = params.intensity || 0.8;
    
    // Update rainbow mode
    material.uniforms.uRainbowMode.value = opalineParams.rainbowMode ?? false;
    material.uniforms.uColorSpread.value = opalineParams.colorSpread ?? DEFAULT_PARAMS.colorSpread;
    material.uniforms.uShimmerSpeed.value = opalineParams.shimmerSpeed ?? DEFAULT_PARAMS.shimmerSpeed;
  });
  
  return (
    <mesh position={[0, 0, 1]} material={material}>
      <planeGeometry args={[25000, 13000]} />
    </mesh>
  );
}
