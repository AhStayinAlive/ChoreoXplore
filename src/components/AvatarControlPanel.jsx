import React, { useState } from 'react';
import useStore from '../core/store';

const AvatarControlPanel = () => {
  const [showAvatar, setShowAvatar] = useState(true);
  const [movementSensitivity, setMovementSensitivity] = useState(0.02);
  const [avatarScale, setAvatarScale] = useState(1.0);
  const [showSkeleton, setShowSkeleton] = useState(false);

  return (
    <div className="avatar-control-panel bg-gray-900 text-white p-3 rounded-lg" style={{ border: '2px solid #4ECDC4' }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold" style={{ color: '#4ECDC4' }}>🤖 Avatar Control</h3>
        <button
          onClick={() => setShowAvatar(!showAvatar)}
          className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
            showAvatar
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-gray-600 hover:bg-gray-700 text-white'
          }`}
        >
          {showAvatar ? 'Hide Avatar' : 'Show Avatar'}
        </button>
      </div>

      <div className="space-y-3">
        {/* Movement Sensitivity */}
        <div>
          <label className="text-sm text-gray-300 block mb-1">
            Movement Sensitivity: {movementSensitivity.toFixed(3)}
          </label>
          <input
            type="range"
            min="0.005"
            max="0.1"
            step="0.005"
            value={movementSensitivity}
            onChange={(e) => setMovementSensitivity(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #4ECDC4 0%, #4ECDC4 ${(movementSensitivity - 0.005) / (0.1 - 0.005) * 100}%, #374151 ${(movementSensitivity - 0.005) / (0.1 - 0.005) * 100}%, #374151 100%)`
            }}
          />
          <div className="text-xs text-gray-400 mt-1">
            Lower = more sensitive to small movements
          </div>
        </div>

        {/* Avatar Scale */}
        <div>
          <label className="text-sm text-gray-300 block mb-1">
            Avatar Scale: {avatarScale.toFixed(1)}x
          </label>
          <input
            type="range"
            min="0.5"
            max="2.0"
            step="0.1"
            value={avatarScale}
            onChange={(e) => setAvatarScale(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #4ECDC4 0%, #4ECDC4 ${(avatarScale - 0.5) / (2.0 - 0.5) * 100}%, #374151 ${(avatarScale - 0.5) / (2.0 - 0.5) * 100}%, #374151 100%)`
            }}
          />
        </div>

        {/* Show Skeleton Toggle */}
        <div className="flex items-center justify-between">
          <label className="text-sm text-gray-300">Show Skeleton</label>
          <button
            onClick={() => setShowSkeleton(!showSkeleton)}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              showSkeleton
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gray-600 hover:bg-gray-700 text-white'
            }`}
          >
            {showSkeleton ? 'ON' : 'OFF'}
          </button>
        </div>

        {/* Avatar Status */}
        <div className="mt-4 p-2 bg-gray-800 rounded">
          <div className="text-xs text-gray-300 flex justify-between">
            <span>Avatar: {showAvatar ? 'Visible' : 'Hidden'}</span>
            <span>Sensitivity: {movementSensitivity.toFixed(3)}</span>
            <span>Scale: {avatarScale.toFixed(1)}x</span>
          </div>
          {showAvatar && (
            <div className="mt-2 text-xs text-gray-400">
              <div>Body parts mapped to MediaPipe landmarks</div>
              <div>Movement detection prevents jitter when still</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AvatarControlPanel;
