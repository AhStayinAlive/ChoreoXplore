import React from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useMemo } from 'react';
import { useVisStore } from '../state/useVisStore';
import useStore, { hexToHue } from '../core/store';

const frag = `
uniform float uTime;
uniform float uHue;
uniform float uEnergy;
uniform float uMotion;
uniform float uIntensity;
varying vec2 vUv;

float angleField(vec2 p, float a){
  float s = sin(a), c = cos(a);
  mat2 R = mat2(c,-s,s,c);
  p = R * p;
  vec2 q = abs(fract(p*4.0)-0.5);
  float d1 = abs(q.x - q.y);
  float d2 = min(abs(q.x), abs(q.y));
  return mix(d1, d2, 0.2);
}
void main() {
  vec2 uv = vUv*2.0-1.0;
  float t = uTime;
  float ang = 1.5708 * (0.25 + 0.75*fract(t*0.07 + uMotion*0.4));
  float f = angleField(uv*1.2, ang);
  f = min(f, angleField(uv*1.2 + vec2(0.17,0.11)*sin(t*0.3+uMotion), ang+1.047));
  f = min(f, angleField(uv*1.2 + vec2(-0.2,0.07)*cos(t*0.23), ang+2.094));
  float thickness = mix(0.04, 0.16, clamp(uEnergy*1.4,0.0,1.0));
  float line = smoothstep(thickness, thickness*0.6, f);
  
  // Make the patterns more visible with higher contrast
  float h = uHue/360.0;
  vec3 accent = clamp(vec3(abs(h*6.0-3.0)-1.0, 2.0-abs(h*6.0-2.0), 2.0-abs(h*6.0-4.0)), 0.0, 1.0);
  
  // Increase intensity and add glow effect
  float glow = line * uIntensity * 2.0;
  vec3 col = accent * glow;
  
  // Add some base visibility even without motion/audio
  col += accent * 0.3 * uIntensity;
  
  gl_FragColor = vec4(col, glow * 0.8);
}
`;

const vert = `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
`;

export default function ChoreoXplore() {
  console.log('🎨 ChoreoXplore component rendering');
  
  const material = useMemo(() => {
    console.log('🎨 Creating ChoreoXplore material');
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
      blending: THREE.NormalBlending,
    });
  }, []);
  
  const geom = useMemo(() => new THREE.PlaneGeometry(2, 2, 1, 1), []);

  const music = useVisStore(s => s.music);
  const motion = useVisStore(s => s.motion);
  const params = useVisStore(s => s.params);
  const userColors = useStore(s => s.userColors);

  useFrame((_, dt) => {
    material.uniforms.uTime.value += dt * (0.6 + params.speed);
    material.uniforms.uHue.value = hexToHue(userColors.bgColor);
    material.uniforms.uIntensity.value = params.intensity;

    const energy = (music?.energy ?? 0) * params.musicReact;
    const sharp = (motion?.sharpness ?? 0) * params.motionReact;

    material.uniforms.uEnergy.value = THREE.MathUtils.lerp(
      material.uniforms.uEnergy.value, energy, 0.2
    );
    material.uniforms.uMotion.value = THREE.MathUtils.lerp(
      material.uniforms.uMotion.value, sharp, 0.15
    );
  });

  return <mesh geometry={geom} material={material} position={[0, 0, 1]} />;
}
