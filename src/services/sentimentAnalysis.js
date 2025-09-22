// Sentiment Analysis Service for Lyrics
// This service analyzes lyrics and provides visual recommendations

export class SentimentAnalyzer {
  constructor() {
    // Check for API key in environment variables (works in both Vite and Create React App)
    this.apiKey = null;
    this.baseUrl = 'https://api.groq.com/openai/v1/chat/completions';
    this.useLocalAI = false;
    this.useGroq = false;
    
    try {
      // Try different ways to access environment variables
      if (typeof process !== 'undefined' && process.env) {
        this.apiKey = process.env.REACT_APP_GROQ_API_KEY;
      } else if (typeof import.meta !== 'undefined' && import.meta.env) {
        this.apiKey = import.meta.env.VITE_GROQ_API_KEY;
      }
      
      // Check for Groq setup (default and free)
      if (this.apiKey) {
        this.useGroq = true;
        console.log('🤖 Using Groq API for AI sentiment analysis');
      } else if (import.meta.env.VITE_AI_PROVIDER === 'local') {
        this.useLocalAI = true;
        this.baseUrl = import.meta.env.VITE_AI_BASE_URL || 'http://localhost:1234/v1';
        this.apiKey = import.meta.env.VITE_AI_API_KEY || 'lm-studio';
        console.log('🤖 Using local AI for sentiment analysis');
      } else {
        console.log('🤖 Using free keyword-based sentiment analysis');
      }
    } catch (error) {
      // Environment variables not available, use free mode
      console.log('Using free sentiment analysis mode');
    }
  }

  async analyzeLyrics(lyrics, context = {}) {
    if (!this.apiKey) {
      console.log('🤖 Using free AI sentiment analysis (keyword-based)');
      return this.getMockAnalysis(lyrics, context);
    }

    try {
      const prompt = this.createAnalysisPrompt(lyrics, context);
      let model, provider;
      
      if (this.useGroq) {
        model = 'llama-3.1-8b-instant'; // Groq's current fastest model
        provider = 'Groq';
      } else if (this.useLocalAI) {
        model = import.meta.env.VITE_AI_MODEL || 'meta-llama-3.1-8b-instruct';
        provider = 'Local AI';
      } else {
        model = 'gpt-4';
        provider = 'OpenAI';
      }
      
      console.log(`🤖 Using ${provider} AI for sentiment analysis with model: ${model}`);
      
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: 'system',
              content: 'You are an expert music analyst and visual designer. Analyze song lyrics and provide detailed sentiment analysis with specific visual recommendations for a music visualizer. Always respond with valid JSON format.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 1500,
          temperature: 0.7,
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} - ${response.statusText}`);
      }

      const data = await response.json();
      const aiResponse = data.choices?.[0]?.message?.content || data.choices?.[0]?.text || '';
      
      if (!aiResponse) {
        throw new Error('No response from AI');
      }
      
      console.log(`🤖 ${provider} AI Response received:`, aiResponse.substring(0, 200) + '...');
      return this.parseAIResponse(aiResponse);
    } catch (error) {
      console.error('AI sentiment analysis failed:', error);
      console.log('🔄 Falling back to keyword-based analysis');
      return this.getMockAnalysis(lyrics);
    }
  }

  createAnalysisPrompt(lyrics, context = {}) {
    const {
      artist = 'Unknown Artist',
      songTitle = 'Unknown Song',
      genre = null,
      year = null,
      assetRepository = [],
      currentSelection = null,
      youtubeTitle = null
    } = context;

    // Build context information
    let contextInfo = `SONG CONTEXT:
- Artist: ${artist}
- Title: ${songTitle}`;

    if (genre) contextInfo += `\n- Genre: ${genre}`;
    if (year) contextInfo += `\n- Year: ${year}`;
    if (youtubeTitle) contextInfo += `\n- YouTube Title: ${youtubeTitle}`;

    // Add visual context
    if (assetRepository && assetRepository.length > 0) {
      contextInfo += `\n\nSELECTED VISUAL ASSETS:
${assetRepository.map(asset => `- ${asset.type}: ${asset.subtype} (${asset.parameters ? Object.entries(asset.parameters).map(([k,v]) => `${k}: ${v}`).join(', ') : 'default params'})`).join('\n')}`;
    }

    if (currentSelection) {
      contextInfo += `\n\nCURRENT SELECTION: ${currentSelection}`;
    }

    // Analyze lyrical structure
    const lines = lyrics.split('\n').filter(line => line.trim());
    const wordCount = lyrics.split(/\s+/).length;
    const hasRepetition = this.detectRepetition(lyrics);
    const emotionalIntensity = this.analyzeEmotionalIntensity(lyrics);

    contextInfo += `\n\nLYRICAL ANALYSIS:
- Total lines: ${lines.length}
- Word count: ${wordCount}
- Repetitive elements: ${hasRepetition ? 'Yes' : 'No'}
- Emotional intensity: ${emotionalIntensity}`;

    return `You are an expert music visualizer AI with deep knowledge of music psychology, visual design, and emotional analysis. Analyze these song lyrics and provide detailed sentiment analysis with specific visual recommendations for a music visualization system.

${contextInfo}

LYRICS TO ANALYZE:
"${lyrics}"

ANALYSIS REQUIREMENTS:
1. Sentiment Analysis: Determine overall emotional tone (positive/negative/neutral) with confidence (0-1)
2. Emotion Detection: Identify primary emotions from the lyrics
3. Mood Assessment: Describe the overall mood and atmosphere
4. Visual Themes: Suggest visual themes that match the lyrics and artist style
5. Color Psychology: Recommend colors based on emotional content and genre
6. Animation Style: Suggest animation characteristics that match the song's energy
7. Intensity Level: Determine visual intensity (low/medium/high) based on lyrical content
8. Visual Elements: Recommend specific visual elements that complement the selected assets
9. Asset Integration: Consider how to best use the selected visual assets
10. Genre Awareness: Factor in musical genre and era for appropriate visual styling

RESPOND WITH VALID JSON ONLY:
{
  "sentiment": {"overall": "positive", "confidence": 0.85},
  "emotions": ["joy", "anticipation", "trust"],
  "mood": ["energetic", "bright", "uplifting"],
  "themes": ["nature", "abstract", "flowing"],
  "colors": {
    "primary": "#FF6B6B",
    "secondary": "#4ECDC4", 
    "accent": "#FFE66D",
    "mood": "warm"
  },
  "animation": "flowing",
  "intensity": "high",
  "visualElements": ["flowing lines", "organic shapes", "warm gradients", "particle effects"],
  "recommendations": {
    "size": "Large elements (100-150px)",
    "position": "Dynamic grid with flowing movement",
    "density": "Medium-high density (8-12 elements)",
    "transparency": "High opacity (0.8-1.0) with gentle pulsing",
    "rotation": "Smooth 360° rotation with variable speed",
    "specialEffects": ["bloom", "motion blur", "color transitions"]
  },
  "assetSuggestions": {
    "primaryAssets": ["diagonal lines", "circles"],
    "secondaryAssets": ["curvilinear lines", "squares"],
    "avoidAssets": ["rectilinear lines"],
    "reasoning": "Explanation of why these assets work best for this song"
  }
}

IMPORTANT: Respond with ONLY the JSON object, no additional text.`;
  }

  detectRepetition(lyrics) {
    const lines = lyrics.split('\n').filter(line => line.trim());
    if (lines.length < 3) return false;
    
    // Check for repeated lines (simple approach)
    const lineCounts = {};
    lines.forEach(line => {
      const cleanLine = line.trim().toLowerCase();
      if (cleanLine.length > 10) { // Only count substantial lines
        lineCounts[cleanLine] = (lineCounts[cleanLine] || 0) + 1;
      }
    });
    
    const maxCount = Math.max(...Object.values(lineCounts));
    return maxCount >= 2;
  }

  analyzeEmotionalIntensity(lyrics) {
    const intensityWords = {
      high: ['explosive', 'intense', 'powerful', 'dramatic', 'overwhelming', 'fierce', 'violent', 'passionate'],
      medium: ['strong', 'energetic', 'dynamic', 'vibrant', 'active', 'lively', 'engaging'],
      low: ['gentle', 'soft', 'calm', 'peaceful', 'subtle', 'quiet', 'mellow', 'serene']
    };
    
    const words = lyrics.toLowerCase().split(/\s+/);
    let intensityScore = 0;
    
    Object.entries(intensityWords).forEach(([level, words]) => {
      const weight = level === 'high' ? 3 : level === 'medium' ? 2 : 1;
      words.forEach(word => {
        if (words.includes(word)) {
          intensityScore += weight;
        }
      });
    });
    
    if (intensityScore >= 6) return 'High';
    if (intensityScore >= 3) return 'Medium';
    return 'Low';
  }

  parseAIResponse(responseText) {
    try {
      // Clean the response text
      let cleanText = responseText.trim();
      
      // Remove any markdown code blocks
      cleanText = cleanText.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      
      // Extract JSON from the response
      const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        console.log('🤖 Successfully parsed AI response:', parsed);
        return parsed;
      }
      throw new Error('No JSON found in response');
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      console.log('Raw response:', responseText.substring(0, 500));
      return this.getMockAnalysis();
    }
  }

  getMockAnalysis(lyrics = '', context = {}) {
    // Advanced keyword-based sentiment analysis
    const lowerLyrics = lyrics.toLowerCase();
    
    // Comprehensive keyword maps for better analysis
    const keywordMaps = {
      // Sentiment keywords with weights
      positive: {
        'love': 3, 'happy': 2, 'joy': 3, 'bright': 2, 'beautiful': 2, 'amazing': 2, 'wonderful': 2, 
        'fantastic': 2, 'great': 1, 'good': 1, 'smile': 2, 'laugh': 2, 'dream': 2, 'hope': 2, 
        'light': 2, 'shine': 2, 'glow': 2, 'bliss': 3, 'ecstasy': 3, 'euphoria': 3, 'blissful': 2,
        'cheerful': 2, 'delight': 2, 'pleasure': 2, 'content': 1, 'satisfied': 1, 'grateful': 2,
        'blessed': 2, 'fortunate': 1, 'lucky': 1, 'victory': 2, 'triumph': 2, 'success': 2
      },
      negative: {
        'sad': 2, 'dark': 2, 'lonely': 2, 'hurt': 2, 'pain': 3, 'cry': 2, 'tears': 2, 'broken': 2,
        'hate': 3, 'angry': 2, 'mad': 2, 'furious': 3, 'rage': 3, 'despair': 3, 'hopeless': 3,
        'empty': 2, 'void': 2, 'lost': 2, 'confused': 1, 'scared': 2, 'afraid': 2, 'fear': 2,
        'terrified': 3, 'anxious': 2, 'worried': 1, 'depressed': 3, 'miserable': 3, 'suffering': 3,
        'agony': 3, 'torment': 3, 'torture': 3, 'nightmare': 2, 'horror': 2, 'dread': 2
      },
      energetic: {
        'dance': 3, 'move': 2, 'run': 2, 'jump': 2, 'fast': 2, 'energy': 3, 'power': 2, 'strong': 2,
        'wild': 2, 'crazy': 2, 'intense': 2, 'fierce': 2, 'passionate': 2, 'dynamic': 2, 'vibrant': 2,
        'pulse': 2, 'beat': 2, 'rhythm': 2, 'bass': 1, 'drums': 1, 'loud': 1, 'explosive': 3,
        'thunder': 2, 'lightning': 2, 'fire': 2, 'flame': 2, 'burn': 2, 'explode': 3, 'burst': 2,
        'rush': 2, 'speed': 2, 'quick': 1, 'rapid': 2, 'swift': 1, 'agile': 1, 'active': 1
      },
      calm: {
        'peace': 3, 'calm': 2, 'quiet': 2, 'soft': 2, 'gentle': 2, 'slow': 2, 'serene': 3, 'tranquil': 3,
        'still': 2, 'silent': 2, 'hush': 2, 'whisper': 1, 'breeze': 1, 'flow': 2, 'drift': 2,
        'float': 2, 'glide': 2, 'smooth': 1, 'easy': 1, 'relaxed': 2, 'chill': 1, 'cool': 1,
        'mellow': 2, 'soothing': 2, 'healing': 2, 'rest': 1, 'sleep': 1, 'dream': 1, 'meditation': 2
      },
      romantic: {
        'love': 3, 'heart': 2, 'kiss': 2, 'embrace': 2, 'touch': 1, 'tender': 2, 'sweet': 2,
        'romantic': 3, 'passion': 2, 'desire': 2, 'intimate': 2, 'close': 1, 'together': 1,
        'forever': 2, 'always': 1, 'eternal': 2, 'soul': 2, 'spirit': 1, 'connection': 2,
        'bond': 1, 'unity': 1, 'harmony': 1, 'melody': 1, 'song': 1, 'music': 1,
        'rose': 2, 'pink': 1, 'red': 1, 'valentine': 2, 'candle': 1, 'moonlight': 2
      },
      mysterious: {
        'dark': 2, 'shadow': 2, 'mystery': 3, 'secret': 2, 'hidden': 2, 'unknown': 2, 'strange': 2,
        'weird': 1, 'odd': 1, 'curious': 1, 'puzzle': 1, 'riddle': 1, 'enigma': 2, 'mystical': 2,
        'magic': 2, 'spell': 1, 'charm': 1, 'mystique': 2, 'aura': 1, 'vibe': 1, 'feeling': 1,
        'sense': 1, 'intuition': 1, 'instinct': 1, 'gut': 1, 'hunch': 1, 'premonition': 2
      }
    };

    // Calculate weighted scores
    const scores = {};
    Object.keys(keywordMaps).forEach(category => {
      scores[category] = 0;
      Object.entries(keywordMaps[category]).forEach(([word, weight]) => {
        if (lowerLyrics.includes(word)) {
          scores[category] += weight;
        }
      });
    });

    // Determine sentiment
    let sentiment = 'neutral';
    let confidence = 0.5;
    
    if (scores.positive > scores.negative) {
      sentiment = 'positive';
      confidence = Math.min(0.95, 0.5 + (scores.positive * 0.05));
    } else if (scores.negative > scores.positive) {
      sentiment = 'negative';
      confidence = Math.min(0.95, 0.5 + (scores.negative * 0.05));
    }

    // Determine emotions based on scores
    const emotions = [];
    if (scores.positive > 0) emotions.push('joy', 'trust');
    if (scores.negative > 0) emotions.push('sadness', 'fear');
    if (scores.energetic > 0) emotions.push('anticipation', 'surprise');
    if (scores.romantic > 0) emotions.push('love', 'passion');
    if (scores.mysterious > 0) emotions.push('fear', 'surprise');

    // Determine mood
    const mood = [];
    if (scores.energetic > scores.calm) {
      mood.push('energetic', 'dynamic');
    } else if (scores.calm > scores.energetic) {
      mood.push('calm', 'peaceful');
    }
    if (scores.romantic > 2) mood.push('romantic', 'intimate');
    if (scores.mysterious > 2) mood.push('mysterious', 'dark');

    // Determine themes based on content
    const themes = [];
    if (scores.romantic > 0) themes.push('romantic', 'organic');
    if (scores.mysterious > 0) themes.push('mysterious', 'abstract');
    if (scores.energetic > 0) themes.push('dynamic', 'geometric');
    if (scores.calm > 0) themes.push('peaceful', 'flowing');

    // Color-specific keyword analysis
    const colorKeywords = {
      warm: ['sun', 'fire', 'warm', 'gold', 'orange', 'yellow', 'red', 'pink', 'rose', 'candle', 'flame'],
      cool: ['ice', 'cold', 'blue', 'green', 'purple', 'moon', 'night', 'sky', 'ocean', 'water', 'breeze'],
      bright: ['bright', 'light', 'shine', 'glow', 'sparkle', 'diamond', 'star', 'sun', 'flash', 'beam'],
      dark: ['dark', 'black', 'shadow', 'night', 'midnight', 'void', 'empty', 'gloom', 'dusk', 'twilight'],
      vibrant: ['rainbow', 'colorful', 'bright', 'vivid', 'neon', 'electric', 'loud', 'bold', 'striking'],
      muted: ['soft', 'gentle', 'pale', 'faded', 'subtle', 'quiet', 'whisper', 'hush', 'calm', 'peaceful']
    };

    // Analyze color preferences from lyrics
    const colorScores = {};
    Object.keys(colorKeywords).forEach(colorType => {
      colorScores[colorType] = colorKeywords[colorType].filter(word => lowerLyrics.includes(word)).length;
    });

    // Generate dynamic colors based on analysis
    const colorPalettes = {
      positive: {
        warm: { primary: '#FF6B6B', secondary: '#4ECDC4', accent: '#FFE66D', mood: 'warm' },
        vibrant: { primary: '#FF4757', secondary: '#2ED573', accent: '#FFA502', mood: 'vibrant' },
        pastel: { primary: '#FFB6C1', secondary: '#87CEEB', accent: '#DDA0DD', mood: 'soft' },
        bright: { primary: '#FFD700', secondary: '#FF69B4', accent: '#00CED1', mood: 'bright' }
      },
      negative: {
        cool: { primary: '#4A90E2', secondary: '#7B68EE', accent: '#9370DB', mood: 'cool' },
        dark: { primary: '#2C3E50', secondary: '#34495E', accent: '#7F8C8D', mood: 'dark' },
        moody: { primary: '#6C5CE7', secondary: '#A29BFE', accent: '#74B9FF', mood: 'moody' },
        muted: { primary: '#8B7D6B', secondary: '#A0A0A0', accent: '#C0C0C0', mood: 'muted' }
      },
      neutral: {
        balanced: { primary: '#9B59B6', secondary: '#95A5A6', accent: '#BDC3C7', mood: 'neutral' },
        earthy: { primary: '#8B4513', secondary: '#A0522D', accent: '#D2691E', mood: 'earthy' },
        modern: { primary: '#2C3E50', secondary: '#34495E', accent: '#95A5A6', mood: 'modern' }
      }
    };

    // Select color palette based on sentiment, mood, and color analysis
    let colorSet = colorPalettes[sentiment].warm;
    
    // Override based on detected color preferences
    if (colorScores.bright > 0 && sentiment === 'positive') {
      colorSet = colorPalettes.positive.bright;
    } else if (colorScores.dark > 0 && sentiment === 'negative') {
      colorSet = colorPalettes.negative.dark;
    } else if (colorScores.muted > 0) {
      colorSet = colorPalettes.negative.muted;
    } else if (mood.includes('mysterious')) {
      colorSet = colorPalettes.negative.dark;
    } else if (mood.includes('romantic')) {
      colorSet = colorPalettes.positive.pastel;
    } else if (mood.includes('energetic')) {
      colorSet = colorPalettes.positive.vibrant;
    } else if (mood.includes('calm')) {
      colorSet = colorPalettes.positive.warm;
    }

    // Generate visual elements based on analysis
    const visualElements = [];
    if (scores.energetic > 2) visualElements.push('sharp lines', 'geometric shapes', 'particle bursts');
    if (scores.calm > 2) visualElements.push('flowing curves', 'organic shapes', 'soft gradients');
    if (scores.romantic > 2) visualElements.push('heart shapes', 'soft curves', 'warm glows');
    if (scores.mysterious > 2) visualElements.push('shadow effects', 'abstract forms', 'dark gradients');

    return {
      sentiment: { overall: sentiment, confidence },
      emotions: emotions.length > 0 ? emotions : ['neutral'],
      mood: mood.length > 0 ? mood : ['balanced'],
      themes: themes.length > 0 ? themes : ['abstract', 'geometric'],
      colors: {
        primary: colorSet.primary,
        secondary: colorSet.secondary,
        accent: colorSet.accent,
        mood: sentiment === 'positive' ? 'warm' : sentiment === 'negative' ? 'cool' : 'neutral'
      },
      animation: scores.energetic > scores.calm ? 'sharp' : 'flowing',
      intensity: scores.energetic > 5 ? 'high' : scores.energetic > 2 ? 'medium' : 'low',
      visualElements: visualElements.length > 0 ? visualElements : ['geometric shapes', 'color gradients']
    };
  }

  // Convert sentiment analysis to visual parameters
  generateVisualRecommendations(analysis, assetRepository) {
    const { sentiment, emotions, mood, colors, animation, intensity, visualElements, themes, recommendations } = analysis;
    
    // If AI provided specific recommendations, use them
    if (recommendations) {
      return {
        size: recommendations.size || this.calculateSize(intensity, sentiment.confidence),
        position: recommendations.position || this.calculatePosition(mood, themes),
        elements: this.mapElementsToAssets(visualElements, assetRepository),
        colorPalette: this.generateColorPalette(colors, mood, sentiment),
        animationSpeed: this.calculateAnimationSpeed(intensity, mood, emotions),
        density: recommendations.density || this.calculateDensity(sentiment.confidence, assetRepository.length, themes),
        transparency: recommendations.transparency || this.calculateTransparency(mood, sentiment, emotions),
        rotation: recommendations.rotation || this.calculateRotation(animation, themes, mood),
        specialEffects: recommendations.specialEffects || [],
        ...this.getEmotionBasedParameters(emotions, sentiment, mood)
      };
    }
    
    // Fallback to calculated recommendations
    const visualRecommendations = {
      // Size recommendations based on intensity and confidence
      size: this.calculateSize(intensity, sentiment.confidence),
      
      // Position based on mood and themes
      position: this.calculatePosition(mood, themes),
      
      // Elements based on analysis and asset repository
      elements: this.mapElementsToAssets(visualElements, assetRepository),
      
      // Color palette with more specific recommendations
      colorPalette: this.generateColorPalette(colors, mood, sentiment),
      
      // Animation speed based on intensity, mood, and emotions
      animationSpeed: this.calculateAnimationSpeed(intensity, mood, emotions),
      
      // Density based on sentiment confidence, asset count, and themes
      density: this.calculateDensity(sentiment.confidence, assetRepository.length, themes),
      
      // Transparency based on mood and sentiment
      transparency: this.calculateTransparency(mood, sentiment, emotions),
      
      // Rotation based on animation style and themes
      rotation: this.calculateRotation(animation, themes, mood),
      
      // Additional parameters based on emotions and analysis
      ...this.getEmotionBasedParameters(emotions, sentiment, mood)
    };

    return visualRecommendations;
  }

  mapElementsToAssets(visualElements, assetRepository) {
    if (assetRepository.length === 0) {
      return 'None selected';
    }
    
    const elementTypes = assetRepository.map(asset => asset.subtype).join(' + ');
    
    // Add recommendations based on visual elements
    const recommendations = [];
    if (visualElements.includes('flowing lines')) {
      recommendations.push('Curvilinear lines recommended');
    }
    if (visualElements.includes('geometric shapes')) {
      recommendations.push('Geometric forms suggested');
    }
    if (visualElements.includes('organic shapes')) {
      recommendations.push('Organic forms preferred');
    }
    
    return `${elementTypes} | ${recommendations.join(', ')}`;
  }

  calculateSize(intensity, confidence) {
    // Specific size values in pixels/units
    let baseSize = 50; // Default medium size
    
    if (intensity === 'high') {
      baseSize = 120;
    } else if (intensity === 'medium') {
      baseSize = 80;
    } else {
      baseSize = 40;
    }
    
    // Adjust based on confidence
    if (confidence > 0.8) {
      baseSize = Math.round(baseSize * 1.3);
    } else if (confidence < 0.4) {
      baseSize = Math.round(baseSize * 0.7);
    }
    
    return `${baseSize}px base size (${intensity} intensity)`;
  }

  calculatePosition(mood, themes) {
    if (mood.includes('energetic')) return 'Grid: 3x3 distribution, offset: ±20px, rotation: 0-360°';
    if (mood.includes('calm')) return 'Center: (50%, 50%), radius: 100px, rotation: 0-180°';
    if (mood.includes('romantic')) return 'Close: (45%, 45%) to (55%, 55%), radius: 60px';
    if (mood.includes('mysterious')) return 'Scattered: random positions, radius: 200px, opacity: 0.3-0.7';
    if (themes.includes('geometric')) return 'Grid: 4x4, spacing: 80px, alignment: center';
    if (themes.includes('organic')) return 'Curved: bezier paths, radius: 120px, flow: natural';
    return 'Balanced: 2x2 grid, center: (50%, 50%), spacing: 100px';
  }

  generateColorPalette(colors, mood, sentiment) {
    const basePalette = `${colors.mood} (${colors.primary}, ${colors.secondary})`;
    let enhancedPalette = basePalette;
    
    // Add specific color enhancements based on mood and sentiment
    if (mood.includes('romantic')) {
      enhancedPalette = `Romantic ${basePalette} + Pink Accents (#FFB6C1, #FF69B4)`;
    } else if (mood.includes('mysterious')) {
      enhancedPalette = `Mysterious ${basePalette} + Dark Shadows (#1A1A1A, #2C2C2C)`;
    } else if (mood.includes('energetic')) {
      enhancedPalette = `Vibrant ${basePalette} + Bright Highlights (#FFFF00, #FF4500)`;
    } else if (mood.includes('calm')) {
      enhancedPalette = `Soft ${basePalette} + Gentle Gradients (#E6F3FF, #F0F8FF)`;
    }
    
    // Add accent color information
    if (colors.accent) {
      enhancedPalette += ` + Accent: ${colors.accent}`;
    }
    
    // Add color temperature information
    const temperature = colors.mood === 'warm' ? 'Warm' : colors.mood === 'cool' ? 'Cool' : 'Neutral';
    enhancedPalette += ` (${temperature} Temperature)`;
    
    return enhancedPalette;
  }

  calculateAnimationSpeed(intensity, mood, emotions) {
    let baseSpeed = 100; // BPM
    let duration = 2.0; // seconds per cycle
    let easing = 'ease-in-out';
    
    if (intensity === 'high') {
      if (mood.includes('energetic')) {
        baseSpeed = 160;
        duration = 1.2;
        easing = 'ease-out';
      } else if (emotions.includes('anticipation')) {
        baseSpeed = 140;
        duration = 1.5;
        easing = 'ease-in-out';
      } else {
        baseSpeed = 130;
        duration = 1.8;
      }
    } else if (intensity === 'low') {
      if (mood.includes('calm')) {
        baseSpeed = 50;
        duration = 4.0;
        easing = 'ease-in';
      } else {
        baseSpeed = 70;
        duration = 3.0;
        easing = 'ease-in-out';
      }
    }
    
    // Add emotion-based modifiers
    if (emotions.includes('joy')) {
      duration *= 0.8; // Faster, more playful
      easing = 'ease-out';
    }
    if (emotions.includes('sadness')) {
      duration *= 1.5; // Slower decay
      easing = 'ease-in';
    }
    if (emotions.includes('fear')) {
      duration *= 0.6; // Erratic, quick changes
      easing = 'ease-in-out';
    }
    
    return `${baseSpeed} BPM, ${duration.toFixed(1)}s cycle, ${easing} easing`;
  }

  calculateDensity(confidence, assetCount, themes) {
    let count = assetCount;
    let spacing = 100; // pixels between elements
    let pattern = 'grid';
    
    // Base density calculation
    if (count > 5) {
      count = Math.min(count, 12); // Cap at 12 elements
      spacing = 60;
    } else if (count > 3) {
      count = Math.min(count, 8);
      spacing = 80;
    } else if (count > 1) {
      count = Math.min(count, 4);
      spacing = 120;
    } else {
      count = 1;
      spacing = 0;
    }
    
    // Adjust based on confidence
    if (confidence > 0.8) {
      count = Math.ceil(count * 1.2);
      spacing = Math.round(spacing * 0.9);
    } else if (confidence < 0.4) {
      count = Math.max(1, Math.floor(count * 0.8));
      spacing = Math.round(spacing * 1.1);
    }
    
    // Theme-based pattern adjustments
    if (themes.includes('geometric')) {
      pattern = 'grid';
      spacing = Math.round(spacing * 0.8); // Tighter grid
    } else if (themes.includes('organic')) {
      pattern = 'radial';
      spacing = Math.round(spacing * 1.2); // More spread out
    } else if (themes.includes('abstract')) {
      pattern = 'random';
      spacing = Math.round(spacing * 1.1);
    }
    
    return `${count} elements, ${spacing}px spacing, ${pattern} pattern`;
  }

  calculateTransparency(mood, sentiment, emotions) {
    let minOpacity = 0.6;
    let maxOpacity = 0.9;
    let animation = 'static';
    
    if (mood.includes('mysterious')) {
      minOpacity = 0.2;
      maxOpacity = 0.5;
      animation = 'fade-in-out';
    } else if (mood.includes('romantic')) {
      minOpacity = 0.7;
      maxOpacity = 0.95;
      animation = 'gentle-pulse';
    } else if (sentiment.overall === 'negative') {
      minOpacity = 0.3;
      maxOpacity = 0.6;
      animation = 'fade-out';
    } else if (sentiment.overall === 'positive') {
      minOpacity = 0.7;
      maxOpacity = 1.0;
      animation = 'bright-pulse';
    }
    
    if (emotions.includes('fear')) {
      minOpacity = 0.1;
      maxOpacity = 0.4;
      animation = 'flicker';
    } else if (emotions.includes('joy')) {
      minOpacity = 0.8;
      maxOpacity = 1.0;
      animation = 'bright-pulse';
    }
    
    return `opacity: ${minOpacity}-${maxOpacity}, animation: ${animation}`;
  }

  calculateRotation(animation, themes, mood) {
    let minAngle = 0;
    let maxAngle = 180;
    let speed = 1.0; // rotations per second
    let easing = 'ease-in-out';
    
    if (animation === 'sharp') {
      minAngle = 0;
      maxAngle = 360;
      speed = 2.0;
      easing = 'ease-out';
    }
    
    if (themes.includes('geometric')) {
      // Precise angles: 0, 45, 90, 135, 180, etc.
      maxAngle = 180;
      speed = 0.5;
      easing = 'linear';
    } else if (themes.includes('organic')) {
      // Natural curves
      maxAngle = 360;
      speed = 0.8;
      easing = 'ease-in-out';
    }
    
    if (mood.includes('energetic')) {
      speed *= 2.0;
      easing = 'ease-out';
    } else if (mood.includes('calm')) {
      speed *= 0.5;
      easing = 'ease-in';
    }
    
    return `rotation: ${minAngle}°-${maxAngle}°, speed: ${speed.toFixed(1)}rps, easing: ${easing}`;
  }

  getEmotionBasedParameters(emotions, sentiment, mood) {
    const params = {};
    
    if (emotions.includes('joy')) {
      params.brightness = 'High';
      params.contrast = 'Enhanced';
      params.saturation = 'Vibrant';
    }
    if (emotions.includes('sadness')) {
      params.brightness = 'Low';
      params.contrast = 'Reduced';
      params.saturation = 'Muted';
    }
    if (emotions.includes('anticipation')) {
      params.pulsing = 'Enabled';
      params.growth = 'Dynamic';
      params.movement = 'Forward';
    }
    if (emotions.includes('fear')) {
      params.shaking = 'Enabled';
      params.flickering = 'Random';
      params.distortion = 'Subtle';
    }
    if (emotions.includes('love')) {
      params.softness = 'Enhanced';
      params.warmth = 'Increased';
      params.bloom = 'Gentle';
    }
    if (mood.includes('mysterious')) {
      params.shadows = 'Deep';
      params.fog = 'Subtle';
      params.depth = 'Enhanced';
    }
    if (mood.includes('energetic')) {
      params.motionBlur = 'Dynamic';
      params.trails = 'Enabled';
      params.acceleration = 'Variable';
    }
    
    return params;
  }
}

export default new SentimentAnalyzer();
