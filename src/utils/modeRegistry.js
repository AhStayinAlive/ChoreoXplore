/**
 * Visual Mode Registry
 * Provides a modular system for registering and managing visual modes
 */

const modeRegistry = new Map();

/**
 * Register a new visual mode
 * @param {string} name - Unique mode identifier
 * @param {Object} config - Mode configuration
 * @param {Function} config.factory - Factory function that returns the mode component
 * @param {string} config.displayName - Human-readable name for the UI
 * @param {Array} config.controls - Array of control definitions
 * @returns {void}
 */
export function registerMode(name, config) {
  if (modeRegistry.has(name)) {
    console.warn(`Mode "${name}" is already registered. Overwriting.`);
  }
  
  if (!config.factory || typeof config.factory !== 'function') {
    throw new Error(`Mode "${name}" must have a factory function`);
  }
  
  modeRegistry.set(name, {
    name,
    displayName: config.displayName || name,
    factory: config.factory,
    controls: config.controls || [],
    description: config.description || '',
  });
}

/**
 * Get a mode configuration by name
 * @param {string} name - Mode identifier
 * @returns {Object|null} - Mode configuration or null if not found
 */
export function getMode(name) {
  return modeRegistry.get(name) || null;
}

/**
 * Get all registered modes
 * @returns {Array} - Array of mode configurations
 */
export function getAllModes() {
  return Array.from(modeRegistry.values());
}

/**
 * Check if a mode is registered
 * @param {string} name - Mode identifier
 * @returns {boolean}
 */
export function hasMode(name) {
  return modeRegistry.has(name);
}

/**
 * Unregister a mode
 * @param {string} name - Mode identifier
 * @returns {boolean} - True if mode was removed
 */
export function unregisterMode(name) {
  return modeRegistry.delete(name);
}

/**
 * Clear all registered modes
 */
export function clearModes() {
  modeRegistry.clear();
}
