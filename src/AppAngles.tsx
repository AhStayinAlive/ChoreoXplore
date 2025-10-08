import React from 'react';
import { Canvas } from '@react-three/fiber';
import IrinaSystem from './visuals/IrinaSystem';
import MotionInputPanel from './components/MotionInputPanel';
import { useEffect } from 'react';
import { useVisStore } from './state/useVisStore';
import { audio$, attachAudio } from './engine/audioFeatures';
import { computeMotionFeatures } from './engine/poseFeatures';

class R3FBoundary extends React.Component<React.PropsWithChildren, {err?:Error}> {
  state = { err: undefined as any };
  static getDerivedStateFromError(err: Error) { return { err }; }
  render() { return this.state.err ? null : this.props.children; }
}

export default function AppAngles(){
  const setMusic = useVisStore(s=>s.setMusic);
  const setMotion = useVisStore(s=>s.setMotion);

  useEffect(()=>{
    const sub = audio$.subscribe(setMusic);
    let detach: (()=>void) | undefined;
    (async () => {
      const el = document.querySelector<HTMLMediaElement>('#player');
      if (el) detach = await attachAudio(el);
      else {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        detach = await attachAudio(stream);
      }
    })();
    return ()=>{ sub.unsubscribe(); detach?.(); };
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

  const onCreated = ({ gl }: any) => {
    gl.domElement.addEventListener('webglcontextlost', (e:any) => { e.preventDefault(); }, false);
  };

  return (
    <>
      <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden', background: '#000' }}>
        <R3FBoundary>
          <Canvas orthographic camera={{ zoom: 500, position: [0,0,10] }}
                  gl={{ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: false }}
                  onCreated={onCreated}>
            <IrinaSystem />
          </Canvas>
        </R3FBoundary>

        {/* Motion capture controls */}
        <div className="glass-scrollbar" style={{ 
          position: 'absolute', right: 12, top: 12, width: 420,
          background: 'rgba(0,0,0,.4)', backdropFilter: 'blur(10px)', padding: 12, borderRadius: 12,
          overflow: 'hidden', zIndex: 10
        }}>
          <MotionInputPanel />
        </div>

        <div className="fixed bottom-4 left-4 z-50 bg-white/70 backdrop-blur rounded-xl p-3 space-x-3">
          <label>Hue <input type="range" min={0} max={360}
            onChange={e=>useVisStore.getState().setParams({ hue: Number(e.target.value) })} /></label>
          <label>Music <input type="range" min={0} max={1} step={0.01} defaultValue={0.9}
            onChange={e=>useVisStore.getState().setParams({ musicReact: Number(e.target.value) })}/></label>
          <label>Motion <input type="range" min={0} max={1} step={0.01} defaultValue={0.9}
            onChange={e=>useVisStore.getState().setParams({ motionReact: Number(e.target.value) })}/></label>
        </div>

        {/* <audio id="player" src="/test.mp3" controls autoPlay></audio> */}
      </div>
    </>
  );
}

