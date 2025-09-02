import { useEffect, useState } from "react";

export default function useJobs({ prompt, negPrompt, params, idRef }) {
  const [jobs, setJobs] = useState([]);

  function enqueueJob() {
    if (!prompt.trim()) return;
    const id = idRef.current++;
    const newJob = {
      id,
      prompt: prompt.trim(),
      negPrompt: negPrompt.trim(),
      params,
      status: "queued",
      progress: 0,
      url: null,
      createdAt: Date.now(),
    };
    setJobs((j) => [newJob, ...j]);
  }

  useEffect(() => {
    const tick = setInterval(() => {
      setJobs((prev) => {
        const next = [...prev];
        const active = next.find(
          (j) => j.status === "queued" || j.status === "processing"
        );
        if (!active) return next;

        if (active.status === "queued") {
          active.status = "processing";
          active.progress = 1;
        } else if (active.status === "processing") {
          const step = 15 + Math.round(Math.random() * 20);
          active.progress = Math.min(100, active.progress + step);
          if (active.progress >= 100) {
            active.status = "done";
            active.url = "https://placehold.co/640x360?text=Preview";
          }
        }
        return next;
      });
    }, 600);

    return () => clearInterval(tick);
  }, []);

  return { jobs, enqueueJob };
}
