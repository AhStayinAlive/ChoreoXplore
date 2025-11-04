# 🎭 ChoreoXplore

A real-time motion tracking and visual effects application that combines pose detection, AI-powered sentiment analysis, and 3D visualizations. Create stunning visual experiences by mapping your movements to dynamic effects and analyzing music lyrics with AI.

## ✨ Features

- **Real-time Pose Tracking**: MediaPipe-powered skeleton detection with responsive avatar
- **AI-Powered Analysis**: Sentiment analysis and visual recommendations for song lyrics
- **3D Visualizations**: Three.js-powered 3D canvas with motion-reactive effects
- **Hand Effects**: Advanced hand tracking effects including:
  - **WebGL Fluid Simulation**: Real-time fluid dynamics mapped to hand movements
  - **Ripple Effects**: Animated water-like ripples following hands
  - **Smoke Trails**: Particle-based smoke effects
  - **Fluid Distortion**: Post-processing fluid distortion
- **Multiple Input Sources**: YouTube links, file uploads, and manual lyrics input
- **Dynamic Scaling**: Avatar automatically scales based on distance from camera
- **Clean Interface**: Intuitive controls for motion sensitivity and visual effects

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Webcam** (for motion tracking)
- **Modern browser** (Chrome, Firefox, Safari, Edge)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ChoreoXplore
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables** (Optional - for AI features and Spotify)
   ```bash
   # Create .env.local file
   touch .env.local
   ```
   
   Add to `.env.local`:
   ```env
   # AI Features (Optional)
   VITE_GROQ_API_KEY=your_groq_api_key_here
   
   # Spotify Auto-Color Feature (Optional)
   VITE_SPOTIFY_CLIENT_ID=your_spotify_client_id_here
   VITE_SPOTIFY_REDIRECT_URI=http://localhost:5173
   ```

   See [Spotify Setup](#spotify-auto-color-feature) for details on configuring Spotify integration.

4. **Start the application**
   ```bash
   # Terminal 1: Start the main app
   npm run dev
   
   # Terminal 2: Start lyrics proxy server
   npm run server
   ```

5. **Open your browser**
   Navigate to `http://localhost:5173`

## 🎯 Usage Guide

### Basic Motion Tracking

1. **Allow camera access** when prompted
2. **Position yourself** in front of the camera (full body visible for best results)
3. **Watch your avatar** - a green skeleton will appear and follow your movements
4. **Adjust sensitivity** using the Motion Controls panel on the right

### AI-Powered Lyrics Analysis

1. **Get lyrics** using one of these methods:
   - **YouTube**: Paste a YouTube URL in the Music Input panel
   - **File Upload**: Upload an audio file
   - **Manual**: Type lyrics directly

2. **Click "Think AI"** to analyze the lyrics
3. **View recommendations** for visual parameters based on sentiment analysis

### Visual Effects

1. **Add assets** in the Asset Panel (lines, surfaces, 3D geometries)
2. **Adjust parameters** using the sliders
3. **Enable reactivity** to make effects respond to your movements
4. **Experiment** with different presets and settings

### Hand Effects

ChoreoXplore includes advanced hand tracking effects that follow your hand movements:

1. **WebGL Fluid Simulation** - Real-time fluid dynamics with physics-based simulation
   - See [WEBGL_FLUID_INTEGRATION.md](WEBGL_FLUID_INTEGRATION.md) for detailed documentation
   - Adapted from [Pavel Dogreat's WebGL Fluid Simulation](https://github.com/PavelDoGreat/WebGL-Fluid-Simulation)
   - Features: Curl/vorticity, pressure solving, advection, colorful mode
2. **Ripple Effect** - Animated water-like ripples
3. **Smoke Effect** - Particle-based smoke trails
4. **Fluid Distortion** - Post-processing fluid distortion effect

To use hand effects:
1. Open the **Hand Effects Panel** on the right side
2. Select an **Effect Type** from the dropdown
3. Choose which hand(s) to track: Left, Right, or Both
4. Adjust parameters to customize the effect

## 🔧 Advanced Setup

### AI Integration

For AI-powered lyrics analysis, you need an API key:

#### Groq API (Recommended - Free)
1. Go to [https://console.groq.com/](https://console.groq.com/)
2. Sign up for a free account
3. Create an API key
4. Add to `.env.local`:
   ```env
   VITE_GROQ_API_KEY=your_groq_api_key_here
   ```

### Spotify Auto-Color Feature

ChoreoXplore can automatically select background and visual asset colors based on your currently playing Spotify track. The colors are derived from the album artwork palette and audio features (energy, valence, key, etc.).

#### Setup

1. **Create a Spotify App**
   - Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
   - Click "Create an App"
   - Give it a name (e.g., "ChoreoXplore")
   - Add `http://localhost:5173` to "Redirect URIs"
   - Save and copy your **Client ID**

2. **Configure Environment Variables**
   Add to `.env.local`:
   ```env
   VITE_SPOTIFY_CLIENT_ID=your_spotify_client_id_here
   VITE_SPOTIFY_REDIRECT_URI=http://localhost:5173
   ```

3. **How to Use**
   - On the landing page, click **"Connect to Spotify"**
   - Authorize the app
   - Start playing a track on Spotify
   - Toggle **"Auto from Spotify"** ON
   - Colors will update automatically when the track changes (~5s)
   - Toggle OFF to manually override colors

#### How It Works

- **Album Art**: Extracts a vibrant color palette from album artwork
- **Audio Features**: Maps energy, valence, key, and mode to color properties
  - Energy → Saturation (more energy = more vibrant)
  - Valence → Hue shift (positive = warmer, negative = cooler)
  - Key/Mode → Base hue (musical key mapped to color wheel)
- **Fallback**: If album art is unavailable or CORS-blocked, uses audio features only
- **Performance**: Polls every 5 seconds, updates only when track changes




## 📁 Project Structure

```
ChoreoXplore/
├── src/
│   ├── components/          # React components
│   │   ├── SimpleSkeleton.jsx    # Main avatar component
│   │   ├── MotionInputPanel.jsx  # Camera and pose detection
│   │   └── ...
│   ├── core/               # Core functionality
│   │   ├── motionMapping.js      # Motion-to-visual mapping
│   │   ├── pose.js              # Pose detection logic
│   │   └── ...
│   ├── services/           # External services
│   │   └── sentimentAnalysis.js  # AI sentiment analysis
│   └── lib/                # Utilities
├── server/                 # Backend services
│   └── index.js           # AI proxy server
├── public/                 # Static assets
└── packs/                  # Visual effect presets
```

## 🛠️ Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run server` - Start lyrics proxy server
- `npm run dev:server` - Start AI proxy server
- `npm run lint` - Run ESLint

### Key Components

- **SimpleSkeleton**: Real-time pose tracking avatar
- **MotionInputPanel**: Camera feed and MediaPipe integration
- **AIThinkingPanel**: AI-powered lyrics analysis
- **AssetPanel**: Visual asset management
- **MotionControlPanel**: Motion sensitivity controls

## 🔍 Troubleshooting

### Common Issues

**Camera not working:**
- Ensure camera permissions are granted
- Try refreshing the page
- Check if another application is using the camera

**Avatar not appearing:**
- Make sure you're visible in the camera frame
- Check browser console for errors
- Try adjusting the camera angle

**AI features not working:**
- Verify API key is set in `.env.local`
- Check if proxy server is running (`npm run server`)
- Ensure internet connection for API calls

**Legs not rendering:**
- Position camera to capture your full body
- The system uses lower visibility thresholds for legs
- Try stepping back from the camera

### Performance Tips

- **Close other applications** using the camera
- **Use Chrome** for best MediaPipe performance
- **Adjust FPS settings** if experiencing lag
- **Position camera** at eye level for optimal tracking

## 🎨 Customization




## 📚 API Reference

### Motion Detection
- Uses MediaPipe Pose Landmarker
- 33 body landmarks detected
- Real-time pose estimation

### AI Analysis
- Sentiment analysis (positive/negative/neutral)
- Emotion detection (joy, sadness, anger, etc.)
- Visual parameter recommendations

### Visual Effects
- Three.js-based 3D rendering
- Motion-reactive transformations
- Real-time parameter adjustment

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project would adhere to all copyright materials and for academic research purposes only.

## 🙏 Acknowledgments

- **MediaPipe** for pose detection
- **Three.js** for 3D graphics
- **React** for UI framework
- **Groq** for AI API services

---

**Ready to explore?** Start the application and begin creating amazing motion-reactive visual experiences! 🎭✨