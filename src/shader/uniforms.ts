export type PointerUniforms = { uPointer: [number, number]; uPointerVel: [number, number]; };
export type PoseUniforms = {
  uJoints: Float32Array;  // length 66: [x0,y0, x1,y1, ...]
  uBodySpeed: number;     // 0..1
  uExpand: number;        // 0..1
  uAccent: number;        // 0..1
};
export type ReactivityUniforms = { uMusicReactivity: number; uMotionReactivity: number; };
export type TimeUniforms = { uTime: number; uDelta: number; };
export type CommonUniforms = PointerUniforms & PoseUniforms & ReactivityUniforms & TimeUniforms;

export type FramePerf = { dtMs: number; dropCount: number; qualityScale: number };

export function createDefaultUniforms(): CommonUniforms {
  return {
    uPointer: [0.5, 0.5],
    uPointerVel: [0, 0],
    uJoints: new Float32Array(66),
    uBodySpeed: 0,
    uExpand: 0,
    uAccent: 0,
    uMusicReactivity: 0.9,
    uMotionReactivity: 0.9,
    uTime: 0,
    uDelta: 0,
  };
}

export function lowpass(prev: number, next: number, alpha: number): number {
  return prev + (next - prev) * alpha;
}

export function clamp01(v: number): number { return Math.min(1, Math.max(0, v)); }

export function updatePointer(
  prev: { p: [number, number]; v: [number, number] },
  nextPx: { x: number; y: number },
  viewport: { w: number; h: number },
  dt: number,
  smoothing: number = 0.25
): { p: [number, number]; v: [number, number] } {
  const nx = viewport.w > 0 ? nextPx.x / viewport.w : 0.5;
  const ny = viewport.h > 0 ? nextPx.y / viewport.h : 0.5;
  const targetP: [number, number] = [nx, ny];
  const alpha = clamp01(smoothing);
  const p: [number, number] = [
    lowpass(prev.p[0], targetP[0], alpha),
    lowpass(prev.p[1], targetP[1], alpha),
  ];
  const vx = (p[0] - prev.p[0]) / Math.max(1e-3, dt);
  const vy = (p[1] - prev.p[1]) / Math.max(1e-3, dt);
  const v: [number, number] = [vx, vy];
  return { p, v };
}

export function updatePerf(prev: FramePerf | null, dtMs: number): FramePerf {
  const drop = dtMs > 28 ? 1 : 0;
  const dropCount = Math.max(0, (prev?.dropCount ?? 0) * 0.8 + drop);
  const qualityScale = dropCount >= 3 ? 0.7 : 1.0;
  return { dtMs, dropCount, qualityScale };
}
