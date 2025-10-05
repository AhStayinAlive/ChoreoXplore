import { useState, useEffect } from 'react';
import sentimentAnalyzer from '../services/sentimentAnalysis';

const AIAssetGenerator = ({ lyrics, context, onAssetsGenerated, onBackgroundImageGenerated, authorMode = false }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAssets, setGeneratedAssets] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);

  // AI Image Generation API configuration
  const AI_PROXY_URL = 'http://localhost:3002/api/generate-image';

  // Auto-generate images when lyrics are available (only in generative mode, not author mode)
  useEffect(() => {
    if (lyrics && lyrics.trim() !== '' && !isGenerating && generatedAssets.length === 0 && !authorMode) {
      console.log('🎵 Lyrics detected, auto-generating AI image...');
      generateAIAssets();
    } else if (lyrics && lyrics.trim() !== '' && authorMode) {
      console.log('🎵 Author mode: Only analyzing lyrics sentiment, not generating images');
      analyzeLyricsOnly();
    }
  }, [lyrics, authorMode]);

  const analyzeLyricsOnly = async () => {
    if (!lyrics || lyrics.trim() === '') {
      return;
    }

    try {
      console.log('🎵 Analyzing lyrics sentiment for author mode...');
      const sentimentAnalysis = await sentimentAnalyzer.analyzeLyrics(lyrics, context);
      setAnalysis(sentimentAnalysis);
      console.log('📊 Sentiment analysis complete for author mode:', sentimentAnalysis);
      
      // Notify parent component with analysis only (no assets)
      if (onAssetsGenerated) {
        onAssetsGenerated({
          assets: [], // No assets generated in author mode
          analysis: sentimentAnalysis,
          context
        });
      }
    } catch (error) {
      console.error('Error analyzing lyrics in author mode:', error);
    }
  };

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
    
    // Create prompts based on analysis (now async)
    const prompts = await createImagePrompts(analysis);
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

  const createImagePrompts = async (analysis) => {
    const { sentiment, emotions, mood, themes, colors, intensity } = analysis;
    
    // Use Groq AI to analyze most prominent visual elements from lyrics
    const visualElements = await analyzeVisualElementsWithGroq(lyrics, analysis);
    
    // Build templated prompt with AI-analyzed visual elements
    let prompt = buildTemplatedPromptWithElements(visualElements, analysis);
    
    return [prompt];
  };

  const analyzeVisualElementsWithGroq = async (lyrics, analysis) => {
    try {
      // Check if we have Groq API key
      const apiKey = import.meta.env.VITE_GROQ_API_KEY;
      if (!apiKey) {
        console.log('🤖 No Groq API key, using fallback analysis');
        return getFallbackVisualElements(analysis);
      }

      const prompt = `You are an expert visual designer analyzing song lyrics for backdrop creation. 

LYRICS:
${lyrics}

SENTIMENT ANALYSIS:
- Mood: ${analysis.mood ? analysis.mood.join(', ') : 'unknown'}
- Emotions: ${analysis.emotions ? analysis.emotions.join(', ') : 'unknown'}
- Themes: ${analysis.themes ? analysis.themes.join(', ') : 'unknown'}
- Sentiment: ${analysis.sentiment ? analysis.sentiment.overall : 'unknown'}

Analyze the lyrics and identify the most prominent visual elements that should be included in a backdrop. Focus on:
1. Specific objects, places, or scenes mentioned in the lyrics
2. Visual metaphors or imagery from the lyrics
3. Environmental settings described in the lyrics
4. Key visual themes from the lyrics

IMPORTANT: Respond ONLY with a valid JSON object in this exact format:
{
  "primaryScene": "main visual scene/place from lyrics",
  "keyObjects": ["object1 from lyrics", "object2 from lyrics", "object3 from lyrics"],
  "environment": "environmental setting from lyrics",
  "visualStyle": "artistic style description",
  "atmosphere": "atmospheric description from lyrics"
}

Do not include any text before or after the JSON. Only return the JSON object.`;

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 500
        })
      });

      if (!response.ok) {
        throw new Error(`Groq API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      
      console.log('🎨 Groq AI raw response:', content);
      
      // Try to parse JSON response
      try {
        // Clean the content - remove any text before/after JSON
        let jsonContent = content.trim();
        
        // Find JSON object boundaries
        const jsonStart = jsonContent.indexOf('{');
        const jsonEnd = jsonContent.lastIndexOf('}') + 1;
        
        if (jsonStart !== -1 && jsonEnd > jsonStart) {
          jsonContent = jsonContent.substring(jsonStart, jsonEnd);
        }
        
        const visualElements = JSON.parse(jsonContent);
        console.log('🎨 Groq AI visual elements analysis:', visualElements);
        
        // Validate that we have the required fields
        if (visualElements.primaryScene && visualElements.keyObjects && visualElements.environment) {
          return visualElements;
        } else {
          console.warn('Groq response missing required fields, using fallback');
          return getFallbackVisualElements(analysis);
        }
      } catch (parseError) {
        console.warn('Failed to parse Groq response as JSON:', parseError);
        console.warn('Raw content was:', content);
        return getFallbackVisualElements(analysis);
      }

    } catch (error) {
      console.error('Error analyzing visual elements with Groq:', error);
      return getFallbackVisualElements(analysis);
    }
  };

  const getFallbackVisualElements = (analysis) => {
    // Fallback when Groq AI is not available - use sentiment analysis to create better fallback
    const { mood, themes, emotions, sentiment } = analysis;
    
    let primaryScene = "abstract visual scene";
    let keyObjects = [];
    let environment = "open space";
    let visualStyle = "modern artistic";
    let atmosphere = "neutral";
    
    // Use themes to determine scene
    if (themes && themes.includes('nature')) {
      primaryScene = "natural landscape";
      environment = "outdoor natural setting";
    } else if (themes && themes.includes('urban')) {
      primaryScene = "urban cityscape";
      environment = "city environment";
    } else if (themes && themes.includes('celebration')) {
      primaryScene = "festive celebration scene";
      environment = "party atmosphere";
    }
    
    // Use mood for atmosphere
    if (mood && mood.length > 0) {
      atmosphere = mood.join(' ');
    }
    
    // Use sentiment for visual style
    if (sentiment && sentiment.overall === 'positive') {
      visualStyle = "bright and uplifting artistic";
    } else if (sentiment && sentiment.overall === 'negative') {
      visualStyle = "dramatic and moody artistic";
    }
    
    return {
      primaryScene,
      keyObjects,
      environment,
      visualStyle,
      atmosphere
    };
  };

  const buildTemplatedPromptWithElements = (visualElements, analysis) => {
    const { sentiment, emotions, mood, themes, colors, intensity } = analysis;
    
    // Start with the primary scene from AI analysis
    let prompt = `A ${visualElements.visualStyle} backdrop depicting ${visualElements.primaryScene}`;
    
    // Add environment if available
    if (visualElements.environment && visualElements.environment !== "open space") {
      prompt += ` in a ${visualElements.environment}`;
    }
    
    // Add key objects from AI analysis
    if (visualElements.keyObjects && visualElements.keyObjects.length > 0) {
      const objectsText = visualElements.keyObjects.join(', ');
      prompt += `, featuring ${objectsText}`;
    }
    
    // Add atmosphere from AI analysis
    if (visualElements.atmosphere) {
      prompt += `, with a ${visualElements.atmosphere} atmosphere`;
    }
    
    // Add mood and emotions from sentiment analysis
    if (mood && mood.length > 0) {
      const moodText = Array.isArray(mood) ? mood.join(' and ') : mood;
      prompt += `, evoking a ${moodText} mood`;
    }
    
    // Add intensity
    if (intensity === 'high') {
      prompt += `, with dynamic and energetic visual elements`;
    } else if (intensity === 'low') {
      prompt += `, with calm and peaceful visual elements`;
    }
    
    // Add colors from sentiment analysis if available
    if (colors && colors.primary && colors.secondary) {
      prompt += `, using ${colors.primary} and ${colors.secondary} color palette`;
    }
    
    // Add quality specifications
    prompt += `. High quality digital art, clean composition with strong visual impact, professional scenic backdrop design.`;
    
    // Add negative prompts to ensure clean backdrop generation
    prompt += ` no people, no dancers, no curtains, no text, no furniture, no props, no animals, no 3D render, no photorealism, no camera blur`;
    
    return prompt;
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


    </div>
  );
};

export default AIAssetGenerator;
