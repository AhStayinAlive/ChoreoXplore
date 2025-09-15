import { useState } from "react";
import { generateImageViaComfy } from "../lib/comfy";
import { emitPreview } from "../lib/bus";

export default function useJobs({ prompt, negPrompt, params, idRef }) {
  const [jobs, setJobs] = useState([]);

  const updateJob = (jobId, patch) =>
    setJobs(curr => curr.map(j => (j.id === jobId ? { ...j, ...patch } : j)));

  function enqueueJob() {
    const text = (prompt || "").trim();
    if (!text) return;

    // CPU-safe defaults; derive from aspect if provided
    const aspect = params?.aspect || "1:1";
    const [aw, ah] = aspect.split(":").map(Number);
    const base = 512;
    const width = aw && ah ? Math.round(base * (aw / ah)) : base;
    const height = aw && ah ? base : base;

    const id = idRef.current++;
    setJobs(j => [
      {
        id,
        prompt: text,
        negPrompt: (negPrompt || "").trim(),
        params,
        status: "queued",
        progress: 0,
        url: null,
        log: "",
        createdAt: Date.now(),
      },
      ...j,
    ]);

    (async () => {
      updateJob(id, { status: "processing", progress: 5, log: "submit:start" });
      try {
        const { url } = await generateImageViaComfy(text, {
          width,
          height,
          steps: 12,
          onStatus: s => {
            let progress = 5;
            if (s.startsWith("submit:ok")) progress = 10;
            else if (s.startsWith("poll:")) {
              const n = Number(s.split(":")[1] || 0);
              progress = Math.min(95, 10 + Math.min(80, n));
            } else if (s.startsWith("download:start")) progress = 95;
            else if (s.startsWith("download:ok")) progress = 100;

            updateJob(id, { progress, log: s });
          },
        });

        updateJob(id, { status: "done", url, progress: 100, log: "done" });
        emitPreview(url);
      } catch (e) {
        const msg = e?.message ? String(e.message) : "generation_failed";
        console.error(e);
        updateJob(id, { status: "failed", progress: 100, log: msg });
      }
    })();
  }

  return { jobs, enqueueJob };
}
