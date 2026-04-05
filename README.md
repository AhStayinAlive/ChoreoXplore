# ChoreoXplore

An interactive web-based tool for dancers and choreographers to create real-time motion-reactive visual performances. ChoreoXplore combines pose tracking, Spotify integration, and Three.js-powered visuals for live dance performances and projection mapping.

## Features

### Visual Modes

7 switchable visualization modes, all reactive to music and movement:

| Mode | Description |
|---|---|
| Quand C'est | Gestural line visualization |
| Pulsating Circle | Audio-driven radial pulses |
| Raindrop | Columnar motion-reactive bands |
| Water Ripple | Fluid ripple simulation |
| Heat Wave | Thermal distortion effect |
| Flowing | Continuous motion streams |
| Gentle Wave | Soft undulating waves |

### Hand Effects

Real-time effects rendered at your tracked hands:

- **Ripple** — water ripple emanating from hand position; configurable base color, ripple color, radius, and intensity
- **Smoke** — trailing smoke plume; configurable color, opacity, radius, and trail length
- **Fluid Distortion** — fluid lens distortion; configurable color, radius, and swirl
- **Square Particle Trail** — particle stream trailing behind movement; configurable color, opacity, particle size, and trail length

All effects can be assigned to left hand, right hand, or both.

### Motion Tracking

- MediaPipe Pose detection for full-body tracking
- Hand tracking for effect positioning
- Humanoid avatar and skeleton overlay (toggleable)
- Dancer silhouette segmentation
- Dual camera support: seated operator view + dance space view
- Mirror mode

### Music Integration

- Spotify OAuth for track search and playback
- Play/pause, volume, and loop controls
- Automatic color palette extraction from album artwork (Vibrant.js)
- Audio-reactive visuals via microphone input (RMS, spectral centroid, energy)
- Mood-based color scheme generation

### Interface Modes

- **ChoreoXplore Mode** — full editor with all control panels visible
- **Performance Mode** — clean, distraction-free full-screen output for live use

A step-by-step setup wizard guides new users through the workflow with highlighted prompts.

---

## Quick Start

### Prerequisites

- Node.js v18+
- Chrome (recommended for best WebGL and MediaPipe performance)
- Spotify account (optional)
- 2 webcams (one for the operator, one pointed at the dance space)
- Voicemeeter (to route Spotify audio to the browser's microphone input)

### Installation

```bash
git clone <repository-url>
cd ChoreoXplore
npm install
```

### Environment Variables

Create `.env.local` in the project root:

```env
VITE_SPOTIFY_CLIENT_ID=your_client_id
VITE_SPOTIFY_CLIENT_SECRET=your_client_secret
VITE_SPOTIFY_REDIRECT_URI=http://127.0.0.1:5137/callback
```

### Run

```bash
npm run dev
```

Open `http://127.0.0.1:5137` in Chrome.

---

## Spotify Setup

1. Go to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) and create an app.
2. Add `http://127.0.0.1:5137/callback` to the app's **Redirect URIs**.
3. Copy the **Client ID** and **Client Secret** into `.env.local` as shown above.
4. Click **Connect to Spotify** in the app to authenticate.

Once connected, search for a track and use the playback controls at the bottom of the screen. Enable **Auto from Spotify** to sync the color palette to the currently playing track's album art.

---

## Audio Routing (Voicemeeter)

ChoreoXplore's audio-reactive visuals read from the browser's microphone input. To route Spotify's output there:

1. **Install Voicemeeter** from [vb-audio.com/Voicemeeter](https://vb-audio.com/Voicemeeter/).
2. Set your system default audio output to **Voicemeeter Input (VB-Audio VAIO)**.
3. In Voicemeeter, set Hardware Out (A1) to your physical speakers or headphones.
4. In Chrome settings, set the default microphone to **Voicemeeter Output (VB-Audio VAIO)**.
5. Grant microphone permission when ChoreoXplore prompts — the visuals will now react to whatever is playing through Spotify.

---

## Build

```bash
npm run build
```

Output goes to `dist/`. Preview the production build with:

```bash
npm run preview
```

---

## Tech Stack

| Layer | Library |
|---|---|
| UI | React 19, Tailwind CSS |
| 3D Rendering | Three.js, @react-three/fiber, @react-three/drei |
| Post-processing | postprocessing, @react-three/postprocessing |
| Pose/Hand Tracking | @mediapipe/tasks-vision |
| Audio Analysis | Meyda |
| State | Zustand |
| Music | Spotify Web API |
| Color Extraction | node-vibrant |
| Animation | GSAP |
| Build | Vite 7 |

---

## License

This project is for academic research purposes only and adheres to all copyright and licensing requirements for third-party libraries and APIs.

## Acknowledgments

- **MediaPipe** by Google — pose and hand tracking
- **Three.js** — WebGL 3D rendering
- **Spotify Web API** — music integration
- **Vibrant.js** — color extraction from album art
- **Meyda** — real-time audio feature extraction
