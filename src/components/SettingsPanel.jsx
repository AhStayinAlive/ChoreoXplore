import Slider from './reusables/Slider';
import ToggleButton from './reusables/ToggleButton';

export default function SettingsPanel({ params, setParams }) {
  const set = (patch) => setParams((p) => ({ ...p, ...patch }));

  return (
    <aside className="sidebar">
      <h3 className="panel-title">Settings</h3>

      <div className="section">
        <div className="control">
          <Slider
            id="tempo"
            label="Tempo"
            min={0} max={100} step={1}
            value={params.tempo}
            onChange={(v) => set({ tempo: v })}
            marks={[{ value: 0 }, { value: 25 }, { value: 50 }, { value: 75 }, { value: 100 }]}
            showMarks
            valueText={(v) => `${v}`}
          />
        </div>

        <div className="control">
          <Slider
            id="intensity"
            label="Intensity"
            min={0} max={100} step={1}
            value={params.intensity}
            onChange={(v) => set({ intensity: v })}
            marks={[{ value: 0 }, { value: 25 }, { value: 50 }, { value: 75 }, { value: 100 }]}
            showMarks
            valueText={(v) => `${v}`}
          />
        </div>

        <div className="control">
          <Slider
            id="audioSensitivity"
            label="Audio Sensitivity"
            min={0} max={100} step={1}
            value={params.audioSensitivity}
            onChange={(v) => set({ audioSensitivity: v })}
            marks={[{ value: 0 }, { value: 25 }, { value: 50 }, { value: 75 }, { value: 100 }]}
            showMarks
            valueText={(v) => `${v}`}
          />
        </div>

        <div className="control">
          <Slider
            id="visualDensity"
            label="Visual Density"
            min={0} max={100} step={1}
            value={params.visualDensity}
            onChange={(v) => set({ visualDensity: v })}
            marks={[{ value: 0 }, { value: 25 }, { value: 50 }, { value: 75 }, { value: 100 }]}
            showMarks
            valueText={(v) => `${v}`}
          />
        </div>
      </div>

      <div className="section">
        <div className="row--wrap">
          <div className="control">
            <label htmlFor="mood" className="ui-label">Mood</label>
            <select
              id="mood"
              className="ui-select compact"
              value={params.mood}
              onChange={(e) => set({ mood: e.target.value })}
            >
              <option value="calm">Calm</option>
              <option value="chaotic">Chaotic</option>
              <option value="sad">Sad</option>
              <option value="excited">Excited</option>
            </select>
          </div>
          <ToggleButton
            label="Beat-sync"
            active={params.beatSync}
            onClick={() => set({ beatSync: !params.beatSync })}
            className="small"
          />
        </div>

        <div className="row--wrap">
          <div className="control">
            <label htmlFor="colorPalette" className="ui-label">Color Palette</label>
            <select
              id="colorPalette"
              className="ui-select compact"
              value={params.colorPalette}
              onChange={(e) => set({ colorPalette: e.target.value })}
            >
              <option value="warm">Warm</option>
              <option value="cool">Cool</option>
              <option value="neutral">Neutral</option>
            </select>
          </div>
          <ToggleButton
            label="Loop"
            active={params.loopMotion}
            onClick={() => set({ loopMotion: !params.loopMotion })}
            className="small"
          />
        </div>

        <div className="row--wrap">
          <div className="control">
            <label htmlFor="texturePreset" className="ui-label">Texture</label>
            <select
              id="texturePreset"
              className="ui-select compact"
              value={params.texturePreset}
              onChange={(e) => set({ texturePreset: e.target.value })}
            >
              <option value="wave">Wave</option>
              <option value="smoke">Smoke</option>
              <option value="grain">Grain</option>
              <option value="honeycomb">Honeycomb</option>
              <option value="crystal">Crystal</option>
            </select>
          </div>
          <ToggleButton
            label="Reactivity"
            active={params.audioReactivity}
            onClick={() => set({ audioReactivity: !params.audioReactivity })}
            className="small"
          />
        </div>
      </div>
    </aside>
  );
}
