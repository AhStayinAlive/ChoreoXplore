import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useVisStore } from '../state/useVisStore';
import useStore from '../core/store';
import { useStageShader } from './useStageShader';
import { localCreamEffect } from './effects/localCream';
import { normalizeJoints, computePoseFeatures } from './poseFeatures';
import { usePointerUniforms } from './usePointerUniforms';

export default function ShaderStage() {
  const { gl, size } = useThree();
  usePointerUniforms();
  const fxMode = useVisStore(s => s.fxMode);
  const visParams = useVisStore(s => s.params);
  const poseData = useStore(s => s.poseData);
  const pointerState = useStore(s => s.pointer);

  // Load external shaders package if present, else use local fallback
  const [effect, setEffect] = useState<any>(localCreamEffect);
  useEffect(() => {
    let mounted = true;
    import(/* @vite-ignore */ '@stage/shaders').then((pkg: any) => {
      if (!mounted) return;
      if (pkg?.createEffect && pkg?.creamEffect) {
        const eff = pkg.createEffect(pkg.creamEffect);
        setEffect(eff);
      }
    }).catch(() => { /* keep local fallback */ });
    return () => { mounted = false; };
  }, []);

  const { material, setUniforms } = useStageShader(effect);

  // Pointer tracking on the window -> update store.pointer normalized and velocity
  useEffect(() => {
    const target: EventTarget = window;
    function handleMove(clientX: number, clientY: number) {
      const rect = gl.domElement.getBoundingClientRect();
      const x = Math.min(Math.max(clientX - rect.left, 0), rect.width);
      const y = Math.min(Math.max(clientY - rect.top, 0), rect.height);
      const nx = rect.width > 0 ? x / rect.width : 0.5;
      const ny = rect.height > 0 ? 1 - (y / rect.height) : 0.5;
      const prev = useStore.getState().pointer;
      const now = performance.now();
      const dt = Math.max(1e-3, (now - (handleMove as any)._last || 0) / 1000);
      (handleMove as any)._last = now;
      const vx = (nx - prev.x) / dt;
      const vy = (ny - prev.y) / dt;
      useStore.getState().setPointer({ x: nx, y: ny, vx, vy });
    }
    function onMove(e: PointerEvent) { handleMove(e.clientX, e.clientY); }
    function onMouseMove(e: MouseEvent) { handleMove(e.clientX, e.clientY); }
    target.addEventListener('pointermove', onMove as any, { passive: true } as any);
    target.addEventListener('mousemove', onMouseMove as any, { passive: true } as any);
    return () => {
      target.removeEventListener('pointermove', onMove as any);
      target.removeEventListener('mousemove', onMouseMove as any);
    };
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
      bodySpeed = last ? (0.2 * vmag + 0.8 * Math.min(1, vmag)) : Math.min(1, vmag);
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
  const poseFeatRef = useRef<any>(null);
  const dropRef = useRef(0);
  const skipRef = useRef(false);
  useFrame((_, dt) => {
    timeRef.current += dt;
    dropRef.current = dt > 0.028 ? Math.min(6, dropRef.current + 1) : Math.max(0, dropRef.current - 1);
    const qualityScale = dropRef.current >= 3 ? 0.6 : 1.0;
    if (dropRef.current >= 3) { skipRef.current = !skipRef.current; if (skipRef.current) return; }

    const alpha = 0.3;
    const targetX = pointerState?.x ?? 0.5;
    const targetY = pointerState?.y ?? 0.5;
    smoothRef.current.px += (targetX - smoothRef.current.px) * alpha;
    smoothRef.current.py += (targetY - smoothRef.current.py) * alpha;
    const rawVx = (pointerState?.vx ?? 0) * qualityScale;
    const rawVy = (pointerState?.vy ?? 0) * qualityScale;
    smoothRef.current.vx += (rawVx - smoothRef.current.vx) * alpha;
    smoothRef.current.vy += (rawVy - smoothRef.current.vy) * alpha;

    const vmax = 3.0 * qualityScale;
    const pvx = Math.max(-vmax, Math.min(vmax, smoothRef.current.vx));
    const pvy = Math.max(-vmax, Math.min(vmax, smoothRef.current.vy));
    const uPointer: [number, number] = [smoothRef.current.px, smoothRef.current.py];
    const uPointerVel: [number, number] = [pvx, pvy];

    let poseU = { joints: new Float32Array(66), bodySpeed: 0, expand: 0, accent: 0 };
    if (fxMode === 'pose' && (poseData as any)?.landmarks?.length) {
      const lm: any[] = (poseData as any).landmarks;
      const w = (poseData as any).width || size.width;
      const h = (poseData as any).height || size.height;
      const feats = computePoseFeatures(poseFeatRef.current, lm, Math.max(dt, 1 / 120));
      poseFeatRef.current = feats;
      poseU = {
        joints: normalizeJoints(lm, w, h),
        bodySpeed: feats.bodySpeed,
        expand: feats.expand,
        accent: feats.accent,
      };
    }

    setUniforms({
      uTime: timeRef.current,
      iTime: timeRef.current,
      uDelta: dt,
      uPointer,
      u_mouse: uPointer as any,
      iMouse: uPointer as any,
      uPointerVel,
      uJoints: poseU.joints,
      uBodySpeed: poseU.bodySpeed,
      uExpand: poseU.expand,
      uAccent: poseU.accent,
      uMusicReactivity: visParams.musicReact,
      uMotionReactivity: visParams.motionReact,
      u_resolution: [size.width, size.height] as any,
      iResolution: [size.width, size.height] as any,
    });
  });

  if (!material) return null;

  return (
    <mesh position={[0, 0, 0]} renderOrder={9999} frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}
