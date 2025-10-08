import { create } from "zustand";

const allowedAngles = [0, 15, 22.5, 30, 45, 60, 75, 90, 105, 120, 135];

const useStore = create((set, get) => ({
  mode: "generative", // "performance" | "generative" | "author" | "irina"
  fps: 0,
  palette: ["#0A0A0C", "#EDEEF2", "#5FA8FF"],

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
    intensity: 0.3
  },
  setAmbientAnimationParams: (params) => set({ ambientAnimationParams: params }),

  // author mode state
  authorMode: {
    lyrics: "",
    sentimentAnalysis: null,
    promptTemplate: {
      userConcept: "",
      artStyle: "digital painting",
      lightingMood: "soft warm lighting",
      colorTone: "warm tones (reds, oranges, golds)",
      compositionLayout: "layered depth",
      emotionalTheme: "joy / celebration"
    },
    finalPrompt: "",
    negativePrompt: "no stage, no curtains, no performers, no spotlights, no instruments, no props, no crowd, no signs, no text, no vehicles, no faces, no humanoid forms, no animals, no hands, no surreal distortions, no floating objects, no AI logos, no abstract symbols unless described, no frame borders, no watermarks, no signature."
  },
  setAuthorMode: (fn) => set((state) => ({
    authorMode: { ...state.authorMode, ...fn(state.authorMode) }
  })),

  // Irina Angles mode state
  irinaMode: {
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
  setIrinaMode: (fn) => set((state) => ({
    irinaMode: { ...state.irinaMode, ...fn(state.irinaMode) }
  })),
}));

export default useStore;

