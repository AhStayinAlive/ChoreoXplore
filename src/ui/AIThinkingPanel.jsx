import { useState, useEffect } from "react";
import sentimentAnalyzer from "../services/sentimentAnalysis";

export default function AIThinkingPanel({ onClose, lyrics, assetRepository, currentSelection, context }) {
  const [thinkingStep, setThinkingStep] = useState(0);
  const [aiParameters, setAiParameters] = useState(null);
  const [aiAnalysisDetails, setAiAnalysisDetails] = useState(null);
  const [isThinking, setIsThinking] = useState(true);

  const generateIntegrationSummary = (parameters) => {
    if (!parameters || parameters.length === 0) return "No parameters available";
    
    // Extract key parameters for integration
    const sizeParam = parameters.find(p => p.name === 'Size');
    const positionParam = parameters.find(p => p.name === 'Position');
    const animationParam = parameters.find(p => p.name === 'Animation Speed');
    const densityParam = parameters.find(p => p.name === 'Density');
    const transparencyParam = parameters.find(p => p.name === 'Transparency');
    const rotationParam = parameters.find(p => p.name === 'Rotation');
    const colorParam = parameters.find(p => p.name === 'Color Palette');
    
    let summary = "// AI-Generated Visual Parameters\n";
    summary += "// Generated from lyrics sentiment analysis\n\n";
    
    if (sizeParam) summary += `const baseSize = ${sizeParam.value};\n`;
    if (positionParam) summary += `const position = "${positionParam.value}";\n`;
    if (animationParam) summary += `const animation = "${animationParam.value}";\n`;
    if (densityParam) summary += `const density = "${densityParam.value}";\n`;
    if (transparencyParam) summary += `const opacity = "${transparencyParam.value}";\n`;
    if (rotationParam) summary += `const rotation = "${rotationParam.value}";\n`;
    if (colorParam) summary += `const colors = "${colorParam.value}";\n`;
    
    summary += "\n// Apply to your rendering system:\n";
    summary += "// element.style.transform = `scale(${baseSize}) rotate(${rotation})`;\n";
    summary += "// element.style.opacity = opacity;\n";
    summary += "// element.style.animation = animation;\n";
    summary += "// element.style.color = colors;\n";
    
    return summary;
  };

  const thinkingSteps = [
    "🤖 Initializing AI analysis...",
    "📝 Processing lyrics content...",
    "🧠 Analyzing sentiment and emotions...",
    "🎨 Determining visual themes...",
    "🌈 Selecting color palettes...",
    "⚡ Calculating animation parameters...",
    "🎯 Generating specific recommendations...",
    "✨ Finalizing AI suggestions..."
  ];

  const generateAIRecommendations = async () => {
    try {
      console.log('🤖 Starting AI analysis for lyrics:', lyrics.substring(0, 100) + '...');
      
      // Prepare context for AI analysis
      const analysisContext = {
        assetRepository: assetRepository || [],
        currentSelection: currentSelection || null,
        // Use provided context or fallback to defaults
        artist: context?.artist || 'Unknown Artist',
        songTitle: context?.songTitle || 'Unknown Song',
        youtubeTitle: context?.youtubeTitle || null,
        genre: context?.genre || null,
        year: context?.year || null
      };

      // Perform real sentiment analysis with context
      const sentimentAnalysis = await sentimentAnalyzer.analyzeLyrics(lyrics, analysisContext);
      console.log('🤖 Sentiment analysis result:', sentimentAnalysis);
      
      // Store AI analysis details for display
      setAiAnalysisDetails({
        sentiment: sentimentAnalysis.sentiment,
        emotions: sentimentAnalysis.emotions,
        mood: sentimentAnalysis.mood,
        themes: sentimentAnalysis.themes,
        colors: sentimentAnalysis.colors,
        visualElements: sentimentAnalysis.visualElements
      });
      
      // Generate visual recommendations based on sentiment
      const visualRecommendations = sentimentAnalyzer.generateVisualRecommendations(
        sentimentAnalysis, 
        assetRepository
      );
      console.log('🤖 Visual recommendations:', visualRecommendations);

      const elementTypes = assetRepository.map(asset => asset.subtype).join(" + ") || "None selected";
      const totalAssets = assetRepository.length;

      return [
        { name: "Sentiment Analysis", value: `${sentimentAnalysis.sentiment.overall} (${Math.round(sentimentAnalysis.sentiment.confidence * 100)}%)`, description: `Detected emotions: ${sentimentAnalysis.emotions.join(', ')}` },
        { name: "Mood", value: sentimentAnalysis.mood.join(', '), description: `Visual themes: ${sentimentAnalysis.themes.join(', ')}` },
        { name: "Selected Assets", value: `${totalAssets} items`, description: `Repository contains: ${elementTypes}` },
        { name: "Size", value: visualRecommendations.size, description: "AI-recommended based on sentiment intensity" },
        { name: "Position", value: visualRecommendations.position, description: "Optimized for detected mood" },
        { name: "Elements", value: visualRecommendations.elements, description: "AI-matched to lyrical content" },
        { name: "Color Palette", value: visualRecommendations.colorPalette, description: "Colors matched to emotional tone" },
        { name: "Animation Speed", value: visualRecommendations.animationSpeed, description: "Synchronized with sentiment intensity" },
        { name: "Density", value: visualRecommendations.density, description: "Based on confidence and asset count" },
        { name: "Transparency", value: visualRecommendations.transparency, description: "Adjusted for mood and atmosphere" },
        { name: "Rotation", value: visualRecommendations.rotation, description: "Style matched to animation type" },
        ...Object.entries(visualRecommendations)
          .filter(([key, value]) => !['size', 'position', 'elements', 'colorPalette', 'animationSpeed', 'density', 'transparency', 'rotation'].includes(key))
          .map(([key, value]) => ({ name: key.charAt(0).toUpperCase() + key.slice(1), value: value, description: `AI-detected parameter` }))
      ];
    } catch (error) {
      console.error('Failed to generate AI recommendations:', error);
      // Fallback to basic recommendations
      return getBasicRecommendations();
    }
  };

  const getBasicRecommendations = () => {
    const elementTypes = assetRepository.map(asset => asset.subtype).join(" + ") || "None selected";
    const totalAssets = assetRepository.length;

    return [
      { name: "Selected Assets", value: `${totalAssets} items`, description: `Repository contains: ${elementTypes}` },
      { name: "Size", value: "Dynamic", description: "Elements scale with music intensity" },
      { name: "Position", value: "Distributed", description: "Multiple focal points based on asset count" },
      { name: "Elements", value: elementTypes || "None", description: "Based on your asset repository" },
      { name: "Color Palette", value: "Adaptive", description: "Colors adapt to lyrical mood" },
      { name: "Animation Speed", value: "Variable", description: "Speed varies by asset type" },
      { name: "Density", value: totalAssets > 3 ? "High" : "Medium", description: "Based on number of assets" },
      { name: "Transparency", value: "0.6-0.9", description: "Layered depth with multiple assets" },
      { name: "Rotation", value: "Variable", description: "Different rotation per asset type" }
    ];
  };

  useEffect(() => {
    if (isThinking) {
      const interval = setInterval(async () => {
        setThinkingStep(prev => {
          if (prev < thinkingSteps.length - 1) {
            return prev + 1;
          } else {
            setIsThinking(false);
            // Generate AI recommendations asynchronously
            generateAIRecommendations().then(recommendations => {
              setAiParameters(recommendations);
            }).catch(error => {
              console.error('Error generating recommendations:', error);
              setAiParameters(getBasicRecommendations());
            });
            return prev;
          }
        });
      }, 1500);

      return () => clearInterval(interval);
    }
  }, [isThinking, assetRepository, lyrics]);

  const handleApplyParameters = () => {
    // In a real implementation, this would apply the AI parameters to the actual visual system
    console.log("Applying AI parameters:", aiParameters);
    onClose();
  };

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0,0,0,0.8)",
      backdropFilter: "blur(10px)",
      zIndex: 1000,
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }}>
      <div style={{
        width: "80%",
        maxWidth: "1000px",
        height: "80%",
        backgroundColor: "rgba(0,0,0,0.95)",
        border: "2px solid rgba(255,255,255,0.3)",
        borderRadius: "16px",
        padding: "32px",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 20px 60px rgba(0,0,0,0.8)"
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div>
            <h2 style={{ color: "white", margin: 0, fontSize: "22px", fontWeight: "700" }}>ThinkingAI</h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.3)",
              color: "white",
              fontSize: "18px",
              cursor: "pointer",
              padding: "8px 12px",
              borderRadius: "8px",
              transition: "all 0.2s",
              fontWeight: "600"
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = "rgba(255,255,255,0.2)";
              e.target.style.transform = "scale(1.05)";
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = "rgba(255,255,255,0.1)";
              e.target.style.transform = "scale(1)";
            }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: "auto" }}>
          {isThinking ? (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <div style={{
                width: "60px",
                height: "60px",
                border: "3px solid rgba(0,150,255,0.3)",
                borderTop: "3px solid #0096ff",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
                margin: "0 auto 20px"
              }} />
              <h3 style={{ color: "white", marginBottom: "10px" }}>
                {thinkingSteps[thinkingStep]}
              </h3>
              <div style={{ color: "rgba(255,255,255,0.7)", fontSize: "14px" }}>
                Step {thinkingStep + 1} of {thinkingSteps.length}
              </div>
            </div>
          ) : (
            <div>
              {/* Lyrics Analysis */}
              {lyrics && (
                <div style={{ marginBottom: "24px" }}>
                  <h3 style={{ color: "white", marginBottom: "12px", fontSize: "16px" }}>Music Analysis</h3>
                  <div style={{
                    backgroundColor: "rgba(255,255,255,0.1)",
                    padding: "12px",
                    borderRadius: "8px",
                    color: "rgba(255,255,255,0.8)",
                    fontSize: "14px"
                  }}>
                    <strong>Lyrics:</strong> {lyrics}
                  </div>
                </div>
              )}

              {/* AI Analysis Details */}
              {aiAnalysisDetails && (
                <div style={{ marginBottom: "24px" }}>
                  <h3 style={{ color: "white", marginBottom: "12px", fontSize: "16px" }}>🤖 AI Analysis</h3>
                  <div style={{
                    backgroundColor: "rgba(0,150,255,0.1)",
                    padding: "16px",
                    borderRadius: "8px",
                    border: "1px solid rgba(0,150,255,0.3)"
                  }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                      <div>
                        <strong style={{ color: "#0096ff" }}>Sentiment:</strong>
                        <div style={{ color: "rgba(255,255,255,0.8)", fontSize: "14px" }}>
                          {aiAnalysisDetails.sentiment.overall} ({Math.round(aiAnalysisDetails.sentiment.confidence * 100)}% confidence)
                        </div>
                      </div>
                      <div>
                        <strong style={{ color: "#0096ff" }}>Emotions:</strong>
                        <div style={{ color: "rgba(255,255,255,0.8)", fontSize: "14px" }}>
                          {aiAnalysisDetails.emotions.join(', ')}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                      <div>
                        <strong style={{ color: "#0096ff" }}>Mood:</strong>
                        <div style={{ color: "rgba(255,255,255,0.8)", fontSize: "14px" }}>
                          {aiAnalysisDetails.mood.join(', ')}
                        </div>
                      </div>
                      <div>
                        <strong style={{ color: "#0096ff" }}>Themes:</strong>
                        <div style={{ color: "rgba(255,255,255,0.8)", fontSize: "14px" }}>
                          {aiAnalysisDetails.themes.join(', ')}
                        </div>
                      </div>
                    </div>
                    <div>
                      <strong style={{ color: "#0096ff" }}>Visual Elements:</strong>
                      <div style={{ color: "rgba(255,255,255,0.8)", fontSize: "14px" }}>
                        {aiAnalysisDetails.visualElements.join(', ')}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Asset Repository Display */}
              {assetRepository.length > 0 && (
                <div style={{ marginBottom: "24px" }}>
                  <h3 style={{ color: "white", marginBottom: "16px", fontSize: "16px", fontWeight: "600" }}>Your Asset Repository</h3>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {assetRepository.map((asset) => (
                      <div key={asset.id} style={{
                        backgroundColor: "rgba(0,150,255,0.1)",
                        border: "1px solid rgba(0,150,255,0.3)",
                        borderRadius: "6px",
                        padding: "6px 12px",
                        fontSize: "12px",
                        color: "white"
                      }}>
                        {asset.label}
                      </div>
                    ))}
                  </div>
                </div>
              )}

                    {/* AI Recommendations */}
                    <div style={{ marginBottom: "32px" }}>
                      <h3 style={{ color: "white", marginBottom: "20px", fontSize: "18px", fontWeight: "600" }}>AI Recommendations</h3>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "16px" }}>
                        {aiParameters && aiParameters.length > 0 ? aiParameters.map((param, index) => (
                          <div key={index} style={{
                            backgroundColor: "rgba(255,255,255,0.08)",
                            border: "1px solid rgba(255,255,255,0.2)",
                            borderRadius: "12px",
                            padding: "16px",
                            transition: "all 0.2s ease",
                            boxShadow: "0 2px 10px rgba(0,0,0,0.2)"
                          }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px", gap: "12px" }}>
                              <span style={{ color: "white", fontWeight: "700", fontSize: "16px", flex: "0 0 auto" }}>{param.name}</span>
                              <span style={{ 
                                color: "#0096ff", 
                                fontSize: "14px", 
                                fontWeight: "600",
                                backgroundColor: "rgba(0,150,255,0.1)",
                                padding: "4px 8px",
                                borderRadius: "6px",
                                border: "1px solid rgba(0,150,255,0.3)",
                                flex: "1 1 auto",
                                minWidth: "0",
                                wordBreak: "break-word",
                                textAlign: "right"
                              }}>{param.value}</span>
                            </div>
                            <div style={{ color: "rgba(255,255,255,0.8)", fontSize: "13px", lineHeight: "1.5" }}>
                              {param.description}
                            </div>
                          </div>
                        )) : (
                          <div style={{
                            backgroundColor: "rgba(255,255,255,0.08)",
                            border: "1px solid rgba(255,255,255,0.2)",
                            borderRadius: "12px",
                            padding: "20px",
                            textAlign: "center",
                            color: "rgba(255,255,255,0.6)"
                          }}>
                            <div style={{ fontSize: "16px", marginBottom: "8px" }}>🤖 AI is analyzing...</div>
                            <div style={{ fontSize: "14px" }}>Generating recommendations based on lyrics</div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Integration Summary */}
                    <div style={{ marginBottom: "32px" }}>
                      <h3 style={{ color: "white", marginBottom: "16px", fontSize: "18px", fontWeight: "600" }}>Integration Summary</h3>
                      <div style={{
                        backgroundColor: "rgba(0,150,255,0.1)",
                        border: "2px solid rgba(0,150,255,0.3)",
                        borderRadius: "12px",
                        padding: "20px",
                        color: "white",
                        fontSize: "14px",
                        lineHeight: "1.6"
                      }}>
                        <div style={{ marginBottom: "12px", fontWeight: "600", color: "#0096ff" }}>
                          🎨 Visual Rendering Commands:
                        </div>
                        <div style={{ fontFamily: "monospace", backgroundColor: "rgba(0,0,0,0.3)", padding: "12px", borderRadius: "6px", marginBottom: "12px" }}>
                          {aiParameters && aiParameters.length > 0 ? generateIntegrationSummary(aiParameters) : "Loading recommendations..."}
                        </div>
                        <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)" }}>
                          Copy the above commands to integrate with your visual rendering system. All values are production-ready and can be directly applied to CSS transforms, WebGL shaders, or any graphics framework.
                        </div>
                      </div>
                    </div>

            </div>
          )}
        </div>

        {/* Footer */}
        {!isThinking && (
          <div style={{ display: "flex", gap: "16px", marginTop: "24px", justifyContent: "flex-end" }}>
            <button
              onClick={onClose}
              style={{
                padding: "12px 24px",
                backgroundColor: "transparent",
                border: "1px solid rgba(255,255,255,0.3)",
                borderRadius: "8px",
                color: "white",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "600",
                transition: "all 0.2s"
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = "rgba(255,255,255,0.1)";
                e.target.style.borderColor = "rgba(255,255,255,0.5)";
                e.target.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = "transparent";
                e.target.style.borderColor = "rgba(255,255,255,0.3)";
                e.target.style.transform = "translateY(0)";
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleApplyParameters}
              style={{
                padding: "12px 24px",
                backgroundColor: "#0096ff",
                border: "1px solid #0096ff",
                borderRadius: "8px",
                color: "white",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "700",
                transition: "all 0.2s",
                boxShadow: "0 2px 10px rgba(0,150,255,0.3)"
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = "#0080e6";
                e.target.style.borderColor = "#0080e6";
                e.target.style.transform = "translateY(-1px)";
                e.target.style.boxShadow = "0 4px 15px rgba(0,150,255,0.4)";
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = "#0096ff";
                e.target.style.borderColor = "#0096ff";
                e.target.style.transform = "translateY(0)";
                e.target.style.boxShadow = "0 2px 10px rgba(0,150,255,0.3)";
              }}
            >
              Apply Parameters
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
