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
uniform float uHandInfluence;         // How much hands affect vs music (0-1)
uniform float uTrailDecay;            // How fast trails fade (0-1)
uniform float uHandDistance;          // Distance between hands
uniform float uSmoothness;            // Overall smoothness factor

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
  
  // Base parameters from music (always present)
  float musicFlowScale = 2.0 + uLowFreq * 2.0;
  float musicFlowSpeed = 0.3 + uMidFreq * 0.5;
  float musicShimmer = uHighFreq;
  float musicSwirlIntensity = 1.5 + uMidFreq * 2.0;
  
  float flowScale, flowSpeed, shimmer, swirlIntensity;
  
  if (uMotionReactive) {
    // Smooth velocity calculation with viscosity effect
    // Slow movements = thick/syrupy, fast movements = light/splashy
    float avgVelocity = (uLeftHandVelocity + uRightHandVelocity) * 0.5;
    float viscosity = 1.0 - smoothstep(0.0, 0.5, avgVelocity); // Higher when slower
    
    // Hand-driven parameters with trail memory and smoothness
    float handFlowScale = 2.0 + avgVelocity * (2.0 + viscosity);
    float handFlowSpeed = 0.2 + avgVelocity * (0.4 - viscosity * 0.2);
    float handShimmer = avgVelocity * (1.5 + viscosity * 0.5);
    float handSwirlIntensity = 1.0 + avgVelocity * (2.0 + viscosity);
    
    // Blend music and hand parameters based on hand influence
    // When hands are active, they take priority; when still, music returns
    float blendFactor = uHandInfluence * smoothstep(0.0, 0.1, avgVelocity);
    flowScale = mix(musicFlowScale, handFlowScale, blendFactor);
    flowSpeed = mix(musicFlowSpeed, handFlowSpeed, blendFactor);
    shimmer = mix(musicShimmer, handShimmer, blendFactor);
    swirlIntensity = mix(musicSwirlIntensity, handSwirlIntensity, blendFactor);
  } else {
    // Pure audio-reactive mode
    flowScale = musicFlowScale;
    flowSpeed = musicFlowSpeed;
    shimmer = musicShimmer;
    swirlIntensity = musicSwirlIntensity;
  }
  
  // Apply smoothness to flow speed (gentler, more liquid feel)
  flowSpeed *= uSmoothness;
  
  // Domain-warped coordinates for oil-on-water swirls with rotation
  vec2 warpedUV = domainWarp(uv * flowScale, uTime * flowSpeed, 0.5, swirlIntensity);
  
  // Add hand-influenced swirl centers when in motion mode
  if (uMotionReactive) {
    // Create swirl effects around each hand position
    vec2 leftHandUV = vec2(uLeftHandPos.x, 1.0 - uLeftHandPos.y);
    vec2 rightHandUV = vec2(uRightHandPos.x, 1.0 - uRightHandPos.y);
    
    // Calculate distance from each hand with softer falloff
    vec2 toLeftHand = warpedUV - leftHandUV;
    vec2 toRightHand = warpedUV - rightHandUV;
    float distLeft = length(toLeftHand);
    float distRight = length(toRightHand);
    
    // Influence radius scales with swirl size and velocity
    float leftRadius = 0.3 + uLeftHandVelocity * 0.4;
    float rightRadius = 0.3 + uRightHandVelocity * 0.4;
    
    // Two-hand interactions: stretch/squeeze effect
    float handDist = uHandDistance;
    float stretchFactor = smoothstep(0.2, 0.6, handDist); // Hands far apart = stretch
    float squeezeFactor = 1.0 - smoothstep(0.1, 0.3, handDist); // Hands close = squeeze
    
    // Apply hand-based swirls with smooth, elastic deformation
    vec2 finalWarpedUV = warpedUV;
    
    // Left hand influence with trail memory
    if (distLeft < leftRadius) {
      float leftInfluence = smoothstep(leftRadius, 0.0, distLeft); // Soft edge
      float leftVelFactor = mix(0.3, 1.0, smoothstep(0.0, 0.3, uLeftHandVelocity));
      
      // Swirl strength with afterglow (memory factor)
      float leftSwirlStrength = leftInfluence * leftVelFactor * uTrailDecay;
      
      // Rotation with time variation for living, breathing quality
      float leftRotation = leftSwirlStrength * (sin(uTime * 0.3) * 0.5 + 0.5) * 3.0;
      vec2 leftSwirled = leftHandUV + rotate2D(toLeftHand, leftRotation);
      
      // Gentle blend with elastic feel
      float leftBlend = leftInfluence * 0.6 * uHandInfluence;
      finalWarpedUV = mix(finalWarpedUV, leftSwirled, leftBlend);
    }
    
    // Right hand influence with trail memory
    if (distRight < rightRadius) {
      float rightInfluence = smoothstep(rightRadius, 0.0, distRight); // Soft edge
      float rightVelFactor = mix(0.3, 1.0, smoothstep(0.0, 0.3, uRightHandVelocity));
      
      // Swirl strength with afterglow
      float rightSwirlStrength = rightInfluence * rightVelFactor * uTrailDecay;
      
      // Rotation with time variation
      float rightRotation = rightSwirlStrength * (sin(uTime * 0.35) * 0.5 + 0.5) * 3.0;
      vec2 rightSwirled = rightHandUV + rotate2D(toRightHand, rightRotation);
      
      // Gentle blend
      float rightBlend = rightInfluence * 0.6 * uHandInfluence;
      finalWarpedUV = mix(finalWarpedUV, rightSwirled, rightBlend);
    }
    
    // Apply stretch/squeeze between hands
    if (stretchFactor > 0.01 || squeezeFactor > 0.01) {
      vec2 midPoint = (leftHandUV + rightHandUV) * 0.5;
      vec2 toMid = warpedUV - midPoint;
      float distToMid = length(toMid);
      
      // Stretch: thin the center
      if (stretchFactor > 0.01 && distToMid < 0.4) {
        float stretchInfluence = smoothstep(0.4, 0.0, distToMid) * stretchFactor;
        vec2 stretched = midPoint + toMid * (1.0 + stretchInfluence * 0.3);
        finalWarpedUV = mix(finalWarpedUV, stretched, stretchInfluence * 0.5);
      }
      
      // Squeeze: thicken the center
      if (squeezeFactor > 0.01 && distToMid < 0.3) {
        float squeezeInfluence = smoothstep(0.3, 0.0, distToMid) * squeezeFactor;
        vec2 squeezed = midPoint + toMid * (1.0 - squeezeInfluence * 0.3);
        finalWarpedUV = mix(finalWarpedUV, squeezed, squeezeInfluence * 0.6);
      }
    }
    
    warpedUV = finalWarpedUV;
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
  motionReactive: true,  // Enable motion-reactive mode by default
  handReactivity: 0.7,   // 0-1: How strongly hands affect the visual
  trailMemory: 0.6,      // 0-1: How long hand traces linger
  swirlSize: 0.5,        // 0-1: Size of circular gestures
  handVsMusic: 0.7       // 0-1: 0=music priority, 1=hand priority
};

export default function OpalineWaveMode() {
  const params = useVisStore(s => s.params);
  const music = useVisStore(s => s.music);
  const userColors = useStore(s => s.userColors);
  const { poseData } = usePoseDetection();
  
  // Get mode-specific params or use defaults
  const opalineParams = params.opalineWave || DEFAULT_PARAMS;
  
  // Check if we should use motion-reactive mode (based on opalineParams or handEffect settings)
  const motionReactive = opalineParams.motionReactive ?? true;
  
  const lastEnergyRef = useRef(0);
  
  // Hand tracking refs for motion-reactive mode
  const leftHandRefs = {
    lastPosition: useRef({ x: 0.5, y: 0.5 }),
    smoothedPosition: useRef({ x: 0.5, y: 0.5 }),
    velocity: useRef(0),
    velocitySmoothed: useRef(0)
  };

  const rightHandRefs = {
    lastPosition: useRef({ x: 0.5, y: 0.5 }),
    smoothedPosition: useRef({ x: 0.5, y: 0.5 }),
    velocity: useRef(0),
    velocitySmoothed: useRef(0)
  };
  
  // Track hand influence decay
  const handInfluenceRef = useRef(0);
  const lastGestureTimeRef = useRef(0);
  
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
        uRightHandVelocity: { value: 0 },
        uHandInfluence: { value: 0 },
        uTrailDecay: { value: 1.0 },
        uHandDistance: { value: 0.5 },
        uSmoothness: { value: 0.8 }
      },
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false
    });
  }, []);
  
  useFrame((state, dt) => {
    // Get user-configurable parameters
    const handReactivity = opalineParams.handReactivity ?? DEFAULT_PARAMS.handReactivity;
    const trailMemory = opalineParams.trailMemory ?? DEFAULT_PARAMS.trailMemory;
    const handVsMusic = opalineParams.handVsMusic ?? DEFAULT_PARAMS.handVsMusic;
    
    // Update motion reactive mode
    material.uniforms.uMotionReactive.value = motionReactive;
    
    if (motionReactive) {
      // Motion-reactive mode: use hand tracking
      const leftHandPos = getLeftHandPosition(poseData?.landmarks);
      const rightHandPos = getRightHandPosition(poseData?.landmarks);
      
      let hasActiveHand = false;
      let combinedVelocity = 0;
      
      // Update left hand with heavier smoothing (liquid silk feel)
      if (leftHandPos) {
        // Extra smooth position tracking (α=0.15 for buttery smooth motion)
        const smoothingFactor = 0.15 + (1 - handReactivity) * 0.1;
        const smoothedLeft = smoothHandPosition(leftHandPos, leftHandRefs.smoothedPosition.current, smoothingFactor);
        leftHandRefs.smoothedPosition.current = smoothedLeft;
        
        // Calculate velocity with damping
        const leftVelocity = calculateHandVelocity(smoothedLeft, leftHandRefs.lastPosition.current, dt);
        
        // Smooth velocity changes for gentle, elastic feel
        const velocitySmoothing = 0.2;
        leftHandRefs.velocitySmoothed.current = THREE.MathUtils.lerp(
          leftHandRefs.velocitySmoothed.current,
          leftVelocity,
          velocitySmoothing
        );
        
        leftHandRefs.velocity.current = leftVelocity;
        leftHandRefs.lastPosition.current = smoothedLeft;
        
        material.uniforms.uLeftHandPos.value.set(smoothedLeft.x, smoothedLeft.y);
        material.uniforms.uLeftHandVelocity.value = leftHandRefs.velocitySmoothed.current;
        
        hasActiveHand = true;
        combinedVelocity += leftHandRefs.velocitySmoothed.current;
      } else {
        // No hand detected - gentle fade with trail memory
        const decayRate = 0.92 - trailMemory * 0.15; // Slower decay = longer trails
        leftHandRefs.velocitySmoothed.current *= decayRate;
        material.uniforms.uLeftHandVelocity.value = leftHandRefs.velocitySmoothed.current;
      }
      
      // Update right hand with same smoothing
      if (rightHandPos) {
        const smoothingFactor = 0.15 + (1 - handReactivity) * 0.1;
        const smoothedRight = smoothHandPosition(rightHandPos, rightHandRefs.smoothedPosition.current, smoothingFactor);
        rightHandRefs.smoothedPosition.current = smoothedRight;
        
        const rightVelocity = calculateHandVelocity(smoothedRight, rightHandRefs.lastPosition.current, dt);
        
        const velocitySmoothing = 0.2;
        rightHandRefs.velocitySmoothed.current = THREE.MathUtils.lerp(
          rightHandRefs.velocitySmoothed.current,
          rightVelocity,
          velocitySmoothing
        );
        
        rightHandRefs.velocity.current = rightVelocity;
        rightHandRefs.lastPosition.current = smoothedRight;
        
        material.uniforms.uRightHandPos.value.set(smoothedRight.x, smoothedRight.y);
        material.uniforms.uRightHandVelocity.value = rightHandRefs.velocitySmoothed.current;
        
        hasActiveHand = true;
        combinedVelocity += rightHandRefs.velocitySmoothed.current;
      } else {
        const decayRate = 0.92 - trailMemory * 0.15;
        rightHandRefs.velocitySmoothed.current *= decayRate;
        material.uniforms.uRightHandVelocity.value = rightHandRefs.velocitySmoothed.current;
      }
      
      // Calculate hand distance for two-hand interactions
      if (leftHandPos && rightHandPos) {
        const dx = leftHandRefs.smoothedPosition.current.x - rightHandRefs.smoothedPosition.current.x;
        const dy = leftHandRefs.smoothedPosition.current.y - rightHandRefs.smoothedPosition.current.y;
        const handDistance = Math.sqrt(dx * dx + dy * dy);
        material.uniforms.uHandDistance.value = handDistance;
      }
      
      // Hand influence decay system: hands take priority for ~1 second after gesture
      if (hasActiveHand && combinedVelocity > 0.05) {
        // Active gesture detected
        lastGestureTimeRef.current = state.clock.elapsedTime;
        handInfluenceRef.current = handVsMusic; // Use user-configured balance
      } else {
        // No active gesture - decay hand influence over ~1 second
        const timeSinceGesture = state.clock.elapsedTime - lastGestureTimeRef.current;
        const decayTime = 1.0 + trailMemory * 0.5; // Trail memory extends decay time
        const decayFactor = Math.max(0, 1 - timeSinceGesture / decayTime);
        handInfluenceRef.current = handVsMusic * decayFactor;
      }
      
      material.uniforms.uHandInfluence.value = handInfluenceRef.current;
      material.uniforms.uTrailDecay.value = 0.7 + trailMemory * 0.3;
      material.uniforms.uSmoothness.value = 0.7 + handReactivity * 0.3;
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
