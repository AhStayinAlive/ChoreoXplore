import { audio$, attachAudio } from '../engine/audioFeatures';
import { computeMotionFeatures } from '../engine/poseFeatures';
import { featuresWithJoints } from '../motion/featuresWithJoints';
import { useVisStore } from '../state/useVisStore';
import { pose$ } from '../core/pose';

export function startIrinaAudioBridge() {
  let stop;

  // Subscribe to audio data
  stop = audio$.subscribe((audioData) => {
    useVisStore.getState().setMusic(audioData);
  });

  // Try to attach to existing audio sources
  (async () => {
    try {
      // Look for existing audio elements
      const audioEl = document.querySelector('audio');
      if (audioEl) {
        await attachAudio(audioEl);
        return;
      }
      
      // Use virtual cable audio for Irina bridge
      console.log('🎵 Irina bridge using virtual cable audio');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false,  // Disable echo cancellation for virtual cable
          noiseSuppression: false,  // Disable noise suppression for virtual cable
          autoGainControl: false    // Disable auto gain control for virtual cable
        }
      });
      await attachAudio(stream);
    } catch (error) {
      console.log('Could not attach audio:', error);
    }
  })();

  return () => {
    try { stop?.unsubscribe?.(); } catch {}
  };
}

export function startIrinaPoseBridge() {
  let stop;
  let lastTs = 0;

  // Connect to existing pose system
  stop = pose$.subscribe((poseData) => {
    try {
      let landmarks = poseData?.landmarks;
      let timestamp = poseData?.timestamp ?? performance.now();

      // Fallback: synthesize minimal landmark set with required indices
      if (!landmarks || !Array.isArray(landmarks) || landmarks.length < 29) {
        const conf = poseData?.conf ?? 0.0;
        const vis = Math.max(0, Math.min(1, conf));
        const makePoint = (x, y) => ({ x, y, visibility: vis });
        const arr = new Array(33).fill(0).map(() => makePoint(0.5, 0.5));
        // indices needed: 0, 11-16, 23-28
        arr[0]  = makePoint(0.5, 0.3); // nose
        arr[11] = makePoint(0.4, 0.4); // L shoulder
        arr[12] = makePoint(0.6, 0.4); // R shoulder
        arr[13] = makePoint(0.35, 0.5); // L elbow
        arr[14] = makePoint(0.65, 0.5); // R elbow
        arr[15] = makePoint(0.30, 0.6); // L wrist
        arr[16] = makePoint(0.70, 0.6); // R wrist
        arr[23] = makePoint(0.45, 0.75); // L hip
        arr[24] = makePoint(0.55, 0.75); // R hip
        arr[25] = makePoint(0.45, 0.90); // L knee
        arr[26] = makePoint(0.55, 0.90); // R knee
        arr[27] = makePoint(0.45, 1.00); // L ankle
        arr[28] = makePoint(0.55, 1.00); // R ankle
        landmarks = arr;
      }

      const dt = Math.max(1 / 120, (timestamp - (lastTs || timestamp)) / 1000);
      lastTs = timestamp;

      const feat = featuresWithJoints({ landmarks }, dt, computeMotionFeatures);
      useVisStore.getState().setMotion(feat);
    } catch (_) {
      // ignore errors to keep realtime stable
    }
  });

  return () => {
    try { stop?.unsubscribe?.(); } catch {}
  };
}
