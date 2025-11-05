/**
 * Opaline Film Control Panel
 */

import React from 'react';
import { useVisStore } from '../../state/useVisStore';
import Slider from '../../components/reusables/Slider';
import ToggleButton from '../../components/reusables/ToggleButton';

const PRESETS = {
  pastel: {
    quality: 'balanced',
    banding: 0.7,
    blendRichness: 0.8,
    handReactivity: 'med',
    rainbowMode: false,
    speed: 1.0,
    transparency: 0.8
  },
  neon: {
    quality: 'filmic',
    banding: 0.5,
    blendRichness: 0.6,
    handReactivity: 'high',
    rainbowMode: true,
    speed: 1.2,
    transparency: 0.9
  },
  minimal: {
    quality: 'performance',
    banding: 0.9,
    blendRichness: 0.9,
    handReactivity: 'low',
    rainbowMode: false,
    speed: 0.8,
    transparency: 0.7
  }
};

export default function OpalineFilmPanel() {
  const params = useVisStore(s => s.params);
  const setParams = useVisStore(s => s.setParams);
  
  const filmParams = params.opalineFilm || {};
  const quality = filmParams.quality ?? 'balanced';
  const banding = filmParams.banding ?? 0.7;
  const blendRichness = filmParams.blendRichness ?? 0.8;
  const handReactivity = filmParams.handReactivity ?? 'med';
  const rainbowMode = filmParams.rainbowMode ?? false;
  
  const updateFilmParam = (key, value) => {
    setParams({
      opalineFilm: {
        ...filmParams,
        [key]: value
      }
    });
  };
  
  const applyPreset = (presetName) => {
    const preset = PRESETS[presetName];
    if (preset) {
      setParams({
        opalineFilm: {
          ...filmParams,
          ...preset
        },
        speed: preset.speed,
        intensity: preset.transparency
      });
    }
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
        color: '#ffffff',
        marginBottom: '12px'
      }}>
        🌈 Opaline Film
      </div>
      
      {/* Presets */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{ 
          fontSize: '11px', 
          color: '#aaa', 
          display: 'block',
          marginBottom: '6px'
        }}>
          Presets
        </label>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <button
            onClick={() => applyPreset('pastel')}
            style={{
              padding: '6px 12px',
              fontSize: '11px',
              backgroundColor: 'rgba(255, 192, 203, 0.2)',
              border: '1px solid rgba(255, 192, 203, 0.4)',
              borderRadius: '4px',
              color: '#fff',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = 'rgba(255, 192, 203, 0.3)'}
            onMouseOut={(e) => e.target.style.backgroundColor = 'rgba(255, 192, 203, 0.2)'}
          >
            Pastel Silk
          </button>
          <button
            onClick={() => applyPreset('neon')}
            style={{
              padding: '6px 12px',
              fontSize: '11px',
              backgroundColor: 'rgba(0, 255, 255, 0.2)',
              border: '1px solid rgba(0, 255, 255, 0.4)',
              borderRadius: '4px',
              color: '#fff',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = 'rgba(0, 255, 255, 0.3)'}
            onMouseOut={(e) => e.target.style.backgroundColor = 'rgba(0, 255, 255, 0.2)'}
          >
            Music Neon
          </button>
          <button
            onClick={() => applyPreset('minimal')}
            style={{
              padding: '6px 12px',
              fontSize: '11px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '4px',
              color: '#fff',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
            onMouseOut={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
          >
            Minimal Cream
          </button>
        </div>
      </div>
      
      {/* Quality */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{ 
          fontSize: '11px', 
          color: '#aaa', 
          display: 'block',
          marginBottom: '6px'
        }}>
          Quality
        </label>
        <select
          value={quality}
          onChange={(e) => updateFilmParam('quality', e.target.value)}
          style={{
            width: '100%',
            padding: '6px 8px',
            fontSize: '11px',
            backgroundColor: 'rgba(0,0,0,0.4)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '4px',
            color: '#fff',
            cursor: 'pointer'
          }}
        >
          <option value="performance">Performance (512px)</option>
          <option value="balanced">Balanced (768px)</option>
          <option value="filmic">Filmic (1024px)</option>
        </select>
      </div>
      
      {/* Banding */}
      <div style={{ marginBottom: '12px' }}>
        <Slider
          label="Banding"
          value={banding}
          min={0}
          max={1}
          step={0.05}
          format={(v) => v.toFixed(2)}
          onChange={(value) => updateFilmParam('banding', value)}
          showValue={true}
        />
        <div style={{ fontSize: '9px', color: '#888', marginTop: '2px' }}>
          Ribbon alignment (0=chaotic, 1=strict)
        </div>
      </div>
      
      {/* Blend Richness */}
      <div style={{ marginBottom: '12px' }}>
        <Slider
          label="Blend Richness"
          value={blendRichness}
          min={0}
          max={1}
          step={0.05}
          format={(v) => v.toFixed(2)}
          onChange={(value) => updateFilmParam('blendRichness', value)}
          showValue={true}
        />
        <div style={{ fontSize: '9px', color: '#888', marginTop: '2px' }}>
          Film thickness (0=thin wisps, 1=lush)
        </div>
      </div>
      
      {/* Hand Reactivity */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{ 
          fontSize: '11px', 
          color: '#aaa', 
          display: 'block',
          marginBottom: '6px'
        }}>
          Hand Reactivity
        </label>
        <select
          value={handReactivity}
          onChange={(e) => updateFilmParam('handReactivity', e.target.value)}
          style={{
            width: '100%',
            padding: '6px 8px',
            fontSize: '11px',
            backgroundColor: 'rgba(0,0,0,0.4)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '4px',
            color: '#fff',
            cursor: 'pointer'
          }}
        >
          <option value="off">Off</option>
          <option value="low">Low</option>
          <option value="med">Medium</option>
          <option value="high">High</option>
        </select>
      </div>
      
      {/* Rainbow Mode Toggle */}
      <div style={{ marginBottom: '8px' }}>
        <ToggleButton
          label="🌈 Rainbow Mode"
          selected={rainbowMode}
          onChange={(value) => updateFilmParam('rainbowMode', value)}
        />
      </div>
      
      <div style={{ 
        fontSize: '9px', 
        color: '#666', 
        marginTop: '12px',
        padding: '8px',
        backgroundColor: 'rgba(0,0,0,0.2)',
        borderRadius: '4px',
        lineHeight: '1.4'
      }}>
        <strong style={{ color: '#888' }}>Tips:</strong><br/>
        • Hands push/reshape locally (no global swirl)<br/>
        • Works great without music<br/>
        • Two hands = stretch/squeeze gestures
      </div>
    </div>
  );
}
