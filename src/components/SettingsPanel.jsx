import Field from "./Field";

export default function SettingsPanel({ params, setParams }) {
  return (
    <aside className="sidebar">
      <h3>Settings</h3>
      <Field label="Model">
        <select
          value={params.model}
          onChange={(e) => setParams((p) => ({ ...p, model: e.target.value }))}
        >
          <option value="video-gen-v1">video-gen-v1</option>
          <option value="video-gen-v1.5">video-gen-v1.5</option>
        </select>
      </Field>

      <Field label="Aspect Ratio">
        <select
          value={params.aspect}
          onChange={(e) => setParams((p) => ({ ...p, aspect: e.target.value }))}
        >
          <option>16:9</option>
          <option>9:16</option>
          <option>1:1</option>
        </select>
      </Field>

      <Field label="Duration">
        <input
          type="number"
          value={params.duration}
          onChange={(e) =>
            setParams((p) => ({ ...p, duration: Number(e.target.value) }))
          }
        />
      </Field>
    </aside>
  );
}
