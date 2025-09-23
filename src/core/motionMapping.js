import { BehaviorSubject } from "rxjs";

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

// Map pose landmarks to motion data
export function mapPoseToMotion(poseData) {
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
      background: mapToBackgroundTransform(fallbackMotion),
      camera: mapToCameraTransform(fallbackMotion),
      effects: mapToVisualEffects(fallbackMotion)
    };
    
    motionData$.next(fallbackData);
    return fallbackData;
  }

  const landmarks = poseData.landmarks;
  const worldLandmarks = poseData.worldLandmarks;
  
  // Calculate motion metrics from pose data
  const motion = calculateMotionMetrics(landmarks, worldLandmarks);
  
  // Map to background transformations
  const backgroundTransform = mapToBackgroundTransform(motion);
  
  // Map to camera movements
  const cameraTransform = mapToCameraTransform(motion);
  
  // Map to visual effects
  const effects = mapToVisualEffects(motion);
  
  const newMotionData = {
    background: backgroundTransform,
    camera: cameraTransform,
    effects: effects
  };
  
  // Debug logging
  console.log('Motion Data:', {
    centerOfMass: motion.centerOfMass,
    movement: motion.movement,
    intensity: motion.intensity,
    background: backgroundTransform
  });
  
  motionData$.next(newMotionData);
  return newMotionData;
}

// Calculate motion metrics from pose landmarks
function calculateMotionMetrics(landmarks, worldLandmarks) {
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

  return {
    centerOfMass: { x: centerX, y: centerY, z: centerZ },
    movement: { x: centerX - 0.5, y: centerY - 0.5, z: centerZ },
    rotation: { x: 0, y: 0, z: rotationZ },
    scale: Math.max(0.5, Math.min(2.0, scale)),
    intensity: Math.min(1.0, intensity),
    velocity: { x: 0, y: 0, z: 0 } // TODO: Calculate velocity from previous frames
  };
}

// Map motion metrics to background image transformations
function mapToBackgroundTransform(motion) {
  const sensitivity = 0.3; // Adjust this to control responsiveness
  
  return {
    position: {
      x: motion.movement.x * sensitivity * 100, // Scale for 3D space
      y: motion.movement.y * sensitivity * 100,
    },
    rotation: {
      x: motion.rotation.x * 0.1,
      y: motion.rotation.y * 0.1,
      z: motion.rotation.z * 0.1
    },
    scale: {
      x: motion.scale,
      y: motion.scale
    },
    opacity: 0.8 + (motion.intensity * 0.2) // Fade based on movement intensity
  };
}

// Map motion metrics to camera movements
function mapToCameraTransform(motion) {
  const sensitivity = 0.2;
  
  return {
    position: {
      x: motion.movement.x * sensitivity * 50,
      y: motion.movement.y * sensitivity * 50,
      z: 100 + (motion.intensity * 20) // Move closer/farther based on intensity
    },
    rotation: {
      x: motion.rotation.x * 0.05,
      y: motion.rotation.y * 0.05,
      z: motion.rotation.z * 0.05
    }
  };
}

// Map motion metrics to visual effects
function mapToVisualEffects(motion) {
  return {
    blur: motion.intensity * 2, // More blur with more movement
    brightness: 1 + (motion.intensity * 0.3), // Brighter with more movement
    contrast: 1 + (motion.intensity * 0.2),
    saturation: 1 + (motion.intensity * 0.4)
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
