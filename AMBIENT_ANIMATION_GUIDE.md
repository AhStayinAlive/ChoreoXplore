# Ambient Background Animation System

## Overview

The Ambient Background Animation system adds dynamic, living effects to static background images in your ChoreoXplore application. It creates natural motion patterns that make static images feel alive and engaging.

## Features

### 🎨 Four Animation Effects

1. **Water Ripple** - Gentle ripples like water surface with multiple wave layers
2. **Heat Wave** - Heat shimmer distortion effect with vertical shimmer
3. **Flowing Distortion** - Organic flowing patterns with circular and linear flows
4. **Gentle Wave** - Soft, subtle wave motion for minimal distraction

### ⚙️ Tunable Parameters

- **Speed** (0.1x - 3.0x) - Controls animation playback speed
- **Amplitude** (0.0 - 1.0) - Controls distortion strength
- **Wavelength** (0.1 - 3.0) - Controls wave frequency/density
- **Intensity** (0.0 - 1.0) - Overall effect intensity multiplier

### 🎛️ Real-time Controls

- Toggle on/off
- Effect type selection
- Parameter sliders with live preview
- Quick presets (Gentle, Dynamic, Flowing, Subtle)
- Reset to defaults

## Usage

### Basic Integration

The ambient animation is automatically integrated into your existing background image system. When a background image is generated or loaded, the animation control panel appears in the bottom-left corner.

### Control Panel

The control panel provides:

1. **Effect Type Buttons** - Switch between different animation styles
2. **Expandable Controls** - Click the `+` button to access detailed parameters
3. **Quick Presets** - One-click settings for common use cases
4. **Real-time Preview** - All changes are applied immediately

### Performance

- Uses WebGL shaders for smooth 60fps performance
- Runs independently of pose detection
- Optimized for real-time rendering
- Minimal CPU/GPU impact

## Technical Details

### Shader Implementation

The system uses custom GLSL fragment shaders that:

- Sample the background texture with UV coordinate distortion
- Apply multiple noise layers for organic movement
- Use fractal noise for complex, natural patterns
- Include proper UV clamping to prevent sampling artifacts

### Integration Points

- **Canvas3D.jsx** - Renders the ambient animation mesh
- **App.jsx** - Manages animation parameters and control panel
- **AmbientBackgroundAnimation.jsx** - Core shader component
- **AmbientAnimationControlPanel.jsx** - UI controls

### Effect Algorithms

Each effect uses different mathematical approaches:

- **Water Ripple**: Radial sine waves with multiple frequencies
- **Heat Wave**: Vertical sine waves with noise variation
- **Flowing Distortion**: Combined linear and circular flow patterns
- **Gentle Wave**: Soft sine waves with minimal noise

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

### Debug Mode

Enable debug logging by adding console.log statements in the shader material creation or parameter update functions.

## Future Enhancements

Potential improvements:

- Audio-reactive animations
- More effect types (fire, smoke, liquid)
- Particle-based effects
- Custom shader import system
- Animation keyframes and transitions
- Export animated sequences

## Dependencies

- Three.js for WebGL rendering
- React Three Fiber for React integration
- Custom GLSL shaders for effects
- Zustand for state management
