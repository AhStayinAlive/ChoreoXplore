import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useVisStore } from '../state/useVisStore';
import useStore, { hexToRGB } from '../core/store';

const FlowingMode = () => {
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

export default FlowingMode;
