import React, { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useVisStore } from '../state/useVisStore';
import useStore from '../core/store';
import * as THREE from 'three';
import {
  handRippleVertexShader,
  handRippleFragmentShader,
  handRippleUniforms
} from '../shaders/handRippleShader';

// Import ChoreoXploreSystem which contains all visual modes
import ChoreoXploreSystem from './ChoreoXploreSystem';

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
<<<<<<< Updated upstream
=======
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
    case 'empty':
      return null; // Empty mode renders nothing
    // New modes - render actual modes
    case 'silk_veil':
      return <SilkVeilMode />;
    case 'lotus_bloom':
      return <LotusBloomMode />;
    case 'stained_glass_rose':
      return <StainedGlassRoseMode />;
    case 'ink_water':
      return <InkWaterMode />;
    case 'opaline_wave':
      return <OpalineWaveMode />;
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
 * Pulsating Circle visual mode for preview
 */
function PreviewPulsatingCircleMode() {
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
  float energyPulse = uEnergy * 0.3; // Energy-based pulsing
  float beatPulse = uBeat * 0.2;     // Beat-based pulsing
  float rmsPulse = uRms * 0.25;      // RMS-based pulsing
  
  // Audio-reactive pulsation based on loudness
  float audioThreshold = 0.01; // Minimum audio level to consider "music playing"
  float isMusicPlaying = step(audioThreshold, uEnergy + uRms + uBeat);
  
  // Pulsation directly proportional to audio loudness
  float audioLoudness = uEnergy + uRms + uBeat; // Combined audio level
  float pulsationSize = audioLoudness * 0.4; // Scale pulsation to audio level
  
  // Combine base radius with audio-reactive pulsation
  float radius = baseRadius + pulsationSize;
  
  // Create smooth circle edge with falloff
  float circle = 1.0 - smoothstep(radius - 0.05, radius, dist);
  
  // Add inner glow effect
  float innerGlow = 1.0 - smoothstep(radius * 0.3, radius * 0.7, dist);
  innerGlow *= 0.3;
  
  // Add outer glow based on audio intensity
  float outerGlow = 1.0 - smoothstep(radius, radius + 0.1 + pulsationSize * 0.8, dist);
  outerGlow *= 0.2 * uIntensity;
  
  // Combine all effects
  float pattern = circle + innerGlow + outerGlow;
  
  // Add wave distortion based on audio (only when music is playing)
  float waveDistortion = sin(dist * 20.0 + t * 3.0) * 0.01 * uEnergy * isMusicPlaying;
  pattern += waveDistortion;
  
  // Use RGB color directly
  vec3 accent = uColor;
  
  // Add color variation based on audio (only when music is playing)
  vec3 colorVariation = vec3(
    sin(t + uEnergy * 2.0) * 0.2 * isMusicPlaying,
    cos(t + uBeat * 1.5) * 0.2 * isMusicPlaying,
    sin(t * 1.5 + uRms * 2.5) * 0.2 * isMusicPlaying
  );
  
  vec3 finalColor = accent + colorVariation;
  vec3 col = finalColor * pattern * uIntensity;
  
  // Add brightness based on audio intensity
  float brightness = 1.0 + uEnergy * 0.5 + uBeat * 0.3 + uRms * 0.4;
  col *= brightness;
  
  // Reduce visibility when no music is playing
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
    const sharp = (motion?.sharpness ?? 0) * params.motionReact;
    const rms = music?.rms ?? 0;
    const beat = (music?.onset ?? false) ? 1.0 : 0.0;

    // Smooth audio reactivity (matching actual mode)
    material.uniforms.uEnergy.value = THREE.MathUtils.lerp(
      material.uniforms.uEnergy.value, energy, 0.3
    );
    material.uniforms.uMotion.value = THREE.MathUtils.lerp(
      material.uniforms.uMotion.value, sharp, 0.2
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
 * Note: The actual mode uses instanced meshes with hand interaction.
 * This is a shader-based approximation for preview purposes.
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
  float pattern = 0.0;
  
  // Combine audio features for overall loudness (for opacity only)
  float audioLoudness = uEnergy + uRms + uBeat * 0.3;
  
  // Constant fall speed (no audio influence)
  float fallSpeed = 0.15;
  
  // Create many vertical line segments (raindrops)
  // Using more lines to approximate the 1000 drops in the actual mode
  for(int i = 0; i < 200; i++) {
    float fi = float(i);
    
    // Use hash for more random-looking positions
    float xPos = hash(fi * 0.137) * 0.96 + 0.02;
    
    // Each drop has its own starting y position (staggered)
    float yOffset = hash(fi * 0.273);
    
    // Falling effect with constant speed
    float fallTime = mod(uTime * fallSpeed + yOffset * 3.0, 3.0);
    float yPos = 1.0 - (fallTime / 3.0); // Falls from top to bottom
    
    // Very long line segments for dramatic raindrop effect
    float segmentHeight = 0.5; // Very long raindrop length
    float segmentStart = yPos - segmentHeight;
    float segmentEnd = yPos;
    
    // Check if current UV is within this line segment
    float distToLineX = abs(uv.x - xPos);
    float lineWidth = 0.002; // Very thin lines
    
    bool withinX = distToLineX < lineWidth;
    bool withinY = uv.y >= segmentStart && uv.y <= segmentEnd;
    
    if(withinX && withinY) {
      // Fade at the edges of the segment
      float fadeTop = smoothstep(segmentEnd - 0.02, segmentEnd, uv.y);
      float fadeBottom = smoothstep(segmentStart, segmentStart + 0.02, uv.y);
      pattern += fadeTop * fadeBottom;
    }
  }
  
  // Opacity scales with audio loudness (0.5 → 1.0)
  float opacityBase = 0.5;
  float opacityRange = 0.5;
  float targetOpacity = opacityBase + audioLoudness * opacityRange;
  targetOpacity = min(1.0, max(0.3, targetOpacity * uIntensity));
  
  pattern = min(pattern, 1.0);
  vec3 col = uColor * pattern;
  gl_FragColor = vec4(col, pattern * targetOpacity);
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
    
    // Apply musicReact multiplier like the actual mode
    const energy = (music?.energy ?? 0) * params.musicReact;
    const rms = (music?.rms ?? 0) * params.musicReact;
    const beat = (music?.onset ?? false) ? 1.0 : 0.0;
    
    // Smooth audio values with lerp (matching actual mode)
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
 * Lines1D visual mode for preview
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
  uv *= 0.1; // Scale down UV to make patterns larger
  float t = uTime;
  
  // Make music reactivity much more dramatic
  float musicBoost = uEnergy * 3.0; // Triple the music energy effect
  float musicPulse = sin(t * 4.0 + uEnergy * 10.0) * musicBoost; // Faster, more dramatic pulsing
  
  float ang = 1.5708 * (0.25 + 0.75*fract(t*0.07 + uMotion*0.4 + musicPulse*0.5));
  float f = angleField(uv*1.2, ang);
  f = min(f, angleField(uv*1.2 + vec2(0.17,0.11)*sin(t*0.3+uMotion + musicPulse), ang+1.047));
  f = min(f, angleField(uv*1.2 + vec2(-0.2,0.07)*cos(t*0.23 + musicPulse*0.8), ang+2.094));
  
  // Make thickness much more reactive to music with sharper edges
  float thickness = mix(0.05, 0.35, clamp(uEnergy*2.0 + musicBoost*0.5 + 0.2, 0.0, 1.0));
  float line = 1.0 - smoothstep(thickness*0.8, thickness, f); // Sharper line edges
  
  vec3 base = vec3(0.0); // Make base transparent
  // Use RGB color directly
  vec3 accent = uColor;
  
  // Make color intensity much more reactive to music
  float musicIntensity = uIntensity * (1.0 + musicBoost * 2.0); // Music can double the intensity
  vec3 col = mix(base, accent, line * musicIntensity);
  
  // Make alpha much more reactive to music
  float musicAlpha = line * uIntensity * (0.4 + musicBoost * 0.8); // Music can significantly increase alpha
  
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
  float dist = distance(uv, center);
  
  // Amplify energy for stronger reactivity (like other modes)
  float energyBoost = u_energy * 15.0;
  
  // Audio modulation - energy affects both amplitude and frequency
  float audioMod = 1.0 + energyBoost * 0.5;
  float amplitude = 0.02 * (1.0 + energyBoost * 2.0);
  
  // Create water ripple effect with pulsing
  float ripple1 = sin(dist * 20.0 * audioMod - u_time * u_speed * 2.0) * amplitude;
  float ripple2 = sin(dist * 35.0 * audioMod - u_time * u_speed * 1.5) * amplitude * 0.75;
  float ripple3 = sin(dist * 50.0 * audioMod - u_time * u_speed * 1.2) * amplitude * 0.5;
  
  // Add energy-driven pulse from center
  float pulse = sin(dist * 10.0 - u_time * u_speed * 3.0 + energyBoost) * amplitude * energyBoost * 0.5;
  
  float totalRipple = (ripple1 + ripple2 + ripple3 + pulse) * u_intensity;
  
  // Mix colors based on ripple - stronger contrast with energy
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
    
    // Use music energy like other modes - multiply by musicReact for sensitivity
    const energy = (music?.energy ?? 0) * params.musicReact;
    material.uniforms.u_energy.value = energy;
    
    // Update colors
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
  
  // Audio modulation - energy affects wave strength and speed
  float waveStrength = 0.02 * (1.0 + energyBoost * 3.0);
  float speedMod = 1.0 + energyBoost * 0.5;
  
  // Create heat wave effect - vertical waves rising
  float heat1 = sin(uv.x * 15.0 + u_time * u_speed * 3.0 * speedMod) * waveStrength;
  float heat2 = sin(uv.x * 25.0 + u_time * u_speed * 2.0 * speedMod) * waveStrength * 0.75;
  float heat3 = sin(uv.y * 10.0 + u_time * u_speed * 1.5 * speedMod) * waveStrength * 0.5;
  
  // Add energy-driven shimmer
  float shimmer = sin(uv.x * 40.0 + u_time * u_speed * 5.0) * energyBoost * 0.01;
  
  // Vertical movement with energy
  float verticalPulse = sin(uv.y * 8.0 - u_time * u_speed * 2.0 + energyBoost) * waveStrength * energyBoost * 0.3;
  
  float totalHeat = (heat1 + heat2 + heat3 + shimmer + verticalPulse) * u_intensity;
  
  // Mix colors based on heat distortion - stronger with energy
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
    
    // Use music energy like other modes
    const energy = (music?.energy ?? 0) * params.musicReact;
    material.uniforms.u_energy.value = energy;
    
    // Update colors
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
  
  // Audio modulation - energy affects flow intensity
  float flowIntensity = 1.0 + energyBoost * 2.0;
  float amplitude = 0.02 * flowIntensity;
  
  // Create flowing distortion patterns
  float flow1 = sin(uv.x * 12.0 + uv.y * 8.0 + u_time * u_speed * 2.5) * amplitude;
  float flow2 = sin(uv.x * 18.0 - uv.y * 12.0 + u_time * u_speed * 1.8) * amplitude * 0.75;
  
  // Circular flow with energy
  float angle = atan(uv.y - center.y, uv.x - center.x);
  float radius = distance(uv, center);
  float circularFlow = sin(angle * 8.0 + radius * 20.0 + u_time * u_speed * 2.0) * amplitude * 0.5;
  
  // Energy-driven swirl
  float swirl = sin(angle * 4.0 + u_time * u_speed * 3.0 + energyBoost) * amplitude * energyBoost * 0.4;
  
  // Organic noise-like patterns
  float organic = sin(uv.x * 20.0 + sin(uv.y * 15.0 + u_time * u_speed)) * amplitude * 0.3;
  
  float totalFlow = (flow1 + flow2 + circularFlow + swirl + organic) * u_intensity;
  
  // Mix colors based on flow - stronger contrast with energy
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
    
    // Use music energy like other modes
    const energy = (music?.energy ?? 0) * params.musicReact;
    material.uniforms.u_energy.value = energy;
    
    // Update colors
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
  
  // Amplify energy but keep it gentler than other modes
  float energyBoost = u_energy * 12.0;
  
  // Audio modulation - subtle but noticeable
  float waveAmp = 0.015 * (1.0 + energyBoost * 1.5);
  
  // Create gentle wave effect
  float wave1 = sin(uv.x * 8.0 + u_time * u_speed * 1.5) * waveAmp;
  float wave2 = sin(uv.y * 6.0 + u_time * u_speed * 1.2) * waveAmp * 0.8;
  float wave3 = sin((uv.x + uv.y) * 10.0 + u_time * u_speed * 1.8) * waveAmp * 0.5;
  
  // Gentle pulse with energy
  float pulse = sin(uv.x * 4.0 + uv.y * 4.0 - u_time * u_speed * 2.0 + energyBoost * 0.5) * waveAmp * energyBoost * 0.3;
  
  // Soft diagonal waves
  float diagonal = sin((uv.x - uv.y) * 12.0 + u_time * u_speed * 2.2) * waveAmp * 0.4;
  
  float totalWave = (wave1 + wave2 + wave3 + pulse + diagonal) * u_intensity;
  
  // Mix colors based on wave - gentle but responsive
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
    
    // Use music energy like other modes
    const energy = (music?.energy ?? 0) * params.musicReact;
    material.uniforms.u_energy.value = energy;
    
    // Update colors
    const rgb = hexToRGB(userColors.assetColor);
    material.uniforms.u_assetColor.value.set(rgb.r, rgb.g, rgb.b);
    const bgRgb = hexToRGB(userColors.bgColor);
    material.uniforms.u_bgColor.value.set(bgRgb.r, bgRgb.g, bgRgb.b);
  });

  return <mesh geometry={geom} material={material} position={[0, 0, -1]} />;
}

/**
>>>>>>> Stashed changes
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
          orthographic
          camera={{ 
            zoom: 0.1, 
            position: [0, 0, 5] 
          }}
          dpr={[1, 2]}
          gl={{ 
            alpha: true, 
            antialias: true,
            preserveDrawingBuffer: true
          }}
        >
          {/* Background color matches main UI exactly */}
          <color attach="background" args={[userColors.bgColor]} />
          
          {/* Render the full ChoreoXplore system just like the main canvas */}
          <ChoreoXploreSystem />
          
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
