import React from 'react';
import Slider from '../components/reusables/Slider';
import ToggleButton from '../components/reusables/ToggleButton';

/**
 * HandRippleControls - UI controls for hand ripple post-process pass
 * Integrates with existing HandEffectsPanel style
 */
export default function HandRippleControls({ ripplePass, enabled, onEnabledChange }) {
  const [params, setParams] = React.useState({
    maxRipples: ripplePass.maxRipples,
    expansionSpeed: ripplePass.expansionSpeed,
    decay: ripplePass.decay,
    maxRadius: ripplePass.maxRadius,
    baseAmplitude: ripplePass.baseAmplitude
  });

  // Update pass when params change
  React.useEffect(() => {
    if (!ripplePass) return;
    
    ripplePass.maxRipples = params.maxRipples;
    ripplePass.expansionSpeed = params.expansionSpeed;
    ripplePass.decay = params.decay;
    ripplePass.maxRadius = params.maxRadius;
    ripplePass.baseAmplitude = params.baseAmplitude;
    ripplePass.updateParameters();
  }, [params, ripplePass]);

  const handleParamChange = (key, value) => {
    setParams(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h4 style={{ fontWeight: 600, margin: 0, fontSize: '14px' }}>Hand Ripple Pass</h4>
        <ToggleButton
          label="Enabled"
          selected={enabled}
          onChange={onEnabledChange}
        />
      </div>

      {enabled && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Slider
            label="Max Ripples"
            value={params.maxRipples}
            onChange={(val) => handleParamChange('maxRipples', Math.round(val))}
            min={1}
            max={16}
            step={1}
          />
          
          <Slider
            label="Expansion Speed"
            value={params.expansionSpeed}
            onChange={(val) => handleParamChange('expansionSpeed', val)}
            min={0.1}
            max={2.0}
            step={0.1}
          />
          
          <Slider
            label="Decay"
            value={params.decay}
            onChange={(val) => handleParamChange('decay', val)}
            min={0.5}
            max={3.0}
            step={0.1}
          />
          
          <Slider
            label="Max Radius"
            value={params.maxRadius}
            onChange={(val) => handleParamChange('maxRadius', val)}
            min={0.1}
            max={1.0}
            step={0.05}
          />
          
          <Slider
            label="Base Amplitude"
            value={params.baseAmplitude}
            onChange={(val) => handleParamChange('baseAmplitude', val)}
            min={0.1}
            max={2.0}
            step={0.1}
          />
        </div>
      )}
    </div>
  );
}
