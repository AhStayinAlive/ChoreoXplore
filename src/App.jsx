import Canvas3D from "./render/Canvas3D";
import Hud2D from "./render/Hud2D";
import PresetPanel from "./ui/PresetPanel";
import RoutingFlow from "./ui/RoutingFlow";
import Timeline from "./ui/Timeline";
import useStore from "./core/store";

export default function App() {
  const mode = useStore(s => s.mode);
  const setMode = useStore((s) => s.setMode);

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#0A0A0C", color: "#fff", position: "relative" }}>
      <div style={{ position: "absolute", inset: 0 }}>
        <Canvas3D />
        <Hud2D />
        {mode === "author" && (
          <>
            <div style={{ position: "absolute", left: 12, top: 12, width: 340, background: "rgba(0,0,0,.4)", backdropFilter: "blur(10px)", padding: 12, borderRadius: 12 }}>
              <PresetPanel />
            </div>
            <div style={{ position: "absolute", right: 12, top: 12, width: 420, height: "60vh", background: "rgba(0,0,0,.4)", backdropFilter: "blur(10px)", padding: 12, borderRadius: 12, overflow: "hidden" }}>
              <RoutingFlow />
            </div>
            <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", bottom: 12, width: "70%", background: "rgba(0,0,0,.4)", backdropFilter: "blur(10px)", padding: 8, borderRadius: 12 }}>
              <Timeline />
            </div>
          </>
        )}
        <div style={{ position: "absolute", top: 12, right: 12, display: "flex", gap: 12 }}>
          <button className="ghost" onClick={() => setMode(mode === "author" ? "performance" : "author")}>{mode === "author" ? "Performance Mode" : "Author Mode"}</button>
        </div>
      </div>
    </div>
  );
}
