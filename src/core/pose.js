import { BehaviorSubject } from "rxjs";
export const pose$ = new BehaviorSubject({ conf: 0, shoulderAxisDeg: 0, bboxArea: 0, wrists: { x: 0, y: 0 } });

let detector;
export async function startPose() {
  try {
    detector = await (window.poseLandmarker ? window.poseLandmarker() : null);
  } catch (_) {
    detector = null;
  }
  requestAnimationFrame(loop);
}

async function loop() {
  if (detector && detector.detect) {
    try {
      const res = await detector.detect();
      const p = parse(res);
      pose$.next(p);
    } catch (_) {
      // ignore errors in MVP
    }
  } else {
    // fallback mock to keep stream alive
    const t = performance.now() * 0.001;
    pose$.next({ conf: 0.2, shoulderAxisDeg: Math.sin(t) * 15, bboxArea: 0.1 + 0.02 * Math.cos(t), wrists: { x: 0.5, y: 0.5 + 0.1 * Math.sin(t * 0.5) } });
  }
  requestAnimationFrame(loop);
}

function parse(res) {
  if (!res || !res.landmarks?.length) return { conf: 0 };
  const lm = res.landmarks[0];

  const sL = lm[11], sR = lm[12];
  const axis = { x: sR.x - sL.x, y: sR.y - sL.y };
  const deg = Math.atan2(axis.y, axis.x) * 180 / Math.PI;

  const xs = lm.map(p => p.x), ys = lm.map(p => p.y);
  const bboxArea = (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys));

  const conf = Math.min(...lm.map(p => p.visibility ?? 0.8));
  const wrists = lm[16] || { x: 0.5, y: 0.5 };

  return { conf, shoulderAxisDeg: deg, bboxArea, wrists };
}

