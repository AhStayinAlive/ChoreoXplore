import { useState, useEffect } from 'react';
import useStore from '../core/store';

export default function AuthorPromptBox({ onBackgroundImageGenerated }) {
  const authorMode = useStore(s => s.authorMode);
  const setAuthorMode = useStore(s => s.setAuthorMode);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // AI Image Generation API configuration
  const AI_PROXY_URL = 'http://localhost:3002/api/generate-image';

  const generateImage = async (prompt, negativePrompt) => {
    try {
      console.log(`🎨 Generating digital art image with prompt: "${prompt}"`);
      
      const response = await fetch(AI_PROXY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: prompt,
          negative_prompt: negativePrompt || "person, people, human, man, woman, silhouette, figure, body, humanoid, mannequin, character, actor, creature, pedestrian, portrait, figure in distance, shadow shaped like person, narrative scene, lonely figure, human subject, stage, curtains, spotlight, theater, audience, performer, concert, microphone, podium, rigging, lights, props, theatrical, performance, backdrop, set design, stage design, concert hall, auditorium, venue, show, entertainment, music performance, dance floor, platform, riser, stage lights, theatrical lighting, performance space",
          style: 'atmospheric, professional, digital art',
          width: 1024,
          height: 768,
          guidance_scale: 9.0
        })
      });

      if (!response.ok) {
        throw new Error(`AI proxy server failed: ${response.status} - ${response.statusText}`);
      }

      const imageBlob = await response.blob();
      console.log(`✅ Successfully generated digital art image! Size: ${imageBlob.size} bytes`);
      return imageBlob;
      
    } catch (error) {
      console.error('❌ AI digital art generation failed:', error.message);
      throw error;
    }
  };

  const handlePromptSubmit = async () => {
    // Generate the final prompt using all parameters
    const { userConcept, artStyle, lightingMood, colorTone, compositionLayout, emotionalTheme } = authorMode.promptTemplate;
    const negativePrompt = authorMode.negativePrompt;
    
    if (userConcept.trim()) {
      // Use the new prompt template format with song context
      const finalPrompt = `An art inspired by the song "${userConcept}" by BTS, depicting ${userConcept} using ${colorTone}. The composition features ${compositionLayout}, creating ${lightingMood} that evokes a sense of ${emotionalTheme}. The focus is on interpreting the song "${userConcept}" visually through atmospheric elements, textures, and forms.`;
      
      console.log('🎭 Submitting comprehensive prompt:', finalPrompt);
      console.log('🎭 Using negative prompt:', negativePrompt);
      
      // Generate the AI image
      setIsGenerating(true);
      try {
        const imageBlob = await generateImage(finalPrompt, negativePrompt);
        if (imageBlob && imageBlob.size > 0) {
          const imageUrl = URL.createObjectURL(imageBlob);
          console.log('🎭 Digital art image generated successfully:', imageUrl);
          
          // Set the generated image as background
          if (onBackgroundImageGenerated) {
            onBackgroundImageGenerated(imageUrl);
          }
        }
      } catch (error) {
        console.error('🎭 Failed to generate digital art:', error);
        alert('Failed to generate digital art. Please try again.');
      } finally {
        setIsGenerating(false);
      }
    } else {
      console.log('🎭 No user concept provided');
      alert('Please enter a scene concept to generate digital art.');
    }
  };

  const handlePromptChange = (value) => {
    setAuthorMode(state => ({
      finalPrompt: value,
      promptTemplate: {
        ...state.promptTemplate,
        userConcept: value // Sync user concept from the prompt box
      }
    }));
  };

  return (
    <div style={{
      position: "absolute",
      bottom: 20,
      left: "50%",
      transform: "translateX(-50%)",
      width: "85%",
      maxWidth: 900,
      background: "rgba(0,0,0,0.8)",
      backdropFilter: "blur(10px)",
      borderRadius: 12,
      border: "1px solid rgba(255,255,255,0.1)",
      zIndex: 20,
      transition: "all 0.3s ease"
    }}>
      {/* Header */}
      <div style={{
        padding: "12px 16px",
        borderBottom: "1px solid rgba(255,255,255,0.1)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        cursor: "pointer"
      }} onClick={() => setIsExpanded(!isExpanded)}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 500 }}>User Prompt</span>
        </div>
        <span style={{ 
          fontSize: 12, 
          color: "rgba(255,255,255,0.6)",
          transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
          transition: "transform 0.3s ease"
        }}>
          ▼
        </span>
      </div>

      {/* Content */}
      <div className="glass-scrollbar" style={{
        padding: isExpanded ? "16px" : "0",
        height: isExpanded ? "auto" : 0,
        overflow: "hidden",
        transition: "all 0.3s ease"
      }}>
        <div style={{ marginBottom: 12 }}>
          <label style={{ 
            display: "block", 
            marginBottom: 6, 
            fontSize: 12, 
            fontWeight: 500,
            color: "rgba(255,255,255,0.8)"
          }}>
            Montage Idea
          </label>
          <textarea
            value={authorMode.finalPrompt}
            onChange={(e) => handlePromptChange(e.target.value)}
            placeholder="Enter your Idea"
            style={{
              width: "calc(100% - 24px)",
              height: 100,
              padding: 12,
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: 8,
              color: "#fff",
              fontSize: 13,
              lineHeight: 1.4,
              resize: "vertical",
              fontFamily: "inherit",
              boxSizing: "border-box"
            }}
          />
        </div>

        {/* Action Buttons */}
        <div style={{ 
          display: "flex", 
          gap: 8, 
          justifyContent: "flex-end",
          alignItems: "center"
        }}>
          <button
            onClick={() => handlePromptChange("")}
            style={{
              padding: "8px 16px",
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: 6,
              color: "rgba(255,255,255,0.7)",
              fontSize: 12,
              cursor: "pointer",
              transition: "all 0.2s ease"
            }}
            onMouseOver={(e) => {
              e.target.style.background = "rgba(255,255,255,0.1)";
            }}
            onMouseOut={(e) => {
              e.target.style.background = "transparent";
            }}
          >
            Clear
          </button>
          <button
            onClick={handlePromptSubmit}
            disabled={!authorMode.finalPrompt.trim() || isGenerating}
            style={{
              padding: "8px 16px",
              background: (authorMode.finalPrompt.trim() && !isGenerating) ? "rgba(95, 168, 255, 0.8)" : "rgba(255,255,255,0.1)",
              border: "1px solid rgba(95, 168, 255, 0.4)",
              borderRadius: 6,
              color: (authorMode.finalPrompt.trim() && !isGenerating) ? "#fff" : "rgba(255,255,255,0.4)",
              fontSize: 12,
              cursor: (authorMode.finalPrompt.trim() && !isGenerating) ? "pointer" : "not-allowed",
              transition: "all 0.2s ease"
            }}
            onMouseOver={(e) => {
              if (authorMode.finalPrompt.trim() && !isGenerating) {
                e.target.style.background = "rgba(95, 168, 255, 1)";
              }
            }}
            onMouseOut={(e) => {
              if (authorMode.finalPrompt.trim() && !isGenerating) {
                e.target.style.background = "rgba(95, 168, 255, 0.8)";
              }
            }}
          >
            {isGenerating ? "Generating..." : "Generate Montage"}
          </button>
        </div>

      </div>
    </div>
  );
}
