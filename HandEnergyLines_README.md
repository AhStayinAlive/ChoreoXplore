# HandEnergyLines Component

A React Three Fiber component that renders animated energy lines (lightning-like tendrils) connecting two hand positions using GLSL shaders.

## Features

- **Animated Lightning Effects**: Wavy, flickering lines that look organic and electrical
- **Perlin Noise Distortion**: Each line uses 3D Perlin noise for realistic movement
- **Distance-Based Intensity**: Lines become brighter and more intense when hands are closer
- **Color Gradients**: Smoothly blends between two configurable colors
- **Additive Blending**: Creates glowing, light-emission effect
- **Sparkle Effect**: Bright energy burst when hands get very close
- **Performance Optimized**: Uses instanced line segments for efficient rendering

## Installation

The component is located at `src/components/HandEnergyLines.jsx` and uses:
- `@react-three/fiber` - React renderer for Three.js
- `three` - 3D graphics library

These dependencies are already included in the project.

## Usage

```jsx
import { Canvas } from '@react-three/fiber';
import HandEnergyLines from './components/HandEnergyLines';

function App() {
  return (
    <Canvas>
      <HandEnergyLines
        leftHand={{ x: 0.3, y: 0.5 }}
        rightHand={{ x: 0.7, y: 0.6 }}
        colorNear="#00ffff"
        colorFar="#ff00ff"
      />
    </Canvas>
  );
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `leftHand` | `{x: number, y: number}` | `{x: 0.3, y: 0.5}` | Left hand position in normalized coordinates (0-1) |
| `rightHand` | `{x: number, y: number}` | `{x: 0.7, y: 0.6}` | Right hand position in normalized coordinates (0-1) |
| `colorNear` | `string` | `'#00ffff'` | Color when hands are close (cyan) |
| `colorFar` | `string` | `'#ff00ff'` | Color when hands are far apart (magenta) |
| `lineCount` | `number` | `5` | Number of energy lines to render |
| `intensity` | `number` | `1.0` | Overall brightness/intensity (0-1+) |
| `noiseScale` | `number` | `3.0` | Scale of the noise pattern (higher = more detailed) |
| `amplitude` | `number` | `0.05` | Strength of the wavy distortion |
| `sparkleIntensity` | `number` | `1.0` | Intensity of the sparkle effect when hands are close |

## Technical Details

### Shaders

The component uses custom GLSL shaders:

#### Vertex Shader
- Interpolates positions between hand points
- Applies multi-octave Perlin noise for organic movement
- Creates perpendicular offsets for lightning-like waves
- Adds flickering/jitter effect using noise

#### Fragment Shader
- Implements distance-based color blending
- Adds brightness variation for electrical flicker
- Creates center glow effect (brighter in middle of line)
- Implements sparkle burst when hands are very close (>0.8 distance factor)

### Uniforms

The shaders use the following uniforms (automatically updated):

- `uTime` - Animated time value
- `uLeftHand` / `uRightHand` - vec2 hand positions
- `uIntensity` - Brightness multiplier
- `uColorNear` / `uColorFar` - vec3 RGB colors
- `uNoiseScale` - Noise frequency control
- `uAmplitude` - Wave amplitude control
- `uSparkleIntensity` - Sparkle effect intensity

### Performance

- Uses `LineSegments` geometry for efficient rendering
- Each line has 64 segments for smooth curves
- Multiple lines are rendered in a single draw call
- Additive blending creates realistic light emission

## Animation

The component automatically animates using `useFrame` from React Three Fiber:
- Updates shader time uniform for continuous animation
- Responds to prop changes in real-time
- No manual animation code needed

## Example Integration

```jsx
import { Canvas } from '@react-three/fiber';
import HandEnergyLines from './components/HandEnergyLines';
import { useState, useEffect } from 'react';

function AnimatedDemo() {
  const [leftHand, setLeftHand] = useState({ x: 0.3, y: 0.5 });
  const [rightHand, setRightHand] = useState({ x: 0.7, y: 0.6 });

  // Animate hands moving together and apart
  useEffect(() => {
    const interval = setInterval(() => {
      const time = Date.now() * 0.001;
      setLeftHand({
        x: 0.3 + Math.sin(time) * 0.1,
        y: 0.5 + Math.cos(time * 0.5) * 0.1
      });
      setRightHand({
        x: 0.7 + Math.sin(time + Math.PI) * 0.1,
        y: 0.6 + Math.cos(time * 0.5 + Math.PI) * 0.1
      });
    }, 16);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000' }}>
      <Canvas camera={{ position: [0, 0, 5] }}>
        <HandEnergyLines
          leftHand={leftHand}
          rightHand={rightHand}
          colorNear="#00ffff"
          colorFar="#ff00ff"
          lineCount={7}
          intensity={1.2}
        />
      </Canvas>
    </div>
  );
}
```

## Future Enhancements

Potential additions:
- Support for edge connections when one hand isn't visible
- Customizable sparkle patterns
- Audio reactivity integration
- Particle effects at connection points
- Variable line thickness based on energy level

## Credits

Created for the ChoreoXplore project using:
- React Three Fiber for 3D rendering
- Stefan Gustavson's Perlin noise implementation
- Additive blending for realistic light effects
