# WebGL Fluid Simulation Integration

This document describes the integration of Pavel Dogreat's WebGL Fluid Simulation with ChoreoXplore's hand tracking system.

## Overview

The WebGL Fluid Simulation effect maps real-time fluid dynamics to hand movements captured via MediaPipe pose detection. This creates stunning visual effects where your hands control a physically-accurate fluid simulation.

## Source

The fluid simulation shaders are adapted from:
- **Repository**: https://github.com/PavelDoGreat/WebGL-Fluid-Simulation
- **Demo**: https://paveldogreat.github.io/WebGL-Fluid-Simulation/
- **License**: MIT License

## Features

### Physics Simulation
The implementation includes a full 2D fluid dynamics simulation with:

1. **Velocity Field**: Tracks the motion of the fluid
2. **Dye Field**: Tracks the color of the fluid
3. **Pressure Solver**: Ensures incompressibility (divergence-free flow)
4. **Vorticity Confinement**: Adds swirling motion and turbulence
5. **Advection**: Moves fluid and color based on velocity

### Hand Tracking Integration
- **Both Hands Support**: Track left, right, or both hands independently
- **Splat Generation**: Hand movements create "splats" (injections) of fluid
- **Velocity Mapping**: Hand speed controls the force of the splat
- **Smooth Tracking**: Hand positions are smoothed to reduce jitter

## Usage

### Enabling the Effect

1. Open the **Hand Effects Panel** in the ChoreoXplore interface
2. Set **Effect Type** to "WebGL Fluid Simulation"
3. Choose **Hand Selection**: Left, Right, or Both
4. Adjust parameters to your liking

### Parameters

#### Curl (Vorticity)
- **Range**: 0 - 50
- **Default**: 30
- **Description**: Controls the amount of swirling motion in the fluid. Higher values create more turbulent, swirly patterns.

#### Splat Force
- **Range**: 1000 - 10000
- **Default**: 6000
- **Description**: How much force your hand movements apply to the fluid. Higher values create more dramatic effects.

#### Splat Radius
- **Range**: 0.01 - 1.0
- **Default**: 0.25
- **Description**: The size of the fluid injection area. Larger values affect a bigger area.

#### Color Persistence
- **Range**: 0.9 - 1.0
- **Default**: 0.98
- **Description**: How long colors stay visible. Lower values = faster fade. Higher = longer trails.

#### Motion Persistence
- **Range**: 0.9 - 1.0
- **Default**: 0.99
- **Description**: How long the fluid keeps moving. Lower = faster stop. Higher = longer motion.

#### Pressure
- **Range**: 0.0 - 1.0
- **Default**: 0.8
- **Description**: Internal pressure of the fluid. Affects how the fluid spreads and flows.

#### 3D Shading
- **Type**: Toggle (On/Off)
- **Default**: On
- **Description**: Adds lighting and depth to the fluid for a more 3D appearance.

#### Colorful Mode
- **Type**: Toggle (On/Off)
- **Default**: On
- **Description**: Generates random rainbow colors for each splat. When off, uses white/bright colors.

## Technical Details

### Shader Pipeline

The simulation runs through these shader passes each frame:

1. **Curl Shader**: Calculates the curl (rotation) of the velocity field
2. **Vorticity Shader**: Applies vorticity confinement forces
3. **Divergence Shader**: Calculates velocity field divergence
4. **Pressure Shader**: Iteratively solves the pressure equation (20 iterations by default)
5. **Gradient Subtract Shader**: Makes the velocity field divergence-free
6. **Advection Shader**: Moves velocity and dye fields based on current velocity
7. **Display Shader**: Renders the final result with optional shading

### Render Targets

The simulation uses multiple render targets (framebuffers):

- **Velocity (double-buffered)**: Resolution = 128x128 (sim resolution)
- **Dye (double-buffered)**: Resolution = 512x512 (dye resolution)
- **Divergence**: Stores velocity divergence
- **Curl**: Stores velocity curl (vorticity)
- **Pressure (double-buffered)**: For pressure solving

### Performance Considerations

- **Sim Resolution**: 128x128 is a good balance. Lower = faster but less detailed
- **Dye Resolution**: 512x512 provides good visual quality. Higher = sharper but slower
- **Pressure Iterations**: 20 iterations ensure good incompressibility
- The effect runs entirely on the GPU for optimal performance

## Integration with ChoreoXplore

### Hand Position Mapping

Hand positions from MediaPipe are mapped to the fluid simulation coordinate system:

1. MediaPipe landmarks → normalized 0-1 coordinates
2. Smoothing applied to reduce jitter
3. Velocity calculated from position change
4. Coordinates mapped to SimpleSkeleton's coordinate system for consistency

### Effect Router

The effect is integrated into the HandEffectRouter component:
- Selected via dropdown in Hand Effects Panel
- Rendered when `handEffect.type === 'webglFluid'`
- Automatically handles hand selection (left/right/both)

### State Management

Settings are stored in the Zustand store under `params.handEffect.webglFluid`:
```javascript
webglFluid: {
  simResolution: 128,
  dyeResolution: 512,
  densityDissipation: 0.98,
  velocityDissipation: 0.99,
  pressure: 0.8,
  pressureIterations: 20,
  curl: 30,
  splatRadius: 0.25,
  splatForce: 6000,
  shading: true,
  colorful: true
}
```

## File Structure

```
src/
├── shaders/
│   └── webglFluidShader.js          # All WebGL fluid shaders
├── components/
│   ├── HandWebGLFluid.jsx           # Main component
│   ├── HandEffectRouter.jsx         # Routes to effect
│   └── HandEffectsPanel.jsx         # UI controls
└── utils/
    └── handTracking.js              # Hand position utilities
```

## Tips for Best Results

1. **Start with default settings**: The defaults provide a good starting point
2. **Adjust Curl first**: This has the biggest visual impact
3. **Increase Splat Force** for more dramatic effects
4. **Lower persistence values** for faster-moving, more dynamic fluid
5. **Disable 3D Shading** for a flatter, 2D look
6. **Enable Colorful Mode** for rainbow effects

## Known Limitations

- The simulation runs at a fixed resolution (not viewport-dependent for performance)
- Very fast hand movements may cause the fluid to "escape" the viewport
- High curl values (>40) can cause instability in some cases
- The effect requires WebGL2 support

## Credits

- **Original Fluid Simulation**: Pavel Dogreat (https://github.com/PavelDoGreat)
- **Integration**: ChoreoXplore team
- **Hand Tracking**: MediaPipe by Google

## License

The fluid simulation shaders are used under the MIT License from the original repository.
See: https://github.com/PavelDoGreat/WebGL-Fluid-Simulation/blob/master/LICENSE
