import { useVisStore } from "../state/useVisStore";
import useStore from "../core/store";
import Slider from "./reusables/Slider";
import ToggleButton from "./reusables/ToggleButton";
import { useState } from "react";

export default function ChoreoXploreControlPanel() {
  const music = useVisStore(s => s.music);
  const motion = useVisStore(s => s.motion);
  const params = useVisStore(s => s.params);
  const isActive = useVisStore(s => s.isActive);
  const setParams = useVisStore(s => s.setParams);
  const setIsActive = useVisStore(s => s.setIsActive);
  const userColors = useStore(s => s.userColors);
  const setUserColors = useStore(s => s.setUserColors);
  
  // Ambient animation parameters
  const ambientParams = useStore(s => s.ambientAnimationParams);
  const setAmbientParams = useStore(s => s.setAmbientAnimationParams);
  const [audioExpanded, setAudioExpanded] = useState(false);

  const handleParamChange = (param, value) => {
    setParams({ [param]: value });
  };

  const handleModeChange = (mode) => {
    setParams({ mode });
  };

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <h3 style={{ fontWeight: 600, marginBottom: 12, flexShrink: 0 }}>ChoreoXplore</h3>
      
      <div className="glass-scrollbar" style={{ flex: 1, overflow: "auto", paddingRight: "4px", marginBottom: "8px", minHeight: 0 }}>
        
        {/* Activation Toggle with Color Pickers */}
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ flex: 1 }}>
            <ToggleButton
              label="Enable Visuals"
              selected={isActive}
              onChange={setIsActive}
            />
          </div>
          
          {/* Background Color Picker */}
          <div style={{ minWidth: '60px' }}>
            <label style={{
              display: 'block',
              color: 'white',
              fontSize: '10px',
              marginBottom: '4px',
              fontWeight: '500',
              textAlign: 'center'
            }}>
              Background
            </label>
            <input
              type="color"
              value={userColors.bgColor}
              onChange={(e) => setUserColors({ ...userColors, bgColor: e.target.value })}
              style={{
                width: '100%',
                height: '28px',
                border: '1px solid rgba(0, 150, 255, 0.3)',
                borderRadius: '6px',
                cursor: 'pointer',
                background: 'transparent',
                outline: 'none'
              }}
            />
          </div>

          {/* Visual Assets Color Picker */}
          <div style={{ minWidth: '60px' }}>
            <label style={{
              display: 'block',
              color: 'white',
              fontSize: '10px',
              marginBottom: '4px',
              fontWeight: '500',
              textAlign: 'center'
            }}>
              Assets
            </label>
            <input
              type="color"
              value={userColors.assetColor}
              onChange={(e) => setUserColors({ ...userColors, assetColor: e.target.value })}
              style={{
                width: '100%',
                height: '28px',
                border: '1px solid rgba(0, 150, 255, 0.3)',
                borderRadius: '6px',
                cursor: 'pointer',
                background: 'transparent',
                outline: 'none'
              }}
            />
          </div>
        </div>

        {/* Visual Mode Selection */}
        <div style={{ marginBottom: 16 }}>
          <h4 style={{ color: "white", fontSize: "12px", margin: "0 0 8px 0" }}>Visual Mode</h4>
          <div style={{ position: "relative" }}>
            <select
              value={params.mode}
              onChange={(e) => handleModeChange(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                fontSize: "13px",
                backgroundColor: "rgba(0,0,0,0.4)",
                border: "1px solid rgba(0,150,255,0.3)",
                borderRadius: "8px",
                color: "#ffffff",
                cursor: "pointer",
                outline: "none",
                backdropFilter: "blur(10px)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                transition: "all 0.2s ease",
                fontWeight: "500",
                appearance: "none",
                backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23ffffff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6,9 12,15 18,9'%3e%3c/polyline%3e%3c/svg%3e")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 12px center",
                backgroundSize: "16px",
                paddingRight: "40px"
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "rgba(0,150,255,0.6)";
                e.target.style.backgroundColor = "rgba(0,0,0,0.6)";
                e.target.style.boxShadow = "0 4px 12px rgba(0,150,255,0.2)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "rgba(0,150,255,0.3)";
                e.target.style.backgroundColor = "rgba(0,0,0,0.4)";
                e.target.style.boxShadow = "0 2px 8px rgba(0,0,0,0.3)";
              }}
            >
              <option value="lines" style={{ backgroundColor: "rgba(0,0,0,0.9)", color: "#ffffff" }}>Lines</option>
              <option value="quand_cest" style={{ backgroundColor: "rgba(0,0,0,0.9)", color: "#ffffff" }}>Quand C'est</option>
              <option value="pulsating_circle" style={{ backgroundColor: "rgba(0,0,0,0.9)", color: "#ffffff" }}>Pulsating Circle</option>
              <option value="vertical_lines" style={{ backgroundColor: "rgba(0,0,0,0.9)", color: "#ffffff" }}>Raindrop</option>
            </select>
          </div>
        </div>

        {/* Speed Control */}
        <div style={{ marginBottom: 16 }}>
          <Slider
            label="Speed"
            value={params.speed}
            min={0}
            max={2.0}
            step={0.01}
            format={(v) => Math.round(v * 100).toString()}
            onChange={(value) => handleParamChange('speed', value)}
          />
        </div>

        {/* Transparency Control */}
        <div style={{ marginBottom: 16 }}>
          <Slider
            label="Transparency"
            value={params.intensity}
            min={0.0}
            max={1.0}
            step={0.05}
            format={(v) => v.toFixed(2)}
            onChange={(value) => handleParamChange('intensity', value)}
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
            format={(v) => v.toFixed(2)}
            onChange={(value) => handleParamChange('musicReact', value)}
          />
        </div>

        {/* Audio-Reactive Background Animation */}
        <div style={{ marginBottom: 16, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.1)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <h4 style={{ color: "white", fontSize: "12px", margin: 0, fontWeight: 600 }}>Audio-Reactive Background</h4>
            <button
              onClick={() => setAudioExpanded(!audioExpanded)}
              style={{
                padding: "4px 10px",
                backgroundColor: "rgba(107,114,128,0.6)",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: "6px",
                color: "white",
                fontSize: "11px",
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
            >
              {audioExpanded ? '−' : '+'}
            </button>
          </div>

          {/* Ambient Animation Toggle */}
          <div style={{ marginBottom: 12 }}>
            <ToggleButton
              label="Animation"
              selected={ambientParams?.isActive ?? true}
              onChange={(value) => setAmbientParams({ ...ambientParams, isActive: value })}
            />
          </div>

          {/* Effect Type Selection */}
          <div style={{ marginBottom: 12 }}>
            <h5 style={{ color: "rgba(255,255,255,0.8)", fontSize: "11px", margin: "0 0 6px 0" }}>Effect Type</h5>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
              {[
                { value: 'waterRipple', label: 'Water Ripple' },
                { value: 'heatWave', label: 'Heat Wave' },
                { value: 'flowingDistortion', label: 'Flowing' },
                { value: 'gentleWave', label: 'Gentle Wave' }
              ].map((effect) => (
                <button
                  key={effect.value}
                  onClick={() => setAmbientParams({ ...ambientParams, effectType: effect.value })}
                  style={{
                    padding: "6px 8px",
                    backgroundColor: ambientParams?.effectType === effect.value ? "rgba(59,130,246,0.6)" : "rgba(107,114,128,0.4)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    borderRadius: "6px",
                    color: "white",
                    fontSize: "10px",
                    cursor: "pointer",
                    transition: "all 0.2s ease"
                  }}
                >
                  {effect.label}
                </button>
              ))}
            </div>
          </div>

          {/* Audio Reactive Toggle */}
          <div style={{ marginBottom: 12 }}>
            <ToggleButton
              label="Audio Reactive"
              selected={ambientParams?.audioReactive ?? true}
              onChange={(value) => setAmbientParams({ ...ambientParams, audioReactive: value })}
            />
          </div>

          {/* Expanded Controls */}
          {audioExpanded && (
            <>
              {/* Speed */}
              <div style={{ marginBottom: 12 }}>
                <Slider
                  label="Speed"
                  value={ambientParams?.speed ?? 1.0}
                  min={0.1}
                  max={3.0}
                  step={0.1}
                  format={(v) => `${v.toFixed(1)}x`}
                  onChange={(value) => setAmbientParams({ ...ambientParams, speed: value })}
                />
              </div>

              {/* Amplitude */}
              <div style={{ marginBottom: 12 }}>
                <Slider
                  label="Amplitude"
                  value={ambientParams?.amplitude ?? 0.5}
                  min={0.0}
                  max={1.0}
                  step={0.05}
                  format={(v) => v.toFixed(2)}
                  onChange={(value) => setAmbientParams({ ...ambientParams, amplitude: value })}
                />
              </div>

              {/* Intensity */}
              <div style={{ marginBottom: 12 }}>
                <Slider
                  label="Intensity"
                  value={ambientParams?.intensity ?? 0.3}
                  min={0.0}
                  max={1.0}
                  step={0.05}
                  format={(v) => v.toFixed(2)}
                  onChange={(value) => setAmbientParams({ ...ambientParams, intensity: value })}
                />
              </div>

              {/* Audio Sensitivity - only show when audio reactive is on */}
              {ambientParams?.audioReactive && (
                <>
                  <div style={{ marginBottom: 12 }}>
                    <Slider
                      label="Audio Sensitivity"
                      value={ambientParams?.audioSensitivity ?? 0.5}
                      min={0.0}
                      max={2.0}
                      step={0.1}
                      format={(v) => v.toFixed(1)}
                      onChange={(value) => setAmbientParams({ ...ambientParams, audioSensitivity: value })}
                    />
                  </div>

                  {/* Bass Influence */}
                  <div style={{ marginBottom: 12 }}>
                    <Slider
                      label="Bass Influence"
                      value={ambientParams?.audioBassInfluence ?? 0.7}
                      min={0.0}
                      max={1.0}
                      step={0.1}
                      format={(v) => v.toFixed(1)}
                      onChange={(value) => setAmbientParams({ ...ambientParams, audioBassInfluence: value })}
                    />
                  </div>

                  {/* Mid Influence */}
                  <div style={{ marginBottom: 12 }}>
                    <Slider
                      label="Mid Influence"
                      value={ambientParams?.audioMidInfluence ?? 0.5}
                      min={0.0}
                      max={1.0}
                      step={0.1}
                      format={(v) => v.toFixed(1)}
                      onChange={(value) => setAmbientParams({ ...ambientParams, audioMidInfluence: value })}
                    />
                  </div>

                  {/* High Influence */}
                  <div style={{ marginBottom: 12 }}>
                    <Slider
                      label="High Influence"
                      value={ambientParams?.audioHighInfluence ?? 0.3}
                      min={0.0}
                      max={1.0}
                      step={0.1}
                      format={(v) => v.toFixed(1)}
                      onChange={(value) => setAmbientParams({ ...ambientParams, audioHighInfluence: value })}
                    />
                  </div>
                </>
              )}
            </>
          )}
        </div>

      </div>
    </div>
  );
}
