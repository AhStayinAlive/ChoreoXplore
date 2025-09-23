import React, { useState } from 'react';
import useStore from '../core/store';

const MotionControlPanel = () => {
  const [motionSettings, setMotionSettings] = useState({
    positionSensitivity: 0.3,
    rotationSensitivity: 0.1,
    scaleSensitivity: 0.5,
    effectSensitivity: 0.4,
    smoothing: 0.8
  });

  const handleSettingChange = (key, value) => {
    setMotionSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <div className="motion-control-panel p-3 bg-gray-800 rounded-lg text-white">
      <h4 className="text-sm font-medium mb-3" style={{ color: '#00ff00' }}>Motion Controls</h4>
      
      <div className="space-y-3">
        <div>
          <label className="text-xs text-gray-300 block mb-1">
            Position Sensitivity: {motionSettings.positionSensitivity.toFixed(2)}
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={motionSettings.positionSensitivity}
            onChange={(e) => handleSettingChange('positionSensitivity', parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
          />
        </div>

        <div>
          <label className="text-xs text-gray-300 block mb-1">
            Rotation Sensitivity: {motionSettings.rotationSensitivity.toFixed(2)}
          </label>
          <input
            type="range"
            min="0"
            max="0.5"
            step="0.01"
            value={motionSettings.rotationSensitivity}
            onChange={(e) => handleSettingChange('rotationSensitivity', parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
          />
        </div>

        <div>
          <label className="text-xs text-gray-300 block mb-1">
            Scale Sensitivity: {motionSettings.scaleSensitivity.toFixed(2)}
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={motionSettings.scaleSensitivity}
            onChange={(e) => handleSettingChange('scaleSensitivity', parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
          />
        </div>

        <div>
          <label className="text-xs text-gray-300 block mb-1">
            Effect Intensity: {motionSettings.effectSensitivity.toFixed(2)}
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={motionSettings.effectSensitivity}
            onChange={(e) => handleSettingChange('effectSensitivity', parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
          />
        </div>

        <div>
          <label className="text-xs text-gray-300 block mb-1">
            Smoothing: {motionSettings.smoothing.toFixed(2)}
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={motionSettings.smoothing}
            onChange={(e) => handleSettingChange('smoothing', parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
          />
        </div>
      </div>

      <div className="mt-4 text-xs text-gray-400">
        <div>• Adjust sensitivity to control how much your movements affect the visuals</div>
        <div>• Higher values = more responsive</div>
        <div>• Lower values = smoother, more subtle effects</div>
      </div>
    </div>
  );
};

export default MotionControlPanel;
