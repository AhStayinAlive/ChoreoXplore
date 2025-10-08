import React from 'react';
import { Canvas } from '@react-three/fiber';
import { IrinaAngles } from './visuals/IrinaAngles';
import { useEffect } from 'react';
import { useVisStore } from './state/useVisStore';
import { audio$, attachAudio } from './engine/audioFeatures';
import { computeMotionFeatures } from './engine/poseFeatures';

export default function AppAngles(){
  const setMusic = useVisStore(s=>s.setMusic);
  const setMotion = useVisStore(s=>s.setMotion);

  useEffect(()=>{
    const sub = audio$.subscribe(setMusic);
    const el = document.querySelector<HTMLMediaElement>('#player');
    if (el) attachAudio(el);
    else navigator.mediaDevices.getUserMedia({ audio: true }).then(attachAudio);
    return ()=>sub.unsubscribe();
  }, [setMusic]);

  useEffect(()=>{
    (window as any).__onPose = (mp:any)=>{
      const motion = computeMotionFeatures({
        landmarks: mp.landmarks ?? mp,
        timestamp: performance.now()
      });
      setMotion(motion);
    };
  }, [setMotion]);

  return (
    <>
      <Canvas orthographic camera={{ zoom: 500, position: [0,0,10] }}>
        <IrinaAngles />
      </Canvas>

      <div className="fixed bottom-4 left-4 z-50 bg-white/70 backdrop-blur rounded-xl p-3 space-x-3">
        <label>Hue <input type="range" min={0} max={360}
          onChange={e=>useVisStore.getState().setParams({ colorHue: Number(e.target.value) })} /></label>
        <label>Music <input type="range" min={0} max={1} step={0.01} defaultValue={0.8}
          onChange={e=>useVisStore.getState().setParams({ musicReactivity: Number(e.target.value) })}/></label>
        <label>Motion <input type="range" min={0} max={1} step={0.01} defaultValue={0.9}
          onChange={e=>useVisStore.getState().setParams({ motionReactivity: Number(e.target.value) })}/></label>
      </div>

      {/* <audio id="player" src="/test.mp3" controls autoPlay></audio> */}
    </>
  );
}

