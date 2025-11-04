/**
 * Opaline Wave Control Panel
 * UI for mode-specific parameters including color modes and rainbow toggle
 */

import React from 'react';
import { useVisStore } from '../../state/useVisStore';

const DEFAULT_PARAMS = {
  colorMode: 'Rainbow',
  // User mode
  primary: '#F5E8FF',
  secondary: '#A4D8FF',
  gradientBias: 0.45,
  // Music mode
  lowColor: '#00C2FF',
  midColor: '#FF4D9A',
  highColor: '#FFE45E',
  paletteSmoothing: 0.6,
  // Rainbow mode
  colorSpread: 0.9,
  shimmerSpeed: 0.25,
  whiteMix: 0.65,
  // Core
  waveScale: 1.2,
  flowStrength: 0.55,
  decay: 0.82,
  swirlStrength: 0.6,
  grain: 0.15
};

export default function OpalineWavePanel() {
  const params = useVisStore(s => s.params);
  const setParams = useVisStore(s => s.setParams);
  
  const opalineParams = params.opalineWave || DEFAULT_PARAMS;
  
  const updateOpalineParam = (key, value) => {
    setParams({
      opalineWave: {
        ...opalineParams,
        [key]: value
      }
    });
  };
  
  const setColorMode = (mode) => {
    updateOpalineParam('colorMode', mode);
  };
  
  const toggleRainbow = () => {
    setColorMode(opalineParams.colorMode === 'Rainbow' ? 'User' : 'Rainbow');
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
      
      {/* Color Mode Selector */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontSize: '11px', marginBottom: '6px', color: '#aaa' }}>
          Color Mode
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          {['User', 'Music', 'Rainbow'].map(mode => (
            <button
              key={mode}
              onClick={() => setColorMode(mode)}
              style={{
                flex: 1,
                padding: '6px 8px',
                fontSize: '11px',
                backgroundColor: opalineParams.colorMode === mode 
                  ? 'rgba(0,150,255,0.3)' 
                  : 'rgba(0,0,0,0.4)',
                color: opalineParams.colorMode === mode ? '#00aaff' : '#ccc',
                border: opalineParams.colorMode === mode 
                  ? '1px solid rgba(0,150,255,0.5)' 
                  : '1px solid rgba(255,255,255,0.1)',
                borderRadius: '4px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                if (opalineParams.colorMode !== mode) {
                  e.target.style.backgroundColor = 'rgba(0,0,0,0.5)';
                  e.target.style.borderColor = 'rgba(255,255,255,0.2)';
                }
              }}
              onMouseLeave={(e) => {
                if (opalineParams.colorMode !== mode) {
                  e.target.style.backgroundColor = 'rgba(0,0,0,0.4)';
                  e.target.style.borderColor = 'rgba(255,255,255,0.1)';
                }
              }}
            >
              {mode}
            </button>
          ))}
        </div>
        
        {/* Rainbow Toggle Button */}
        <button
          onClick={toggleRainbow}
          style={{
            width: '100%',
            marginTop: '6px',
            padding: '8px',
            fontSize: '12px',
            fontWeight: 'bold',
            backgroundColor: opalineParams.colorMode === 'Rainbow' 
              ? 'linear-gradient(90deg, #ff0080, #ff8c00, #40ff00, #00ffff, #0080ff, #8000ff)' 
              : 'rgba(0,0,0,0.4)',
            background: opalineParams.colorMode === 'Rainbow'
              ? 'linear-gradient(90deg, #ff0080, #ff8c00, #40ff00, #00ffff, #0080ff, #8000ff)'
              : 'rgba(0,0,0,0.4)',
            color: opalineParams.colorMode === 'Rainbow' ? '#ffffff' : '#999',
            border: opalineParams.colorMode === 'Rainbow'
              ? '1px solid rgba(255,255,255,0.3)'
              : '1px solid rgba(255,255,255,0.1)',
            borderRadius: '4px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            textShadow: opalineParams.colorMode === 'Rainbow' ? '0 0 4px rgba(0,0,0,0.5)' : 'none'
          }}
        >
          🌈 Rainbow
        </button>
      </div>
      
      {/* User Mode Controls */}
      {opalineParams.colorMode === 'User' && (
        <div style={{ marginBottom: '12px', padding: '8px', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '4px' }}>
          <div style={{ marginBottom: '8px' }}>
            <label style={{ fontSize: '11px', color: '#aaa' }}>Primary Color</label>
            <input
              type="color"
              value={opalineParams.primary}
              onChange={(e) => updateOpalineParam('primary', e.target.value)}
              style={{ width: '100%', height: '30px', marginTop: '4px', cursor: 'pointer' }}
            />
          </div>
          <div style={{ marginBottom: '8px' }}>
            <label style={{ fontSize: '11px', color: '#aaa' }}>Secondary Color</label>
            <input
              type="color"
              value={opalineParams.secondary}
              onChange={(e) => updateOpalineParam('secondary', e.target.value)}
              style={{ width: '100%', height: '30px', marginTop: '4px', cursor: 'pointer' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '11px', color: '#aaa' }}>
              Gradient Bias: {opalineParams.gradientBias.toFixed(2)}
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={opalineParams.gradientBias}
              onChange={(e) => updateOpalineParam('gradientBias', parseFloat(e.target.value))}
              style={{ width: '100%', marginTop: '4px' }}
            />
          </div>
        </div>
      )}
      
      {/* Music Mode Controls */}
      {opalineParams.colorMode === 'Music' && (
        <div style={{ marginBottom: '12px', padding: '8px', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '4px' }}>
          <div style={{ marginBottom: '8px' }}>
            <label style={{ fontSize: '11px', color: '#aaa' }}>Low Freq Color</label>
            <input
              type="color"
              value={opalineParams.lowColor}
              onChange={(e) => updateOpalineParam('lowColor', e.target.value)}
              style={{ width: '100%', height: '30px', marginTop: '4px', cursor: 'pointer' }}
            />
          </div>
          <div style={{ marginBottom: '8px' }}>
            <label style={{ fontSize: '11px', color: '#aaa' }}>Mid Freq Color</label>
            <input
              type="color"
              value={opalineParams.midColor}
              onChange={(e) => updateOpalineParam('midColor', e.target.value)}
              style={{ width: '100%', height: '30px', marginTop: '4px', cursor: 'pointer' }}
            />
          </div>
          <div style={{ marginBottom: '8px' }}>
            <label style={{ fontSize: '11px', color: '#aaa' }}>High Freq Color</label>
            <input
              type="color"
              value={opalineParams.highColor}
              onChange={(e) => updateOpalineParam('highColor', e.target.value)}
              style={{ width: '100%', height: '30px', marginTop: '4px', cursor: 'pointer' }}
            />
          </div>
        </div>
      )}
      
      {/* Rainbow Mode Controls */}
      {opalineParams.colorMode === 'Rainbow' && (
        <div style={{ marginBottom: '12px', padding: '8px', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '4px' }}>
          <div style={{ marginBottom: '8px' }}>
            <label style={{ fontSize: '11px', color: '#aaa' }}>
              Color Spread: {opalineParams.colorSpread.toFixed(2)}
            </label>
            <input
              type="range"
              min="0.4"
              max="2"
              step="0.1"
              value={opalineParams.colorSpread}
              onChange={(e) => updateOpalineParam('colorSpread', parseFloat(e.target.value))}
              style={{ width: '100%', marginTop: '4px' }}
            />
          </div>
          <div style={{ marginBottom: '8px' }}>
            <label style={{ fontSize: '11px', color: '#aaa' }}>
              Shimmer Speed: {opalineParams.shimmerSpeed.toFixed(2)}
            </label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.05"
              value={opalineParams.shimmerSpeed}
              onChange={(e) => updateOpalineParam('shimmerSpeed', parseFloat(e.target.value))}
              style={{ width: '100%', marginTop: '4px' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '11px', color: '#aaa' }}>
              White Mix: {opalineParams.whiteMix.toFixed(2)}
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={opalineParams.whiteMix}
              onChange={(e) => updateOpalineParam('whiteMix', parseFloat(e.target.value))}
              style={{ width: '100%', marginTop: '4px' }}
            />
          </div>
        </div>
      )}
      
      {/* Core Controls (all modes) */}
      <div style={{ padding: '8px', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '4px' }}>
        <div style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '8px', color: '#bbb' }}>
          Core Controls
        </div>
        <div style={{ marginBottom: '8px' }}>
          <label style={{ fontSize: '11px', color: '#aaa' }}>
            Wave Scale: {opalineParams.waveScale.toFixed(2)}
          </label>
          <input
            type="range"
            min="0.5"
            max="4"
            step="0.1"
            value={opalineParams.waveScale}
            onChange={(e) => updateOpalineParam('waveScale', parseFloat(e.target.value))}
            style={{ width: '100%', marginTop: '4px' }}
          />
        </div>
        <div style={{ marginBottom: '8px' }}>
          <label style={{ fontSize: '11px', color: '#aaa' }}>
            Flow Strength: {opalineParams.flowStrength.toFixed(2)}
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={opalineParams.flowStrength}
            onChange={(e) => updateOpalineParam('flowStrength', parseFloat(e.target.value))}
            style={{ width: '100%', marginTop: '4px' }}
          />
        </div>
        <div style={{ marginBottom: '8px' }}>
          <label style={{ fontSize: '11px', color: '#aaa' }}>
            Decay: {opalineParams.decay.toFixed(2)}
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={opalineParams.decay}
            onChange={(e) => updateOpalineParam('decay', parseFloat(e.target.value))}
            style={{ width: '100%', marginTop: '4px' }}
          />
        </div>
        <div style={{ marginBottom: '8px' }}>
          <label style={{ fontSize: '11px', color: '#aaa' }}>
            Swirl Strength: {opalineParams.swirlStrength.toFixed(2)}
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={opalineParams.swirlStrength}
            onChange={(e) => updateOpalineParam('swirlStrength', parseFloat(e.target.value))}
            style={{ width: '100%', marginTop: '4px' }}
          />
        </div>
        <div>
          <label style={{ fontSize: '11px', color: '#aaa' }}>
            Grain: {opalineParams.grain.toFixed(2)}
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={opalineParams.grain}
            onChange={(e) => updateOpalineParam('grain', parseFloat(e.target.value))}
            style={{ width: '100%', marginTop: '4px' }}
          />
        </div>
      </div>
    </div>
  );
}
