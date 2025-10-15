import { useVisStore } from "../state/useVisStore";

export default function CreamPanel() {
  const cream = useVisStore(s => s.params.cream);
  const setParams = useVisStore(s => s.setParams);

  const setCream = (k: keyof typeof cream, v: any) => setParams({ cream: { ...cream, [k]: v } });

  return (
    <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h3 style={{ fontWeight: 600, margin: 0 }}>Cream Smoke Effect</h3>

      <div className="row" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <label style={{ minWidth: 120 }}>Resolution</label>
        <input type="range" min={0.3} max={1.0} step={0.05}
               value={cream.resolutionScale}
               onChange={e=>setCream("resolutionScale", parseFloat(e.target.value))} />
        <span>{(cream.resolutionScale ?? 0.5).toFixed(2)}</span>
      </div>

      <div className="row" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <label style={{ minWidth: 120 }}>Intensity</label>
        <input type="range" min={0.1} max={2.0} step={0.05}
               value={cream.intensity}
               onChange={e=>setCream("intensity", parseFloat(e.target.value))} />
        <span>{(cream.intensity ?? 1.0).toFixed(2)}</span>
      </div>

      <div className="row" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <label style={{ minWidth: 120 }}>Inject</label>
        <input type="range" min={0.0} max={3.0} step={0.05}
               value={cream.inject}
               onChange={e=>setCream("inject", parseFloat(e.target.value))} />
        <span>{(cream.inject ?? 1.0).toFixed(2)}</span>
      </div>

      <div className="row" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <label style={{ minWidth: 120 }}>Dissipation</label>
        <input type="range" min={0.960} max={0.999} step={0.001}
               value={cream.dissipation}
               onChange={e=>setCream("dissipation", parseFloat(e.target.value))} />
        <span>{(cream.dissipation ?? 0.985).toFixed(3)}</span>
      </div>

      <div className="row" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <label style={{ minWidth: 120 }}>Flow</label>
        <input type="range" min={0.00} max={2.00} step={0.01}
               value={cream.flow}
               onChange={e=>setCream("flow", parseFloat(e.target.value))} />
        <span>{(cream.flow ?? 0.65).toFixed(2)}</span>
      </div>

      <div className="row" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <label style={{ minWidth: 120 }}>Noise Scale</label>
        <input type="range" min={0.5} max={4.0} step={0.1}
               value={cream.noiseScale}
               onChange={e=>setCream("noiseScale", parseFloat(e.target.value))} />
        <span>{(cream.noiseScale ?? 2.0).toFixed(1)}</span>
      </div>

      <div className="row" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <label style={{ minWidth: 120 }}>Base Color</label>
        <input type="color"
               value={cream.baseColor}
               onChange={e=>setCream("baseColor", e.target.value)} />
      </div>

      <div className="row" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <label style={{ minWidth: 120 }}>Accent Color</label>
        <input type="color"
               value={cream.accentColor}
               onChange={e=>setCream("accentColor", e.target.value)} />
      </div>
    </div>
  );
}
