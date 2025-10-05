import { create } from "zustand";

const allowedAngles = [0, 15, 22.5, 30, 45, 60, 75, 90, 105, 120, 135];

const useStore = create((set, get) => ({
  mode: "author", // "performance" | "author"
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
}));

export default useStore;

