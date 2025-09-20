import { BehaviorSubject, interval } from "rxjs";

export const audio$ = new BehaviorSubject({ rms: 0, bands: [0, 0, 0], centroid: 0, onset: false });

let ctx, analyser, dataF, lastSpec, lastOnsetAt = 0;

export async function startAudio() {
  if (ctx) return;
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
  } catch (_) {
    return;
  }
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const src = ctx.createMediaStreamSource(stream);
  analyser = ctx.createAnalyser();
  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0.8;
  src.connect(analyser);
  dataF = new Uint8Array(analyser.frequencyBinCount);

  interval(16).subscribe(tick);
}

function tick() {
  if (!analyser) return;
  analyser.getByteFrequencyData(dataF);
  const arr = Array.from(dataF);
  const sum = arr.reduce((a, b) => a + b, 0);
  const rms = sum / arr.length / 255;

  const L = avg(arr.slice(2, 40));
  const M = avg(arr.slice(40, 200));
  const H = avg(arr.slice(200));
  const centroid = spectralCentroid(arr);

  const flux = lastSpec ? arr.reduce((acc, v, i) => acc + Math.max(0, v - lastSpec[i]), 0) / arr.length : 0;
  const now = performance.now();
  // more sensitive onset for MVP
  const onset = flux > 0.12 && now - lastOnsetAt > 120;
  if (onset) lastOnsetAt = now;
  lastSpec = arr;

  audio$.next({ rms, bands: [L / 255, M / 255, H / 255], centroid, onset });
}

const avg = (a) => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
function spectralCentroid(arr) {
  let num = 0, den = 0;
  for (let i = 0; i < arr.length; i++) { num += i * arr[i]; den += arr[i]; }
  return den ? num / den / arr.length : 0;
}

