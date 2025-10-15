import { useVisStore } from "../state/useVisStore";

const JOINTS = [
  ["Head","head"],
  ["Shoulders","shoulders"],
  ["Hands","hands"],
  ["Elbows","elbows"],
  ["Hips","hips"],
  ["Knees","knees"],
  ["Ankles","ankles"],
] as const;

export default function JointsPanel() {
  const bp = useVisStore(s => s.params.bodyPoints);
  const cream = useVisStore(s => s.params.cream);
  const effectType = useVisStore(s => s.params.effectType);
  const setParams = useVisStore(s => s.setParams);

  const toggle = (key: keyof typeof bp) =>
    setParams({ bodyPoints: { ...bp, [key]: !bp[key] } });

  const setCream = (k: keyof typeof cream, v: any) =>
    setParams({ cream: { ...cream, [k]: v } });

  return (
    <div className="panel">
      <div className="panel-title">Motion Joints</div>
      <div className="chips" style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {JOINTS.map(([label, key]) => (
          <button key={key as string}
                  className={bp[key as keyof typeof bp] ? "on": ""}
                  onClick={()=>toggle(key as keyof typeof bp)}>
            {label}
          </button>
        ))}
      </div>

      {effectType === "cream" && (
        <>
          <div className="row" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <label style={{ minWidth: 120 }}>Movement Gate</label>
            <input type="range" min={0.005} max={0.08} step={0.002}
                   value={cream.movementGate}
                   onChange={e=>setCream("movementGate", parseFloat(e.target.value))}/>
            <span>{(cream.movementGate ?? 0).toFixed(3)}</span>
          </div>
          <div className="row" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <label style={{ minWidth: 120 }}>Dissipation</label>
            <input type="range" min={0.960} max={0.999} step={0.001}
                   value={cream.dissipation}
                   onChange={e=>setCream("dissipation", parseFloat(e.target.value))}/>
            <span>{(cream.dissipation ?? 0).toFixed(3)}</span>
          </div>
          <div className="row" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <label style={{ minWidth: 120 }}>Flow</label>
            <input type="range" min={0.00} max={2.00} step={0.01}
                   value={cream.flow}
                   onChange={e=>setCream("flow", parseFloat(e.target.value))}/>
            <span>{(cream.flow ?? 0).toFixed(2)}</span>
          </div>
        </>
      )}
    </div>
  );
}
