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
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  vec2 uv = vUv;
  float t = uTime;
  
  // Create sphere-like pattern using UV coordinates
  vec2 center = vec2(0.5, 0.5);
  float dist = distance(uv, center);
  
  // Base radius with audio-reactive pulsing
  float baseRadius = 0.2;
  float energyPulse = uEnergy * 0.4; // Energy-based pulsing
  float beatPulse = uBeat * 0.3;     // Beat-based pulsing
  float rmsPulse = uRms * 0.35;      // RMS-based pulsing
  
  // Audio-reactive pulsation based on loudness
  float audioThreshold = 0.01; // Minimum audio level to consider "music playing"
  float isMusicPlaying = step(audioThreshold, uEnergy + uRms + uBeat);
  
  // Pulsation directly proportional to audio loudness
  float audioLoudness = uEnergy + uRms + uBeat; // Combined audio level
  float pulsationSize = audioLoudness * 0.5; // Scale pulsation to audio level (slightly larger for sphere)
  
  // Combine base radius with audio-reactive pulsation
  float radius = baseRadius + pulsationSize;
  
  // Create sphere with smooth edges
  float sphere = 1.0 - smoothstep(radius - 0.08, radius, dist);
  
  // Add inner glow
  float innerGlow = 1.0 - smoothstep(radius * 0.2, radius * 0.6, dist);
  innerGlow *= 0.4;
  
  // Add outer glow
  float outerGlow = 1.0 - smoothstep(radius, radius + 0.15 + pulsationSize * 0.6, dist);
  outerGlow *= 0.3 * uIntensity;
  
  // Add wave distortion based on audio (only when music is playing)
  float waveDistortion = sin(dist * 15.0 + t * 2.5) * 0.015 * uEnergy * isMusicPlaying;
  sphere += waveDistortion;
  
  // Add ripple effects from beats (only when music is playing)
  float ripple = sin(dist * 25.0 - t * 8.0) * 0.01 * uBeat * isMusicPlaying;
  sphere += ripple;
  
  // Combine all effects
  float pattern = sphere + innerGlow + outerGlow;
  
  // Color based on hue and audio intensity
  float h = uHue / 360.0;
  vec3 accent = clamp(vec3(
    abs(h * 6.0 - 3.0) - 1.0, 
    2.0 - abs(h * 6.0 - 2.0), 
    2.0 - abs(h * 6.0 - 4.0)
  ), 0.0, 1.0);
  
  // Add dynamic color variation (only when music is playing)
  vec3 colorVariation = vec3(
    sin(t + uEnergy * 3.0) * 0.3 * isMusicPlaying,
    cos(t + uBeat * 2.0) * 0.3 * isMusicPlaying,
    sin(t * 1.2 + uRms * 3.5) * 0.3 * isMusicPlaying
  );
  
  vec3 finalColor = accent + colorVariation;
  vec3 col = finalColor * pattern * uIntensity;
  
  // Add brightness based on audio intensity
  float brightness = 1.0 + uEnergy * 0.7 + uBeat * 0.5 + uRms * 0.6;
  col *= brightness;
  
  // Add some depth using normal
  float depth = dot(vNormal, vec3(0.0, 0.0, 1.0)) * 0.2 + 0.8;
  col *= depth;
  
  // Reduce visibility when no music is playing
  float visibility = mix(0.3, 1.0, isMusicPlaying);
  col *= visibility;
  
  gl_FragColor = vec4(col, pattern * uIntensity);
}
`;

const vert = `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

void main(){ 
  vUv = uv; 
  vNormal = normal;
  vPosition = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); 
}
`;

export default function PulsatingSphereMode() {
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
  
  const geom = useMemo(() => new THREE.SphereGeometry(8000, 64, 64), []);

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
    
    // Calculate beat detection
    const beat = (music?.onset ?? false) ? 1.0 : 0.0;

    // Debug logging
    if (Math.random() < 0.01) { // Log occasionally to avoid spam
      console.log('🎵 Pulsating Sphere - Energy:', energy, 'RMS:', rms, 'Beat:', beat);
    }

    // Smooth audio reactivity
    material.uniforms.uEnergy.value = THREE.MathUtils.lerp(
      material.uniforms.uEnergy.value, energy, 0.4
    );
    material.uniforms.uMotion.value = THREE.MathUtils.lerp(
      material.uniforms.uMotion.value, sharp, 0.25
    );
    material.uniforms.uRms.value = THREE.MathUtils.lerp(
      material.uniforms.uRms.value, rms, 0.5
    );
    material.uniforms.uBeat.value = THREE.MathUtils.lerp(
      material.uniforms.uBeat.value, beat, 0.7
    );
  });

  return <mesh geometry={geom} material={material} position={[0, 0, 0]} />;
}
