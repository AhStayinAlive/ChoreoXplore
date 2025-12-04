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
    const visualElements = await analyzeVisualElementsWithGroq(lyrics, analysis, context);
    
    // Build templated prompt with AI-analyzed visual elements
    let prompt = buildTemplatedPromptWithElements(visualElements, analysis, context);
    
    return [prompt];
  };

  const analyzeVisualElementsWithGroq = async (lyrics, analysis, context) => {
    try {
      // Debug: Log the context being passed to Groq
      console.log('🎵 Song context for Groq AI:', context);
      
      // Check if we have Groq API key
      const apiKey = import.meta.env.VITE_GROQ_API_KEY;
      if (!apiKey) {
        console.log('🤖 No Groq API key, using fallback analysis');
        return getFallbackVisualElements(analysis, context);
      }

      const prompt = `You are an expert visual analyst for music visualization. Your job is to analyze the ACTUAL LYRICS CONTENT and create visual themes based on what the lyrics literally describe.

SONG CONTEXT:
- Song: "${context?.songTitle || 'Unknown Song'}" by ${context?.artist || 'Unknown Artist'}

LYRICS TO ANALYZE (THIS IS THE MOST IMPORTANT PART - READ EVERY WORD):
${lyrics}

CRITICAL INSTRUCTION: IGNORE the song title completely. Focus ONLY on what the lyrics actually say. Look for specific visual elements mentioned in the lyrics.

LYRICS ANALYSIS EXAMPLES:
- If lyrics say "Look at the stars, look how they shine for you" → Create a NIGHT SKY with STARS, NOT a sunny day with yellow flowers
- If lyrics say "I'm walking on sunshine" → Create a BRIGHT SUNNY scene with sunbeams
- If lyrics say "Under the sea" → Create an UNDERWATER scene with marine life
- If lyrics say "Dancing in the moonlight" → Create a MOONLIT NIGHT scene
- If lyrics say "Fire and rain" → Create a scene with BOTH fire AND rain elements

ANALYSIS PROCESS:
1. READ the lyrics word by word
2. IDENTIFY the most frequently mentioned visual elements
3. LOOK for specific objects, places, or phenomena described
4. CREATE a scene that matches what the lyrics actually describe
5. DO NOT use generic interpretations based on the song title

SPECIFIC INSTRUCTION FOR THIS SONG: If the lyrics mention "stars" or "night" or "shine" in the context of looking up at the sky, create a NIGHT SCENE with STARS, not a sunny landscape.

SENTIMENT CONTEXT:
- Mood: ${analysis.mood ? analysis.mood.join(', ') : 'unknown'}
- Emotions: ${analysis.emotions ? analysis.emotions.join(', ') : 'unknown'}
- Themes: ${analysis.themes ? analysis.themes.join(', ') : 'unknown'}
- Sentiment: ${analysis.sentiment ? analysis.sentiment.overall : 'unknown'}

CRITICAL REQUIREMENTS - ABSOLUTELY NO PEOPLE OR HUMAN-LIKE SHAPES:
- NEVER include people, human figures, silhouettes, or any human-like shapes
- NO anthropomorphic forms, mannequins, statues, or sculptures
- NO human shadows, outlines, or abstract human forms
- Focus ONLY on natural environments, objects, and atmospheric elements
- Create scenes that directly represent what the lyrics describe
- Avoid indoor scenes, furniture, curtains, or man-made objects
- ONLY natural landscapes, skies, water, trees, mountains, stars, etc.

VISUAL STYLE: Natural and immersive digital art (atmospheric environments, natural scenes, environmental photography style)
AVOID: People, human figures, silhouettes, characters, dancers, actors, individuals, bodies, faces, hands, limbs, figures, shadows of people, human shapes, indoor scenes, furniture, curtains, props, stage backdrops, theatrical sets

RESPOND WITH ONLY THIS JSON FORMAT:
{
  "primaryScene": "A detailed natural scene that directly represents what the lyrics describe (NOT the song title)",
  "keyObjects": ["specific visual elements from the lyrics (NO human-related terms)", "supporting atmospheric elements", "natural environmental details"],
  "environment": "Natural outdoor setting that matches the song's visual themes",
  "visualStyle": "Natural and immersive digital art style that captures the essence of the lyrics",
  "atmosphere": "Mood that reflects the emotional journey described in the lyrics"
}

CRITICAL: In keyObjects, NEVER include human-related terms like "skin", "bones", "body", "person", "people", "human", "figure", "character". Focus only on natural objects, environmental elements, and atmospheric phenomena.

Return ONLY the JSON object, no other text.`;

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
        
        // Clean up invalid JSON syntax
        // Remove parenthetical translations from array elements
        jsonContent = jsonContent.replace(/"([^"]*)\s*\([^)]*\)"/g, '"$1"');
        // Remove any remaining parentheses that might break JSON
        jsonContent = jsonContent.replace(/\s*\([^)]*\)/g, '');
        // Clean up any double quotes that might have been left hanging
        jsonContent = jsonContent.replace(/,\s*,/g, ',');
        jsonContent = jsonContent.replace(/,\s*]/g, ']');
        jsonContent = jsonContent.replace(/,\s*}/g, '}');
        
        const visualElements = JSON.parse(jsonContent);
        console.log('🎨 Groq AI visual elements analysis:', visualElements);
        
        // Validate that we have the required fields
        if (visualElements.primaryScene && visualElements.keyObjects && visualElements.environment) {
          return visualElements;
        } else {
          console.warn('Groq response missing required fields, using fallback');
          return getFallbackVisualElements(analysis, context, lyrics);
        }
      } catch (parseError) {
        console.warn('Failed to parse Groq response as JSON:', parseError);
        console.warn('Raw content was:', content);
        return getFallbackVisualElements(analysis, context, lyrics);
      }

    } catch (error) {
      console.error('Error analyzing visual elements with Groq:', error);
      return getFallbackVisualElements(analysis, context, lyrics);
    }
  };

  const getFallbackVisualElements = (analysis, context, lyrics = '') => {
    // Fallback when Groq AI is not available - analyze lyrics content for visual themes
    const { mood, themes, emotions, sentiment } = analysis;
    const songTitle = context?.songTitle || '';
    const artist = context?.artist || '';
    
    // Analyze lyrics content for visual themes
    const lyricsLower = lyrics.toLowerCase();
    const titleLower = songTitle.toLowerCase();
    
    // Default fallback
    let primaryScene = "abstract atmospheric scene";
    let keyObjects = ["flowing forms", "dynamic shapes", "atmospheric elements"];
    let environment = "ethereal space";
    let visualStyle = "modern digital art";
    let atmosphere = "neutral";
    
    // Check lyrics content for specific visual themes (prioritize lyrics over title)
    // Special case for "Yellow" by Coldplay - focus on stars and night sky from lyrics
    if (lyricsLower.includes('look at the stars') || lyricsLower.includes('shine for you') || 
        lyricsLower.includes('star') || lyricsLower.includes('shine') || lyricsLower.includes('night sky') || lyricsLower.includes('cosmic')) {
      primaryScene = "vast starry night sky with countless twinkling stars and golden celestial light";
      keyObjects = ["stars", "night sky", "celestial light", "golden glow", "cosmic atmosphere"];
      environment = "cosmic night setting under open sky";
      visualStyle = "natural atmospheric digital art with celestial beauty";
      atmosphere = "mystical, wonder-filled, and celestial";
    } else if (lyricsLower.includes('ocean') || lyricsLower.includes('wave') || lyricsLower.includes('water') || lyricsLower.includes('sea')) {
      primaryScene = "dynamic ocean scene with rolling waves and water reflections";
      keyObjects = ["ocean waves", "water ripples", "aquatic movement", "flowing water"];
      environment = "oceanic setting";
      visualStyle = "natural atmospheric digital art";
      atmosphere = "flowing and dynamic";
    } else if (lyricsLower.includes('fire') || lyricsLower.includes('flame') || lyricsLower.includes('burn') || lyricsLower.includes('heat')) {
      primaryScene = "intense fire scene with flames and heat distortion";
      keyObjects = ["flames", "fire patterns", "heat waves", "glowing embers"];
      environment = "fiery setting";
      visualStyle = "natural dynamic digital art";
      atmosphere = "intense and energetic";
    } else if (lyricsLower.includes('cloud') || lyricsLower.includes('sky') || lyricsLower.includes('heaven') || lyricsLower.includes('atmospheric')) {
      primaryScene = "expansive sky scene with clouds and atmospheric effects";
      keyObjects = ["clouds", "atmospheric elements", "celestial forms", "sky textures"];
      environment = "atmospheric sky setting";
      visualStyle = "natural atmospheric digital art";
      atmosphere = "expansive and ethereal";
    } else if (lyricsLower.includes('moon') || lyricsLower.includes('moonlight') || lyricsLower.includes('lunar')) {
      primaryScene = "moonlit scene with silver light and night atmosphere";
      keyObjects = ["moon", "moonlight", "silver light", "night atmosphere"];
      environment = "moonlit setting";
      visualStyle = "natural atmospheric digital art";
      atmosphere = "mystical and serene";
    } else if (lyricsLower.includes('sun') || lyricsLower.includes('sunshine') || lyricsLower.includes('daylight') || lyricsLower.includes('bright')) {
      primaryScene = "sunlit scene with golden light and radiant energy";
      keyObjects = ["sunbeams", "golden light", "radiant energy", "bright atmosphere"];
      environment = "sunlit setting";
      visualStyle = "natural luminous digital art";
      atmosphere = "bright and uplifting";
    } else if (lyricsLower.includes('rain') || lyricsLower.includes('storm') || lyricsLower.includes('thunder') || lyricsLower.includes('weather')) {
      primaryScene = "dramatic weather scene with rain and atmospheric effects";
      keyObjects = ["rain", "storm clouds", "atmospheric effects", "weather elements"];
      environment = "stormy setting";
      visualStyle = "natural atmospheric digital art";
      atmosphere = "dramatic and dynamic";
    } else if (lyricsLower.includes('forest') || lyricsLower.includes('tree') || lyricsLower.includes('wood') || lyricsLower.includes('nature')) {
      primaryScene = "natural forest scene with trees and organic elements";
      keyObjects = ["trees", "forest elements", "natural textures", "organic forms"];
      environment = "natural forest setting";
      visualStyle = "natural environmental digital art";
      atmosphere = "natural and peaceful";
    } else if ((songTitle.toLowerCase().includes('castle') && songTitle.toLowerCase().includes('hill')) || 
               (artist.toLowerCase().includes('ed sheeran') && lyricsLower.includes('castle'))) {
      // Special case for "Castle On The Hill" by Ed Sheeran
      primaryScene = "rolling green hills with a majestic castle on a hilltop overlooking the countryside";
      keyObjects = ["castle", "hill", "rolling hills", "countryside", "distant mountains"];
      environment = "rural countryside with rolling hills and castle";
      visualStyle = "natural atmospheric digital art with nostalgic warmth";
      atmosphere = "nostalgic, wistful, and grand";
    } else if (lyricsLower.includes('mountain') || lyricsLower.includes('hill') || lyricsLower.includes('peak') || lyricsLower.includes('landscape')) {
      primaryScene = "mountainous landscape with peaks and natural terrain";
      keyObjects = ["mountains", "landscape elements", "natural terrain", "elevated forms"];
      environment = "mountainous setting";
      visualStyle = "natural environmental digital art";
      atmosphere = "majestic and expansive";
    } else if (lyricsLower.includes('city') || lyricsLower.includes('urban') || lyricsLower.includes('street') || lyricsLower.includes('building')) {
      primaryScene = "urban cityscape with buildings and city atmosphere";
      keyObjects = ["buildings", "city elements", "urban textures", "architectural forms"];
      environment = "urban setting";
      visualStyle = "modern architectural digital art";
      atmosphere = "dynamic and urban";
    } else if (titleLower.includes('wave') || titleLower.includes('ocean') || titleLower.includes('water')) {
      primaryScene = "dynamic ocean scene with rolling waves and water reflections";
      keyObjects = ["ocean waves", "water ripples", "aquatic movement", "flowing water"];
      environment = "oceanic setting";
      visualStyle = "natural atmospheric digital art";
      atmosphere = "flowing and dynamic";
    } else if (titleLower.includes('fire') || titleLower.includes('flame') || titleLower.includes('burn')) {
      primaryScene = "intense fire scene with flames and heat distortion";
      keyObjects = ["flames", "fire patterns", "heat waves", "glowing embers"];
      environment = "fiery setting";
      visualStyle = "natural dynamic digital art";
      atmosphere = "intense and energetic";
    } else if (titleLower.includes('sky') || titleLower.includes('cloud') || titleLower.includes('heaven')) {
      primaryScene = "expansive sky scene with clouds and atmospheric effects";
      keyObjects = ["clouds", "atmospheric elements", "celestial forms", "sky textures"];
      environment = "atmospheric sky setting";
      visualStyle = "natural atmospheric digital art";
      atmosphere = "expansive and ethereal";
    } else if (titleLower.includes('earth') || titleLower.includes('ground') || titleLower.includes('land')) {
      primaryScene = "natural landscape with earth textures and organic forms";
      keyObjects = ["landscape elements", "natural textures", "organic shapes", "earth forms"];
      environment = "natural terrestrial setting";
      visualStyle = "natural environmental digital art";
      atmosphere = "grounded and natural";
    } else if (titleLower.includes('light') || titleLower.includes('bright') || titleLower.includes('shine')) {
      primaryScene = "illuminated scene with light effects and glowing elements";
      keyObjects = ["light rays", "glowing elements", "illumination effects", "bright forms"];
      environment = "luminous setting";
      visualStyle = "natural luminous digital art";
      atmosphere = "bright and uplifting";
    } else if (titleLower.includes('dark') || titleLower.includes('night') || titleLower.includes('shadow')) {
      primaryScene = "mysterious dark scene with shadow effects and night atmosphere";
      keyObjects = ["shadow effects", "dark forms", "mysterious elements", "night textures"];
      environment = "dark atmospheric setting";
      visualStyle = "natural moody digital art";
      atmosphere = "mysterious and dark";
    }
    
    // Use themes to determine scene
    if (themes && themes.includes('nature')) {
      primaryScene = "natural landscape with flowing elements";
      keyObjects = ["organic shapes", "natural forms", "flowing lines"];
      environment = "outdoor natural setting";
    } else if (themes && themes.includes('urban')) {
      primaryScene = "urban cityscape with dynamic elements";
      keyObjects = ["geometric forms", "architectural shapes", "urban textures"];
      environment = "city environment";
    } else if (themes && themes.includes('celebration')) {
      primaryScene = "festive celebration scene";
      keyObjects = ["vibrant forms", "energetic shapes", "celebration elements"];
      environment = "party atmosphere";
    } else if (themes && themes.includes('love')) {
      primaryScene = "romantic atmospheric scene";
      keyObjects = ["soft forms", "gentle shapes", "romantic elements"];
      environment = "intimate setting";
    } else if (themes && themes.includes('melancholy')) {
      primaryScene = "melancholic atmospheric scene";
      keyObjects = ["subtle forms", "moody shapes", "emotional elements"];
      environment = "contemplative space";
    }
    
    // Use mood for atmosphere and visual style
    if (mood && mood.length > 0) {
      const moodStr = mood.join(' ');
      atmosphere = moodStr;
      
      if (moodStr.includes('energetic') || moodStr.includes('bright') || moodStr.includes('uplifting')) {
        visualStyle = "vibrant and energetic digital art";
        keyObjects = ["dynamic forms", "energetic shapes", "vibrant elements"];
      } else if (moodStr.includes('calm') || moodStr.includes('peaceful') || moodStr.includes('serene')) {
        visualStyle = "calm and serene digital art";
        keyObjects = ["gentle forms", "peaceful shapes", "serene elements"];
      } else if (moodStr.includes('melancholic') || moodStr.includes('sad') || moodStr.includes('emotional')) {
        visualStyle = "melancholic and emotional digital art";
        keyObjects = ["subtle forms", "emotional shapes", "atmospheric elements"];
      }
    }
    
    // Use sentiment for additional visual style adjustments
    if (sentiment && sentiment.overall === 'positive') {
      visualStyle = visualStyle.includes('digital art') ? visualStyle : "bright and uplifting digital art";
    } else if (sentiment && sentiment.overall === 'negative') {
      visualStyle = visualStyle.includes('digital art') ? visualStyle : "dramatic and moody digital art";
    }
    
    return {
      primaryScene,
      keyObjects,
      environment,
      visualStyle,
      atmosphere
    };
  };

  const buildTemplatedPromptWithElements = (visualElements, analysis, context) => {
    const { sentiment, emotions, mood, themes, colors, intensity } = analysis;
    const songTitle = context?.songTitle || '';
    
    // Create a clean, focused prompt using the Groq AI analysis
    // Start with explicit song and artist context for better AI understanding
    let prompt = `NATURAL LANDSCAPE ONLY - NO PEOPLE OR FIGURES: SONG: "${songTitle}" by ${context?.artist || 'Unknown Artist'} - Create a natural landscape scene: ${visualElements.visualStyle} depicting ${visualElements.primaryScene}`;
    
    // Emphasize the song title in the prompt if it's a key visual theme
    if (songTitle && (songTitle.toLowerCase().includes('wave') || songTitle.toLowerCase().includes('fire') || 
        songTitle.toLowerCase().includes('sky') || songTitle.toLowerCase().includes('earth') || 
        songTitle.toLowerCase().includes('light') || songTitle.toLowerCase().includes('dark') ||
        songTitle.toLowerCase().includes('yellow') || songTitle.toLowerCase().includes('castle'))) {
      prompt = `NATURAL LANDSCAPE ONLY - NO PEOPLE OR FIGURES: SONG: "${songTitle}" by ${context?.artist || 'Unknown Artist'} - Create a natural landscape scene inspired by the song "${songTitle}": ${visualElements.visualStyle} depicting ${visualElements.primaryScene}`;
    }
    
    // Add environment context if it adds value
    if (visualElements.environment && 
        visualElements.environment !== "open space" && 
        visualElements.environment !== visualElements.primaryScene) {
      prompt += ` in a ${visualElements.environment}`;
    }
    
    // Add key visual elements (but keep it concise and filter out human-related terms)
    if (visualElements.keyObjects && visualElements.keyObjects.length > 0) {
      // Filter out human-related terms that could confuse the AI
      const humanTerms = ['skin', 'bones', 'body', 'person', 'people', 'human', 'figure', 'character', 'individual', 'dancer', 'actor'];
      const filteredObjects = visualElements.keyObjects.filter(obj => 
        !humanTerms.some(term => obj.toLowerCase().includes(term))
      );
      
      // Only add the first 2-3 most important objects to avoid clutter
      const importantObjects = filteredObjects.slice(0, 3);
      if (importantObjects.length > 0) {
        const objectsText = importantObjects.join(', ');
        prompt += `, featuring ${objectsText}`;
      }
    }
    
    // Add atmosphere (this is important for mood)
    if (visualElements.atmosphere) {
      prompt += `, with a ${visualElements.atmosphere} atmosphere`;
    }
    
    // Add colors from sentiment analysis if available
    if (colors && colors.primary && colors.secondary) {
      prompt += `, using ${colors.primary} and ${colors.secondary} color palette`;
    }
    
    // Add quality and style specifications
    prompt += `. High quality digital art, clean composition with strong visual impact, natural and immersive imagery`;
    
    // Add extremely strong negative prompts at the end to ensure clean image generation
    prompt += `. ABSOLUTELY NO PEOPLE, NO HUMAN FIGURES, NO SILHOUETTES, NO PERSONS, NO CHARACTERS, NO DANCERS, NO ACTORS, NO INDIVIDUALS, NO BODIES, NO FACES, NO HANDS, NO LIMBS, NO HUMAN SHAPES, NO FIGURES, NO SHADOWS OF PEOPLE, NO HUMAN-LIKE FORMS, NO ANTHROPOMORPHIC SHAPES, NO MANNEQUINS, NO STATUES, NO SCULPTURES, NO CURTAINS, NO TEXT, NO FURNITURE, NO PROPS, NO ANIMALS, NO 3D RENDER, NO PHOTOREALISM, NO CAMERA BLUR, NO STAGE BACKDROP, NO THEATRICAL BACKDROP, NO SET DESIGN, NO ARCHITECTURE, NO BUILDINGS, NO INDOOR SCENES, NO MAN-MADE OBJECTS`;
    
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
