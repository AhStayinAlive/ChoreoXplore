import { create } from "zustand";

const allowedAngles = [0, 15, 22.5, 30, 45, 60, 75, 90, 105, 120, 135];

const useStore = create((set, get) => ({
  mode: "welcome", // "welcome" | "performance" | "choreoxplore"
  fps: 0,
  palette: ["#0A0A0C", "#EDEEF2", "#5FA8FF"],

  // User-selected colors
  userColors: {
    bgColor: '#000000', // Default black
    assetColor: '#ffffff' // Default white
  },
  setUserColors: (colors) => set({ userColors: colors }),

  constraints: {
    allowedAngles,
    strokePx: [1, 8],
    contrastMinRatio: 7.0,
    spawnMaxPerSec: 12,
  },

  routes: [],
  setRoutes: (routes) => set({ routes }),

  sceneNodes: [],
  setSceneNodes: (nodes) => set({ sceneNodes: nodes }),

  setFPS: (fps) => set({ fps }),
  setMode: (mode) => set({ mode }),

  // Song data for the input mode
  songData: null,
  setSongData: (songData) => set({ songData }),

  // presets
  currentPreset: null,
  setPreset: (p) => set((state) => ({
    currentPreset: p,
    palette: Array.isArray(p?.style?.palette) ? p.style.palette : state.palette,
  })),

  // reactivity gains
  reactivity: {
    audioGain: 1.0,
    poseGain: 1.0,
    enabled: true,
  },
  setReactivity: (fn) =>
    set((state) => ({
      reactivity: { ...state.reactivity, ...fn(state.reactivity) },
    })),

  // cue stack
  cues: [],
  addCue: (cue) => set((state) => ({ cues: [...state.cues, cue] })),

  // pose data for motion distortion
  poseData: null,
  setPoseData: (poseData) => set({ poseData }),
  
  // Motion capture state
  motionCaptureActive: false,
  setMotionCaptureActive: (active) => set({ motionCaptureActive: active }),
  
  // Skeleton visibility state
  skeletonVisible: true,
  setSkeletonVisible: (visible) => set({ skeletonVisible: visible }),
  
  // Ambient animation parameters
  ambientAnimationParams: {
    isActive: true,
    effectType: 'waterRipple',
    speed: 1.0,
    amplitude: 0.5,
    wavelength: 1.0,
    intensity: 0.3,
    audioReactive: true,
    audioSensitivity: 0.5,
    audioBassInfluence: 0.7,
    audioMidInfluence: 0.5,
    audioHighInfluence: 0.3
  },
  setAmbientAnimationParams: (params) => set({ ambientAnimationParams: params }),


  // ChoreoXplore mode state
  choreoxploreMode: {
    music: { rms: 0, energy: 0, centroid: 0, bpmish: 0 },
    motion: null,
    params: { 
      speed: 0.6, 
      intensity: 0.8, 
      hue: 210, 
      musicReactivity: 0.9, 
      motionReactivity: 0.9, 
      mode: "auto" // "auto" | "lines" | "surfaces" | "volumes"
    }
  },
  setChoreoXploreMode: (fn) => set((state) => ({
    choreoxploreMode: { ...state.choreoxploreMode, ...fn(state.choreoxploreMode) }
  })),

  // Setup wizard state
  setupStep: 1,
  songSearched: false, // Track if user has searched for a song
  setSetupStep: (step) => set({ setupStep: step }),
  setSongSearched: (searched) => set({ songSearched: searched }),
  advanceToStep: (targetStep) => {
    const current = get().setupStep;
    if (targetStep > current) {
      set({ setupStep: targetStep });
    }
  },
  resetWizard: () => set({ setupStep: 1, songSearched: false }),
}));

// Helper function to convert hex color to hue value
export const hexToHue = (hex) => {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  
  let h = 0;
  if (delta !== 0) {
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
  }
  
  return Math.round(h * 60);
};

// Convert hex color to RGB values (0-1 range)
export const hexToRGB = (hex) => {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return { r, g, b };
};

export default useStore;

