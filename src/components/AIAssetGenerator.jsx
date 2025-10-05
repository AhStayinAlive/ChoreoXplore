import { useState, useEffect } from 'react';
import sentimentAnalyzer from '../services/sentimentAnalysis';

const AIAssetGenerator = ({ lyrics, context, onAssetsGenerated, onBackgroundImageGenerated }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAssets, setGeneratedAssets] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);

  // AI Image Generation API configuration
  const AI_PROXY_URL = 'http://localhost:3002/api/generate-image';

  // Auto-generate images when lyrics are available
  useEffect(() => {
    if (lyrics && lyrics.trim() !== '' && !isGenerating && generatedAssets.length === 0) {
      console.log('🎵 Lyrics detected, auto-generating AI image...');
      generateAIAssets();
    }
  }, [lyrics]);

  const generateAIAssets = async () => {
    if (!lyrics || lyrics.trim() === '') {
      setError('Please provide lyrics to generate assets');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      // Step 1: Analyze lyrics sentiment
      console.log('🎵 Analyzing lyrics sentiment...');
      console.log('sentimentAnalyzer:', sentimentAnalyzer);
      console.log('analyzeLyrics method:', typeof sentimentAnalyzer.analyzeLyrics);
      const sentimentAnalysis = await sentimentAnalyzer.analyzeLyrics(lyrics, context);
      setAnalysis(sentimentAnalysis);
      console.log('📊 Sentiment analysis complete:', sentimentAnalysis);
      console.log('📊 Analysis details:', {
        sentiment: sentimentAnalysis.sentiment,
        emotions: sentimentAnalysis.emotions,
        mood: sentimentAnalysis.mood,
        themes: sentimentAnalysis.themes,
        colors: sentimentAnalysis.colors,
        intensity: sentimentAnalysis.intensity,
        visualElements: sentimentAnalysis.visualElements
      });

      // Step 2: Generate AI images based on analysis
      console.log('🎨 Generating AI assets...');
      const assets = await generateImagesFromAnalysis(sentimentAnalysis);
      setGeneratedAssets(assets);

      // Step 3: Notify parent component
      if (onAssetsGenerated) {
        onAssetsGenerated({
          assets,
          analysis: sentimentAnalysis,
          context
        });
      }

      // Step 4: Set the first generated image as background
      if (assets.length > 0 && onBackgroundImageGenerated) {
        console.log('🎨 Setting background image:', assets[0].imageUrl);
        onBackgroundImageGenerated(assets[0].imageUrl);
      }

    } catch (error) {
      console.error('Error generating AI assets:', error);
      setError(`Failed to generate assets: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateImagesFromAnalysis = async (analysis) => {
    const { sentiment, emotions, mood, themes, colors, intensity, visualElements } = analysis;
    
    // Create prompts based on analysis
    const prompts = createImagePrompts(analysis);
    const assets = [];

    for (let i = 0; i < prompts.length; i++) {
      try {
        const prompt = prompts[i];
        console.log(`🎨 Generating image ${i + 1}/${prompts.length}: "${prompt}"`);
        
        const imageBlob = await generateImage(prompt);
        if (imageBlob && imageBlob.size > 0) {
          const imageUrl = URL.createObjectURL(imageBlob);
          assets.push({
            id: `ai-asset-${Date.now()}-${i}`,
            type: 'ai-generated',
            subtype: getAssetType(prompt, i),
            prompt: prompt,
            imageUrl: imageUrl,
            analysis: {
              sentiment: sentiment.overall,
              emotions: emotions,
              mood: mood,
              themes: themes,
              colors: colors,
              intensity: intensity
            },
            params: {
              width: 512,
              height: 512,
              style: getStyleFromPrompt(prompt),
              category: getCategoryFromPrompt(prompt)
            }
          });
          console.log(`✅ Successfully generated asset ${i + 1}`);
        } else {
          console.warn(`⚠️ Empty or invalid image blob for prompt ${i + 1}`);
        }
      } catch (error) {
        console.error(`❌ Failed to generate image ${i + 1}:`, error.message);
        // Continue with other images even if one fails
      }
    }

    // If no assets were generated, create placeholder assets
    if (assets.length === 0) {
      console.log('🔄 No AI assets generated, creating placeholder assets...');
      const placeholderAssets = createPlaceholderAssets(analysis);
      return placeholderAssets;
    }

    return assets;
  };

  const createImagePrompts = (analysis) => {
    const { sentiment, emotions, mood, themes, colors, intensity, visualElements } = analysis;
    
    // Create specific scene-based prompts for dance backdrops
    let prompt = "";
    
    // Energetic/Party songs
    if (emotions.includes('joy') || mood.includes('energetic')) {
      prompt = "cinematic neon city skyline at night, dynamic light streaks and glowing geometric patterns, colorful fast-moving atmosphere, detailed urban architecture, realistic lighting, environment-only, background-only, digital stage backdrop, wide format, ultra-detailed, high resolution";
    }
    // Romantic/Emotional songs
    else if (emotions.includes('love') || mood.includes('romantic')) {
      prompt = "cinematic soft pastel sunset over open field, floating petals and golden haze, dreamy atmosphere, gentle lighting, detailed natural textures, environment-only, background-only, digital stage backdrop, wide format, ultra-detailed, high resolution";
    }
    // Sad/Reflective songs
    else if (emotions.includes('sadness') || mood.includes('melancholic') || mood.includes('contemplative')) {
      prompt = "cinematic rainy city street at night, wet pavement reflecting warm amber and cool blue lights, atmospheric fog, detailed architecture and lampposts, realistic lighting, environment-only, background-only, digital stage backdrop, wide format, ultra-detailed, high resolution";
    }
    // Nature/Freedom themes
    else if (themes.includes('nature') || themes.includes('freedom') || themes.includes('liberation')) {
      prompt = "cinematic wide mountain landscape under glowing sunrise, flowing clouds and flying birds, detailed natural textures, realistic lighting, environment-only, background-only, digital stage backdrop, wide format, ultra-detailed, high resolution";
    }
    // Cultural/Folkloric themes
    else if (themes.includes('cultural') || themes.includes('traditional') || themes.includes('heritage')) {
      prompt = "cinematic traditional festival decorations and colorful banners, rural setting, sunset glow, festive textures, detailed cultural elements, environment-only, background-only, digital stage backdrop, wide format, ultra-detailed, high resolution";
    }
    // Fantasy/Storytelling themes
    else if (themes.includes('fantasy') || themes.includes('mystical') || themes.includes('dream')) {
      prompt = "cinematic dreamlike forest filled with glowing fireflies and magical mist, mystical light shining through tall trees, detailed natural textures, environment-only, background-only, digital stage backdrop, wide format, ultra-detailed, high resolution";
    }
    // Anger/Intense themes
    else if (emotions.includes('anger') || intensity === 'high') {
      prompt = "cinematic dramatic storm clouds with lightning strikes, intense red and orange lighting, powerful dynamic atmosphere, detailed weather textures, environment-only, background-only, digital stage backdrop, wide format, ultra-detailed, high resolution";
    }
    // Fear/Mysterious themes
    else if (emotions.includes('fear') || mood.includes('mysterious')) {
      prompt = "cinematic mysterious moonlit forest with deep shadows and ethereal mist, dark purple and silver tones, detailed natural textures, environment-only, background-only, digital stage backdrop, wide format, ultra-detailed, high resolution";
    }
    // Default fallback
    else {
      prompt = "Elegant stage with soft gradient lighting, professional theater atmosphere, no people, balanced and harmonious backdrop for contemporary dance performance";
    }
    
    // Add color scheme if not already specified
    if (!prompt.includes(colors.primary) && !prompt.includes(colors.secondary)) {
      prompt += `, ${colors.primary} and ${colors.secondary} color palette`;
    }
    
    return [prompt];
  };

  const generateImage = async (prompt) => {
    try {
      console.log(`🎨 Generating image with prompt: "${prompt}"`);
      
      const response = await fetch(AI_PROXY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: prompt,
          negative_prompt: "person, people, human, man, woman, silhouette, figure, body, humanoid, mannequin, character, actor, creature, pedestrian, portrait, figure in distance, shadow shaped like person, narrative scene, lonely figure, human subject",
          style: 'stage lighting, atmospheric, professional',
          width: 1024,
          height: 768,
          guidance_scale: 9.0
        })
      });

      if (!response.ok) {
        throw new Error(`AI proxy server failed: ${response.status} - ${response.statusText}`);
      }

      const imageBlob = await response.blob();
      console.log(`✅ Successfully generated image! Size: ${imageBlob.size} bytes`);
      return imageBlob;
      
    } catch (error) {
      console.error('❌ AI image generation failed:', error.message);
      throw error;
    }
  };

  const getAssetType = (prompt, index) => {
    if (prompt.includes('geometric')) return 'geometric-pattern';
    if (prompt.includes('organic')) return 'organic-shape';
    if (prompt.includes('flowing')) return 'flowing-lines';
    if (prompt.includes('abstract')) return 'abstract-composition';
    return `ai-asset-${index}`;
  };

  const getStyleFromPrompt = (prompt) => {
    if (prompt.includes('energetic')) return 'energetic';
    if (prompt.includes('calm')) return 'calm';
    if (prompt.includes('romantic')) return 'romantic';
    if (prompt.includes('mysterious')) return 'mysterious';
    return 'balanced';
  };

  const getCategoryFromPrompt = (prompt) => {
    if (prompt.includes('geometric')) return 'geometric';
    if (prompt.includes('organic')) return 'organic';
    if (prompt.includes('abstract')) return 'abstract';
    return 'mixed';
  };

  const createPlaceholderAssets = (analysis) => {
    const { sentiment, emotions, mood, themes, colors, intensity } = analysis;
    
    // Create simple placeholder assets based on analysis
    const placeholderAssets = [];
    const assetTypes = ['geometric-pattern', 'organic-shape', 'abstract-composition', 'flowing-lines'];
    
    for (let i = 0; i < 2; i++) {
      const assetType = assetTypes[i] || 'abstract-composition';
      const placeholderUrl = createPlaceholderImage(colors, sentiment.overall, intensity);
      
      placeholderAssets.push({
        id: `placeholder-asset-${Date.now()}-${i}`,
        type: 'placeholder',
        subtype: assetType,
        prompt: `Placeholder ${assetType} based on ${sentiment.overall} sentiment`,
        imageUrl: placeholderUrl,
        analysis: {
          sentiment: sentiment.overall,
          emotions: emotions,
          mood: mood,
          themes: themes,
          colors: colors,
          intensity: intensity
        },
        params: {
          width: 512,
          height: 512,
          style: getStyleFromPrompt(`placeholder ${assetType}`),
          category: getCategoryFromPrompt(`placeholder ${assetType}`)
        }
      });
    }
    
    return placeholderAssets;
  };

  const createPlaceholderImage = (colors, sentiment, intensity) => {
    // Create a simple colored rectangle as placeholder
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    // Set background color based on sentiment
    const bgColor = sentiment === 'positive' ? colors.primary : 
                   sentiment === 'negative' ? colors.secondary : colors.accent;
    
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, 512, 512);
    
    // Add some simple shapes based on intensity
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    if (intensity === 'high') {
      // Multiple circles
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.arc(100 + i * 80, 256, 30, 0, 2 * Math.PI);
        ctx.fill();
      }
    } else if (intensity === 'medium') {
      // Fewer circles
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(150 + i * 100, 256, 40, 0, 2 * Math.PI);
        ctx.fill();
      }
    } else {
      // Single circle
      ctx.beginPath();
      ctx.arc(256, 256, 60, 0, 2 * Math.PI);
      ctx.fill();
    }
    
    return canvas.toDataURL();
  };

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12 }}>

      {error && (
        <div style={{
          padding: "8px 12px",
          backgroundColor: "rgba(255,0,0,0.2)",
          border: "1px solid rgba(255,0,0,0.4)",
          borderRadius: "6px",
          color: "#ff6b6b",
          fontSize: "10px"
        }}>
          {error}
        </div>
      )}

      {isGenerating && (
        <div style={{
          padding: "12px",
          backgroundColor: "rgba(0,150,255,0.1)",
          border: "1px solid rgba(0,150,255,0.3)",
          borderRadius: "6px",
          color: "white",
          fontSize: "10px",
          textAlign: "center"
        }}>
          <div>🎨 Analyzing lyrics and generating AI visual...</div>
          <div style={{ marginTop: 4, fontSize: "9px", opacity: 0.7 }}>
            This may take 30-60 seconds
          </div>
        </div>
      )}

      {analysis && (
        <div style={{
          padding: "8px 12px",
          backgroundColor: "rgba(0,0,0,0.3)",
          borderRadius: "6px",
          fontSize: "9px",
          color: "rgba(255,255,255,0.8)"
        }}>
          <div><strong>Analysis:</strong> {analysis.sentiment.overall} ({Math.round(analysis.sentiment.confidence * 100)}% confidence)</div>
          <div><strong>Mood:</strong> {analysis.mood.join(', ')}</div>
          <div><strong>Themes:</strong> {analysis.themes.join(', ')}</div>
          <div><strong>Intensity:</strong> {analysis.intensity}</div>
        </div>
      )}


      {!lyrics && (
        <div style={{
          padding: "12px",
          backgroundColor: "rgba(255,255,255,0.05)",
          borderRadius: "6px",
          color: "rgba(255,255,255,0.6)",
          fontSize: "10px",
          textAlign: "center"
        }}>
          Upload music or enter lyrics to generate AI assets
        </div>
      )}
    </div>
  );
};

export default AIAssetGenerator;
