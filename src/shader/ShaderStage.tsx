import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useVisStore } from '../state/useVisStore';
import useStore from '../core/store';
import { type CommonUniforms } from './uniforms';
import { useStageShader } from './useStageShader';
import { localCreamEffect } from './effects/localCream';

export default function ShaderStage() {
  const { gl } = useThree();
  const fxMode = useVisStore(s => s.fxMode);
  const visParams = useVisStore(s => s.params);
  const poseData = useStore(s => s.poseData);
  const pointer = useStore(s => s.pointer);

  // instantiate effect (use package when available; local fallback here)
  const effect = useMemo(() => localCreamEffect, []);
  const { material, setUniforms } = useStageShader(effect);

  // Update reactivity uniforms when changed
  useEffect(() => {
    setUniforms({ uMusicReactivity: visParams.musicReact, uMotionReactivity: visParams.motionReact });
  }, [visParams.musicReact, visParams.motionReact]);

  // Pointer tracking on the canvas -> update store.pointer normalized and velocity
  useEffect(() => {
    const canvas = gl.domElement;
    function onMove(e: PointerEvent) {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const nx = rect.width > 0 ? x / rect.width : 0.5;
      const ny = rect.height > 0 ? y / rect.height : 0.5;
      // simple finite diff velocity in normalized space
      const prev = useStore.getState().pointer;
      const now = performance.now();
      const dt = Math.max(1e-3, (now - (onMove as any)._last || 0) / 1000);
      (onMove as any)._last = now;
      const vx = (nx - prev.x) / dt;
      const vy = (ny - prev.y) / dt;
      useStore.getState().setPointer({ x: nx, y: ny, vx, vy });
    }
    canvas.addEventListener('pointermove', onMove);
    return () => canvas.removeEventListener('pointermove', onMove);
  }, [gl]);

  // Convert current poseData to uniform bundle with smoothing and accent decay
  const lastRef = useRef<{ cx: number; cy: number; vx: number; vy: number; accent: number } | null>(null);
  function getPoseUniforms(dt: number) {
    const lm: any[] | undefined = (poseData as any)?.landmarks;
    const joints = new Float32Array(66);
    let bodySpeed = 0, expand = 0, accent = 0;
    if (!lm || lm.length < 33) return { joints, bodySpeed, expand, accent };

    for (let i = 0; i < 33; i++) { const p = lm[i]; joints[i*2] = p?.x ?? 0; joints[i*2+1] = p?.y ?? 0; }

    const shL = lm[11], shR = lm[12], hipL = lm[23], hipR = lm[24];
    if (shL && shR && hipL && hipR) {
      const cSx = (shL.x + shR.x) * 0.5, cSy = (shL.y + shR.y) * 0.5;
      const cHx = (hipL.x + hipR.x) * 0.5, cHy = (hipL.y + hipR.y) * 0.5;
      const cx = (cSx + cHx) * 0.5;
      const cy = (cSy + cHy) * 0.5;
      const shoulderW = Math.hypot(shR.x - shL.x, shR.y - shL.y) + 1e-5;
      const last = lastRef.current;
      const vx = last ? (cx - last.cx) / Math.max(1e-3, dt) : 0;
      const vy = last ? (cy - last.cy) / Math.max(1e-3, dt) : 0;
      const vmag = Math.hypot(vx, vy) / shoulderW;
      // low-pass body speed
      bodySpeed = last ? (last.vx * 0 + last.vy * 0, (0.2 * vmag + 0.8 * Math.min(1, vmag))) : Math.min(1, vmag);
      // jerk/accel based accent with short decay
      const accel = last ? (Math.hypot(vx - last.vx, vy - last.vy) / Math.max(1e-3, dt)) / shoulderW : 0;
      const gain = Math.min(1, accel * 0.2);
      const decayed = Math.max(0, (last?.accent ?? 0) * 0.9);
      accent = Math.max(decayed, gain);
      lastRef.current = { cx, cy, vx, vy, accent };
    }
    const wL = lm[15], wR = lm[16], aL = lm[27], aR = lm[28];
    if (wL && wR && shL && shR) {
      const wristSpan = Math.hypot(wR.x - wL.x, wR.y - wL.y);
      const shoulderW = Math.hypot(shR.x - shL.x, shR.y - shL.y) + 1e-5;
      expand += wristSpan / shoulderW;
    }
    if (aL && aR && shL && shR) {
      const ankleSpan = Math.hypot(aR.x - aL.x, aR.y - aL.y);
      const shoulderW = Math.hypot(shR.x - shL.x, shR.y - shL.y) + 1e-5;
      expand += ankleSpan / shoulderW;
    }
    expand = Math.min(1, expand * 0.7);
    return { joints, bodySpeed, expand, accent };
  }

  // rAF update
  const timeRef = useRef(0);
  const smoothRef = useRef({ px: 0.5, py: 0.5, vx: 0, vy: 0 });
  const dropRef = useRef(0);
  useFrame((_, dt) => {
    timeRef.current += dt;
    // perf drop detection
    dropRef.current = dt > 0.028 ? Math.min(6, dropRef.current + 1) : Math.max(0, dropRef.current - 1);
    const qualityScale = dropRef.current >= 3 ? 0.6 : 1.0;

    // smooth pointer and velocity
    const alpha = 0.3; // low-pass factor
    const targetX = pointer?.x ?? 0.5;
    const targetY = pointer?.y ?? 0.5;
    smoothRef.current.px += (targetX - smoothRef.current.px) * alpha;
    smoothRef.current.py += (targetY - smoothRef.current.py) * alpha;
    const rawVx = (pointer?.vx ?? 0) * qualityScale;
    const rawVy = (pointer?.vy ?? 0) * qualityScale;
    smoothRef.current.vx += (rawVx - smoothRef.current.vx) * alpha;
    smoothRef.current.vy += (rawVy - smoothRef.current.vy) * alpha;

    // clamp velocity to control intensity
    const vmax = 3.0 * qualityScale;
    const pvx = Math.max(-vmax, Math.min(vmax, smoothRef.current.vx));
    const pvy = Math.max(-vmax, Math.min(vmax, smoothRef.current.vy));
    const uPointer: [number, number] = [smoothRef.current.px, smoothRef.current.py];
    const uPointerVel: [number, number] = [pvx, pvy];

    const poseU = fxMode === 'pose' ? getPoseUniforms(dt) : { joints: new Float32Array(66), bodySpeed: 0, expand: 0, accent: 0 };

    setUniforms({
      uTime: timeRef.current, uDelta: dt,
      uPointer, uPointerVel,
      uJoints: poseU.joints,
      uBodySpeed: poseU.bodySpeed,
      uExpand: poseU.expand,
      uAccent: poseU.accent,
      uMusicReactivity: visParams.musicReact,
      uMotionReactivity: visParams.motionReact,
    });
  });

  if (!material) return null;

  return (
    <mesh position={[0, 0, 0]}>
      <planeGeometry args={[20000, 10000]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}
