import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useVisStore } from '../state/useVisStore';
import useStore, { hexToRGB } from '../core/store';

const WaterRippleMode = () => {
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
      
      // Use music energy like other modes - multiply by musicReact for sensitivity
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

export default WaterRippleMode;
