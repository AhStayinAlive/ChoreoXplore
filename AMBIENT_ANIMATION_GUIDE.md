# Ambient Background Animation System

## Overview

The Ambient Background Animation system adds dynamic, living effects to static background images in your ChoreoXplore application. It creates natural motion patterns that make static images feel alive and engaging.

## Features

### 🎨 Four Animation Effects

1. **Water Ripple** - Gentle ripples like water surface with multiple wave layers
   - Audio reactive: Bass drives amplitude, mids drive frequency, highs add shimmer
2. **Heat Wave** - Heat shimmer distortion effect with vertical shimmer
   - Audio reactive: Bass creates waves, mids control speed, highs add shimmer
3. **Flowing Distortion** - Organic flowing patterns with circular and linear flows
   - Audio reactive: All frequencies contribute to flow patterns and swirls
4. **Gentle Wave** - Soft, subtle wave motion for minimal distraction
   - Audio reactive: Subtle response to all frequencies with gentle pulsing

### ⚙️ Tunable Parameters

- **Speed** (0.1x - 3.0x) - Controls animation playback speed
- **Amplitude** (0.0 - 1.0) - Controls distortion strength
- **Wavelength** (0.1 - 3.0) - Controls wave frequency/density
- **Intensity** (0.0 - 1.0) - Overall effect intensity multiplier

### 🎵 Audio Reactivity (NEW)

- **Audio Reactive Toggle** - Enable/disable music-responsive visuals
- **Audio Sensitivity** (0.0 - 2.0) - Overall audio response strength
- **Bass Influence** (0.0 - 1.0) - How much low frequencies affect visuals
- **Mid Influence** (0.0 - 1.0) - How much mid frequencies affect visuals
- **High Influence** (0.0 - 1.0) - How much high frequencies affect visuals

### 🎛️ Real-time Controls

- Toggle on/off
- Effect type selection
- Parameter sliders with live preview
- Quick presets (Gentle, Dynamic, Flowing, Subtle)
- Reset to defaults

## Usage

### Basic Integration

The ambient animation is automatically integrated into your existing background image system. When a background image is generated or loaded, the animation control panel appears in the bottom-right corner.

### Audio Reactivity Setup

To use audio-reactive features:

1. **Enable Audio Capture** - The app needs microphone access to capture audio
   - For local audio playback: Use VB-Audio Virtual Cable or similar software to route audio
   - See `src/core/audio.js` for audio setup details
2. **Toggle Audio Reactive** - Enable in the Ambient Animation control panel
3. **Adjust Sensitivity** - Set overall audio response strength
4. **Fine-tune Frequency Response**:
   - **Bass Influence**: Controls how low frequencies (kicks, bass lines) affect visuals
   - **Mid Influence**: Controls how mid frequencies (vocals, guitars) affect visuals
   - **High Influence**: Controls how high frequencies (cymbals, hi-hats) affect visuals

### How Audio Reactivity Works

Each effect responds to music differently:

- **Water Ripple**: 
  - Bass frequencies increase ripple amplitude
  - Mid frequencies modulate ripple frequency
  - High frequencies add shimmer and sparkle
  - RMS energy creates overall pulsing

- **Heat Wave**: 
  - Bass frequencies create stronger waves
  - Mid frequencies control animation speed
  - High frequencies add extra shimmer
  - Creates a heat-distortion effect synchronized to music

- **Flowing Distortion**: 
  - All frequency bands contribute to flow intensity
  - Bass creates major flow patterns
  - Mids add medium-scale variations
  - Highs contribute to fine details
  - RMS energy creates swirling effects

- **Gentle Wave**: 
  - Subtle response to all frequencies
  - Bass creates gentle amplitude changes
  - Mids add frequency variations
  - Highs contribute minimal shimmer
  - RMS energy adds gentle pulsing

### Control Panel

The control panel provides:

1. **Effect Type Buttons** - Switch between different animation styles
2. **Expandable Controls** - Click the `+` button to access detailed parameters
3. **Audio Reactivity Section** - Toggle and configure music-responsive visuals
   - Toggle audio reactivity ON/OFF
   - Adjust overall sensitivity
   - Fine-tune bass, mid, and high frequency influences
4. **Quick Presets** - One-click settings for common use cases (now include audio reactivity)
5. **Real-time Preview** - All changes are applied immediately

### Performance

- Uses WebGL shaders for smooth 60fps performance
- Runs independently of pose detection
- Audio analysis runs at ~60Hz with minimal CPU impact
- Optimized for real-time rendering
- Minimal CPU/GPU impact even with audio reactivity enabled

## Technical Details

### Shader Implementation

The system uses custom GLSL fragment shaders that:

- Sample the background texture with UV coordinate distortion
- Apply multiple noise layers for organic movement
- Use fractal noise for complex, natural patterns
- Include proper UV clamping to prevent sampling artifacts
- Receive real-time audio data as uniforms (bass, mid, high bands + RMS)
- Modulate effect parameters based on audio frequencies
- Support independent control of each frequency band's influence

### Integration Points

- **Canvas3D.jsx** - Renders the ambient animation mesh and passes audio parameters
- **App.jsx** - Manages animation parameters and control panel visibility
- **AmbientBackgroundAnimation.jsx** - Core shader component with audio subscription
- **AmbientAnimationControlPanel.jsx** - UI controls including audio reactivity
- **audio.js** - Audio analysis using Web Audio API (RxJS observable)
- **store.js** - Zustand state management for all parameters

### Effect Algorithms

Each effect uses different mathematical approaches:

- **Water Ripple**: Radial sine waves with multiple frequencies
  - Audio modulation: Bass increases amplitude, mids modulate frequency
- **Heat Wave**: Vertical sine waves with noise variation
  - Audio modulation: Bass creates waves, mids control speed, highs add shimmer
- **Flowing Distortion**: Combined linear and circular flow patterns
  - Audio modulation: All frequencies contribute to flow intensity
- **Gentle Wave**: Soft sine waves with minimal noise
  - Audio modulation: Subtle response to all frequencies with gentle pulsing

### Audio Processing

The audio system:

1. Captures audio via Web Audio API (microphone or virtual cable)
2. Analyzes frequency spectrum using FFT (Fast Fourier Transform)
3. Extracts three frequency bands:
   - **Low (Bass)**: 2-40 Hz (kicks, bass notes)
   - **Mid**: 40-200 Hz (vocals, instruments)
   - **High**: 200+ Hz (cymbals, hi-hats)
4. Calculates RMS (Root Mean Square) for overall energy
5. Publishes data via RxJS observable at ~60Hz
6. Shader receives data and modulates effect parameters in real-time

## Customization

### Adding New Effects

To add a new effect type:

1. Add the effect name to the `effectTypes` array in `AmbientAnimationControlPanel.jsx`
2. Add the effect value to `getEffectTypeValue()` function
3. Implement the effect algorithm in the fragment shader
4. Add a new condition in the main shader logic

### Parameter Tuning

Each effect responds differently to parameters:

- **Speed**: Affects time-based calculations
- **Amplitude**: Scales distortion magnitude
- **Wavelength**: Controls spatial frequency
- **Intensity**: Overall effect multiplier

## Best Practices

### Performance Optimization

- Use lower intensity values for subtle effects
- Avoid extreme wavelength values (keep between 0.5-2.0)
- Monitor FPS when using multiple effects simultaneously

### Visual Design

- Start with "Gentle" preset for subtle enhancement
- Use "Dynamic" preset for more noticeable effects
- Combine with pose-based distortion for layered effects
- Test on different image types (photographs vs. illustrations)
- Enable audio reactivity for music-synchronized visuals
- Adjust frequency influences based on music genre:
  - **Electronic/EDM**: High bass influence (0.8-1.0)
  - **Classical/Orchestral**: Balanced all frequencies (0.5 each)
  - **Rock/Metal**: High bass and mid influence (0.7-0.9)
  - **Jazz/Acoustic**: Mid and high emphasis (0.6-0.8)

### User Experience

- Provide clear visual feedback for parameter changes
- Use descriptive preset names
- Allow easy reset to defaults
- Show current parameter values

## Troubleshooting

### Common Issues

1. **No animation visible**: Check if `isActive` is true and background image is loaded
2. **Performance issues**: Reduce intensity or amplitude values
3. **Artifacts**: Ensure UV coordinates are properly clamped
4. **Control panel not showing**: Verify background image is present
5. **Audio reactivity not working**: 
   - Ensure microphone permission is granted
   - Check if audio is being captured (see browser console for audio levels)
   - For music playback, use VB-Audio Virtual Cable to route audio
   - Toggle audio reactive ON in the control panel
6. **Audio reactivity too subtle**: Increase audio sensitivity slider
7. **Audio reactivity too intense**: Decrease audio sensitivity or reduce frequency influences

### Debug Mode

Enable debug logging by adding console.log statements in the shader material creation or parameter update functions.

## Future Enhancements

Potential improvements:

- ~~Audio-reactive animations~~ ✅ **IMPLEMENTED**
- Beat detection for synchronized effects
- More effect types (fire, smoke, liquid)
- Particle-based effects
- Custom shader import system
- Animation keyframes and transitions
- Export animated sequences
- MIDI controller support for live performances
- Audio visualization overlays

## Dependencies

- Three.js for WebGL rendering
- React Three Fiber for React integration
- Custom GLSL shaders for effects
- Zustand for state management
- Web Audio API for audio analysis
- RxJS for reactive audio data streaming

## Benefits for Choreographers

The audio-reactive background visuals provide several benefits for choreographers and dancers:

1. **Visual Feedback**: See music frequencies visualized in real-time
2. **Beat Awareness**: Visual cues help dancers stay in sync with music
3. **Energy Matching**: Visuals intensity matches music energy
4. **Frequency Visualization**: Different instruments/frequencies create distinct visual patterns
5. **Immersive Experience**: Creates a more engaging practice/performance environment
6. **Recording Enhancement**: Makes recorded sessions more dynamic and professional
7. **Creative Inspiration**: Visual patterns can inspire new choreographic ideas
8. **Accessibility**: Helps hearing-impaired dancers feel music through visuals
