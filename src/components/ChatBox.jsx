import { useRef, useState } from 'react';

export default function ChatBox() {
  const [out, setOut] = useState('');
  const [loading, setLoading] = useState(false);
  const abortRef = useRef(null);

  const send = async (text) => {
    setOut('');
    setLoading(true);
    abortRef.current = new AbortController();

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: abortRef.current.signal,
      body: JSON.stringify({ messages: [{ role: 'user', content: text }] })
    });

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      setOut((prev) => prev + decoder.decode(value));
    }
    setLoading(false);
  };

  return (
    <div className="chatbox" style={{ padding: 12, background: 'rgba(0,0,0,0.4)', borderRadius: 8 }}>
      <form onSubmit={(e) => { e.preventDefault(); const t = e.target.q.value; if (t?.trim()) send(t); }} style={{ display: 'flex', gap: 8 }}>
        <input name="q" placeholder="Ask something…" style={{ flex: 1 }} />
        <button disabled={loading}>Send</button>
        {loading && <button type="button" onClick={() => abortRef.current?.abort()}>Stop</button>}
      </form>
      <pre style={{ whiteSpace: 'pre-wrap', marginTop: 8 }}>{out}</pre>
    </div>
  );
}

