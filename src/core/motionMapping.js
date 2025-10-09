import { BehaviorSubject, combineLatest } from "rxjs";
import { createAudioFeatureStream } from "../audio/createAudioFeatureStream";
import useStore from "./store";

// Motion mapping system for connecting pose data to visual elements
export const motionData$ = new BehaviorSubject({
  // Background image transformations
  background: {
    position: { x: 0, y: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1 },
    opacity: 1
  },
  // Camera movements
  camera: {
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 }
  },
  // Visual effects
  effects: {
    blur: 0,
    brightness: 1,
    contrast: 1,
    saturation: 1
  }
});

// Previous pose data for velocity calculation
let previousPoseData = null;
let previousTimestamp = 0;

// Map pose landmarks to motion data
export function mapPoseToMotion(poseData, ambientAnimationActive = false) {
  if (!poseData || !poseData.landmarks) {
    // Fallback motion for testing when no pose detected
    const fallbackMotion = {
      centerOfMass: { x: 0.5, y: 0.5, z: 0 },
      movement: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: 1,
      intensity: 0,
      velocity: { x: 0, y: 0, z: 0 }
    };
    
    const fallbackData = {
      background: ambientAnimationActive ? { position: { x: 0, y: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1 }, opacity: 1 } : mapToBackgroundTransform(fallbackMotion),
      camera: mapToCameraTransform(fallbackMotion),
      effects: mapToVisualEffects(fallbackMotion)
    };
    
    motionData$.next(fallbackData);
    return fallbackData;
  }

  const landmarks = poseData.landmarks;
  const worldLandmarks = poseData.worldLandmarks;
  const currentTimestamp = poseData.timestamp || Date.now();
  
  // Calculate motion metrics from pose data
  const motion = calculateMotionMetrics(landmarks, worldLandmarks, previousPoseData, currentTimestamp, previousTimestamp);
  
  // Store current pose data for next frame
  previousPoseData = poseData;
  previousTimestamp = currentTimestamp;
  
  // Map to background transformations (only if ambient animation is not active)
  const backgroundTransform = ambientAnimationActive ? 
    { position: { x: 0, y: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1 }, opacity: 1 } : 
    mapToBackgroundTransform(motion);
  
  // Map to camera movements
  const cameraTransform = mapToCameraTransform(motion);
  
  // Map to visual effects
  const effects = mapToVisualEffects(motion);
  
  const newMotionData = {
    background: backgroundTransform,
    camera: cameraTransform,
    effects: effects
  };
  
  
  motionData$.next(newMotionData);
  return newMotionData;
}

// Calculate motion metrics from pose landmarks
function calculateMotionMetrics(landmarks, worldLandmarks, prevPoseData, currentTimestamp, prevTimestamp) {
  if (!landmarks || landmarks.length === 0) {
    return {
      centerOfMass: { x: 0, y: 0, z: 0 },
      movement: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: 1,
      intensity: 0,
      velocity: { x: 0, y: 0, z: 0 }
    };
  }

  // Calculate center of mass
  let visibleCount = 0;
  let centerX = 0, centerY = 0, centerZ = 0;
  
  landmarks.forEach(landmark => {
    if (landmark.visibility > 0.5) {
      centerX += landmark.x;
      centerY += landmark.y;
      centerZ += landmark.z;
      visibleCount++;
    }
  });

  if (visibleCount === 0) {
    return {
      centerOfMass: { x: 0, y: 0, z: 0 },
      movement: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: 1,
      intensity: 0,
      velocity: { x: 0, y: 0, z: 0 }
    };
  }

  centerX /= visibleCount;
  centerY /= visibleCount;
  centerZ /= visibleCount;

  // Calculate movement intensity
  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];
  const leftWrist = landmarks[15];
  const rightWrist = landmarks[16];
  const leftHip = landmarks[23];
  const rightHip = landmarks[24];

  let intensity = 0;
  if (leftShoulder && rightShoulder) {
    const shoulderDistance = Math.sqrt(
      Math.pow(rightShoulder.x - leftShoulder.x, 2) + 
      Math.pow(rightShoulder.y - leftShoulder.y, 2)
    );
    intensity += shoulderDistance;
  }

  if (leftWrist && rightWrist) {
    const wristDistance = Math.sqrt(
      Math.pow(rightWrist.x - leftWrist.x, 2) + 
      Math.pow(rightWrist.y - leftWrist.y, 2)
    );
    intensity += wristDistance * 0.5;
  }

  // Calculate rotation from shoulder axis
  let rotationZ = 0;
  if (leftShoulder && rightShoulder) {
    const shoulderAxis = {
      x: rightShoulder.x - leftShoulder.x,
      y: rightShoulder.y - leftShoulder.y
    };
    rotationZ = Math.atan2(shoulderAxis.y, shoulderAxis.x) * 180 / Math.PI;
  }

  // Calculate scale from bounding box
  let minX = 1, maxX = 0, minY = 1, maxY = 0;
  landmarks.forEach(landmark => {
    if (landmark.visibility > 0.5) {
      minX = Math.min(minX, landmark.x);
      maxX = Math.max(maxX, landmark.x);
      minY = Math.min(minY, landmark.y);
      maxY = Math.max(maxY, landmark.y);
    }
  });

  const bboxWidth = maxX - minX;
  const bboxHeight = maxY - minY;
  const scale = Math.sqrt(bboxWidth * bboxHeight) * 2; // Normalize scale

  // Calculate velocity from previous frame
  let velocity = { x: 0, y: 0, z: 0 };
  if (prevPoseData && prevPoseData.landmarks && currentTimestamp > prevTimestamp) {
    const timeDelta = (currentTimestamp - prevTimestamp) / 1000; // Convert to seconds
    if (timeDelta > 0 && timeDelta < 1) { // Reasonable time delta
      const prevCenterX = prevPoseData.landmarks.reduce((sum, landmark, index) => {
        if (landmark.visibility > 0.5) {
          return sum + landmark.x;
        }
        return sum;
      }, 0) / visibleCount;
      
      const prevCenterY = prevPoseData.landmarks.reduce((sum, landmark, index) => {
        if (landmark.visibility > 0.5) {
          return sum + landmark.y;
        }
        return sum;
      }, 0) / visibleCount;
      
      velocity = {
        x: (centerX - prevCenterX) / timeDelta,
        y: (centerY - prevCenterY) / timeDelta,
        z: 0 // Z velocity not calculated for now
      };
    }
  }

  return {
    centerOfMass: { x: centerX, y: centerY, z: centerZ },
    movement: { x: centerX - 0.5, y: centerY - 0.5, z: centerZ },
    rotation: { x: 0, y: 0, z: rotationZ },
    scale: Math.max(0.5, Math.min(2.0, scale)),
    intensity: Math.min(1.0, intensity),
    velocity: velocity
  };
}

// Map motion metrics to background image transformations
function mapToBackgroundTransform(motion) {
  const sensitivity = 0.5; // Increased for better responsiveness
  const deadZone = 0.05; // Dead zone to prevent micro-movements
  
  // Apply dead zone to movement
  const adjustedMovement = {
    x: Math.abs(motion.movement.x) > deadZone ? motion.movement.x : 0,
    y: Math.abs(motion.movement.y) > deadZone ? motion.movement.y : 0
  };
  
  // Apply exponential scaling for more dramatic effects
  const exponentialScale = (value) => {
    return Math.sign(value) * Math.pow(Math.abs(value), 0.7);
  };
  
  // Add velocity-based momentum
  const velocityFactor = 0.3;
  const velocityInfluence = {
    x: motion.velocity.x * velocityFactor,
    y: motion.velocity.y * velocityFactor
  };
  
  return {
    position: {
      x: exponentialScale(adjustedMovement.x) * sensitivity * 150 + velocityInfluence.x,
      y: exponentialScale(adjustedMovement.y) * sensitivity * 150 + velocityInfluence.y,
    },
    rotation: {
      x: motion.rotation.x * 0.15, // Increased rotation sensitivity
      y: motion.rotation.y * 0.15,
      z: motion.rotation.z * 0.15
    },
    scale: {
      x: Math.max(0.3, Math.min(2.5, motion.scale)), // Clamp scale values
      y: Math.max(0.3, Math.min(2.5, motion.scale))
    },
    opacity: Math.max(0.3, 0.9 + (motion.intensity * 0.3)) // Enhanced opacity range
  };
}

// Map motion metrics to camera movements
function mapToCameraTransform(motion) {
  const sensitivity = 0.3; // Increased sensitivity
  const deadZone = 0.03; // Dead zone for camera movement
  
  // Apply dead zone to camera movement
  const adjustedMovement = {
    x: Math.abs(motion.movement.x) > deadZone ? motion.movement.x : 0,
    y: Math.abs(motion.movement.y) > deadZone ? motion.movement.y : 0
  };
  
  return {
    position: {
      x: adjustedMovement.x * sensitivity * 80, // Increased scale
      y: adjustedMovement.y * sensitivity * 80,
      z: Math.max(50, 120 + (motion.intensity * 30)) // Enhanced depth range
    },
    rotation: {
      x: motion.rotation.x * 0.08, // Increased rotation sensitivity
      y: motion.rotation.y * 0.08,
      z: motion.rotation.z * 0.08
    }
  };
}

// Map motion metrics to visual effects
function mapToVisualEffects(motion) {
  // Enhanced visual effects with better scaling
  const intensity = Math.min(1.0, motion.intensity);
  
  return {
    blur: Math.max(0, intensity * 3), // Increased blur range
    brightness: Math.max(0.5, 1 + (intensity * 0.4)), // Enhanced brightness range
    contrast: Math.max(0.8, 1 + (intensity * 0.3)), // Enhanced contrast
    saturation: Math.max(0.7, 1 + (intensity * 0.5)) // Enhanced saturation
  };
}

// Get current motion data
export function getCurrentMotionData() {
  return motionData$.value;
}

// Subscribe to motion data changes
export function subscribeToMotionData(callback) {
  return motionData$.subscribe(callback);
}

// --- New audio integration ---
export const audio$ = new BehaviorSubject(null);

export function initAudio(audioElement = null) {
  const stream = createAudioFeatureStream();
  const start = async () => {
    try {
      if (audioElement) {
        stream.startFromElement(audioElement);
      } else {
        await stream.startFromMic();
      }
    } catch (_) {
      // ignore failures (permissions etc.)
    }
  };
  start();
  stream.features$.subscribe((f) => {
    audio$.next(f);
    // also mirror into Zustand for UI/components access
    try { useStore.getState().setAudioFeatures(f); } catch (_) {}
  });
  return stream;
}

// Combined motion stream for camera/bg augmentation
export const combinedMotion$ = new BehaviorSubject({ pose: null, audio: null, bgBoost: 0, camShake: 0 });

export function initMotionMappingWithAudio(poseStream$) {
  combineLatest([poseStream$, audio$]).subscribe(([pose, audio]) => {
    const bgBoost = audio ? (audio.bands?.lowground || 0) * 0.3 : 0;
    const camShake = audio?.events?.percussiveSpike ? 0.02 : 0;
    combinedMotion$.next({ pose, audio, bgBoost, camShake });
  });
  return combinedMotion$;
}
