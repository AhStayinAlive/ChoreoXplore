import { create } from 'zustand';
import type { AudioFeatures } from '../engine/audioFeatures';
import type { MotionFeatures } from '../engine/poseFeatures';

type VisState = {
  music: AudioFeatures;
  motion: MotionFeatures | null;
  params: {
    speed: number; intensity: number; colorHue: number;
    musicReactivity: number; motionReactivity: number;
    mode: 'lines'|'surfaces'|'volumes';
  };
  setMusic: (m: AudioFeatures)=>void;
  setMotion: (m: MotionFeatures)=>void;
  setParams: (p: Partial<VisState['params']>)=>void;
};

export const useVisStore = create<VisState>((set)=>({
  music: { rms:0, energy:0, centroid:0, bpmish:0 },
  motion: null,
  params: { speed:0.6, intensity:0.7, colorHue:210, musicReactivity:0.8, motionReactivity:0.9, mode:'lines' },
  setMusic: (music)=>set({ music }),
  setMotion: (motion)=>set({ motion }),
  setParams: (p)=>set(s=>({ params: { ...s.params, ...p } })),
}));

