import { useVisStore } from "../state/useVisStore";
import Slider from "./reusables/Slider";
import ToggleButton from "./reusables/ToggleButton";

export default function HandRippleControlPanel() {
  const params = useVisStore(s => s.params);
  const setParams = useVisStore(s => s.setParams);

  const handRippleSettings = params.handRipple || {
    enabled: false,
    leftHandEnabled: false,
    rightHandEnabled: false,
    baseColor: '#00ccff',
    rippleColor: '#ff00cc',
    radius: 0.4,
    intensity: 0.8
  };

  const handleParamChange = (value) => {
    setParams({ handRipple: { ...handRippleSettings, ...value } });
  };

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <h3 style={{ fontWeight: 600, marginBottom: 12, flexShrink: 0 }}>Hand Ripple Effect</h3>
      
      <div className="glass-scrollbar" style={{ flex: 1, overflow: "auto", paddingRight: "4px", marginBottom: "8px", minHeight: 0 }}>
        
        {/* Hand Enable Toggles */}
        <div style={{ marginBottom: 16, display: 'flex', gap: '12px' }}>
          <div style={{ flex: 1 }}>
            <ToggleButton
              label="Left Hand"
              selected={handRippleSettings.leftHandEnabled}
              onChange={(enabled) => handleParamChange({ leftHandEnabled: enabled })}
            />
          </div>
          <div style={{ flex: 1 }}>
            <ToggleButton
              label="Right Hand"
              selected={handRippleSettings.rightHandEnabled}
              onChange={(enabled) => handleParamChange({ rightHandEnabled: enabled })}
            />
          </div>
        </div>

        {/* Show settings only when at least one hand is enabled */}
        {(handRippleSettings.leftHandEnabled || handRippleSettings.rightHandEnabled) && (
          <>
            {/* Color Pickers */}
            <div style={{ 
              marginBottom: 16, 
              display: 'flex', 
              gap: '12px',
              alignItems: 'flex-start' 
            }}>
              {/* Base Color Picker */}
              <div style={{ flex: 1 }}>
                <label style={{
                  display: 'block',
                  color: 'white',
                  fontSize: '10px',
                  marginBottom: '4px',
                  fontWeight: '500',
                }}>
                  Base Color
                </label>
                <input
                  type="color"
                  value={handRippleSettings.baseColor}
                  onChange={(e) => handleParamChange({ baseColor: e.target.value })}
                  style={{
                    width: '100%',
                    height: '32px',
                    border: '1px solid rgba(0, 150, 255, 0.3)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    background: 'transparent',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Ripple Color Picker */}
              <div style={{ flex: 1 }}>
                <label style={{
                  display: 'block',
                  color: 'white',
                  fontSize: '10px',
                  marginBottom: '4px',
                  fontWeight: '500',
                }}>
                  Ripple Color
                </label>
                <input
                  type="color"
                  value={handRippleSettings.rippleColor}
                  onChange={(e) => handleParamChange({ rippleColor: e.target.value })}
                  style={{
                    width: '100%',
                    height: '32px',
                    border: '1px solid rgba(0, 150, 255, 0.3)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    background: 'transparent',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            {/* Radius Slider */}
            <div style={{ marginBottom: 16 }}>
              <Slider
                label="Ripple Radius"
                value={handRippleSettings.radius}
                min={0.1}
                max={0.8}
                step={0.05}
                onChange={(value) => handleParamChange({ radius: value })}
              />
            </div>

            {/* Intensity Slider */}
            <div style={{ marginBottom: 16 }}>
              <Slider
                label="Ripple Intensity"
                value={handRippleSettings.intensity}
                min={0.1}
                max={1.5}
                step={0.1}
                onChange={(value) => handleParamChange({ intensity: value })}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
