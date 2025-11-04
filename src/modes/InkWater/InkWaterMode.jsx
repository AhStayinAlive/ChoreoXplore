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
import { audioFeaturesService } from '../../services/AudioFeaturesService';

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
uniform sampler2D uPrevFrame;
uniform vec2 uResolution;

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
  
  // Sample previous frame for diffusion
  vec3 prev = texture2D(uPrevFrame, uv).rgb;
  
  // Diffusion blur (simple 9-tap)
  vec3 blurred = vec3(0.0);
  float kernel = uDiffusion * 0.001;
  
  for (float y = -1.0; y <= 1.0; y++) {
    for (float x = -1.0; x <= 1.0; x++) {
      vec2 offset = vec2(x, y) * kernel;
      blurred += texture2D(uPrevFrame, uv + offset).rgb;
    }
  }
  blurred /= 9.0;
  
  // Apply curl noise flow
  vec2 flow = curlNoise(uv * 10.0, uTime * 0.1);
  vec2 flowUV = uv + flow * uDiffusion * 0.01;
  vec3 flowed = texture2D(uPrevFrame, flowUV).rgb;
  
  // Mix diffusion and flow
  vec3 ink = mix(blurred, flowed, 0.5);
  
  // Add new ink based on energy
  float energy = length(ink);
  
  // Create ink bloom center
  vec2 center = vec2(0.5) + vec2(
    sin(uTime * 0.3) * 0.2,
    cos(uTime * 0.2) * 0.2
  );
  float bloom = smoothstep(0.3, 0.0, length(uv - center));
  ink += uAssetColor * bloom * 0.01;
  
  // Edge granulation with blue noise
  float grain = blueNoise(uv * 500.0 + uTime);
  float granulation = grain * uGrain;
  
  // Apply granulation at edges
  float edgeDetect = length(ink) * (1.0 - length(ink));
  ink += granulation * edgeDetect * 0.1;
  
  // Paper texture
  float paper = blueNoise(uv * 200.0) * 0.1 + 0.9;
  
  // Mix with background (paper)
  vec3 color = mix(uBgColor * paper, ink, min(length(ink), 1.0));
  
  // Decay over time
  color *= 0.99;
  
  float alpha = length(ink) * uIntensity;
  
  gl_FragColor = vec4(color, min(alpha, 1.0));
}
`;

export default function InkWaterMode() {
  const params = useVisStore(s => s.params);
  const userColors = useStore(s => s.userColors);
  
  const audioFeaturesRef = useRef({
    low: 0,
    high: 0,
    onset: false,
  });
  
  // Ping-pong render targets for reaction-diffusion
  const rtRef = useRef(null);
  const rt2Ref = useRef(null);
  
  // Material uniforms
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uBgColor: { value: new THREE.Vector3() },
    uAssetColor: { value: new THREE.Vector3() },
    uIntensity: { value: 0.8 },
    uDiffusion: { value: 1.0 },
    uGrain: { value: 0.5 },
    uPrevFrame: { value: null },
    uResolution: { value: new THREE.Vector2(512, 512) },
  }), []);
  
  // Subscribe to audio features
  React.useEffect(() => {
    const unsubscribe = audioFeaturesService.subscribe((features) => {
      audioFeaturesRef.current = features;
    });
    
    return unsubscribe;
  }, []);
  
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
  
  // Initialize render targets
  React.useEffect(() => {
    const rt1 = new THREE.WebGLRenderTarget(512, 512, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
    });
    
    const rt2 = new THREE.WebGLRenderTarget(512, 512, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
    });
    
    rtRef.current = rt1;
    rt2Ref.current = rt2;
    
    uniforms.uPrevFrame.value = rt1.texture;
    
    return () => {
      rt1.dispose();
      rt2.dispose();
    };
  }, [uniforms]);
  
  useFrame((state, dt) => {
    const { low, high } = audioFeaturesRef.current;
    const musicReact = params.musicReact || 0;
    
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
    const diffusion = 1.0 + low * musicReact * 3.0;
    uniforms.uDiffusion.value = THREE.MathUtils.lerp(
      uniforms.uDiffusion.value,
      diffusion,
      0.1
    );
    
    // High frequencies control granulation
    const grain = 0.3 + high * musicReact * 0.7;
    uniforms.uGrain.value = THREE.MathUtils.lerp(
      uniforms.uGrain.value,
      grain,
      0.1
    );
    
    // Ping-pong render targets
    // Note: In a real implementation, you'd render to the target here
    // For now, we'll use a simpler approximation
  });
  
  return (
    <mesh position={[0, 0, 1]} material={material}>
      <planeGeometry args={[20000, 10000]} />
    </mesh>
  );
}
