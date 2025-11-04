/**
 * Paper Lanterns Mode
 * East Asian night festival aesthetic with floating lanterns
 * 
 * Audio mapping:
 * - low → buoyancy pulses (lift)
 * - mid → lantern sway amplitude
 * - high → star-twinkle particle spawns
 * - beat → subset of lanterns brighten and drift forward
 * 
 * Motion mapping:
 * - com.x steers swarm drift left/right
 */

import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useVisStore } from '../../state/useVisStore';
import useStore, { hexToRGB } from '../../core/store';
import { autoThrottle } from '../../utils/autoThrottle';

const vertexShader = `
uniform float uTime;
uniform float uBuoyancy;
uniform float uSway;

attribute float aPhase;
attribute float aBrightness;
attribute vec3 aVelocity;

varying float vBrightness;
varying vec2 vUv;

// Curl noise for organic movement
vec3 curlNoise(vec3 p) {
  float e = 0.1;
  float n1 = sin(p.x * 0.5 + uTime + aPhase);
  float n2 = sin(p.y * 0.3 + uTime * 0.7 + aPhase);
  float n3 = sin(p.z * 0.4 + uTime * 0.5 + aPhase);
  
  vec3 curl = vec3(n2 - n3, n3 - n1, n1 - n2) * 0.5;
  return curl;
}

void main() {
  vUv = uv;
  vBrightness = aBrightness;
  
  vec3 pos = position;
  
  // Apply instance position
  pos += aVelocity;
  
  // Add curl noise flow
  vec3 curl = curlNoise(pos * 0.01);
  pos += curl * uSway * 100.0;
  
  // Buoyancy - upward drift
  pos.y += uBuoyancy * 50.0 * sin(uTime * 0.5 + aPhase);
  
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

const fragmentShader = `
uniform vec3 uBgColor;
uniform vec3 uAssetColor;
uniform float uIntensity;
uniform sampler2D uPatternTexture;

varying float vBrightness;
varying vec2 vUv;

void main() {
  // Cylindrical lantern shape
  vec2 uv = vUv;
  
  // Create vertical bands for lantern structure
  float bands = abs(sin(uv.x * 3.14159 * 4.0)) * 0.3 + 0.7;
  
  // Soft glow falloff from center
  float centerDist = abs(uv.y - 0.5) * 2.0;
  float glow = (1.0 - centerDist) * 0.8 + 0.2;
  
  // Combine effects
  float pattern = bands * glow;
  
  // Color with brightness modulation
  vec3 lanternColor = mix(uAssetColor, vec3(1.0, 0.9, 0.7), 0.3);
  vec3 color = lanternColor * pattern * vBrightness;
  
  // Add warm glow
  color += lanternColor * glow * vBrightness * 0.5;
  
  float alpha = pattern * vBrightness * uIntensity;
  
  gl_FragColor = vec4(color, alpha);
}
`;

export default function PaperLanternsMode() {
  const params = useVisStore(s => s.params);
  const motion = useVisStore(s => s.motion);
  const music = useVisStore(s => s.music);
  const userColors = useStore(s => s.userColors);
  
  const lanternsRef = useRef(null);
  const instanceDataRef = useRef([]);
  const lastEnergyRef = useRef(0);
  
  // Base count and throttled count
  const baseCount = 60;
  const lanternCount = autoThrottle.getInstanceCount(baseCount, 20);
  
  // Create instanced geometry and attributes
  const { geometry, material } = useMemo(() => {
    const geom = new THREE.CylinderGeometry(150, 150, 300, 8, 1);
    
    // Create instance attributes
    const phases = new Float32Array(lanternCount);
    const brightnesses = new Float32Array(lanternCount);
    const velocities = new Float32Array(lanternCount * 3);
    
    instanceDataRef.current = [];
    
    for (let i = 0; i < lanternCount; i++) {
      phases[i] = Math.random() * Math.PI * 2;
      brightnesses[i] = 0.6 + Math.random() * 0.4;
      
      // Initial positions spread across space
      const x = (Math.random() - 0.5) * 8000;
      const y = (Math.random() - 0.5) * 4000 - 2000;
      const z = (Math.random() - 0.5) * 1000;
      
      velocities[i * 3] = x;
      velocities[i * 3 + 1] = y;
      velocities[i * 3 + 2] = z;
      
      instanceDataRef.current.push({
        velocity: new THREE.Vector3(x, y, z),
        brightness: brightnesses[i],
        phase: phases[i],
        beatBoost: 0,
      });
    }
    
    geom.setAttribute('aPhase', new THREE.InstancedBufferAttribute(phases, 1));
    geom.setAttribute('aBrightness', new THREE.InstancedBufferAttribute(brightnesses, 1));
    geom.setAttribute('aVelocity', new THREE.InstancedBufferAttribute(velocities, 3));
    
    const mat = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uBgColor: { value: new THREE.Vector3() },
        uAssetColor: { value: new THREE.Vector3() },
        uIntensity: { value: 0.8 },
        uBuoyancy: { value: 0 },
        uSway: { value: 0 },
      },
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    
    return { geometry: geom, material: mat };
  }, [lanternCount]);
  
  useFrame((state, dt) => {
    const musicReact = params.musicReact || 0;
    const energy = (music?.energy ?? 0) * musicReact;
    const centroid = music?.centroid ?? 0;
    
    // Estimate frequency bands from centroid and energy
    const low = energy * (1 - Math.min(centroid / 5000, 1));
    const mid = energy * (1 - Math.abs(centroid / 5000 - 0.5) * 2);
    const beat = energy > lastEnergyRef.current * 1.5 && energy > 0.1;
    lastEnergyRef.current = energy;
    
    // Update time
    material.uniforms.uTime.value += dt * (0.3 + params.speed * 0.3);
    
    // Update colors
    const bgRGB = hexToRGB(userColors.bgColor);
    const assetRGB = hexToRGB(userColors.assetColor);
    material.uniforms.uBgColor.value.set(bgRGB.r, bgRGB.g, bgRGB.b);
    material.uniforms.uAssetColor.value.set(assetRGB.r, assetRGB.g, assetRGB.b);
    
    // Update parameters
    material.uniforms.uIntensity.value = params.intensity || 0.8;
    
    // Low frequencies control buoyancy
    const buoyancy = low;
    material.uniforms.uBuoyancy.value = THREE.MathUtils.lerp(
      material.uniforms.uBuoyancy.value,
      buoyancy,
      0.1
    );
    
    // Mid frequencies control sway
    const sway = mid;
    material.uniforms.uSway.value = THREE.MathUtils.lerp(
      material.uniforms.uSway.value,
      sway,
      0.1
    );
    
    // Beat makes lanterns brighten
    if (beat && lanternsRef.current) {
      // Brighten a random subset
      for (let i = 0; i < lanternCount; i++) {
        if (Math.random() < 0.3) {
          instanceDataRef.current[i].beatBoost = 1.0;
        }
      }
    }
    
    // Update instance attributes
    if (lanternsRef.current) {
      const brightnessAttr = geometry.getAttribute('aBrightness');
      const velocityAttr = geometry.getAttribute('aVelocity');
      
      for (let i = 0; i < lanternCount; i++) {
        const data = instanceDataRef.current[i];
        
        // Decay beat boost
        data.beatBoost *= 0.95;
        brightnessAttr.array[i] = data.brightness + data.beatBoost;
        
        // Drift upward and wrap around
        data.velocity.y += dt * 20;
        if (data.velocity.y > 2000) {
          data.velocity.y = -2000;
          data.velocity.x = (Math.random() - 0.5) * 8000;
        }
        
        // Motion-based drift (if available)
        if (motion?.com) {
          data.velocity.x += (motion.com.x - 0.5) * 10;
        }
        
        velocityAttr.array[i * 3] = data.velocity.x;
        velocityAttr.array[i * 3 + 1] = data.velocity.y;
        velocityAttr.array[i * 3 + 2] = data.velocity.z;
      }
      
      brightnessAttr.needsUpdate = true;
      velocityAttr.needsUpdate = true;
    }
  });
  
  return (
    <instancedMesh
      ref={lanternsRef}
      args={[geometry, material, lanternCount]}
      position={[0, 0, 1]}
    />
  );
}
