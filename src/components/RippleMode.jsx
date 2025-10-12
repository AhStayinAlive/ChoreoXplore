import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useVisStore } from '../state/useVisStore';

const frag = `
uniform float uTime;
uniform float uHue;
uniform float uIntensity;
uniform float uDrops[60]; // 20 drops * (x, y, startTime)
varying vec2 vUv;

// Ripple for each raindrop
float ripple(vec2 uv, vec2 center, float age, float speed, float freq, float fade) {
  if (age < 0.0) return 0.0;
  float dist = distance(uv, center);
  float wave = sin((dist - age * speed) * freq);
  float ring = smoothstep(0.035, 0.0, abs(wave)) * exp(-dist * fade);
  float life = 1.0 - smoothstep(0.2, 0.7, dist + age * 0.3);
  return ring * life;
}

void main() {
  vec2 uv = vUv * 2.0 - 1.0;
  float t = uTime;
  float pattern = 0.0;

  float speed = 0.28; // slower spread
  float fade = 3.0;
  float freq = 14.0;

  // Sum up active raindrop ripples
  for (int i = 0; i < 20; i++) {
    vec2 center = vec2(uDrops[i*3], uDrops[i*3+1]);
    float startTime = uDrops[i*3+2];
    float age = t - startTime;
    if (age < 0.0 || age > 3.0) continue;
    pattern += ripple(uv, center, age, speed, freq, fade);
  }

  // Convert hue to RGB
  float h = uHue / 360.0;
  vec3 accent = clamp(vec3(
    abs(h * 6.0 - 3.0) - 1.0, 
    2.0 - abs(h * 6.0 - 2.0), 
    2.0 - abs(h * 6.0 - 4.0)
  ), 0.0, 1.0);

  // Final color and alpha
  vec3 col = accent * pattern * uIntensity;
  float alpha = clamp(pattern * (0.3 + uIntensity * 0.8), 0.0, 1.0);

  gl_FragColor = vec4(col, alpha);
}
`;

const vert = `
varying vec2 vUv;
void main(){ 
  vUv = uv; 
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); 
}
`;

export default function RainRippleMode() {
  const material = useMemo(() => new THREE.ShaderMaterial({
    fragmentShader: frag,
    vertexShader: vert,
    uniforms: {
      uTime: { value: 0 },
      uHue: { value: 210 },
      uIntensity: { value: 0.8 },
      uDrops: { value: new Float32Array(60) }, // 20 * 3
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }), []);

  const drops = useRef([]);
  const geom = useMemo(() => new THREE.PlaneGeometry(25000, 13000, 1, 1), []);
  const music = useVisStore(s => s.music);
  const params = useVisStore(s => s.params);
  const dropTimer = useRef(0);

  useFrame((_, dt) => {
    const t = material.uniforms.uTime.value + dt * (0.5 + params.speed * 0.5);
    material.uniforms.uTime.value = t;
    material.uniforms.uHue.value = params.hue;
    material.uniforms.uIntensity.value = params.intensity;

    const energy = (music?.energy ?? 0);
    const beat = (music?.onset ?? false);

    // Rain frequency increases with music
    dropTimer.current -= dt;
    const dropInterval = Math.max(0.08 - energy * 0.05, 0.02); // faster with energy
    if (dropTimer.current <= 0.0 || beat) {
      dropTimer.current = dropInterval;
      const x = Math.random() * 2.0 - 1.0;
      const y = Math.random() * 2.0 - 1.0;
      drops.current.push([x, y, t]);
      if (drops.current.length > 20) drops.current.shift();
    }

    // Update shader uniform
    const arr = material.uniforms.uDrops.value;
    arr.fill(0);
    for (let i = 0; i < drops.current.length; i++) {
      const d = drops.current[i];
      arr[i * 3] = d[0];
      arr[i * 3 + 1] = d[1];
      arr[i * 3 + 2] = d[2];
    }
  });

  return <mesh geometry={geom} material={material} position={[0, 0, 2]} />;
}
