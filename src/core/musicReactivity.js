import { BehaviorSubject } from "rxjs";
import { audio$ } from "./audio.js";

// Music reactivity system that maps audio features to visual parameters
export const musicReactivity$ = new BehaviorSubject({
  // Visual parameters controlled by music
  speedMultiplier: 1.0,
  amplitudeMultiplier: 1.0,
  colorIntensity: 0.0,
  pulsationStrength: 0.0,
  distortionIntensity: 0.0,
  rotationSpeed: 0.0,
  
  // Music analysis data
  currentTempo: 0,
  beatStrength: 0,
  rhythmComplexity: 0,
  bassLevel: 0,
  midLevel: 0,
  trebleLevel: 0,
  
  // Reactivity settings
  enabled: true,
  sensitivity: 1.0,
  smoothing: 0.8
});

// Reactivity mapping functions
const musicMappings = {
  // Speed modulation based on tempo and beat strength
  speedMapping: (audioData) => {
    const baseSpeed = 1.0;
    const tempoFactor = audioData.tempo > 0 ? Math.min(2.0, audioData.tempo / 120) : 1.0;
    const beatFactor = 1.0 + (audioData.beatStrength * 0.5);
    return baseSpeed * tempoFactor * beatFactor;
  },

  // Amplitude modulation based on overall energy and bass
  amplitudeMapping: (audioData) => {
    const baseAmplitude = 1.0;
    const energyFactor = 1.0 + (audioData.overallEnergy * 0.8);
    const bassFactor = 1.0 + (audioData.bassEnergy * 0.6);
    return baseAmplitude * energyFactor * bassFactor;
  },

  // Color intensity based on treble and mid frequencies
  colorIntensityMapping: (audioData) => {
    const trebleFactor = audioData.trebleEnergy * 0.7;
    const midFactor = audioData.midEnergy * 0.5;
    return Math.min(1.0, trebleFactor + midFactor);
  },

  // Pulsation based on beat strength and rhythm
  pulsationMapping: (audioData) => {
    const beatPulse = audioData.beatStrength * 0.8;
    const rhythmPulse = audioData.rhythmPattern?.complexity || 0;
    return Math.min(1.0, beatPulse + (rhythmPulse * 0.3));
  },

  // Distortion intensity based on overall energy and rhythm complexity
  distortionMapping: (audioData) => {
    const energyDistortion = audioData.overallEnergy * 0.6;
    const rhythmDistortion = audioData.rhythmPattern?.complexity || 0;
    return Math.min(1.0, energyDistortion + (rhythmDistortion * 0.4));
  },

  // Rotation speed based on tempo and rhythm density
  rotationMapping: (audioData) => {
    const tempoRotation = audioData.tempo > 0 ? (audioData.tempo / 200) : 0;
    const rhythmRotation = audioData.rhythmPattern?.density || 0;
    return Math.min(1.0, tempoRotation + (rhythmRotation * 0.5));
  }
};

// Smoothing function for gradual parameter changes
function smoothValue(current, target, smoothing) {
  return current + (target - current) * (1 - smoothing);
}

// Main music reactivity processor
function processMusicReactivity(audioData) {
  const currentState = musicReactivity$.value;
  
  if (!currentState.enabled) {
    return currentState;
  }

  // Calculate new values using mappings
  const newSpeedMultiplier = musicMappings.speedMapping(audioData);
  const newAmplitudeMultiplier = musicMappings.amplitudeMapping(audioData);
  const newColorIntensity = musicMappings.colorIntensityMapping(audioData);
  const newPulsationStrength = musicMappings.pulsationMapping(audioData);
  const newDistortionIntensity = musicMappings.distortionMapping(audioData);
  const newRotationSpeed = musicMappings.rotationMapping(audioData);

  // Apply smoothing to prevent jarring changes
  const smoothing = currentState.smoothing;
  const sensitivity = currentState.sensitivity;

  const smoothedState = {
    ...currentState,
    
    // Apply sensitivity scaling
    speedMultiplier: smoothValue(
      currentState.speedMultiplier, 
      newSpeedMultiplier * sensitivity, 
      smoothing
    ),
    amplitudeMultiplier: smoothValue(
      currentState.amplitudeMultiplier, 
      newAmplitudeMultiplier * sensitivity, 
      smoothing
    ),
    colorIntensity: smoothValue(
      currentState.colorIntensity, 
      newColorIntensity * sensitivity, 
      smoothing
    ),
    pulsationStrength: smoothValue(
      currentState.pulsationStrength, 
      newPulsationStrength * sensitivity, 
      smoothing
    ),
    distortionIntensity: smoothValue(
      currentState.distortionIntensity, 
      newDistortionIntensity * sensitivity, 
      smoothing
    ),
    rotationSpeed: smoothValue(
      currentState.rotationSpeed, 
      newRotationSpeed * sensitivity, 
      smoothing
    ),

    // Update music analysis data
    currentTempo: audioData.tempo,
    beatStrength: audioData.beatStrength,
    rhythmComplexity: audioData.rhythmPattern?.complexity || 0,
    bassLevel: audioData.bassEnergy,
    midLevel: audioData.midEnergy,
    trebleLevel: audioData.trebleEnergy
  };

  return smoothedState;
}

// Subscribe to audio data and update music reactivity
let audioSubscription = null;

export function startMusicReactivity() {
  if (audioSubscription) return;
  
  audioSubscription = audio$.subscribe(audioData => {
    const newReactivityState = processMusicReactivity(audioData);
    musicReactivity$.next(newReactivityState);
  });
}

export function stopMusicReactivity() {
  if (audioSubscription) {
    audioSubscription.unsubscribe();
    audioSubscription = null;
  }
}

// Control functions for music reactivity settings
export function setMusicReactivityEnabled(enabled) {
  const currentState = musicReactivity$.value;
  musicReactivity$.next({ ...currentState, enabled });
}

export function setMusicReactivitySensitivity(sensitivity) {
  const currentState = musicReactivity$.value;
  musicReactivity$.next({ ...currentState, sensitivity: Math.max(0, Math.min(2, sensitivity)) });
}

export function setMusicReactivitySmoothing(smoothing) {
  const currentState = musicReactivity$.value;
  musicReactivity$.next({ ...currentState, smoothing: Math.max(0, Math.min(1, smoothing)) });
}

// Preset configurations for different music styles
export const musicReactivityPresets = {
  subtle: {
    enabled: true,
    sensitivity: 0.5,
    smoothing: 0.9
  },
  moderate: {
    enabled: true,
    sensitivity: 1.0,
    smoothing: 0.8
  },
  intense: {
    enabled: true,
    sensitivity: 1.5,
    smoothing: 0.6
  },
  extreme: {
    enabled: true,
    sensitivity: 2.0,
    smoothing: 0.4
  }
};

export function applyMusicReactivityPreset(presetName) {
  const preset = musicReactivityPresets[presetName];
  if (preset) {
    const currentState = musicReactivity$.value;
    musicReactivity$.next({ ...currentState, ...preset });
  }
}

// Utility functions for getting specific reactivity values
export function getSpeedMultiplier() {
  return musicReactivity$.value.speedMultiplier;
}

export function getAmplitudeMultiplier() {
  return musicReactivity$.value.amplitudeMultiplier;
}

export function getColorIntensity() {
  return musicReactivity$.value.colorIntensity;
}

export function getPulsationStrength() {
  return musicReactivity$.value.pulsationStrength;
}

export function getDistortionIntensity() {
  return musicReactivity$.value.distortionIntensity;
}

export function getRotationSpeed() {
  return musicReactivity$.value.rotationSpeed;
}


