// Hand tracking utilities for fluid ripple effect

/**
 * Extract left hand position from MediaPipe landmarks
 * @param {Array} landmarks - MediaPipe pose landmarks array
 * @returns {Object|null} - Hand position {x, y, z, visibility} or null if not found
 */
export const getLeftHandPosition = (landmarks) => {
  if (!landmarks || landmarks.length < 33) {
    return null;
  }
  
  const leftWrist = landmarks[15]; // Left wrist landmark (index 15)
  if (!leftWrist || leftWrist.visibility < 0.3) {
    return null;
  }
  
  return {
    x: leftWrist.x,
    y: leftWrist.y,
    z: leftWrist.z,
    visibility: leftWrist.visibility
  };
};

/**
 * Extract right hand position from MediaPipe landmarks
 * @param {Array} landmarks - MediaPipe pose landmarks array
 * @returns {Object|null} - Hand position {x, y, visibility} or null if not found
 */
export const getRightHandPosition = (landmarks) => {
  if (!landmarks || landmarks.length < 33) {
    return null;
  }
  
  const rightWrist = landmarks[16]; // Right wrist landmark
  if (!rightWrist || rightWrist.visibility < 0.3) {
    return null;
  }
  
  return {
    x: rightWrist.x,
    y: rightWrist.y,
    z: rightWrist.z,
    visibility: rightWrist.visibility
  };
};

/**
 * Calculate hand movement velocity between frames
 * @param {Object} currentPos - Current hand position
 * @param {Object} lastPos - Previous hand position
 * @param {number} deltaTime - Time difference in seconds
 * @returns {number} - Velocity magnitude (0-1)
 */
export const calculateHandVelocity = (currentPos, lastPos, deltaTime = 0.016) => {
  if (!currentPos || !lastPos) return 0;
  
  const dx = currentPos.x - lastPos.x;
  const dy = currentPos.y - lastPos.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  // Calculate velocity per second and normalize
  const velocity = distance / deltaTime;
  
  // Scale and clamp velocity for effect intensity
  return Math.min(velocity * 0.1, 1.0);
};

/**
 * Convert MediaPipe coordinates to Three.js screen coordinates
 * @param {Object} landmark - MediaPipe landmark with x, y coordinates
 * @param {number} scale - Scaling factor (default: 1)
 * @returns {Object} - Three.js coordinates {x, y}
 */
export const landmarkToScreenCoords = (landmark, scale = 1) => {
  if (!landmark) return { x: 0, y: 0 };
  
  return {
    x: (landmark.x - 0.5) * 2 * scale,
    y: (0.5 - landmark.y) * 2 * scale
  };
};

/**
 * Smooth hand position using exponential moving average
 * @param {Object} currentPos - Current hand position
 * @param {Object} smoothedPos - Previous smoothed position
 * @param {number} smoothingFactor - Smoothing factor (0-1, higher = more smoothing)
 * @returns {Object} - Smoothed position
 */
export const smoothHandPosition = (currentPos, smoothedPos, smoothingFactor = 0.1) => {
  if (!currentPos) return smoothedPos || { x: 0.5, y: 0.5 };
  if (!smoothedPos) return currentPos;
  
  return {
    x: smoothedPos.x + (currentPos.x - smoothedPos.x) * smoothingFactor,
    y: smoothedPos.y + (currentPos.y - smoothedPos.y) * smoothingFactor
  };
};

/**
 * Calculate ripple effect parameters based on hand movement
 * @param {Object} handPos - Current hand position
 * @param {number} velocity - Hand movement velocity
 * @param {number} visibility - Hand visibility (0-1)
 * @returns {Object} - Ripple parameters {strength, radius, frequency}
 */
export const calculateRippleParams = (handPos, velocity, visibility = 1) => {
  const baseStrength = Math.min(velocity * 2, 1.0);
  const visibilityMultiplier = Math.max(visibility, 0.1);
  
  return {
    strength: baseStrength * visibilityMultiplier,
    radius: 0.2 + velocity * 0.3, // Larger radius for faster movement
    frequency: 15 + velocity * 10, // Higher frequency for faster movement
    speed: 1.5 + velocity * 1.0 // Wave propagation speed
  };
};
