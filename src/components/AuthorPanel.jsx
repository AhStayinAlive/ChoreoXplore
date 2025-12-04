import React from 'react';
import useStore from '../core/store';
import SettingPanel from '../ui/SettingPanel';

const LIGHTING_MOODS = [
  "soft warm lighting",
  "cool moonlight",
  "neutral daylight",
  "dreamy glow",
  "dynamic spotlight mix",
  "dramatic shadows",
  "ethereal mist",
  "golden hour",
  "blue hour",
  "studio lighting",
  "natural window light",
  "candlelight",
  "neon glow",
  "sunset warmth",
  "dawn light",
  "stormy atmosphere",
  "cosmic radiance",
  "underwater shimmer",
  "firelight dance",
  "aurora borealis"
];

const COLOR_TONES = [
  "warm tones (reds, oranges, golds)",
  "cool tones (blues, greens, purples)",
  "neutral pastels",
  "vivid mixed colors",
  "monochrome palette",
  "earth tones",
  "ocean blues",
  "forest greens",
  "sunset oranges",
  "lavender purples",
  "crimson reds",
  "amber yellows",
  "silver grays",
  "emerald greens",
  "sapphire blues",
  "rose pinks",
  "copper browns",
  "turquoise aquas",
  "magenta fuchsias",
  "charcoal blacks"
];

const EMOTIONAL_THEMES = [
  "joy",
  "calm",
  "mystery",
  "hope",
  "tension",
  "passion",
  "freedom",
  "nostalgia",
  "melancholy",
  "courage",
  "peace",
  "awe",
  "energy",
  "sadness",
  "inspiration",
  "chaos",
  "unity",
  "fear",
  "rebirth",
  "dream"
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
      gap: 8,
      overflow: "hidden"
    }}>
      {/* Music Input Section - Use SettingPanel from generative mode */}
      <div style={{ 
        flex: "0 0 auto", 
        maxHeight: "50%", 
        minHeight: "180px",
        overflow: "hidden" 
      }}>
        <div style={{ height: "100%", overflow: "auto" }}>
          <SettingPanel 
            onBackgroundImageGenerated={onBackgroundImageGenerated} 
            onAssetsGenerated={handleAIAssetsGenerated}
            authorMode={true} 
          />
        </div>
      </div>
      

      {/* Prompt Template Section */}
      <div className="glass-scrollbar" style={{ 
        flex: 1, 
        overflow: "auto", 
        minHeight: "180px",
        maxHeight: "50%"
      }}>
        <h4 style={{ margin: "0 0 12px 0", fontSize: 14, fontWeight: 500 }}>Parameters</h4>

        {/* Two-column layout for better space utilization */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px" }}>

          {/* Lighting Mood */}
          <div>
            <label style={{ display: "block", marginBottom: 4, fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.8)" }}>
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
                fontSize: 11
              }}
            >
              {LIGHTING_MOODS.map(mood => (
                <option key={mood} value={mood} style={{ background: "#333", color: "#fff" }}>
                  {mood}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px" }}>
          {/* Color Tone */}
          <div>
            <label style={{ display: "block", marginBottom: 4, fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.8)" }}>
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
                fontSize: 11
              }}
            >
              {COLOR_TONES.map(tone => (
                <option key={tone} value={tone} style={{ background: "#333", color: "#fff" }}>
                  {tone}
                </option>
              ))}
            </select>
          </div>

        </div>

        {/* Emotional Theme - Full width */}
        <div>
          <label style={{ display: "block", marginBottom: 4, fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.8)" }}>
            Emotional Theme
          </label>
          <select
            value={authorMode.promptTemplate.emotionalTheme}
            onChange={(e) => updatePromptTemplate('emotionalTheme', e.target.value)}
            style={{
              width: "100%",
              padding: 6,
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: 4,
              color: "#fff",
              fontSize: 11
            }}
          >
            {EMOTIONAL_THEMES.map(theme => (
              <option key={theme} value={theme} style={{ background: "#333", color: "#fff" }}>
                {theme}
              </option>
            ))}
          </select>
        </div>

      </div>

    </div>
  );
}
