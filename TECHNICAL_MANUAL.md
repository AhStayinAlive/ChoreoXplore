# Technical Manual
# ChoreoXplore

**Team**
Baniqued, Lourenz Jhay G.
Cheng, Ken Ivan T.
Enriquez, Joseph Dean T.

**Adviser**
Ryan Austin Fernandez

**Co-Adviser**
Jordan Aiko P. Deja, PhD

De La Salle University — Department of Software Technology, College of Computer Studies
Bachelor of Science in Computer Science, Major in Software Technology
AY 2025–2026

---

# Overview

## Purpose and Objectives

ChoreoXplore is a projection-based, immersive web tool that generates procedurally driven somatic montages to support choreographers in real time. The system is designed to function as an active co-creative partner during the earliest and most creatively demanding phase of choreography-making: movement ideation. By combining music-reactive procedural visuals, markerless full-body motion tracking, and interactive hand-based effects, ChoreoXplore provides dancers with an environment that responds to both their music and their bodies simultaneously — without requiring wearable devices or specialized hardware beyond a standard webcam and projector.

The system emerged from needfinding workshops with eight practicing dancers, whose feedback revealed a consistent gap: choreographers frequently experience creative blocks in the preparation stage, yet no existing tool served as an immersive, non-intrusive generative environment during this phase. ChoreoXplore addresses this gap by rendering a live visual montage that reacts to the dancer's chosen music and body movement, encouraging spontaneous ideation through visual stimulation and embodied feedback.

## Core Challenges Addressed

1. **Creative block during ideation** — Choreographers frequently experience cognitive and creative fatigue during movement exploration; ChoreoXplore reduces cognitive load by offloading visual stimulus generation to the system.
2. **Lack of immersive, responsive environments** — Existing tools (YouTube, TikTok, mirrors) provide passive reference material; ChoreoXplore generates live, personalized visuals that respond to the dancer's unique music and motion in real time.
3. **Wearable and setup friction** — AR/VR systems require wearables that disrupt natural movement; ChoreoXplore uses a single overhead webcam with markerless pose estimation to eliminate physical friction.
4. **Disconnection between music and visuals** — Standard visualization software does not respond to both audio features and body motion simultaneously; ChoreoXplore bridges both channels.
5. **Predictability and artistic coherence of generative visuals** — Early AI-generated imagery proved unpredictable and artistically inconsistent; ChoreoXplore uses handcrafted Three.js assets constructed from fundamental elements (lines, shapes) on the recommendation of professional visual artist Irina Angles, providing reliable and aesthetically intentional outputs.

## Key Functionalities

1. **Music-reactive visual pipeline** — Extracts real-time audio features (RMS, spectral centroid, onset) and applies them to visual intensity, speed, hue, and geometry across 13 switchable visual modes.
2. **Automatic color theming from album art** — Uses Vibrant.js to extract dominant palette colors from Spotify album artwork and applies them to backgrounds and visual assets; integrates musical key and audio features (energy, valence, danceability) to derive a perceptually coherent color theme.
3. **Markerless full-body pose tracking** — MediaPipe Pose Landmark detects 33 body landmarks per frame using a standard webcam; drives a real-time pictogram skeleton and humanoid avatar overlay.
4. **Interactive hand effects** — Fluid, smoke, particle trail, and distortion effects render at the dancer's tracked hand positions, providing embodied visual feedback that follows movement in real time.
5. **Dual interaction modes** — ChoreoXplore Mode exposes full editing controls; Performance Mode clears the UI for unobstructed full-screen projection suitable for actual rehearsal.
6. **Guided setup wizard** — A seven-step onboarding flow walks first-time users through song selection, visual mode choice, motion capture activation, hand effect configuration, and camera selection.
7. **Adaptive performance throttling** — An auto-throttle system monitors frame rate and reduces visual complexity (instance counts, iteration depth) when FPS drops below 50, maintaining smooth interactive performance.

---

# Environment Setup

ChoreoXplore runs as a browser-based web application built on **React 19** with **Vite 7** as the build tool, using **JavaScript (ES Modules)**. The rendering layer is built on **Three.js** via **React Three Fiber**. There is no backend server — all computation runs client-side in the browser, with external Spotify API calls proxied through the Vite development server.

## Required Software

- **Node.js v18+** — JavaScript runtime; required for package installation and the Vite dev server
- **npm** — Package manager (bundled with Node.js)
- **Google Chrome** — Recommended browser; required for MediaPipe GPU delegate support and best WebGL performance
- **Voicemeeter** (VB-Audio) — Windows audio routing utility; routes Spotify system audio to the browser's microphone input for audio-reactive visuals
- **Git** — Version control

## npm Packages (Runtime Dependencies)

- **react ^19.1.1** — UI framework
- **react-dom ^19.1.1** — DOM rendering
- **three ^0.180.0** — WebGL 3D rendering engine
- **@react-three/fiber ^9.3.0** — React renderer for Three.js
- **@react-three/drei ^10.7.6** — Three.js utility components and helpers
- **@react-three/postprocessing ^9+** — Post-processing effects pipeline
- **postprocessing ^6.37.8** — Core post-processing library
- **@mediapipe/tasks-vision ^0.10.22** — Pose and hand landmark detection
- **meyda ^5.6.3** — Real-time audio feature extraction
- **zustand ^5.0.8** — Lightweight global state management
- **rxjs ^7.8.2** — Reactive streams (BehaviorSubject for audio/pose data)
- **spotify-web-api-js ^1.5.2** — Spotify Web API client
- **node-vibrant ^4.0.3** — Dominant color extraction from images
- **tinycolor2 ^1.6.0** — Color manipulation and conversion
- **gsap ^3.13.0** — Animation library
- **@funtech-inc/use-shader-fx ^2.0.5** — Custom GLSL shader hooks
- **@whatisjery/react-fluid-distortion ^1.5.1** — GPU fluid distortion effect
- **immer ^10.1.3** — Immutable state update helpers
- **jszip ^3.10.1** — ZIP file parsing for asset pack loading
- **openai ^4.104.0** — OpenAI SDK (available for future AI features)
- **@huggingface/inference ^4.11.0** — HuggingFace inference client
- **zod ^4.1.9** — Runtime schema validation

## npm Packages (Dev Dependencies)

- **vite ^7.1.2** — Build tool and dev server
- **@vitejs/plugin-react ^5.0.0** — React Fast Refresh plugin for Vite
- **tailwindcss ^4.1.12** — Utility-first CSS framework
- **@tailwindcss/vite ^4.1.12** — Tailwind Vite integration
- **eslint ^9.33.0** + plugins — Code linting

## Hardware Requirements

- **Webcam × 2** — One pointed at the dancer (dance-space camera), one for the seated operator (optional second camera for operator view)
- **Projector** — Ceiling-mounted or front-facing; projects the Performance Mode output onto a plain wall surface
- **Laptop or desktop PC** — Runs the web tool and Vite dev server; GPU recommended for MediaPipe delegate acceleration
- **Speakers or audio output** — Plays Spotify music through Voicemeeter for audio routing

## Environment Variables

Create a `.env.local` file in the project root before running:

```env
VITE_SPOTIFY_CLIENT_ID=your_client_id_here
VITE_SPOTIFY_CLIENT_SECRET=your_client_secret_here
VITE_SPOTIFY_REDIRECT_URI=http://127.0.0.1:5137/callback
```

Obtain credentials from the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard). Add `http://127.0.0.1:5137/callback` as a Redirect URI in your Spotify app settings.

## Running the Application

```bash
# Install dependencies
npm install

# Start development server
npm run dev
# → Open http://127.0.0.1:5137 in Chrome

# Production build
npm run build

# Preview production build
npm run preview
```

## File Management

Source files live entirely under `src/`. There is no server-side code. MediaPipe model files are loaded at runtime directly from the `@mediapipe/tasks-vision` npm package via CDN URLs. Asset packs (blueprint ZIP files) can be loaded via `src/core/assets.js` from local file objects or remote URLs. The `public/` directory contains only the Vite placeholder SVG; no static assets are required for core functionality.

---

# Module 1: APPLICATION STATE (`store.js`)

`store.js` is the primary Zustand store that holds all global application state — it is the single source of truth for mode switching, pose data, audio parameters, color palettes, scene configuration, Spotify song metadata, setup wizard progress, and reactivity settings. Think of it as the spine of ChoreoXplore: virtually every other module reads from or writes to this store to coordinate behavior across the system. It is located at `src/core/store.js` and exported as a default `useStore` hook.

## Store Fields

**App Mode & Navigation**
- `mode`: `string` — Current app mode: `"welcome"` | `"choreoxplore"` | `"performance"`
- `setupStep`: `number` — Current step in the seven-step setup wizard (1–7)
- `songSearched`: `boolean` — Marks whether the user has performed a song search (triggers wizard step advance)
- `selectedCameraIndex`: `number` — Index of the currently selected camera device

**Visual Configuration**
- `palette`: `string[]` — Array of three hex color strings `[background, accent, highlight]`
- `userColors`: `{bgColor: string, assetColor: string}` — Manually selected colors from the color pickers
- `constraints`: `{allowedAngles, strokePx, contrastMinRatio, spawnMaxPerSec}` — Layout constraint parameters used by the composition layer
- `currentPreset`: `PresetConfig | null` — The currently applied visual preset; applying a preset also updates `palette` if the preset defines colors
- `ambientAnimationParams`: `object` — Parameters for the ambient background animation: `{isActive, effectType, speed, amplitude, wavelength, intensity, audioReactive, audioSensitivity, audioBassInfluence, audioMidInfluence, audioHighInfluence}`
- `choreoxploreMode`: `object` — Combined music and motion state for the ChoreoXplore rendering layer: `{music: {rms, energy, centroid, bpmish}, motion, params: {speed, intensity, hue, musicReactivity, motionReactivity, mode}}`

**Scene & Routing**
- `sceneNodes`: `SceneNode[]` — Array of 3D scene elements managed by the composition layer
- `routes`: `RouteConfig[]` — Audio/pose to visual property routing configurations
- `cues`: `CueConfig[]` — Animation cue stack for timed visual events

**Pose & Motion**
- `poseData`: `PoseData | null` — Current MediaPipe pose landmark result (33 landmarks with `x`, `y`, `z`, `visibility`)
- `distanceScale`: `number` — Computed scale factor based on the dancer's distance from the camera
- `motionCaptureActive`: `boolean` — Whether the motion capture pipeline is currently running
- `skeletonVisible`: `boolean` — Whether the skeleton/avatar overlay is rendered
- `inverseHands`: `boolean` — When `true`, left and right hand indices are swapped (mirrors the view)

**Spotify & Song**
- `songData`: `object | null` — Metadata for the currently selected track (title, artist, album, artwork URL)

**Performance**
- `fps`: `number` — Live frames-per-second counter fed by the renderer
- `reactivity`: `{audioGain: number, poseGain: number, enabled: boolean}` — Global gain multipliers for audio and pose reactivity

## Helper Functions

Two pure utility functions are co-located in `store.js` and exported alongside the store:

- `hexToHue(hex)` → `number` — Converts a hex color string to an HSL hue value (0–360). Used by the theme system and ChoreoXplore shader to derive hue parameters.
- `hexToRGB(hex)` → `{r, g, b}` — Converts a hex color string to normalized RGB components (0–1 range). Used by material color assignments in the rendering layer.

## Lifecycle & Control Flow

The store is initialized once when `store.js` is first imported. Zustand creates the store with `create()`, and all fields are initialized to their default values at that point. No async initialization is required. Components subscribe to slices of the store via `useStore(selector)` and re-render only when their selected slice changes. Side effects (e.g., theme application, Spotify polling) are wired externally in `main.jsx` after the React root mounts.

## Public Methods (Actions)

- `setMode(mode)` — Switches the app between `"welcome"`, `"choreoxplore"`, and `"performance"` modes
- `setFPS(fps)` — Updates the live FPS counter; called from the renderer each frame
- `setPoseData(poseData)` — Stores the latest MediaPipe result; called from the motion capture loop
- `setMotionCaptureActive(active)` — Toggles the motion capture pipeline on or off
- `setSkeletonVisible(visible)` — Shows or hides the skeleton/avatar overlay
- `setInverseHands(inverse)` — Enables or disables hand mirroring
- `setDistanceScale(scale)` — Updates the distance-derived scale factor for skeleton sizing
- `setUserColors(colors)` — Updates `{bgColor, assetColor}` from the color pickers
- `setPreset(p)` — Applies a visual preset; if the preset includes `palette`, also calls the palette update
- `setRoutes(routes)` — Replaces the audio/pose routing configuration
- `setSceneNodes(nodes)` — Replaces the scene node array
- `setReactivity(fn)` — Immer-style updater for the `reactivity` object
- `setSongData(songData)` — Stores the selected song's metadata
- `setChoreoXploreMode(fn)` — Immer-style updater for `choreoxploreMode`; used by the bridge adapter to push audio/motion data into the store for the visualization layer
- `addCue(cue)` — Appends a cue to the cue stack
- `setAmbientAnimationParams(params)` — Updates ambient background animation parameters
- `advanceToStep(targetStep)` — Advances the wizard to `targetStep` only if `targetStep > setupStep` (never moves backward)
- `setSetupStep(step)` — Forces the wizard to a specific step (used for resets)
- `setSongSearched(searched)` — Marks whether a song search has been performed
- `setSelectedCameraIndex(index)` — Records the currently active camera device index
- `resetWizard()` — Resets `setupStep` to 1 and `songSearched` to `false`

## Usage Notes & Gotchas

**Two-store architecture** — ChoreoXplore uses two separate Zustand stores: `useStore` (this module) and `useVisStore` (Module 2). `useStore` holds system-level state; `useVisStore` holds visualization-specific parameters. The bridge adapter in `src/adapters/bridgeCoreAudioToIrina.js` synchronizes audio and motion data between them.

**Immer updaters** — `setReactivity` and `setChoreoXploreMode` accept a function `(draft) => void` following Immer's draft mutation pattern. Always use this pattern rather than passing a plain object when partially updating nested fields.

**`advanceToStep` is one-directional** — The wizard step can only increase via `advanceToStep`. Use `setSetupStep` directly only for explicit resets.

---

# Module 2: VISUALIZATION STATE (`useVisStore.js`)

`useVisStore.js` is a secondary Zustand store dedicated exclusively to the Irina visualization subsystem — the real-time visual rendering layer designed in collaboration with visual artist Irina Angles. It holds all parameters that control which visual mode is active, how audio and motion data flow into that mode, and how hand effects are configured. The store is located at `src/state/useVisStore.js` and exported as the `useVisStore` hook.

## Store Fields

**Audio & Motion**
- `music`: `{rms: number, energy: number, centroid: number, bpmish: number}` — Latest computed audio features; updated each frame by the bridge adapter
- `motion`: `MotionFeatures | null` — Latest computed motion features from pose landmarks; updated each frame

**Global Toggle**
- `isActive`: `boolean` — Master switch for the visualization system; when `false`, no visual modes render

**Visual Parameters (`params`)**
- `params.speed`: `number` — Base animation speed multiplier (default `1.2`)
- `params.intensity`: `number` — Visual intensity multiplier (default `0.8`)
- `params.hue`: `number` — Base hue angle in degrees (default `210`)
- `params.musicReact`: `number` — How strongly audio features modulate visuals (default `0.9`)
- `params.motionReact`: `number` — How strongly pose motion modulates visuals (default `0.9`)
- `params.mode`: `string` — Active visual mode key (e.g., `"lines"`, `"water_ripple"`, `"silk_veil"`, `"empty"`)

**Hand Effect Configuration (`params.handEffect`)**
- `type`: `string` — Effect type: `'none'` | `'ripple'` | `'smoke'` | `'fluidDistortion'` | `'particleTrail'`
- `handSelection`: `string` — Which hand(s) receive the effect: `'none'` | `'left'` | `'right'` | `'both'`
- `motionReactive`: `boolean` — Whether effect intensity responds to hand movement velocity
- `showQuickView`: `boolean` — Whether the quick-view preview panel is displayed
- `previewPosition`: `{x, y} | null` — Screen position for the preview panel
- `ripple`: `{baseColor, rippleColor, radius, intensity}` — Ripple effect parameters
- `smoke`: `{color, intensity, radius, velocitySensitivity, trailLength}` — Smoke effect parameters
- `fluidDistortion`: `{fluidColor, intensity, force, distortion, radius, curl, swirl, velocityDissipation, rainbow}` — Fluid distortion parameters
- `particleTrail`: `{color, intensity, particleSize, trailLength, fadeSpeed}` — Particle trail parameters

## Lifecycle & Control Flow

Like `useStore`, this store is initialized synchronously when the module is first imported. The `setParams` action uses a deep-merge strategy: top-level `params` fields are shallow-merged, but `handEffect` is merged one level deeper, preserving unmodified sub-fields (e.g., changing `type` does not reset `ripple` colors). This lets UI panels update individual effect parameters independently.

## Public Methods (Actions)

- `setMusic(music)` — Replaces the `music` object; called every frame by the bridge adapter
- `setMotion(motion)` — Replaces the `motion` object; called every frame by the bridge adapter
- `setIsActive(isActive)` — Enables or disables the entire visualization system
- `setParams(p)` — Deep-merges `p` into `params`, with special handling for `handEffect` sub-fields

## Usage Notes & Gotchas

**`setParams` deep-merges `handEffect`** — When updating hand effect sub-parameters (e.g., `ripple`), always nest them inside a `handEffect` wrapper: `setParams({ handEffect: { ripple: { radius: 0.2 } } })`. Passing `handEffect` at the top level without nesting will overwrite other `handEffect` fields due to the merge strategy.

**Hue is in degrees (0–360)** — Visual mode shaders and `hexToHue()` in `store.js` both work in this range. When wiring theme colors to `hue`, always convert from hex before storing.

**`motionReact` vs `musicReact`** — These are user-configurable gain values shown as sliders in the control panel, not the same as the engine-level `reactivity.audioGain` and `reactivity.poseGain` in `useStore`. Both layers of gain apply independently.

---

# Module 3: AUDIO ANALYSIS ENGINE (`audio.js`, `audioFeatures.js`)

The audio analysis engine is a two-layer system: `src/core/audio.js` handles low-level microphone capture and raw spectral analysis using the Web Audio API, while `src/engine/audioFeatures.js` provides a higher-level feature extraction pipeline using the Meyda audio analysis library. Both layers publish their output as RxJS `BehaviorSubject` streams so that any subscriber anywhere in the system can receive audio data reactively without direct coupling. Think of this module as the ears of ChoreoXplore — it continuously listens to the audio routed through the system and translates raw sound into numerical features that drive visual intensity and color.

## Class Members / Exports

**`src/core/audio.js`**
- `audio$`: `BehaviorSubject<{rms, bands, centroid, onset}>` — Live audio feature stream; initialized with a zero-value object and updated every 16 ms
- `startAudio()`: `Promise<void>` — Entry point; captures microphone, builds the analysis graph, and starts the tick loop

**`src/engine/audioFeatures.js`**
- `audio$`: `BehaviorSubject<{rms, energy, centroid, bpmish}>` — Smoothed audio feature stream for the Irina visualization layer
- `attachAudio(el)`: `Promise<() => void>` — Accepts an `HTMLMediaElement` or `MediaStream`, attaches Meyda analysis, and returns a cleanup teardown function

## Lifecycle & Control Flow

**`audio.js` initialization sequence:**
1. `startAudio()` is called from `Canvas3D.jsx` on component mount via a `useEffect`
2. `navigator.mediaDevices.getUserMedia` is called with `{audio: {echoCancellation: false, noiseSuppression: false, autoGainControl: false}}` to get a clean audio signal from the Voicemeeter virtual cable
3. An `AudioContext` is created and an `AnalyserNode` is configured with `fftSize = 2048` and `smoothingTimeConstant = 0.8`
4. `setInterval(tick, 16)` starts the analysis loop at approximately 60 Hz

**`audioFeatures.js` initialization sequence:**
1. `attachAudio(el)` creates a `MediaElementAudioSourceNode` (or `MediaStreamSourceNode`) from the input
2. A Meyda analyzer is created with buffer size 1024, extracting `rms` and `spectralCentroid` on each buffer
3. The analyzer callback applies exponential smoothing and updates `audio$`

## Key Internal Logic

**`tick()` in `audio.js`** — Called every 16 ms:
- Calls `analyser.getByteFrequencyData(data)` to fill a `Uint8Array` with 2048 frequency bins (values 0–255)
- **RMS**: Sum of all bin values / 255 / bin count — normalized global loudness
- **Band splitting**:
  - `band_low` = average of bins 2–40 (bass frequencies)
  - `band_mid` = average of bins 40–200 (mid frequencies)
  - `band_hi` = average of bins 200+ (high frequencies)
- **Spectral centroid**: Weighted average `Σ(i × data[i]) / Σ(data[i])` — measures brightness
- **Onset detection**: `flux > 0.12` AND at least 120 ms since last onset — produces a transient `onset: true` flag for beat-like triggers
- Publishes `{rms, bands: {L, M, H}, centroid, onset}` via `audio$.next()`

**Exponential smoothing in `audioFeatures.js`**:
- `energy = prev.energy * 0.85 + rms * 0.15` — slow-attack energy envelope
- `bpmish = prev.bpmish * 0.98 + (energy > prev.energy ? 1 : 0) * 0.02` — approximate beat-rate proxy

## Usage Notes & Gotchas

**Voicemeeter is required for audio reactivity** — `startAudio()` opens the browser's default microphone. For audio to be reactive to Spotify music, the browser's microphone must be set to Voicemeeter Output in Chrome's site permissions. Without this, the microphone captures room audio only.

**Two separate `audio$` subjects** — `core/audio.js` and `engine/audioFeatures.js` both export a subject named `audio$`. They are independent. The bridge adapter (`src/adapters/bridgeCoreAudioToIrina.js`) subscribes to `audioFeatures.js`'s `audio$`. The routing engine (`src/core/routing.js`) subscribes to `core/audio.js`'s `audio$` for scene node routing. Do not conflate them.

**`attachAudio` returns a cleanup function** — Always call the returned teardown function when unmounting to stop the Meyda analyzer and prevent memory leaks.

---

# Module 4: POSE DETECTION SYSTEM (`pose.js`, `usePoseDetection.jsx`)

The pose detection system is responsible for all full-body landmark estimation. `src/core/pose.js` encapsulates the MediaPipe `PoseLandmarker` instance, manages the camera stream, and runs the frame detection loop. It publishes parsed pose features as an RxJS stream. `src/hooks/usePoseDetection.jsx` is a lightweight React hook layer that provides a global pub-sub interface for pose data, allowing multiple components to subscribe to pose updates without redundant MediaPipe instances. Together these two files form the sensory foundation of ChoreoXplore's body-awareness system.

## Class Members / Exports

**`src/core/pose.js`**
- `pose$`: `BehaviorSubject<{conf, shoulderAxisDeg, bboxArea, wrists} | null>` — Parsed pose feature stream; `null` when no pose is detected
- `startPose()`: `Promise<void>` — Entry point; initializes MediaPipe, opens the camera, and starts the detection loop

**`src/hooks/usePoseDetection.jsx`**
- `usePoseDetection()`: `hook` — Returns `{poseData, updatePoseData, subscribeToPoseData, unsubscribeFromPoseData}`
- Module-level `globalPoseData`: `object | null` — Shared singleton holding the latest pose result
- Module-level `poseDataListeners`: `Set<Function>` — Set of callbacks notified on every pose update

## Lifecycle & Control Flow

1. `startPose()` is called from `MotionInputPanel.jsx` when the user activates motion capture
2. `PoseLandmarker.createFromOptions()` loads the heavy pose model from the MediaPipe CDN with GPU delegate
3. `navigator.mediaDevices.getUserMedia` attempts `{video: {width: 1920, height: 1080}}` first, falling back to `{width: 1280, height: 720}` ideal
4. A hidden `<video>` element receives the camera stream; detection runs in a `requestAnimationFrame` loop
5. Each frame calls `poseLandmarker.detectForVideo(videoEl, timestamp)` and passes the result to `parse(res)`
6. The parsed result is published via `pose$.next()` and also dispatched to all `usePoseDetection` subscribers
7. The main store's `setPoseData()` is called from `MotionInputPanel` on each frame to make raw landmarks available globally

## `parse(res)` — Feature Extraction

`parse()` converts the raw MediaPipe result into a compact feature object:

- **`conf`**: `number` — Minimum visibility across all detected landmarks; proxy for tracking confidence
- **`shoulderAxisDeg`**: `number` — `Math.atan2(shoulderR.y - shoulderL.y, shoulderR.x - shoulderL.x) * 180/π` — rotation of the shoulder line in degrees; measures lateral tilt
- **`bboxArea`**: `number` — `(maxX - minX) * (maxY - minY)` across all landmarks — proxy for how much of the frame the dancer occupies; used for distance estimation
- **`wrists`**: `{left, right} | null` — Landmark 15 (right wrist) and 16 (left wrist); returns `null` for each wrist if `visibility < 0.3`

## Usage Notes & Gotchas

**`usePoseDetection` is a global singleton** — `globalPoseData` and `poseDataListeners` are module-level variables, not React state. This means all components share a single global pose state. Never import and call `updatePoseData` from more than one place — the canonical writer is `MotionInputPanel`.

**MediaPipe model loading is slow on first run** — The heavy pose model is several megabytes. On first initialization, there is a noticeable delay (2–5 seconds depending on network). Subsequent uses within the same session are instantaneous because the model is cached.

**GPU delegate requires a secure context** — MediaPipe's GPU delegate only activates on `https://` or `http://127.0.0.1`. The Vite dev server is already configured for `127.0.0.1:5137`; running on other hostnames or plain `localhost` may silently fall back to CPU.

**Camera indices vs. device IDs** — `pose.js` uses the raw camera stream. `MotionInputPanel` manages camera enumeration and device switching, storing the selected index in `useStore`. When the user switches cameras, `MotionInputPanel` reinitializes MediaPipe with the new device ID.

---

# Module 5: MOTION MAPPING SYSTEM (`motionMapping.js`, `poseFeatures.js`)

The motion mapping system sits between raw pose landmarks and the visual/audio parameters that drive ChoreoXplore's rendering. `src/core/motionMapping.js` maps a full pose result into a structured motion data object describing how to transform the background, camera, and visual effects. `src/engine/poseFeatures.js` extracts higher-level kinematic features (joint angles, arm span, movement sharpness) from landmarks. Together they form the interpretive layer that translates "what the dancer's body is doing" into "how the visuals should respond."

## Exported Subjects & Functions

**`src/core/motionMapping.js`**
- `motionData$`: `BehaviorSubject<MotionData>` — Stream of computed motion transforms; consumed by `Canvas3D` for camera animation
- `mapPoseToMotion(poseData, ambientAnimationActive)`: `function` → `MotionData` — Main mapping function

**`src/engine/poseFeatures.js`**
- `computeMotionFeatures(pose)`: `function` → `{elbowL, elbowR, kneeL, kneeR, armSpan, speed, sharpness}` — Computes kinematic motion features for the Irina visualization layer

## Lifecycle & Control Flow

`mapPoseToMotion` is called inside `Canvas3D`'s frame loop via a subscription to `pose$`. When no pose is detected (null), the function returns a fallback object with all transforms set to identity/zero. When a valid pose is detected, `calculateMotionMetrics` runs first, then the three mapping sub-functions derive the transform components.

## Key Internal Logic

**`calculateMotionMetrics(landmarks, worldLandmarks, prevPoseData, currentTimestamp, prevTimestamp)`**

Derives the following fields from MediaPipe landmark arrays:

- **Center of mass**: Average x/y of all landmarks with `visibility > 0.5`
- **Movement intensity**: `(shoulder_width + wrist_dist * 0.5)`, clamped 0–1
- **Rotation Z**: Shoulder axis angle via `atan2` (same as `pose.js` `shoulderAxisDeg`)
- **Scale**: `sqrt(bbox_width * bbox_height) * 2`, clamped 0.5–2.0
- **Velocity**: `(currentCenter - prevCenter) / timeDelta` in screen-space units

**`mapToBackgroundTransform(motion)`**

Maps motion metrics to 2D background transformation:

- Dead zone: 0.05 (ignores sub-threshold micro-movements)
- Exponential scaling: `value^0.7` for non-linear response
- Position: `exp(movement) * 150 + velocity * 0.3`
- Rotation: `rotation * 0.15`
- Scale: clamped 0.3–2.5
- Opacity: 0.3–1.2 range

**`mapToCameraTransform(motion)`**

Maps motion metrics to camera rig movement:

- Dead zone: 0.03
- Position offset: `movement * 80`
- Z-depth: 50–150 range (increases with movement intensity)
- Camera rotation: `rotation * 0.08`

**`mapToVisualEffects(motion)`**

Maps intensity to CSS-style visual modifiers:

- Blur: 0–3 px range
- Brightness: 0.5–1.4
- Contrast: 0.8–1.3
- Saturation: 0.7–1.5

**`computeMotionFeatures` in `poseFeatures.js`**

- **Joint angles** via 3-point dot product for elbows and knees
- **Arm span**: `(wrist_span + shoulder_span) / (2 * body_height)` — normalized to body scale
- **Sharpness**: Average of `(1 - normalized_angle_distance)` for all tracked joints — high values indicate extended, sharp limb positions

## Usage Notes & Gotchas

**Dead zones prevent noise-driven jitter** — The 0.05 and 0.03 dead zones in background and camera mapping mean very small movements have no effect. This is intentional to prevent the visuals from jittering during static poses.

**`ambientAnimationActive` flag** — When ambient animation is enabled and no pose is detected, `mapPoseToMotion` returns a fallback rather than zero, keeping the ambient animation alive. If you disable ambient animation, ensure the fallback values are appropriate for your mode.

**Velocity requires two consecutive frames** — The velocity calculation depends on `prevPoseData` from the previous frame. On the first detected frame (when `prevPoseData` is null), velocity is set to zero.

---

# Module 6: ROUTING & SIGNALS (`routing.js`, `signals.js`)

The routing and signals modules form the data plumbing layer that connects audio and pose measurements to individual scene node properties. `src/core/routing.js` implements a configurable mapping engine: it reads a `routes` array from the store (each route specifies a source signal and a target node/property), evaluates each source, applies a linear transform, and writes the result to the matching scene node. `src/core/signals.js` provides the low-level signal processing primitives used throughout the system. Together they implement a simple dataflow graph without requiring a dedicated DSP framework.

## Exported Functions

**`src/core/routing.js`**
- `applyRoutes({audio, pose})`: `function` → `void` — Reads all configured routes from `useStore.routes`, evaluates each source, and writes to matching scene nodes in the store

**`src/core/signals.js`**
- `ema(prev, curr, alpha = 0.25)`: `function` → `number` — Exponential moving average: `prev * (1 - alpha) + curr * alpha`
- `clamp(v, min, max)`: `function` → `number` — Clamps `v` to `[min, max]`
- `map01(v, outMin, outMax)`: `function` → `number` — Remaps a 0–1 value to an arbitrary output range
- `hysteresis(flag, lastAt, minGapMs)`: `function` → `boolean` — Returns `true` only if `flag` is truthy AND at least `minGapMs` ms have elapsed since `lastAt`

## Lifecycle & Control Flow

`applyRoutes` is called each frame from the renderer after audio and pose data are available. It:
1. Reads `routes`, `sceneNodes`, and `reactivity` from `useStore`
2. For each route: calls `pickSourceValue(route.src, {audio, pose})` to get a raw 0–1 value
3. Applies `applyMapping(value, route.mapping)` to compute the final parameter value
4. Finds the matching `sceneNode` by ID and writes the value to the specified property path

## `pickSourceValue` — Supported Sources

| Source Key | Data Origin | Notes |
|---|---|---|
| `rms` | `audio.rms` | Overall loudness |
| `onset` | `audio.onset` | Beat trigger flag (0 or 1) |
| `spectral_centroid` | `audio.centroid` | Spectral brightness |
| `band_low` | `audio.bands.L` | Bass energy |
| `band_mid` | `audio.bands.M` | Mid energy |
| `band_hi` | `audio.bands.H` | High energy |
| `shoulder_axis_deg` | `pose.shoulderAxisDeg / 30` | Shoulder rotation, normalized |
| `bbox_area_norm` | `pose.bboxArea` | Dancer frame coverage |
| `wrist_y` | `1 - pose.wrists.left.y` | Left wrist height, inverted |

## `applyMapping` — Linear Transform

Each route's `mapping` object defines: `{scale, offset, min?, max?}`.

Formula: `x = value * scale + offset`; optionally clamped to `[min, max]` if those fields are defined.

## Usage Notes & Gotchas

**Routes are currently supplementary** — The primary visual modulation in ChoreoXplore runs through the bridge adapter (Module 12) and `useVisStore`, not the routing engine. `applyRoutes` is designed for the composition-layer scene nodes (lines, surfaces). It operates correctly but the scene node system is not the primary rendering path in the current build.

**`hysteresis` prevents onset spam** — Use `hysteresis(onset, lastOnsetTime, 120)` whenever reacting to onset signals to avoid triggering visual events on every detected beat peak.

---

# Module 7: VISUAL COMPOSITION ENGINE (`mixer.js`, `composition/`)

The visual composition engine handles procedural placement and management of discrete visual assets in the scene. `src/core/mixer.js` implements an onset-driven spawner that creates new visual elements when audio energy crosses a threshold. The `src/composition/` folder contains four support modules: `scene.js` (initial scene construction), `grammar.js` (spatial layout algorithms), `recipes.js` (placement shortcuts), and `constraints.js` (parameter validation). This layer was designed for a more generative, asset-based visualization paradigm and currently runs in a supplementary capacity alongside the shader-based Irina visual modes.

## Exported Functions

**`src/core/mixer.js`**
- `createMixer(api)`: `function` → `{trySpawn, update}` — Factory that returns a mixer instance bound to the Three.js scene API

**`src/composition/scene.js`**
- `buildScene(api)`: `function` → `SceneNode[]` — Constructs two reactive line nodes (`lnA` at `[-200, 0]`, `lnB` at `[200, 0]`) as the default scene

**`src/composition/grammar.js`**
- `grid(cols, rows, gap, origin)`: `function` → `[x, y, z][]` — Generates a regular grid of positions
- `radial(spokes, radius, center)`: `function` → `[x, y, z][]` — Generates spoke-arranged positions
- `goldenOrbit(n, r, center)`: `function` → `[x, y, z][]` — Generates positions at the golden angle (`π × (3 − √5) ≈ 2.39996 rad`) spacing on a circle

**`src/composition/recipes.js`**
- `placeGoldenOrbit(group, i, r, center)` — Positions an object at the i-th golden angle step
- `placeGrid(group, i, cols, gap, origin)` — Positions an object in a grid layout
- `placeRadial(group, i, spokes, radius, center)` — Positions an object on a radial spoke

**`src/composition/constraints.js`**
- `snapAngle(deg)`: `function` → `number` — Snaps an angle to the nearest value in `constraints.allowedAngles`
- `clampStroke(px)`: `function` → `number` — Clamps a stroke width to `constraints.strokePx` range

## Key Internal Logic — `trySpawn(signal)`

The mixer's spawn decision process:
1. Checks for an onset flag or energy gate: `audio.rms > 0.045` with a 280 ms minimum gap (via `hysteresis`)
2. **`pickByBand(bands)`** — Selects a shape archetype based on spectral energy:
   - High energy (`band_hi > 0.4`): cube, sphere, pyramid
   - Mid energy (`band_mid > 0.3`): triangle, circle, line
   - Low energy: diagonal line, square, angle bracket
3. Creates a mesh from the selected blueprint with dynamic properties:
   - Length: `base * (0.7 + rms * 0.8)`, clamped 24–1920 px
   - Stroke width: `2 + band_low * 6`
   - Color: random selection from the current palette

## Usage Notes & Gotchas

**Mixer is currently disabled** — `Canvas3D.jsx` has the mixer call commented out (`// mixer.trySpawn(...)`). The composition layer is architecturally intact but not active in the current build. The Irina shader modes (`ChoreoXploreSystem`) are the primary rendering path.

**`GOLDEN_ANGLE` constant** — `grammar.js` defines `GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))`. This produces the Fibonacci spiral spacing that maximizes visual distribution.

---

# Module 8: CANVAS & SCENE RENDERER (`Canvas3D.jsx`)

`Canvas3D.jsx` is the root rendering component of ChoreoXplore. It mounts the React Three Fiber `<Canvas>` element, initializes the audio and pose systems on startup, wires camera animation to live motion data, and orchestrates the layered rendering of all visual systems: the ambient background, the active visualization mode, and the hand effects. Located at `src/render/Canvas3D.jsx`, it is the single component that assembles everything into a live, reactive scene.

## Component Structure

`Canvas3D` exports one component and one internal child:

- **`Canvas3D({ backgroundImage, ambientAnimationParams })`** — Outer shell; renders a React Three Fiber `<Canvas>` alongside a secondary `<canvas>` for the skeleton overlay
- **`SceneRoot`** — Inner component rendered inside the R3F canvas context; holds all scene logic, subscriptions, and child renderers

## Props

- `backgroundImage`: `string | null` — URL of the current background image; passed to the ambient animation layer
- `ambientAnimationParams`: `object` — Ambient animation configuration from `useStore`; controls background animation behavior

## Lifecycle & Control Flow

On mount, `SceneRoot` runs two `useEffect` calls:
1. Calls `startAudio()` from `src/core/audio.js` — initializes the Web Audio microphone pipeline
2. Calls `startPose()` from `src/core/pose.js` — initializes MediaPipe and the camera frame loop

A third `useEffect` subscribes to `motionData$` (from `motionMapping.js`) and applies the camera transform to a `cameraRef` each frame using GSAP-style smooth interpolation toward target position, rotation, and zoom values.

The `useFrame` hook (R3F's per-frame callback) calls `applyRoutes({audio, pose})` each frame to propagate audio and pose data into scene nodes, and updates the store's FPS counter via `setFPS`.

## Canvas Configuration

```jsx
<Canvas
  orthographic
  dpr={[1, 2]}
  camera={{ zoom: 1, near: 0.1, far: 5000 }}
  style={{ position: 'absolute', inset: 0 }}
>
```

- **Orthographic projection** — All visual modes are designed for 2D/flat screen rendering; orthographic removes perspective distortion
- **DPR `[1, 2]`** — Adapts pixel ratio for retina displays without exceeding 2× (performance guard)
- **Overflow hidden** — Set via container style to prevent hand effects from extending outside the canvas bounds and blocking pointer events

## Rendered Children (in order)

1. **`<AmbientBackgroundAnimation>`** — Renders the background animation layer (lowest z-order)
2. **`<Motion3DController>`** — Applies motion-derived transforms to a camera rig group
3. **`<ChoreoXploreSystem>`** — Renders the active visual mode
4. **`<HandEffectRouter>`** — Renders the active hand effect(s)

## Skeleton Overlay

The skeleton is rendered on a **separate HTML `<canvas>` element** positioned absolutely over the main Three.js canvas, outside the R3F render tree. This is necessary because `SimpleSkeleton` and `HumanoidAvatar` use 2D Canvas API drawing commands that do not integrate with Three.js's WebGL context.

## Usage Notes & Gotchas

**Audio and pose start on mount** — `startAudio()` and `startPose()` trigger browser permission prompts. These run automatically when `Canvas3D` mounts. If the user denies microphone or camera permission, audio reactivity and motion tracking will be silently unavailable.

**Camera animation is lerped, not instant** — The camera position is interpolated toward the target each frame. This means rapid motion changes appear smooth but with a lag. The interpolation factor is tuned for dance-pace movement.

**Mixer is disabled** — The `createMixer(api)` call and `trySpawn` invocation are currently commented out in `useFrame`. The composition layer can be re-enabled by uncommenting these lines.

---

# Module 9: VISUALIZATION MODES (`ChoreoXploreSystem.jsx` and mode components)

The visualization modes are the primary output of ChoreoXplore — the procedurally generated visual content that fills the projection wall. `src/components/ChoreoXploreSystem.jsx` acts as a router: it reads the active mode key from `useVisStore` and renders the corresponding mode component. Each mode component is a self-contained React Three Fiber scene that reads audio and motion features from `useVisStore` and animates accordingly. There are 13 named modes plus an empty state, spanning a range of aesthetic styles from geometric line fields to organic fluid simulations.

## `ChoreoXploreSystem.jsx` — Mode Router

```jsx
switch (params.mode) {
  case 'lines':            return <Lines1D_Irina />
  case 'quand_cest':       return <QuandCestMode />
  case 'pulsating_circle': return <PulsatingCircleMode />
  case 'vertical_lines':   return <VerticalLinesMode />
  case 'water_ripple':     return <WaterRippleMode />
  case 'heat_wave':        return <HeatWaveMode />
  case 'flowing':          return <FlowingMode />
  case 'gentle_wave':      return <GentleWaveMode />
  case 'silk_veil':        return <SilkVeilMode />
  case 'lotus_bloom':      return <LotusBloomMode />
  case 'stained_glass_rose': return <StainedGlassRoseMode />
  case 'ink_water':        return <InkWaterMode />
  case 'opaline_wave':     return <OpalineWaveMode />
  case 'empty':            return <EmptyMode />
  default:                 return <ChoreoXplore />
}
```

## Mode Descriptions

**`ChoreoXplore` (default)** — Base shader visualization built as a grid of angle fields. Multiple overlapping sine/cosine field layers produce sweeping line patterns. Fragment shader uniforms: `uTime`, `uHue`, `uEnergy`, `uMotion`, `uIntensity`. Music drives line thickness and field speed; motion drives pattern offset.

**`Lines1D_Irina`** — Extends the angle field concept with 1D line elements, modeled after Irina Angles' visual language of fundamental line construction.

**`QuandCestMode`** — Named after the first visual asset built with Irina Angles. Produces tendril-like emanations from screen edges. Known for its organic, flowing appearance.

**`PulsatingCircleMode`** — Audio-driven radial pulse animation. Circle radius and opacity pulse with RMS energy; beat onsets trigger ripple expansions.

**`VerticalLinesMode`** — Columns of falling vertical lines ("raindrop" effect). Speed and density respond to audio energy.

**`WaterRippleMode`** — Full-screen water ripple distortion shader. Ripple frequency and amplitude are modulated by audio features.

**`HeatWaveMode`** — Heat shimmer distortion effect. Intensity increases with audio energy; motion drives spatial offset.

**`FlowingMode`** — Smooth flowing distortion pattern with continuous motion across the screen surface.

**`GentleWaveMode`** — Soft undulating wave effect. Amplitude and wavelength respond to audio and motion at lower gain values than `WaterRippleMode`.

**`SilkVeilMode`** (`src/modes/SilkVeil/SilkVeilMode.jsx`, 326 LOC) — Cloth-like veil simulation using mesh deformation. Reacts to motion intensity with physical-looking fabric response.

**`LotusBloomMode`** (`src/modes/LotusBloom/LotusBloomMode.jsx`, 269 LOC) — Organic bloom expansion with petal-like geometries that open and rotate in response to audio energy.

**`StainedGlassRoseMode`** (`src/modes/StainedGlassRose/StainedGlassRoseMode.jsx`, 274 LOC) — Geometric stained-glass rose pattern with color segments that pulse and rotate.

**`InkWaterMode`** (`src/modes/InkWater/InkWaterMode.jsx`) — Ink diffusion simulation in water. Audio energy drives diffusion rate; motion shifts diffusion center.

**`OpalineWaveMode`** (`src/modes/OpalineWave/OpalineWave.jsx`, 300 LOC) — Iridescent wave shader using custom GLSL in `src/modes/OpalineWave/shaders.js` (260 LOC). Produces pearl-like color shifting waves.

## Lifecycle & Control Flow

Each mode component mounts when its key becomes active and unmounts when the mode changes. All modes read from `useVisStore` via the `useFrame` hook or `useEffect`. The mode router itself does not manage mode transitions with animation — switching is instantaneous. Mode components handle their own animation state via `useRef` clock variables passed to shader uniforms.

## Usage Notes & Gotchas

**Mode selection does not persist across page refreshes** — `useVisStore` state is in-memory only. The mode resets to `"empty"` on page reload.

**GLSL shader modes require WebGL 2** — All shader-based modes use Three.js `ShaderMaterial` with GLSL ES 3.00. Chrome on any modern GPU supports this; older integrated GPUs may experience performance issues.

**Adding a new mode** — To add a mode: (1) create a component in `src/components/` or `src/modes/YourMode/`, (2) add a `case 'your_key':` to `ChoreoXploreSystem.jsx`, (3) add an `<option>` in `ChoreoXploreControlPanel.jsx`, and (4) add the key to any dropdown options arrays. No other configuration is required.

---

# Module 10: HAND EFFECTS SYSTEM (`HandEffectRouter.jsx` and hand effect components)

The hand effects system renders real-time visual effects that follow the dancer's tracked hand positions. `src/components/HandEffectRouter.jsx` reads the current effect type and hand selection from `useVisStore` and mounts the corresponding effect component(s). Each effect component independently reads pose landmark data, computes hand positions using `src/utils/handTracking.js`, and renders its effect using Three.js geometry, canvas textures, or external fluid simulation libraries. This module is the "touch" layer of ChoreoXplore — making the dancer's hands visible as active visual instruments.

## `HandEffectRouter.jsx` — Effect Router

Reads `handEffect.type` and `handEffect.handSelection` from `useVisStore`. Returns `null` if either is `'none'`. Otherwise renders:

| `type` value | Component |
|---|---|
| `'ripple'` | `<HandFluidEffect>` |
| `'smoke'` | `<HandSmokeEffect>` |
| `'fluidDistortion'` | `<HandFluidDistortion>` |
| `'particleTrail'` | `<HandParticleTrailEffect>` |

## Hand Effect Components

**`HandFluidEffect.jsx`** — Renders a water ripple effect at the tracked hand position using a Three.js `ShaderMaterial`. The ripple expands outward from the hand center. Parameters: `baseColor`, `rippleColor`, `radius`, `intensity`. Reads hand position from landmarks, computes velocity via `calculateHandVelocity`, and feeds `calculateRippleParams` to derive `strength`, `radius`, `frequency`, and `speed` uniforms.

**`HandSmokeEffect.jsx`** and **`HandSmokeCanvas.jsx`** — Renders procedural smoke using a `HandSmokeTexture` instance that draws to a 512×512 canvas. Each frame, a new smoke particle is added at the hand position; particles age, fade, and drift based on hand velocity. The canvas is uploaded to a Three.js `Texture` via `needsUpdate = true`. `HandSmokeCanvas` handles the actual canvas-texture mesh rendering. Parameters: `color`, `intensity`, `radius`, `trailLength`.

**`HandFluidDistortion.jsx`** — Uses the `@whatisjery/react-fluid-distortion` library to apply a GPU fluid simulation distortion effect at the hand position. Parameters: `fluidColor`, `radius`, `swirl`, `rainbow`. The distortion canvas is composited over the main scene. When `handSelection !== 'both'`, the `swirl` parameter is available.

**`HandParticleTrailEffect.jsx`** (274 LOC) — Renders a trail of square particles following hand movement. Uses a `THREE.Points` geometry with a custom shader. Particles are added to a fixed-size ring buffer each frame at the current hand position; each particle fades according to `fadeSpeed`. Parameters: `color`, `intensity`, `particleSize`, `trailLength`.

**`HandFluidCanvas.jsx`** — Supplementary canvas-overlay component for fluid simulation variants; renders the fluid distortion result as an HTML canvas layered over the Three.js scene.

## `src/utils/handTracking.js` — Hand Position Utilities

This utility module provides all hand position computation used by every effect component:

- **`getLeftHandPosition(landmarks)`** / **`getRightHandPosition(landmarks)`** — Returns `{x, y, z, visibility}` for the wrist landmark. Respects `inverseHands` from the store (swaps indices when enabled). Returns `null` if the landmark is not visible.
- **`getLeftHandAnchor(landmarks)`** / **`getRightHandAnchor(landmarks)`** — Extended anchor computation that projects beyond the wrist to an estimated fingertip position:
  1. Calculates shoulder width for body-scale reference
  2. Extends upper arm: `shoulder + (elbow - shoulder) * 1.4`
  3. Extends forearm: `extended_elbow + (wrist - elbow) * 1.4`
  4. Extends to hand tip: extended wrist toward index finger or 40% of forearm length
  5. Adds a wrist-radius offset (`armLowerR * 0.7`)
  Returns absolute scene coordinates (pixels), not normalized 0–1 values.
- **`calculateHandVelocity(currentPos, lastPos, deltaTime)`** — Euclidean distance divided by `deltaTime`, normalized by `0.00013` to a 0–1 scene-scale range
- **`landmarkToScreenCoords(landmark, scale)`** — Converts MediaPipe's 0–1 normalized coordinates to Three.js scene coordinates (`-2` to `+2` range)
- **`smoothHandPosition(currentPos, smoothedPos, smoothingFactor = 0.1)`** — EMA-based position smoothing; prevents jitter from frame-to-frame landmark noise
- **`calculateRippleParams(handPos, velocity, visibility)`** — Derives ripple shader uniforms: `strength = velocity × visibility`, `radius = 0.12 + velocity × 0.2`, `frequency = 15 + velocity × 10`

## `src/utils/HandSmokeTexture.js` — Smoke Texture Generator

`HandSmokeTexture` is a class that manages the procedural smoke canvas:

- `initTexture()` — Creates a 512×512 `HTMLCanvasElement` and wraps it in a `THREE.Texture`
- `addPoint(point, hand)` — Adds a new smoke particle at `point.position` with velocity derived from `point.velocity`
- `update()` — Advances all particle positions and ages; calls `clear()` then `drawPoint()` for each live particle
- `clear()` — Reduces canvas opacity by 80% each frame (creates the trailing fade effect)
- `drawPoint(point)` — Draws a radial gradient circle at the particle position; opacity is age-based using ease-out-sine for the first 30% of lifetime and ease-out-quad for the fade phase
- `updateSettings(settings)` — Applies new parameter values at runtime without recreating the texture
- `getTexture()` → `THREE.Texture` — Returns the live texture for assignment to a Three.js material

## Lifecycle & Control Flow

Effect components use `useFrame` to update every render frame:
1. Read `poseData` from `useStore` via `usePoseDetection`
2. Call the appropriate `handTracking` function to get current hand position(s)
3. Smooth the position with EMA
4. Update the effect's visual state (shader uniforms, canvas texture, particle buffer)
5. Write updated texture/uniforms to Three.js materials

## Usage Notes & Gotchas

**`getLeftHandAnchor` vs `getLeftHandPosition`** — Use `getLeftHandAnchor` for effects that should appear to emanate from the fingertips (smoke, particles, fluid). Use `getLeftHandPosition` (wrist) for effects anchored to the wrist joint. All current effect components use the anchor variant.

**`inverseHands` transparently swaps left and right** — The swap happens inside `getLeftHandPosition` and `getRightHandPosition`. Effect components do not need to handle mirroring logic themselves.

**Fluid distortion compositing** — `HandFluidDistortion` renders to a separate HTML canvas that overlays the Three.js canvas. Its z-index must be set correctly in the container to appear above the main scene but not block UI panels.

**Smoke canvas is 512×512 fixed** — This canvas size is a balance between visual quality and GPU texture upload cost. Increasing it to 1024×1024 improves quality at the cost of higher per-frame texture update overhead.

---

# Module 11: AVATAR & SKELETON SYSTEM (`SimpleSkeleton.jsx`, `HumanoidAvatar.jsx`, `DancerSegmentation.jsx`, `SilhouetteEffect.jsx`)

The avatar and skeleton system provides visual representations of the dancer's body overlaid on the projection. `SimpleSkeleton.jsx` renders a white pictogram-style stick figure using 2D Canvas API drawing. `HumanoidAvatar.jsx` renders a more detailed 3D humanoid avatar driven by pose landmarks. `DancerSegmentation.jsx` runs person-segmentation masking on the video feed. `SilhouetteEffect.jsx` renders a stylized silhouette outline. The skeleton and avatar are toggled via `skeletonVisible` in the store and render on the secondary canvas outside the main Three.js context.

## `SimpleSkeleton.jsx` — Pictogram Skeleton

The skeleton uses an **object pool** of Three.js mesh instances to avoid per-frame geometry allocation. Three pools are maintained: `cylinders[]` (bone segments), `spheres[]` (joints), and `circles[]` (head/pelvis markers).

**Distance scaling** — The dancer's apparent size changes with distance from the camera. The skeleton compensates using:
```
BASELINE_AREA = 0.25
rawDistanceScale = sqrt(BASELINE_AREA / max(bboxArea, 0.01))
distanceScale = clamp(0.8, 2.5, rawDistanceScale)
```

**Arm/leg extension** — All limb segments are extended by `1.4×` beyond the anatomical landmark positions for improved visibility at performance distances.

**Skeleton segments rendered:**
- Face connections (landmarks 0–10)
- Left arm chain: shoulder → elbow → wrist → index finger
- Right arm chain: shoulder → elbow → wrist → index finger
- Torso: left shoulder → right shoulder (bar) + left hip → right hip (bar) + spine cylinder
- Neck: mid-shoulder → head
- Head: filled circle at landmark 0
- Left leg: hip → knee → ankle
- Right leg: hip → knee → ankle

**Pool reuse logic** — Geometry (cylinder radius, height) is reused across frames if dimensions differ by less than 1%. Only when dimensions change significantly does the component dispose and recreate the geometry. Unused pool objects are hidden (`visible = false`) each frame.

## `HumanoidAvatar.jsx` (499 LOC)

Renders a higher-fidelity humanoid figure with stylized body-part meshes (capsules for limbs, spheres for joints) driven by the same landmark array. Supports color customization and responds to the `distanceScale` from the store for consistent sizing.

## `DancerSegmentation.jsx` (269 LOC)

Applies MediaPipe's person segmentation mask to isolate the dancer from the background in the video frame. This enables effects that draw only over the dancer's silhouette. Outputs a masked canvas that can be used as a texture input by other components.

## `SilhouetteEffect.jsx` (361 LOC)

Renders a stylized outline or glow effect around the dancer's segmented silhouette. Uses the masked canvas from `DancerSegmentation` as input and applies edge detection and color overlay to produce a neon-outline aesthetic.

## Usage Notes & Gotchas

**Secondary canvas is required** — `SimpleSkeleton` and `HumanoidAvatar` draw to a 2D `HTMLCanvasElement`, not into the Three.js WebGL context. This canvas is rendered as a sibling element to the main `<Canvas>`, positioned absolutely over it. Ensure its CSS `z-index` places it above the Three.js canvas but below the UI panels.

**Skeleton visibility is globally toggled** — `skeletonVisible` in `useStore` controls whether the secondary canvas is shown. The detection loop always runs; only rendering is conditionally suppressed.

**Pool objects persist between mode changes** — Pool meshes remain in the Three.js scene graph even when the skeleton is hidden. They are toggled via `visible = false`, not removed. This is intentional for performance.

---

# Module 12: SPOTIFY INTEGRATION (`SpotifyContext.jsx`, `spotify/`, `services/spotifyService.js`)

The Spotify integration module provides music search, playback control, and album artwork access through the Spotify Web API. It is composed of three layers: `src/contexts/SpotifyContext.jsx` manages the OAuth session and exposes auth state to the React tree, `src/spotify/auth.js` implements the PKCE authorization flow, `src/spotify/api.js` provides thin wrappers over the Spotify REST endpoints, and `src/services/spotifyService.js` provides higher-level service functions for search and playback. The entire integration is optional — ChoreoXplore runs without Spotify, but song selection and album-art theming require it.

## `SpotifyContext.jsx` — Auth Context

**Exported hook**: `useSpotify()` → `{isAuthenticated, accessToken, user, isLoading, authenticate, handleCallback, logout}`

**Exported component**: `<SpotifyProvider>` — Wraps the entire app; required for any component using `useSpotify()`

**Session persistence**: On mount, checks `localStorage` for `spotifyAccessToken` and `spotifyTokenExpiry`. If found and not expired, restores the session without re-authentication. On `handleCallback`, stores new tokens with expiry timestamp.

- `authenticate()` — Calls `getSpotifyAuthUrl()` and redirects the browser to the Spotify authorization page
- `handleCallback(code)` — Exchanges the authorization code for an access token; stores result in `localStorage`
- `logout()` — Clears `localStorage` keys and resets auth state

## `src/spotify/auth.js` — PKCE Flow

- `beginLogin()` — Generates a 64-character random code verifier, derives a SHA-256 code challenge, stores the verifier in `sessionStorage`, and redirects to the Spotify authorization endpoint with PKCE parameters
- `completeLogin(code)` — Retrieves the verifier from `sessionStorage`, exchanges the authorization code for `access_token`, `refresh_token`, and `expires_in`; stores all three in `localStorage`
- `getAccessToken()` — Returns the stored token if present and not expired; clears expired tokens and returns `null`
- `isAuthenticated()` — Returns `true` if `getAccessToken()` returns a non-null value

## `src/spotify/api.js` — REST Wrappers

- `getCurrentlyPlaying(token)` → `TrackObject | null`
- `getAudioFeatures(trackId, token)` → `AudioFeaturesObject | null`
- `getAudioAnalysis(trackId, token)` → `AudioAnalysisObject | null`
- `getTrack(trackId, token)` → `TrackObject | null`

## `src/services/spotifyService.js` — High-Level Service

**Configuration constants:**
```javascript
SPOTIFY_CONFIG = {
  clientId: import.meta.env.VITE_SPOTIFY_CLIENT_ID,
  redirectUri: import.meta.env.VITE_SPOTIFY_REDIRECT_URI,
  scopes: [
    'user-read-playback-state', 'user-modify-playback-state',
    'user-read-currently-playing', 'streaming',
    'user-read-email', 'user-read-private',
    'user-read-recently-played'
  ]
}
```

**Exported service functions:**
- `getSpotifyAuthUrl()` → `string` — Builds the full Spotify authorization URL with scopes
- `exchangeCodeForToken(code)` → `Promise<TokenResponse>` — Token exchange endpoint call
- `searchTrack(songTitle, artistName, accessToken)` → `Promise<TrackObject | null>` — Searches Spotify for a track by title and optional artist; returns the top result
- `getAvailableDevices(accessToken)` → `Promise<Device[]>` — Lists active Spotify Connect devices
- `transferPlayback(deviceId, accessToken)` → `Promise<boolean>` — Moves playback to a specific device
- `playTrack(trackUri, accessToken)` → `Promise<boolean>` — Starts playback of a specific track URI
- `getCurrentPlayback(accessToken)` → `Promise<PlaybackState | null>` — Returns current playback state including track, progress, device
- `pausePlayback(accessToken)` / `resumePlayback(accessToken)` → `Promise<boolean>` — Toggle playback
- `skipNext(accessToken)` / `skipPrevious(accessToken)` → `Promise<boolean>` — Track navigation
- `seekToPosition(accessToken, positionMs)` → `Promise<boolean>` — Seek to a specific timestamp
- `setVolume(accessToken, volumePercent)` → `Promise<boolean>` — Set playback volume (0–100)

## `SpotifyCallback.jsx` — OAuth Redirect Handler

When Spotify redirects back to `/callback`, `App.jsx` detects the `code=` query parameter and renders `<SpotifyCallback>` instead of the main app. This component calls `handleCallback(code)` and redirects to the home route on success.

## Usage Notes & Gotchas

**PKCE is stateless — verifier lives in `sessionStorage`** — The code verifier generated by `beginLogin` is stored in `sessionStorage`, which does not persist across browser tabs. Opening the Spotify auth popup in a new tab and then closing it will lose the verifier. Ensure the auth redirect returns to the same tab.

**Spotify premium is required for playback control** — The Spotify SDK playback endpoints (`play`, `pause`, `seek`) require a Spotify Premium account. Search and currently-playing data work with free accounts.

**Token expiry is 3600 seconds** — The stored `spotifyTokenExpiry` is `Date.now() + expires_in * 1000`. `getAccessToken()` checks this before every call. There is no refresh token flow implemented — users must re-authenticate after an hour.

---

# Module 13: THEME SYSTEM (`theme/`, `integrations/`)

The theme system automatically generates and applies a perceptually coherent color palette derived from the currently playing Spotify track. It operates as a loosely coupled pipeline: Spotify metadata triggers theme computation, the theme is applied to DOM CSS variables, and a custom DOM event carries the theme to Zustand stores. The system has five files: `src/theme/musicTheme.js` (theme computation), `src/theme/applyTheme.js` (DOM application), `src/theme/moodColorSchemes.js` (manual mood palettes), `src/integrations/spotifyThemeBootstrap.js` (Spotify polling), and `src/integrations/themeToStore.js` (event-to-store bridge).

## `src/theme/musicTheme.js` — Theme Computation

- `buildMusicTheme(track, audioFeatures)` → `Promise<ThemeObject>` — Core computation function

**Color derivation algorithm:**
1. Extracts dominant color palette from the album artwork URL using Vibrant.js (`node-vibrant`)
2. Derives a base hue from Spotify's musical key (0–11 keys mapped to 0–360°)
3. For minor-mode tracks: applies `+15°` hue rotation
4. Modulates saturation by `energy` (50–90% range) and lightness by `danceability`
5. Applies `valence`-based hue shift (±30°) for emotional warmth/coolness
6. Generates complementary colors:
   - `handLeft`: base hue `+30°`
   - `handRight`: base hue `−30°`
   - `handCenter`: base hue `+120°` (triadic)

**Returns**: `{background, asset, handLeft, handRight, handCenter, meta: {trackId, trackName, artist, energy, valence, danceability, key, mode, baseHue}}`

## `src/theme/applyTheme.js` — DOM Application

- `applyTheme(theme)` → `void` — Sets five CSS custom properties on `document.documentElement`:
  - `--cx-bg`, `--cx-asset`, `--cx-hand-left`, `--cx-hand-right`, `--cx-hand-center`
  - Dispatches a `CustomEvent('cx:theme', { detail: theme })` on `window` for store consumption

## `src/theme/moodColorSchemes.js` — Mood Palettes

A library of 14 handcrafted color schemes mapped to descriptive moods:

`Happy`, `Calm`, `Energetic`, `Relaxed`, `Confident`, `Optimistic`, `Passionate`, `Playful`, `Peaceful`, `Warm`, `Fresh`, `Serene`, `Joyful`, `Creative`

Each scheme defines `{bgColor, assetColor, description}`. Luminance analysis determines which color serves as background (darker) and which as asset (lighter).

- `getMoodColorScheme(mood)` → `{bgColor, assetColor, description}`
- `getAvailableMoods()` → `string[]`
- `getAllMoodSchemes()` → `Array<{mood, bgColor, assetColor, description}>`

## `src/integrations/spotifyThemeBootstrap.js` — Polling Coordinator

- `initSpotifyDrivenTheme()` — Registers the system; does not begin polling immediately
- `enableSpotifyTheme()` — Starts a `setInterval` at 5000 ms that polls `getCurrentlyPlaying`, compares against the last known track ID, fetches audio features on change, and calls `buildMusicTheme` → `applyTheme`
- `disableSpotifyTheme()` — Clears the interval
- `isSpotifyThemeEnabled()` → `boolean`
- `forceUpdateTheme()` → `Promise<ThemeObject | null>` — Immediately fetches and applies the theme for the current track, regardless of polling state

## `src/integrations/themeToStore.js` — Event Bridge

- `wireThemeToStore()` → `() => void` (cleanup function) — Called from `main.jsx` after mount

Listens for `window` `'cx:theme'` events and:
1. Calls `useStore.getState().setUserColors({bgColor: theme.background, assetColor: theme.asset})`
2. Calls `useVisStore.getState().setParams()` to update `handEffect` colors for the ripple effect: `baseColor = theme.handLeft`, `rippleColor = theme.handRight`

## Usage Notes & Gotchas

**Theme is opt-in per session** — `initSpotifyDrivenTheme()` sets up the system but `enableSpotifyTheme()` must be called separately (via the "Auto from Spotify" toggle in `SpotifyPlaybackControl`). The system does not auto-start.

**CSS variables apply globally** — Once set, `--cx-bg` and `--cx-asset` affect all components that reference them. Manual color picker changes (which set `userColors` directly) take visual precedence because they are applied as inline styles over the CSS variables.

**Vibrant.js requires CORS-accessible image URLs** — Album artwork URLs from Spotify are served from `i.scdn.co` with appropriate CORS headers. If a custom image URL is used for theming, it must allow cross-origin requests.

---

# Module 14: CONTROL PANELS (`MotionInputPanel.jsx`, `ChoreoXploreControlPanel.jsx`, `HandEffectsPanel.jsx`, `SetupWizard.jsx`)

The control panels are the primary operator interface, visible in ChoreoXplore Mode. They allow the user to configure the system during setup and adjust parameters in real time. Each panel is a self-contained React component that reads from and writes to the Zustand stores. They are positioned as absolute-positioned overlay panels on top of the Three.js canvas.

## `MotionInputPanel.jsx` — Camera & Motion Control

The largest and most complex control panel. Manages the full camera device lifecycle and MediaPipe pipeline.

**State:**
- `isLoading`: `boolean` — True while MediaPipe is initializing
- `error`: `string | null` — Current error message (permission denied, no camera, etc.)
- `availableCameras`: `MediaDeviceInfo[]` — List of detected video input devices
- `selectedCameraId`: `string` — Device ID of the active camera

**Key methods:**
- `enumerateCameras()` — Calls `navigator.mediaDevices.enumerateDevices()`, filters for `videoinput` devices, sorts by device ID, and stores results
- `initializeMediaPipe(forceReinit)` — Loads `PoseLandmarker` with heavy model and GPU delegate; skips if already initialized unless `forceReinit = true`
- `startCamera(deviceId)` — Calls `getUserMedia` with the specified device ID; falls back to default if the device is unavailable
- `stopCamera()` — Cancels the `requestAnimationFrame` loop, stops all stream tracks, and resets refs
- `processFrame()` — Main detection loop: calls `poseLandmarker.detectForVideo()`, draws landmarks to the overlay canvas, updates `useStore.setPoseData()`, and requests the next frame
- `drawPoseLandmarks(landmarks, worldLandmarks)` — Renders the detected pose on a 2D overlay canvas with colored lines for each body segment
- `toggleMotionDetection()` — Calls `startCamera` / `stopCamera` and updates `motionCaptureActive` in the store

**Camera selection behavior**: Cameras are sorted by `deviceId`. The panel defaults to the camera at index 1 (if available) as the dance-space camera. Switching cameras triggers a full MediaPipe reinitialization.

## `ChoreoXploreControlPanel.jsx` — Visual Mode & Color Controls

Manages visual mode selection and global color customization.

**Controls rendered:**
- Background color picker → writes to `useStore.setUserColors({bgColor})`
- Asset color picker → writes to `useStore.setUserColors({assetColor})`
- Mode dropdown (13 options + empty) → writes to `useVisStore.setParams({mode})`
- Speed slider (0–2.0) → writes to `useVisStore.setParams({speed})`
- Transparency slider (0–1.0) → writes to scene node opacity

**Mode-to-ambient-effect mapping** — When certain modes are selected, the panel also updates `ambientAnimationParams.effectType` in `useStore`:
| Mode | Effect Type |
|---|---|
| `water_ripple` | `'waterRipple'` |
| `heat_wave` | `'heatWave'` |
| `flowing` | `'flowingDistortion'` |
| `gentle_wave` | `'gentleWave'` |

## `HandEffectsPanel.jsx` — Hand Effect Configuration

Renders all hand effect controls; directly reads/writes `useVisStore.params.handEffect`.

**Top-level controls:**
- Effect type dropdown: `none`, `ripple`, `smoke`, `fluidDistortion`, `particleTrail`
- Hand selection dropdown: `none`, `left`, `right`, `both`
- Quick view preview toggle

**Conditional sub-panels** — Additional controls appear based on selected type:
- **Ripple**: base color, ripple color, radius (0–1), intensity (0–1)
- **Smoke**: color, opacity, radius, trail length
- **Fluid Distortion**: color, radius, swirl (only when not `'both'`), rainbow toggle
- **Particle Trail**: color, opacity, particle size, trail length

**Deep-merge update handlers:**
- `handleEffectChange(updates)` — Shallow-merges `handEffect` fields
- `handleRippleChange(updates)` — Deep-merges `handEffect.ripple` sub-object
- `handleSmokeChange(updates)` — Deep-merges `handEffect.smoke` sub-object
- `handleFluidDistortionChange(updates)` — Deep-merges `handEffect.fluidDistortion` sub-object

## `SetupWizard.jsx` — Onboarding Flow

Renders a floating hint panel that guides the user through the seven-step setup sequence. Each step shows a short instruction and highlights the relevant control panel with an orange indicator border. The wizard auto-advances based on user actions detected via `useStore` state watchers in `App.jsx`.

**Steps:**
1. Search for a song in Spotify
2. Select a visual mode from the dropdown
3. Start motion capture
4. Choose a hand effect type
5. Select left, right, or both hands
6. Select a camera device
7. Complete — ready for performance

The wizard only appears in `choreoxplore` mode. It does not block interaction; users can skip any step.

## `SpotifyPlaybackControl.jsx` — Music Playback Bar (915 LOC)

Renders the persistent bottom-bar music player.

**State:** `currentTrack`, `isPlaying`, `progress`, `duration`, `volume`, `repeatMode`, `searchQuery`, `searchSuggestions`, `showSuggestions`

**Features:**
- Song search input with debounced (300 ms) suggestion fetching (returns 5 results)
- Play/pause, skip next, skip previous controls
- Seek progress bar (click to seek to position)
- Volume slider
- Repeat mode toggle (off ↔ track repeat)
- Track info display (title, artist, album artwork)
- Spotify Connect device transfer on search/play

**Polling:** Calls `fetchPlaybackState()` on a 5-second interval when authenticated to keep progress bar synchronized.

---

# Module 15: UTILITY SYSTEMS (`autoThrottle.js`, `pool.js`, `assets.js`)

The utility systems provide performance management, object reuse, and asset loading infrastructure used across the application.

## `src/utils/autoThrottle.js` — Adaptive Performance Throttling

`AutoThrottle` monitors live FPS and computes a `throttleLevel` (0.0–1.0) that other systems use to reduce visual complexity when frame rate degrades.

**Fields:**
- `fpsThreshold`: `number` = `50` — Target minimum FPS
- `fpsHistory`: `number[]` — Rolling 60-frame history of FPS samples
- `throttleLevel`: `number` — Current reduction factor (0 = full quality, 1 = maximum reduction)

**Methods:**
- `updateFPS(fps)` — Appends to `fpsHistory` (capped at 60 samples), computes average, adjusts `throttleLevel`:
  - If `avgFPS < 50`: `throttleLevel = min(1, throttleLevel + deficit * 0.1)`
  - If `avgFPS ≥ 50`: `throttleLevel = max(0, throttleLevel - 0.05)`
- `getThrottleLevel()` → `number`
- `getInstanceCount(baseCount, minCount)` → `number` — Returns `floor(baseCount * (1 - throttleLevel * 0.7))`, clamped to `minCount`
- `getIterations(baseIterations, minIterations)` → `number` — Same reduction applied to iteration counts
- `shouldSkipFrame(frequency)` → `boolean` — Returns `true` with probability `throttleLevel * frequency`; allows random frame skipping

**Global singleton**: `initAutoThrottle()` (called from `main.jsx`) wires the store's FPS value to the singleton's `updateFPS` method via a `useStore` subscription.

## `src/core/pool.js` — Generic Object Pool

`createPool(createFn, resetFn)` — Factory function returning a pool instance:

- `acquire()` → `object` — Pops from the free list; calls `createFn()` if the free list is empty
- `release(obj)` → `void` — Calls `resetFn(obj)`, pushes to the free list
- `forEach(fn)` → `void` — Iterates over all currently used objects
- `size()` → `{used, free}` — Returns current pool counts

Used by `SimpleSkeleton` to reuse cylinder, sphere, and circle mesh instances frame-to-frame without creating new Three.js geometry each frame.

## `src/core/assets.js` — Asset Pack Loader

Supports loading blueprint packs in three formats:

1. **Folder manifest**: `path/to/manifest.json` → fetches the manifest, then fetches individual `components/*.json` files in parallel
2. **ZIP URL**: Remote ZIP file → fetches, parses with JSZip, extracts `manifest.json` and all `*.json` files
3. **File object**: Local `File` blob → reads as ZIP, same extraction logic as (2)

**Cache:** Results are stored in a module-level cache object `{packs: {}, blueprints: {}}`. Loading the same pack ID twice returns the cached result.

**Exported functions:**
- `loadAnglesPack(fileOrUrl)` → `Promise<{manifest, comps}>`
- `getBlueprint(id)` → `BlueprintJson | null`
- `listBlueprints(filterFn)` → `BlueprintJson[]`

---

# Appendix A: File Structure and Organization

```
ChoreoXplore/
│
├── index.html                          # App shell; mounts React to #root, loads /src/main.jsx
├── vite.config.js                      # Vite config: React plugin, Tailwind, dev proxies
├── package.json                        # Dependencies and build scripts
├── eslint.config.js                    # ESLint rules
├── .env.local                          # Local secrets: Spotify client ID, secret, redirect URI
│
├── public/
│   └── vite.svg                        # Favicon placeholder
│
└── src/
    ├── main.jsx                        # App entry: mounts React, wires theme & autoThrottle
    ├── App.jsx                         # Root component: mode routing, setup wizard orchestration
    ├── styles.css                      # Global CSS (glass-scrollbar, ghost button, theme vars)
    │
    ├── core/                           # Data pipeline: audio, pose, routing, composition
    │   ├── store.js                    # Primary Zustand store (global app state)
    │   ├── audio.js                    # Web Audio API microphone capture & spectral analysis
    │   ├── pose.js                     # MediaPipe PoseLandmarker initialization & feature parsing
    │   ├── motionMapping.js            # Pose → background/camera/effect transforms
    │   ├── routing.js                  # Audio/pose → scene node property routing engine
    │   ├── mixer.js                    # Onset-driven visual asset spawner (currently disabled)
    │   ├── assets.js                   # Blueprint pack loader (ZIP/folder/manifest)
    │   ├── pool.js                     # Generic object pool factory
    │   └── signals.js                  # EMA, clamp, map01, hysteresis signal utilities
    │
    ├── engine/                         # Higher-level feature extraction
    │   ├── audioFeatures.js            # Meyda audio analysis: rms, energy, centroid, bpmish
    │   └── poseFeatures.js             # Kinematic features: joint angles, arm span, sharpness
    │
    ├── state/                          # Secondary state store
    │   └── useVisStore.js              # Zustand store for Irina visualization parameters
    │
    ├── adapters/                       # Cross-system bridges
    │   └── bridgeCoreAudioToIrina.js   # Subscribes audio$/pose$, pushes to useVisStore
    │
    ├── contexts/                       # React context providers
    │   └── SpotifyContext.jsx          # Spotify auth context: session, tokens, authenticate()
    │
    ├── spotify/                        # Spotify protocol layer
    │   ├── auth.js                     # PKCE authorization flow
    │   └── api.js                      # Spotify REST API wrappers
    │
    ├── services/                       # High-level service layer
    │   └── spotifyService.js           # Search, playback control, device management
    │
    ├── integrations/                   # System-to-system wiring
    │   ├── spotifyThemeBootstrap.js    # Polls Spotify for track changes; triggers theme updates
    │   └── themeToStore.js             # Listens for cx:theme events; writes to Zustand stores
    │
    ├── theme/                          # Color theme system
    │   ├── musicTheme.js               # Builds ThemeObject from track + audio features
    │   ├── applyTheme.js               # Writes CSS vars + dispatches cx:theme event
    │   └── moodColorSchemes.js         # 14 handcrafted mood-based color palettes
    │
    ├── hooks/                          # Custom React hooks
    │   └── usePoseDetection.jsx        # Global pub-sub hook for pose landmark data
    │
    ├── helpers/                        # Miscellaneous helpers
    │   └── themeFromBackground.jsx     # Extracts theme from a background image URL
    │
    ├── utils/                          # Utility modules
    │   ├── autoThrottle.js             # Adaptive FPS-based quality throttling
    │   ├── handTracking.js             # Hand position computation & velocity utilities
    │   └── HandSmokeTexture.js         # Procedural smoke canvas texture generator
    │
    ├── render/                         # Root renderer
    │   └── Canvas3D.jsx                # React Three Fiber canvas: scene setup & system orchestration
    │
    ├── composition/                    # Scene building & layout
    │   ├── scene.js                    # Builds initial reactive line scene nodes
    │   ├── grammar.js                  # Spatial layout generators: grid, radial, goldenOrbit
    │   ├── recipes.js                  # Placement shortcut functions
    │   └── constraints.js             # Angle snapping and stroke clamping validators
    │
    ├── components/                     # UI and visualization React components
    │   │
    │   ├── reusables/                  # Shared UI primitives
    │   │   ├── Slider.jsx              # Labeled slider input component
    │   │   ├── ToggleButton.jsx        # Toggle button component
    │   │   └── TextField.jsx           # Text input component
    │   │
    │   ├── ChoreoXploreSystem.jsx      # Visual mode router (renders active mode component)
    │   ├── ChoreoXplore.jsx            # Default angle-field shader visualization
    │   ├── Lines1D_Irina.jsx           # 1D line visualization mode
    │   ├── QuandCestMode.jsx           # Tendril edge-emanation mode
    │   ├── PulsatingCircleMode.jsx     # Audio-driven radial pulse mode
    │   ├── VerticalLinesMode.jsx       # Falling vertical lines mode
    │   ├── WaterRippleMode.jsx         # Water ripple distortion mode
    │   ├── HeatWaveMode.jsx            # Heat shimmer distortion mode
    │   ├── FlowingMode.jsx             # Flowing distortion stream mode
    │   ├── GentleWaveMode.jsx          # Soft wave undulation mode
    │   ├── EmptyMode.jsx               # Blank canvas (no visuals)
    │   │
    │   ├── HandEffectRouter.jsx        # Routes to active hand effect component
    │   ├── HandFluidEffect.jsx         # Ripple shader effect at hand position
    │   ├── HandSmokeEffect.jsx         # Smoke particle trail at hand position
    │   ├── HandSmokeCanvas.jsx         # Canvas-texture mesh for smoke rendering
    │   ├── HandFluidDistortion.jsx     # GPU fluid distortion at hand position
    │   ├── HandFluidCanvas.jsx         # Canvas overlay for fluid simulation
    │   ├── HandParticleTrailEffect.jsx # Square particle trail at hand position
    │   ├── HandNoiseDistortion.jsx     # Noise-based distortion effect (available, not in UI)
    │   ├── HandEnergyLines.jsx         # Energy line visualization (available, not in UI)
    │   │
    │   ├── HumanoidAvatar.jsx          # Detailed humanoid avatar driven by pose landmarks
    │   ├── SimpleSkeleton.jsx          # Pictogram stick-figure skeleton overlay
    │   ├── DancerSegmentation.jsx      # MediaPipe person segmentation mask
    │   ├── SilhouetteEffect.jsx        # Stylized silhouette outline effect
    │   │
    │   ├── AmbientBackgroundAnimation.jsx  # Background animation layer (1016 LOC)
    │   ├── ShaderDistortion.jsx        # Shader-based scene distortion overlay
    │   ├── Motion3DController.jsx      # Applies motion transforms to 3D camera rig
    │   ├── SampleImage.jsx             # Static image display component
    │   │
    │   ├── MotionInputPanel.jsx        # Camera selection, motion capture controls
    │   ├── ChoreoXploreControlPanel.jsx # Visual mode, color, and speed controls
    │   ├── HandEffectsPanel.jsx        # Hand effect type, hand selection, effect parameters
    │   ├── HandEffectQuickView.jsx     # Floating preview of the active hand effect (2309 LOC)
    │   │
    │   ├── SpotifyPlaybackControl.jsx  # Music player bar: search, playback, volume (915 LOC)
    │   ├── SetupWizard.jsx             # Seven-step onboarding wizard panel
    │   └── WelcomeMode.jsx             # Full-screen welcome/splash overlay
    │   └── SpotifyCallback.jsx         # OAuth redirect handler (/callback route)
    │
    ├── modes/                          # Advanced visualization modes (self-contained)
    │   ├── SilkVeil/
    │   │   └── SilkVeilMode.jsx        # Cloth-simulation veil mode (326 LOC)
    │   ├── LotusBloom/
    │   │   └── LotusBloomMode.jsx      # Organic bloom expansion mode (269 LOC)
    │   ├── StainedGlassRose/
    │   │   └── StainedGlassRoseMode.jsx # Geometric stained-glass rose mode (274 LOC)
    │   ├── InkWater/
    │   │   └── InkWaterMode.jsx        # Ink diffusion in water mode
    │   └── OpalineWave/
    │       ├── OpalineWave.jsx         # Iridescent wave shader mode (300 LOC)
    │       └── shaders.js              # GLSL shader source for OpalineWave (260 LOC)
    │
    └── shaders/                        # Standalone GLSL shader files
        └── (shader source files)
```

---

# Appendix B: Dependencies and Libraries

## Core Framework

**React 19.1.1 / React-DOM 19.1.1**
- Component-based UI rendering with hooks
- Concurrent rendering and automatic batching
- `useEffect`, `useRef`, `useState`, `useCallback` patterns throughout

**Vite 7.1.2**
- Development server with Hot Module Replacement (HMR)
- ES module bundling and tree-shaking for production
- `import.meta.env` access for environment variables

## 3D Rendering

**Three.js ^0.180.0**
- WebGL scene graph, geometry, materials, and textures
- `ShaderMaterial` with custom GLSL for all visual modes
- `THREE.Points`, `THREE.Mesh`, `THREE.PlaneGeometry` in hand effects
- `THREE.CanvasTexture` for smoke and fluid canvas textures
- Orthographic camera for 2D-plane rendering

**@react-three/fiber ^9.3.0**
- React renderer for Three.js (`<Canvas>`, `useFrame`, `useThree`)
- Declarative scene graph construction
- Ref-based access to Three.js objects

**@react-three/drei ^10.7.6**
- `<OrthographicCamera>`, `<shaderMaterial>` helpers
- Utility hooks and geometry helpers

**postprocessing ^6.37.8 / @react-three/postprocessing**
- Post-processing pass pipeline (bloom, depth of field, etc.)
- Available for scene-level effects

## Motion Tracking

**@mediapipe/tasks-vision ^0.10.22-rc.20250304**
- `PoseLandmarker` — 33-landmark full-body pose estimation
- GPU delegate support for hardware-accelerated inference
- WASM/WebAssembly model loading from CDN
- Used in `src/core/pose.js` and `src/components/MotionInputPanel.jsx`

## Audio Analysis

**Meyda ^5.6.3**
- Real-time audio feature extraction from Web Audio API
- Features used: `rms`, `spectralCentroid`
- Buffer size 1024 for low-latency analysis
- Used in `src/engine/audioFeatures.js`

**Web Audio API** (browser built-in)
- `AudioContext`, `AnalyserNode` for raw FFT data
- 2048-bin FFT, 0.8 smoothing constant
- Used in `src/core/audio.js`

## State Management

**Zustand ^5.0.8**
- Lightweight global state with selector-based subscriptions
- Two stores: `useStore` and `useVisStore`
- Immer-compatible updater pattern for nested state

**RxJS ^7.8.2**
- `BehaviorSubject` for reactive audio and pose streams
- `.next()` publishing, `.subscribe()` consumption
- Used in `audio.js`, `audioFeatures.js`, `pose.js`, `motionMapping.js`

## Spotify Integration

**spotify-web-api-js ^1.5.2**
- TypeScript-typed Spotify REST API client
- Used for search, playback, device management

**Web Crypto API** (browser built-in)
- `SubtleCrypto.digest('SHA-256')` for PKCE code challenge generation
- Used in `src/spotify/auth.js`

## Color & Theme

**node-vibrant ^4.0.3**
- Extracts dominant color swatches from image URLs using k-means clustering
- Returns Vibrant, Muted, DarkVibrant, LightVibrant, DarkMuted, LightMuted swatches
- Used in `src/theme/musicTheme.js`

**tinycolor2 ^1.6.0**
- HSL/RGB/hex color conversion and manipulation
- `lighten()`, `darken()`, `complement()`, `toHexString()` operations
- Used throughout the theme system

## UI & Effects

**Tailwind CSS ^4.1.12 / @tailwindcss/vite ^4.1.12**
- Utility CSS classes for panel layouts and responsive sizing
- Glass-morphism panel styles in `styles.css`

**GSAP ^3.13.0**
- Animation tweening for UI transitions and camera interpolation

**@funtech-inc/use-shader-fx ^2.0.5**
- Custom GLSL shader hooks for React Three Fiber
- Used in some visualization modes

**@whatisjery/react-fluid-distortion ^1.5.1**
- GPU fluid simulation distortion effect
- Used by `HandFluidDistortion.jsx`

## Utilities

**Immer ^10.1.3**
- Immutable state update helpers for Zustand actions
- Draft mutation pattern in `setReactivity` and `setChoreoXploreMode`

**JSZip ^3.10.1**
- ZIP file parsing for blueprint asset pack loading
- Used in `src/core/assets.js`

**Zod ^4.1.9**
- Runtime schema validation
- Available for data validation at API boundaries

**RxJS ^7.8.2** (see State Management)

**OpenAI ^4.104.0 / @huggingface/inference ^4.11.0**
- SDKs available for future AI integration features
- Not actively used in current build

---

# Appendix C: Configuration Reference

The following constants and parameters are the most commonly adjusted values for tuning system behavior. They are distributed across their respective modules.

```javascript
// ─── src/core/audio.js ────────────────────────────────────────────────────────

const FFT_SIZE = 2048;                // Frequency resolution (bins = FFT_SIZE / 2)
const SMOOTHING = 0.8;                // Analyser smoothing (0 = none, 1 = max)
const TICK_INTERVAL_MS = 16;          // ~60 Hz audio analysis rate

// Band frequency bin ranges (index into FFT data array)
const LOW_START = 2,   LOW_END = 40;  // Bass
const MID_START = 40,  MID_END = 200; // Midrange
const HIGH_START = 200;               // Treble (to end of array)

// Onset detection
const ONSET_FLUX_THRESHOLD = 0.12;    // Minimum spectral flux to register an onset
const ONSET_GAP_MS = 120;             // Minimum gap between consecutive onsets (ms)


// ─── src/engine/audioFeatures.js ─────────────────────────────────────────────

const MEYDA_BUFFER_SIZE = 1024;       // Meyda analysis buffer size (samples)
const ENERGY_SMOOTHING = 0.85;        // EMA factor for energy: prev * 0.85 + curr * 0.15
const BPMISH_SMOOTHING = 0.98;        // EMA factor for beat-rate proxy


// ─── src/core/motionMapping.js ────────────────────────────────────────────────

const BG_DEAD_ZONE = 0.05;            // Min movement before background transform activates
const CAM_DEAD_ZONE = 0.03;           // Min movement before camera transform activates
const EXPO_SCALE = 0.7;               // Exponent for non-linear movement scaling (value^0.7)
const BG_POSITION_SCALE = 150;        // Background position multiplier
const BG_VELOCITY_FACTOR = 0.3;       // Velocity contribution to background position
const CAM_POSITION_SCALE = 80;        // Camera position multiplier
const BG_SCALE_MIN = 0.3;             // Min background scale
const BG_SCALE_MAX = 2.5;             // Max background scale
const CAM_Z_MIN = 50;                 // Minimum camera Z depth
const CAM_Z_MAX = 150;                // Maximum camera Z depth


// ─── src/components/SimpleSkeleton.jsx ───────────────────────────────────────

const SCALE = 38;                     // Base pixel scale for skeleton geometry
const ARM_EXTEND = 1.4;               // Limb extension factor beyond anatomical landmarks
const HORIZONTAL_SCALE = 1.6;         // Horizontal stretch for better silhouette visibility
const BASELINE_AREA = 0.25;           // Reference bounding-box area for distance normalization
const DIST_SCALE_MIN = 0.8;           // Minimum distance scale factor
const DIST_SCALE_MAX = 2.5;           // Maximum distance scale factor


// ─── src/utils/HandSmokeTexture.js ───────────────────────────────────────────

const CANVAS_SIZE = 512;              // Smoke canvas resolution (512 × 512 px)
const MAX_AGE = 64;                   // Particle lifetime in frames
const BASE_RADIUS_FRACTION = 0.025;   // Particle radius as fraction of canvas size
const FADE_AMOUNT = 0.8;              // Per-frame opacity reduction factor (clear pass)


// ─── src/utils/handTracking.js ────────────────────────────────────────────────

const VELOCITY_NORM = 0.00013;        // Velocity normalization factor for scene coordinates
const SMOOTH_FACTOR = 0.1;            // Default EMA factor for hand position smoothing
const HAND_EXTEND = 1.4;              // Forearm extension factor for anchor computation
const VISIBILITY_THRESHOLD = 0.3;    // Minimum landmark visibility to be considered tracked


// ─── src/utils/autoThrottle.js ───────────────────────────────────────────────

const FPS_THRESHOLD = 50;             // Target minimum FPS before throttling begins
const FPS_HISTORY_SIZE = 60;          // Rolling window for FPS averaging
const THROTTLE_INCREASE_RATE = 0.1;   // Per-frame increase when FPS is below threshold
const THROTTLE_DECREASE_RATE = 0.05;  // Per-frame decrease when FPS is at/above threshold
const THROTTLE_MAX_REDUCTION = 0.7;   // Max instance count reduction at throttle = 1


// ─── src/integrations/spotifyThemeBootstrap.js ───────────────────────────────

const POLLING_INTERVAL_MS = 5000;     // How often to check for track changes (ms)


// ─── src/services/spotifyService.js ──────────────────────────────────────────

const SEARCH_RESULT_LIMIT = 5;        // Number of search suggestions returned
const PLAYBACK_POLL_INTERVAL_MS = 5000; // SpotifyPlaybackControl refresh rate


// ─── src/core/mixer.js ────────────────────────────────────────────────────────

const ONSET_ENERGY_GATE = 0.045;      // Minimum RMS to trigger a spawn event
const SPAWN_GAP_MS = 280;             // Minimum gap between consecutive spawn events (ms)
```

This Technical Manual covers ChoreoXplore's full software architecture as implemented in the final thesis build: two Zustand state stores, a dual-layer audio analysis pipeline, a MediaPipe pose detection system, a motion mapping and routing layer, 13 visual modes, four hand effect types, a Spotify integration with PKCE authentication, a music-driven color theme system, and supporting utilities for performance throttling, object pooling, and asset management.
