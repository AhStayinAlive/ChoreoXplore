import { create } from 'zustand';

// Create a separate store for Irina system
const useVisStore = create((set, get) => ({
  music: { rms: 0, energy: 0, centroid: 0, bpmish: 0 },
  motion: null,
  isActive: false, // Global toggle for Irina visuals
  params: { 
    speed: 0.6, 
    intensity: 0.8, 
    hue: 210, 
    musicReact: 0.9,  // Restored to original value
    motionReact: 0.9, 
    mode: "auto",
    // New hand ripple settings
    handRipple: {
      enabled: false,        // Keep for backward compatibility (global enable)
      leftHandEnabled: false,
      rightHandEnabled: false,
      baseColor: '#00ccff', // Cyan
      rippleColor: '#ff00cc', // Magenta
      radius: 0.4,
      intensity: 0.8
    }
  },
  setMusic: (music) => set({ music }),
  setMotion: (motion) => set({ motion }),
  setIsActive: (isActive) => set({ isActive }),
  setParams: (p) => set(s => ({ params: { ...s.params, ...p } })),
}));

export { useVisStore };
