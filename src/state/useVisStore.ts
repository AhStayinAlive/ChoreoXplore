import { singleton, createZustand } from "./store-singleton";
export type AudioFeatures = { rms:number; energy:number; centroid:number; bpmish:number };
export type MotionFeatures = { elbowL:number; elbowR:number; kneeL:number; kneeR:number; armSpan:number; speed:number; sharpness:number };

type VisState = {
  music: AudioFeatures; motion: MotionFeatures | null;
  params: { speed:number; intensity:number; hue:number; musicReact:number; motionReact:number; mode:"auto"|"lines"|"surfaces"|"volumes" };
  setMusic:(m:AudioFeatures)=>void; setMotion:(m:MotionFeatures)=>void; setParams:(p:Partial<VisState["params"]>)=>void;
};

export const useVisStore = singleton("visStore", () =>
  createZustand<VisState>((set)=>({
    music:{ rms:0, energy:0, centroid:0, bpmish:0 },
    motion:null,
    params:{ speed:0.6, intensity:0.8, hue:210, musicReact:0.9, motionReact:0.9, mode:"auto" },
    setMusic:(music)=>set({ music }),
    setMotion:(motion)=>set({ motion }),
    setParams:(p)=>set(s=>({ params:{ ...s.params, ...p } })),
  }))
);

