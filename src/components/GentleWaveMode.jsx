import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useVisStore } from '../state/useVisStore';
import useStore, { hexToRGB } from '../core/store';

const GentleWaveMode = () => {
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
          
          gl_FragColor = vec4(color, colorMix * u_intensity);
        }
      `,
      transparent: true,
      depthWrite: false,
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
    <mesh ref={meshRef} position={[0, 0, -5]} renderOrder={-10}>
      <planeGeometry args={[20000, 10000]} />
      <primitive object={shaderMaterial} />
    </mesh>
  );
};

export default GentleWaveMode;
