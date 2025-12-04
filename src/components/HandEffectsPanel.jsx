import { useVisStore } from "../state/useVisStore";
import Slider from "./reusables/Slider";
import ToggleButton from "./reusables/ToggleButton";
import { useEffect, useState } from "react";

export default function HandEffectsPanel() {
  // Subscribe to the entire store state to ensure we catch all updates
  const storeState = useVisStore();
  const handEffect = storeState.params.handEffect || {};
  const setParams = storeState.setParams;

  const handleEffectChange = (updates) => {
    setParams({ handEffect: { ...handEffect, ...updates } });
  };

  const handleRippleChange = (updates) => {
    setParams({ 
      handEffect: { 
        ...handEffect, 
        ripple: { 
          ...(handEffect.ripple || {}),  // Safe fallback
          ...updates 
        } 
      } 
    });
  };

  const handleSmokeChange = (updates) => {
    setParams({ 
      handEffect: { 
        ...handEffect, 
        smoke: { 
          ...(handEffect.smoke || {}),  // Safe fallback
          ...updates 
        } 
      } 
    });
  };

  const handleFluidDistortionChange = (updates) => {
    setParams({ 
      handEffect: { 
        ...handEffect, 
        fluidDistortion: { 
          ...(handEffect.fluidDistortion || {}),  // Safe fallback
          ...updates 
        } 
      } 
    });
  };

  const dropdownStyle = {
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
  };

  const colorPickerStyle = {
    width: '100%',
    height: '32px',
    border: '1px solid rgba(0, 150, 255, 0.3)',
    borderRadius: '6px',
    cursor: 'pointer',
    background: 'transparent',
    outline: 'none'
  };

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 8 }}>
        <h3 style={{ fontWeight: 600, margin: 0, flexShrink: 0 }}>Hand Effects</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <ToggleButton
            label="Preview"
            selected={handEffect.showQuickView === true}
            onChange={(val) => {
              setParams({ handEffect: { ...handEffect, showQuickView: !!val } });
            }}
          />
        </div>
      </div>
      
      <div className="glass-scrollbar" style={{ flex: 1, overflow: "auto", paddingRight: "4px", marginBottom: "8px", minHeight: 0 }}>
        
        {/* Effect Type Dropdown */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', color: 'white', fontSize: '12px', marginBottom: '8px', fontWeight: '500' }}>
            Effect Type
          </label>
          <select
            data-wizard-step="4"
            value={handEffect.type}
            onChange={(e) => handleEffectChange({ type: e.target.value })}
            style={dropdownStyle}
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
            <option value="none" style={{ backgroundColor: "rgba(0,0,0,0.9)", color: "#ffffff" }}>Off</option>
            <option value="ripple" style={{ backgroundColor: "rgba(0,0,0,0.9)", color: "#ffffff" }}>Ripple Effect</option>
            <option value="smoke" style={{ backgroundColor: "rgba(0,0,0,0.9)", color: "#ffffff" }}>Smoke Effect</option>
            <option value="fluidDistortion" style={{ backgroundColor: "rgba(0,0,0,0.9)", color: "#ffffff" }}>Fluid Effect</option>
            <option value="particleTrail" style={{ backgroundColor: "rgba(0,0,0,0.9)", color: "#ffffff" }}>Square Particle Effect</option>
          </select>
        </div>

        {/* Hand Selection Dropdown - only show when effect is active */}
        {handEffect.type !== 'none' && (
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', color: 'white', fontSize: '12px', marginBottom: '8px', fontWeight: '500' }}>
              Hand Selection
            </label>
            <select
              data-wizard-step="5"
              value={handEffect.handSelection}
              onChange={(e) => handleEffectChange({ handSelection: e.target.value })}
              style={dropdownStyle}
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
              <option value="none" style={{ backgroundColor: "rgba(0,0,0,0.9)", color: "#ffffff" }}>Off</option>
              <option value="left" style={{ backgroundColor: "rgba(0,0,0,0.9)", color: "#ffffff" }}>Left Hand</option>
              <option value="right" style={{ backgroundColor: "rgba(0,0,0,0.9)", color: "#ffffff" }}>Right Hand</option>
              <option value="both" style={{ backgroundColor: "rgba(0,0,0,0.9)", color: "#ffffff" }}>Both Hands</option>
            </select>
          </div>
        )}

        {/* Separator line */}
        {handEffect.type !== 'none' && handEffect.handSelection !== 'none' && (
          <div style={{ 
            height: '1px', 
            background: 'rgba(0, 150, 255, 0.3)', 
            margin: '16px 0' 
          }} />
        )}

        {/* Ripple Effect Settings */}
        {handEffect.type === 'ripple' && handEffect.handSelection !== 'none' && (
          <>
            <h4 style={{ color: 'white', fontSize: '12px', marginBottom: '12px', fontWeight: '500' }}>
              Ripple Settings
            </h4>
            
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
                  value={handEffect.ripple?.baseColor || '#00ccff'}
                  onChange={(e) => handleRippleChange({ baseColor: e.target.value })}
                  style={colorPickerStyle}
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
                  value={handEffect.ripple?.rippleColor || '#ff00cc'}
                  onChange={(e) => handleRippleChange({ rippleColor: e.target.value })}
                  style={colorPickerStyle}
                />
              </div>
            </div>

            {/* Radius Slider */}
            <div style={{ marginBottom: 16 }}>
              <Slider
                label="Ripple Radius"
                value={handEffect.ripple?.radius || 0.1}
                min={0.1}
                max={0.8}
                step={0.05}
                format={(v) => v.toFixed(2)}
                showValue={false}
                onChange={(value) => handleRippleChange({ radius: value })}
              />
            </div>

            {/* Intensity Slider */}
            <div style={{ marginBottom: 16 }}>
              <Slider
                label="Ripple Intensity"
                value={handEffect.ripple?.intensity || 0.8}
                min={0.1}
                max={1.5}
                step={0.1}
                format={(v) => v.toFixed(2)}
                showValue={false}
                onChange={(value) => handleRippleChange({ intensity: value })}
              />
            </div>
          </>
        )}

        {/* Smoke Effect Settings */}
        {handEffect.type === 'smoke' && handEffect.handSelection !== 'none' && (
          <>
            <h4 style={{ color: 'white', fontSize: '12px', marginBottom: '12px', fontWeight: '500' }}>
              Smoke Settings
            </h4>
            
            {/* Smoke Color */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', color: 'white', fontSize: '10px', marginBottom: '4px', fontWeight: '500' }}>
                Smoke Color
              </label>
              <input
                type="color"
                value={handEffect.smoke?.color || '#ffffff'}
                onChange={(e) => handleSmokeChange({ color: e.target.value })}
                style={colorPickerStyle}
              />
            </div>

            {/* Opacity Slider */}
            <div style={{ marginBottom: 16 }}>
              <Slider
                label="Opacity"
                value={handEffect.smoke?.intensity || 0.7}
                min={0.1}
                max={1.0}
                step={0.05}
                format={(v) => v.toFixed(2)}
                showValue={false}
                onChange={(value) => handleSmokeChange({ intensity: value })}
              />
            </div>

            {/* Radius Slider */}
            <div style={{ marginBottom: 16 }}>
              <Slider
                label="Radius"
                value={handEffect.smoke?.radius || 0.8}
                min={0.5}
                max={3.0}
                step={0.1}
                format={(v) => v.toFixed(2)}
                showValue={false}
                onChange={(value) => handleSmokeChange({ radius: value })}
              />
            </div>

            {/* Trail Length Slider */}
            <div style={{ marginBottom: 16 }}>
              <Slider
                label="Trail Length"
                value={handEffect.smoke?.trailLength || 0.5}
                min={0.1}
                max={1.0}
                step={0.05}
                format={(v) => v.toFixed(2)}
                showValue={false}
                onChange={(value) => handleSmokeChange({ trailLength: value })}
              />
            </div>
          </>
        )}

        {/* Fluid Distortion Effect Settings */}
        {handEffect.type === 'fluidDistortion' && handEffect.handSelection !== 'none' && (
          <>
            <h4 style={{ color: 'white', fontSize: '12px', marginBottom: '12px', fontWeight: '500' }}>
              Fluid Effect Settings
            </h4>
            
            {/* Fluid Color - Always shown */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', color: 'white', fontSize: '10px', marginBottom: '4px', fontWeight: '500' }}>
                Fluid Color
              </label>
              <input
                type="color"
                value={handEffect.fluidDistortion?.fluidColor || '#005eff'}
                onChange={(e) => handleFluidDistortionChange({ fluidColor: e.target.value })}
                style={colorPickerStyle}
              />
            </div>

            {/* Radius Slider - Always shown */}
            <div style={{ marginBottom: 16 }}>
              <Slider
                label="Radius"
                value={handEffect.fluidDistortion?.radius || 0.1}
                min={0.01}
                max={1}
                step={0.01}
                format={(v) => v.toFixed(2)}
                showValue={false}
                onChange={(value) => handleFluidDistortionChange({ radius: value })}
              />
            </div>

            {/* Show Swirl and Rainbow for left/right hand only */}
            {handEffect.handSelection !== 'both' && (
              <>
                {/* Swirl Slider */}
                <div style={{ marginBottom: 16 }}>
                  <Slider
                    label="Swirl"
                    value={handEffect.fluidDistortion?.swirl || 0}
                    min={0}
                    max={20}
                    step={1}
                    format={(v) => v.toFixed(0)}
                    showValue={false}
                    onChange={(value) => handleFluidDistortionChange({ swirl: value })}
                  />
                </div>

                {/* Rainbow Toggle */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    color: 'white', 
                    fontSize: '12px', 
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}>
                    <input
                      type="checkbox"
                      checked={handEffect.fluidDistortion?.rainbow || false}
                      onChange={(e) => handleFluidDistortionChange({ rainbow: e.target.checked })}
                      style={{
                        marginRight: '8px',
                        accentColor: '#0096ff'
                      }}
                    />
                    Rainbow Mode
                  </label>
                </div>
              </>
            )}
          </>
        )}
        {/* Square Particle Effect Settings */}
        {handEffect.type === 'particleTrail' && handEffect.handSelection !== 'none' && (
          <div style={{ marginBottom: 16 }}>
            <h4 style={{ color: "white", fontSize: "12px", margin: "0 0 8px 0", fontWeight: "500" }}>Square Particle Effect Settings</h4>
            
            {/* Trail Color */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', color: 'white', fontSize: '11px', marginBottom: '6px', fontWeight: '400' }}>
                Trail Color
              </label>
              <input
                type="color"
                value={handEffect.particleTrail?.color || '#00ffff'}
                onChange={(e) => handleEffectChange({
                  particleTrail: { ...handEffect.particleTrail, color: e.target.value }
                })}
                style={{
                  width: '100%',
                  height: '32px',
                  border: '1px solid rgba(0, 150, 255, 0.3)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  background: 'transparent'
                }}
              />
            </div>

            {/* Opacity */}
            <div style={{ marginBottom: 12 }}>
              <Slider
                label="Opacity"
                value={handEffect.particleTrail?.intensity ?? 0.8}
                min={0}
                max={1}
                step={0.05}
                showValue={false}
                onChange={(val) => handleEffectChange({
                  particleTrail: { ...handEffect.particleTrail, intensity: val }
                })}
              />
            </div>

            {/* Particle Size */}
            <div style={{ marginBottom: 12 }}>
              <Slider
                label="Particle Size"
                value={handEffect.particleTrail?.particleSize || 0.15}
                min={0.05}
                max={0.3}
                step={0.01}
                showValue={false}
                onChange={(val) => handleEffectChange({
                  particleTrail: { ...handEffect.particleTrail, particleSize: val }
                })}
              />
            </div>

            {/* Trail Length */}
            <div style={{ marginBottom: 12 }}>
              <Slider
                label="Trail Length"
                value={handEffect.particleTrail?.trailLength || 50}
                min={10}
                max={100}
                step={5}
                showValue={false}
                onChange={(val) => handleEffectChange({
                  particleTrail: { ...handEffect.particleTrail, trailLength: val }
                })}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
