/**
 * Opaline Wave Control Panel
 * Simple rainbow toggle button
 */

import React from 'react';
import { useVisStore } from '../../state/useVisStore';

const DEFAULT_PARAMS = {
  rainbowMode: true,
  colorSpread: 0.9,
  shimmerSpeed: 0.25
};

export default function OpalineWavePanel() {
  const params = useVisStore(s => s.params);
  const setParams = useVisStore(s => s.setParams);
  
  const opalineParams = params.opalineWave || DEFAULT_PARAMS;
  
  const toggleRainbow = () => {
    setParams({
      opalineWave: {
        ...opalineParams,
        rainbowMode: !opalineParams.rainbowMode
      }
    });
  };
  
  return (
    <div style={{
      marginTop: '15px',
      padding: '12px',
      backgroundColor: 'rgba(0,0,0,0.3)',
      borderRadius: '8px',
      border: '1px solid rgba(255,255,255,0.1)'
    }}>
      <div style={{ 
        fontSize: '13px', 
        fontWeight: 'bold', 
        marginBottom: '10px',
        color: '#ffffff'
      }}>
        Opaline Wave
      </div>
      
      {/* Rainbow Toggle Button */}
      <button
        onClick={toggleRainbow}
        style={{
          width: '100%',
          padding: '10px',
          fontSize: '13px',
          fontWeight: 'bold',
          backgroundColor: opalineParams.rainbowMode 
            ? 'transparent'
            : 'rgba(0,0,0,0.4)',
          background: opalineParams.rainbowMode
            ? 'linear-gradient(90deg, #ff0080, #ff8c00, #40ff00, #00ffff, #0080ff, #8000ff)'
            : 'rgba(0,0,0,0.4)',
          color: opalineParams.rainbowMode ? '#ffffff' : '#999',
          border: opalineParams.rainbowMode
            ? '2px solid rgba(255,255,255,0.4)'
            : '1px solid rgba(255,255,255,0.1)',
          borderRadius: '6px',
          cursor: 'pointer',
          transition: 'all 0.2s',
          textShadow: opalineParams.rainbowMode ? '0 0 4px rgba(0,0,0,0.5)' : 'none',
          boxShadow: opalineParams.rainbowMode ? '0 0 12px rgba(255,255,255,0.3)' : 'none'
        }}
        onMouseEnter={(e) => {
          if (!opalineParams.rainbowMode) {
            e.target.style.backgroundColor = 'rgba(0,0,0,0.5)';
            e.target.style.borderColor = 'rgba(255,255,255,0.2)';
          }
        }}
        onMouseLeave={(e) => {
          if (!opalineParams.rainbowMode) {
            e.target.style.backgroundColor = 'rgba(0,0,0,0.4)';
            e.target.style.borderColor = 'rgba(255,255,255,0.1)';
          }
        }}
      >
        🌈 Rainbow {opalineParams.rainbowMode ? 'ON' : 'OFF'}
      </button>
      
      <div style={{
        marginTop: '8px',
        fontSize: '10px',
        color: '#888',
        textAlign: 'center'
      }}>
        {opalineParams.rainbowMode 
          ? 'Iridescent color swirls'
          : 'Using theme colors from background/asset'}
      </div>
    </div>
  );
}
