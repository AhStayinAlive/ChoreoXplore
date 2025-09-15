import { useRef, useState } from 'react';
import TextField from './reusables/TextField';

export default function MainPanel({
  prompt,
  setPrompt,
  negPrompt,
  setNegPrompt,
  canGenerate,
  onGenerate,
}) {
  const [aiOut, setAiOut] = useState('');
  const [loading, setLoading] = useState(false);
  const abortRef = useRef(null);

  async function askAI() {
    if (!prompt.trim()) return;
    setAiOut('');
    setLoading(true);
    abortRef.current = new AbortController();

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortRef.current.signal,
        body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] })
      });

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        setAiOut(prev => prev + decoder.decode(value));
      }
    } catch (_) {
      // aborted or network error; leave as-is
    } finally {
      setLoading(false);
    }
  }

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

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
          <button className="ghost" type="button" onClick={() => {
            setPrompt("");
            setNegPrompt("");
            setAiOut("");
          }}>Clear</button>
          <button className="primary" type="button" disabled={!canGenerate} onClick={onGenerate}>
            Generate
          </button>
          <button className="primary" type="button" disabled={loading || !prompt.trim()} onClick={askAI}>
            Ask AI
          </button>
          {loading && (
            <button className="ghost" type="button" onClick={() => abortRef.current?.abort()}>
              Stop
            </button>
          )}
        </div>

        {aiOut && (
          <pre style={{ whiteSpace: "pre-wrap", marginTop: 8 }}>{aiOut}</pre>
        )}
      </div>
    </div>
  );
}