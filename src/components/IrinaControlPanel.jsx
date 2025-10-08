import { useState } from "react";
import { useVisStore } from "../state/useVisStore";
import Slider from "./reusables/Slider";
import ToggleButton from "./reusables/ToggleButton";

export default function IrinaControlPanel() {
  const music = useVisStore(s => s.music);
  const motion = useVisStore(s => s.motion);
  const params = useVisStore(s => s.params);
  const setParams = useVisStore(s => s.setParams);
  const [isActive, setIsActive] = useState(false);

  const handleParamChange = (param, value) => {
    setParams({ [param]: value });
  };

  const handleModeChange = (mode) => {
    setParams({ mode });
  };

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <h3 style={{ fontWeight: 600, marginBottom: 12, flexShrink: 0 }}>Irina Angles Mode</h3>
      
      <div className="glass-scrollbar" style={{ flex: 1, overflow: "auto", paddingRight: "4px", marginBottom: "8px", minHeight: 0 }}>
        
        {/* Activation Toggle */}
        <div style={{ marginBottom: 16 }}>
          <ToggleButton
            label="Enable Irina Visuals"
            checked={isActive}
            onChange={setIsActive}
          />
        </div>

        {/* Visual Mode Selection */}
        <div style={{ marginBottom: 16 }}>
          <h4 style={{ color: "white", fontSize: "12px", margin: "0 0 8px 0" }}>Visual Mode</h4>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {["auto", "lines", "surfaces", "volumes"].map(mode => (
              <button
                key={mode}
                onClick={() => handleModeChange(mode)}
                style={{
                  padding: "6px 12px",
                  fontSize: "11px",
                  backgroundColor: params.mode === mode ? "rgba(0,150,255,0.3)" : "rgba(255,255,255,0.1)",
                  border: `1px solid ${params.mode === mode ? "rgba(0,150,255,0.5)" : "rgba(255,255,255,0.2)"}`,
                  borderRadius: "6px",
                  color: "white",
                  cursor: "pointer",
                  textTransform: "capitalize"
                }}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {/* Speed Control */}
        <div style={{ marginBottom: 16 }}>
          <Slider
            label="Speed"
            value={params.speed}
            min={0.1}
            max={2.0}
            step={0.1}
            onChange={(value) => handleParamChange('speed', value)}
          />
        </div>

        {/* Intensity Control */}
        <div style={{ marginBottom: 16 }}>
          <Slider
            label="Intensity"
            value={params.intensity}
            min={0.0}
            max={1.0}
            step={0.05}
            onChange={(value) => handleParamChange('intensity', value)}
          />
        </div>

        {/* Hue Control */}
        <div style={{ marginBottom: 16 }}>
          <Slider
            label="Color Hue"
            value={params.hue}
            min={0}
            max={360}
            step={1}
            onChange={(value) => handleParamChange('hue', value)}
          />
        </div>

        {/* Music Reactivity */}
        <div style={{ marginBottom: 16 }}>
          <Slider
            label="Music Reactivity"
            value={params.musicReact}
            min={0.0}
            max={1.0}
            step={0.05}
            onChange={(value) => handleParamChange('musicReact', value)}
          />
        </div>

        {/* Motion Reactivity */}
        <div style={{ marginBottom: 16 }}>
          <Slider
            label="Motion Reactivity"
            value={params.motionReact}
            min={0.0}
            max={1.0}
            step={0.05}
            onChange={(value) => handleParamChange('motionReact', value)}
          />
        </div>

        {/* Status Display */}
        <div style={{ 
          fontSize: "10px", 
          color: "rgba(255,255,255,0.7)", 
          padding: "8px",
          backgroundColor: "rgba(0,0,0,0.3)",
          borderRadius: "4px",
          marginTop: "8px"
        }}>
          <div><strong>Music:</strong> Energy: {music.energy.toFixed(3)}</div>
          <div><strong>Motion:</strong> {motion ? `Sharpness: ${motion.sharpness.toFixed(3)}` : "No motion data"}</div>
          <div><strong>Mode:</strong> {params.mode}</div>
        </div>
      </div>
    </div>
  );
}
