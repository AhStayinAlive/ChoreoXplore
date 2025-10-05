import { useState } from "react";
import Canvas3D from "./render/Canvas3D";
import RoutingFlow from "./ui/RoutingFlow";
import AssetPanel from "./ui/AssetPanel";
import MotionInputPanel from "./components/MotionInputPanel";
import AuthorPanel from "./components/AuthorPanel";
import AuthorPromptBox from "./components/AuthorPromptBox";
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
        
        {/* Single persistent MotionInputPanel - always running, UI visibility changes by mode */}
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
          display: mode === "performance" ? "none" : "block" // Show in generative and author modes, hide in performance
        }}>
          <MotionInputPanel />
        </div>


        {mode === "generative" && (
          <>
            <div style={{ position: "absolute", left: 12, top: 12, width: 360, height: "auto", maxHeight: "60vh", background: "rgba(0,0,0,.4)", backdropFilter: "blur(10px)", padding: 12, borderRadius: 12, overflow: "hidden" }}>
              <AssetPanel onBackgroundImageGenerated={handleBackgroundImageGenerated} />
            </div>
          </>
        )}

        {mode === "author" && (
          <>
            <div style={{ position: "absolute", left: 12, top: 12, width: 360, height: "auto", maxHeight: "65vh", background: "rgba(0,0,0,.4)", backdropFilter: "blur(10px)", padding: 12, borderRadius: 12, overflow: "hidden" }}>
              <AuthorPanel onBackgroundImageGenerated={handleBackgroundImageGenerated} />
            </div>
            <AuthorPromptBox onBackgroundImageGenerated={handleBackgroundImageGenerated} />
          </>
        )}
        <div style={{ position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 12 }}>
          <button 
            className="ghost" 
            onClick={() => {
              const modes = ["performance", "generative", "author"];
              const currentIndex = modes.indexOf(mode);
              const nextIndex = (currentIndex + 1) % modes.length;
              setMode(modes[nextIndex]);
            }}
          >
            {mode === "performance" ? "Switch to Generative" : 
             mode === "generative" ? "Switch to Author" : 
             "Switch to Performance"}
          </button>
        </div>
      </div>
    </div>
    </>
  );
}
