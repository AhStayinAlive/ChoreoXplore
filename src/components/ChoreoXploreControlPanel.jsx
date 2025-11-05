import { useVisStore } from "../state/useVisStore";
import useStore from "../core/store";
import Slider from "./reusables/Slider";
import ToggleButton from "./reusables/ToggleButton";

export default function ChoreoXploreControlPanel() {
  const music = useVisStore(s => s.music);
  const motion = useVisStore(s => s.motion);
  const params = useVisStore(s => s.params);
  const isActive = useVisStore(s => s.isActive);
  const setParams = useVisStore(s => s.setParams);
  const setIsActive = useVisStore(s => s.setIsActive);
  const userColors = useStore(s => s.userColors);
  const setUserColors = useStore(s => s.setUserColors);

  const handleParamChange = (param, value) => {
    setParams({ [param]: value });
  };

  const setAmbientAnimationParams = useStore(s => s.setAmbientAnimationParams);
  const ambientAnimationParams = useStore(s => s.ambientAnimationParams);

  const handleModeChange = (mode) => {
    setParams({ mode });
    
    // Map new visual modes to ambient animation effect types
    const modeToEffectMap = {
      'water_ripple': 'waterRipple',
      'heat_wave': 'heatWave',
      'flowing': 'flowingDistortion',
      'gentle_wave': 'gentleWave'
    };
    
    if (modeToEffectMap[mode]) {
      setAmbientAnimationParams({
        ...ambientAnimationParams,
        effectType: modeToEffectMap[mode],
        isActive: true
      });
    }
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
              <option value="empty" style={{ backgroundColor: "rgba(0,0,0,0.9)", color: "#ffffff" }}>Empty</option>
              <option value="quand_cest" style={{ backgroundColor: "rgba(0,0,0,0.9)", color: "#ffffff" }}>Quand C'est</option>
              <option value="pulsating_circle" style={{ backgroundColor: "rgba(0,0,0,0.9)", color: "#ffffff" }}>Pulsating Circle</option>
              <option value="vertical_lines" style={{ backgroundColor: "rgba(0,0,0,0.9)", color: "#ffffff" }}>Raindrop</option>
              <option value="water_ripple" style={{ backgroundColor: "rgba(0,0,0,0.9)", color: "#ffffff" }}>Water Ripple</option>
              <option value="heat_wave" style={{ backgroundColor: "rgba(0,0,0,0.9)", color: "#ffffff" }}>Heat Wave</option>
              <option value="flowing" style={{ backgroundColor: "rgba(0,0,0,0.9)", color: "#ffffff" }}>Flowing</option>
              <option value="gentle_wave" style={{ backgroundColor: "rgba(0,0,0,0.9)", color: "#ffffff" }}>Gentle Wave</option>
              <option value="silk_veil" style={{ backgroundColor: "rgba(0,0,0,0.9)", color: "#ffffff" }}>Silk Veil</option>
              <option value="lotus_bloom" style={{ backgroundColor: "rgba(0,0,0,0.9)", color: "#ffffff" }}>Lotus Bloom</option>
              <option value="stained_glass_rose" style={{ backgroundColor: "rgba(0,0,0,0.9)", color: "#ffffff" }}>Stained Glass Rose</option>
              <option value="ink_water" style={{ backgroundColor: "rgba(0,0,0,0.9)", color: "#ffffff" }}>Ink & Water</option>
              <option value="opaline_wave" style={{ backgroundColor: "rgba(0,0,0,0.9)", color: "#ffffff" }}>Opaline Wave</option>
              <option value="opaline_film" style={{ backgroundColor: "rgba(0,0,0,0.9)", color: "#ffffff" }}>🌈 Opaline Film</option>
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
            showValue={false}
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
            showValue={false}
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
            showValue={false}
          />
        </div>

      </div>
    </div>
  );
}
