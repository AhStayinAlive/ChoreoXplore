import { useVisStore } from "../state/useVisStore";

export default function EffectTypeSwitch() {
  const effectType = useVisStore(s => s.params.effectType);
  const setParams  = useVisStore(s => s.setParams);
  const set = (t: "ripple" | "cream") => setParams({ effectType: t });

  return (
    <div className="panel">
      <div className="panel-title">Effect Type</div>
      <div className="seg" style={{ display: 'flex', gap: 8 }}>
        <button className={effectType==="ripple" ? "on" : ""} onClick={()=>set("ripple")}>Ripple</button>
        <button className={effectType==="cream"  ? "on" : ""} onClick={()=>set("cream")}>Cream Smoke</button>
      </div>
    </div>
  );
}
