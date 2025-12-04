import { audio$, attachAudio } from '../engine/audioFeatures';
import { computeMotionFeatures } from '../engine/poseFeatures';
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

  // Connect to existing pose system
  stop = pose$.subscribe((poseData) => {
    // Convert existing pose format to Irina format
    // The existing system provides { conf, shoulderAxisDeg, bboxArea, wrists }
    // We need to create a mock landmarks array for Irina
    const mockLandmarks = [
      // Create some basic landmarks based on existing data
      { x: 0.5, y: 0.3, visibility: poseData.conf }, // head
      { x: 0.4, y: 0.4, visibility: poseData.conf }, // left shoulder
      { x: 0.6, y: 0.4, visibility: poseData.conf }, // right shoulder
      { x: 0.3, y: 0.5, visibility: poseData.conf }, // left elbow
      { x: 0.7, y: 0.5, visibility: poseData.conf }, // right elbow
      { x: 0.2, y: 0.6, visibility: poseData.conf }, // left wrist
      { x: 0.8, y: 0.6, visibility: poseData.conf }, // right wrist
      { x: 0.5, y: 0.7, visibility: poseData.conf }, // hip center
      { x: 0.4, y: 0.8, visibility: poseData.conf }, // left hip
      { x: 0.6, y: 0.8, visibility: poseData.conf }, // right hip
      { x: 0.3, y: 0.9, visibility: poseData.conf }, // left knee
      { x: 0.7, y: 0.9, visibility: poseData.conf }, // right knee
      { x: 0.2, y: 1.0, visibility: poseData.conf }, // left ankle
      { x: 0.8, y: 1.0, visibility: poseData.conf }, // right ankle
    ];

    const motion = computeMotionFeatures({
      landmarks: mockLandmarks,
      timestamp: performance.now()
    });
    
    useVisStore.getState().setMotion(motion);
  });

  return () => {
    try { stop?.unsubscribe?.(); } catch {}
  };
}
