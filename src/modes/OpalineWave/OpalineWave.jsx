/**
 * Opaline Wave Mode - Dense Micro-Cloudlet Swarm System
 * Thousands of tiny particles flowing in bands with oil-on-water appearance
 * 
 * Audio mapping:
 * - Low → band drift/flow amplitude
 * - Mid → band width & speed
 * - High → iridescent shimmer
 * - Onset → brief local brighten + micro-burst
 * 
 * Hand interaction:
 * - Push/drag affects nearby micro-cloudlets (local gust)
 * - Flick gives short drift impulse
 * - Two-hand pinch spreads/squeezes bands
 * - Background stays put
 * 
 * Visual:
 * - Pastel films with flowing bands and iridescent rims
 * - Smooth laminar motion with local micro-eddies
 * - No global swirl or full-screen warping
 */

import React, { useMemo, useRef, useEffect } from 'react';
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

// Micro-cloudlet shader - tiny soft sprites with flow-based motion
const microCloudletVertexShader = `
attribute vec3 instancePosition;
attribute float instanceSize;
attribute vec3 instanceVelocity;
attribute vec3 instanceColor;
attribute float instanceAlpha;

varying vec2 vUv;
varying vec3 vColor;
varying float vAlpha;
varying float vSpeed;

void main() {
  vUv = uv - 0.5;
  vColor = instanceColor;
  vAlpha = instanceAlpha;
  vSpeed = length(instanceVelocity);
  
  // Billboard sprite
  vec3 pos = position;
  pos.xy *= instanceSize;
  
  // Translate to instance position
  pos += instancePosition;
  
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

const microCloudletFragmentShader = `
uniform float uTime;
uniform bool uRainbowMode;
uniform float uShimmer;
uniform float uIridescence;

varying vec2 vUv;
varying vec3 vColor;
varying float vAlpha;
varying float vSpeed;

// Simple noise for soft texture
float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

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

void main() {
  // Soft circular falloff
  float dist = length(vUv);
  float alpha = smoothstep(0.5, 0.1, dist);
  
  // Add soft noise texture
  float noiseVal = noise(vUv * 3.0 + uTime * 0.5) * 0.3 + 0.7;
  alpha *= noiseVal;
  
  // Iridescent rim based on speed and shimmer
  float rim = smoothstep(0.2, 0.4, dist) * (1.0 - smoothstep(0.4, 0.5, dist));
  vec3 iridescentColor = vec3(
    0.5 + 0.5 * sin(dist * 10.0 + uTime * 2.0),
    0.5 + 0.5 * sin(dist * 10.0 + uTime * 2.0 + 2.0),
    0.5 + 0.5 * sin(dist * 10.0 + uTime * 2.0 + 4.0)
  );
  
  vec3 color = vColor;
  color += rim * uIridescence * iridescentColor * 0.3;
  color += rim * uShimmer * 0.2;
  
  // Speed-based brightness (moving particles glow slightly)
  color += vSpeed * 0.1;
  
  // Fade based on instance alpha
  alpha *= vAlpha;
  
  if (alpha < 0.01) discard;
  
  gl_FragColor = vec4(color, alpha * 0.4);
}
`;

// Curl noise for flow field
function curlNoise(x, y, time, scale = 1.0) {
  const epsilon = 0.001;
  
  // Simple noise function
  const noise = (px, py) => {
    const nx = Math.sin(px * scale + time * 0.1) * Math.cos(py * scale - time * 0.15);
    const ny = Math.cos(px * scale - time * 0.12) * Math.sin(py * scale + time * 0.08);
    return nx + ny;
  };
  
  // Calculate curl (derivative)
  const n1 = noise(x + epsilon, y);
  const n2 = noise(x - epsilon, y);
  const n3 = noise(x, y + epsilon);
  const n4 = noise(x, y - epsilon);
  
  const dx = (n1 - n2) / (2 * epsilon);
  const dy = (n3 - n4) / (2 * epsilon);
  
  return { x: dy, y: -dx }; // Perpendicular for curl
}

// Default parameters
const DEFAULT_PARAMS = {
  motionReactive: true,
  handReactivity: 0.7,
  cloudCount: 20000,      // Massive count (10k-50k)
  sizeJitter: 0.5,        // Sprite size variation
  banding: 0.7,           // How strongly sprites align into ribbons
  blendAmount: 0.6,       // Creamy film merge amount
  bounciness: 0.3,        // Soft boundaries
  rainbowMode: false,
  colorSpread: 0.9,
  shimmerSpeed: 0.25
};

export default function OpalineWaveMode() {
  const params = useVisStore(s => s.params);
  const music = useVisStore(s => s.music);
  const userColors = useStore(s => s.userColors);
  const { poseData } = usePoseDetection();
  
  // Get mode-specific params or use defaults
  const opalineParams = params.opalineWave || DEFAULT_PARAMS;
  const motionReactive = opalineParams.motionReactive ?? true;
  const handReactivity = opalineParams.handReactivity ?? DEFAULT_PARAMS.handReactivity;
  const sizeJitter = opalineParams.sizeJitter ?? DEFAULT_PARAMS.sizeJitter;
  const banding = opalineParams.banding ?? DEFAULT_PARAMS.banding;
  const blendAmount = opalineParams.blendAmount ?? DEFAULT_PARAMS.blendAmount;
  
  // Auto-throttle based on performance
  const fpsRef = useRef(60);
  const [particleCount, setParticleCount] = React.useState(() => {
    const requestedCount = opalineParams.cloudCount ?? DEFAULT_PARAMS.cloudCount;
    return Math.min(requestedCount, 30000); // Cap at 30k initially
  });
  
  // World bounds
  const worldBounds = useMemo(() => ({ x: 12000, y: 7000 }), []);
  
  // Particle data arrays (structure of arrays for performance)
  const particlesRef = useRef({
    positions: null,
    velocities: null,
    sizes: null,
    colors: null,
    alphas: null,
    ages: null,
    initialized: false
  });
  
  // Initialize particles
  useEffect(() => {
    const particles = particlesRef.current;
    
    particles.positions = new Float32Array(particleCount * 3);
    particles.velocities = new Float32Array(particleCount * 3);
    particles.sizes = new Float32Array(particleCount);
    particles.colors = new Float32Array(particleCount * 3);
    particles.alphas = new Float32Array(particleCount);
    particles.ages = new Float32Array(particleCount);
    
    // Initialize with random positions and small sizes
    for (let i = 0; i < particleCount; i++) {
      // Position
      particles.positions[i * 3] = (Math.random() - 0.5) * worldBounds.x;
      particles.positions[i * 3 + 1] = (Math.random() - 0.5) * worldBounds.y;
      particles.positions[i * 3 + 2] = Math.random() * 50 - 25;
      
      // Velocity (flow field will control this)
      particles.velocities[i * 3] = (Math.random() - 0.5) * 10;
      particles.velocities[i * 3 + 1] = (Math.random() - 0.5) * 10;
      particles.velocities[i * 3 + 2] = 0;
      
      // Size with jitter
      const baseSize = 20 + Math.random() * 30 * sizeJitter;
      particles.sizes[i] = baseSize;
      
      // Color (will be updated based on palette)
      particles.colors[i * 3] = 0.8;
      particles.colors[i * 3 + 1] = 0.8;
      particles.colors[i * 3 + 2] = 1.0;
      
      // Alpha
      particles.alphas[i] = 0.6 + Math.random() * 0.4;
      
      // Age (for cycling)
      particles.ages[i] = Math.random() * 100;
    }
    
    particles.initialized = true;
  }, [particleCount, worldBounds, sizeJitter]);
  
  // Hand tracking refs
  const leftHandRefs = {
    lastPosition: useRef({ x: 0.5, y: 0.5 }),
    smoothedPosition: useRef({ x: 0.5, y: 0.5 }),
    velocity: useRef(0),
    worldPosition: useRef(new THREE.Vector3())
  };

  const rightHandRefs = {
    lastPosition: useRef({ x: 0.5, y: 0.5 }),
    smoothedPosition: useRef({ x: 0.5, y: 0.5 }),
    velocity: useRef(0),
    worldPosition: useRef(new THREE.Vector3())
  };
  
  // Create instanced mesh
  const instancedMeshRef = useRef();
  const geometry = useMemo(() => new THREE.PlaneGeometry(1, 1), []);
  
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: microCloudletVertexShader,
      fragmentShader: microCloudletFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uRainbowMode: { value: false },
        uShimmer: { value: 0 },
        uIridescence: { value: 0.5 }
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });
  }, []);
  
  const timeRef = useRef(0);
  const frameCountRef = useRef(0);
  const lastFPSCheckRef = useRef(0);
  
  useFrame((state, dt) => {
    const particles = particlesRef.current;
    if (!particles.initialized || !instancedMeshRef.current) return;
    
    timeRef.current += dt;
    frameCountRef.current++;
    
    // FPS monitoring for auto-throttle
    if (timeRef.current - lastFPSCheckRef.current > 1.0) {
      fpsRef.current = frameCountRef.current;
      frameCountRef.current = 0;
      lastFPSCheckRef.current = timeRef.current;
      
      // Auto-throttle if FPS drops below 50
      if (fpsRef.current < 50 && particleCount > 5000) {
        setParticleCount(Math.floor(particleCount * 0.8));
      }
    }
    
    // Update colors from user settings
    const bgRGB = hexToRGB(userColors.bgColor);
    const assetRGB = hexToRGB(userColors.assetColor);
    const rainbowMode = opalineParams.rainbowMode ?? false;
    material.uniforms.uRainbowMode.value = rainbowMode;
    material.uniforms.uTime.value = timeRef.current;
    
    // Music reactivity
    const lowFreq = music?.energy ?? 0;
    const midFreq = music?.rms ?? 0;
    const highFreq = music?.centroid ? Math.min(music.centroid / 5000, 1) : 0;
    
    // Music affects flow parameters
    const flowAmplitude = 50 + lowFreq * 100;  // Low = drift amplitude
    const flowSpeed = 0.3 + midFreq * 0.7;      // Mid = speed
    const shimmer = highFreq;                    // High = shimmer
    
    material.uniforms.uShimmer.value = shimmer;
    material.uniforms.uIridescence.value = 0.5 + highFreq * 0.5;
    
    // Hand tracking
    if (motionReactive) {
      const leftHandPos = getLeftHandPosition(poseData?.landmarks);
      const rightHandPos = getRightHandPosition(poseData?.landmarks);
      
      // Update left hand
      if (leftHandPos) {
        const smoothed = smoothHandPosition(leftHandPos, leftHandRefs.smoothedPosition.current, 0.15);
        leftHandRefs.smoothedPosition.current = smoothed;
        
        const worldX = (smoothed.x - 0.5) * worldBounds.x;
        const worldY = (0.5 - smoothed.y) * worldBounds.y;
        leftHandRefs.worldPosition.current.set(worldX, worldY, 0);
        
        const velocity = calculateHandVelocity(smoothed, leftHandRefs.lastPosition.current, dt);
        leftHandRefs.velocity.current = velocity;
        leftHandRefs.lastPosition.current = smoothed;
      }
      
      // Update right hand
      if (rightHandPos) {
        const smoothed = smoothHandPosition(rightHandPos, rightHandRefs.smoothedPosition.current, 0.15);
        rightHandRefs.smoothedPosition.current = smoothed;
        
        const worldX = (smoothed.x - 0.5) * worldBounds.x;
        const worldY = (0.5 - smoothed.y) * worldBounds.y;
        rightHandRefs.worldPosition.current.set(worldX, worldY, 0);
        
        const velocity = calculateHandVelocity(smoothed, rightHandRefs.lastPosition.current, dt);
        rightHandRefs.velocity.current = velocity;
        rightHandRefs.lastPosition.current = smoothed;
      }
    }
    
    // Update particles with flow field
    const flowScale = 0.001 * (1 - banding * 0.5); // Banding creates tighter flow
    const handInfluenceRadius = 800 * handReactivity;
    
    for (let i = 0; i < particleCount; i++) {
      const idx = i * 3;
      const x = particles.positions[idx];
      const y = particles.positions[idx + 1];
      
      // Flow field (curl noise for smooth laminar motion)
      const flow = curlNoise(x, y, timeRef.current, flowScale);
      
      // Base flow velocity
      let vx = flow.x * flowAmplitude * flowSpeed;
      let vy = flow.y * flowAmplitude * flowSpeed;
      
      // Hand influence (local push/drag)
      if (motionReactive) {
        // Left hand
        if (leftHandRefs.velocity.current > 0.01) {
          const dx = x - leftHandRefs.worldPosition.current.x;
          const dy = y - leftHandRefs.worldPosition.current.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist < handInfluenceRadius) {
            const influence = (1 - dist / handInfluenceRadius) * leftHandRefs.velocity.current;
            vx += (dx / dist) * influence * 500;
            vy += (dy / dist) * influence * 500;
          }
        }
        
        // Right hand
        if (rightHandRefs.velocity.current > 0.01) {
          const dx = x - rightHandRefs.worldPosition.current.x;
          const dy = y - rightHandRefs.worldPosition.current.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist < handInfluenceRadius) {
            const influence = (1 - dist / handInfluenceRadius) * rightHandRefs.velocity.current;
            vx += (dx / dist) * influence * 500;
            vy += (dy / dist) * influence * 500;
          }
        }
      }
      
      // Update velocity with damping
      particles.velocities[idx] = vx;
      particles.velocities[idx + 1] = vy;
      
      // Update position
      particles.positions[idx] += vx * dt;
      particles.positions[idx + 1] += vy * dt;
      
      // Wrap around boundaries (toroidal)
      if (particles.positions[idx] > worldBounds.x * 0.5) {
        particles.positions[idx] = -worldBounds.x * 0.5;
      } else if (particles.positions[idx] < -worldBounds.x * 0.5) {
        particles.positions[idx] = worldBounds.x * 0.5;
      }
      
      if (particles.positions[idx + 1] > worldBounds.y * 0.5) {
        particles.positions[idx + 1] = -worldBounds.y * 0.5;
      } else if (particles.positions[idx + 1] < -worldBounds.y * 0.5) {
        particles.positions[idx + 1] = worldBounds.y * 0.5;
      }
      
      // Update color based on position and palette
      if (rainbowMode) {
        const hue = (particles.ages[i] / 100 + timeRef.current * 0.1) % 1;
        const rgb = new THREE.Color().setHSL(hue, 0.7, 0.7);
        particles.colors[idx] = rgb.r;
        particles.colors[idx + 1] = rgb.g;
        particles.colors[idx + 2] = rgb.b;
      } else {
        // Gradient based on Y position for banding effect
        const bandPos = (particles.positions[idx + 1] / worldBounds.y + 0.5);
        particles.colors[idx] = THREE.MathUtils.lerp(bgRGB.r, assetRGB.r, bandPos);
        particles.colors[idx + 1] = THREE.MathUtils.lerp(bgRGB.g, assetRGB.g, bandPos);
        particles.colors[idx + 2] = THREE.MathUtils.lerp(bgRGB.b, assetRGB.b, bandPos);
      }
      
      // Age particles
      particles.ages[i] += dt * 10;
      if (particles.ages[i] > 100) particles.ages[i] = 0;
    }
    
    // Update instance attributes
    const mesh = instancedMeshRef.current;
    
    mesh.geometry.setAttribute('instancePosition', 
      new THREE.InstancedBufferAttribute(particles.positions, 3));
    mesh.geometry.setAttribute('instanceSize', 
      new THREE.InstancedBufferAttribute(particles.sizes, 1));
    mesh.geometry.setAttribute('instanceVelocity', 
      new THREE.InstancedBufferAttribute(particles.velocities, 3));
    mesh.geometry.setAttribute('instanceColor', 
      new THREE.InstancedBufferAttribute(particles.colors, 3));
    mesh.geometry.setAttribute('instanceAlpha', 
      new THREE.InstancedBufferAttribute(particles.alphas, 1));
    
    // Mark as needing update
    mesh.geometry.attributes.instancePosition.needsUpdate = true;
    mesh.geometry.attributes.instanceVelocity.needsUpdate = true;
    mesh.geometry.attributes.instanceColor.needsUpdate = true;
  });
  
  return (
    <instancedMesh 
      ref={instancedMeshRef}
      args={[geometry, material, particleCount]}
      position={[0, 0, 1]}
      frustumCulled={false}
    />
  );
}
