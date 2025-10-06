import React from 'react';
import useStore from '../core/store';
import AssetPanel from '../ui/AssetPanel';

const ART_STYLES = [
  "hand-painted scenic art",
  "matte painting", 
  "watercolor mural",
  "illustrative landscape"
];

const LIGHTING_MOODS = [
  "soft warm lighting",
  "cool moonlight",
  "neutral daylight", 
  "dreamy glow"
];

const COLOR_TONES = [
  "warm tones (reds, oranges, golds)",
  "cool tones (blues, greens, purples)",
  "neutral pastels",
  "vivid mixed colors"
];

const COMPOSITION_LAYOUTS = [
  "open center space",
  "symmetrical framing",
  "layered depth",
  "flat abstract pattern"
];

export default function AuthorPanel({ onBackgroundImageGenerated }) {
  const authorMode = useStore(s => s.authorMode);
  const setAuthorMode = useStore(s => s.setAuthorMode);

  // Handle AI assets generated (sentiment analysis only in author mode)
  const handleAIAssetsGenerated = (data) => {
    console.log('🎨 Author mode - AI Assets generated:', data.assets);
    console.log('📊 Author mode - Sentiment analysis:', data.analysis);
    
    // Store sentiment analysis in author mode state
    setAuthorMode(state => ({
      sentimentAnalysis: data.analysis
    }));
  };

  const updatePromptTemplate = (key, value) => {
    setAuthorMode(state => ({
      promptTemplate: {
        ...state.promptTemplate,
        [key]: value
      }
    }));
  };

  return (
    <div style={{ 
      height: "100%", 
      display: "flex", 
      flexDirection: "column", 
      gap: 12,
      overflow: "hidden"
    }}>
      {/* Music Input Section - Use AssetPanel from generative mode */}
      <div style={{ 
        flex: "0 0 auto", 
        maxHeight: "45%", 
        minHeight: "200px",
        overflow: "hidden" 
      }}>
        <div style={{ height: "100%", overflow: "auto" }}>
          <AssetPanel 
            onBackgroundImageGenerated={onBackgroundImageGenerated} 
            onAssetsGenerated={handleAIAssetsGenerated}
            authorMode={true} 
          />
        </div>
      </div>
      

      {/* Prompt Template Section */}
      <div style={{ 
        flex: 1, 
        overflow: "auto", 
        minHeight: "200px",
        maxHeight: "55%"
      }}>
        <h4 style={{ margin: "0 0 12px 0", fontSize: 14, fontWeight: 500 }}>Backdrop Prompt Generator</h4>

        {/* Art Style */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", marginBottom: 4, fontSize: 12, fontWeight: 500 }}>
            Art Style
          </label>
          <select
            value={authorMode.promptTemplate.artStyle}
            onChange={(e) => updatePromptTemplate('artStyle', e.target.value)}
            style={{
              width: "100%",
              padding: 6,
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: 4,
              color: "#fff",
              fontSize: 12
            }}
          >
            {ART_STYLES.map(style => (
              <option key={style} value={style} style={{ background: "#333", color: "#fff" }}>
                {style}
              </option>
            ))}
          </select>
        </div>

        {/* Lighting Mood */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", marginBottom: 4, fontSize: 12, fontWeight: 500 }}>
            Lighting Mood
          </label>
          <select
            value={authorMode.promptTemplate.lightingMood}
            onChange={(e) => updatePromptTemplate('lightingMood', e.target.value)}
            style={{
              width: "100%",
              padding: 6,
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: 4,
              color: "#fff",
              fontSize: 12
            }}
          >
            {LIGHTING_MOODS.map(mood => (
              <option key={mood} value={mood} style={{ background: "#333", color: "#fff" }}>
                {mood}
              </option>
            ))}
          </select>
        </div>

        {/* Color Tone */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", marginBottom: 4, fontSize: 12, fontWeight: 500 }}>
            Color Tone
          </label>
          <select
            value={authorMode.promptTemplate.colorTone}
            onChange={(e) => updatePromptTemplate('colorTone', e.target.value)}
            style={{
              width: "100%",
              padding: 6,
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: 4,
              color: "#fff",
              fontSize: 12
            }}
          >
            {COLOR_TONES.map(tone => (
              <option key={tone} value={tone} style={{ background: "#333", color: "#fff" }}>
                {tone}
              </option>
            ))}
          </select>
        </div>

        {/* Composition Layout */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", marginBottom: 4, fontSize: 12, fontWeight: 500 }}>
            Composition Layout
          </label>
          <select
            value={authorMode.promptTemplate.compositionLayout}
            onChange={(e) => updatePromptTemplate('compositionLayout', e.target.value)}
            style={{
              width: "100%",
              padding: 6,
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: 4,
              color: "#fff",
              fontSize: 12
            }}
          >
            {COMPOSITION_LAYOUTS.map(layout => (
              <option key={layout} value={layout} style={{ background: "#333", color: "#fff" }}>
                {layout}
              </option>
            ))}
          </select>
        </div>
      </div>

    </div>
  );
}
