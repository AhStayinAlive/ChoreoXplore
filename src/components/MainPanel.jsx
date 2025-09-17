import TextField from './reusables/TextField';

export default function MainPanel({
  prompt,
  setPrompt,
  negPrompt,
  setNegPrompt,
  canGenerate,
  onGenerate,
  onInsertMusic, 
}) {
  return (
    <div className="main">
      {/* Keep this panel compact; no big title */}
      <div style={{ display: "grid", gap: 10 }}>
        <TextField
          id="prompt"
          value={prompt}
          onChange={setPrompt}
          placeholder="Describe your scene…"
          multiline
          rows={3}
          size="lg"
          maxLength={300}
          inputProps={{
            onKeyDown: (e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                if (prompt.trim()) onGenerate();
              }
            },
          }}
        />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button
            className="ghost"
            type="button"
            onClick={onInsertMusic} 
          >
            🎵 Insert Music
          </button>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="ghost" type="button" onClick={() => {
              setPrompt("");
              setNegPrompt("");
            }}>Clear</button>
            <button className="primary" type="button" disabled={!canGenerate} onClick={onGenerate}>
              Generate
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}