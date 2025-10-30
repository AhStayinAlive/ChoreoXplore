// Hand tracking utilities for fluid ripple effect

/**
 * Extract left hand position from MediaPipe landmarks
 * Uses pinky tip for most accurate end-of-hand tracking, with forward offset
 * @param {Array} landmarks - MediaPipe pose landmarks array
 * @returns {Object|null} - Hand position {x, y, z, visibility} or null if not found
 */
export const getLeftHandPosition = (landmarks) => {
  if (!landmarks || landmarks.length < 33) {
    return null;
  }
  
  // Try pinky tip (17), then index tip (19), fallback to wrist (15)
  const leftPinky = landmarks[17]; // Left pinky tip
  const leftIndex = landmarks[19]; // Left index finger tip
  const leftWrist = landmarks[15]; // Left wrist (fallback)
  
  // Use pinky if visible (most accurate for hand endpoint), otherwise index, otherwise wrist
  let handPoint = null;
  let useWrist = false;
  if (leftPinky && leftPinky.visibility > 0.1) {
    handPoint = leftPinky;
  } else if (leftIndex && leftIndex.visibility > 0.1) {
    handPoint = leftIndex;
  } else {
    handPoint = leftWrist;
    useWrist = true;
  }
  
  if (!handPoint || handPoint.visibility < 0.1) {
    return null;
  }
  
  // Calculate direction vector from wrist to hand point for offset
  const wrist = landmarks[15];
  let offsetX = 0;
  let offsetY = 0;
  
  if (wrist && !useWrist) {
    // Calculate direction from wrist to hand point
    const dx = handPoint.x - wrist.x;
    const dy = handPoint.y - wrist.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    
    if (length > 0.01) {
      // Extend 30% beyond the hand point in the same direction
      const extendFactor = 0.3;
      offsetX = (dx / length) * length * extendFactor;
      offsetY = (dy / length) * length * extendFactor;
    }
  }
  
  return {
    x: handPoint.x + offsetX,
    y: handPoint.y + offsetY,
    z: handPoint.z,
    visibility: handPoint.visibility
  };
};

/**
 * Extract right hand position from MediaPipe landmarks
 * Uses pinky tip for most accurate end-of-hand tracking, with forward offset
 * @param {Array} landmarks - MediaPipe pose landmarks array
 * @returns {Object|null} - Hand position {x, y, visibility} or null if not found
 */
export const getRightHandPosition = (landmarks) => {
  if (!landmarks || landmarks.length < 33) {
    return null;
  }
  
  // Try pinky tip (18), then index tip (20), fallback to wrist (16)
  const rightPinky = landmarks[18]; // Right pinky tip
  const rightIndex = landmarks[20]; // Right index finger tip
  const rightWrist = landmarks[16]; // Right wrist (fallback)
  
  // Use pinky if visible (most accurate for hand endpoint), otherwise index, otherwise wrist
  let handPoint = null;
  let useWrist = false;
  if (rightPinky && rightPinky.visibility > 0.1) {
    handPoint = rightPinky;
  } else if (rightIndex && rightIndex.visibility > 0.1) {
    handPoint = rightIndex;
  } else {
    handPoint = rightWrist;
    useWrist = true;
  }
  
  if (!handPoint || handPoint.visibility < 0.1) {
    return null;
  }
  
  // Calculate direction vector from wrist to hand point for offset
  const wrist = landmarks[16];
  let offsetX = 0;
  let offsetY = 0;
  
  if (wrist && !useWrist) {
    // Calculate direction from wrist to hand point
    const dx = handPoint.x - wrist.x;
    const dy = handPoint.y - wrist.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    
    if (length > 0.01) {
      // Extend 30% beyond the hand point in the same direction
      const extendFactor = 0.3;
      offsetX = (dx / length) * length * extendFactor;
      offsetY = (dy / length) * length * extendFactor;
    }
  }
  
  return {
    x: handPoint.x + offsetX,
    y: handPoint.y + offsetY,
    z: handPoint.z,
    visibility: handPoint.visibility
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
  
  // Calculate and return raw velocity with minimal scaling
  const velocity = distance / deltaTime;
  return Math.min(velocity * 0.15, 1.0);
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
export const smoothHandPosition = (currentPos, smoothedPos, smoothingFactor = 0.6) => {
  if (!currentPos) return smoothedPos || { x: 0.5, y: 0.5 };
  if (!smoothedPos) return currentPos;
  
  // Use higher smoothing factor for more immediate response
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
