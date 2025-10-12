export type Landmark = { x: number; y: number; visibility?: number };

export function normalizeJoints(
  landmarks: Landmark[],
  width: number,
  height: number
): Float32Array {
  const out = new Float32Array(66);
  const w = Math.max(1, width || 1);
  const h = Math.max(1, height || 1);
  for (let i = 0; i < 33; i++) {
    const lm = landmarks[i] || { x: 0.5, y: 0.5 };
    const nx = Math.max(0, Math.min(1, lm.x / w));
    const ny = 1 - Math.max(0, Math.min(1, lm.y / h));
    out[i * 2 + 0] = nx;
    out[i * 2 + 1] = ny;
  }
  return out;
}

function ema(prev: number, next: number, k: number): number {
  return prev + k * (next - prev);
}

export type PoseFeatures = {
  bodySpeed: number;
  expand: number;
  accent: number;
  // internal refs for next-step derivations
  cx: number;
  cy: number;
  wrL?: Landmark;
  wrR?: Landmark;
  handVel?: number;
  speedHi?: number;
};

export function computePoseFeatures(
  prev: PoseFeatures | null,
  landmarks: Landmark[],
  dtSeconds: number
): PoseFeatures {
  const L_SH = 11,
    R_SH = 12,
    L_WR = 15,
    R_WR = 16,
    L_AN = 27,
    R_AN = 28;
  const shL = landmarks[L_SH];
  const shR = landmarks[R_SH];
  const wrL = landmarks[L_WR];
  const wrR = landmarks[R_WR];
  const anL = landmarks[L_AN];
  const anR = landmarks[R_AN];
  const safeDt = Math.max(1 / 120, dtSeconds || 0);

  if (!shL || !shR) {
    return (
      prev || {
        bodySpeed: 0,
        expand: 0,
        accent: 0,
        cx: 0.5,
        cy: 0.5,
      }
    );
  }

  const cx = (shL.x + shR.x) * 0.5;
  const cy = (shL.y + shR.y) * 0.5;

  const vx = prev ? (cx - prev.cx) / safeDt : 0;
  const vy = prev ? (cy - prev.cy) / safeDt : 0;
  const speed = Math.hypot(vx, vy);
  const speedHi = ema(prev?.speedHi ?? 600, speed * 1.25, 0.05);
  const bodySpeed = Math.min(1, speed / (speedHi || 600));

  const shoulder = Math.hypot(shL.x - shR.x, shL.y - shR.y) || 1;
  const handSpan = wrL && wrR ? Math.hypot(wrL.x - wrR.x, wrL.y - wrR.y) : 0;
  const ankleSpan = anL && anR ? Math.hypot(anL.x - anR.x, anL.y - anR.y) : 0;
  const expandRaw = (handSpan + ankleSpan * 0.6) / (shoulder * 2.0);
  const expand = Math.max(0, Math.min(1, expandRaw));

  const hvL = wrL && prev?.wrL ? Math.hypot((wrL.x - prev.wrL.x) / safeDt, (wrL.y - prev.wrL.y) / safeDt) : 0;
  const hvR = wrR && prev?.wrR ? Math.hypot((wrR.x - prev.wrR.x) / safeDt, (wrR.y - prev.wrR.y) / safeDt) : 0;
  const handVel = Math.max(hvL, hvR);
  const accel = prev ? Math.max(0, handVel - (prev.handVel || 0)) : 0;
  let accent = Math.min(1, accel * 2.5);
  accent = Math.max(prev?.accent ? prev.accent * 0.85 : 0, accent);

  return {
    bodySpeed: ema(prev?.bodySpeed || 0, bodySpeed, 0.25),
    expand: ema(prev?.expand || 0, expand, 0.25),
    accent,
    cx,
    cy,
    wrL,
    wrR,
    handVel,
    speedHi,
  };
}
