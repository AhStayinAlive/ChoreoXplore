import { create } from 'zustand';

// Create a separate store for Irina system
const useVisStore = create((set, get) => ({
  music: { rms: 0, energy: 0, centroid: 0, bpmish: 0 },
  motion: null,
  isActive: false, // Global toggle for Irina visuals
  params: { 
    speed: 1.2, 
    intensity: 0.8, 
    hue: 210, 
    musicReact: 0.9,  // Restored to original value
    motionReact: 0.9, 
    mode: "quand_cest",
    // New hand effect settings
    handEffect: {
      type: 'none',           // 'none' | 'ripple' | 'smoke'
      handSelection: 'none',  // 'none' | 'left' | 'right' | 'both'
      motionReactive: true,   // when false, visual modes become static but hand effects still respond to motion
      
      // Ripple effect settings
      ripple: {
        baseColor: '#00ccff',
        rippleColor: '#ff00cc',
        radius: 0.1,
        intensity: 0.8
      },
      
      // Smoke effect settings
      smoke: {
        color: '#ffffff',
        intensity: 0.7,
        radius: 0.8,
        velocitySensitivity: 1.0,
        trailLength: 0.5
      },
      
      // Fluid distortion effect settings
      fluidDistortion: {
        fluidColor: '#005eff',
        intensity: 1,
        force: 1.5,
        distortion: 1,
        radius: 0.1,
        curl: 6,
        swirl: 0,
        velocityDissipation: 0.99,
        rainbow: false
      }
    }
  },
  setMusic: (music) => set({ music }),
  setMotion: (motion) => set({ motion }),
  setIsActive: (isActive) => set({ isActive }),
  setParams: (p) => set(s => ({ params: { ...s.params, ...p } })),
}));

export { useVisStore };
