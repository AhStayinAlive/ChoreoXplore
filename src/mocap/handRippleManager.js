import * as THREE from 'three';

/**
 * Hand ripple manager - converts world positions to screen UVs and spawns ripples
 */

const DEFAULT_VELOCITY_SCALE = 1.0;
const DEFAULT_PRESSURE_SCALE = 0.5;

/**
 * Convert world position to screen UV coordinates
 * @param {THREE.Vector3} worldPos - Position in world space
 * @param {THREE.Camera} camera - Camera for projection
 * @param {WebGLRenderer} renderer - Renderer for viewport dimensions
 * @returns {THREE.Vector2|null} - Screen UV (0-1) or null if behind camera
 */
export function worldToScreenUV(worldPos, camera, renderer) {
  if (!worldPos || !camera || !renderer) return null;
  
  // Clone position and project to screen space
  const vector = worldPos.clone();
  vector.project(camera);
  
  // Check if behind camera
  if (vector.z > 1) return null;
  
  // Convert from NDC (-1 to 1) to UV (0 to 1)
  const uv = new THREE.Vector2(
    (vector.x + 1) / 2,
    (1 - vector.y) / 2  // Flip Y for UV space
  );
  
  return uv;
}

/**
 * Spawn a ripple based on hand palm contact
 * @param {HandRipplePass} ripplePass - The ripple pass instance
 * @param {THREE.Vector3} worldPos - Palm position in world space
 * @param {THREE.Camera} camera - Camera for projection
 * @param {WebGLRenderer} renderer - Renderer for viewport
 * @param {number} velocity - Hand velocity magnitude (0-1)
 * @param {number} pressure - Optional pressure value (0-1)
 * @param {object} options - Optional scaling factors
 */
export function spawnHandRipple(ripplePass, worldPos, camera, renderer, velocity = 0, pressure = 0, options = {}) {
  const velocityScale = options.velocityScale ?? DEFAULT_VELOCITY_SCALE;
  const pressureScale = options.pressureScale ?? DEFAULT_PRESSURE_SCALE;
  
  // Convert world position to screen UV
  const screenUV = worldToScreenUV(worldPos, camera, renderer);
  if (!screenUV) return; // Skip if behind camera
  
  // Map amplitude from velocity and pressure
  const amplitude = Math.max(0, Math.min(1.5,
    Math.abs(velocity) * velocityScale + pressure * pressureScale
  ));
  
  // Add ripple to pass
  ripplePass.addRipple(screenUV, amplitude);
}

/**
 * Check if palm is contacting a surface (simple distance-to-plane threshold)
 * @param {THREE.Vector3} palmPos - Palm position in world space
 * @param {number} threshold - Distance threshold for contact (default: 0.5)
 * @returns {boolean} - True if palm is near ground plane
 */
export function isPalmContactingSurface(palmPos, threshold = 0.5) {
  if (!palmPos) return false;
  
  // Simple Y-axis distance check (assumes ground at y=0)
  return Math.abs(palmPos.y) < threshold;
}

/**
 * Extract palm position from MediaPipe landmarks (using wrist as proxy)
 * @param {Array} landmarks - MediaPipe landmarks array
 * @param {string} hand - 'left' or 'right'
 * @param {number} scale - Scene scale factor
 * @returns {THREE.Vector3|null} - Palm position in world space
 */
export function getPalmWorldPosition(landmarks, hand = 'left', scale = 22) {
  if (!landmarks || landmarks.length < 33) return null;
  
  const wristIndex = hand === 'left' ? 15 : 16;
  const wrist = landmarks[wristIndex];
  
  if (!wrist || wrist.visibility < 0.3) return null;
  
  // Convert MediaPipe normalized coords to scene coords (matching SimpleSkeleton)
  const x = (wrist.x - 0.5) * 200 * scale;
  const y = (0.5 - wrist.y) * 200 * scale;
  const z = (wrist.z || 0) * 200 * scale + 2; // Offset Z to match scene depth
  
  return new THREE.Vector3(x, y, z);
}
