# 🤖 AI Setup Guide for ChoreoXplore

## Overview
Your ChoreoXplore app now has advanced AI integration for sentiment analysis and visual recommendations! The AI analyzes song lyrics and provides intelligent suggestions for visual parameters.

## 🚀 Quick Start (FREE!)

###  Groq API 
1. **Get Groq API Key** (Free):
   - Go to https://console.groq.com/
   - Sign up for a free account
   - Go to API Keys section
   - Create a new API key (it's free!)

2. **Configure ChoreoXplore**:
   - Create `.env.local` file in your project root
   - Add this line:
   ```
   VITE_GROQ_API_KEY=your_groq_api_key_here
   ```

## 🎯 How It Works

### AI Analysis Process:
1. **Lyrics Input**: User provides song lyrics (via YouTube, file upload, or manual entry)
2. **AI Processing**: Advanced AI analyzes sentiment, emotions, mood, and themes
3. **Visual Recommendations**: AI generates specific visual parameters:
   - Size, Position, Elements
   - Color palettes and mood
   - Animation speed and style
   - Density, transparency, rotation
   - Special effects

### AI Features:
- **Sentiment Analysis**: Detects positive/negative/neutral with confidence scores
- **Emotion Detection**: Identifies joy, sadness, anger, fear, etc.
- **Mood Assessment**: Determines energetic, calm, romantic, mysterious moods
- **Visual Themes**: Suggests nature, urban, abstract, geometric themes
- **Color Psychology**: Recommends colors based on emotional content
- **Animation Intelligence**: Suggests appropriate animation styles

## 🔧 Testing Your Setup

1. **Start the servers**:
   ```bash
   # Terminal 1: Start lyrics proxy server
   npm run server
   
   # Terminal 2: Start React app
   npm run dev
   ```

2. **Test AI integration**:
   - Go to ChoreoXplore
   - Add some assets to your repository
   - Click "Think AI" button
   - Watch the AI analyze lyrics and generate recommendations!

## 🎨 AI Recommendations Include:

- **Size**: Dynamic sizing based on sentiment intensity
- **Position**: Smart positioning based on mood and themes
- **Elements**: AI-matched visual elements to lyrical content
- **Color Palette**: Emotion-based color recommendations
- **Animation Speed**: Synchronized with sentiment intensity
- **Density**: Optimized based on confidence and asset count
- **Transparency**: Adjusted for mood and atmosphere
- **Rotation**: Style-matched to animation type
- **Special Effects**: Bloom, motion blur, color transitions

## 🎵 Example Workflow

1. **Add Assets**: Select lines, surfaces, and geometries
2. **Get Lyrics**: Use YouTube link, file upload, or manual entry
3. **AI Analysis**: Click "Think AI" to analyze lyrics
4. **View Results**: See detailed AI analysis and recommendations
5. **Apply**: Use the recommended parameters in your visualizer

## 🔮 Future Enhancements

- **Real-time Analysis**: Analyze lyrics as they're typed
- **Music Integration**: Analyze actual audio files
- **Custom Models**: Train models on specific music genres
- **Advanced Effects**: More sophisticated visual effects
- **Collaborative AI**: Multiple AI models working together


