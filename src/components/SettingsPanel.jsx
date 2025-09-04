import Slider from './reusables/Slider';
import ToggleButton from './reusables/ToggleButton';

export default function SettingsPanel({ params, setParams }) {
  const set = (patch) => setParams((p) => ({ ...p, ...patch }));

  return (
    <aside className="sidebar">
      <h3>Settings</h3>

      <Slider
        id="duration"
        label="Duration (sec)"
        min={1} max={20} step={1}
        value={params.duration}
        onChange={(v) => setParams(p => ({ ...p, duration: v }))}
        marks={[{value:1},{value:5},{value:10},{value:15},{value:20}]}
        showMarks
        showMarkLabels
        snapToMarks        
        defaultValue={5}
        valueText={(v)=>`${v} seconds`}
      />

      <Slider
        id="guidance"
        label="Guidance"
        min={1} max={15} step={0.5}
        value={params.guidance}
        onChange={(v) => setParams(p => ({ ...p, guidance: v }))}
        marks={[{value:1},{value:5},{value:10},{value:15}]}
        showMarks
        // no labels, no tooltip
        valueText={(v)=>v.toFixed(1)}
      />

      <ToggleButton label="Sci-Fi" />
      <ToggleButton label="Fantasy" />
      <ToggleButton label="Drama" />
    </aside>
  );
}
