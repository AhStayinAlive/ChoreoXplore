import { Subject } from 'rxjs';

export type PoseVec2 = { x: number; y: number; };
export type Joint = { x: number; y: number; z?: number; visibility?: number };
export type Pose = { landmarks: Joint[]; timestamp: number };

const toV = (a: Joint, b: Joint) => ({ x: b.x - a.x, y: b.y - a.y });
const dot = (a: PoseVec2, b: PoseVec2) => a.x * b.x + a.y * b.y;
const mag = (v: PoseVec2) => Math.hypot(v.x, v.y);
const clamp01 = (x:number)=>Math.max(0,Math.min(1,x));

const angle = (a: Joint, b: Joint, c: Joint) => {
  const ab = toV(b, a), cb = toV(b, c);
  const d = dot(ab, cb) / (mag(ab) * mag(cb) + 1e-6);
  return Math.acos(Math.max(-1, Math.min(1, d))); // radians
};

export type MotionFeatures = {
  elbowL: number; elbowR: number; kneeL: number; kneeR: number;
  armSpan: number; speed: number; sharpness: number;
};

export const pose$ = new Subject<Pose>();
let last: Pose | null = null;

export function computeMotionFeatures(p: Pose): MotionFeatures {
  const lm = p.landmarks;
  const S = (i:number)=>lm[i];
  const L = { shoulder:S(11), elbow:S(13), wrist:S(15), hip:S(23), knee:S(25), ankle:S(27) };
  const R = { shoulder:S(12), elbow:S(14), wrist:S(16), hip:S(24), knee:S(26), ankle:S(28) };

  const elbowL = angle(L.shoulder, L.elbow, L.wrist);
  const elbowR = angle(R.shoulder, R.elbow, R.wrist);
  const kneeL  = angle(L.hip, L.knee, L.ankle);
  const kneeR  = angle(R.hip, R.knee, R.ankle);

  const shoulderSpan = Math.hypot(R.shoulder.x - L.shoulder.x, R.shoulder.y - L.shoulder.y);
  const bodyHeight   = Math.hypot(((L.hip.x+R.hip.x)/2 - (L.shoulder.x+R.shoulder.x)/2),
                                  ((L.hip.y+R.hip.y)/2 - (L.shoulder.y+R.shoulder.y)/2)) + 1e-6;
  const wristSpan = Math.hypot(R.wrist.x - L.wrist.x, R.wrist.y - L.wrist.y);
  const armSpan = (wristSpan + shoulderSpan) / (2 * bodyHeight);

  let speed = 0;
  if (last) {
    const cx = lm.reduce((s,j)=>s+j.x,0)/lm.length;
    const cy = lm.reduce((s,j)=>s+j.y,0)/lm.length;
    const lx = last.landmarks.reduce((s,j)=>s+j.x,0)/lm.length;
    const ly = last.landmarks.reduce((s,j)=>s+j.y,0)/lm.length;
    const dt = Math.max(1, p.timestamp - last.timestamp); // ms
    speed = Math.hypot(cx-lx, cy-ly) / dt; // px/ms
  }
  last = p;

  const joints = [elbowL, elbowR, kneeL, kneeR];
  const sharpness = joints
    .map(a => 1 - Math.min(1, Math.abs(Math.PI - a) / (Math.PI))) // straighter → 1
    .reduce((s,v)=>s+v,0) / joints.length;

  return { elbowL, elbowR, kneeL, kneeR, armSpan, speed, sharpness: clamp01(sharpness) };
}

// Convenience: call this anywhere you emit MediaPipe results
export function ingestPose(landmarks: Joint[]) {
  return computeMotionFeatures({ landmarks, timestamp: performance.now() });
}

