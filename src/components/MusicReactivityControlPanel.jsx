import { useState, useEffect } from 'react';
import Slider from './reusables/Slider';
import ToggleButton from './reusables/ToggleButton';
import { 
  musicReactivity$, 
  setMusicReactivityEnabled, 
  setMusicReactivitySensitivity, 
  setMusicReactivitySmoothing,
  applyMusicReactivityPreset 
} from '../core/musicReactivity';

const MusicReactivityControlPanel = ({ 
  isVisible = true,
  className = ""
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [reactivityState, setReactivityState] = useState({
    enabled: true,
    sensitivity: 1.0,
    smoothing: 0.8,
    speedMultiplier: 1.0,
    amplitudeMultiplier: 1.0,
    colorIntensity: 0.0,
    pulsationStrength: 0.0,
    distortionIntensity: 0.0,
    rotationSpeed: 0.0,
    currentTempo: 0,
    beatStrength: 0,
    rhythmComplexity: 0,
    bassLevel: 0,
    midLevel: 0,
    trebleLevel: 0
  });

  // Subscribe to music reactivity state
  useEffect(() => {
    const subscription = musicReactivity$.subscribe(setReactivityState);
    return () => subscription.unsubscribe();
  }, []);

  const handleToggleEnabled = (enabled) => {
    setMusicReactivityEnabled(enabled);
  };

  const handleSensitivityChange = (value) => {
    setMusicReactivitySensitivity(value);
  };

  const handleSmoothingChange = (value) => {
    setMusicReactivitySmoothing(value);
  };

  const handlePresetChange = (presetName) => {
    applyMusicReactivityPreset(presetName);
  };

  const resetToDefaults = () => {
    applyMusicReactivityPreset('moderate');
  };

  if (!isVisible) return null;

  return (
    <div className={`bg-gray-900 text-white rounded-lg p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          <h3 className="text-lg font-semibold">Music Reactivity</h3>
        </div>
        <div className="flex items-center space-x-2">
          <ToggleButton
            isOn={reactivityState.enabled}
            onChange={handleToggleEnabled}
            label="Enable"
          />
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors"
          >
            {isExpanded ? '−' : '+'}
          </button>
        </div>
      </div>

      {/* Music Analysis Display */}
      <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
        <div className="bg-gray-800 p-2 rounded">
          <div className="text-gray-400">Tempo</div>
          <div className="text-green-400 font-mono">{Math.round(reactivityState.currentTempo)} BPM</div>
        </div>
        <div className="bg-gray-800 p-2 rounded">
          <div className="text-gray-400">Beat Strength</div>
          <div className="text-blue-400 font-mono">{(reactivityState.beatStrength * 100).toFixed(0)}%</div>
        </div>
        <div className="bg-gray-800 p-2 rounded">
          <div className="text-gray-400">Bass</div>
          <div className="text-red-400 font-mono">{(reactivityState.bassLevel * 100).toFixed(0)}%</div>
        </div>
        <div className="bg-gray-800 p-2 rounded">
          <div className="text-gray-400">Treble</div>
          <div className="text-yellow-400 font-mono">{(reactivityState.trebleLevel * 100).toFixed(0)}%</div>
        </div>
      </div>

      {/* Expanded Controls */}
      {isExpanded && (
        <div className="space-y-4">
          {/* Presets */}
          <div>
            <label className="block text-sm font-medium mb-2">Presets</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handlePresetChange('subtle')}
                className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors"
              >
                Subtle
              </button>
              <button
                onClick={() => handlePresetChange('moderate')}
                className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors"
              >
                Moderate
              </button>
              <button
                onClick={() => handlePresetChange('intense')}
                className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors"
              >
                Intense
              </button>
              <button
                onClick={() => handlePresetChange('extreme')}
                className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors"
              >
                Extreme
              </button>
            </div>
          </div>

          {/* Sensitivity Control */}
          <div>
            <Slider
              label="Sensitivity"
              value={reactivityState.sensitivity}
              onChange={handleSensitivityChange}
              min={0}
              max={2}
              step={0.1}
              formatValue={(value) => `${(value * 100).toFixed(0)}%`}
            />
          </div>

          {/* Smoothing Control */}
          <div>
            <Slider
              label="Smoothing"
              value={reactivityState.smoothing}
              onChange={handleSmoothingChange}
              min={0}
              max={1}
              step={0.05}
              formatValue={(value) => `${(value * 100).toFixed(0)}%`}
            />
          </div>

          {/* Real-time Visual Parameters */}
          <div>
            <label className="block text-sm font-medium mb-2">Visual Parameters</label>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span>Speed Multiplier:</span>
                <span className="text-green-400">{(reactivityState.speedMultiplier).toFixed(2)}x</span>
              </div>
              <div className="flex justify-between">
                <span>Amplitude Multiplier:</span>
                <span className="text-blue-400">{(reactivityState.amplitudeMultiplier).toFixed(2)}x</span>
              </div>
              <div className="flex justify-between">
                <span>Color Intensity:</span>
                <span className="text-yellow-400">{(reactivityState.colorIntensity * 100).toFixed(0)}%</span>
              </div>
              <div className="flex justify-between">
                <span>Pulsation Strength:</span>
                <span className="text-purple-400">{(reactivityState.pulsationStrength * 100).toFixed(0)}%</span>
              </div>
              <div className="flex justify-between">
                <span>Distortion Intensity:</span>
                <span className="text-red-400">{(reactivityState.distortionIntensity * 100).toFixed(0)}%</span>
              </div>
              <div className="flex justify-between">
                <span>Rotation Speed:</span>
                <span className="text-cyan-400">{(reactivityState.rotationSpeed * 100).toFixed(0)}%</span>
              </div>
            </div>
          </div>

          {/* Reset Button */}
          <div className="pt-2 border-t border-gray-700">
            <button
              onClick={resetToDefaults}
              className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors"
            >
              Reset to Defaults
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MusicReactivityControlPanel;


