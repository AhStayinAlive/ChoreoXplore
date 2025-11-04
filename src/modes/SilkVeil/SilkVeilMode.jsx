/**
 * Silk Veil Mode
 * Flowing, soft, romantic visual with layered translucent "silk" sheets
 * 
 * Audio mapping:
 * - low → turbulence strength (0–1) bends veils
 * - high → specular shimmer intensity; micro-noise scroll speed
 * - beat → gentle gust that advances veil phase
 * 
 * Motion mapping (optional):
 * - bodyVelocity tears faint pathways through the fabric
 */

import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useVisStore } from '../../state/useVisStore';
import useStore, { hexToRGB } from '../../core/store';
import { autoThrottle } from '../../utils/autoThrottle';

// Simplex-like noise approximation for GLSL
const noiseFunction = `
// Simple 3D noise function
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  
  i = mod289(i);
  vec4 p = permute(permute(permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  
  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;
  
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}
`;

const vertexShader = `
${noiseFunction}

uniform float uTime;
uniform float uTurbulence;
uniform float uDetail;
uniform float uBeatPhase;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;
varying float vDisplacement;

void main() {
  vUv = uv;
  
  // Apply noise-based displacement for flowing silk effect
  vec3 pos = position;
  float detail = uDetail * 2.0;
  
  // Multi-octave noise for organic movement
  float noise1 = snoise(vec3(pos.x * detail, pos.y * detail, uTime * 0.3 + uBeatPhase));
  float noise2 = snoise(vec3(pos.x * detail * 2.0, pos.y * detail * 2.0, uTime * 0.5)) * 0.5;
  float noise3 = snoise(vec3(pos.x * detail * 4.0, pos.y * detail * 4.0, uTime * 0.7)) * 0.25;
  
  float displacement = (noise1 + noise2 + noise3) * uTurbulence * 100.0;
  vDisplacement = displacement;
  
  pos.z += displacement;
  
  // Calculate normal for lighting
  float delta = 0.1;
  float dx = snoise(vec3((pos.x + delta) * detail, pos.y * detail, uTime * 0.3 + uBeatPhase)) * uTurbulence * 100.0;
  float dy = snoise(vec3(pos.x * detail, (pos.y + delta) * detail, uTime * 0.3 + uBeatPhase)) * uTurbulence * 100.0;
  
  vec3 tangentX = vec3(delta, 0.0, dx - displacement);
  vec3 tangentY = vec3(0.0, delta, dy - displacement);
  vNormal = normalize(cross(tangentX, tangentY));
  
  vPosition = pos;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

const fragmentShader = `
${noiseFunction}

uniform float uTime;
uniform vec3 uBgColor;
uniform vec3 uAssetColor;
uniform float uIntensity;
uniform float uShimmer;
uniform float uDecay;
uniform vec3 uCameraPos;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;
varying float vDisplacement;

void main() {
  // Fresnel effect for pearlescent shimmer
  vec3 viewDir = normalize(uCameraPos - vPosition);
  float fresnel = pow(1.0 - abs(dot(vNormal, viewDir)), 2.0);
  
  // Iridescence based on viewing angle and time
  float iridescence = snoise(vec3(vUv * 5.0, uTime * 0.5)) * 0.5 + 0.5;
  iridescence *= uShimmer;
  
  // Base silk color with pearlescent highlights
  vec3 baseColor = mix(uBgColor, uAssetColor, 0.3);
  vec3 shimmerColor = mix(uAssetColor, vec3(1.0), fresnel * iridescence);
  
  vec3 color = mix(baseColor, shimmerColor, fresnel * 0.7 + iridescence * 0.3);
  
  // Soft transparency
  float alpha = uIntensity * (0.3 + fresnel * 0.4) * uDecay;
  
  gl_FragColor = vec4(color, alpha);
}
`;

export default function SilkVeilMode() {
  const params = useVisStore(s => s.params);
  const music = useVisStore(s => s.music);
  const userColors = useStore(s => s.userColors);
  
  const meshRefs = useRef([]);
  const beatPhaseRef = useRef(0);
  const lastEnergyRef = useRef(0);
  
  // Material uniforms
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uBgColor: { value: new THREE.Vector3() },
    uAssetColor: { value: new THREE.Vector3() },
    uIntensity: { value: 0.8 },
    uTurbulence: { value: 0.5 },
    uShimmer: { value: 0.5 },
    uDetail: { value: 1.0 },
    uDecay: { value: 1.0 },
    uBeatPhase: { value: 0 },
    uCameraPos: { value: new THREE.Vector3(0, 0, 5) },
  }), []);
  
  // Subscribe to audio features - removed, using music from useVisStore directly
  // React.useEffect(() => {
  //   const unsubscribe = audioFeaturesService.subscribe((features) => {
  //     audioFeaturesRef.current = features;
  //   });
  //   
  //   return unsubscribe;
  // }, []);
  
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
  
  // Create layered veil geometry
  const layers = useMemo(() => {
    const baseCount = 5;
    const count = autoThrottle.getInstanceCount(baseCount, 3);
    const layerArray = [];
    
    for (let i = 0; i < count; i++) {
      const z = i * 50 - 100;
      const scale = 1.0 + i * 0.1;
      layerArray.push({ z, scale });
    }
    
    return layerArray;
  }, []);
  
  useFrame((state, dt) => {
    const musicReact = params.musicReact || 0;
    const audioMode = params.audioMode || 'frequencies';
    const energy = music?.energy ?? 0;
    const rms = music?.rms ?? 0;
    const centroid = music?.centroid ?? 0;
    
    let low, high;
    
    // Different audio modes
    switch(audioMode) {
      case 'energy':
        low = energy * 0.8 * musicReact;
        high = energy * 0.6 * musicReact;
        break;
      case 'rms':
        low = rms * 0.9 * musicReact;
        high = rms * 0.7 * musicReact;
        break;
      case 'beat':
        const energyChange = Math.abs(energy - lastEnergyRef.current);
        const beatPulse = energyChange > 0.15 ? 1.0 : 0.0;
        low = beatPulse * musicReact;
        high = beatPulse * 0.6 * musicReact;
        lastEnergyRef.current = energy;
        break;
      case 'frequencies':
      default:
        // Estimate frequency bands from centroid
        const lowBand = energy * (1 - Math.min(centroid / 5000, 1));
        const highBand = energy * Math.min(centroid / 5000, 1);
        low = lowBand * musicReact;
        high = highBand * musicReact;
        break;
    }
    
    // Beat detection: sudden increase in energy (only for non-beat modes)
    const beat = audioMode !== 'beat' && energy > lastEnergyRef.current * 1.5 && energy > 0.1;
    if (audioMode === 'frequencies') {
      lastEnergyRef.current = energy;
    }
    
    // Update time
    uniforms.uTime.value += dt * (0.5 + params.speed * 0.5);
    
    // Update colors
    const bgRGB = hexToRGB(userColors.bgColor);
    const assetRGB = hexToRGB(userColors.assetColor);
    uniforms.uBgColor.value.set(bgRGB.r, bgRGB.g, bgRGB.b);
    uniforms.uAssetColor.value.set(assetRGB.r, assetRGB.g, assetRGB.b);
    
    // Update parameters
    uniforms.uIntensity.value = params.intensity || 0.8;
    
    // Audio reactivity: low frequencies control turbulence
    const turbulence = 0.3 + low * 0.7;
    uniforms.uTurbulence.value = THREE.MathUtils.lerp(
      uniforms.uTurbulence.value,
      turbulence,
      0.1
    );
    
    // High frequencies control shimmer
    const shimmer = 0.3 + high * 0.7;
    uniforms.uShimmer.value = THREE.MathUtils.lerp(
      uniforms.uShimmer.value,
      shimmer,
      0.1
    );
    
    // Beat creates a gentle gust
    if (beat) {
      beatPhaseRef.current += 1.0;
    }
    uniforms.uBeatPhase.value = beatPhaseRef.current;
    
    // Camera position for Fresnel
    uniforms.uCameraPos.value.copy(state.camera.position);
  });
  
  return (
    <group>
      {layers.map((layer, i) => (
        <mesh
          key={i}
          ref={el => meshRefs.current[i] = el}
          position={[0, 0, layer.z]}
          scale={[layer.scale, layer.scale, 1]}
          material={material}
        >
          <planeGeometry args={[25000, 13000, 32, 32]} />
        </mesh>
      ))}
    </group>
  );
}
