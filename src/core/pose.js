import { BehaviorSubject } from "rxjs";
export const pose$ = new BehaviorSubject({ conf: 0, shoulderAxisDeg: 0, bboxArea: 0, wrists: { x: 0, y: 0 } });

let detector;
let videoEl;
export async function startPose() {
  try {
    detector = await (window.poseLandmarker ? window.poseLandmarker() : null);
  } catch (_) {
    detector = null;
  }
  if (!detector) {
    try {
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: {
            width: { exact: 1920 },
            height: { exact: 1080 }
          }
        });
        console.log('📹 pose.js: Got 1920x1080 camera stream');
      } catch (exactError) {
        console.log('📹 pose.js: 1920x1080 not supported, trying ideal constraints...');
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: {
            width: { min: 640, ideal: 1920, max: 3840 },
            height: { min: 480, ideal: 1080, max: 2160 }
          }
        });
      }
      videoEl = document.createElement('video');
      videoEl.setAttribute('playsinline', '');
      videoEl.muted = true;
      videoEl.srcObject = stream;
      await videoEl.play();
    } catch (_) {
      // ignore camera failure; fallback mock will continue
    }
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
    const bbox = videoEl ? 0.25 : 0.1;
    pose$.next({ conf: videoEl ? 0.6 : 0.2, shoulderAxisDeg: Math.sin(t) * 15, bboxArea: bbox + 0.02 * Math.cos(t), wrists: { x: 0.5, y: 0.5 + 0.1 * Math.sin(t * 0.5) } });
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

