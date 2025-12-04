# New Visual Modes Guide

This guide documents the five new visual modes added to ChoreoXplore, designed with feminine or traditional aesthetics, deep layered visuals, and high dance/music reactivity.

## Overview

Five new shader-based visual modes have been implemented:
1. **Silk Veil** - Flowing, soft, romantic
2. **Lotus Bloom** - Traditional mandala/rosette
3. **Paper Lanterns** - East Asian night festival aesthetic
4. **Stained Glass Rose** - Cathedral rosette with volumetric light rays
5. **Ink & Water** - Sumi-e / watercolor wash

All modes integrate seamlessly with the existing UI, including:
- Visual Mode dropdown selector
- Speed, Transparency, Music Reactivity sliders
- Background/Asset color swatches
- Motion input (when available)

## Mode Details

### 1. Silk Veil

**Visual Style**: Layered translucent "silk" sheets drifting with parallax effects and pearlescent shimmer.

**Audio Mapping**:
- **Low frequencies** → Turbulence strength (bends the veils)
- **High frequencies** → Specular shimmer intensity and micro-noise scroll speed
- **Beat detection** → Gentle gust that advances veil phase

**Motion Mapping** (optional):
- Body velocity tears faint pathways through the fabric

**Shader Technology**:
- Vertex-displaced quads using 3D simplex noise
- Fragment shader with Fresnel and iridescence effects
- Multiple layers with depth parallax

**Controls**:
- Speed: Animation speed
- Transparency: Overall opacity
- Music Reactivity: Sensitivity to audio input

### 2. Lotus Bloom

**Visual Style**: Radial lotus/mandala pattern that blooms and closes with rotating petals.

**Audio Mapping**:
- **RMS (volume)** → Petal scale (bloom/close)
- **Spectral centroid** → Hue shift (cool to warm colors)
- **Strong onset** → Emit petal outlines as rings
- **Phrase boundaries (8/16 beats)** → Symmetry count cycles (6→8→12→10→5→7)

**Shader Technology**:
- Distance-field radial pattern for perfect geometry
- Instanced petals with polar UV coordinates
- Additive rim lighting for luminous edges
- HSV color manipulation for hue shifting

**Controls**:
- Speed: Rotation speed
- Transparency: Overall opacity
- Music Reactivity: Sensitivity to audio input

### 3. Paper Lanterns

**Visual Style**: Dozens of soft-glow lanterns floating upward with subtle patterns inside.

**Audio Mapping**:
- **Low frequencies** → Buoyancy pulses (lift)
- **Mid frequencies** → Lantern sway amplitude
- **High frequencies** → Star-twinkle particle spawns
- **Beat detection** → Subset of lanterns brighten and drift forward

**Motion Mapping**:
- Center of mass X-axis steers swarm drift left/right

**Implementation**:
- InstancedMesh cylinders for performance
- Sprite glows with additive blending
- Curl-noise flow field for organic movement
- Auto-throttling reduces count when FPS drops

**Controls**:
- Speed: Animation speed
- Transparency: Lantern opacity
- Music Reactivity: Sensitivity to audio input
- Auto-throttle: Reduces count from 60 to minimum 20 based on FPS

### 4. Stained Glass Rose

**Visual Style**: Cathedral-style rosette with volumetric light rays and pane effects.

**Audio Mapping**:
- **Onset detection** → Pane flash + radial ray burst
- **RMS (volume)** → Ray length and bloom strength
- **Spectral centroid** → Pane color bias (reds on low centroid, whites on high)

**Shader Technology**:
- Procedural rosette mask using polar SDF (signed distance field)
- Screen-space god-rays with radial blur
- Cheap bloom effect for luminosity
- HSV color manipulation for dynamic tinting

**Controls**:
- Speed: Rotation speed
- Transparency: Overall opacity
- Music Reactivity: Sensitivity to audio input

### 5. Ink & Water

**Visual Style**: Dark ink blooms and diffuses in water with brush stroke effects and granulated edges.

**Audio Mapping**:
- **Low frequencies** → Diffusion radius (ink spreads)
- **High frequencies** → Edge granulation (dotted speckle)
- **Strong onset** → Spawn sweeping strokes along curved splines

**Motion Mapping**:
- Body velocity carves dry-brush streaks that briefly repel ink

**Shader Technology**:
- Ping-pong frame buffers for reaction-diffusion-style blur
- Blue-noise mask for paper texture
- Curl-noise for flow guidance
- Multi-tap blur for diffusion effect

**Controls**:
- Speed: Animation speed
- Transparency: Overall opacity
- Music Reactivity: Sensitivity to audio input

## Technical Implementation

### AudioFeaturesService

A new enhanced audio analysis service provides:
- **RMS** (Root Mean Square) - Volume level
- **Energy** - Smoothed energy level
- **Spectral Centroid** - Frequency brightness
- **Onset Detection** - Sudden energy increases
- **Beat Detection** - Strong onsets with timing constraints
- **Phrase Tracking** - Every 8 or 16 beats
- **Frequency Bands**: Low (20-250Hz), Mid (250-2000Hz), High (2000-20000Hz)

Located at: `/src/services/AudioFeaturesService.js`

### Auto-Throttle System

FPS-based performance management:
- Monitors average FPS over 60 frames (1 second)
- When FPS < 50, increases throttle level
- Reduces instance counts and iterations based on throttle level
- Allows skipping expensive operations on some frames

Located at: `/src/utils/autoThrottle.js`

### Mode Registry

Modular system for registering visual modes:
- `registerMode(name, config)` - Register a new mode
- `getMode(name)` - Retrieve mode configuration
- `getAllModes()` - Get all registered modes

Located at: `/src/utils/modeRegistry.js`

## Integration with Existing UI

### ChoreoXplore Control Panel

The Visual Mode dropdown now includes all five new modes alongside the existing ones:
- Empty
- Quand C'est
- Pulsating Circle
- Raindrop
- Water Ripple
- Heat Wave
- Flowing
- Gentle Wave
- **Silk Veil** ✨
- **Lotus Bloom** ✨
- **Paper Lanterns** ✨
- **Stained Glass Rose** ✨
- **Ink & Water** ✨

### Color Integration

Both Background and Asset color swatches influence all modes:
- **Background Color**: Base color or background fill
- **Asset Color**: Primary visual element color

All new modes use these colors to maintain visual consistency.

### Music Reactivity Control

The Music Reactivity slider (0-1) scales the audio influence:
- At 0: Modes freeze audio responses (motion may still work)
- At 1: Full audio reactivity with maximum sensitivity

## Performance

All modes are optimized for 60 FPS at 1080p:
- Auto-throttling reduces complexity when FPS drops
- Instanced rendering for Paper Lanterns
- Efficient shader-only rendering for other modes
- No CPU-heavy physics calculations

## Usage

1. Enable visuals using the "Enable Visuals" toggle
2. Select a mode from the Visual Mode dropdown
3. Adjust Speed, Transparency, and Music Reactivity sliders
4. Choose Background and Asset colors
5. Play music to see the modes react to audio
6. Enable motion capture for additional motion-reactive effects

## File Structure

```
src/
├── modes/
│   ├── SilkVeil/
│   │   └── SilkVeilMode.jsx
│   ├── LotusBloom/
│   │   └── LotusBloomMode.jsx
│   ├── PaperLanterns/
│   │   └── PaperLanternsMode.jsx
│   ├── StainedGlassRose/
│   │   └── StainedGlassRoseMode.jsx
│   └── InkWater/
│       └── InkWaterMode.jsx
├── services/
│   └── AudioFeaturesService.js
└── utils/
    ├── autoThrottle.js
    └── modeRegistry.js
```

## Future Enhancements

Potential improvements:
- Per-mode control panels with mode-specific parameters
- Preset system for saving favorite configurations
- Mode transitions and blending
- Additional shader effects and post-processing
- Motion-based particle systems
- Advanced beat detection with BPM analysis
