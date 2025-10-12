import { useVisStore } from "../state/useVisStore";
import Slider from "./reusables/Slider";
import ToggleButton from "./reusables/ToggleButton";

export default function IrinaControlPanel() {
  const music = useVisStore(s => s.music);
  const motion = useVisStore(s => s.motion);
  const params = useVisStore(s => s.params);
  const isActive = useVisStore(s => s.isActive);
  const setParams = useVisStore(s => s.setParams);
  const setIsActive = useVisStore(s => s.setIsActive);

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
              <option value="auto" style={{ backgroundColor: "rgba(0,0,0,0.9)", color: "#ffffff" }}>Auto</option>
              <option value="lines" style={{ backgroundColor: "rgba(0,0,0,0.9)", color: "#ffffff" }}>Lines</option>
              <option value="surfaces" style={{ backgroundColor: "rgba(0,0,0,0.9)", color: "#ffffff" }}>Surfaces</option>
              <option value="volumes" style={{ backgroundColor: "rgba(0,0,0,0.9)", color: "#ffffff" }}>Volumes</option>
              <option value="quand_cest" style={{ backgroundColor: "rgba(0,0,0,0.9)", color: "#ffffff" }}>Quand C'est</option>
              <option value="pulsating_circle" style={{ backgroundColor: "rgba(0,0,0,0.9)", color: "#ffffff" }}>Pulsating Circle</option>
              <option value="pulsating_sphere" style={{ backgroundColor: "rgba(0,0,0,0.9)", color: "#ffffff" }}>Pulsating Sphere</option>
              <option value="ripple" style={{ backgroundColor: "rgba(0,0,0,0.9)", color: "#ffffff" }}>Ripple Mode</option>
              <option value="falling_leaves" style={{ backgroundColor: "rgba(0,0,0,0.9)", color: "#ffffff" }}>Falling Leaves</option>
              <option value="nebula" style={{ backgroundColor: "rgba(0,0,0,0.9)", color: "#ffffff" }}>Nebula</option>
            </select>
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
