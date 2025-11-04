import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useVisStore } from '../state/useVisStore';
import useStore, { hexToRGB } from '../core/store';
import { audio$ } from '../core/audio';

const GentleWaveMode = () => {
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
          
          // Audio modulation - subtle response
          float audioWave = 1.0 + (u_audio_bass * 0.5 + u_audio_mid * 0.3 + u_audio_high * 0.2) * u_musicReact;
          
          // Create gentle wave effect
          float wave1 = sin(uv.x * 8.0 + u_time * u_speed * 1.5) * 0.015 * audioWave;
          float wave2 = sin(uv.y * 6.0 + u_time * u_speed * 1.2) * 0.012 * audioWave;
          float wave3 = sin((uv.x + uv.y) * 10.0 + u_time * u_speed * 1.8) * 0.008;
          
          // Audio reactive gentle pulse
          float audioPulse = u_audio_rms * u_musicReact * 0.005;
          
          float totalWave = (wave1 + wave2 + wave3 + audioPulse) * u_intensity;
          
          // Mix colors based on wave
          vec3 color = mix(u_bgColor, u_assetColor, abs(totalWave) * 25.0);
          
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

export default GentleWaveMode;
