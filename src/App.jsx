import { useState, useRef, useEffect } from "react";
import { onPreview } from "./lib/bus";
import SettingsPanel from "./components/SettingsPanel";
import MainPanel from "./components/MainPanel";
import PreviewPanel from "./components/PreviewPanel";
import useJobs from "./hooks/useJobs";
import { startAutoTheme } from "./helpers/themeFromBackground";

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
  const [previewBg, setPreviewBg] = useState("");

  useEffect(() => onPreview(setPreviewBg), []);

  // ====== NEW: hook up auto-theming ======
  const bgRef = useRef(null);

  useEffect(() => {
    const el = bgRef.current;
    if (!el) return;

    // For images: run once when loaded
    if (el.tagName === "IMG") {
      if (el.complete) {
        startAutoTheme(el)(); // call, then immediately cleanup timer (none for IMG)
      } else {
        const onload = () => { startAutoTheme(el)(); el.removeEventListener("load", onload); };
        el.addEventListener("load", onload);
        return () => el.removeEventListener("load", onload);
      }
    }

    // For videos (if you switch to <video>): keep sampling on interval
    // const stop = startAutoTheme(el, { sample: 48, interval: 2000 });
    // return stop;

  }, [latestDone?.url]); // re-run when background image changes
  // ======================================

  return (
    <div className="app-shell">
      {/* Background preview */}
      <div className="bg-preview">
        {previewBg ? (
          <img src={previewBg} alt="Preview" />
        ) : latestDone ? (
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
        <div className="preview-area"></div>
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
