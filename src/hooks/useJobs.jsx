import { useState } from "react";
import { generateImageViaComfy } from "../lib/comfy";
import { emitPreview } from "../lib/bus";

export default function useJobs({ prompt, negPrompt, params, idRef }) {
  const [jobs, setJobs] = useState([]);

  function updateJob(jobId, patch) {
    setJobs((curr) => curr.map((j) => (j.id === jobId ? { ...j, ...patch } : j)));
  }

  function enqueueJob() {
    const p = prompt?.trim();
    if (!p) return;

    // derive approximate size from aspect; fallback to 1024x1024
    const aspect = params?.aspect || "1:1";
    const [aw, ah] = aspect.split(":").map(Number);
    const base = 1024;
    const width = aw && ah ? Math.round(base * (aw / ah)) : 1024;
    const height = aw && ah ? base : 1024;

    const id = idRef.current++;
    const job = {
      id,
      prompt: p,
      negPrompt: negPrompt?.trim() ?? "",
      params,
      status: "queued",
      progress: 0,
      url: null,
      createdAt: Date.now(),
    };
    setJobs((j) => [job, ...j]);

    (async () => {
      updateJob(id, { status: "processing", progress: 5 });
      try {
        const { url } = await generateImageViaComfy(p, {
          width,
          height,
          steps: 12,
          onStatus: (s) => {
            if (s.startsWith("submit:start")) updateJob(id, { progress: 5 });
            if (s.startsWith("submit:ok")) updateJob(id, { progress: 10 });
            if (s.startsWith("poll:")) {
              const n = Number(s.split(":")[1] || 0);
              updateJob(id, { progress: 10 + Math.min(80, n) });
            }
            if (s.startsWith("download:start")) updateJob(id, { progress: 95 });
            if (s.startsWith("download:ok")) updateJob(id, { progress: 100 });
          },
        });

        updateJob(id, { status: "done", url, progress: 100 });
        emitPreview(url);
      } catch (e) {
        console.error(e);
        updateJob(id, { status: "failed" });
      }
    })();
  }

  return { jobs, enqueueJob };
}
