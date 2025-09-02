export default function MainPanel({
  prompt,
  setPrompt,
  negPrompt,
  setNegPrompt,
  canGenerate,
  onGenerate,
}) {
  return (
    <div className="main">
      <h2>Prompt Builder</h2>
      <textarea
        rows={4}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Describe your scene..."
      />
      <textarea
        rows={2}
        value={negPrompt}
        onChange={(e) => setNegPrompt(e.target.value)}
        placeholder="Negative prompt (optional)"
      />
      <button onClick={onGenerate} disabled={!canGenerate} className="primary">
        Generate
      </button>
    </div>
  );
}
