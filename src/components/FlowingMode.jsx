import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useVisStore } from '../state/useVisStore';
import useStore, { hexToRGB } from '../core/store';
import { audio$ } from '../core/audio';

const FlowingMode = () => {
  const meshRef = useRef();
  const params = useVisStore(s => s.params);
  const music = useVisStore(s => s.music);
  const userColors = useStore(s => s.userColors);
  const audioDataRef = useRef({ rms: 0, bands: [0, 0, 0] });
  
  // Subscribe to audio
  React.useEffect(() => {
    const subscription = audio$.subscribe((audioData) => {
      audioDataRef.current = audioData;
    });
    return () => subscription.unsubscribe();
  }, []);
  
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
        u_musicReact: { value: params.musicReact || 0.9 },
        u_audio_bass: { value: 0.0 },
        u_audio_mid: { value: 0.0 },
        u_audio_high: { value: 0.0 },
        u_audio_rms: { value: 0.0 }
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
        uniform float u_musicReact;
        uniform float u_audio_bass;
        uniform float u_audio_mid;
        uniform float u_audio_high;
        uniform float u_audio_rms;
        varying vec2 vUv;
        
        void main() {
          vec2 uv = vUv;
          vec2 center = vec2(0.5, 0.5);
          
          // Audio modulation
          float audioFlow = 1.0 + (u_audio_bass * 2.0 + u_audio_mid * 1.5 + u_audio_high) * u_musicReact;
          
          // Create flowing distortion patterns
          float flow1 = sin(uv.x * 12.0 + uv.y * 8.0 + u_time * u_speed * 2.5 * audioFlow) * 0.02;
          float flow2 = sin(uv.x * 18.0 - uv.y * 12.0 + u_time * u_speed * 1.8 * audioFlow) * 0.015;
          
          // Circular flow
          float angle = atan(uv.y - center.y, uv.x - center.x);
          float radius = distance(uv, center);
          float circularFlow = sin(angle * 8.0 + radius * 20.0 + u_time * u_speed * 2.0) * 0.01;
          
          // Audio reactive swirl
          float audioSwirl = sin(angle * 4.0 + u_audio_rms * 10.0) * u_musicReact * 0.01;
          
          float totalFlow = (flow1 + flow2 + circularFlow + audioSwirl) * u_intensity;
          
          // Mix colors based on flow
          vec3 color = mix(u_bgColor, u_assetColor, abs(totalFlow) * 18.0);
          
          gl_FragColor = vec4(color, 1.0);
        }
      `,
      transparent: false,
      side: THREE.DoubleSide
    });
  }, [bgColor, assetColor]);
  
  useFrame((state) => {
    if (meshRef.current && shaderMaterial) {
      shaderMaterial.uniforms.u_time.value = state.clock.elapsedTime;
      shaderMaterial.uniforms.u_intensity.value = params.intensity || 0.8;
      shaderMaterial.uniforms.u_speed.value = params.speed || 1.0;
      shaderMaterial.uniforms.u_musicReact.value = params.musicReact || 0.9;
      
      // Update audio data
      const audioData = audioDataRef.current;
      shaderMaterial.uniforms.u_audio_bass.value = audioData.bands[0] || 0;
      shaderMaterial.uniforms.u_audio_mid.value = audioData.bands[1] || 0;
      shaderMaterial.uniforms.u_audio_high.value = audioData.bands[2] || 0;
      shaderMaterial.uniforms.u_audio_rms.value = audioData.rms || 0;
    }
  });
  
  return (
    <mesh ref={meshRef} position={[0, 0, 1]}>
      <planeGeometry args={[20000, 10000]} />
      <primitive object={shaderMaterial} />
    </mesh>
  );
};

export default FlowingMode;
