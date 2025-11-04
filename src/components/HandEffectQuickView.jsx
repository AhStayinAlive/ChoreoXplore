import React, { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useVisStore } from '../state/useVisStore';
import useStore, { hexToRGB } from '../core/store';
import * as THREE from 'three';
import {
  handRippleVertexShader,
  handRippleFragmentShader,
  handRippleUniforms
} from '../shaders/handRippleShader';

// Import actual mode components
import SilkVeilMode from '../modes/SilkVeil/SilkVeilMode';
import LotusBloomMode from '../modes/LotusBloom/LotusBloomMode';
import StainedGlassRoseMode from '../modes/StainedGlassRose/StainedGlassRoseMode';
import InkWaterMode from '../modes/InkWater/InkWaterMode';
import OpalineWaveMode from '../modes/OpalineWave/OpalineWave';

// Constants for positioning and animation
const PREVIEW_WIDTH = 400;
const PREVIEW_HEIGHT = 300;
const DEFAULT_BOTTOM = 12;
const DEFAULT_RIGHT = 342;

// Animation constants
const PARTICLE_TRAIL_LENGTH = 50;
const PARTICLE_SIZE_MULTIPLIER = 0.15;
const SMOKE_SPHERE_SIZE = 0.2;
const FIGURE8_X_AMPLITUDE = 0.3;
const FIGURE8_Y_AMPLITUDE = 0.25;
const FIGURE8_Y_FREQUENCY = 2;
const COORDINATE_SCALE_X = 4;
const COORDINATE_SCALE_Y = 3;
const PULSE_AMPLITUDE = 0.3;
const PULSE_FREQUENCY = 3;
const FLUID_MARKER_BASE_SIZE = 0.2;
const FLUID_OPACITY_MULTIPLIER = 0.5;
const FLUID_OPACITY_MAX = 0.9;

/**
 * Background visual mode for preview - renders the currently selected visual mode
 */
function PreviewBackgroundVisual() {
  const params = useVisStore(s => s.params);
  const mode = params.mode;
  
  // Render the appropriate visual mode based on current selection
  switch (mode) {
    case 'quand_cest':
      return <PreviewQuandCestMode />;
    case 'pulsating_circle':
      return <PreviewPulsatingCircleMode />;
    case 'vertical_lines':
      return <PreviewVerticalLinesMode />;
    case 'lines':
      return <PreviewLines1DMode />;
    case 'water_ripple':
      return <PreviewWaterRippleMode />;
    case 'heat_wave':
      return <PreviewHeatWaveMode />;
    case 'flowing':
      return <PreviewFlowingMode />;
    case 'gentle_wave':
      return <PreviewGentleWaveMode />;
    case 'silk_veil':
      return <PreviewSilkVeilMode />;
    case 'lotus_bloom':
      return <PreviewLotusBloomMode />;
    case 'stained_glass_rose':
      return <PreviewStainedGlassRoseMode />;
    case 'ink_water':
      return <PreviewInkWaterMode />;
    case 'opaline_wave':
      return <PreviewOpalineWaveMode />;
    case 'empty':
      return null; // Empty mode renders nothing
    default:
      return <PreviewQuandCestMode />; // Default to quand_cest
  }
}

/**
 * Quand C'est visual mode for preview
 */
function PreviewQuandCestMode() {
  const params = useVisStore(s => s.params);
  const music = useVisStore(s => s.music);
  const motion = useVisStore(s => s.motion);
  const userColors = useStore(s => s.userColors);
  
  // Use the actual Quand C'est shader
  const fragmentShader = `
uniform float uTime;
uniform vec3 uColor;
uniform float uEnergy;
uniform float uMotion;
uniform float uIntensity;
varying vec2 vUv;

void main() {
  vec2 uv = vUv;
  float t = uTime;
  
  float pattern = 0.0;
  
  // Create outer rectangle lines that are always visible (very thin)
  if(uv.y > 0.98) pattern = 1.0;
  if(uv.x > 0.98) pattern = 1.0;
  if(uv.x < 0.02) pattern = 1.0;
  
  // Create organic diagonal lines extending from edges toward center when music plays
  float energyBoost = uEnergy * 20.0;
  float baseLength = 0.1;
  float musicLength = energyBoost * 0.35;
  float totalLength = baseLength + musicLength;
  
  if(totalLength > 0.05) {
    // Lines from top edge going diagonally down
    for(int i = 0; i < 4; i++) {
      float x = 0.15 + float(i) * 0.23;
      float angle = -0.3 + float(i) * 0.2;
      float distFromTop = uv.y - 0.98;
      float waveOffset = sin(distFromTop * 8.0 + t * 2.0 + float(i)) * 0.02 * energyBoost;
      float expectedX = x + distFromTop * tan(angle) + waveOffset;
      float distToLine = abs(uv.x - expectedX);
      float lineLength = totalLength;
      float taperFactor = 1.0 - (abs(distFromTop) / lineLength);
      float lineWidth = 0.006 * taperFactor;
      if(distToLine < lineWidth && distFromTop > -lineLength && distFromTop < 0.004) {
        pattern = 1.0;
      }
    }
    
    // Lines from left edge going diagonally right
    for(int i = 0; i < 4; i++) {
      float y = 0.15 + float(i) * 0.23;
      float angle = 0.2 + float(i) * 0.15;
      float distFromLeft = uv.x - 0.02;
      float waveOffset = sin(distFromLeft * 8.0 + t * 2.0 + float(i)) * 0.02 * energyBoost;
      float expectedY = y + distFromLeft * tan(angle) + waveOffset;
      float distToLine = abs(uv.y - expectedY);
      float lineLength = totalLength;
      float taperFactor = 1.0 - (abs(distFromLeft) / lineLength);
      float lineWidth = 0.006 * taperFactor;
      if(distToLine < lineWidth && distFromLeft < lineLength && distFromLeft > -0.004) {
        pattern = 1.0;
      }
    }
    
    // Lines from right edge going diagonally left
    for(int i = 0; i < 4; i++) {
      float y = 0.15 + float(i) * 0.23;
      float angle = -0.2 - float(i) * 0.15;
      float distFromRight = uv.x - 0.98;
      float waveOffset = sin(distFromRight * 8.0 + t * 2.0 + float(i)) * 0.02 * energyBoost;
      float expectedY = y + distFromRight * tan(angle) + waveOffset;
      float distToLine = abs(uv.y - expectedY);
      float lineLength = totalLength;
      float taperFactor = 1.0 - (abs(distFromRight) / lineLength);
      float lineWidth = 0.006 * taperFactor;
      if(distToLine < lineWidth && distFromRight > -lineLength && distFromRight < 0.004) {
        pattern = 1.0;
      }
    }
  }
  
  vec3 col = uColor * pattern * uIntensity;
  gl_FragColor = vec4(col, pattern * uIntensity);
}
`;
  
  const vertexShader = `
varying vec2 vUv;
void main(){ 
  vUv = uv; 
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); 
}
`;
  
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      fragmentShader,
      vertexShader,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Vector3(0.5, 0.5, 0.5) },
        uEnergy: { value: 0 },
        uMotion: { value: 0 },
        uIntensity: { value: 0.8 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps intentional - shaders are defined inline and never change
  
  const geom = useMemo(() => new THREE.PlaneGeometry(8, 6, 1, 1), []);

  useFrame((_, dt) => {
    material.uniforms.uTime.value += dt * (0.6 + params.speed);
    const rgb = hexToRGB(userColors?.assetColor || '#0096ff');
    material.uniforms.uColor.value.set(rgb.r, rgb.g, rgb.b);
    material.uniforms.uIntensity.value = params.intensity;
    
    const energy = (music?.energy ?? 0) * params.musicReact;
    const sharp = (motion?.sharpness ?? 0) * params.motionReact;
    
    material.uniforms.uEnergy.value = THREE.MathUtils.lerp(
      material.uniforms.uEnergy.value, energy, 0.2
    );
    material.uniforms.uMotion.value = THREE.MathUtils.lerp(
      material.uniforms.uMotion.value, sharp, 0.15
    );
  });

  return <mesh geometry={geom} material={material} position={[0, 0, -1]} />;
}

/**
 * Simplified preview versions of other visual modes
 */
/**
 * Pulsating Circle visual mode for preview
 */
function PreviewPulsatingCircleMode() {
  const params = useVisStore(s => s.params);
  const music = useVisStore(s => s.music);
  const userColors = useStore(s => s.userColors);
  
  const fragmentShader = `
uniform float uTime;
uniform vec3 uColor;
uniform float uEnergy;
uniform float uMotion;
uniform float uIntensity;
uniform float uBeat;
uniform float uRms;
varying vec2 vUv;

void main() {
  vec2 uv = vUv;
  float t = uTime;
  
  // Create a circle centered in the middle
  vec2 center = vec2(0.5, 0.5);
  float dist = distance(uv, center);
  
  // Base radius with audio-reactive pulsing
  float baseRadius = 0.15;
  float energyPulse = uEnergy * 0.3;
  float beatPulse = uBeat * 0.2;
  float rmsPulse = uRms * 0.25;
  
  // Audio-reactive pulsation
  float audioThreshold = 0.01;
  float isMusicPlaying = step(audioThreshold, uEnergy + uRms + uBeat);
  
  float audioLoudness = uEnergy + uRms + uBeat;
  float pulsationSize = audioLoudness * 0.4;
  
  float radius = baseRadius + pulsationSize;
  
  // Create smooth circle edge
  float circle = 1.0 - smoothstep(radius - 0.05, radius, dist);
  
  // Inner glow
  float innerGlow = 1.0 - smoothstep(radius * 0.3, radius * 0.7, dist);
  innerGlow *= 0.3;
  
  // Outer glow
  float outerGlow = 1.0 - smoothstep(radius, radius + 0.1 + pulsationSize * 0.8, dist);
  outerGlow *= 0.2 * uIntensity;
  
  float pattern = circle + innerGlow + outerGlow;
  
  // Wave distortion
  float waveDistortion = sin(dist * 20.0 + t * 3.0) * 0.01 * uEnergy * isMusicPlaying;
  pattern += waveDistortion;
  
  vec3 accent = uColor;
  
  // Color variation
  vec3 colorVariation = vec3(
    sin(t + uEnergy * 2.0) * 0.2 * isMusicPlaying,
    cos(t + uBeat * 1.5) * 0.2 * isMusicPlaying,
    sin(t * 1.5 + uRms * 2.5) * 0.2 * isMusicPlaying
  );
  
  vec3 finalColor = accent + colorVariation;
  vec3 col = finalColor * pattern * uIntensity;
  
  float brightness = 1.0 + uEnergy * 0.5 + uBeat * 0.3 + uRms * 0.4;
  col *= brightness;
  
  float visibility = mix(0.3, 1.0, isMusicPlaying);
  col *= visibility;
  
  gl_FragColor = vec4(col, pattern * uIntensity);
}
`;
  
  const vertexShader = `
varying vec2 vUv;
void main(){ 
  vUv = uv; 
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); 
}
`;
  
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      fragmentShader,
      vertexShader,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Vector3(0.5, 0.5, 0.5) },
        uEnergy: { value: 0 },
        uMotion: { value: 0 },
        uIntensity: { value: 0.8 },
        uBeat: { value: 0 },
        uRms: { value: 0 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
  }, []);
  
  const geom = useMemo(() => new THREE.PlaneGeometry(8, 6, 1, 1), []);

  useFrame((_, dt) => {
    material.uniforms.uTime.value += dt * (0.6 + params.speed);
    const rgb = hexToRGB(userColors?.assetColor || '#0096ff');
    material.uniforms.uColor.value.set(rgb.r, rgb.g, rgb.b);
    material.uniforms.uIntensity.value = params.intensity;
    
    const energy = (music?.energy ?? 0) * params.musicReact;
    const rms = (music?.rms ?? 0) * params.musicReact;
    const beat = (music?.onset ?? false) ? 1.0 : 0.0;

    material.uniforms.uEnergy.value = THREE.MathUtils.lerp(
      material.uniforms.uEnergy.value, energy, 0.3
    );
    material.uniforms.uRms.value = THREE.MathUtils.lerp(
      material.uniforms.uRms.value, rms, 0.4
    );
    material.uniforms.uBeat.value = THREE.MathUtils.lerp(
      material.uniforms.uBeat.value, beat, 0.6
    );
  });

  return <mesh geometry={geom} material={material} position={[0, 0, -1]} />;
}

/**
 * Vertical Lines visual mode for preview
 */
function PreviewVerticalLinesMode() {
  const params = useVisStore(s => s.params);
  const music = useVisStore(s => s.music);
  const userColors = useStore(s => s.userColors);
  
  const fragmentShader = `
uniform float uTime;
uniform vec3 uColor;
uniform float uEnergy;
uniform float uRms;
uniform float uBeat;
uniform float uIntensity;
varying vec2 vUv;

// Hash function for pseudo-random values
float hash(float n) {
  return fract(sin(n) * 43758.5453123);
}

void main() {
  vec2 uv = vUv;
  float t = uTime;
  
  // Number of drops and parameters - MUCH shorter lines like screenshot
  float numDrops = 200.0;
  float segmentHeight = 0.08; // Much shorter - was 0.5
  float fallSpeed = 0.15;
  
  vec3 col = vec3(0.0);
  float alpha = 0.0;
  
  // Create vertical rain drops
  for (float i = 0.0; i < 200.0; i++) {
    if (i >= numDrops) break;
    
    // Use hash for consistent random positioning
    float xPos = hash(i * 12.9898);
    float yOffset = hash(i * 78.233);
    
    // Falling position with constant speed
    float yPos = mod(yOffset - t * fallSpeed, 1.0);
    
    // Distance from drop center
    float dx = abs(uv.x - xPos);
    float dy = abs(uv.y - yPos);
    
    // Vertical line shape - thinner lines
    float lineWidth = 0.001; // Thinner - was 0.002
    if (dx < lineWidth && dy < segmentHeight * 0.5) {
      // Fade at top and bottom
      float fade = smoothstep(0.0, 0.02, dy) * smoothstep(segmentHeight * 0.5, segmentHeight * 0.3, dy);
      col += uColor * fade;
      alpha += fade;
    }
  }
  
  // Apply intensity
  col *= uIntensity;
  alpha = clamp(alpha * uIntensity * 0.3, 0.0, 1.0); // Reduced alpha multiplier
  
  gl_FragColor = vec4(col, alpha);
}
`;
  
  const vertexShader = `
varying vec2 vUv;
void main(){ 
  vUv = uv; 
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); 
}
`;
  
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      fragmentShader,
      vertexShader,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Vector3(0.5, 0.5, 0.5) },
        uEnergy: { value: 0 },
        uRms: { value: 0 },
        uBeat: { value: 0 },
        uIntensity: { value: 0.8 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
  }, []);
  
  const geom = useMemo(() => new THREE.PlaneGeometry(8, 6, 1, 1), []);

  useFrame((_, dt) => {
    material.uniforms.uTime.value += dt * (0.6 + params.speed);
    const rgb = hexToRGB(userColors?.assetColor || '#0096ff');
    material.uniforms.uColor.value.set(rgb.r, rgb.g, rgb.b);
    material.uniforms.uIntensity.value = params.intensity;
    
    const energy = (music?.energy ?? 0) * params.musicReact;
    const rms = (music?.rms ?? 0) * params.musicReact;
    const beat = (music?.onset ?? false) ? 1.0 : 0.0;

    material.uniforms.uEnergy.value = THREE.MathUtils.lerp(
      material.uniforms.uEnergy.value, energy, 0.25
    );
    material.uniforms.uRms.value = THREE.MathUtils.lerp(
      material.uniforms.uRms.value, rms, 0.3
    );
    material.uniforms.uBeat.value = THREE.MathUtils.lerp(
      material.uniforms.uBeat.value, beat, 0.5
    );
  });

  return <mesh geometry={geom} material={material} position={[0, 0, -1]} />;
}

/**
 * Lines 1D (Irina) visual mode for preview
 */
function PreviewLines1DMode() {
  const params = useVisStore(s => s.params);
  const music = useVisStore(s => s.music);
  const motion = useVisStore(s => s.motion);
  const userColors = useStore(s => s.userColors);
  
  const fragmentShader = `
uniform float uTime;
uniform vec3 uColor;
uniform float uEnergy;
uniform float uMotion;
uniform float uIntensity;
varying vec2 vUv;

float angleField(vec2 p, float a){
  float s = sin(a), c = cos(a);
  mat2 R = mat2(c,-s,s,c);
  p = R * p;
  vec2 q = abs(fract(p*4.0)-0.5);
  float d1 = abs(q.x - q.y);
  float d2 = min(abs(q.x), abs(q.y));
  return mix(d1, d2, 0.2);
}

void main() {
  vec2 uv = vUv*2.0-1.0;
  uv *= 0.1;
  float t = uTime;
  
  float musicBoost = uEnergy * 3.0;
  float musicPulse = sin(t * 4.0 + uEnergy * 10.0) * musicBoost;
  
  float ang = 1.5708 * (0.25 + 0.75*fract(t*0.07 + uMotion*0.4 + musicPulse*0.5));
  float f = angleField(uv*1.2, ang);
  f = min(f, angleField(uv*1.2 + vec2(0.17,0.11)*sin(t*0.3+uMotion + musicPulse), ang+1.047));
  f = min(f, angleField(uv*1.2 + vec2(-0.2,0.07)*cos(t*0.23 + musicPulse*0.8), ang+2.094));
  
  float thickness = mix(0.05, 0.35, clamp(uEnergy*2.0 + musicBoost*0.5 + 0.2, 0.0, 1.0));
  float line = 1.0 - smoothstep(thickness*0.8, thickness, f);
  
  vec3 base = vec3(0.0);
  vec3 accent = uColor;
  
  float musicIntensity = uIntensity * (1.0 + musicBoost * 2.0);
  vec3 col = mix(base, accent, line * musicIntensity);
  
  float musicAlpha = line * uIntensity * (0.4 + musicBoost * 0.8);
  
  gl_FragColor = vec4(col, musicAlpha);
}
`;
  
  const vertexShader = `
varying vec2 vUv;
void main(){ 
  vUv = uv; 
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); 
}
`;
  
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      fragmentShader,
      vertexShader,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Vector3(0.5, 0.5, 0.5) },
        uEnergy: { value: 0 },
        uMotion: { value: 0 },
        uIntensity: { value: 0.8 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
  }, []);
  
  const geom = useMemo(() => new THREE.PlaneGeometry(8, 6, 1, 1), []);

  useFrame((_, dt) => {
    material.uniforms.uTime.value += dt * (0.6 + params.speed);
    const rgb = hexToRGB(userColors?.assetColor || '#0096ff');
    material.uniforms.uColor.value.set(rgb.r, rgb.g, rgb.b);
    material.uniforms.uIntensity.value = params.intensity;
    
    const energy = (music?.energy ?? 0) * params.musicReact;
    const sharp = (motion?.sharpness ?? 0) * params.motionReact;

    material.uniforms.uEnergy.value = THREE.MathUtils.lerp(
      material.uniforms.uEnergy.value, energy, 0.2
    );
    material.uniforms.uMotion.value = THREE.MathUtils.lerp(
      material.uniforms.uMotion.value, sharp, 0.15
    );
  });

  return <mesh geometry={geom} material={material} position={[0, 0, -1]} />;
}

/**
 * Water Ripple visual mode for preview
 */
function PreviewWaterRippleMode() {
  const params = useVisStore(s =>  s.params);
  const music = useVisStore(s => s.music);
  const userColors = useStore(s => s.userColors);
  
  const bgColor = useMemo(() => hexToRGB(userColors.bgColor), [userColors.bgColor]);
  const assetColor = useMemo(() => hexToRGB(userColors.assetColor), [userColors.assetColor]);
  
  const fragmentShader = `
uniform float u_time;
uniform vec3 u_bgColor;
uniform vec3 u_assetColor;
uniform float u_intensity;
uniform float u_speed;
uniform float u_energy;
varying vec2 vUv;

void main() {
  vec2 uv = vUv;
  vec2 center = vec2(0.5, 0.5);
  float dist = distance(uv, center);
  
  // Amplify energy for stronger reactivity
  float energyBoost = u_energy * 15.0;
  
  // Audio modulation
  float audioMod = 1.0 + energyBoost * 0.5;
  float amplitude = 0.02 * (1.0 + energyBoost * 2.0);
  
  // Create water ripple effect
  float ripple1 = sin(dist * 20.0 * audioMod - u_time * u_speed * 2.0) * amplitude;
  float ripple2 = sin(dist * 35.0 * audioMod - u_time * u_speed * 1.5) * amplitude * 0.75;
  float ripple3 = sin(dist * 50.0 * audioMod - u_time * u_speed * 1.2) * amplitude * 0.5;
  
  float pulse = sin(dist * 10.0 - u_time * u_speed * 3.0 + energyBoost) * amplitude * energyBoost * 0.5;
  
  float totalRipple = (ripple1 + ripple2 + ripple3 + pulse) * u_intensity;
  
  float colorMix = abs(totalRipple) * 15.0 * (1.0 + energyBoost * 0.5);
  vec3 color = mix(u_bgColor, u_assetColor, colorMix);
  
  gl_FragColor = vec4(color, 1.0);
}
`;
  
  const vertexShader = `
varying vec2 vUv;
void main(){ 
  vUv = uv; 
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); 
}
`;
  
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      fragmentShader,
      vertexShader,
      uniforms: {
        u_time: { value: 0 },
        u_bgColor: { value: new THREE.Vector3(bgColor.r, bgColor.g, bgColor.b) },
        u_assetColor: { value: new THREE.Vector3(assetColor.r, assetColor.g, assetColor.b) },
        u_intensity: { value: params.intensity || 0.8 },
        u_speed: { value: params.speed || 1.0 },
        u_energy: { value: 0.0 }
      },
      transparent: false,
      side: THREE.DoubleSide
    });
  }, [bgColor, assetColor]);
  
  const geom = useMemo(() => new THREE.PlaneGeometry(8, 6, 1, 1), []);

  useFrame((_, dt) => {
    material.uniforms.u_time.value += dt * (0.6 + params.speed);
    material.uniforms.u_intensity.value = params.intensity || 0.8;
    material.uniforms.u_speed.value = params.speed || 1.0;
    
    const energy = (music?.energy ?? 0) * params.musicReact;
    material.uniforms.u_energy.value = energy;
    
    const rgb = hexToRGB(userColors.assetColor);
    material.uniforms.u_assetColor.value.set(rgb.r, rgb.g, rgb.b);
    const bgRgb = hexToRGB(userColors.bgColor);
    material.uniforms.u_bgColor.value.set(bgRgb.r, bgRgb.g, bgRgb.b);
  });

  return <mesh geometry={geom} material={material} position={[0, 0, -1]} />;
}

/**
 * Heat Wave visual mode for preview
 */
function PreviewHeatWaveMode() {
  const params = useVisStore(s => s.params);
  const music = useVisStore(s => s.music);
  const userColors = useStore(s => s.userColors);
  
  const bgColor = useMemo(() => hexToRGB(userColors.bgColor), [userColors.bgColor]);
  const assetColor = useMemo(() => hexToRGB(userColors.assetColor), [userColors.assetColor]);
  
  const fragmentShader = `
uniform float u_time;
uniform vec3 u_bgColor;
uniform vec3 u_assetColor;
uniform float u_intensity;
uniform float u_speed;
uniform float u_energy;
varying vec2 vUv;

void main() {
  vec2 uv = vUv;
  
  // Amplify energy for stronger reactivity
  float energyBoost = u_energy * 18.0;
  
  // Audio modulation
  float waveStrength = 0.02 * (1.0 + energyBoost * 3.0);
  float speedMod = 1.0 + energyBoost * 0.5;
  
  // Create heat wave effect
  float heat1 = sin(uv.x * 15.0 + u_time * u_speed * 3.0 * speedMod) * waveStrength;
  float heat2 = sin(uv.x * 25.0 + u_time * u_speed * 2.0 * speedMod) * waveStrength * 0.75;
  float heat3 = sin(uv.y * 10.0 + u_time * u_speed * 1.5 * speedMod) * waveStrength * 0.5;
  
  float shimmer = sin(uv.x * 40.0 + u_time * u_speed * 5.0) * energyBoost * 0.01;
  float verticalPulse = sin(uv.y * 8.0 - u_time * u_speed * 2.0 + energyBoost) * waveStrength * energyBoost * 0.3;
  
  float totalHeat = (heat1 + heat2 + heat3 + shimmer + verticalPulse) * u_intensity;
  
  float colorMix = abs(totalHeat) * 12.0 * (1.0 + energyBoost * 0.3);
  vec3 color = mix(u_bgColor, u_assetColor, colorMix);
  
  gl_FragColor = vec4(color, 1.0);
}
`;
  
  const vertexShader = `
varying vec2 vUv;
void main(){ 
  vUv = uv; 
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); 
}
`;
  
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      fragmentShader,
      vertexShader,
      uniforms: {
        u_time: { value: 0 },
        u_bgColor: { value: new THREE.Vector3(bgColor.r, bgColor.g, bgColor.b) },
        u_assetColor: { value: new THREE.Vector3(assetColor.r, assetColor.g, assetColor.b) },
        u_intensity: { value: params.intensity || 0.8 },
        u_speed: { value: params.speed || 1.0 },
        u_energy: { value: 0.0 }
      },
      transparent: false,
      side: THREE.DoubleSide
    });
  }, [bgColor, assetColor]);
  
  const geom = useMemo(() => new THREE.PlaneGeometry(8, 6, 1, 1), []);

  useFrame((_, dt) => {
    material.uniforms.u_time.value += dt * (0.6 + params.speed);
    material.uniforms.u_intensity.value = params.intensity || 0.8;
    material.uniforms.u_speed.value = params.speed || 1.0;
    
    const energy = (music?.energy ?? 0) * params.musicReact;
    material.uniforms.u_energy.value = energy;
    
    const rgb = hexToRGB(userColors.assetColor);
    material.uniforms.u_assetColor.value.set(rgb.r, rgb.g, rgb.b);
    const bgRgb = hexToRGB(userColors.bgColor);
    material.uniforms.u_bgColor.value.set(bgRgb.r, bgRgb.g, bgRgb.b);
  });

  return <mesh geometry={geom} material={material} position={[0, 0, -1]} />;
}

/**
 * Flowing visual mode for preview
 */
function PreviewFlowingMode() {
  const params = useVisStore(s => s.params);
  const music = useVisStore(s => s.music);
  const userColors = useStore(s => s.userColors);
  
  const bgColor = useMemo(() => hexToRGB(userColors.bgColor), [userColors.bgColor]);
  const assetColor = useMemo(() => hexToRGB(userColors.assetColor), [userColors.assetColor]);
  
  const fragmentShader = `
uniform float u_time;
uniform vec3 u_bgColor;
uniform vec3 u_assetColor;
uniform float u_intensity;
uniform float u_speed;
uniform float u_energy;
varying vec2 vUv;

void main() {
  vec2 uv = vUv;
  vec2 center = vec2(0.5, 0.5);
  
  // Amplify energy for stronger reactivity
  float energyBoost = u_energy * 16.0;
  
  // Audio modulation
  float flowIntensity = 1.0 + energyBoost * 2.0;
  float amplitude = 0.02 * flowIntensity;
  
  // Create flowing distortion patterns
  float flow1 = sin(uv.x * 12.0 + uv.y * 8.0 + u_time * u_speed * 2.5) * amplitude;
  float flow2 = sin(uv.x * 18.0 - uv.y * 12.0 + u_time * u_speed * 1.8) * amplitude * 0.75;
  
  // Circular flow
  float angle = atan(uv.y - center.y, uv.x - center.x);
  float radius = distance(uv, center);
  float circularFlow = sin(angle * 8.0 + radius * 20.0 + u_time * u_speed * 2.0) * amplitude * 0.5;
  
  float swirl = sin(angle * 4.0 + u_time * u_speed * 3.0 + energyBoost) * amplitude * energyBoost * 0.4;
  float organic = sin(uv.x * 20.0 + sin(uv.y * 15.0 + u_time * u_speed)) * amplitude * 0.3;
  
  float totalFlow = (flow1 + flow2 + circularFlow + swirl + organic) * u_intensity;
  
  float colorMix = abs(totalFlow) * 14.0 * (1.0 + energyBoost * 0.4);
  vec3 color = mix(u_bgColor, u_assetColor, colorMix);
  
  gl_FragColor = vec4(color, 1.0);
}
`;
  
  const vertexShader = `
varying vec2 vUv;
void main(){ 
  vUv = uv; 
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); 
}
`;
  
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      fragmentShader,
      vertexShader,
      uniforms: {
        u_time: { value: 0 },
        u_bgColor: { value: new THREE.Vector3(bgColor.r, bgColor.g, bgColor.b) },
        u_assetColor: { value: new THREE.Vector3(assetColor.r, assetColor.g, assetColor.b) },
        u_intensity: { value: params.intensity || 0.8 },
        u_speed: { value: params.speed || 1.0 },
        u_energy: { value: 0.0 }
      },
      transparent: false,
      side: THREE.DoubleSide
    });
  }, [bgColor, assetColor]);
  
  const geom = useMemo(() => new THREE.PlaneGeometry(8, 6, 1, 1), []);

  useFrame((_, dt) => {
    material.uniforms.u_time.value += dt * (0.6 + params.speed);
    material.uniforms.u_intensity.value = params.intensity || 0.8;
    material.uniforms.u_speed.value = params.speed || 1.0;
    
    const energy = (music?.energy ?? 0) * params.musicReact;
    material.uniforms.u_energy.value = energy;
    
    const rgb = hexToRGB(userColors.assetColor);
    material.uniforms.u_assetColor.value.set(rgb.r, rgb.g, rgb.b);
    const bgRgb = hexToRGB(userColors.bgColor);
    material.uniforms.u_bgColor.value.set(bgRgb.r, bgRgb.g, bgRgb.b);
  });

  return <mesh geometry={geom} material={material} position={[0, 0, -1]} />;
}

/**
 * Gentle Wave visual mode for preview
 */
function PreviewGentleWaveMode() {
  const params = useVisStore(s => s.params);
  const music = useVisStore(s => s.music);
  const userColors = useStore(s => s.userColors);
  
  const bgColor = useMemo(() => hexToRGB(userColors.bgColor), [userColors.bgColor]);
  const assetColor = useMemo(() => hexToRGB(userColors.assetColor), [userColors.assetColor]);
  
  const fragmentShader = `
uniform float u_time;
uniform vec3 u_bgColor;
uniform vec3 u_assetColor;
uniform float u_intensity;
uniform float u_speed;
uniform float u_energy;
varying vec2 vUv;

void main() {
  vec2 uv = vUv;
  
  // Amplify energy but keep it gentler
  float energyBoost = u_energy * 12.0;
  
  // Audio modulation - subtle
  float waveAmp = 0.015 * (1.0 + energyBoost * 1.5);
  
  // Create gentle wave effect
  float wave1 = sin(uv.x * 8.0 + u_time * u_speed * 1.5) * waveAmp;
  float wave2 = sin(uv.y * 6.0 + u_time * u_speed * 1.2) * waveAmp * 0.8;
  float wave3 = sin((uv.x + uv.y) * 10.0 + u_time * u_speed * 1.8) * waveAmp * 0.5;
  
  float pulse = sin(uv.x * 4.0 + uv.y * 4.0 - u_time * u_speed * 2.0 + energyBoost * 0.5) * waveAmp * energyBoost * 0.3;
  float diagonal = sin((uv.x - uv.y) * 12.0 + u_time * u_speed * 2.2) * waveAmp * 0.4;
  
  float totalWave = (wave1 + wave2 + wave3 + pulse + diagonal) * u_intensity;
  
  float colorMix = abs(totalWave) * 20.0 * (1.0 + energyBoost * 0.3);
  vec3 color = mix(u_bgColor, u_assetColor, colorMix);
  
  gl_FragColor = vec4(color, 1.0);
}
`;
  
  const vertexShader = `
varying vec2 vUv;
void main(){ 
  vUv = uv; 
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); 
}
`;
  
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      fragmentShader,
      vertexShader,
      uniforms: {
        u_time: { value: 0 },
        u_bgColor: { value: new THREE.Vector3(bgColor.r, bgColor.g, bgColor.b) },
        u_assetColor: { value: new THREE.Vector3(assetColor.r, assetColor.g, assetColor.b) },
        u_intensity: { value: params.intensity || 0.8 },
        u_speed: { value: params.speed || 1.0 },
        u_energy: { value: 0.0 }
      },
      transparent: false,
      side: THREE.DoubleSide
    });
  }, [bgColor, assetColor]);
  
  const geom = useMemo(() => new THREE.PlaneGeometry(8, 6, 1, 1), []);

  useFrame((_, dt) => {
    material.uniforms.u_time.value += dt * (0.6 + params.speed);
    material.uniforms.u_intensity.value = params.intensity || 0.8;
    material.uniforms.u_speed.value = params.speed || 1.0;
    
    const energy = (music?.energy ?? 0) * params.musicReact;
    material.uniforms.u_energy.value = energy;
    
    const rgb = hexToRGB(userColors.assetColor);
    material.uniforms.u_assetColor.value.set(rgb.r, rgb.g, rgb.b);
    const bgRgb = hexToRGB(userColors.bgColor);
    material.uniforms.u_bgColor.value.set(bgRgb.r, bgRgb.g, bgRgb.b);
  });

  return <mesh geometry={geom} material={material} position={[0, 0, -1]} />;
}

/**
 * Silk Veil visual mode for preview
 */
function PreviewSilkVeilMode() {
  const params = useVisStore(s => s.params);
  const music = useVisStore(s => s.music);
  const userColors = useStore(s => s.userColors);
  
  const bgColor = useMemo(() => hexToRGB(userColors.bgColor), [userColors.bgColor]);
  const assetColor = useMemo(() => hexToRGB(userColors.assetColor), [userColors.assetColor]);
  
  const fragmentShader = `
uniform float uTime;
uniform vec3 uBgColor;
uniform vec3 uAssetColor;
uniform float uIntensity;
uniform float uTurbulence;
uniform float uShimmer;
varying vec2 vUv;

// Simplified noise for flowing silk
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
  vec2 uv = vUv;
  
  // Large flowing organic waves
  float n1 = noise(vec2(uv.x * 4.0 + uTime * 0.4, uv.y * 4.0 - uTime * 0.3));
  float n2 = noise(vec2(uv.x * 6.0 - uTime * 0.3, uv.y * 6.0 + uTime * 0.2));
  float n3 = noise(vec2(uv.x * 2.5 + uTime * 0.5, uv.y * 2.5));
  
  // Combine for organic silk flow
  float waves = n1 * 0.5 + n2 * 0.3 + n3 * 0.2;
  
  // Calculate gradient for lighting effect
  float offset = 0.01;
  float dX = noise(vec2(uv.x * 4.0 + offset + uTime * 0.4, uv.y * 4.0 - uTime * 0.3)) - n1;
  float dY = noise(vec2(uv.x * 4.0 + uTime * 0.4, uv.y * 4.0 + offset - uTime * 0.3)) - n1;
  float gradient = dX + dY;
  
  // Create lighting based on wave height and gradient
  float lighting = waves - gradient * 0.5;
  
  // Add fine shimmer
  float shimmer = noise(uv * 12.0 + uTime * 0.8) * 0.15;
  
  // Combine all
  float value = lighting + shimmer;
  
  // Map to colors with strong contrast
  vec3 color = mix(
    uBgColor * 0.7,
    uAssetColor * 1.3,
    smoothstep(0.2, 0.8, value)
  );
  
  gl_FragColor = vec4(color, uIntensity);
}
`;
  
  const vertexShader = `
varying vec2 vUv;
void main(){ 
  vUv = uv; 
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); 
}
`;
  
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      fragmentShader,
      vertexShader,
      uniforms: {
        uTime: { value: 0 },
        uBgColor: { value: new THREE.Vector3(bgColor.r, bgColor.g, bgColor.b) },
        uAssetColor: { value: new THREE.Vector3(assetColor.r, assetColor.g, assetColor.b) },
        uIntensity: { value: params.intensity || 0.8 },
        uTurbulence: { value: 1.5 },
        uShimmer: { value: 1.5 }
      },
      transparent: true,
      side: THREE.DoubleSide
    });
  }, [bgColor, assetColor]);
  
  const geom = useMemo(() => new THREE.PlaneGeometry(8, 6, 1, 1), []);

  useFrame((_, dt) => {
    material.uniforms.uTime.value += dt * (0.6 + params.speed);
    material.uniforms.uIntensity.value = params.intensity || 0.8;
    
    const energy = (music?.energy ?? 0) * params.musicReact;
    material.uniforms.uTurbulence.value = 1.2 + energy * 0.8;
    material.uniforms.uShimmer.value = 1.5 + energy * 2.0;
    
    const rgb = hexToRGB(userColors.assetColor);
    material.uniforms.uAssetColor.value.set(rgb.r, rgb.g, rgb.b);
    const bgRgb = hexToRGB(userColors.bgColor);
    material.uniforms.uBgColor.value.set(bgRgb.r, bgRgb.g, bgRgb.b);
  });

  return <mesh geometry={geom} material={material} position={[0, 0, -1]} />;
}

/**
 * Lotus Bloom visual mode for preview
 */
function PreviewLotusBloomMode() {
  const params = useVisStore(s => s.params);
  const music = useVisStore(s => s.music);
  const userColors = useStore(s => s.userColors);
  
  const bgColor = useMemo(() => hexToRGB(userColors.bgColor), [userColors.bgColor]);
  const assetColor = useMemo(() => hexToRGB(userColors.assetColor), [userColors.assetColor]);
  
  const fragmentShader = `
#define PI 3.14159265359

uniform float uTime;
uniform vec3 uBgColor;
uniform vec3 uAssetColor;
uniform float uIntensity;
uniform float uPetalScale;
uniform float uRotation;
varying vec2 vUv;

// Distance field for petal shape (heart-shaped)
float petalSDF(vec2 p, float size) {
  float a = atan(p.y, p.x);
  float r = length(p);
  float shape = size * (sin(a) + 0.5 * sin(3.0 * a));
  return r - abs(shape);
}

void main() {
  // Center coordinates
  vec2 uv = (vUv - 0.5) * 4.0; // Adjust scale for visibility
  
  // Apply rotation
  float angle = uRotation + uTime * 0.15;
  mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
  uv = rot * uv;
  
  float radius = length(uv);
  float theta = atan(uv.y, uv.x);
  
  // 8-fold symmetry for lotus
  int symmetry = 8;
  float symmetryAngle = 2.0 * PI / float(symmetry);
  float petalIndex = floor((theta + PI) / symmetryAngle);
  float petalAngle = mod(theta, symmetryAngle) - symmetryAngle * 0.5;
  
  // Individual petal animation
  float petalPhase = sin(uTime * 2.0 + petalIndex * 0.5) * 0.5 + 0.5;
  float animatedScale = uPetalScale * (0.8 + petalPhase * 0.4);
  
  // Petal rotation per petal
  float petalRotation = sin(uTime * 1.5 + petalIndex * 0.7) * 0.15;
  float ca = cos(petalRotation);
  float sa = sin(petalRotation);
  mat2 petalRot = mat2(ca, -sa, sa, ca);
  
  // Create petal coordinates
  vec2 petalPos = vec2(cos(petalAngle), sin(petalAngle)) * radius;
  petalPos = petalRot * petalPos;
  
  // Petal distance field
  float petalDist = petalSDF(petalPos, 0.6 * animatedScale);
  
  // Petal fill and outline
  float petal = smoothstep(0.05, -0.05, petalDist);
  float outline = smoothstep(0.02, 0.0, abs(petalDist + 0.03));
  
  // Subdivision rings
  float ringDist = mod(radius, 0.4);
  float ring = smoothstep(0.05, 0.0, abs(ringDist - 0.2)) * 0.5;
  
  // Center glow
  float centerGlow = smoothstep(1.0, 0.0, radius) * 0.6;
  
  // Combine all elements
  float pattern = max(petal * 0.4, outline * 1.5) + ring + centerGlow;
  pattern = clamp(pattern, 0.0, 1.0);
  
  // Color mixing
  vec3 color = mix(uBgColor, uAssetColor, pattern);
  
  // Additive rim lighting on petals
  color += outline * 2.0 * uAssetColor;
  
  float alpha = pattern * uIntensity;
  
  gl_FragColor = vec4(color, clamp(alpha, 0.0, 1.0));
}
`;
  
  const vertexShader = `
varying vec2 vUv;
void main(){ 
  vUv = uv; 
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); 
}
`;
  
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      fragmentShader,
      vertexShader,
      uniforms: {
        uTime: { value: 0 },
        uBgColor: { value: new THREE.Vector3(bgColor.r, bgColor.g, bgColor.b) },
        uAssetColor: { value: new THREE.Vector3(assetColor.r, assetColor.g, assetColor.b) },
        uIntensity: { value: params.intensity || 0.8 },
        uPetalScale: { value: 1.0 },
        uRotation: { value: 0 }
      },
      transparent: true,
      side: THREE.DoubleSide
    });
  }, [bgColor, assetColor]);
  
  const geom = useMemo(() => new THREE.PlaneGeometry(8, 6, 1, 1), []);

  useFrame((_, dt) => {
    material.uniforms.uTime.value += dt * (0.6 + params.speed);
    material.uniforms.uIntensity.value = params.intensity || 0.8;
    
    const energy = (music?.energy ?? 0) * params.musicReact;
    material.uniforms.uPetalScale.value = 0.8 + energy * 0.4;
    
    const rgb = hexToRGB(userColors.assetColor);
    material.uniforms.uAssetColor.value.set(rgb.r, rgb.g, rgb.b);
    const bgRgb = hexToRGB(userColors.bgColor);
    material.uniforms.uBgColor.value.set(bgRgb.r, bgRgb.g, bgRgb.b);
  });

  return <mesh geometry={geom} material={material} position={[0, 0, -1]} />;
}

/**
 * Stained Glass Rose visual mode for preview
 */
function PreviewStainedGlassRoseMode() {
  const params = useVisStore(s => s.params);
  const music = useVisStore(s => s.music);
  const userColors = useStore(s => s.userColors);
  
  const bgColor = useMemo(() => hexToRGB(userColors.bgColor), [userColors.bgColor]);
  const assetColor = useMemo(() => hexToRGB(userColors.assetColor), [userColors.assetColor]);
  
  const fragmentShader = `
#define PI 3.14159265359

uniform float uTime;
uniform vec3 uBgColor;
uniform vec3 uAssetColor;
uniform float uIntensity;
uniform float uBloom;
uniform float uRayLength;
varying vec2 vUv;

void main() {
  vec2 uv = (vUv - 0.5) * 4.0;
  
  // Rotating rosette
  float angle = uTime * 0.1;
  mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
  uv = rot * uv;
  
  float radius = length(uv);
  float theta = atan(uv.y, uv.x);
  
  // 12-petal rosette
  float petals = 12.0;
  float petalAngle = PI * 2.0 / petals;
  float localAngle = mod(theta + PI / petals, petalAngle) - petalAngle * 0.5;
  float petalShape = cos(localAngle * petals * 0.5) * 0.5 + 0.5;
  petalShape = pow(petalShape, 2.0);
  
  float pattern = petalShape * (1.0 - smoothstep(0.5, 2.0, radius));
  
  // Radial bands
  float bands = smoothstep(0.05, 0.0, abs(fract(radius * 0.5) - 0.5));
  pattern = max(pattern, bands * 0.5);
  
  // God rays
  vec2 dir = vUv - vec2(0.5);
  float rayDist = length(dir);
  float ray = (1.0 - rayDist) * uRayLength * 0.3;
  
  vec3 color = mix(uBgColor, uAssetColor, pattern);
  color += ray * uAssetColor * uBloom;
  
  gl_FragColor = vec4(color, (pattern + ray * 0.5) * uIntensity);
}
`;
  
  const vertexShader = `
varying vec2 vUv;
void main(){ 
  vUv = uv; 
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); 
}
`;
  
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      fragmentShader,
      vertexShader,
      uniforms: {
        uTime: { value: 0 },
        uBgColor: { value: new THREE.Vector3(bgColor.r, bgColor.g, bgColor.b) },
        uAssetColor: { value: new THREE.Vector3(assetColor.r, assetColor.g, assetColor.b) },
        uIntensity: { value: params.intensity || 0.8 },
        uBloom: { value: 0.5 },
        uRayLength: { value: 0.5 }
      },
      transparent: true,
      side: THREE.DoubleSide
    });
  }, [bgColor, assetColor]);
  
  const geom = useMemo(() => new THREE.PlaneGeometry(8, 6, 1, 1), []);

  useFrame((_, dt) => {
    material.uniforms.uTime.value += dt * (0.6 + params.speed);
    material.uniforms.uIntensity.value = params.intensity || 0.8;
    
    const energy = (music?.energy ?? 0) * params.musicReact;
    material.uniforms.uBloom.value = 0.3 + energy * 0.7;
    material.uniforms.uRayLength.value = 0.3 + energy * 0.5;
    
    const rgb = hexToRGB(userColors.assetColor);
    material.uniforms.uAssetColor.value.set(rgb.r, rgb.g, rgb.b);
    const bgRgb = hexToRGB(userColors.bgColor);
    material.uniforms.uBgColor.value.set(bgRgb.r, bgRgb.g, bgRgb.b);
  });

  return <mesh geometry={geom} material={material} position={[0, 0, -1]} />;
}

/**
 * Ink & Water visual mode for preview
 */
function PreviewInkWaterMode() {
  const params = useVisStore(s => s.params);
  const music = useVisStore(s => s.music);
  const userColors = useStore(s => s.userColors);
  
  const bgColor = useMemo(() => hexToRGB(userColors.bgColor), [userColors.bgColor]);
  const assetColor = useMemo(() => hexToRGB(userColors.assetColor), [userColors.assetColor]);
  
  const fragmentShader = `
uniform float uTime;
uniform vec3 uBgColor;
uniform vec3 uAssetColor;
uniform float uIntensity;
uniform float uDiffusion;
varying vec2 vUv;

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
  vec2 uv = vUv;
  
  // Lava lamp blob movement
  vec2 blob1Pos = vec2(
    0.5 + sin(uTime * 0.15) * 0.25,
    0.5 + cos(uTime * 0.12) * 0.25
  );
  
  vec2 blob2Pos = vec2(
    0.5 - sin(uTime * 0.18) * 0.2,
    0.5 + sin(uTime * 0.16) * 0.2
  );
  
  float noise1 = noise(uv * 3.0 + uTime * 0.1);
  float noise2 = noise(uv * 5.0 - uTime * 0.15);
  
  float dist1 = length(uv - blob1Pos) - noise1 * 0.08;
  float dist2 = length(uv - blob2Pos) - noise2 * 0.06;
  
  float size1 = 0.15 + uDiffusion * 0.1;
  float size2 = 0.12 + uDiffusion * 0.08;
  
  float blob1 = smoothstep(size1 + 0.1, size1 - 0.05, dist1);
  float blob2 = smoothstep(size2 + 0.1, size2 - 0.05, dist2);
  
  float blobs = smoothstep(0.3, 0.8, blob1 + blob2);
  
  vec3 color = mix(uBgColor, uAssetColor, blobs);
  
  gl_FragColor = vec4(color, blobs * uIntensity);
}
`;
  
  const vertexShader = `
varying vec2 vUv;
void main(){ 
  vUv = uv; 
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); 
}
`;
  
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      fragmentShader,
      vertexShader,
      uniforms: {
        uTime: { value: 0 },
        uBgColor: { value: new THREE.Vector3(bgColor.r, bgColor.g, bgColor.b) },
        uAssetColor: { value: new THREE.Vector3(assetColor.r, assetColor.g, assetColor.b) },
        uIntensity: { value: params.intensity || 0.8 },
        uDiffusion: { value: 1.0 }
      },
      transparent: true,
      side: THREE.DoubleSide
    });
  }, [bgColor, assetColor]);
  
  const geom = useMemo(() => new THREE.PlaneGeometry(8, 6, 1, 1), []);

  useFrame((_, dt) => {
    material.uniforms.uTime.value += dt * (0.6 + params.speed);
    material.uniforms.uIntensity.value = params.intensity || 0.8;
    
    const energy = (music?.energy ?? 0) * params.musicReact;
    material.uniforms.uDiffusion.value = 0.8 + energy * 0.4;
    
    const rgb = hexToRGB(userColors.assetColor);
    material.uniforms.uAssetColor.value.set(rgb.r, rgb.g, rgb.b);
    const bgRgb = hexToRGB(userColors.bgColor);
    material.uniforms.uBgColor.value.set(bgRgb.r, bgRgb.g, bgRgb.b);
  });

  return <mesh geometry={geom} material={material} position={[0, 0, -1]} />;
}

/**
 * Opaline Wave visual mode for preview
 */
function PreviewOpalineWaveMode() {
  const params = useVisStore(s => s.params);
  const music = useVisStore(s => s.music);
  const userColors = useStore(s => s.userColors);
  
  const bgColor = useMemo(() => hexToRGB(userColors.bgColor), [userColors.bgColor]);
  const assetColor = useMemo(() => hexToRGB(userColors.assetColor), [userColors.assetColor]);
  
  const fragmentShader = `
uniform float uTime;
uniform vec3 uBgColor;
uniform vec3 uAssetColor;
uniform float uIntensity;
uniform float uFlowSpeed;
uniform float uShimmer;
varying vec2 vUv;

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

vec2 rotate2D(vec2 p, float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return vec2(p.x * c - p.y * s, p.x * s + p.y * c);
}

void main() {
  vec2 uv = vUv;
  
  // Swirling flow
  vec2 center = vec2(0.5);
  vec2 toCenter = uv - center;
  float dist = length(toCenter);
  float angle = atan(toCenter.y, toCenter.x);
  
  float swirlAngle = uFlowSpeed * (1.0 - dist) * sin(uTime * 0.3);
  vec2 swirled = center + rotate2D(toCenter, swirlAngle);
  
  // Layered noise for oil-on-water effect
  float pattern1 = noise(swirled * 2.0 + uTime * 0.1);
  float pattern2 = noise(swirled * 3.0 - uTime * 0.08);
  
  float thickness = smoothstep(0.2, 0.8, pattern1 * 0.6 + pattern2 * 0.4);
  
  // Shimmer detail
  float shimmer = noise(swirled * 8.0 + uTime * uShimmer * 2.0) * 0.2;
  thickness += shimmer;
  
  // Iridescent edges
  float edge = smoothstep(0.4, 0.6, abs(pattern1 - pattern2)) * 0.3;
  
  vec3 color = mix(uBgColor, uAssetColor, thickness + edge);
  
  gl_FragColor = vec4(color, uIntensity);
}
`;
  
  const vertexShader = `
varying vec2 vUv;
void main(){ 
  vUv = uv; 
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); 
}
`;
  
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      fragmentShader,
      vertexShader,
      uniforms: {
        uTime: { value: 0 },
        uBgColor: { value: new THREE.Vector3(bgColor.r, bgColor.g, bgColor.b) },
        uAssetColor: { value: new THREE.Vector3(assetColor.r, assetColor.g, assetColor.b) },
        uIntensity: { value: params.intensity || 0.8 },
        uFlowSpeed: { value: 1.0 },
        uShimmer: { value: 1.0 }
      },
      transparent: true,
      side: THREE.DoubleSide
    });
  }, [bgColor, assetColor]);
  
  const geom = useMemo(() => new THREE.PlaneGeometry(8, 6, 1, 1), []);

  useFrame((_, dt) => {
    material.uniforms.uTime.value += dt * (0.6 + params.speed);
    material.uniforms.uIntensity.value = params.intensity || 0.8;
    
    const energy = (music?.energy ?? 0) * params.musicReact;
    material.uniforms.uFlowSpeed.value = 1.0 + energy * 1.5;
    material.uniforms.uShimmer.value = 1.0 + energy * 2.0;
    
    const rgb = hexToRGB(userColors.assetColor);
    material.uniforms.uAssetColor.value.set(rgb.r, rgb.g, rgb.b);
    const bgRgb = hexToRGB(userColors.bgColor);
    material.uniforms.uBgColor.value.set(bgRgb.r, bgRgb.g, bgRgb.b);
  });

  return <mesh geometry={geom} material={material} position={[0, 0, -1]} />;
}

/**
 * Enhanced smoke trail with more particles and music reactivity
 */
function SmokeTrail({ handSide, color, intensity, radius }) {
  const particlesRef = useRef();
  const timeRef = useRef(0);
  const trailPositions = useRef([]);
  const params = useVisStore(s => s.params);
  const music = useVisStore(s => s.music);
  const speed = params.speed || 1.0;
  
  const particleCount = PARTICLE_TRAIL_LENGTH;
  
  // Initialize trail positions
  useEffect(() => {
    trailPositions.current = new Array(particleCount).fill(null).map(() => ({
      x: 0.5,
      y: 0.5,
      age: 0
    }));
  }, [particleCount]);
  
  const geometry = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;
      sizes[i] = radius * PARTICLE_SIZE_MULTIPLIER * (1 - i / particleCount);
    }
    
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    return geom;
  }, [radius, particleCount]);
  
  const material = useMemo(() => {
    return new THREE.PointsMaterial({
      color: new THREE.Color(color),
      size: SMOKE_SPHERE_SIZE,
      transparent: true,
      opacity: intensity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });
  }, [color, intensity]);
  
  useFrame((state, delta) => {
    if (!particlesRef.current) return;
    
    timeRef.current += delta * speed;
    const t = timeRef.current;
    
    // Calculate current hand position (figure-8)
    const offset = handSide === 'left' ? 0 : Math.PI;
    const x = 0.5 + FIGURE8_X_AMPLITUDE * Math.sin(t + offset);
    const y = 0.5 + FIGURE8_Y_AMPLITUDE * Math.sin(FIGURE8_Y_FREQUENCY * t + offset);
    
    // Shift trail positions
    for (let i = trailPositions.current.length - 1; i > 0; i--) {
      trailPositions.current[i] = { ...trailPositions.current[i - 1] };
      trailPositions.current[i].age += delta;
    }
    trailPositions.current[0] = { x, y, age: 0 };
    
    // Update geometry positions with music reactivity
    const energy = (music?.energy ?? 0) * params.musicReact;
    const positions = particlesRef.current.geometry.attributes.position.array;
    for (let i = 0; i < trailPositions.current.length; i++) {
      const pos = trailPositions.current[i];
      positions[i * 3] = (pos.x - 0.5) * COORDINATE_SCALE_X;
      positions[i * 3 + 1] = (0.5 - pos.y) * COORDINATE_SCALE_Y;
      positions[i * 3 + 2] = -i * 0.01 + energy * 0.1; // Add depth based on music
    }
    particlesRef.current.geometry.attributes.position.needsUpdate = true;
  });
  
  return <points ref={particlesRef} geometry={geometry} material={material} />;
}

/**
 * Enhanced particle trail effect (the preview smoke effect now as a real effect)
 */
function ParticleTrailEffect({ handSide, color, intensity, particleSize, trailLength, fadeSpeed }) {
  const particlesRef = useRef();
  const timeRef = useRef(0);
  const trailPositions = useRef([]);
  const params = useVisStore(s => s.params);
  const music = useVisStore(s => s.music);
  const speed = params.speed || 1.0;
  
  const particleCount = Math.floor(trailLength);
  
  // Initialize trail positions
  useEffect(() => {
    trailPositions.current = new Array(particleCount).fill(null).map(() => ({
      x: 0.5,
      y: 0.5,
      age: 0
    }));
  }, [particleCount]);
  
  const geometry = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;
      sizes[i] = particleSize * (1 - i / particleCount);
    }
    
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    return geom;
  }, [particleCount, particleSize]);
  
  const material = useMemo(() => {
    return new THREE.PointsMaterial({
      color: new THREE.Color(color),
      size: particleSize * 2.5, // Increased from 1.5 to match main UI better
      transparent: true,
      opacity: intensity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });
  }, [color, intensity, particleSize]);
  
  useFrame((state, delta) => {
    if (!particlesRef.current) return;
    
    timeRef.current += delta * speed;
    const t = timeRef.current;
    
    // Calculate current hand position (figure-8)
    const offset = handSide === 'left' ? 0 : Math.PI;
    const x = 0.5 + FIGURE8_X_AMPLITUDE * Math.sin(t + offset);
    const y = 0.5 + FIGURE8_Y_AMPLITUDE * Math.sin(FIGURE8_Y_FREQUENCY * t + offset);
    
    // Shift trail positions with fade
    for (let i = trailPositions.current.length - 1; i > 0; i--) {
      trailPositions.current[i] = { ...trailPositions.current[i - 1] };
      trailPositions.current[i].age += delta;
    }
    trailPositions.current[0] = { x, y, age: 0 };
    
    // Update geometry positions with music reactivity
    const energy = (music?.energy ?? 0) * params.musicReact;
    const positions = particlesRef.current.geometry.attributes.position.array;
    const sizes = particlesRef.current.geometry.attributes.size.array;
    
    for (let i = 0; i < trailPositions.current.length; i++) {
      const pos = trailPositions.current[i];
      const fade = Math.pow(fadeSpeed, i);
      
      positions[i * 3] = (pos.x - 0.5) * COORDINATE_SCALE_X;
      positions[i * 3 + 1] = (0.5 - pos.y) * COORDINATE_SCALE_Y;
      positions[i * 3 + 2] = -i * 0.01 + energy * 0.1; // Add depth based on music
      
      // Adjust size with fade
      sizes[i] = particleSize * (1 - i / particleCount) * fade * (1 + energy * 0.2);
    }
    
    particlesRef.current.geometry.attributes.position.needsUpdate = true;
    particlesRef.current.geometry.attributes.size.needsUpdate = true;
    
    // Update material opacity based on music
    if (particlesRef.current.material) {
      particlesRef.current.material.opacity = intensity * (1 + energy * 0.3);
    }
  });
  
  return <points ref={particlesRef} geometry={geometry} material={material} />;
}

/**
 * Noise Distortion effect for preview
 */
function NoiseDistortionEffect({ handSide, color1, color2, intensity, distortionStrength, distortionRadius }) {
  const meshRef = useRef();
  const timeRef = useRef(0);
  const params = useVisStore(s => s.params);
  const music = useVisStore(s => s.music);
  const speed = params.speed || 1.0;
  
  // Simplified Perlin noise shader for preview (same as main component)
  const vertexShader = `
    varying vec2 vUv;
    
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;
  
  const fragmentShader = `
    uniform float uTime;
    uniform vec2 uHandPos;
    uniform float uHandActive;
    uniform vec3 uColor1;
    uniform vec3 uColor2;
    uniform float uIntensity;
    uniform float uDistortionStrength;
    uniform float uDistortionRadius;
    
    varying vec2 vUv;
    
    // Simplified 2D noise for preview performance
    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }
    
    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      
      float a = hash(i);
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));
      
      return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }
    
    void main() {
      vec2 uv = vUv;
      
      // Calculate distortion based on hand position
      vec2 distortion = vec2(0.0);
      float totalInfluence = 0.0;
      
      if (uHandActive > 0.5) {
        vec2 handDiff = uv - uHandPos;
        float handDist = length(handDiff);
        float handInfluence = 1.0 - smoothstep(0.0, uDistortionRadius, handDist);
        
        // Warp noise field around hand
        distortion = normalize(handDiff) * handInfluence * uDistortionStrength;
        totalInfluence = handInfluence;
      }
      
      // Apply distortion to UV coordinates
      vec2 distortedUV = uv + distortion;
      
      // Generate moving noise pattern
      float n = noise(distortedUV * 3.0 + vec2(uTime * 0.3));
      n += noise(distortedUV * 6.0 + vec2(uTime * 0.5)) * 0.5;
      n = (n + 1.0) * 0.5;
      
      // Add hand influence to noise
      n = mix(n, n * (1.0 + totalInfluence), 0.5);
      
      // Blend colors
      vec3 finalColor = mix(uColor1, uColor2, n);
      
      // Calculate alpha
      float alpha = uIntensity * (0.3 + totalInfluence * 0.7);
      
      gl_FragColor = vec4(finalColor, alpha);
    }
  `;
  
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uHandPos: { value: new THREE.Vector2(0.5, 0.5) },
        uHandActive: { value: 1.0 },
        uColor1: { value: new THREE.Color(color1) },
        uColor2: { value: new THREE.Color(color2) },
        uIntensity: { value: intensity },
        uDistortionStrength: { value: distortionStrength },
        uDistortionRadius: { value: distortionRadius }
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }, [color1, color2, intensity, distortionStrength, distortionRadius]);
  
  useFrame((state, delta) => {
    if (!meshRef.current) return;
    
    timeRef.current += delta * speed;
    const t = timeRef.current;
    
    // Calculate hand position (figure-8)
    const offset = handSide === 'left' ? 0 : Math.PI;
    const x = 0.5 + FIGURE8_X_AMPLITUDE * Math.sin(t + offset);
    const y = 0.5 + FIGURE8_Y_AMPLITUDE * Math.sin(FIGURE8_Y_FREQUENCY * t + offset);
    
    // Update shader uniforms
    meshRef.current.material.uniforms.uTime.value = t;
    meshRef.current.material.uniforms.uHandPos.value.set(x, y);
    meshRef.current.material.uniforms.uHandActive.value = 1.0;
    
    // Update colors and intensity with music reactivity
    const energy = (music?.energy ?? 0) * params.musicReact;
    meshRef.current.material.uniforms.uColor1.value.set(color1);
    meshRef.current.material.uniforms.uColor2.value.set(color2);
    meshRef.current.material.uniforms.uIntensity.value = intensity * (1 + energy * 0.2);
    meshRef.current.material.uniforms.uDistortionStrength.value = distortionStrength;
    meshRef.current.material.uniforms.uDistortionRadius.value = distortionRadius;
  });
  
  return (
    <mesh ref={meshRef} material={material} position={[0, 0, 0]}>
      <planeGeometry args={[8, 6]} />
    </mesh>
  );
}

/**
 * Fluid effect wrapper - simplified for preview to avoid window-level event conflicts
 * Shows visual markers instead of actual fluid distortion to keep it contained
 */
function FluidEffectPreview({ settings, showLeftHand, showRightHand }) {
  // For preview, we'll show enhanced visual markers that represent the fluid effect
  // This avoids the issue of the Fluid library listening to window events globally
  
  return (
    <>
      {showLeftHand && <FluidVisualMarker handSide="left" settings={settings} />}
      {showRightHand && <FluidVisualMarker handSide="right" settings={settings} />}
    </>
  );
}

/**
 * Visual marker to represent fluid distortion in preview
 */
function FluidVisualMarker({ handSide, settings }) {
  const meshRef = useRef();
  const trailMeshes = useRef([]);
  const timeRef = useRef(0);
  const params = useVisStore(s => s.params);
  const music = useVisStore(s => s.music);
  const speed = params.speed || 1.0;
  
  // Create trail of spheres
  const trailCount = 5;
  
  useFrame((state, delta) => {
    timeRef.current += delta * speed;
    const t = timeRef.current;
    
    // Figure-8 pattern
    const offset = handSide === 'left' ? 0 : Math.PI;
    const x = 0.5 + FIGURE8_X_AMPLITUDE * Math.sin(t + offset);
    const y = 0.5 + FIGURE8_Y_AMPLITUDE * Math.sin(FIGURE8_Y_FREQUENCY * t + offset);
    
    const energy = (music?.energy ?? 0) * params.musicReact;
    
    // Update main sphere
    if (meshRef.current) {
      meshRef.current.position.set((x - 0.5) * COORDINATE_SCALE_X, (0.5 - y) * COORDINATE_SCALE_Y, 0);
      const scale = (settings.radius || 0.1) * 2 * (1 + PULSE_AMPLITUDE * Math.sin(t * PULSE_FREQUENCY) + energy * 0.3);
      meshRef.current.scale.set(scale, scale, scale);
    }
    
    // Update trail spheres with wave distortion
    trailMeshes.current.forEach((mesh, i) => {
      if (mesh) {
        const trailT = t - (i * 0.1);
        const trailX = 0.5 + FIGURE8_X_AMPLITUDE * Math.sin(trailT + offset);
        const trailY = 0.5 + FIGURE8_Y_AMPLITUDE * Math.sin(FIGURE8_Y_FREQUENCY * trailT + offset);
        
        // Add swirl/distortion effect
        const distortion = settings.distortion || 1;
        const swirl = (settings.swirl || 0) * 0.01;
        const angle = trailT * swirl;
        const distX = Math.cos(angle) * distortion * 0.1;
        const distY = Math.sin(angle) * distortion * 0.1;
        
        mesh.position.set(
          (trailX - 0.5 + distX) * COORDINATE_SCALE_X, 
          (0.5 - trailY + distY) * COORDINATE_SCALE_Y, 
          -i * 0.05
        );
        
        const trailScale = (settings.radius || 0.1) * 1.5 * (1 - i / trailCount);
        mesh.scale.set(trailScale, trailScale, trailScale);
      }
    });
  });
  
  const color = settings.fluidColor || '#005eff';
  const intensity = settings.intensity || 1.0;
  
  return (
    <group>
      {/* Main sphere - larger and more visible */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshBasicMaterial 
          color={color} 
          transparent 
          opacity={Math.min(intensity * 0.8, 1.0)}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      
      {/* Trail spheres */}
      {Array.from({ length: trailCount }).map((_, i) => (
        <mesh key={i} ref={el => trailMeshes.current[i] = el}>
          <sphereGeometry args={[0.18, 12, 12]} />
          <meshBasicMaterial 
            color={settings.rainbow ? 
              `hsl(${(i / trailCount) * 360}, 70%, 60%)` : 
              color
            }
            transparent 
            opacity={Math.min((intensity * 0.6 * (1 - i / trailCount)), 0.85)}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Simulates hand movement in a figure-8 pattern for preview with actual ripple effect rendering
 */
function SimulatedHandMovement({ handSide, effectType }) {
  const meshRef = useRef();
  const timeRef = useRef(0);
  const lastPositionRef = useRef({ x: 0.5, y: 0.5 });
  const params = useVisStore(s => s.params);
  const music = useVisStore(s => s.music);
  
  // Get effect settings based on type
  const getEffectSettings = () => {
    const handEffect = params.handEffect || {};
    switch (effectType) {
      case 'ripple':
        return handEffect.ripple || {};
      case 'smoke':
        return handEffect.smoke || {};
      case 'fluidDistortion':
        return handEffect.fluidDistortion || {};
      case 'particleTrail':
        return handEffect.particleTrail || {};
      case 'noiseDistortion':
        return handEffect.noiseDistortion || {};
      default:
        return {};
    }
  };

  const effectSettings = getEffectSettings();
  const speed = params.speed || 1.0;
  const transparency = params.intensity || 0.8;
  
  // Convert hex to RGB
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
      parseInt(result[1], 16) / 255,
      parseInt(result[2], 16) / 255,
      parseInt(result[3], 16) / 255
    ] : [0, 0, 0];
  };

  // Create shader material for ripple effect with enhanced visuals
  const material = useMemo(() => {
    if (effectType !== 'ripple') return null;
    
    const uniforms = {
      ...handRippleUniforms,
      uTexture: { value: null },
      uHandPosition: { value: new THREE.Vector2(0.5, 0.5) },
      uRippleStrength: { value: 0.5 },
      uTime: { value: 0.0 },
      uRippleRadius: { value: effectSettings.radius || 0.1 },
      uBaseColor: { value: new THREE.Vector3(...hexToRgb(effectSettings.baseColor || '#00ccff')) },
      uRippleColor: { value: new THREE.Vector3(...hexToRgb(effectSettings.rippleColor || '#ff00cc')) }
    };

    return new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: handRippleVertexShader,
      fragmentShader: handRippleFragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
  }, [effectType, effectSettings.radius, effectSettings.baseColor, effectSettings.rippleColor]);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    
    timeRef.current += delta * speed;
    const t = timeRef.current;
    
    // Figure-8 pattern for hand movement
    // Offset pattern for left vs right hand
    const offset = handSide === 'left' ? 0 : Math.PI;
    const x = 0.5 + FIGURE8_X_AMPLITUDE * Math.sin(t + offset);
    const y = 0.5 + FIGURE8_Y_AMPLITUDE * Math.sin(FIGURE8_Y_FREQUENCY * t + offset);
    
    // Calculate velocity for motion-reactive effects
    const dx = x - lastPositionRef.current.x;
    const dy = y - lastPositionRef.current.y;
    const velocity = Math.sqrt(dx * dx + dy * dy) / delta;
    
    lastPositionRef.current = { x, y };
    
    // Get music energy for reactivity
    const energy = (music?.energy ?? 0) * params.musicReact;
    
    // Update material uniforms for ripple effect
    if (material && material.uniforms) {
      material.uniforms.uHandPosition.value.set(x, y);
      material.uniforms.uTime.value = t;
      // Add music reactivity to ripple strength
      const baseStrength = Math.min(velocity * 0.5 * (effectSettings.intensity || 0.8), 1.0);
      material.uniforms.uRippleStrength.value = baseStrength + energy * 0.5;
      material.uniforms.uRippleRadius.value = (effectSettings.radius || 0.1) * (1 + energy * 0.3);
      material.uniforms.uBaseColor.value.set(...hexToRgb(effectSettings.baseColor || '#00ccff'));
      material.uniforms.uRippleColor.value.set(...hexToRgb(effectSettings.rippleColor || '#ff00cc'));
    }
    
    // Position the visual element
    if (effectType === 'ripple') {
      // Ripple covers full screen
      meshRef.current.position.set(0, 0, 0);
      // Apply transparency
      if (material) {
        material.opacity = transparency;
      }
    }
  });

  // Render different visuals based on effect type
  if (effectType === 'ripple') {
    return (
      <mesh ref={meshRef} material={material}>
        <planeGeometry args={[8, 6]} />
      </mesh>
    );
  }
  
  if (effectType === 'smoke') {
    return <SmokeTrail 
      handSide={handSide}
      color={effectSettings.color || '#ffffff'}
      intensity={effectSettings.intensity || 0.7}
      radius={effectSettings.radius || 0.8}
    />;
  }
  
  if (effectType === 'particleTrail') {
    return <ParticleTrailEffect 
      handSide={handSide}
      color={effectSettings.color || '#00ffff'}
      intensity={effectSettings.intensity || 0.8}
      particleSize={effectSettings.particleSize || 0.15}
      trailLength={effectSettings.trailLength || 50}
      fadeSpeed={effectSettings.fadeSpeed || 0.95}
    />;
  }
  
  if (effectType === 'noiseDistortion') {
    return <NoiseDistortionEffect 
      handSide={handSide}
      color1={effectSettings.color1 || '#00ffff'}
      color2={effectSettings.color2 || '#ff00ff'}
      intensity={effectSettings.intensity !== undefined ? effectSettings.intensity : 0.8}
      distortionStrength={effectSettings.distortionStrength !== undefined ? effectSettings.distortionStrength : 0.2}
      distortionRadius={effectSettings.distortionRadius !== undefined ? effectSettings.distortionRadius : 0.5}
    />;
  }
  
  // Fluid distortion is handled separately by FluidEffectPreview
  // Return null here as the fluid effect needs to be at a different level
  if (effectType === 'fluidDistortion') {
    return null;
  }
  
  return null;
}

/**
 * Quick View component for previewing hand effects without user motion
 * Now with draggable positioning, background visuals, and music reactivity
 */
export default function HandEffectQuickView() {
  const params = useVisStore(s => s.params);
  const setParams = useVisStore(s => s.setParams);
  const handEffect = useMemo(() => params.handEffect || {}, [params.handEffect]);
  const userColors = useStore(s => s.userColors); // Get user colors for background
  
  const effectType = handEffect.type || 'none';
  const handSelection = handEffect.handSelection || 'none';
  const showQuickView = handEffect.showQuickView !== false; // Default to true
  
  // Draggable state
  const [position, setPosition] = useState({
    x: handEffect.previewPosition?.x || DEFAULT_RIGHT,
    y: handEffect.previewPosition?.y || DEFAULT_BOTTOM
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const dragRef = useRef(null);
  
  // Handle drag start
  const handleMouseDown = useCallback((e) => {
    if (e.target.closest('.preview-header')) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  }, [position]);
  
  // Handle drag move
  const handleMouseMove = useCallback((e) => {
    if (isDragging) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      
      // Keep within window bounds
      const maxX = window.innerWidth - PREVIEW_WIDTH - 10;
      const maxY = window.innerHeight - PREVIEW_HEIGHT - 10;
      
      setPosition({
        x: Math.max(10, Math.min(newX, maxX)),
        y: Math.max(10, Math.min(newY, maxY))
      });
    }
  }, [isDragging, dragStart]);
  
  // Handle drag end
  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      // Save position to state
      setParams({
        handEffect: {
          ...handEffect,
          previewPosition: position
        }
      });
    }
  }, [isDragging, position, handEffect, setParams]);
  
  // Add/remove global mouse event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);
  
  // Don't render if no effect selected or preview is disabled
  if (effectType === 'none' || handSelection === 'none' || !showQuickView) {
    return null;
  }
  
  const showLeftHand = handSelection === 'left' || handSelection === 'both';
  const showRightHand = handSelection === 'right' || handSelection === 'both';
  
  return (
    <div 
      ref={dragRef}
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        width: PREVIEW_WIDTH,
        height: PREVIEW_HEIGHT,
        background: 'rgba(0,0,0,0.8)',
        backdropFilter: 'blur(10px)',
        border: '2px solid rgba(0,150,255,0.5)',
        borderRadius: 12,
        overflow: 'hidden',
        zIndex: 1000,
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        cursor: isDragging ? 'grabbing' : 'default'
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Header - Draggable */}
      <div 
        className="preview-header"
        style={{
        padding: '8px 12px',
        borderBottom: '1px solid rgba(0,150,255,0.3)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        cursor: 'grab',
        userSelect: 'none',
        background: 'rgba(0,0,0,0.3)'
      }}>
        <h4 style={{ 
          margin: 0, 
          fontSize: '12px', 
          fontWeight: 600,
          color: 'white'
        }}>
          Effect Preview (Drag to Move)
        </h4>
      </div>
      
      {/* Canvas for preview */}
      <div style={{ width: '100%', height: 'calc(100% - 40px)', position: 'relative' }}>
        <Canvas
          camera={{ position: [0, 0, 2], fov: 60 }}
          gl={{ 
            alpha: true, 
            antialias: true,
            preserveDrawingBuffer: true
          }}
        >
          {/* Background color matches main UI exactly */}
          <color attach="background" args={[userColors.bgColor]} />
          
          {/* Background visual mode */}
          <PreviewBackgroundVisual />
          
          {/* Hand effects - conditional rendering based on effect type */}
          {effectType === 'fluidDistortion' ? (
            // Fluid distortion uses visual markers to stay within preview canvas
            <FluidEffectPreview 
              settings={handEffect.fluidDistortion || {}}
              showLeftHand={showLeftHand}
              showRightHand={showRightHand}
            />
          ) : (
            // Other effects (ripple, smoke, particleTrail) render normally
            <>
              {showLeftHand && (
                <SimulatedHandMovement 
                  handSide="left" 
                  effectType={effectType}
                />
              )}
              {showRightHand && (
                <SimulatedHandMovement 
                  handSide="right" 
                  effectType={effectType}
                />
              )}
            </>
          )}
        </Canvas>
      </div>
      
      {/* Bottom info text removed per request */}
    </div>
  );
}
