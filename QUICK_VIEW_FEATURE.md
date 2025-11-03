# Hand Effect Quick View Feature

## Overview
The Quick View feature provides real-time preview of hand effects with simulated hand movement, allowing users to see how their visual settings will look even before they start dancing.

## Features

### Visual Preview
- **Simulated Hand Movement**: Uses a figure-8 pattern to simulate natural hand movement
- **Real-time Updates**: All changes to sliders and settings are immediately reflected in the preview
- **Multiple Effect Types**: Supports all hand effect types (Ripple, Smoke, Fluid Distortion)

### Supported Parameters
The quick view reflects changes to:
- **Speed**: Affects the animation speed of the simulated hand movement
- **Transparency**: Controls the opacity of the effect (via intensity parameter)
- **Music Reactivity**: Not directly shown in preview (as there's no audio), but intensity settings are reflected
- **Effect Type**: Ripple Effect, Smoke Effect, or Fluid Effect
- **Hand Selection**: Left Hand, Right Hand, or Both Hands
- **Effect-Specific Settings**:
  - Ripple: Base Color, Ripple Color, Radius, Intensity
  - Smoke: Color, Intensity, Radius, Motion Sensitivity, Trail Length
  - Fluid: Color, Intensity, Force, Distortion, Radius, Curl, Swirl

## Implementation Details

### Components
- **HandEffectQuickView.jsx**: Main component that renders the preview canvas
- **SimulatedHandMovement**: Sub-component that generates the figure-8 hand motion
- **SmokeTrail**: Renders particle trails for smoke effects
- **FluidMarker**: Renders animated markers for fluid distortion effects

### Motion Pattern
The simulated hand movement uses a parametric equation to create a smooth figure-8 pattern:
- `x = 0.5 + 0.25 * sin(t + offset)`
- `y = 0.5 + 0.2 * sin(2 * t + offset)`

Where:
- `t` is time multiplied by the speed parameter
- `offset` is 0 for left hand, π for right hand (to differentiate the two hands)

### Toggle Control
Users can toggle the preview on/off using the "Preview" button in the Hand Effects Panel. The preview state is stored in the application state and persists across sessions.

## Usage

1. Navigate to ChoreoXplore mode
2. In the Hand Effects Panel, ensure the "Preview" toggle is enabled (default)
3. Select an Effect Type (Ripple, Smoke, or Fluid)
4. Select a Hand Selection (Left, Right, or Both)
5. Adjust any sliders or color pickers
6. Watch the preview update in real-time in the bottom-right corner

## Technical Notes

### Positioning
The preview canvas is positioned at `bottom: 12px, right: 342px` to avoid overlapping with the AmbientAnimationControlPanel when a background image is present.

### Performance
The preview uses Three.js and React Three Fiber for 3D rendering, with optimized shader materials and efficient animation loops to minimize performance impact.

### Hardcoded Movement
Yes, the avatar (hand positions) use a hardcoded figure-8 movement pattern. This was chosen because:
1. It provides a smooth, predictable motion that showcases the effects well
2. It's more reliable than trying to replay recorded motion data
3. It gives users a clear sense of what the visuals look like without needing to perform movements themselves
4. The pattern is natural enough to represent typical hand movements during dancing
