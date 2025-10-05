import { useState } from "react";
import Canvas3D from "./render/Canvas3D";
import Hud2D from "./render/Hud2D";
import RoutingFlow from "./ui/RoutingFlow";
import AssetPanel from "./ui/AssetPanel";
import MotionInputPanel from "./components/MotionInputPanel";
import useStore from "./core/store";

export default function App() {
  const mode = useStore(s => s.mode);
  const setMode = useStore((s) => s.setMode);
  const [backgroundImage, setBackgroundImage] = useState(null);

  const handleBackgroundImageGenerated = (imageUrl) => {
    console.log('🎨 App received background image:', imageUrl);
    console.log('🎨 Image URL type:', typeof imageUrl);
    console.log('🎨 Image URL length:', imageUrl?.length);
    setBackgroundImage(imageUrl);
  };

  console.log('🎨 App render - backgroundImage:', backgroundImage);

  return (
    <>
      {/* Set body and html background to transparent when image is present */}
      {backgroundImage && (
        <style>
          {`
            html, body, #root { 
              background: transparent !important; 
            }
            #background-image-layer {
              z-index: -999 !important;
            }
          `}
        </style>
      )}
      {/* Background Image Layer - RE-ENABLED WITH SHADER DISTORTION */}
      {backgroundImage && (
        <div 
          id="background-image-layer"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundImage: `url("${backgroundImage}")`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            zIndex: -999,
            pointerEvents: "none"
          }} 
        />
      )}
      
    <div style={{ 
      width: "100vw", 
      height: "100vh", 
      backgroundColor: "transparent",
      color: "#fff", 
      position: "relative",
      zIndex: 1
    }}>
      {/* Light overlay to ensure text readability while showing background */}
      <div style={{
        position: "absolute",
        inset: 0,
        background: backgroundImage ? "rgba(0,0,0,0.05)" : "rgba(0,0,0,0.1)",
        zIndex: 1
      }} />
      <div style={{ position: "absolute", inset: 0, zIndex: 2 }}>
        <Canvas3D backgroundImage={backgroundImage} />
        <Hud2D />
            {/* Motion Input Panel - Always rendered but UI hidden in performance mode */}
            <div style={{ 
              position: "absolute", 
              right: 12, 
              top: 12, 
              width: 420, 
              height: "auto", 
              maxHeight: "70vh", 
              background: "rgba(0,0,0,.4)", 
              backdropFilter: "blur(10px)", 
              padding: 12, 
              borderRadius: 12, 
              overflow: "hidden", 
              zIndex: 10,
              display: mode === "author" ? "block" : "none"
            }}>
              <MotionInputPanel />
            </div>
            {/* Hidden MotionInputPanel for performance mode - keeps motion capture running */}
            {mode === "performance" && (
              <div style={{ position: "absolute", left: "-9999px", top: "-9999px", visibility: "hidden" }}>
                <MotionInputPanel />
              </div>
            )}


        {mode === "author" && (
          <>
            <div style={{ position: "absolute", left: 12, top: 12, width: 340, height: "75vh", background: "rgba(0,0,0,.4)", backdropFilter: "blur(10px)", padding: 12, borderRadius: 12, overflow: "hidden" }}>
              <AssetPanel onBackgroundImageGenerated={handleBackgroundImageGenerated} />
            </div>
          </>
        )}
        <div style={{ position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 12 }}>
          <button className="ghost" onClick={() => setMode(mode === "author" ? "performance" : "author")}>{mode === "author" ? "Performance Mode" : "Author Mode"}</button>
        </div>
      </div>
    </div>
    </>
  );
}
