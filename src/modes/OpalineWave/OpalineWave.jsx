/**
 * Opaline Wave Mode - Cloudlet Physics System
 * Field of separate cloud/swirl objects with light physics and interactions
 * 
 * Audio mapping:
 * - Loudness → slight size/brightness breathing per cloudlet
 * - Treble → brief shimmer on contact/collision
 * - Beat → tiny settle/float pulses
 * 
 * Motion mapping (when motionReactive is true):
 * - Tap/Hold → grab cloudlet softly
 * - Drag → move individual cloudlet, nudge nearby ones on contact
 * - Flick → gentle throw with drift and bumps
 * - Two-hand herd → guide cluster without moving whole scene
 * 
 * Physics:
 * - Each cloudlet is independent with position, velocity
 * - Soft collisions with slight intermixing
 * - No global plane warp - only objects move
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

// Cloudlet shader - soft circular blobs
const cloudletVertexShader = `
attribute vec3 instancePosition;
attribute float instanceSize;
attribute float instanceRotation;
attribute vec3 instanceColor;
attribute float instanceAlpha;

varying vec2 vUv;
varying vec3 vColor;
varying float vAlpha;

void main() {
  vUv = uv - 0.5;
  vColor = instanceColor;
  vAlpha = instanceAlpha;
  
  // Rotate and scale based on instance attributes
  vec3 pos = position;
  pos.xy *= instanceSize;
  
  // Apply rotation
  float c = cos(instanceRotation);
  float s = sin(instanceRotation);
  pos.xy = vec2(pos.x * c - pos.y * s, pos.x * s + pos.y * c);
  
  // Translate to instance position
  pos += instancePosition;
  
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

const cloudletFragmentShader = `
uniform float uTime;
uniform bool uRainbowMode;
uniform float uShimmer;

varying vec2 vUv;
varying vec3 vColor;
varying float vAlpha;

// Simple noise for soft blob texture
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
  float alpha = smoothstep(0.5, 0.2, dist);
  
  // Add soft noise texture
  float noiseVal = noise(vUv * 4.0 + uTime * 0.1) * 0.3 + 0.7;
  alpha *= noiseVal;
  
  // Shimmer effect on edges
  float shimmerEdge = smoothstep(0.3, 0.4, dist) * (1.0 - smoothstep(0.4, 0.5, dist));
  vec3 color = vColor + shimmerEdge * uShimmer * vec3(0.3);
  
  // Fade based on instance alpha
  alpha *= vAlpha;
  
  if (alpha < 0.01) discard;
  
  gl_FragColor = vec4(color, alpha * 0.7);
}
`;

// Default parameters
const DEFAULT_PARAMS = {
  motionReactive: true,
  handReactivity: 0.7,
  cloudCount: 15,      // Few to Many (5-30)
  bounciness: 0.5,     // Soft to Springy (0-1)
  blendAmount: 0.6,    // Minimal to Lush (0-1)
  rainbowMode: false,
  colorSpread: 0.9,
  shimmerSpeed: 0.25
};

// Cloudlet class - represents a single cloud object
class Cloudlet {
  constructor(index, worldBounds) {
    this.id = index;
    
    // Position and physics
    this.position = new THREE.Vector3(
      (Math.random() - 0.5) * worldBounds.x,
      (Math.random() - 0.5) * worldBounds.y,
      (Math.random() - 0.5) * 100 + index * 2 // Slight depth variation
    );
    this.velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 20,
      (Math.random() - 0.5) * 20,
      0
    );
    this.acceleration = new THREE.Vector3();
    
    // Visual properties - larger sizes for better visibility
    this.baseSize = 300 + Math.random() * 400;
    this.size = this.baseSize;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotationSpeed = (Math.random() - 0.5) * 0.1;
    
    // Color
    this.color = new THREE.Color();
    this.baseColor = new THREE.Color();
    this.alpha = 0.7 + Math.random() * 0.3;
    
    // Interaction
    this.grabbed = false;
    this.grabbedBy = null; // 'left' or 'right'
    this.mass = 0.8 + Math.random() * 0.4;
    
    // Music reactivity
    this.breathPhase = Math.random() * Math.PI * 2;
    this.shimmer = 0;
  }
  
  update(dt, worldBounds, bounciness, damping) {
    if (this.grabbed) {
      // When grabbed, reduce velocity significantly
      this.velocity.multiplyScalar(0.8);
      return;
    }
    
    // Apply physics
    this.velocity.add(this.acceleration.clone().multiplyScalar(dt));
    this.velocity.multiplyScalar(damping); // Air resistance
    this.position.add(this.velocity.clone().multiplyScalar(dt));
    this.acceleration.set(0, 0, 0);
    
    // Rotation
    this.rotation += this.rotationSpeed * dt;
    
    // Bounce off boundaries (soft)
    const margin = this.size * 0.5;
    if (Math.abs(this.position.x) > worldBounds.x * 0.5 - margin) {
      this.position.x = THREE.MathUtils.clamp(
        this.position.x,
        -worldBounds.x * 0.5 + margin,
        worldBounds.x * 0.5 - margin
      );
      this.velocity.x *= -bounciness;
    }
    if (Math.abs(this.position.y) > worldBounds.y * 0.5 - margin) {
      this.position.y = THREE.MathUtils.clamp(
        this.position.y,
        -worldBounds.y * 0.5 + margin,
        worldBounds.y * 0.5 - margin
      );
      this.velocity.y *= -bounciness;
    }
    
    // Gradually reduce shimmer
    this.shimmer *= 0.95;
  }
  
  applyForce(force) {
    this.acceleration.add(force.clone().divideScalar(this.mass));
  }
  
  checkCollision(other) {
    const dist = this.position.distanceTo(other.position);
    const minDist = (this.size + other.size) * 0.5;
    return dist < minDist;
  }
  
  resolveCollision(other, blendAmount) {
    const dir = new THREE.Vector3().subVectors(this.position, other.position);
    const dist = dir.length();
    const minDist = (this.size + other.size) * 0.5;
    
    if (dist < minDist && dist > 0) {
      // Separate
      dir.normalize();
      const overlap = minDist - dist;
      const separation = dir.multiplyScalar(overlap * 0.5);
      
      if (!this.grabbed) this.position.add(separation);
      if (!other.grabbed) other.position.sub(separation);
      
      // Velocity exchange (soft collision)
      if (!this.grabbed && !other.grabbed) {
        const relVel = new THREE.Vector3().subVectors(this.velocity, other.velocity);
        const velAlongNormal = relVel.dot(dir);
        
        if (velAlongNormal < 0) {
          const impulse = dir.clone().multiplyScalar(velAlongNormal * 0.5);
          this.velocity.sub(impulse.clone().divideScalar(this.mass));
          other.velocity.add(impulse.clone().divideScalar(other.mass));
        }
      }
      
      // Color blending on collision
      if (blendAmount > 0) {
        const blendFactor = blendAmount * 0.1;
        this.color.lerp(other.color, blendFactor);
        other.color.lerp(this.color, blendFactor);
      }
      
      // Shimmer on collision
      this.shimmer = Math.max(this.shimmer, 0.5);
      other.shimmer = Math.max(other.shimmer, 0.5);
      
      return true;
    }
    return false;
  }
}

export default function OpalineWaveMode() {
  const params = useVisStore(s => s.params);
  const music = useVisStore(s => s.music);
  const userColors = useStore(s => s.userColors);
  const { poseData } = usePoseDetection();
  
  // Get mode-specific params or use defaults
  const opalineParams = params.opalineWave || DEFAULT_PARAMS;
  const motionReactive = opalineParams.motionReactive ?? true;
  const handReactivity = opalineParams.handReactivity ?? DEFAULT_PARAMS.handReactivity;
  const cloudCount = Math.floor(opalineParams.cloudCount ?? DEFAULT_PARAMS.cloudCount);
  const bounciness = opalineParams.bounciness ?? DEFAULT_PARAMS.bounciness;
  const blendAmount = opalineParams.blendAmount ?? DEFAULT_PARAMS.blendAmount;
  
  // World bounds - smaller for better visibility
  const worldBounds = useMemo(() => ({ x: 15000, y: 8000 }), []);
  
  // Cloudlets array
  const cloudletsRef = useRef([]);
  
  // Initialize cloudlets
  useEffect(() => {
    const newCloudlets = Array.from({ length: cloudCount }, (_, i) => 
      new Cloudlet(i, worldBounds)
    );
    cloudletsRef.current = newCloudlets;
    
    // Initialize geometry with dummy attributes to ensure rendering works
    if (instancedMeshRef.current) {
      const mesh = instancedMeshRef.current;
      const dummyPositions = new Float32Array(cloudCount * 3);
      const dummySizes = new Float32Array(cloudCount);
      const dummyRotations = new Float32Array(cloudCount);
      const dummyColors = new Float32Array(cloudCount * 3);
      const dummyAlphas = new Float32Array(cloudCount);
      
      newCloudlets.forEach((cloudlet, i) => {
        dummyPositions[i * 3] = cloudlet.position.x;
        dummyPositions[i * 3 + 1] = cloudlet.position.y;
        dummyPositions[i * 3 + 2] = cloudlet.position.z;
        dummySizes[i] = cloudlet.size;
        dummyRotations[i] = cloudlet.rotation;
        dummyColors[i * 3] = 0.8;
        dummyColors[i * 3 + 1] = 0.8;
        dummyColors[i * 3 + 2] = 1.0;
        dummyAlphas[i] = cloudlet.alpha;
      });
      
      mesh.geometry.setAttribute('instancePosition', new THREE.InstancedBufferAttribute(dummyPositions, 3));
      mesh.geometry.setAttribute('instanceSize', new THREE.InstancedBufferAttribute(dummySizes, 1));
      mesh.geometry.setAttribute('instanceRotation', new THREE.InstancedBufferAttribute(dummyRotations, 1));
      mesh.geometry.setAttribute('instanceColor', new THREE.InstancedBufferAttribute(dummyColors, 3));
      mesh.geometry.setAttribute('instanceAlpha', new THREE.InstancedBufferAttribute(dummyAlphas, 1));
    }
  }, [cloudCount, worldBounds]);
  
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
  
  const grabbedCloudletRef = useRef({ left: null, right: null });
  
  // Create instanced mesh
  const instancedMeshRef = useRef();
  const geometry = useMemo(() => new THREE.PlaneGeometry(1, 1), []);
  
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: cloudletVertexShader,
      fragmentShader: cloudletFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uRainbowMode: { value: false },
        uShimmer: { value: 0 }
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
      side: THREE.DoubleSide
    });
  }, []);
  
  useFrame((state, dt) => {
    const cloudlets = cloudletsRef.current;
    if (!cloudlets.length || !instancedMeshRef.current) return;
    
    // Update colors from user settings
    const bgRGB = hexToRGB(userColors.bgColor);
    const assetRGB = hexToRGB(userColors.assetColor);
    const rainbowMode = opalineParams.rainbowMode ?? false;
    material.uniforms.uRainbowMode.value = rainbowMode;
    material.uniforms.uTime.value = state.clock.elapsedTime;
    
    // Music reactivity
    const loudness = music?.energy ?? 0;
    const treble = music?.centroid ? Math.min(music.centroid / 5000, 1) : 0;
    const beatPulse = music?.rms ?? 0;
    
    // Hand tracking
    if (motionReactive) {
      const leftHandPos = getLeftHandPosition(poseData?.landmarks);
      const rightHandPos = getRightHandPosition(poseData?.landmarks);
      
      // Update left hand
      if (leftHandPos) {
        const smoothed = smoothHandPosition(leftHandPos, leftHandRefs.smoothedPosition.current, 0.15);
        leftHandRefs.smoothedPosition.current = smoothed;
        
        // Convert to world coordinates
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
      
      // Hand interaction - grab nearest cloudlet
      const grabRadius = 300 * handReactivity;
      
      ['left', 'right'].forEach(hand => {
        const handRef = hand === 'left' ? leftHandRefs : rightHandRefs;
        const handPos = hand === 'left' ? leftHandPos : rightHandPos;
        
        if (!handPos) {
          // Release if hand disappeared
          if (grabbedCloudletRef.current[hand] !== null) {
            const cloudlet = cloudlets[grabbedCloudletRef.current[hand]];
            if (cloudlet) {
              cloudlet.grabbed = false;
              cloudlet.grabbedBy = null;
              
              // Apply flick velocity if hand was moving
              if (handRef.velocity.current > 0.2) {
                const vel = new THREE.Vector3(
                  (Math.random() - 0.5) * 100,
                  (Math.random() - 0.5) * 100,
                  0
                );
                vel.multiplyScalar(handRef.velocity.current * 500);
                cloudlet.velocity.add(vel);
              }
            }
            grabbedCloudletRef.current[hand] = null;
          }
          return;
        }
        
        // Check if already grabbing
        if (grabbedCloudletRef.current[hand] !== null) {
          const cloudlet = cloudlets[grabbedCloudletRef.current[hand]];
          if (cloudlet && cloudlet.grabbed) {
            // Move grabbed cloudlet
            const targetPos = handRef.worldPosition.current;
            cloudlet.position.lerp(targetPos, 0.3);
            return;
          }
        }
        
        // Try to grab nearest cloudlet
        let nearestCloudlet = null;
        let nearestDist = grabRadius;
        
        cloudlets.forEach((cloudlet, idx) => {
          if (cloudlet.grabbed) return; // Skip already grabbed
          const dist = cloudlet.position.distanceTo(handRef.worldPosition.current);
          if (dist < nearestDist) {
            nearestDist = dist;
            nearestCloudlet = idx;
          }
        });
        
        if (nearestCloudlet !== null) {
          cloudlets[nearestCloudlet].grabbed = true;
          cloudlets[nearestCloudlet].grabbedBy = hand;
          grabbedCloudletRef.current[hand] = nearestCloudlet;
        }
      });
    }
    
    // Update each cloudlet
    const damping = 0.98;
    cloudlets.forEach((cloudlet, i) => {
      // Update physics
      cloudlet.update(dt, worldBounds, bounciness, damping);
      
      // Music breathing effect
      cloudlet.breathPhase += dt * 2;
      const breathScale = 1.0 + Math.sin(cloudlet.breathPhase) * loudness * 0.1;
      cloudlet.size = cloudlet.baseSize * breathScale;
      
      // Beat pulse
      if (beatPulse > 0.7) {
        cloudlet.size += 20 * beatPulse;
      }
      
      // Update color
      if (rainbowMode) {
        const hue = (i / cloudlets.length + state.clock.elapsedTime * 0.1) % 1;
        cloudlet.color.setHSL(hue, 0.7, 0.7);
      } else {
        cloudlet.baseColor.setRGB(
          THREE.MathUtils.lerp(bgRGB.r, assetRGB.r, (i / cloudlets.length)),
          THREE.MathUtils.lerp(bgRGB.g, assetRGB.g, (i / cloudlets.length)),
          THREE.MathUtils.lerp(bgRGB.b, assetRGB.b, (i / cloudlets.length))
        );
        cloudlet.color.copy(cloudlet.baseColor);
      }
      
      // Shimmer on treble
      if (treble > 0.5) {
        cloudlet.shimmer = Math.max(cloudlet.shimmer, treble * 0.5);
      }
    });
    
    // Check collisions
    for (let i = 0; i < cloudlets.length; i++) {
      for (let j = i + 1; j < cloudlets.length; j++) {
        if (cloudlets[i].checkCollision(cloudlets[j])) {
          cloudlets[i].resolveCollision(cloudlets[j], blendAmount);
        }
      }
    }
    
    // Update instance attributes
    const mesh = instancedMeshRef.current;
    const positionArray = new Float32Array(cloudlets.length * 3);
    const sizeArray = new Float32Array(cloudlets.length);
    const rotationArray = new Float32Array(cloudlets.length);
    const colorArray = new Float32Array(cloudlets.length * 3);
    const alphaArray = new Float32Array(cloudlets.length);
    
    let avgShimmer = 0;
    cloudlets.forEach((cloudlet, i) => {
      positionArray[i * 3] = cloudlet.position.x;
      positionArray[i * 3 + 1] = cloudlet.position.y;
      positionArray[i * 3 + 2] = cloudlet.position.z;
      
      sizeArray[i] = cloudlet.size;
      rotationArray[i] = cloudlet.rotation;
      
      colorArray[i * 3] = cloudlet.color.r;
      colorArray[i * 3 + 1] = cloudlet.color.g;
      colorArray[i * 3 + 2] = cloudlet.color.b;
      
      alphaArray[i] = cloudlet.alpha;
      avgShimmer += cloudlet.shimmer;
    });
    
    material.uniforms.uShimmer.value = avgShimmer / cloudlets.length;
    
    mesh.geometry.setAttribute('instancePosition', new THREE.InstancedBufferAttribute(positionArray, 3));
    mesh.geometry.setAttribute('instanceSize', new THREE.InstancedBufferAttribute(sizeArray, 1));
    mesh.geometry.setAttribute('instanceRotation', new THREE.InstancedBufferAttribute(rotationArray, 1));
    mesh.geometry.setAttribute('instanceColor', new THREE.InstancedBufferAttribute(colorArray, 3));
    mesh.geometry.setAttribute('instanceAlpha', new THREE.InstancedBufferAttribute(alphaArray, 1));
    
    // Mark attributes as needing update
    mesh.geometry.attributes.instancePosition.needsUpdate = true;
    mesh.geometry.attributes.instanceSize.needsUpdate = true;
    mesh.geometry.attributes.instanceRotation.needsUpdate = true;
    mesh.geometry.attributes.instanceColor.needsUpdate = true;
    mesh.geometry.attributes.instanceAlpha.needsUpdate = true;
  });
  
  return (
    <instancedMesh 
      ref={instancedMeshRef}
      args={[geometry, material, cloudCount]}
      position={[0, 0, 1]}
    />
  );
}
