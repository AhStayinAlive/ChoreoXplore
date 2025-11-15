import { useState, useEffect } from "react";
import React from "react";
import Canvas3D from "./render/Canvas3D";
import MotionInputPanel from "./components/MotionInputPanel";
import ChoreoXploreControlPanel from "./components/ChoreoXploreControlPanel";
import HandEffectsPanel from "./components/HandEffectsPanel";
import HandEffectQuickView from "./components/HandEffectQuickView";
import WelcomeMode from "./components/WelcomeMode";
import SpotifyCallback from "./components/SpotifyCallback";
import SpotifyPlaybackControl from "./components/SpotifyPlaybackControl";
import SetupWizard from "./components/SetupWizard";
import { SpotifyProvider } from "./contexts/SpotifyContext.jsx";
import { useVisStore } from "./state/useVisStore";
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
  const setupStep = useStore(s => s.setupStep);
  const advanceToStep = useStore(s => s.advanceToStep);
  const songSearched = useStore(s => s.songSearched);
  const motionCaptureActive = useStore(s => s.motionCaptureActive);
  const selectedCameraIndex = useStore(s => s.selectedCameraIndex);
  const visualMode = useVisStore(s => s.params.mode);
  const handEffectType = useVisStore(s => s.params.handEffect?.type);
  const handSelection = useVisStore(s => s.params.handEffect?.handSelection);

  // Auto-advance wizard based on user actions
  React.useEffect(() => {
    // Step 1 → 2: Song search button clicked
    if (songSearched && setupStep === 1) {
      advanceToStep(2);
    }
  }, [songSearched, setupStep, advanceToStep]);

  React.useEffect(() => {
    // Step 2 → 3: Visual mode selected (any mode other than 'empty')
    if (visualMode && visualMode !== 'empty' && setupStep === 2) {
      advanceToStep(3);
    }
  }, [visualMode, setupStep, advanceToStep]);

  React.useEffect(() => {
    // Step 3 → 4: Motion capture started
    if (motionCaptureActive && setupStep === 3) {
      advanceToStep(4);
    }
  }, [motionCaptureActive, setupStep, advanceToStep]);

  React.useEffect(() => {
    // Step 4 → 5: Hand effect type chosen (not 'none')
    if (handEffectType && handEffectType !== 'none' && setupStep === 4) {
      advanceToStep(5);
    }
  }, [handEffectType, setupStep, advanceToStep]);

  React.useEffect(() => {
    // Step 5 → 6: Hand selection chosen (not 'none')
    if (handSelection && handSelection !== 'none' && setupStep === 5) {
      advanceToStep(6);
    }
  }, [handSelection, setupStep, advanceToStep]);

  React.useEffect(() => {
    // Step 6 → 7: Camera 2 selected (index 0, displays as "Camera 2")
    if (selectedCameraIndex >= 0 && setupStep === 6) {
      advanceToStep(7);
    }
  }, [selectedCameraIndex, setupStep, advanceToStep]);

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

      {mode === "choreoxplore" && (
        <>
          {/* ChoreoXplore Panel - Left side, top */}
          <div className="glass-scrollbar" style={{ 
            position: "absolute", 
            left: 12, 
            top: 12, 
            width: 360, 
            height: "auto", 
            maxHeight: "60vh",  // Reduced slightly to give more space to Hand Effects
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
          <div style={{ 
            position: "absolute", 
            left: 12, 
            bottom: 12, 
            width: 360, 
            maxHeight: "35vh",
            background: "rgba(0,0,0,.4)", 
            backdropFilter: "blur(10px)", 
            padding: 12, 
            borderRadius: 12, 
            overflow: "hidden",
            zIndex: 10,
            display: "flex",
            flexDirection: "column"
          }}>
            <HandEffectsPanel />
          </div>
          
          {/* Hand Effect Quick View - Bottom right */}
          <HandEffectQuickView />
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
    
    {/* Setup Wizard - Show in choreoxplore mode */}
    {mode === "choreoxplore" && <SetupWizard />}
    </>
  );
}
