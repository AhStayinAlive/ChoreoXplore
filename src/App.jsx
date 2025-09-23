import { useState } from "react";
import Canvas3D from "./render/Canvas3D";
import Hud2D from "./render/Hud2D";
import PresetPanel from "./ui/PresetPanel";
import RoutingFlow from "./ui/RoutingFlow";
import Timeline from "./ui/Timeline";
import AssetPanel from "./ui/AssetPanel";
import AIThinkingPanel from "./ui/AIThinkingPanel";
import MotionInputPanel from "./components/MotionInputPanel";
import MotionControlPanel from "./components/MotionControlPanel";
import AvatarControlPanel from "./components/AvatarControlPanel";
import useStore from "./core/store";

export default function App() {
  const mode = useStore(s => s.mode);
  const setMode = useStore((s) => s.setMode);
  const [showAIThinking, setShowAIThinking] = useState(false);
  const [aiThinkingData, setAiThinkingData] = useState(null);

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#0A0A0C", color: "#fff", position: "relative" }}>
      <div style={{ position: "absolute", inset: 0 }}>
        <Canvas3D />
        <Hud2D />
        {/* Motion Input Panel - Always visible, compact size */}
        <div style={{ position: "absolute", right: 12, top: 12, width: 420, height: "auto", maxHeight: "70vh", background: "rgba(0,0,0,.4)", backdropFilter: "blur(10px)", padding: 12, borderRadius: 12, overflow: "hidden", zIndex: 10 }}>
          <MotionInputPanel />
        </div>

        {/* Motion Control Panel - Below motion input */}
        <div style={{ position: "absolute", right: 12, top: "calc(70vh + 24px)", width: 420, height: "auto", maxHeight: "25vh", background: "rgba(0,0,0,.4)", backdropFilter: "blur(10px)", padding: 12, borderRadius: 12, overflow: "hidden", zIndex: 10 }}>
          <MotionControlPanel />
        </div>

        {/* Avatar Control Panel - Below motion control */}
        <div style={{ position: "absolute", right: 12, top: "calc(70vh + 25vh + 36px)", width: 420, height: "auto", maxHeight: "20vh", background: "rgba(0,0,0,.4)", backdropFilter: "blur(10px)", padding: 12, borderRadius: 12, overflow: "hidden", zIndex: 10 }}>
          <AvatarControlPanel />
        </div>

        {mode === "author" && (
          <>
            <div style={{ position: "absolute", left: 12, top: 12, width: 340, background: "rgba(0,0,0,.4)", backdropFilter: "blur(10px)", padding: 12, borderRadius: 12 }}>
              <PresetPanel />
            </div>
            <div style={{ position: "absolute", left: 12, top: 280, width: 340, height: "60vh", background: "rgba(0,0,0,.4)", backdropFilter: "blur(10px)", padding: 12, borderRadius: 12, overflow: "hidden" }}>
              <AssetPanel 
                onThink={(data) => {
                  setAiThinkingData(data);
                  setShowAIThinking(true);
                }}
              />
            </div>
            <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", bottom: 12, width: "70%", background: "rgba(0,0,0,.4)", backdropFilter: "blur(10px)", padding: 8, borderRadius: 12 }}>
              <Timeline />
            </div>
          </>
        )}
        <div style={{ position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 12 }}>
          <button className="ghost" onClick={() => setMode(mode === "author" ? "performance" : "author")}>{mode === "author" ? "Performance Mode" : "Author Mode"}</button>
        </div>
      </div>
      
      {/* AI Thinking Panel - Full Screen Overlay */}
      {showAIThinking && aiThinkingData && (
        <AIThinkingPanel 
          onClose={() => setShowAIThinking(false)}
          lyrics={aiThinkingData.lyrics}
          assetRepository={aiThinkingData.assetRepository}
          currentSelection={aiThinkingData.currentSelection}
          context={aiThinkingData.context}
        />
      )}
    </div>
  );
}
