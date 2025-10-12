import React, { useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useVisStore } from "../state/useVisStore";

const frag = `
uniform float uTime;
uniform float uHue;
uniform float uIntensity;
uniform float uEnergy;
uniform float uMotion;
varying vec2 vUv;

// Noise helpers
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i+vec2(1.0,0.0));
  float c = hash(i+vec2(0.0,1.0));
  float d = hash(i+vec2(1.0,1.0));
  vec2 u = f*f*(3.0-2.0*f);
  return mix(a,b,u.x) + (c-a)*u.y*(1.0-u.x) + (d-b)*u.x*u.y;
}

float fbm(vec2 p){
  float f=0.0;
  f+=0.5*noise(p);
  f+=0.25*noise(p*2.0);
  f+=0.125*noise(p*4.0);
  f+=0.0625*noise(p*8.0);
  return f;
}

vec3 hueToRgb(float h){
  vec3 c = vec3(
    abs(h*6.0-3.0)-1.0,
    2.0-abs(h*6.0-2.0),
    2.0-abs(h*6.0-4.0)
  );
  return clamp(c,0.0,1.0);
}

void main(){
  vec2 uv = vUv*2.0 - 1.0;
  uv.x *= 1.6;
  float t = uTime * 0.12;

  vec3 finalColor = vec3(0.0);
  float depthFog = 0.0; // Accumulated fog density

  // Simulated volumetric layers (front to back)
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    float depth = fi / 5.0;
    float layerOffset = fi * 37.9;
    float hueShift = (uHue / 360.0) + 0.1 * depth;
    vec3 fogColor = hueToRgb(fract(hueShift));

    // Position drift per depth (parallax)
    vec2 p = uv * mix(1.0, 3.0, depth)
      + vec2(
        sin(t * (0.3 + depth) + layerOffset),
        cos(t * (0.25 + depth * 0.2) - layerOffset)
      ) * (0.3 + depth * 0.5);

    // Noise-based density (thicker near mid-depth)
    float n = fbm(p * (2.0 + depth * 2.5) + vec2(0.0, t * 0.5));
    float d = pow(n, 2.0) * (1.2 - depth * 0.8);
    d *= 1.0 + uEnergy * 1.5;
    d *= 1.0 + uMotion * 0.4 * sin(t + layerOffset);

    // Exponential fog accumulation (volumetric illusion)
    float scatter = exp(-depthFog * 1.2);
    finalColor += fogColor * d * scatter;
    depthFog += d * 0.5;
  }

  // Apply lighting curve
  finalColor = pow(finalColor, vec3(1.0 / 1.3));
  finalColor *= uIntensity * (1.5 + uEnergy);

  float vignette = smoothstep(1.6, 0.2, length(uv));
  finalColor *= vignette;

  gl_FragColor = vec4(finalColor, clamp(length(finalColor), 0.0, 1.0));
}
`;

const vert = `
varying vec2 vUv;
void main(){
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export default function NebulaMode(){
  const material = useMemo(() => new THREE.ShaderMaterial({
    fragmentShader: frag,
    vertexShader: vert,
    uniforms: {
      uTime: { value: 0 },
      uHue: { value: 240 },
      uIntensity: { value: 1.0 },
      uEnergy: { value: 0 },
      uMotion: { value: 0 },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }), []);

  const geom = useMemo(() => new THREE.PlaneGeometry(25000, 13000, 1, 1), []);
  const music = useVisStore(s => s.music);
  const motion = useVisStore(s => s.motion);
  const params = useVisStore(s => s.params);

  useFrame((_, dt) => {
    material.uniforms.uTime.value += dt * (1.2 + (params?.speed ?? 0) * 0.8);
    material.uniforms.uHue.value = params?.hue ?? material.uniforms.uHue.value;
    material.uniforms.uIntensity.value = params?.intensity ?? material.uniforms.uIntensity.value;

    const energy = (music?.energy ?? 0) * (params?.musicReact ?? 1);
    const sharp = (motion?.sharpness ?? 0) * (params?.motionReact ?? 1);

    material.uniforms.uEnergy.value = THREE.MathUtils.lerp(material.uniforms.uEnergy.value, energy, 0.25);
    material.uniforms.uMotion.value = THREE.MathUtils.lerp(material.uniforms.uMotion.value, sharp, 0.2);
  });

  return <mesh geometry={geom} material={material} position={[0,0,2]} />;
}
