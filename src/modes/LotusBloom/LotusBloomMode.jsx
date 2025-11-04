/**
 * Lotus Bloom Mode
 * Traditional mandala/rosette that blooms and closes
 * 
 * Audio mapping:
 * - rms → petal scale
 * - centroid → hue shift (cool→warm)
 * - onset (strong) → emit petal outlines as rings
 * - phrase (8/16) → symmetry count cycles (e.g., 6→8→12)
 */

import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useVisStore } from '../../state/useVisStore';
import useStore, { hexToRGB } from '../../core/store';
import { audioFeaturesService } from '../../services/AudioFeaturesService';

const vertexShader = `
varying vec2 vUv;
varying vec3 vPosition;

void main() {
  vUv = uv;
  vPosition = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
#define PI 3.14159265359

uniform float uTime;
uniform vec3 uBgColor;
uniform vec3 uAssetColor;
uniform float uIntensity;
uniform float uPetalScale;
uniform float uRotation;
uniform int uSymmetry;
uniform float uHueShift;
uniform float uSubdivision;

varying vec2 vUv;
varying vec3 vPosition;

// Distance field for petal shape
float petalSDF(vec2 p, float size) {
  float a = atan(p.y, p.x);
  float r = length(p);
  
  // Heart-shaped petal
  float shape = size * (sin(a) + 0.5 * sin(3.0 * a));
  return r - abs(shape);
}

// HSV to RGB conversion
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
  // Center coordinates
  vec2 uv = vUv - 0.5;
  uv *= 2000.0; // Scale to world space
  
  // Apply rotation
  float angle = uRotation;
  mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
  uv = rot * uv;
  
  // Polar coordinates
  float radius = length(uv);
  float theta = atan(uv.y, uv.x);
  
  // Radial symmetry
  float symmetryAngle = 2.0 * PI / float(uSymmetry);
  float petalAngle = mod(theta, symmetryAngle) - symmetryAngle * 0.5;
  
  // Create petal coordinates
  vec2 petalPos = vec2(cos(petalAngle), sin(petalAngle)) * radius;
  
  // Petal distance field with scale
  float petalDist = petalSDF(petalPos, 300.0 * uPetalScale);
  
  // Create petal pattern with subdivision rings
  float ringDist = mod(radius, 200.0 * uSubdivision);
  float ring = smoothstep(20.0, 0.0, abs(ringDist - 100.0 * uSubdivision));
  
  // Petal fill
  float petal = smoothstep(20.0, -20.0, petalDist);
  
  // Petal outline
  float outline = smoothstep(5.0, 0.0, abs(petalDist + 10.0));
  
  // Combine elements
  float pattern = max(petal * 0.3, outline) + ring * 0.5;
  
  // Add radial gradient from center
  float centerGlow = smoothstep(500.0, 0.0, radius) * 0.5;
  pattern += centerGlow;
  
  // Apply hue shift to asset color
  vec3 hsv = rgb2hsv(uAssetColor);
  hsv.x = mod(hsv.x + uHueShift, 1.0);
  vec3 shiftedColor = hsv2rgb(hsv);
  
  // Mix colors
  vec3 color = mix(uBgColor, shiftedColor, pattern);
  
  // Additive rim lighting
  float rim = outline * 2.0;
  color += rim * shiftedColor;
  
  float alpha = pattern * uIntensity;
  
  gl_FragColor = vec4(color, min(alpha, 1.0));
}
`;

export default function LotusBloomMode() {
  const params = useVisStore(s => s.params);
  const userColors = useStore(s => s.userColors);
  
  const audioFeaturesRef = useRef({
    rms: 0,
    centroid: 0,
    onset: false,
    phrase: 0,
  });
  
  const rotationRef = useRef(0);
  const symmetryRef = useRef(6);
  const lastPhraseRef = useRef(0);
  
  // Material uniforms
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uBgColor: { value: new THREE.Vector3() },
    uAssetColor: { value: new THREE.Vector3() },
    uIntensity: { value: 0.8 },
    uPetalScale: { value: 1.0 },
    uRotation: { value: 0 },
    uSymmetry: { value: 6 },
    uHueShift: { value: 0 },
    uSubdivision: { value: 1.0 },
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
      blending: THREE.AdditiveBlending,
    });
  }, [uniforms]);
  
  useFrame((state, dt) => {
    const { rms, centroid, phrase } = audioFeaturesRef.current;
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
    
    // RMS controls petal scale (bloom/close)
    const targetScale = 0.5 + rms * musicReact * 1.5;
    uniforms.uPetalScale.value = THREE.MathUtils.lerp(
      uniforms.uPetalScale.value,
      targetScale,
      0.1
    );
    
    // Centroid controls hue shift (cool to warm)
    // Normalize centroid (typically 0-22050) to 0-1
    const normalizedCentroid = Math.min(centroid / 22050, 1.0);
    const hueShift = normalizedCentroid * musicReact * 0.3;
    uniforms.uHueShift.value = THREE.MathUtils.lerp(
      uniforms.uHueShift.value,
      hueShift,
      0.1
    );
    
    // Phrase changes symmetry count
    if (phrase !== lastPhraseRef.current) {
      const symmetries = [6, 8, 12, 10, 5, 7];
      symmetryRef.current = symmetries[phrase % symmetries.length];
      lastPhraseRef.current = phrase;
    }
    
    uniforms.uSymmetry.value = symmetryRef.current;
    
    // Slow rotation
    rotationRef.current += dt * 0.1 * params.speed;
    uniforms.uRotation.value = rotationRef.current;
  });
  
  return (
    <mesh position={[0, 0, 1]} material={material}>
      <planeGeometry args={[20000, 10000]} />
    </mesh>
  );
}
