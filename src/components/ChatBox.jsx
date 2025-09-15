import { useRef, useState } from 'react';
import { generateImageViaComfy } from '../lib/comfy';
import { emitPreview } from '../lib/bus';

export default function ChatBox() {
  const [out, setOut] = useState('');
  const [loading, setLoading] = useState(false);
  const [imgLoading, setImgLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const abortRef = useRef(null);
  const inputRef = useRef(null);

  const addLog = (s) => setLogs((l) => [...l, `${new Date().toLocaleTimeString()}  ${s}`]);

  const handleGenerate = async () => {
    const text = inputRef.current?.value?.trim();
    if (!text) return;
    setImgLoading(true);
    addLog('generate:begin');
    try {
      const { url } = await generateImageViaComfy(text, { onStatus: addLog });
      emitPreview(url);
      addLog('preview:set');
    } catch (e) {
      addLog(`error:${e.message}`);
    } finally {
      setImgLoading(false);
    }
  };

  const send = async (text) => {
    setLoading(true);
    setOut('');
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer lm-studio', // required by LM Studio
        },
        body: JSON.stringify({
          model: import.meta.env.VITE_AI_MODEL || 'meta-llama-3.1-8b-instruct',
          messages: [{ role: 'user', content: text }],
          stream: false,
        }),
        signal: ctrl.signal,
      });

      const data = await res.json();
      setOut(data?.choices?.[0]?.message?.content ?? '(no content)');
    } catch (err) {
      if (err.name !== 'AbortError') setOut('Request failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chatbox" style={{ padding: 12, background: 'rgba(0,0,0,0.4)', borderRadius: 8 }}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const t = e.target.q.value;
          if (t?.trim()) send(t);
        }}
        style={{ display: 'flex', gap: 8 }}
      >
        <input ref={inputRef} name="q" placeholder="Describe the visual… or ask AI" style={{ flex: 1 }} />
        <button type="button" onClick={handleGenerate} disabled={imgLoading}>Generate</button>
        <button disabled={loading}>Send</button>
        {loading && <button type="button" onClick={() => abortRef.current?.abort()}>Stop</button>}
      </form>
      {logs.length > 0 && (
        <pre style={{ whiteSpace: 'pre-wrap', marginTop: 8, maxHeight: 140, overflow: 'auto' }}>{logs.join('\n')}</pre>
      )}
      <pre style={{ whiteSpace: 'pre-wrap', marginTop: 8 }}>{out}</pre>
    </div>
  );
}
