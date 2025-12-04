import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useVisStore } from '../state/useVisStore';
import useStore, { hexToRGB } from '../core/store';

const frag = `
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
  float energyPulse = uEnergy * 0.5; // Energy-based pulsing (increased from 0.3)
  float beatPulse = uBeat * 0.35;     // Beat-based pulsing (increased from 0.2)
  float rmsPulse = uRms * 0.4;      // RMS-based pulsing (increased from 0.25)
  
  // Audio-reactive pulsation based on loudness
  float audioThreshold = 0.01; // Minimum audio level to consider "music playing"
  float isMusicPlaying = step(audioThreshold, uEnergy + uRms + uBeat);
  
  // Pulsation directly proportional to audio loudness
  float audioLoudness = uEnergy + uRms + uBeat; // Combined audio level
  float pulsationSize = audioLoudness * 0.7; // Scale pulsation to audio level (increased from 0.4)
  
  // Combine base radius with audio-reactive pulsation
  float radius = baseRadius + pulsationSize;
  
  // Create smooth circle edge with falloff
  float circle = 1.0 - smoothstep(radius - 0.05, radius, dist);
  
  // Add inner glow effect
  float innerGlow = 1.0 - smoothstep(radius * 0.3, radius * 0.7, dist);
  innerGlow *= 0.3;
  
  // Add outer glow based on audio intensity
  float outerGlow = 1.0 - smoothstep(radius, radius + 0.15 + pulsationSize * 1.2, dist);
  outerGlow *= 0.3 * uIntensity;
  
  // Combine all effects
  float pattern = circle + innerGlow + outerGlow;
  
  // Add wave distortion based on audio (only when music is playing)
  float waveDistortion = sin(dist * 20.0 + t * 3.0) * 0.02 * uEnergy * isMusicPlaying;
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
  
  // Add brightness based on audio intensity (increased multipliers)
  float brightness = 1.0 + uEnergy * 0.8 + uBeat * 0.5 + uRms * 0.6;
  col *= brightness;
  
  // Reduce visibility when no music is playing
  float visibility = mix(0.3, 1.0, isMusicPlaying);
  col *= visibility;
  
  gl_FragColor = vec4(col, pattern * uIntensity);
}
`;

const vert = `
varying vec2 vUv;
void main(){ 
  vUv = uv; 
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); 
}
`;

export default function PulsatingCircleMode() {
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      fragmentShader: frag,
      vertexShader: vert,
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
  
  const geom = useMemo(() => new THREE.PlaneGeometry(25000, 13000, 1, 1), []);

  const music = useVisStore(s => s.music);
  const motion = useVisStore(s => s.motion);
  const params = useVisStore(s => s.params);
  const userColors = useStore(s => s.userColors);

  useFrame((_, dt) => {
    material.uniforms.uTime.value += dt * (0.6 + params.speed);
    const rgb = hexToRGB(userColors.assetColor);
    material.uniforms.uColor.value.set(rgb.r, rgb.g, rgb.b);
    material.uniforms.uIntensity.value = params.intensity;

    const energy = (music?.energy ?? 0) * params.musicReact;
    const sharp = (motion?.sharpness ?? 0) * params.motionReact;
    const rms = music?.rms ?? 0;
    
    // Calculate beat detection (simple onset detection)
    const beatThreshold = 0.15;
    const beat = (music?.onset ?? false) ? 1.0 : 0.0;

    // Debug logging
    if (Math.random() < 0.01) { // Log occasionally to avoid spam
      console.log('🎵 Pulsating Circle - Energy:', energy, 'RMS:', rms, 'Beat:', beat);
    }

    // Smooth audio reactivity
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

  return <mesh geometry={geom} material={material} position={[0, 0, 2]} />;
}
