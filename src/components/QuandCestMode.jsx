import React from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useMemo } from 'react';
import { useVisStore } from '../state/useVisStore';

const frag = `
uniform float uTime;
uniform float uHue;
uniform float uEnergy;
uniform float uMotion;
uniform float uIntensity;
varying vec2 vUv;

void main() {
  vec2 uv = vUv;
  float t = uTime;
  
  float pattern = 0.0;
  
  // Create outer rectangle lines that are always visible (very thin)
  // Top edge
  if(uv.y > 0.98) pattern = 1.0;
  // Right edge
  if(uv.x > 0.98) pattern = 1.0;
  // Left edge
  if(uv.x < 0.02) pattern = 1.0;
  
  // Create organic diagonal lines extending from edges toward center when music plays
  float energyBoost = uEnergy * 15.0; // Increased amplification for better visibility
  
  // Always show some lines for testing, but make them longer with music
  float baseLength = 0.08; // Reduced from 0.1 to 0.08 for slightly shorter lines
  float musicLength = energyBoost * 0.25; // Back to 0.25 for balanced music responsiveness
  float totalLength = baseLength + musicLength;
  
  if(totalLength > 0.05) { // Lowered threshold
    // Lines from top edge going diagonally down with waves and pointed ends
    for(int i = 0; i < 4; i++) {
      float x = 0.15 + float(i) * 0.23; // Distribute lines across top edge
      float angle = -0.3 + float(i) * 0.2; // Different diagonal angles
      
      // Calculate distance from line with wave distortion
      float distFromTop = uv.y - 0.98;
      float waveOffset = sin(distFromTop * 8.0 + t * 2.0 + float(i)) * 0.02 * energyBoost;
      float expectedX = x + distFromTop * tan(angle) + waveOffset;
      float distToLine = abs(uv.x - expectedX);
      
      // Line extends from top edge toward center with pointed end (max length to middle)
      float lineLength = totalLength; // Use total length (base + music)
      float taperFactor = 1.0 - (abs(distFromTop) / lineLength); // Taper from 1 to 0
      float lineWidth = 0.006 * taperFactor; // Slightly thicker for better visibility
      
      if(distToLine < lineWidth && distFromTop > -lineLength && distFromTop < 0.004) {
        pattern = 1.0;
      }
    }
    
    // Lines from left edge going diagonally right with waves and pointed ends
    for(int i = 0; i < 4; i++) {
      float y = 0.15 + float(i) * 0.23;
      float angle = 0.2 + float(i) * 0.15; // Different diagonal angles
      
      float distFromLeft = uv.x - 0.02;
      float waveOffset = sin(distFromLeft * 8.0 + t * 2.0 + float(i)) * 0.02 * energyBoost;
      float expectedY = y + distFromLeft * tan(angle) + waveOffset;
      float distToLine = abs(uv.y - expectedY);
      
      float lineLength = totalLength; // Use total length (base + music)
      float taperFactor = 1.0 - (abs(distFromLeft) / lineLength); // Taper from 1 to 0
      float lineWidth = 0.006 * taperFactor; // Slightly thicker for better visibility
      
      if(distToLine < lineWidth && distFromLeft < lineLength && distFromLeft > -0.004) {
        pattern = 1.0;
      }
    }
    
    // Lines from right edge going diagonally left with waves and pointed ends
    for(int i = 0; i < 4; i++) {
      float y = 0.15 + float(i) * 0.23;
      float angle = -0.2 - float(i) * 0.15; // Different diagonal angles
      
      float distFromRight = uv.x - 0.98;
      float waveOffset = sin(distFromRight * 8.0 + t * 2.0 + float(i)) * 0.02 * energyBoost;
      float expectedY = y + distFromRight * tan(angle) + waveOffset;
      float distToLine = abs(uv.y - expectedY);
      
      float lineLength = totalLength; // Use total length (base + music)
      float taperFactor = 1.0 - (abs(distFromRight) / lineLength); // Taper from 1 to 0
      float lineWidth = 0.006 * taperFactor; // Slightly thicker for better visibility
      
      if(distToLine < lineWidth && distFromRight > -lineLength && distFromRight < 0.004) {
        pattern = 1.0;
      }
    }
  }
  
  // Color based on hue
  float h = uHue / 360.0;
  vec3 accent = clamp(vec3(
    abs(h * 6.0 - 3.0) - 1.0, 
    2.0 - abs(h * 6.0 - 2.0), 
    2.0 - abs(h * 6.0 - 4.0)
  ), 0.0, 1.0);
  
  vec3 col = accent * pattern * uIntensity;
  
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

export default function QuandCestMode() {
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

    // Debug logging
    if (Math.random() < 0.01) { // Log occasionally to avoid spam
      console.log('🎵 Music energy:', energy, 'Music React:', params.musicReact, 'Raw energy:', music?.energy);
    }

    material.uniforms.uEnergy.value = THREE.MathUtils.lerp(
      material.uniforms.uEnergy.value, energy, 0.2
    );
    material.uniforms.uMotion.value = THREE.MathUtils.lerp(
      material.uniforms.uMotion.value, sharp, 0.15
    );
  });

  return <mesh geometry={geom} material={material} position={[0, 0, 2]} />;
}
