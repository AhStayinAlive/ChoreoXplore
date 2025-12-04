# ChoreoXplore

An interactive web-based tool for dancers and choreographers to create real-time motion-reactive visual performances. ChoreoXplore combines pose tracking, Spotify integration, and Three.js-powered visuals to enable exploration and creation of dance visualizations with projection mapping support.

## Features

### Song Integration
- Spotify API integration for song search and selection
- Playback controls with volume adjustment
- Loop track functionality
- Automatic color extraction from album artwork (Vibrant.js)

### Visual System
- Three.js-based visual rendering
- Background and asset color customization
- Transparency controls
- Music loudness affects visual intensity
- Pre-validated visual assets (lines, surfaces, 3D geometries)

### Motion Tracking
- MediaPipe Pose detection for real-time movement tracking
- Avatar visualization (can be toggled on/off)
- Dual camera support: seated user mode and dance space mode
- Mirrored movement feature
- Hand movement tracking with visual effects

### Hand Effects
- Multiple effect types (Fluid, Smoke, Particle Trails, etc.)
- Color customization
- Size adjustment
- Map effects to specific hand or both hands

### User Interface
- Step-by-step guide panel
- Orange highlighting for next step in workflow
- ChoreoXplore Mode (Editor mode) for setup and customization
- Performance Mode for live performances
- Projection mapping support for montage space integration

## Quick Start

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- 2 Webcams (for motion tracking)
- Modern browser (Chrome recommended for best performance)
- Spotify account (optional, for music integration)
- Voicemeeter (for audio routing from Spotify to browser)

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

3. **Set up environment variables** (for Spotify integration)
   ```bash
   # Create .env.local file
   touch .env.local
   ```
   
   Add to `.env.local`:
   ```env
   # Spotify Integration
   VITE_SPOTIFY_CLIENT_ID=spotify-client-id-here
   VITE_SPOTIFY_CLIENT_SECRET=spotify-secret-id-here
   VITE_SPOTIFY_REDIRECT_URI=http://127.0.0.1:5137/callback
   ```

4. **Start the application**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:5173`

## Usage Guide

### Getting Started

The interface includes a step-by-step guide panel that highlights the next action in orange. Follow the guided workflow:

1. **Connect to Spotify** (optional) - Link your Spotify account for music playback
2. **Select Camera** - Choose between seated user camera or dance space camera
3. **Enable Motion Tracking** - Allow camera access for pose detection
4. **Select Song** - Search and select a track from Spotify
5. **Configure Visuals** - Customize background and asset colors (or use auto-color from album)
6. **Add Hand Effects** - Choose and configure hand tracking effects
7. **Choose Mode** - Switch between ChoreoXplore Mode and Performance Mode

### ChoreoXplore Mode (Editor Mode)

Use this mode for setup and customization:

- Configure visual assets and effects
- Adjust colors, transparency, and reactivity settings
- Test hand effects and motion mapping
- Fine-tune parameters before performance
- Toggle avatar visibility for reference

### Performance Mode

Optimized for live performances:

- Clean, distraction-free interface
- Full-screen visual output
- Essential playback controls only
- Suitable for projection mapping
- Real-time motion-reactive visuals


## Advanced Setup

### Spotify Integration

ChoreoXplore uses Spotify API for song selection and playback, and can automatically extract colors from album artwork using Vibrant.js.

#### Setup

1. **Create a Spotify App**
   - Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
   - Click "Create an App"
   - Give it a name (e.g., "ChoreoXplore")
   - Add `http://127.0.0.1:5137/callback` to "Redirect URIs"
   - Save and copy your **Client ID** and **Client Secret**

2. **Configure Environment Variables**
   Add to `.env.local`:
   ```env
   VITE_SPOTIFY_CLIENT_ID=spotify-client-id-here
   VITE_SPOTIFY_CLIENT_SECRET=spotify-secret-id-here
   VITE_SPOTIFY_REDIRECT_URI=http://127.0.0.1:5137/callback
   ```

3. **How to Use**
   - Connect to Spotify from the web tool
   - Search and select a song
   - Use playback controls (play/pause, volume, loop)
   - Toggle "Auto from Spotify" to extract colors from album artwork
   - Colors update automatically based on the currently playing track

#### Automatic Color Extraction

- Uses Vibrant.js to extract dominant colors from album artwork
- Applies colors to background and visual assets
- Can be toggled on/off for manual color selection
- Provides cohesive visual theme based on song's album art

### Audio Routing with Voicemeeter

ChoreoXplore's audio-reactive visuals require the browser to receive audio input. Since Spotify plays through your system audio, you need Voicemeeter to route the audio to the browser's microphone input.

#### Setup

1. **Download and Install Voicemeeter**
   - Go to [VB-Audio Voicemeeter](https://vb-audio.com/Voicemeeter/)
   - Download Voicemeeter (standard version is sufficient)
   - Install and restart your computer if prompted

2. **Configure Voicemeeter**
   - Open Voicemeeter
   - Set your default audio output device to "Voicemeeter Input"
     - Right-click speaker icon in Windows taskbar
     - Select "Open Sound settings"
     - Choose "Voicemeeter Input (VB-Audio Voicemeeter VAIO)" as output device
   - In Voicemeeter, set Hardware Out (A1) to your physical speakers/headphones

3. **Configure Browser Microphone**
   - In Chrome, go to Settings > Privacy and security > Site Settings > Microphone
   - Set default microphone to "Voicemeeter Output (VB-Audio Voicemeeter VAIO)"
   - Or allow ChoreoXplore to prompt for microphone selection
   - When prompted, select "Voicemeeter Output" as the audio input device

4. **Test Audio Routing**
   - Play music through Spotify
   - Grant microphone permission when ChoreoXplore requests it
   - Visuals should now react to the music playing through Spotify
   - Adjust input levels in Voicemeeter if needed

**Calibration:**
1. Position projector for optimal wall coverage
2. Set up camera to capture full dance space
3. Launch ChoreoXplore
4. Test motion tracking coverage

## License

This project is for academic research purposes only and adheres to all copyright and licensing requirements for third-party libraries and APIs.

## Acknowledgments

- **MediaPipe** by Google for pose and hand tracking
- **Three.js** for WebGL-based 3D rendering
- **Spotify Web API** for music integration
- **Vibrant.js** for color extraction
- **React** for UI framework

---
