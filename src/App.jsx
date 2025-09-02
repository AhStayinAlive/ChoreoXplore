import { useState, useRef } from "react";
import SettingsPanel from "./components/SettingsPanel";
import MainPanel from "./components/MainPanel";
import PreviewPanel from "./components/PreviewPanel";
import useJobs from "./hooks/useJobs";

export default function App() {
  const [prompt, setPrompt] = useState("");
  const [negPrompt, setNegPrompt] = useState("");
  const [params, setParams] = useState({
    model: "video-gen-v1",
    aspect: "16:9",
    duration: 5,
    guidance: 7.0,
    seed: "",
    safety: true,
  });
  const idRef = useRef(1);

  const { jobs, enqueueJob } = useJobs({ prompt, negPrompt, params, idRef });
  const canGenerate = prompt.trim().length > 0;

  const latestDone = jobs.find((j) => j.status === "done");

  return (
    <div className="app-shell">
      {/* Background preview */}
      <div className="bg-preview">
        {latestDone ? (
          <img src={latestDone.url} alt="Preview" />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              background: "linear-gradient(135deg, #0f2027, #203a43, #2c5364)",
            }}
          />
        )}
      </div>

      <div className="layout">
        <SettingsPanel params={params} setParams={setParams} />
        <PreviewPanel jobs={jobs} />
      </div>

      {/* Bottom floating MainPanel */}
      <div className="bottom-panel">
        <MainPanel
          prompt={prompt}
          setPrompt={setPrompt}
          negPrompt={negPrompt}
          setNegPrompt={setNegPrompt}
          canGenerate={canGenerate}
          onGenerate={enqueueJob}
        />
      </div>
    </div>
  );
}
