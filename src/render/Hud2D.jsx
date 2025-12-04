import useStore from "../core/store";

export default function Hud2D() {
  const fps = useStore((s) => s.fps);
  return (
    <div style={{ position: "absolute", top: 8, left: "50%", transform: "translateX(-50%)", fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace", fontSize: 12, background: "rgba(0,0,0,.5)", padding: "4px 8px", borderRadius: 8 }}>
      FPS: {fps}
    </div>
  );
}

