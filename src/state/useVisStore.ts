import { create } from 'zustand';
export type AudioFeatures = { rms:number; energy:number; centroid:number; bpmish:number };
export type MotionFeatures = {
  elbowL:number; elbowR:number; kneeL:number; kneeR:number;
  armSpan:number; speed:number; sharpness:number;
};
type VisState = {
  music: AudioFeatures;
  motion: MotionFeatures | null;
  params: {
    speed:number; intensity:number; colorHue:number;
    musicReactivity:number; motionReactivity:number;
  };
  setMusic:(m:AudioFeatures)=>void;
  setMotion:(m:MotionFeatures)=>void;
  setParams:(p:Partial<VisState['params']>)=>void;
};
export const useVisStore = create<VisState>((set)=>({
  music:{ rms:0, energy:0, centroid:0, bpmish:0 },
  motion:null,
  params:{ speed:0.6, intensity:0.7, colorHue:210, musicReactivity:0.8, motionReactivity:0.9 },
  setMusic:(music)=>set({music}),
  setMotion:(motion)=>set({motion}),
  setParams:(p)=>set(s=>({ params:{...s.params, ...p} })),
}));

