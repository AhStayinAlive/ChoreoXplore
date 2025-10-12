import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useVisStore } from '../state/useVisStore';
import useStore from '../core/store';
import { useStageShader } from './useStageShader';
import { normalizeJoints, computePoseFeatures } from './poseFeatures';
import { usePointerUniforms } from './usePointerUniforms';
import { createEffect, creamEffect } from '@stage/shaders';
import { RingDebugEffect } from './effects/RingDebug';

export default function ShaderStage() {
  const { gl, size } = useThree();
  // Bypass store: live pointer from window events
  const pointerRef = useRef({ x: 0.5, y: 0.5, vx: 0, vy: 0 });
  useEffect(() => {
    const el = gl.domElement;
    let last = { x: 0.5, y: 0.5, t: performance.now() };
    function onMove(e: PointerEvent) {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = 1 - (e.clientY - r.top) / r.height; // flip Y -> UV space
      const now = performance.now();
      const dt = Math.max((now - last.t) / 1000, 1e-3);
      const vx = (x - last.x) / dt;
      const vy = (y - last.y) / dt;
      last = { x, y, t: now };
      pointerRef.current = { x, y, vx, vy };
    }
    window.addEventListener('pointermove', onMove as any, { passive: true } as any);
    return () => window.removeEventListener('pointermove', onMove as any);
  }, [gl]);
  // Optional debug surfacing
  useEffect(() => { (window as any).__pointer = pointerRef; }, []);
  const fxMode = useVisStore(s => s.fxMode);
  const visParams = useVisStore(s => s.params);
  const poseData = useStore(s => s.poseData);

  // TEMP: use ring debug effect to visually confirm cursor mapping
  const effect = useMemo(() => RingDebugEffect, []);
  const { material, setUniforms } = useStageShader(effect);

  // Expose debug handle for DevTools
  useEffect(() => {
    (window as any).__shaderStage = { material, setUniforms, effect };
    try {
      const keys = material && material.uniforms ? Object.keys(material.uniforms) : [];
      // eslint-disable-next-line no-console
      console.log('[ShaderStage] uniforms:', keys);
    } catch {}
    return () => { delete (window as any).__shaderStage; };
  }, [material, setUniforms, effect]);

  // Pointer tracking handled by usePointerUniforms()

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
    if (!material) return;
    // time
    timeRef.current += dt;

    // live pointer
    const p = pointerRef.current;
    const px = p.x, py = p.y, pvx = p.vx, pvy = p.vy;

    // optional pose (zeros for now)
    const uJoints = new Float32Array(66);
    const uBodySpeed = 0, uExpand = 0, uAccent = 0;

    // direct uniform writes
    const uni: any = material.uniforms;
    if (uni.uTime) uni.uTime.value = timeRef.current;
    if (uni.iTime) uni.iTime.value = timeRef.current;
    if (uni.uDelta) uni.uDelta.value = dt;
    if (uni.uPointer?.value?.set) uni.uPointer.value.set(px, py);
    if (uni.u_mouse?.value?.set) uni.u_mouse.value.set(px, py);
    if (uni.iMouse?.value?.set) uni.iMouse.value.set(px, py);
    if (uni.uPointerVel?.value?.set) uni.uPointerVel.value.set(pvx, pvy);
    if (uni.u_resolution?.value?.set) uni.u_resolution.value.set(size.width, size.height);
    if (uni.iResolution?.value?.set) uni.iResolution.value.set(size.width, size.height);
    if (uni.uBodySpeed) uni.uBodySpeed.value = uBodySpeed;
    if (uni.uExpand) uni.uExpand.value = uExpand;
    if (uni.uAccent) uni.uAccent.value = uAccent;
    if (uni.uMusicReactivity) uni.uMusicReactivity.value = visParams.musicReact ?? 0.9;
    if (uni.uMotionReactivity) uni.uMotionReactivity.value = visParams.motionReact ?? 0.9;
    if (uni.uJoints?.value instanceof Float32Array) (uni.uJoints.value as Float32Array).set(uJoints);

    // periodic debug
    const now = performance.now();
    const last = (window as any).__lastLog || 0;
    if (now - last > 1000) {
      (window as any).__lastLog = now;
      // eslint-disable-next-line no-console
      console.log('[frame] write uPointer→GPU', [px, py], 'vel', [pvx, pvy]);
      try { /* eslint-disable no-console */
        console.log('[frame] GPU now', uni.uPointer?.value?.toArray?.());
      } catch {}
    }
  });

  if (!material) return null;

  return (
    <mesh position={[0, 0, 0]} renderOrder={9999} frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}
