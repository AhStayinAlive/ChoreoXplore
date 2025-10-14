import { useState } from "react";
import Canvas3D from "./render/Canvas3D";
import MotionInputPanel from "./components/MotionInputPanel";
import AmbientAnimationControlPanel from "./components/AmbientAnimationControlPanel";
import ChoreoXploreControlPanel from "./components/ChoreoXploreControlPanel";
import HandRippleControlPanel from "./components/HandRippleControlPanel";
import WelcomeMode from "./components/WelcomeMode";
import SpotifyCallback from "./components/SpotifyCallback";
import SpotifyPlaybackControl from "./components/SpotifyPlaybackControl";
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
      {/* Welcome Mode - Full screen overlay */}
      {mode === "welcome" && <WelcomeMode />}
      
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
      {/* Canvas layer */}
      <div style={{ position: "absolute", inset: 0, zIndex: 2 }}>
        <Canvas3D backgroundImage={backgroundImage} ambientAnimationParams={ambientAnimationParams} />
      </div>

      {/* UI panels layer - outside Canvas parent for independent z-index */}
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

      {mode === "choreoxplore" && (
        <>
          {/* ChoreoXplore Panel - Left side, top */}
          <div className="glass-scrollbar" style={{ 
            position: "absolute", 
            left: 12, 
            top: 12, 
            width: 360, 
            height: "auto", 
            maxHeight: "60vh",  // Back to original height
            background: "rgba(0,0,0,.4)", 
            backdropFilter: "blur(10px)", 
            padding: 12, 
            borderRadius: 12, 
            overflow: "hidden",
            zIndex: 10
          }}>
            <ChoreoXploreControlPanel />
          </div>

          {/* Hand Ripple Panel - Left side, below ChoreoXplore */}
          <div className="glass-scrollbar" style={{ 
            position: "absolute", 
            left: 12, 
            bottom: 12, 
            width: 360, 
            height: "auto", 
            maxHeight: "35vh", 
            background: "rgba(0,0,0,.4)", 
            backdropFilter: "blur(10px)", 
            padding: 12, 
            borderRadius: 12, 
            overflow: "hidden",
            zIndex: 10
          }}>
            <HandRippleControlPanel />
          </div>
        </>
      )}

      <div style={{ position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 12, zIndex: 10 }}>
        <button 
          className="ghost" 
          onClick={() => {
            if (mode === "welcome") {
              setMode("choreoxplore");
            } else if (mode === "choreoxplore") {
              setMode("performance");
            } else if (mode === "performance") {
              setMode("choreoxplore");
            }
          }}
        >
          {mode === "welcome" ? "Start" : 
           mode === "choreoxplore" ? "Switch to Performance" : 
           "Back to ChoreoXplore"}
        </button>
      </div>
    </div>
    
    {/* Spotify Playback Control */}
    <SpotifyPlaybackControl />
    </>
  );
}
