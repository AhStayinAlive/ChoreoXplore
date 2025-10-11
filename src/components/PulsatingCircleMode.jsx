import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useVisStore } from '../state/useVisStore';

const frag = `
uniform float uTime;
uniform float uHue;
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
  
  // Color based on hue and audio intensity
  float h = uHue / 360.0;
  vec3 accent = clamp(vec3(
    abs(h * 6.0 - 3.0) - 1.0, 
    2.0 - abs(h * 6.0 - 2.0), 
    2.0 - abs(h * 6.0 - 4.0)
  ), 0.0, 1.0);
  
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
        uHue: { value: 210 },
        uEnergy: { value: 0 },
        uMotion: { value: 0 },
        uIntensity: { value: 0.8 },
        uBeat: { value: 0 },
        uRms: { value: 0 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  }, []);
  
  const geom = useMemo(() => new THREE.PlaneGeometry(25000, 13000, 1, 1), []);

  const music = useVisStore(s => s.music);
  const motion = useVisStore(s => s.motion);
  const params = useVisStore(s => s.params);

  useFrame((_, dt) => {
    material.uniforms.uTime.value += dt * (0.6 + params.speed);
    material.uniforms.uHue.value = params.hue;
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
