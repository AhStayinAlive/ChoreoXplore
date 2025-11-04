import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useVisStore } from '../state/useVisStore';
import useStore, { hexToRGB } from '../core/store';

const HeatWaveMode = () => {
  const meshRef = useRef();
  const params = useVisStore(s => s.params);
  const music = useVisStore(s => s.music);
  const userColors = useStore(s => s.userColors);
  
  const bgColor = useMemo(() => hexToRGB(userColors.bgColor), [userColors.bgColor]);
  const assetColor = useMemo(() => hexToRGB(userColors.assetColor), [userColors.assetColor]);
  
  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        u_time: { value: 0 },
        u_bgColor: { value: new THREE.Vector3(bgColor.r, bgColor.g, bgColor.b) },
        u_assetColor: { value: new THREE.Vector3(assetColor.r, assetColor.g, assetColor.b) },
        u_intensity: { value: params.intensity || 0.8 },
        u_speed: { value: params.speed || 1.0 },
        u_energy: { value: 0.0 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
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
      `,
      transparent: false,
      side: THREE.DoubleSide
    });
  }, [bgColor, assetColor]);
  
  useFrame((state, dt) => {
    if (meshRef.current && shaderMaterial) {
      shaderMaterial.uniforms.u_time.value += dt * (0.6 + params.speed);
      shaderMaterial.uniforms.u_intensity.value = params.intensity || 0.8;
      shaderMaterial.uniforms.u_speed.value = params.speed || 1.0;
      
      // Use music energy like other modes
      const energy = (music?.energy ?? 0) * params.musicReact;
      shaderMaterial.uniforms.u_energy.value = energy;
      
      // Update colors
      const rgb = hexToRGB(userColors.assetColor);
      shaderMaterial.uniforms.u_assetColor.value.set(rgb.r, rgb.g, rgb.b);
      const bgRgb = hexToRGB(userColors.bgColor);
      shaderMaterial.uniforms.u_bgColor.value.set(bgRgb.r, bgRgb.g, bgRgb.b);
    }
  });
  
  return (
    <mesh ref={meshRef} position={[0, 0, 1]}>
      <planeGeometry args={[20000, 10000]} />
      <primitive object={shaderMaterial} />
    </mesh>
  );
};

export default HeatWaveMode;
