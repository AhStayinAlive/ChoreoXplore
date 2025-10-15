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

      // Fallback: synthesize minimal landmark set with required indices (use pose$ wrist signal if available)
      if (!landmarks || !Array.isArray(landmarks) || landmarks.length < 29) {
        const vis = 1.0; // ensure visibility for fallback emitters
        const makePoint = (x, y) => ({ x, y, visibility: vis });
        const arr = new Array(33).fill(0).map(() => makePoint(0.5, 0.5));
        const wrist = poseData?.wrists || { x: 0.5, y: 0.5 };
        const wx = wrist.x, wy = wrist.y;
        // indices needed: 0, 11-16, 23-28
        arr[0]  = makePoint(0.5, 0.3); // nose
        // shoulders sway slightly with wrist y so there is visible motion
        const sway = (Math.sin((timestamp*0.001) * 1.3) * 0.02);
        arr[11] = makePoint(0.4, 0.4 + sway);
        arr[12] = makePoint(0.6, 0.4 - sway);
        // elbows interpolate between shoulders and wrists to produce motion
        arr[13] = makePoint(0.4 * 0.7 + (1.0 - wx) * 0.3, 0.45 * 0.6 + wy * 0.4);
        arr[14] = makePoint(0.6 * 0.7 + wx * 0.3,           0.45 * 0.6 + wy * 0.4);
        // wrists mirror around center based on wrist.x/y
        arr[15] = makePoint(1.0 - wx, wy);
        arr[16] = makePoint(wx, wy);
        // hips/knees/ankles add small oscillation so cream can appear even with minimal movement
        const osc = Math.sin((timestamp*0.001) * 0.9) * 0.01;
        arr[23] = makePoint(0.45, 0.75 + osc);
        arr[24] = makePoint(0.55, 0.75 - osc);
        arr[25] = makePoint(0.45, 0.90 + osc*1.2);
        arr[26] = makePoint(0.55, 0.90 - osc*1.2);
        arr[27] = makePoint(0.45, 1.00 + osc*1.4);
        arr[28] = makePoint(0.55, 1.00 - osc*1.4);
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
