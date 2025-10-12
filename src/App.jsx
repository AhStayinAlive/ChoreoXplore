import { useState } from "react";
import Canvas3D from "./render/Canvas3D";
import MotionInputPanel from "./components/MotionInputPanel";
import AmbientAnimationControlPanel from "./components/AmbientAnimationControlPanel";
import IrinaControlPanel from "./components/IrinaControlPanel";
import ShaderFxPanel from "./components/ShaderFxPanel";
import SongInputMode from "./components/SongInputMode";
import SpotifyCallback from "./components/SpotifyCallback";
import { SpotifyProvider } from "./contexts/SpotifyContext.jsx";
import useStore from "./core/store";

export default function App() {
  const mode = useStore(s => s.mode);
  const setMode = useStore((s) => s.setMode);
  const [backgroundImage, setBackgroundImage] = useState(null);
  const ambientAnimationParams = useStore(s => s.ambientAnimationParams);
  const setAmbientAnimationParams = useStore(s => s.setAmbientAnimationParams);

  // Check if we're on the Spotify callback page
  const isSpotifyCallback = window.location.pathname === '/callback' || 
                           window.location.search.includes('code=') || 
                           window.location.search.includes('error=');

  const handleBackgroundImageGenerated = (imageUrl) => {
    console.log('🎨 App received background image:', imageUrl);
    console.log('🎨 Image URL type:', typeof imageUrl);
    console.log('🎨 Image URL length:', imageUrl?.length);
    setBackgroundImage(imageUrl);
  };

  console.log('🎨 App render - backgroundImage:', backgroundImage);

  // Show Spotify callback component if we're on the callback page
  if (isSpotifyCallback) {
    return (
      <SpotifyProvider>
        <SpotifyCallback />
      </SpotifyProvider>
    );
  }

  return (
    <SpotifyProvider>
      <AppContent 
        mode={mode}
        setMode={setMode}
        backgroundImage={backgroundImage}
        setBackgroundImage={setBackgroundImage}
        ambientAnimationParams={ambientAnimationParams}
        setAmbientAnimationParams={setAmbientAnimationParams}
        handleBackgroundImageGenerated={handleBackgroundImageGenerated}
      />
    </SpotifyProvider>
  );
}

function AppContent({ 
  mode, 
  setMode, 
  backgroundImage, 
  setBackgroundImage, 
  ambientAnimationParams, 
  setAmbientAnimationParams, 
  handleBackgroundImageGenerated 
}) {

  return (
    <>
      {/* Song Input Mode - Full screen overlay */}
      {mode === "songInput" && <SongInputMode />}
      
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
      {/* Background Image Layer - Always show static background */}
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
      zIndex: 1,
      display: mode === "songInput" ? "none" : "block"
    }}>
      {/* Light overlay to ensure text readability while showing background */}
      <div style={{
        position: "absolute",
        inset: 0,
        background: backgroundImage ? "rgba(0,0,0,0.05)" : "rgba(0,0,0,0.1)",
        zIndex: 1
      }} />
      <div style={{ position: "absolute", inset: 0, zIndex: 2 }}>
        <Canvas3D backgroundImage={backgroundImage} ambientAnimationParams={ambientAnimationParams} />
        
        {/* Single persistent MotionInputPanel - always running, UI visibility changes by mode */}
        <div className="glass-scrollbar" style={{ 
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
          display: mode === "performance" ? "none" : "block" // Show in irina mode, hide in performance
        }}>
          <MotionInputPanel />
        </div>

        {/* Single persistent AmbientAnimationControlPanel - visible when background image exists, hidden in performance mode */}
        {backgroundImage && mode !== "performance" && (
          <div className="glass-scrollbar" style={{ 
            position: "absolute", 
            right: 12, 
            bottom: 12, 
            width: 320, 
            height: "auto", 
            maxHeight: "50vh", 
            background: "rgba(0,0,0,.4)", 
            backdropFilter: "blur(10px)", 
            padding: 12, 
            borderRadius: 12, 
            overflow: "hidden", 
            zIndex: 10
          }}>
            <AmbientAnimationControlPanel 
              isVisible={true}
            />
          </div>
        )}




        {mode === "irina" && (
          <div className="glass-scrollbar" style={{ 
            position: "absolute", 
            left: 12, 
            top: 12, 
            width: 360, 
            height: "auto", 
            maxHeight: "60vh", 
            background: "rgba(0,0,0,.4)", 
            backdropFilter: "blur(10px)", 
            padding: 12, 
            borderRadius: 12, 
            overflow: "hidden" 
          }}>
            <IrinaControlPanel />
          </div>
        )}

        {/* Shader FX panel (mode toggle + reactivity sliders) */}
        <div className="glass-scrollbar" style={{ 
          position: "absolute", 
          left: 12, 
          bottom: 12, 
          width: 320, 
          height: "auto", 
          maxHeight: "50vh", 
          background: "rgba(0,0,0,.4)", 
          backdropFilter: "blur(10px)", 
          padding: 12, 
          borderRadius: 12, 
          overflow: "hidden", 
          zIndex: 10
        }}>
          <ShaderFxPanel />
        </div>
        <div style={{ position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 12 }}>
          <button 
            className="ghost" 
            onClick={() => {
              const modes = ["songInput", "irina", "performance"];
              const currentIndex = modes.indexOf(mode);
              const nextIndex = (currentIndex + 1) % modes.length;
              setMode(modes[nextIndex]);
            }}
          >
            {mode === "songInput" ? "Skip to Irina Mode" : 
             mode === "irina" ? "Switch to Performance" : 
             "Switch to Song Input"}
          </button>
        </div>
      </div>
    </div>
    </>
  );
}
