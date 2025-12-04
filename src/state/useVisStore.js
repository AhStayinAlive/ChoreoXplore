import { create } from 'zustand';

// Create a separate store for Irina system
const useVisStore = create((set, get) => ({
  music: { rms: 0, energy: 0, centroid: 0, bpmish: 0 },
  motion: null,
  isActive: true, // Global toggle for Irina visuals - always enabled
  params: { 
    speed: 1.2, 
    intensity: 0.8, 
    hue: 210, 
    musicReact: 0.9,  // Restored to original value
    motionReact: 0.9, 
    mode: "empty",
    // New hand effect settings
    handEffect: {
      type: 'none',           // 'none' | 'ripple' | 'smoke' | 'fluidDistortion' | 'particleTrail'
      handSelection: 'none',  // 'none' | 'left' | 'right' | 'both'
      motionReactive: true,   // when false, visual modes become static but hand effects still respond to motion
      showQuickView: false,   // whether to show the quick preview of hand effects
      previewPosition: null,  // {x, y} position of draggable preview window
      
      // Ripple effect settings
      ripple: {
        baseColor: '#00ccff',
        rippleColor: '#ff00cc',
        radius: 0.12,
        intensity: 0.8
      },
      
      // Smoke effect settings
      smoke: {
        color: '#ffffff',
        intensity: 0.7,
        radius: 1.0,
        velocitySensitivity: 1.0,
        trailLength: 0.5
      },
      
      // Fluid distortion effect settings
      fluidDistortion: {
        fluidColor: '#005eff',
        intensity: 1,
        force: 1.5,
        distortion: 1,
        radius: 0.5,
        curl: 6,
        swirl: 1,
        velocityDissipation: 0.99,
        rainbow: false
      },
      
      // Particle trail effect settings
      particleTrail: {
        color: '#00ffff',
        intensity: 0.8,
        particleSize: 0.10,
        trailLength: 50,
        fadeSpeed: 0.95
      }
    }
  },
  setMusic: (music) => set({ music }),
  setMotion: (motion) => set({ motion }),
  setIsActive: (isActive) => set({ isActive }),
  setParams: (p) => {
    const result = set(s => {
      // Deep merge handEffect to preserve nested properties
      const newParams = { ...s.params };
      
      if (p.handEffect) {
        newParams.handEffect = {
          ...s.params.handEffect,
          ...p.handEffect,
          // Deep merge nested effect settings
          ripple: p.handEffect.ripple 
            ? { ...(s.params.handEffect?.ripple || {}), ...p.handEffect.ripple }
            : s.params.handEffect?.ripple,
          smoke: p.handEffect.smoke
            ? { ...(s.params.handEffect?.smoke || {}), ...p.handEffect.smoke }
            : s.params.handEffect?.smoke,
          fluidDistortion: p.handEffect.fluidDistortion
            ? { ...(s.params.handEffect?.fluidDistortion || {}), ...p.handEffect.fluidDistortion }
            : s.params.handEffect?.fluidDistortion,
          particleTrail: p.handEffect.particleTrail
            ? { ...(s.params.handEffect?.particleTrail || {}), ...p.handEffect.particleTrail }
            : s.params.handEffect?.particleTrail,
        };
        delete p.handEffect; // Remove it so we don't spread it again
      }
      
      // Merge any other params
      Object.assign(newParams, p);
      
      return { params: newParams };
    });
    return result;
  },
}));

export { useVisStore };
