import { useState } from 'react';
import Slider from './reusables/Slider';
import useStore from '../core/store';

const AmbientAnimationControlPanel = ({ 
  isVisible = true,
  className = ""
}) => {
  const parameters = useStore(s => s.ambientAnimationParams);
  const setParameters = useStore(s => s.setAmbientAnimationParams);
  const [isExpanded, setIsExpanded] = useState(false);

  /**
   * Format parameter value for display with consistent decimal places
   * @param {number} value - The parameter value to format
   * @param {number} defaultValue - The default value to use if parameter is undefined
   * @returns {string} Formatted value with 2 decimal places
   */
  const formatValue = (value, defaultValue) => {
    return (value ?? defaultValue).toFixed(2);
  };

  // Effect type options
  const effectTypes = [
    { value: 'waterRipple', label: 'Water Ripple', description: 'Gentle ripples like water surface' },
    { value: 'heatWave', label: 'Heat Wave', description: 'Heat shimmer distortion effect' },
    { value: 'flowingDistortion', label: 'Flowing Distortion', description: 'Organic flowing patterns' },
    { value: 'gentleWave', label: 'Gentle Wave', description: 'Soft, subtle wave motion' }
  ];

  // Parameters are now managed by the store, no need to notify parent

  const handleParameterChange = (key, value) => {
    const newParams = {
      ...parameters,
      [key]: value
    };
    setParameters(newParams);
  };

  const handleEffectTypeChange = (effectType) => {
    const newParams = {
      ...parameters,
      effectType
    };
    setParameters(newParams);
  };

  const resetToDefaults = () => {
    const defaultParams = {
      isActive: true,
      effectType: 'waterRipple',
      speed: 1.0,
      amplitude: 0.5,
      wavelength: 1.0,
      intensity: 0.3,
      audioReactive: true,
      audioSensitivity: 0.5,
      audioBassInfluence: 0.7,
      audioMidInfluence: 0.5,
      audioHighInfluence: 0.3
    };
    setParameters(defaultParams);
  };

  if (!isVisible) return null;

  return (
    <div className={`bg-gray-900 text-white rounded-lg ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold" style={{ color: 'white', margin: 0 }}>Ambient Animation</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'nowrap' }}>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            style={{
              padding: "6px 12px",
              backgroundColor: "rgba(107,114,128,0.8)",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: "6px",
              color: "white",
              fontSize: "12px",
              cursor: "pointer",
              transition: "all 0.2s ease",
              whiteSpace: "nowrap",
              minWidth: "auto",
              flexShrink: 0
            }}
          >
            {isExpanded ? '−' : '+'}
          </button>
        </div>
      </div>

      {/* Animation Toggle */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <label className="text-white/90 text-sm font-medium">Animation</label>
          <button
            onClick={() => handleParameterChange('isActive', !parameters.isActive)}
            style={{
              padding: "6px 12px",
              backgroundColor: parameters.isActive ? "rgba(34,197,94,0.8)" : "rgba(107,114,128,0.8)",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: "6px",
              color: "white",
              fontSize: "12px",
              cursor: "pointer",
              transition: "all 0.2s ease",
              whiteSpace: "nowrap",
              minWidth: "auto",
              flexShrink: 0
            }}
          >
            {parameters.isActive ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>


      {/* Effect Type Selector */}
      <div className="mb-4">
        <label className="text-white/90 text-sm font-medium mb-2 block">Effect Type</label>
        <div className="grid grid-cols-2 gap-2">
          {effectTypes.map((effect) => (
            <button
              key={effect.value}
              onClick={() => handleEffectTypeChange(effect.value)}
              style={{
                padding: "8px 12px",
                backgroundColor: parameters.effectType === effect.value ? "rgba(59,130,246,0.8)" : "rgba(107,114,128,0.8)",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: "6px",
                color: "white",
                fontSize: "12px",
                cursor: "pointer",
                transition: "all 0.2s ease",
                textAlign: "center"
              }}
              title={effect.description}
            >
              {effect.label}
            </button>
          ))}
        </div>
      </div>

      {/* Expanded Controls */}
      {isExpanded && (
        <div className="space-y-4">
          {/* Speed Control */}
          <div>
            <label className="text-white/80 text-xs mb-2 block">
              Speed: {parameters.speed.toFixed(1)}x
            </label>
            <Slider
              value={parameters.speed}
              onChange={(value) => handleParameterChange('speed', value)}
              min={0.1}
              max={3.0}
              step={0.1}
              className="w-full"
            />
          </div>

          {/* Amplitude Control */}
          <div>
            <label className="text-white/80 text-xs mb-2 block">
              Amplitude: {parameters.amplitude.toFixed(2)}
            </label>
            <Slider
              value={parameters.amplitude}
              onChange={(value) => handleParameterChange('amplitude', value)}
              min={0.0}
              max={1.0}
              step={0.05}
              className="w-full"
            />
          </div>

          {/* Wavelength Control */}
          <div>
            <label className="text-white/80 text-xs mb-2 block">
              Wavelength: {parameters.wavelength.toFixed(1)}
            </label>
            <Slider
              value={parameters.wavelength}
              onChange={(value) => handleParameterChange('wavelength', value)}
              min={0.1}
              max={3.0}
              step={0.1}
              className="w-full"
            />
          </div>

          {/* Intensity Control */}
          <div>
            <label className="text-white/80 text-xs mb-2 block">
              Intensity: {parameters.intensity.toFixed(2)}
            </label>
            <Slider
              value={parameters.intensity}
              onChange={(value) => handleParameterChange('intensity', value)}
              min={0.0}
              max={1.0}
              step={0.05}
              className="w-full"
            />
          </div>

          {/* Audio Reactivity Section */}
          <div className="pt-3 border-t border-white/10">
            <div className="flex items-center justify-between mb-2">
              <label className="text-white/90 text-sm font-medium">Audio Reactive</label>
              <button
                onClick={() => handleParameterChange('audioReactive', !parameters.audioReactive)}
                style={{
                  padding: "6px 12px",
                  backgroundColor: parameters.audioReactive ? "rgba(34,197,94,0.8)" : "rgba(107,114,128,0.8)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: "6px",
                  color: "white",
                  fontSize: "12px",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  whiteSpace: "nowrap",
                  minWidth: "auto",
                  flexShrink: 0
                }}
              >
                {parameters.audioReactive ? 'ON' : 'OFF'}
              </button>
            </div>
            
            {parameters.audioReactive && (
              <>
                {/* Audio Sensitivity */}
                <div className="mt-3">
                  <label className="text-white/80 text-xs mb-2 block">
                    Audio Sensitivity: {formatValue(parameters.audioSensitivity, 0.5)}
                  </label>
                  <Slider
                    value={parameters.audioSensitivity ?? 0.5}
                    onChange={(value) => handleParameterChange('audioSensitivity', value)}
                    min={0.0}
                    max={2.0}
                    step={0.1}
                    className="w-full"
                  />
                </div>

                {/* Bass Influence */}
                <div className="mt-3">
                  <label className="text-white/80 text-xs mb-2 block">
                    Bass Influence: {formatValue(parameters.audioBassInfluence, 0.7)}
                  </label>
                  <Slider
                    value={parameters.audioBassInfluence ?? 0.7}
                    onChange={(value) => handleParameterChange('audioBassInfluence', value)}
                    min={0.0}
                    max={1.0}
                    step={0.1}
                    className="w-full"
                  />
                </div>

                {/* Mid Influence */}
                <div className="mt-3">
                  <label className="text-white/80 text-xs mb-2 block">
                    Mid Influence: {formatValue(parameters.audioMidInfluence, 0.5)}
                  </label>
                  <Slider
                    value={parameters.audioMidInfluence ?? 0.5}
                    onChange={(value) => handleParameterChange('audioMidInfluence', value)}
                    min={0.0}
                    max={1.0}
                    step={0.1}
                    className="w-full"
                  />
                </div>

                {/* High Influence */}
                <div className="mt-3">
                  <label className="text-white/80 text-xs mb-2 block">
                    High Influence: {formatValue(parameters.audioHighInfluence, 0.3)}
                  </label>
                  <Slider
                    value={parameters.audioHighInfluence ?? 0.3}
                    onChange={(value) => handleParameterChange('audioHighInfluence', value)}
                    min={0.0}
                    max={1.0}
                    step={0.1}
                    className="w-full"
                  />
                </div>
              </>
            )}
          </div>

          {/* Reset Button */}
          <button
            onClick={resetToDefaults}
            style={{
              width: "100%",
              padding: "8px 12px",
              backgroundColor: "rgba(107,114,128,0.8)",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: "6px",
              color: "white",
              fontSize: "12px",
              cursor: "pointer",
              transition: "all 0.2s ease",
              textAlign: "center"
            }}
          >
            Reset to Defaults
          </button>
        </div>
      )}

      {/* Quick Presets */}
      <div className="mt-4 pt-3 border-t border-white/10">
        <label className="text-white/90 text-sm font-medium mb-2 block">Quick Presets</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setParameters(prev => ({ 
              ...prev, 
              effectType: 'waterRipple', 
              speed: 1.0, 
              amplitude: 0.3, 
              intensity: 0.2,
              audioReactive: true,
              audioSensitivity: 0.3
            }))}
            style={{
              padding: "6px 12px",
              backgroundColor: "rgba(59,130,246,0.2)",
              border: "1px solid rgba(59,130,246,0.3)",
              borderRadius: "6px",
              color: "rgba(147,197,253,1)",
              fontSize: "12px",
              cursor: "pointer",
              transition: "all 0.2s ease",
              textAlign: "center"
            }}
          >
            Gentle
          </button>
          <button
            onClick={() => setParameters(prev => ({ 
              ...prev, 
              effectType: 'heatWave', 
              speed: 2.0, 
              amplitude: 0.7, 
              intensity: 0.5,
              audioReactive: true,
              audioSensitivity: 1.2
            }))}
            style={{
              padding: "6px 12px",
              backgroundColor: "rgba(249,115,22,0.2)",
              border: "1px solid rgba(249,115,22,0.3)",
              borderRadius: "6px",
              color: "rgba(251,146,60,1)",
              fontSize: "12px",
              cursor: "pointer",
              transition: "all 0.2s ease",
              textAlign: "center"
            }}
          >
            Dynamic
          </button>
          <button
            onClick={() => setParameters(prev => ({ 
              ...prev, 
              effectType: 'flowingDistortion', 
              speed: 1.5, 
              amplitude: 0.6, 
              intensity: 0.4,
              audioReactive: true,
              audioSensitivity: 0.8
            }))}
            style={{
              padding: "6px 12px",
              backgroundColor: "rgba(168,85,247,0.2)",
              border: "1px solid rgba(168,85,247,0.3)",
              borderRadius: "6px",
              color: "rgba(196,181,253,1)",
              fontSize: "12px",
              cursor: "pointer",
              transition: "all 0.2s ease",
              textAlign: "center"
            }}
          >
            Flowing
          </button>
          <button
            onClick={() => setParameters(prev => ({ 
              ...prev, 
              effectType: 'gentleWave', 
              speed: 0.8, 
              amplitude: 0.2, 
              intensity: 0.15,
              audioReactive: true,
              audioSensitivity: 0.4
            }))}
            style={{
              padding: "6px 12px",
              backgroundColor: "rgba(34,197,94,0.2)",
              border: "1px solid rgba(34,197,94,0.3)",
              borderRadius: "6px",
              color: "rgba(134,239,172,1)",
              fontSize: "12px",
              cursor: "pointer",
              transition: "all 0.2s ease",
              textAlign: "center"
            }}
          >
            Subtle
          </button>
        </div>
      </div>
    </div>
  );
};

export default AmbientAnimationControlPanel;
