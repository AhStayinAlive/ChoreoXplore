/**
 * Auto-throttle utility for FPS management
 * Reduces visual complexity when FPS drops below threshold
 */

import useStore from '../core/store';

class AutoThrottle {
  constructor() {
    this.fpsThreshold = 50;
    this.fpsHistory = [];
    this.maxHistoryLength = 60; // 1 second of history at 60fps
    this.throttleLevel = 0; // 0 = no throttle, 1 = max throttle
  }
  
  updateFPS(fps) {
    this.fpsHistory.push(fps);
    if (this.fpsHistory.length > this.maxHistoryLength) {
      this.fpsHistory.shift();
    }
    
    // Calculate average FPS
    const avgFPS = this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length;
    
    // Adjust throttle level based on FPS
    if (avgFPS < this.fpsThreshold) {
      // Increase throttle
      const deficit = (this.fpsThreshold - avgFPS) / this.fpsThreshold;
      this.throttleLevel = Math.min(1, this.throttleLevel + deficit * 0.1);
    } else {
      // Decrease throttle
      this.throttleLevel = Math.max(0, this.throttleLevel - 0.05);
    }
  }
  
  getThrottleLevel() {
    return this.throttleLevel;
  }
  
  /**
   * Calculate reduced instance count based on throttle level
   * @param {number} baseCount - The base instance count
   * @param {number} minCount - The minimum instance count
   * @returns {number} - The throttled instance count
   */
  getInstanceCount(baseCount, minCount = 10) {
    const reduction = this.throttleLevel * (baseCount - minCount);
    return Math.max(minCount, Math.floor(baseCount - reduction));
  }
  
  /**
   * Calculate reduced iterations based on throttle level
   * @param {number} baseIterations - The base iteration count
   * @param {number} minIterations - The minimum iteration count
   * @returns {number} - The throttled iteration count
   */
  getIterations(baseIterations, minIterations = 1) {
    const reduction = this.throttleLevel * (baseIterations - minIterations);
    return Math.max(minIterations, Math.floor(baseIterations - reduction));
  }
  
  /**
   * Determine if an expensive operation should be skipped
   * @param {number} frequency - How often to run (0-1, where 1 = always, 0.5 = 50% of time)
   * @returns {boolean} - Whether to skip this frame
   */
  shouldSkipFrame(frequency = 1.0) {
    const threshold = frequency * (1 - this.throttleLevel * 0.5);
    return Math.random() > threshold;
  }
}

// Singleton instance
export const autoThrottle = new AutoThrottle();

// Hook into FPS updates
let unsubscribe = null;
export function initAutoThrottle() {
  if (unsubscribe) return;
  
  // Subscribe to FPS updates from store
  unsubscribe = useStore.subscribe(
    (state) => state.fps,
    (fps) => {
      if (fps > 0) {
        autoThrottle.updateFPS(fps);
      }
    }
  );
}

export function cleanupAutoThrottle() {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
}
