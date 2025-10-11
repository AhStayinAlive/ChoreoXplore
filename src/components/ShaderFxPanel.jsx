import React from 'react';
import { useVisStore } from '../state/useVisStore';
import Slider from './reusables/Slider';

export default function ShaderFxPanel() {
  const fxMode = useVisStore(s => s.fxMode);
  const setFxMode = useVisStore(s => s.setFxMode);
  const params = useVisStore(s => s.params);
  const setParams = useVisStore(s => s.setParams);

  return (
    <div className="glass-scrollbar" style={{ padding: 12, borderRadius: 12, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(10px)', color: 'white' }}>
      <h4 style={{ margin: 0, marginBottom: 8, fontWeight: 600 }}>Shader FX</h4>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <button
          onClick={() => setFxMode('cursor')}
          className="ghost"
          style={{ padding: '6px 10px', borderRadius: 6, background: fxMode === 'cursor' ? 'rgba(34,197,94,0.8)' : 'rgba(55,65,81,0.8)' }}
        >Cursor</button>
        <button
          onClick={() => setFxMode('pose')}
          className="ghost"
          style={{ padding: '6px 10px', borderRadius: 6, background: fxMode === 'pose' ? 'rgba(34,197,94,0.8)' : 'rgba(55,65,81,0.8)' }}
        >Pose</button>
      </div>
      <div style={{ marginTop: 8 }}>
        <Slider label="Music Reactivity" value={params.musicReact} min={0} max={1} step={0.01} onChange={(v) => setParams({ musicReact: v })} />
      </div>
      <div style={{ marginTop: 8 }}>
        <Slider label="Motion Reactivity" value={params.motionReact} min={0} max={1} step={0.01} onChange={(v) => setParams({ motionReact: v })} />
      </div>
    </div>
  );
}
