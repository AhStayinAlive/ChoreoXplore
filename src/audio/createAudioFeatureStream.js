import { BehaviorSubject, interval } from "rxjs";
import { ensureAudioContext } from "./ensureAudioContext";

// Band edges aligned with ViTune mapping
const BANDS = [
  { key: "background", lo: 20, hi: 250 },
  { key: "lowground", lo: 251, hi: 2000 },
  { key: "highground", lo: 2001, hi: 6000 },
  { key: "foreground", lo: 6001, hi: 10000 },
];

export function createAudioFeatureStream({ fftSize = 1024, fps = 30 } = {}) {
  const ctx = ensureAudioContext();
  const analyser = ctx.createAnalyser();
  analyser.fftSize = fftSize;
  analyser.smoothingTimeConstant = 0.6; // p5.FFT(0.6)-like smoothing

  const freqBins = new Uint8Array(analyser.frequencyBinCount);
  const lastMag = new Float32Array(analyser.frequencyBinCount);

  const rollingPeaks = { background: 1, lowground: 1, highground: 1, foreground: 1 };
  const features$ = new BehaviorSubject(null);

  const hzToIndex = (hz) => {
    const nyquist = ctx.sampleRate / 2;
    const clamped = Math.max(0, Math.min(1, hz / nyquist));
    return Math.round(clamped * (analyser.frequencyBinCount - 1));
  };

  const bandIndexRange = Object.fromEntries(
    BANDS.map((b) => [b.key, [hzToIndex(b.lo), hzToIndex(b.hi)]])
  );

  const fpsMs = Math.max(1, Math.round(1000 / fps));

  // Maintain short foreground history for energy spike heuristic (~1.5s at 30 FPS)
  const fgHistory = new Array(44).fill(0);
  let histPtr = 0;

  let lastBeatAtMs = 0;
  const minBeatGapMs = 180; // prevent double-triggering

  const sub = interval(fpsMs).subscribe(() => {
    analyser.getByteFrequencyData(freqBins);

    // Normalize band energies via slow EMA of rolling peak
    const energies = {};
    for (const [key, [i0, i1]] of Object.entries(bandIndexRange)) {
      let sum = 0;
      for (let i = i0; i <= i1; i++) sum += freqBins[i];
      const mean = sum / ((i1 - i0 + 1) * 255);
      rollingPeaks[key] = Math.max(0.1, 0.98 * rollingPeaks[key] + 0.02 * mean);
      energies[key] = Math.min(1, mean / rollingPeaks[key]);
    }

    // Spectral flux over mids through highs
    const [m0] = bandIndexRange.lowground;
    const [, h1] = bandIndexRange.foreground;
    let flux = 0;
    for (let i = m0; i <= h1; i++) {
      const mag = freqBins[i] / 255;
      const d = mag - lastMag[i];
      if (d > 0) flux += d;
      lastMag[i] = mag;
    }

    // ViTune-like spike: foreground >= 0.25 and above history mean
    const fg = energies.foreground;
    const histMean = fgHistory.reduce((a, b) => a + b, 0) / fgHistory.length;
    const energySpike = fg >= 0.25 && fg > histMean;

    // Reinforce with flux threshold
    const percussiveSpike = energySpike || flux > 0.12;

    // Gate spikes into beats
    let beat = false;
    const now = performance.now();
    if (percussiveSpike && now - lastBeatAtMs > minBeatGapMs) {
      beat = true;
      lastBeatAtMs = now;
    }

    // Update history
    fgHistory[histPtr] = fg;
    histPtr = (histPtr + 1) % fgHistory.length;

    // Derived visualization attributes
    const starProminence = fg;
    const particleActivity = Math.min(1, 0.5 * fg + (percussiveSpike ? 0.6 : 0));
    const rectangleContiguity = energies.lowground; // mid body
    const movementPredictability = Math.max(
      0,
      1 - (energies.lowground + energies.highground) / 2
    );
    const particlePeriodicity = beat ? 1 : 0.4;
    const percussiveCoincidence = beat && percussiveSpike ? 1 : 0;
    const pulsation = Math.min(1, Math.abs(energies.foreground - energies.highground) * 0.8);

    const frame = {
      bands: energies,
      events: { percussiveSpike, beat },
      vizAttributes: {
        particleActivity,
        particlePeriodicity,
        percussiveCoincidence,
        layerIndependence: 0.5,
        rectangleContiguity,
        starProminence,
        movementPredictability,
        pulsation,
      },
      lyrics: { currentLine: "", progress: 0 },
      meta: {
        sampleRate: ctx.sampleRate,
        fftSize,
        windowMs: (1000 * fftSize) / ctx.sampleRate,
        timestampMs: now,
      },
    };

    features$.next(frame);
  });

  async function startFromMic() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const source = ctx.createMediaStreamSource(stream);
    source.connect(analyser);
    await ctx.resume();
    return () => stream.getTracks().forEach((t) => t.stop());
  }

  function startFromElement(audioEl) {
    const source = ctx.createMediaElementSource(audioEl);
    source.connect(analyser);
    analyser.connect(ctx.destination);
    ctx.resume();
    return () => {
      try { source.disconnect(); } catch (_) {}
    };
  }

  return { features$, startFromMic, startFromElement, stop: () => sub.unsubscribe() };
}
