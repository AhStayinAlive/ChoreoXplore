import { create } from 'zustand';

// Create a separate store for Irina system
const useVisStore = create((set, get) => ({
  music: { rms: 0, energy: 0, centroid: 0, bpmish: 0 },
  motion: null,
  isActive: false, // Global toggle for Irina visuals
  // Shader FX control (cursor/pose) and reactivity sliders
  fxMode: 'cursor', // 'cursor' | 'pose'
  params: { 
    speed: 0.6, 
    intensity: 0.8, 
    hue: 210, 
    musicReact: 0.9,  // Music reactivity (0..1)
    motionReact: 0.9, // Motion reactivity (0..1)
    mode: "auto" 
  },
  setMusic: (music) => set({ music }),
  setMotion: (motion) => set({ motion }),
  setIsActive: (isActive) => set({ isActive }),
  setFxMode: (fxMode) => set({ fxMode }),
  setParams: (p) => set(s => ({ params: { ...s.params, ...p } })),
}));

export { useVisStore };
