import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useVisStore } from '../state/useVisStore';
import useStore from '../core/store';
import { createDefaultUniforms, updatePerf, updatePointer, type CommonUniforms } from './uniforms';
import { useFluid } from '@funtech-inc/use-shader-fx';

// Minimal shader that emulates a "cream"-like flow field response
const frag = `
precision highp float;
uniform vec2 uPointer;
uniform vec2 uPointerVel;
uniform float uBodySpeed;
uniform float uExpand;
uniform float uAccent;
uniform float uMusicReactivity;
uniform float uMotionReactivity;
uniform float uTime;
uniform float uDelta;
uniform sampler2D uFluid;
varying vec2 vUv;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0,0.0));
  float c = hash(i + vec2(0.0,1.0));
  float d = hash(i + vec2(1.0,1.0));
  vec2 u = f*f*(3.0-2.0*f);
  return mix(a,b,u.x) + (c - a)*u.y*(1.0 - u.x) + (d - b)*u.x*u.y;
}

void main(){
  vec2 uv = vUv;
  // Flow origin biased by pointer
  vec2 center = mix(vec2(0.5), uPointer, 0.85);
  vec2 d = uv - center;
  float r = max(1e-3, length(d));
  vec2 dir = normalize(d);

  // Turbulence influenced by pointer velocity and accent
  float turb = noise(uv * 4.0 + uTime * (1.0 + 2.0*length(uPointerVel)))
             + noise(uv * 9.0 + uTime * 0.5);
  turb *= (0.6 + 0.8 * clamp(length(uPointerVel), 0.0, 1.5) + 0.6 * uAccent);

  float widen = 0.4 + 0.8 * uExpand; // widen field with arms
  float speed = 0.2 + 0.9 * uBodySpeed; // speed bias by body speed

  vec2 flow = dir * (widen / (1.0 + 6.0*r)) + (turb - 0.5) * 0.15;
  flow *= mix(1.0, 1.6, uMotionReactivity);

  // Optional: combine with fluid sim texture for creaminess if provided
  vec3 fluid = texture2D(uFluid, uv).rgb;
  float fluidD = fluid.g; // velocity magnitude proxy
  float blend = clamp(0.3 + 0.5*fluidD, 0.3, 0.9);

  vec3 col = mix(vec3(0.96,0.96,0.94), vec3(1.0), 0.2) + vec3(flow.x, flow.y, turb) * 0.25;
  col = mix(col, col * (1.0 + 0.6*speed), blend);
  gl_FragColor = vec4(col, 1.0);
}
`;

const vert = `
varying vec2 vUv;
void main(){
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export default function ShaderStage() {
  const { size, gl } = useThree();
  const [material, setMaterial] = useState<THREE.ShaderMaterial | null>(null);
  const meshRef = useRef<THREE.Mesh>(null!);
  const pointerState = useRef({ p: [0.5, 0.5] as [number, number], v: [0, 0] as [number, number] });
  const uniformsRef = useRef<CommonUniforms>(createDefaultUniforms());
  const perfRef = useRef<{ last: number; drop: number }>({ last: performance.now(), drop: 0 });

  // use-shader-fx fluid hook (optional enhancer)
  const { texture: fluidTexture, render: renderFluid } = useFluid({
    size: { width: Math.max(16, size.width), height: Math.max(16, size.height) },
    dpr: 1,
  });

  const fxMode = useVisStore(s => s.fxMode);
  const visParams = useVisStore(s => s.params);
  const poseData = useStore(s => s.poseData);

  // Create material once
  useEffect(() => {
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uPointer: { value: new THREE.Vector2(0.5, 0.5) },
        uPointerVel: { value: new THREE.Vector2(0, 0) },
        uBodySpeed: { value: 0 },
        uExpand: { value: 0 },
        uAccent: { value: 0 },
        uMusicReactivity: { value: visParams.musicReact },
        uMotionReactivity: { value: visParams.motionReact },
        uTime: { value: 0 },
        uDelta: { value: 0 },
        uFluid: { value: fluidTexture },
      },
      vertexShader: vert,
      fragmentShader: frag,
      transparent: false,
    });
    setMaterial(mat);
    return () => { mat.dispose(); };
  }, [fluidTexture]);

  // Update reactivity uniforms when changed
  useEffect(() => {
    if (!material) return;
    material.uniforms.uMusicReactivity.value = visParams.musicReact;
    material.uniforms.uMotionReactivity.value = visParams.motionReact;
  }, [material, visParams.musicReact, visParams.motionReact]);

  // Pointer tracking
  useEffect(() => {
    const canvas = gl.domElement;
    function onMove(e: PointerEvent) {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const now = performance.now();
      const dt = Math.max(1 / 120, (now - perfRef.current.last) / 1000);
      perfRef.current.last = now;
      const updated = updatePointer(pointerState.current, { x, y }, { w: rect.width, h: rect.height }, dt, 0.25);
      pointerState.current = updated;
    }
    canvas.addEventListener('pointermove', onMove);
    return () => canvas.removeEventListener('pointermove', onMove);
  }, [gl]);

  // Pose feature extraction (lightweight, smoothed)
  const computePoseUniforms = () => {
    const out = { bodySpeed: 0, expand: 0, accent: 0, joints: new Float32Array(66) };
    const lm: any[] | undefined = (poseData as any)?.landmarks;
    if (!lm || lm.length < 33) return out;

    // uJoints normalized 0..1 (assumes lm.x/y already 0..1)
    for (let i = 0; i < 33; i++) {
      const p = lm[i];
      out.joints[i * 2] = p?.x ?? 0;
      out.joints[i * 2 + 1] = p?.y ?? 0;
    }

    // Torso velocity: center of shoulders to center of hips
    const shL = lm[11], shR = lm[12], hipL = lm[23], hipR = lm[24];
    if (shL && shR && hipL && hipR) {
      const cSx = (shL.x + shR.x) * 0.5, cSy = (shL.y + shR.y) * 0.5;
      const cHx = (hipL.x + hipR.x) * 0.5, cHy = (hipL.y + hipR.y) * 0.5;
      // Approx body size for normalization (shoulder width)
      const shoulderW = Math.hypot(shR.x - shL.x, shR.y - shL.y) + 1e-5;
      // Use pointer vel timebase as proxy dt (stable), refined by frame uDelta later
      const vx = (cSx - cHx) / shoulderW;
      const vy = (cSy - cHy) / shoulderW;
      out.bodySpeed = Math.min(1, Math.hypot(vx, vy));
    }

    // Expand: wrists + ankles length normalized by shoulder width
    const wL = lm[15], wR = lm[16], aL = lm[27], aR = lm[28];
    if (wL && wR && shL && shR) {
      const wristSpan = Math.hypot(wR.x - wL.x, wR.y - wL.y);
      const shoulderW = Math.hypot(shR.x - shL.x, shR.y - shL.y) + 1e-5;
      out.expand += wristSpan / shoulderW;
    }
    if (aL && aR && shL && shR) {
      const ankleSpan = Math.hypot(aR.x - aL.x, aR.y - aL.y);
      const shoulderW = Math.hypot(shR.x - shL.x, shR.y - shL.y) + 1e-5;
      out.expand += ankleSpan / shoulderW;
    }
    out.expand = Math.min(1, out.expand * 0.7);

    // Accent: crude jerk proxy using pointer velocity magnitude change if no accel history; improve later
    out.accent = Math.min(1, Math.abs(pointerState.current.v[0]) + Math.abs(pointerState.current.v[1]));

    return out;
  };

  // rAF update
  useFrame(() => {
    if (!material) return;

    // perf
    const now = performance.now();
    const dt = Math.max(1e-3, (now - perfRef.current.last) / 1000);
    perfRef.current.last = now;
    const dtMs = dt * 1000;
    const perf = updatePerf(null, dtMs);

    // optional fluid step (can skip when perf is poor)
    if (renderFluid) {
      renderFluid({ clock: { elapsedTime: now / 1000 } } as any);
    }

    // uniforms
    const u = uniformsRef.current;
    u.uTime += dt;
    u.uDelta = dt;

    // pointer
    const p = pointerState.current;
    // clamp velocity for safety
    const vmax = 3.0;
    const vx = Math.max(-vmax, Math.min(vmax, p.v[0]));
    const vy = Math.max(-vmax, Math.min(vmax, p.v[1]));

    // pose mapping (when in pose mode and pose exists)
    let bodySpeed = 0, expand = 0, accent = 0;
    let joints = u.uJoints;
    if (fxMode === 'pose' && useStore.getState().poseData?.landmarks) {
      const feat = computePoseUniforms();
      bodySpeed = feat.bodySpeed;
      expand = feat.expand;
      accent = feat.accent;
      joints = feat.joints;
    }

    // apply to shader
    material.uniforms.uPointer.value.set(p.p[0], p.p[1]);
    material.uniforms.uPointerVel.value.set(vx, vy);
    material.uniforms.uBodySpeed.value = bodySpeed;
    material.uniforms.uExpand.value = expand;
    material.uniforms.uAccent.value = accent;
    material.uniforms.uMusicReactivity.value = useVisStore.getState().params.musicReact;
    material.uniforms.uMotionReactivity.value = useVisStore.getState().params.motionReact;
    material.uniforms.uTime.value = u.uTime;
    material.uniforms.uDelta.value = dt;
    material.uniforms.uFluid.value = fluidTexture;
  });

  if (!material) return null;

  return (
    <mesh ref={meshRef} position={[0, 0, 0]}>
      <planeGeometry args={[20000, 10000]} />
      <shaderMaterial attach="material" args={[material]} />
    </mesh>
  );
}
