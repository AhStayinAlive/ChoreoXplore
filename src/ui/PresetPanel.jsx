import useStore from "../core/store";
import calm from "../presets/preset.calm-lines.json";
import burst from "../presets/preset.angular-burst.json";
import grid from "../presets/preset.orbital-grids.json";

export default function PresetPanel() {
  const setPreset = useStore(s => s.setPreset);
  const reactivity = useStore(s => s.reactivity);
  const setReactivity = useStore(s => s.setReactivity);

  return (
    <div>
      <h3 style={{ fontWeight: 600, marginBottom: 8 }}>Presets</h3>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button className="ghost" onClick={() => setPreset(calm)}>Calm Lines</button>
        <button className="ghost" onClick={() => setPreset(burst)}>Angular Burst</button>
        <button className="ghost" onClick={() => setPreset(grid)}>Orbital Grids</button>
      </div>
      <div style={{ marginTop: 12 }}>
        <label className="mini">Audio Gain</label>
        <input type="range" min="0" max="2" step="0.05" value={reactivity.audioGain} onChange={(e) => setReactivity(() => ({ audioGain: parseFloat(e.target.value) }))} />
      </div>
      <div style={{ marginTop: 8 }}>
        <label className="mini">Pose Gain</label>
        <input type="range" min="0" max="2" step="0.05" value={reactivity.poseGain} onChange={(e) => setReactivity(() => ({ poseGain: parseFloat(e.target.value) }))} />
      </div>
      <div style={{ marginTop: 8 }}>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <input type="checkbox" checked={reactivity.enabled} onChange={(e) => setReactivity(() => ({ enabled: e.target.checked }))} />
          Reactivity Enabled
        </label>
      </div>
    </div>
  );
}

